#!/usr/bin/env python3
"""
Авторендер чернового mp4 из материалов проекта.

Конвейер:
  1. build_render_plan  — сцены по таймкодам srt с ритм-логикой (вариация
     длительностей, перебивки, динамичный старт, seed на проект)
  2. render_segment     — каждый план в отдельный mp4-сегмент с движением
     внутри кадра (Ken Burns / drift / push-in / shake для картинок,
     обрезка для видео)
  3. render_group       — склейка сегментов группами по GROUP_SIZE через
     xfade (пул переходов, взвешенный выбор, без повторов подряд)
  4. assemble           — конкат групп + озвучка + вшитые субтитры +
     стилевые слои (зерно/виньетка/letterbox/VHS)

Выход: output_final.mp4 в папке проекта.
"""

import re
import json
import time
import random
import shutil
import zlib
import threading
import subprocess
from collections import deque
from pathlib import Path

from core import srt_to_seconds, parse_srt, load_whisper_words, audio_duration

CONSOLE = None  # хук GUI: сюда льётся живой вывод ffmpeg (кадр/время/скорость)
CANCEL = threading.Event()  # кнопка «Стоп»: убивает текущий ffmpeg и рендер


def _console(msg: str):
    if CONSOLE:
        try:
            CONSOLE(msg)
        except Exception:
            pass

RESOLUTIONS = {"1080p": (1920, 1080), "4K": (3840, 2160)}
GROUP_SIZE = 8          # сегментов в одной xfade-команде
CRF_SEGMENT = "18"      # качество/пресеты подменяются в черновом режиме
CRF_FINAL = "19"
PRESET_SEG = "fast"
PRESET_FINAL = "medium"

# (xfade transition, длительность, вес). "cut" — жёсткая склейка.
# КИНОМОНТАЖ, а не телевизор 2010-х. В реальном монтаже большинство склеек
# это hard cut, остальное — мягкие переходы (crossfade, dip-to-black,
# короткий dissolve, редкий white-flash, лёгкий zoom-blur на акцентах).
# Кричащие wipe/slide/circle/cover/reveal/wind/slice/squeeze УБРАНЫ —
# именно они выдавали «старьё».
# МНОГО видов, но веса держат киномонтаж: cut/fade доминируют, кричащие
# (wipe/slide/circle/…) — редкие акценты, а не каждый стык.
# ВАЖНО: только переходы, которые смешивают ДВА кадра по всей площади
# (crossfade / dip / blur / dissolve). Геометрические свайпы xfade
# (circleopen/circleclose/radial/rectcrop/diagtl/squeeze/cover/wipe/slide)
# УБРАНЫ намеренно и навсегда: во-первых, они выдают «старьё» 2010-х;
# во-вторых — и это главное — при малейшем рассинхроне длительностей
# сегментов незакрытая область такого перехода заливается ЗЕЛЁНЫМ (нулевой
# YUV), что пользователь и видел как зелёный полукруг поверх кадра.
TRANSITIONS = [
    # ---- основа (частые) ----
    ("cut",        0.00, 34),   # жёсткая склейка — основа монтажа
    ("fade",       0.45, 20),   # crossfade
    ("fadefast",   0.28, 10),   # быстрый crossfade
    ("dissolve",   0.40, 8),    # растворение
    ("fadeblack",  0.55, 7),    # dip to black — смена главы
    ("hblur",      0.40, 5),    # blur-dissolve
    ("zoomin",     0.38, 4),    # zoom-переход (полнокадровый, не свайп)
    # ---- акценты (реже) ----
    ("fadewhite",  0.18, 3),    # white flash
    ("pixelize",   0.30, 2),    # пикселизация (полнокадровая)
    ("distance",   0.42, 2),    # разлёт (смешивает оба кадра, не свайп)
    ("fadegrays",  0.45, 2),    # обесцвечивание
]

INTENSITY = {
    "слабая":  dict(short=(3.0, 5.0), long=(8.0, 12.0), burst_every=(90, 120),
                    short_prob=0.15),
    "средняя": dict(short=(2.5, 4.0), long=(7.0, 11.0), burst_every=(75, 100),
                    short_prob=0.25),
    "сильная": dict(short=(2.0, 3.5), long=(6.0, 9.0),  burst_every=(60, 85),
                    short_prob=0.35),
    # ~5с/план в среднем (short 0.4*4.25 + long 0.6*5.75 ≈ 5.15с) — темп
    # референсного канала: смена кадра каждые пять секунд, но не метроном —
    # узкий разброс 3.5-6.5с сохраняет живую вариацию без скачков "сильной".
    "документальная 5с": dict(short=(3.5, 5.0), long=(5.0, 6.5),
                              burst_every=(45, 65), short_prob=0.4),
}

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}
VIDEO_EXTS = {".mp4", ".mov", ".mkv", ".webm"}


def _run(cmd: list[str], label: str = "ffmpeg"):
    """ffmpeg с живым прогрессом в Консоль и внятной ошибкой (хвост stderr)."""
    full = list(cmd)
    if full and full[0] == "ffmpeg":
        # -progress pipe:1 даёт машиночитаемый прогресс построчно в stdout
        full[1:1] = ["-hide_banner", "-loglevel", "error",
                     "-nostats", "-progress", "pipe:1"]
    _console(f"[{label}] $ " + " ".join(str(a) for a in full))
    p = subprocess.Popen(full, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                         text=True, encoding="utf-8", errors="replace")
    err_tail = deque(maxlen=40)

    def read_err():
        for line in p.stderr:
            line = line.rstrip()
            if line:
                err_tail.append(line)
                _console(f"[{label}] ! {line}")

    t = threading.Thread(target=read_err, daemon=True)
    t.start()
    stat, last = {}, 0.0
    for line in p.stdout:
        if CANCEL.is_set():
            p.kill()
            p.wait()
            raise RuntimeError("Остановлено пользователем")
        key, _, val = line.strip().partition("=")
        stat[key] = val
        if key == "progress" and time.time() - last >= 1.0:
            last = time.time()
            _console(f"[{label}] кадр {stat.get('frame', '?')}   "
                     f"время {stat.get('out_time', '?')[:11]}   "
                     f"скорость {stat.get('speed', '?')}")
    p.wait()
    t.join(timeout=2)
    if CANCEL.is_set():
        raise RuntimeError("Остановлено пользователем")
    if p.returncode != 0:
        tail = "\n".join(err_tail) or (
            f"код {p.returncode}, stderr пуст — процесс, похоже, был убит "
            "системой (обычно не хватило оперативной памяти: 60fps и большие "
            "группы прожорливы; попробуй 30 fps или черновой режим)")
        raise RuntimeError(f"ffmpeg упал ({label}):\n" + tail)


def _has_video(path: Path) -> bool:
    """Есть ли в файле видеопоток. ffmpeg может «успешно» записать пустой
    файл (например, -ss за концом видео) — такой сегмент рвёт xfade-склейку
    ошибкой «matches no streams»."""
    try:
        r = subprocess.run(
            ["ffprobe", "-v", "quiet", "-select_streams", "v:0",
             "-show_entries", "stream=codec_type", "-of", "csv=p=0", str(path)],
            capture_output=True, text=True)
        return Path(path).exists() and "video" in r.stdout
    except OSError:
        return False


def _video_dur(path: Path) -> float | None:
    """Длительность именно ВИДЕОпотока (контейнер бывает длиннее видео —
    например, из-за звуковой дорожки; -ss по контейнеру попадает в пустоту)."""
    try:
        r = subprocess.run(
            ["ffprobe", "-v", "quiet", "-select_streams", "v:0",
             "-show_entries", "stream=duration", "-of", "csv=p=0", str(path)],
            capture_output=True, text=True)
        return float(r.stdout.strip().splitlines()[0])
    except (OSError, ValueError, IndexError):
        return None


def _placeholder(dest: Path, dur: float, w: int, h: int, fps: int):
    """Тёмная заглушка вместо битого сегмента — рендер продолжается."""
    _run(["ffmpeg", "-y", "-f", "lavfi",
          "-i", f"color=c=0x14120f:s={w}x{h}:r={fps}",
          "-t", f"{max(dur, 0.2):.3f}", "-vf", "format=yuv420p,setsar=1",
          "-c:v", "libx264", "-preset", PRESET_SEG, "-crf", CRF_SEGMENT,
          str(dest)], label=dest.stem + "~заглушка")


# ---------- 1. План сцен ----------

def project_seed(out_dir: Path) -> int:
    """Фиксированный seed на проект, разный между проектами."""
    return zlib.crc32(str(Path(out_dir).resolve()).encode("utf-8"))


def build_render_plan(rows, total: float, rng: random.Random,
                      intensity: str = "средняя") -> list[dict]:
    """Сцены по границам фраз srt: вариация длительностей, врезки-перебивки
    каждые 60-120 с, первые 15 секунд — короткий динамичный монтаж,
    фразы с вопросом/цифрами начинают новую сцену."""
    cfg = INTENSITY.get(intensity, INTENSITY["средняя"])
    phrases = [(srt_to_seconds(s), srt_to_seconds(e), t) for s, e, t in rows]
    if not phrases:
        raise RuntimeError("Пустые субтитры — нечего рендерить.")

    scenes, i = [], 0
    cur = 0.0
    next_burst = rng.uniform(*cfg["burst_every"])
    burst_left = 0
    while i < len(phrases):
        start = cur
        if start < 15:                       # retention hook
            target = rng.uniform(2.0, 4.0)
        elif burst_left > 0:                 # серия коротких врезок
            target = rng.uniform(1.5, 2.5)
            burst_left -= 1
        elif rng.random() < cfg["short_prob"]:
            target = rng.uniform(*cfg["short"])
        else:
            target = rng.uniform(*cfg["long"])

        end = start
        while i < len(phrases) and end - start < target:
            txt = phrases[i][2]
            # вопрос или цифры — смена кадра точно на начало фразы
            if end > start and end - start >= 2.0 and \
                    ("?" in txt or re.search(r"\d", txt)):
                break
            end = phrases[i][1]
            i += 1
        if end <= start:                     # фраза длиннее target — берём её
            end = phrases[i][1]
            i += 1
        scenes.append({"start": round(start, 3), "end": round(end, 3)})
        cur = end
        if burst_left == 0 and cur >= next_burst:
            burst_left = rng.randint(2, 3)
            next_burst = cur + rng.uniform(*cfg["burst_every"])

    if total and total > scenes[-1]["end"]:
        scenes[-1]["end"] = round(total, 3)

    # Кадр не висит дольше MAX_SCENE секунд — длинные сцены дробятся на
    # равные куски (каждому потом назначается СВОЙ материал). Требование:
    # «одно фото/видео не должно быть на экране дольше 5 секунд».
    MAX_SCENE = 5.0
    split = []
    for sc in scenes:
        dur = sc["end"] - sc["start"]
        if dur <= MAX_SCENE * 1.12:
            split.append(sc)
        else:
            n = int(dur // MAX_SCENE) + 1
            step = dur / n
            for k in range(n):
                split.append({"start": round(sc["start"] + k * step, 3),
                              "end": round(sc["start"] + (k + 1) * step, 3)})
    return split


def assign_materials(scenes: list[dict], out_dir: Path,
                     rng: random.Random, log) -> None:
    """Назначает файл каждой сцене. Если есть timeline.json (раскадровка) —
    сохраняем смысловую привязку по времени; иначе пул video/ + images/
    вперемешку по кругу."""
    out_dir = Path(out_dir)
    tl_file = out_dir / "timeline.json"
    timeline = []
    if tl_file.exists():
        try:
            timeline = json.loads(tl_file.read_text(encoding="utf-8"))
        except Exception:
            pass

    pool = []
    for d in (out_dir / "video", out_dir / "images", out_dir / "storyboard"):
        if d.exists():
            pool += [p for p in sorted(d.iterdir())
                     if p.suffix.lower() in IMAGE_EXTS | VIDEO_EXTS]
    rng.shuffle(pool)
    if not pool and not timeline:
        raise RuntimeError("Нет материала: пусто в video/, images/, storyboard/ "
                           "и нет timeline.json — сначала скачай стоки.")

    def _content_key(p: Path) -> str:
        """Фото и его же Ken Burns-видео (beat_004_x_kb.jpg / _kb.mp4, или
        beat_004_x_ai.jpg / _ai_kb.mp4) — одна и та же картинка, просто с
        разным движением камеры. Без этого их считало ДВУМЯ разными кадрами
        с отдельным лимитом MAX_ONSCREEN каждому — итог: один и тот же снимок
        мелькал до 4 раз (2х как .jpg, 2х как .mp4)."""
        stem = p.stem
        return stem[:-3] if stem.endswith("_kb") else stem

    # Интенсивность режет сцены чаще, чем раскадровка качает материал (напр.
    # «документальная 5с» = смена каждые ~5с, а на один пункт раскадровки
    # обычно 6-10с) — несколько сцен подряд попадают в окно ОДНОГО файла
    # timeline.json. Раньше защита была только «не то же самое, что сразу
    # перед этим» — тот же кадр всё равно повторялся по всему ролику
    # (не подряд, но заметно зрителю). MAX_ONSCREEN — сколько раз одно и то
    # же содержимое вообще может мелькнуть за весь ролик, прежде чем
    # уступит пулу.
    MAX_ONSCREEN = 2
    pi, last_key = 0, None
    reused = 0
    use_count = {}
    for sc in scenes:
        f = None
        for item in timeline:                # привязка по смыслу (раскадровка)
            if item.get("file") and item["start"] <= sc["start"] < item["end"]:
                p = Path(item["file"])
                if p.exists():
                    f = p
                break
        key = _content_key(f) if f else None
        # не показывать одно и то же содержимое два раза подряд, и не чаще
        # MAX_ONSCREEN раз за весь ролик — берём из пула следующий файл,
        # отличный от предыдущего и ещё не примелькавшийся
        if (f is None or key == last_key or use_count.get(key, 0) >= MAX_ONSCREEN) and pool:
            for _ in range(len(pool)):
                cand = pool[pi % len(pool)]
                pi += 1
                cand_key = _content_key(cand)
                if cand_key != last_key and use_count.get(cand_key, 0) < MAX_ONSCREEN:
                    f, key = cand, cand_key
                    break
        if f is None and pool:
            f = pool[pi % len(pool)]
            key = _content_key(f)
            pi += 1
        if f is None:
            raise RuntimeError("Не хватило материала для сцены "
                               f"{sc['start']:.0f}s.")
        if key == last_key or use_count.get(key, 0) >= MAX_ONSCREEN:
            reused += 1
        use_count[key] = use_count.get(key, 0) + 1
        sc["file"] = f
        sc["kind"] = "image" if f.suffix.lower() in IMAGE_EXTS else "video"
        last_key = key
    log(f"[Рендер] Материал: {len(scenes)} сцен, кадр меняется каждые <=5 c "
        f"({'таймлайн + ' if timeline else ''}пул {len(pool)} файлов"
        + (f", повторов подряд: {reused}" if reused else "") + ")")


# ---------- 2. Сегменты ----------

# 26 движений камеры для картинок: зумы, панорамы (4 стороны), диагонали,
# зум+панорама, дуги, дрейф, наезды, тряска, пульс, статика
IMAGE_MOTIONS = [
    "zoom_in", "zoom_out", "zoom_in_fast", "zoom_out_fast", "pulse",
    "pan_right", "pan_left", "pan_up", "pan_down",
    "diag_tl", "diag_tr", "diag_bl", "diag_br",
    "zoompan_r", "zoompan_l", "pullpan_r", "pullpan_l",
    "arc_r", "arc_l", "drift", "drift_fast",
    "push_in", "push_out", "hold", "parallax",
]


def _motion_expr(motion: str, frames: int, fps: int) -> str:
    center = "x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
    xmid = "x='iw/2-(iw/zoom/2)'"
    ymid = "y='ih/2-(ih/zoom/2)'"
    zr = 0.24 / frames    # заметный наезд (было 0.15 — почти не видно)
    zrf = 0.44 / frames   # быстрый драматичный наезд
    n1 = max(frames - 1, 1)
    e = {
        "zoom_in":       f"z='min(zoom+{zr:.6f},1.24)':{center}",
        "zoom_out":      f"z='if(lte(on,1),1.24,max(zoom-{zr:.6f},1.0))':{center}",
        "zoom_in_fast":  f"z='min(zoom+{zrf:.6f},1.44)':{center}",
        "zoom_out_fast": f"z='if(lte(on,1),1.44,max(zoom-{zrf:.6f},1.0))':{center}",
        "pulse":         f"z='1.12+0.07*sin(on/{fps}*1.3)':{center}",
        "pan_right":     f"z=1.22:x='(iw-iw/zoom)*on/{n1}':{ymid}",
        "pan_left":      f"z=1.22:x='(iw-iw/zoom)*(1-on/{n1})':{ymid}",
        "pan_up":        f"z=1.22:{xmid}:y='(ih-ih/zoom)*(1-on/{n1})'",
        "pan_down":      f"z=1.22:{xmid}:y='(ih-ih/zoom)*on/{n1}'",
        "diag_tl":       f"z=1.20:x='(iw-iw/zoom)*on/{n1}':y='(ih-ih/zoom)*on/{n1}'",
        "diag_tr":       f"z=1.20:x='(iw-iw/zoom)*(1-on/{n1})':y='(ih-ih/zoom)*on/{n1}'",
        "diag_bl":       f"z=1.20:x='(iw-iw/zoom)*on/{n1}':y='(ih-ih/zoom)*(1-on/{n1})'",
        "diag_br":       f"z=1.20:x='(iw-iw/zoom)*(1-on/{n1})':y='(ih-ih/zoom)*(1-on/{n1})'",
        "zoompan_r":     f"z='1+0.24*on/{n1}':x='(iw-iw/zoom)*on/{n1}':{ymid}",
        "zoompan_l":     f"z='1+0.24*on/{n1}':x='(iw-iw/zoom)*(1-on/{n1})':{ymid}",
        "pullpan_r":     f"z='1.24-0.22*on/{n1}':x='(iw-iw/zoom)*on/{n1}':{ymid}",
        "pullpan_l":     f"z='1.24-0.22*on/{n1}':x='(iw-iw/zoom)*(1-on/{n1})':{ymid}",
        "arc_r":         (f"z=1.20:x='(iw-iw/zoom)*on/{n1}':"
                          f"y='(ih-ih/zoom)*(0.5+0.45*sin(on/{n1}*3.1416))'"),
        "arc_l":         (f"z=1.20:x='(iw-iw/zoom)*(1-on/{n1})':"
                          f"y='(ih-ih/zoom)*(0.5-0.45*sin(on/{n1}*3.1416))'"),
        "drift":         (f"z=1.04:x='iw/2-(iw/zoom/2)+9*sin(on/{fps}*0.7)':"
                          f"y='ih/2-(ih/zoom/2)+6*sin(on/{fps}*0.45)'"),
        "drift_fast":    (f"z=1.06:x='iw/2-(iw/zoom/2)+15*sin(on/{fps}*1.1)':"
                          f"y='ih/2-(ih/zoom/2)+10*sin(on/{fps}*0.8)'"),
        "push_in":       f"z='1+0.20*pow(on/{n1},2)':{center}",
        "push_out":      f"z='1.20-0.20*pow(on/{n1},2)':{center}",
        "shake":         ("z=1.03:x='iw/2-(iw/zoom/2)+4*sin(on*1.7)+3*sin(on*0.83)':"
                          "y='ih/2-(ih/zoom/2)+3*sin(on*2.3)+2*sin(on*1.1)'"),
        "shake_soft":    ("z=1.02:x='iw/2-(iw/zoom/2)+2*sin(on*1.3)+1.5*sin(on*0.7)':"
                          "y='ih/2-(ih/zoom/2)+1.5*sin(on*1.9)'"),
        "hold":          f"z=1.06:{center}",
    }
    return e.get(motion, e["zoom_in"])


# движения для видео: статика чаще, лёгкие панорамы/зумы/дрейф — акцентами
VIDEO_MOTIONS = ["static", "static", "static", "static",
                 "v_pan_r", "v_pan_l", "v_drift",
                 "v_zoom_in", "v_zoom_out"]


def render_segment(src: Path, kind: str, dur: float, dest: Path,
                   w: int, h: int, fps: int, rng: random.Random,
                   motion: str | None = None, extra_vf: str = ""):
    """Один сегмент: картинка с движением или обрезанное видео. Без звука.
    extra_vf — доп. фильтр (например, цветокор по главам)."""
    dur = max(dur, 0.2)
    tail_vf = (extra_vf + "," if extra_vf else "") + "format=yuv420p,setsar=1"
    if kind == "image":
        frames = max(int(round(dur * fps)), 2)
        motion = motion or rng.choice(IMAGE_MOTIONS)
        if motion == "parallax":
            # передний план поверх своей размытой тёмной копии,
            # слои движутся с разной скоростью — псевдо-3D
            n1 = max(frames - 1, 1)
            fg_h = int(h * 0.82) // 2 * 2
            amp = int(w * 0.05)
            fc = (
                f"[0:v]split[bg0][fg0];"
                f"[bg0]scale={w * 2}:-2:flags=lanczos,"
                f"zoompan=z=1.06:x='(iw-iw/zoom)*on/{n1}':"
                f"y='ih/2-(ih/zoom/2)':d={frames}:s={w}x{h}:fps={fps},"
                f"gblur=sigma=16,eq=brightness=-0.28[bg];"
                f"[fg0]scale=-2:{fg_h}:flags=lanczos[fg];"
                f"[bg][fg]overlay=eof_action=repeat:"
                f"x='(W-w)/2-{amp}+{amp * 2}*n/{frames}':y='(H-h)/2',"
                + tail_vf)
            try:
                _run(["ffmpeg", "-y", "-i", str(src), "-filter_complex", fc,
                      "-c:v", "libx264", "-preset", PRESET_SEG,
                      "-crf", CRF_SEGMENT, "-an", str(dest)], label=dest.stem)
                if not _has_video(dest):
                    raise RuntimeError("пустой результат")
            except RuntimeError as e:
                if CANCEL.is_set():
                    raise
                _console(f"[{dest.stem}] parallax не получился "
                         f"({str(e)[:80]}) — заглушка")
                _placeholder(dest, dur, w, h, fps)
            return
        vf = (f"scale={w * 2}:-2:flags=lanczos,"
              f"zoompan={_motion_expr(motion, frames, fps)}"
              f":d={frames}:s={w}x{h}:fps={fps},"
              + tail_vf)
        try:
            _run(["ffmpeg", "-y", "-i", str(src), "-vf", vf,
                  "-c:v", "libx264", "-preset", PRESET_SEG, "-crf", CRF_SEGMENT,
                  "-an", str(dest)], label=dest.stem)
            if not _has_video(dest):
                raise RuntimeError("пустой результат")
        except RuntimeError as e:
            if CANCEL.is_set():
                raise
            _console(f"[{dest.stem}] картинка не закодировалась "
                     f"({str(e)[:80]}) — заглушка")
            _placeholder(dest, dur, w, h, fps)
    else:
        src_dur = _video_dur(src) or audio_duration(src) or dur
        offset = rng.uniform(0, src_dur - dur) if src_dur > dur + 0.5 else 0
        motion = motion or rng.choice(VIDEO_MOTIONS)
        D = max(dur, 0.5)
        if motion in ("v_pan_r", "v_pan_l", "v_drift", "v_shake"):
            # запас 8% и окно постоянного размера w x h с анимированным x/y
            w2 = int(w * 1.08) // 2 * 2
            h2 = int(h * 1.08) // 2 * 2
            pans = {
                "v_pan_r": f"x='(iw-{w})*min(t/{D:.3f},1)':y='(ih-{h})/2'",
                "v_pan_l": f"x='(iw-{w})*(1-min(t/{D:.3f},1))':y='(ih-{h})/2'",
                "v_drift": (f"x='(iw-{w})/2+{max(int(w * 0.012), 6)}*sin(t*0.6)':"
                            f"y='(ih-{h})/2+{max(int(h * 0.012), 5)}*sin(t*0.42)'"),
                "v_shake": (f"x='(iw-{w})/2+5*sin(t*11)+3*sin(t*6.3)':"
                            f"y='(ih-{h})/2+4*sin(t*13.7)'"),
            }
            vf = (f"scale={w2}:{h2}:force_original_aspect_ratio=increase,"
                  f"crop={w2}:{h2},fps={fps},"
                  f"crop={w}:{h}:{pans[motion]},")
        elif motion in ("v_zoom_in", "v_zoom_out"):
            frames = max(int(round(D * fps)), 2)
            zexpr = _motion_expr(
                "zoom_in" if motion == "v_zoom_in" else "zoom_out", frames, fps)
            vf = (f"scale={w}:{h}:force_original_aspect_ratio=increase,"
                  f"crop={w}:{h},fps={fps},"
                  f"zoompan={zexpr}:d=1:s={w}x{h}:fps={fps},")
        else:  # static
            vf = (f"scale={w}:{h}:force_original_aspect_ratio=increase,"
                  f"crop={w}:{h},fps={fps},")
        if src_dur - offset < dur + 0.05:
            # исходник короче сцены — замораживаем последний кадр, иначе
            # сегмент выйдет коротким и xfade-склейка оборвёт видеодорожку
            vf += "tpad=stop_mode=clone:stop=-1,"

        def enc(off: float, pad: bool = False):
            v = vf
            if pad and "tpad" not in v:
                v += "tpad=stop_mode=clone:stop=-1,"
            _run(["ffmpeg", "-y", "-ss", f"{off:.2f}", "-i", str(src),
                  "-t", f"{dur:.3f}", "-vf", v + tail_vf,
                  "-c:v", "libx264", "-preset", PRESET_SEG,
                  "-crf", CRF_SEGMENT, "-an", str(dest)], label=dest.stem)

        try:
            enc(offset)
            ok = _has_video(dest)
        except RuntimeError as e:
            if CANCEL.is_set():
                raise
            _console(f"[{dest.stem}] не закодировался ({str(e)[:100]})")
            ok = False
        if not ok:
            _console(f"[{dest.stem}] пустой сегмент (offset {offset:.1f} c "
                     f"за концом видеопотока {src.name}?) — пробую с начала")
            try:
                enc(0, pad=True)
                ok = _has_video(dest)
            except RuntimeError as e:
                if CANCEL.is_set():
                    raise
                ok = False
        if not ok:
            _console(f"[{dest.stem}] исходник не читается — ставлю заглушку, "
                     "рендер продолжается")
            _placeholder(dest, dur, w, h, fps)


# ---------- 3. Переходы ----------

def pick_transitions(n: int, rng: random.Random) -> list[tuple[str, float]]:
    """n-1 переходов из пула, взвешенно, без повторов подряд."""
    names = [t[0] for t in TRANSITIONS]
    durs = {t[0]: t[1] for t in TRANSITIONS}
    weights = [t[2] for t in TRANSITIONS]
    out, prev = [], None
    for _ in range(max(n - 1, 0)):
        for _try in range(10):
            ch = rng.choices(names, weights=weights)[0]
            if ch != prev:
                break
        out.append((ch, durs[ch]))
        prev = ch
    return out


def render_group(seg_files: list[Path], durs: list[float],
                 trans: list[tuple[str, float]], dest: Path, fps: int,
                 chromab: bool = False, w: int = 1920, h: int = 1080):
    """Склейка группы сегментов цепочкой xfade одной командой.
    chromab — хроматическая аберрация в момент каждого перехода."""
    # страховка: сегмент без видеопотока рвёт xfade ошибкой
    # «matches no streams» — заменяем такой заглушкой до склейки
    for f, d in zip(seg_files, durs):
        if not _has_video(f):
            _console(f"[{dest.stem}] {f.name} без видеопотока — заглушка")
            _placeholder(f, d + 1.0, w, h, fps)
    if len(seg_files) == 1:
        seg_files[0].replace(dest)
        return
    cmd = ["ffmpeg", "-y"]
    for f in seg_files:
        cmd += ["-i", str(f)]
    # фактические длительности сегментов: страховка от коротких исходников —
    # offset за пределами накопленного потока обрывает xfade-цепочку
    real = [audio_duration(f) or d for f, d in zip(seg_files, durs)]
    fc, acc = "", "[0:v]"
    acc_len = real[0]     # фактическая длина накопленного потока
    want_off = 0.0        # желаемый offset по плану (для синхрона со звуком)
    tr_times = []         # моменты переходов (для аберрации)
    for k in range(1, len(seg_files)):
        name, tdur = trans[k - 1]
        want_off += durs[k - 1]
        if name == "cut" or tdur <= 0:
            name, tdur = "fade", 1.0 / fps    # технически xfade, визуально cut
        tdur = max(min(tdur, real[k] - 0.1), 1.0 / fps)
        off = min(want_off, max(acc_len, tdur))
        lbl = f"[vx{k}]"
        fc += (f"{acc}[{k}:v]xfade=transition={name}:"
               f"duration={tdur:.3f}:offset={off - tdur:.3f}{lbl};")
        acc = lbl
        acc_len = (off - tdur) + real[k]
        if tdur > 0.1:
            tr_times.append((off - tdur, off))
    if chromab and tr_times:
        enable = "+".join(f"between(t,{a - 0.05:.3f},{b + 0.05:.3f})"
                          for a, b in tr_times)
        fc += f"{acc}rgbashift=rh=4:bv=4:enable='{enable}'[vab];"
        acc = "[vab]"
    fc = fc.rstrip(";")
    cmd += ["-filter_complex", fc, "-map", acc,
            "-c:v", "libx264", "-preset", PRESET_SEG, "-crf", CRF_SEGMENT,
            "-r", str(fps), str(dest)]
    try:
        _run(cmd, label=dest.stem)
    except RuntimeError as e:
        if CANCEL.is_set():
            raise
        # xfade-цепочка тяжёлая (8 декодеров разом): если ffmpeg убит или
        # упал — собираем группу встык, рендер продолжается без переходов
        _console(f"[{dest.stem}] xfade-склейка не удалась "
                 f"({str(e)[:120]}) — собираю группу встык (hard cut)")
        _group_concat_fallback(seg_files, durs, dest, fps)


def _group_concat_fallback(seg_files: list[Path], durs: list[float],
                           dest: Path, fps: int):
    """Запасная склейка группы без переходов: каждый сегмент обрезается до
    плановой длительности (хвосты под переходы больше не нужны) и клеится
    concat-демуксером. Дешевле по памяти в разы."""
    parts = []
    for i, (f, d) in enumerate(zip(seg_files, durs)):
        p = dest.parent / f"{dest.stem}_cut{i:02d}.mp4"
        _run(["ffmpeg", "-y", "-i", str(f), "-t", f"{d:.3f}", "-r", str(fps),
              "-c:v", "libx264", "-preset", PRESET_SEG, "-crf", CRF_SEGMENT,
              "-an", str(p)], label=p.stem)
        parts.append(p)
    lst = dest.parent / f"{dest.stem}_list.txt"
    lst.write_text("\n".join(f"file '{p.resolve().as_posix()}'" for p in parts),
                   encoding="utf-8")
    # ВАЖНО: НЕ "-c copy". Куски кодировались отдельными вызовами ffmpeg —
    # у них независимые внутренние временные метки, и потоковая склейка
    # без перекодирования копирует эти метки как есть. На стыке это дало
    # рассинхрон PTS: реальный ролик (11) 23 секунды кадра "застывали"
    # (счётчик кадров почти не рос, а таймкод разом скакнул на 23с вперёд —
    # видно по логу finalного прохода). Перекодирование пересчитывает PTS
    # с нуля по кадрам — дороже по CPU, но без разрыва.
    _run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(lst),
          "-c:v", "libx264", "-preset", PRESET_SEG, "-crf", CRF_SEGMENT,
          "-r", str(fps), "-fflags", "+genpts", str(dest)], label=dest.stem)


# ---------- 4. Финальная сборка ----------

SUB_SIZES = {"мелкие": 15, "средние": 19, "крупные": 24, "огромные": 36}


def _subtitles_filter(srt: Path, size: int = 19, style_name: str = "bold_box") -> str:
    """Красивые субтитры для YouTube. Стили:
      bold_box   — крупный жирный белый, толстая обводка + мягкая тень
                   (универсальный «документальный» вид)
      pill       — белый текст на полупрозрачной тёмной плашке
      yellow_pop — жёлтый жирный с чёрной обводкой (viral/MrBeast-стиль)
    Позиция — нижняя треть, с воздухом от края."""
    p = str(srt.resolve()).replace("\\", "/").replace(":", "\\:")
    # Bold=0: шрифт "Segoe UI Black" сам по себе уже самого жирного начертания
    # — Bold=1 поверх него раньше давал "фальшивый" сверх-жир (жалоба: "слишком
    # жирный"). Обводка/тень тоже почти вдвое тоньше — раньше 3.0-3.4/1.2-1.4
    # выглядело как тяжёлый ободок-ореол вокруг каждой буквы.
    common = (f"FontName=Segoe UI Black,FontSize={size},Bold=0,"
              "Alignment=2,MarginV=60,MarginL=90,MarginR=90,Spacing=0.3")
    if style_name == "pill":            # текст на полупрозрачной плашке
        style = (common + ",PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,"
                 "BackColour=&HA0000000,BorderStyle=4,Outline=14,Shadow=0")
    elif style_name == "yellow_pop":    # жёлтый viral (MrBeast-стиль)
        style = (common + ",PrimaryColour=&H0000F0FF,OutlineColour=&H00101010,"
                 "BorderStyle=1,Outline=1.8,Shadow=0.6")
    elif style_name == "cyan_pop":      # голубой неон
        style = (common + ",PrimaryColour=&H00F0FF00,OutlineColour=&H00201000,"
                 "BorderStyle=1,Outline=1.8,Shadow=0.7")
    elif style_name == "red_alert":     # красный акцент (под красную тему)
        style = (common + ",PrimaryColour=&H004040FF,OutlineColour=&H00101010,"
                 "BorderStyle=1,Outline=1.8,Shadow=0.6")
    elif style_name == "thin_clean":    # тонкий контур, минимализм
        style = (common + ",PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,"
                 "BorderStyle=1,Outline=1.2,Shadow=0.5")
    elif style_name == "top":           # субтитры сверху (не мешают кадру)
        style = (common.replace("Alignment=2", "Alignment=8")
                 .replace("MarginV=60", "MarginV=50")
                 + ",PrimaryColour=&H00FFFFFF,OutlineColour=&H00151515,"
                 "BorderStyle=1,Outline=1.8,Shadow=0.6")
    else:  # bold_box — по умолчанию: белый, аккуратная обводка + мягкая тень
        style = (common + ",PrimaryColour=&H00FFFFFF,OutlineColour=&H00151515,"
                 "BorderStyle=1,Outline=2.0,Shadow=0.7,BackColour=&H40000000")
    return f"subtitles='{p}':force_style='{style}'"


def _ass_escape(text: str) -> str:
    return text.replace("{", "(").replace("}", ")").replace("\n", " ")


def build_karaoke_ass(srt_path: Path, words_path: Path, dest: Path,
                      W: int, H: int, size: int = 19,
                      accent: str = "29d9ff") -> Path | None:
    """Цветные субтитры с пословной подсветкой (караоке-заливка) точно в
    такт озвучке: слово подсвечивается акцентным цветом в момент, когда его
    произносят. Границы и текст фраз — как в voiceover.srt (уже ровно
    разбиты Whisper'ом на строки <=42 симв.); таймкоды каждого слова —
    из voiceover.json (--word_timestamps). Если слов меньше, чем в тексте
    фразы (несовпадение токенизации), остаток распределяется поровну —
    видимый текст никогда не обрезается.
    None, если voiceover.json нет или в нём пусто (старый Whisper без
    --output_format all) — вызывающий откатывается на обычные субтитры."""
    words = load_whisper_words(words_path)
    if not words:
        return None
    phrases = parse_srt(srt_path)
    if not phrases:
        return None

    # BGR-hex для ASS (не RGB!)
    def bgr(hexrgb: str) -> str:
        r, g, b = hexrgb[0:2], hexrgb[2:4], hexrgb[4:6]
        return f"&H00{b}{g}{r}".upper()

    primary = bgr(accent)      # уже произнесённое слово — акцент
    secondary = "&H00E6E6E6"   # ещё не произнесённое — светло-серый
    outline = "&H00151515"

    header = f"""[Script Info]
ScriptType: v4.00+
WrapStyle: 0
PlayResX: {W}
PlayResY: {H}
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, \
OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, \
ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, \
MarginR, MarginV, Encoding
Style: Karaoke,Segoe UI Black,{size},{primary},{secondary},{outline},\
&H64000000,0,0,0,0,100,100,0.3,0,1,2.0,0.6,2,90,90,60,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

    def fmt(t: float) -> str:
        cs = round(t * 100)
        h, rem = divmod(cs, 360000)
        m, rem = divmod(rem, 6000)
        s, cs = divmod(rem, 100)
        return f"{h:d}:{m:02d}:{s:02d}.{cs:02d}"

    wi = 0  # указатель в общем списке слов — фразы идут по порядку
    lines = []
    for start_s, end_s, text in phrases:
        p_start, p_end = srt_to_seconds(start_s), srt_to_seconds(end_s)
        toks = text.split()
        if not toks:
            continue
        # берём следующие len(toks) слов из общего списка — тот же прогон
        # Whisper, порядок гарантированно совпадает даже при иной пунктуации
        chunk = words[wi:wi + len(toks)]
        wi += len(chunk)
        if len(chunk) < len(toks):  # запасной путь: не хватило слов
            even = (p_end - p_start) / len(toks)
            chunk = [{"start": p_start + i * even,
                     "end": p_start + (i + 1) * even}
                     for i in range(len(toks))]
        k_tags = []
        for i, (tok, w) in enumerate(zip(toks, chunk)):
            nxt = chunk[i + 1]["start"] if i + 1 < len(chunk) else p_end
            dur_cs = max(round((nxt - w["start"]) * 100), 1)
            k_tags.append(f"{{\\k{dur_cs}}}{_ass_escape(tok)}")
        # лёгкий «влёт» строки: 85% -> 100% за 180мс
        body = ("{\\fscx85\\fscy85\\t(0,180,\\fscx100\\fscy100)}"
                + " ".join(k_tags))
        lines.append(f"Dialogue: 0,{fmt(p_start)},{fmt(p_end)},Karaoke,,"
                     f"0,0,0,,{body}")

    dest.write_text(header + "\n".join(lines) + "\n", encoding="utf-8")
    return dest


def _ass_filter(ass_path: Path) -> str:
    p = str(ass_path.resolve()).replace("\\", "/").replace(":", "\\:")
    return f"ass='{p}'"


# Цветокор-пресеты (выбор на вкладке «Авторендер»; «случайный» решает
# seed проекта). Применяются до субтитров, чтобы текст оставался чистым.
LOOKS = {
    "teal_orange":   "colorbalance=rs=.08:bs=-.06:rm=.05:bm=-.05,"
                     "eq=saturation=1.1:contrast=1.05",
    "cinematic":     "eq=brightness=-0.04:contrast=1.12:saturation=0.92",
    "golden_hour":   "colorbalance=rs=.1:gs=.03:bs=-.08,"
                     "eq=brightness=0.02:saturation=1.1",
    "warm_sunset":   "colortemperature=temperature=4600,eq=saturation=1.08",
    "cold_thriller": "colortemperature=temperature=8600,"
                     "eq=saturation=0.9:contrast=1.07",
    "arctic":        "colortemperature=temperature=9500,"
                     "eq=saturation=0.7:brightness=0.03",
    "moonlight":     "colorbalance=bs=.12:bm=.06,"
                     "eq=brightness=-0.05:saturation=0.8",
    "sepia":         "colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:"
                     ".272:.534:.131",
    "bw_noir":       "hue=s=0,eq=contrast=1.25:brightness=-0.02",
    "bw_soft":       "hue=s=0,eq=contrast=1.05",
    "faded_film":    "curves=all='0/0.06 0.5/0.5 1/0.94',eq=saturation=0.85",
    "vintage_70s":   "curves=r='0/0.04 1/0.95':b='0/0.1 1/0.88',"
                     "eq=saturation=0.9",
    "cross_process": "curves=r='0/0 0.5/0.55 1/1':b='0/0.1 0.5/0.45 1/0.9'",
    "dreamy":        "gblur=sigma=1.1,eq=brightness=0.03:saturation=1.05",
    "crisp":         "unsharp=5:5:0.8,eq=saturation=1.05",
    "high_contrast": "eq=contrast=1.2:saturation=1.05",
    "bleach":        "eq=saturation=0.45:contrast=1.25",
    "pastel":        "eq=saturation=0.78:brightness=0.04:contrast=0.95",
    "cyberpunk":     "colorbalance=rs=-.05:bs=.15:rm=.02:bm=.1,"
                     "eq=saturation=1.25:contrast=1.08",
    "matrix":        "colorbalance=gs=.12:gm=.08,"
                     "eq=saturation=0.85:contrast=1.1",
    "crimson":       "colorbalance=rs=.15:rm=.08,eq=saturation=1.05",
    "forest":        "colorbalance=gs=.08:gm=.05,eq=saturation=1.02",
    "documentary":   "eq=saturation=0.97:contrast=1.03",
    "noir_blue":     "colorbalance=bs=.1:bm=.05,hue=s=0.35,"
                     "eq=contrast=1.18:brightness=-0.03",
    "sunbleached":   "curves=all='0/0.1 0.5/0.55 1/0.95',"
                     "eq=saturation=0.7:brightness=0.05",
}


def _style_chain(opts: dict) -> list[str]:
    chain = []
    if opts.get("vhs"):
        chain.append("noise=alls=10:allf=t,rgbashift=rh=2:bv=2,"
                     "gblur=sigma=0.4,eq=saturation=0.88:contrast=1.05")
    else:
        if opts.get("grain"):
            chain.append("noise=alls=6:allf=t")
    # --- эффекты поверх кадра (световые блики, засветка, пыль, мерцание) ---
    if opts.get("light_leak"):
        # мягкое движущееся световое пятно у края — «плёночная» засветка
        chain.append("vignette=angle=PI/5:x0=w*0.85:y0=h*0.2:mode=backward,"
                     "eq=brightness=0.015")
    if opts.get("bloom"):
        # Свечение светлых участков — деликатный кинематографичный «glow».
        # Стиль-цепочка идёт ПОСЛЕДНИМ слоем (поверх титров/субтитров), а
        # белый текст титра — самый яркий объект в кадре, поэтому сильный
        # bloom раздувал его в уродливый белый ореол. Ключевое: сначала
        # curves отсекает всё, кроме почти-белого (0.72 порог), и только
        # это малое ярко-светлое размывается — текст не бьёт в глаза
        # гало, а реально светлые пятна (небо, огни) мягко светятся.
        chain.append("split[a][b];"
                     "[b]curves=all='0/0 0.72/0 1/1',gblur=sigma=9[bl];"
                     "[a][bl]blend=all_mode=screen:all_opacity=0.16")
    if opts.get("dust"):
        # редкие крапинки-пылинки, как на старой плёнке
        chain.append("noise=alls=3:allf=t+u,eq=contrast=1.02")
    if opts.get("flicker"):
        # лёгкое мерцание яркости — «живая» плёнка
        chain.append("eq=brightness='0.012*sin(2*PI*t*3)'")
    if opts.get("vignette"):
        chain.append("vignette=angle=PI/5")
    if opts.get("letterbox"):
        chain.append("drawbox=x=0:y=0:w=iw:h=ih*0.125:color=black:t=fill,"
                     "drawbox=x=0:y=ih*0.875:w=iw:h=ih*0.125:color=black:t=fill")
    return chain


def assemble(group_files: list[Path], audio: Path, srt: Path | None,
             dest: Path, fps: int, total: float, opts: dict, tmp: Path,
             look_chain: str = "", ovls: list[dict] | None = None,
             wh: tuple[int, int] = (1920, 1080)):
    """Финал: конкат групп + оверлеи + звук + субтитры + цветокор + стиль.
    Порядок слоёв: сцена -> цветокор -> оверлеи -> субтитры -> стиль."""
    concat_list = tmp / "groups.txt"
    concat_list.write_text(
        "\n".join(f"file '{f.resolve().as_posix()}'" for f in group_files),
        encoding="utf-8")
    filters = []
    if look_chain:                        # цветокор до субтитров и оверлеев
        filters.append(look_chain)
    post = []                             # после оверлеев: субтитры и стиль
    if srt and srt.exists() and opts.get("subs", True):
        size = SUB_SIZES.get(opts.get("sub_size", "средние"), 19)
        style_name = opts.get("sub_style", "bold_box")
        sub_filter = None
        if style_name == "karaoke":
            words_json = srt.parent / "voiceover.json"
            ass = build_karaoke_ass(srt, words_json, tmp / "karaoke.ass",
                                    wh[0], wh[1], size,
                                    opts.get("accent_color", "d9b36c"))
            if ass:
                sub_filter = _ass_filter(ass)
            else:
                style_name = "bold_box"   # нет voiceover.json — откат
        if sub_filter is None:
            sub_filter = _subtitles_filter(srt, size, style_name)
        post.append(sub_filter)
    post += _style_chain(opts)
    post.append("format=yuv420p")

    cmd = ["ffmpeg", "-y", "-f", "concat", "-safe", "0",
           "-i", str(concat_list), "-i", str(audio)]
    if ovls:
        for ov in ovls:
            cmd += ["-framerate", str(fps), "-start_number", "0",
                    "-i", ov["pattern"]]
        fc = "[0:v]" + (",".join(filters) if filters else "null") + "[vb];"
        prev = "[vb]"
        for i, ov in enumerate(ovls):
            fc += (f"[{2 + i}:v]setpts=PTS-STARTPTS+{ov['t0']:.3f}/TB[o{i}];"
                   f"{prev}[o{i}]overlay={ov['x']}:{ov['y']}:"
                   f"eof_action=pass:"
                   f"enable='between(t,{ov['t0']:.3f},{ov['t1']:.3f})'"
                   f"[vo{i}];")
            prev = f"[vo{i}]"
        fc += prev + ",".join(post) + "[vout]"
        cmd += ["-filter_complex", fc, "-map", "[vout]", "-map", "1:a"]
    else:
        cmd += ["-map", "0:v", "-map", "1:a",
                "-vf", ",".join(filters + post)]
    cmd += ["-t", f"{total:.3f}",
            "-c:v", "libx264", "-preset", PRESET_FINAL, "-crf", CRF_FINAL,
            "-c:a", "aac", "-b:a", "192k", str(dest)]
    _run(cmd, label="финал")


# ---------- Оркестратор ----------

def render_project(out_dir: Path, log, progress=None, opts: dict | None = None):
    """Полный авторендер. opts: resolution, fps, intensity, grain, vignette,
    letterbox, vhs, subs. progress(done, total) — для прогресс-бара."""
    opts = opts or {}
    out_dir = Path(out_dir)
    CANCEL.clear()
    global CRF_SEGMENT, CRF_FINAL, PRESET_SEG, PRESET_FINAL
    if opts.get("draft"):   # черновик: 720p + быстрый кодек — проверка монтажа
        w, h = 1280, 720
        CRF_SEGMENT, CRF_FINAL = "26", "26"
        PRESET_SEG = PRESET_FINAL = "ultrafast"
    else:
        w, h = RESOLUTIONS.get(opts.get("resolution", "1080p"), (1920, 1080))
        # пресет качества: чем ниже CRF, тем лучше картинка (и больше файл)
        q = {"обычное":    ("18", "19", "fast", "medium"),
             "высокое":    ("16", "16", "medium", "slow"),
             "максимум":   ("14", "14", "medium", "slow")}
        CRF_SEGMENT, CRF_FINAL, PRESET_SEG, PRESET_FINAL = \
            q.get(opts.get("quality", "обычное"), q["обычное"])
    fps = int(opts.get("fps", 30))
    intensity = opts.get("intensity", "средняя")

    audio = out_dir / "audio" / "voiceover_music.mp3"
    if opts.get("no_music") or not audio.exists():
        audio = out_dir / "audio" / "voiceover.mp3"
    srt = out_dir / "subs" / "voiceover.srt"
    if not audio.exists():
        raise RuntimeError("Нет озвучки (audio/voiceover.mp3).")
    if not srt.exists():
        raise RuntimeError("Нет субтитров (subs/voiceover.srt) — таймкоды "
                           "фраз нужны для монтажа. Прогони Whisper.")

    total = audio_duration(audio)
    if not total:
        raise RuntimeError("Не удалось измерить длительность озвучки (ffprobe).")
    seed = project_seed(out_dir)
    rng = random.Random(seed)
    look = opts.get("look", "нет")
    if look == "случайный":
        look = rng.choice(sorted(LOOKS))
    look_chain = LOOKS.get(look, "")
    log(f"[Рендер] {w}x{h}@{fps}, интенсивность: {intensity}, seed {seed}, "
        f"звук {audio.name} ({total:.0f} c)")
    log(f"[Рендер] Палитра: {len(TRANSITIONS)} переходов, "
        f"{len(IMAGE_MOTIONS)} движений картинки, "
        f"{len(set(VIDEO_MOTIONS))} движений видео, "
        f"цветокор: {look if look_chain else 'нет'}")

    scenes = build_render_plan(parse_srt(srt), total, rng, intensity)
    assign_materials(scenes, out_dir, rng, log)
    log(f"[Рендер] План: {len(scenes)} сцен, "
        f"средняя {total / len(scenes):.1f} c")

    tmp = out_dir / "render_tmp"
    tmp.mkdir(parents=True, exist_ok=True)
    trans = pick_transitions(len(scenes), rng)

    # шаги прогресса: сегменты + группы + финал
    n_groups = (len(scenes) + GROUP_SIZE - 1) // GROUP_SIZE
    steps_total = len(scenes) + n_groups + 1
    step = 0

    def tick():
        nonlocal step
        step += 1
        if progress:
            progress(step, steps_total)

    # 2. сегменты (учитываем хвост под переход к следующему)
    def _chapter_grade(pos: float) -> str:
        """Цветокор по главам: завязка нейтральная, середина холоднее
        (напряжение), развязка теплее."""
        if pos < 0.15:
            return ""
        if pos < 0.70:
            return "colortemperature=temperature=7400"
        return "colortemperature=temperature=5800,eq=saturation=1.04"

    seg_files, seg_durs = [], []
    for i, sc in enumerate(scenes):
        dur = sc["end"] - sc["start"]
        tail = 0.0
        if i < len(scenes) - 1 and (i + 1) % GROUP_SIZE != 0:
            tdur = trans[i][1]
            tail = min(tdur, dur * 0.4, (scenes[i + 1]["end"] -
                                         scenes[i + 1]["start"]) * 0.4)
            trans[i] = (trans[i][0], tail)   # клампим и запоминаем
        dest = tmp / f"seg_{i:04d}.mp4"
        extra = (_chapter_grade(sc["start"] / total)
                 if opts.get("chapters_grade") else "")
        render_segment(sc["file"], sc["kind"], dur + tail, dest, w, h, fps,
                       rng, extra_vf=extra)
        seg_files.append(dest)
        seg_durs.append(dur)
        log(f"[Рендер] Сегмент {i + 1}/{len(scenes)}: "
            f"{sc['file'].name} ({dur:.1f} c, {sc['kind']})")
        tick()

    # 3. группы (границы групп склеиваются встык — стык прячем в fadeblack)
    group_files = []
    for g in range(n_groups):
        lo, hi = g * GROUP_SIZE, min((g + 1) * GROUP_SIZE, len(scenes))
        dest = tmp / f"group_{g:03d}.mp4"
        render_group(seg_files[lo:hi], seg_durs[lo:hi],
                     trans[lo:hi - 1], dest, fps,
                     chromab=bool(opts.get("chromab")), w=w, h=h)
        group_files.append(dest)
        log(f"[Рендер] Группа {g + 1}/{n_groups} склеена "
            f"(сцены {lo + 1}-{hi})")
        tick()

    # 4. финал
    ovls = []
    try:
        import overlays as _ovmod
        ovls = _ovmod.build_overlays(out_dir, w, h, fps, tmp, log)
    except Exception as e:
        log(f"[Оверлеи] Пропущены целиком ({e.__class__.__name__}: {e})")

    # имя выходного файла настраивается (иначе output_final.mp4)
    out_name = str(opts.get("out_name") or "output_final").strip()
    out_name = re.sub(r"[^\w\- ]+", "_", out_name) or "output_final"
    if not out_name.lower().endswith(".mp4"):
        out_name += ".mp4"
    final = out_dir / out_name
    # Файл с таким именем уже есть? Раньше рендер падал в самом конце, если
    # старый файл был открыт в плеере/Premiere (Windows блокирует запись).
    # Пробуем перезаписать, при блокировке — пишем с суффиксом _2, _3…
    if final.exists():
        try:
            final.unlink()
        except OSError:
            stem = final.stem
            for k in range(2, 100):
                alt = out_dir / f"{stem}_{k}.mp4"
                if not alt.exists():
                    final = alt
                    log(f"[Рендер] «{out_name}» занят (открыт в плеере?) — "
                        f"сохраняю как {alt.name}")
                    break
    log("[Рендер] Финальный проход: звук + оверлеи + субтитры + цветокор...")
    assemble(group_files, audio, srt, final, fps, total, opts, tmp,
             look_chain, ovls, (w, h))
    tick()
    size_mb = final.stat().st_size / 1e6
    shutil.rmtree(tmp, ignore_errors=True)   # временные сегменты больше не нужны
    log(f"[Рендер] ГОТОВО: {final} ({size_mb:.0f} МБ). Временные файлы "
        "удалены. Это черновик — доведи в Premiere перед публикацией.")
    return final
