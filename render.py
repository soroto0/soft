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

from core import srt_to_seconds, parse_srt, audio_duration

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
# Полная палитра xfade ffmpeg 5+ (58 переходов + cut). Веса подобраны так,
# чтобы база (fade/cut/zoom) оставалась частой, а экзотика шла акцентами —
# иначе монтаж превращается в калейдоскоп.
TRANSITIONS = [
    # база
    ("fade",        0.55, 26), ("cut",       0.00, 12),
    ("fadefast",    0.35, 6),  ("fadeslow",  0.80, 4),
    ("dissolve",    0.45, 6),  ("fadegrays", 0.50, 3),
    ("fadeblack",   0.60, 9),  ("fadewhite", 0.25, 4),
    ("distance",    0.50, 2),  ("hblur",     0.40, 3),
    ("pixelize",    0.40, 2),  ("zoomin",    0.40, 7),
    # wipes
    ("wipeleft",    0.40, 3),  ("wiperight", 0.40, 3),
    ("wipeup",      0.40, 2),  ("wipedown",  0.40, 2),
    ("wipetl",      0.40, 1),  ("wipetr",    0.40, 1),
    ("wipebl",      0.40, 1),  ("wipebr",    0.40, 1),
    # слайды, накрытия, открытия
    ("slideleft",   0.40, 3),  ("slideright", 0.40, 3),
    ("slideup",     0.40, 2),  ("slidedown",  0.40, 2),
    ("coverleft",   0.40, 2),  ("coverright", 0.40, 2),
    ("coverup",     0.40, 1),  ("coverdown",  0.40, 1),
    ("revealleft",  0.40, 2),  ("revealright", 0.40, 2),
    ("revealup",    0.40, 1),  ("revealdown", 0.40, 1),
    # плавные свайпы
    ("smoothleft",  0.35, 4),  ("smoothright", 0.35, 4),
    ("smoothup",    0.35, 2),  ("smoothdown",  0.35, 2),
    # геометрия
    ("circlecrop",  0.50, 2),  ("rectcrop",   0.50, 2),
    ("circleopen",  0.50, 3),  ("circleclose", 0.50, 3),
    ("vertopen",    0.45, 2),  ("vertclose",  0.45, 2),
    ("horzopen",    0.45, 2),  ("horzclose",  0.45, 2),
    ("radial",      0.50, 3),
    # диагонали и слайсы
    ("diagtl",      0.45, 1),  ("diagtr",     0.45, 1),
    ("diagbl",      0.45, 1),  ("diagbr",     0.45, 1),
    ("hlslice",     0.45, 2),  ("hrslice",    0.45, 2),
    ("vuslice",     0.45, 2),  ("vdslice",    0.45, 2),
    # ветер и сжатие
    ("hlwind",      0.50, 2),  ("hrwind",     0.50, 2),
    ("vuwind",      0.50, 2),  ("vdwind",     0.50, 2),
    ("squeezeh",    0.45, 2),  ("squeezev",   0.45, 2),
]

INTENSITY = {
    "слабая":  dict(short=(3.0, 5.0), long=(8.0, 12.0), burst_every=(90, 120),
                    short_prob=0.15),
    "средняя": dict(short=(2.5, 4.0), long=(7.0, 11.0), burst_every=(75, 100),
                    short_prob=0.25),
    "сильная": dict(short=(2.0, 3.5), long=(6.0, 9.0),  burst_every=(60, 85),
                    short_prob=0.35),
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
    return scenes


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

    pi = 0
    for sc in scenes:
        f = None
        for item in timeline:                # привязка по смыслу (раскадровка)
            if item.get("file") and item["start"] <= sc["start"] < item["end"]:
                p = Path(item["file"])
                if p.exists():
                    f = p
                break
        if f is None and pool:
            f = pool[pi % len(pool)]
            pi += 1
        if f is None:
            raise RuntimeError("Не хватило материала для сцены "
                               f"{sc['start']:.0f}s.")
        sc["file"] = f
        sc["kind"] = "image" if f.suffix.lower() in IMAGE_EXTS else "video"
    log(f"[Рендер] Материал: {len(scenes)} сцен "
        f"({'таймлайн раскадровки + ' if timeline else ''}пул {len(pool)} файлов)")


# ---------- 2. Сегменты ----------

# 26 движений камеры для картинок: зумы, панорамы (4 стороны), диагонали,
# зум+панорама, дуги, дрейф, наезды, тряска, пульс, статика
IMAGE_MOTIONS = [
    "zoom_in", "zoom_out", "zoom_in_fast", "zoom_out_fast", "pulse",
    "pan_right", "pan_left", "pan_up", "pan_down",
    "diag_tl", "diag_tr", "diag_bl", "diag_br",
    "zoompan_r", "zoompan_l", "pullpan_r", "pullpan_l",
    "arc_r", "arc_l", "drift", "drift_fast",
    "push_in", "push_out", "shake", "shake_soft", "hold", "parallax",
]


def _motion_expr(motion: str, frames: int, fps: int) -> str:
    center = "x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
    xmid = "x='iw/2-(iw/zoom/2)'"
    ymid = "y='ih/2-(ih/zoom/2)'"
    zr = 0.15 / frames
    zrf = 0.28 / frames
    n1 = max(frames - 1, 1)
    e = {
        "zoom_in":       f"z='min(zoom+{zr:.6f},1.15)':{center}",
        "zoom_out":      f"z='if(lte(on,1),1.15,max(zoom-{zr:.6f},1.0))':{center}",
        "zoom_in_fast":  f"z='min(zoom+{zrf:.6f},1.28)':{center}",
        "zoom_out_fast": f"z='if(lte(on,1),1.28,max(zoom-{zrf:.6f},1.0))':{center}",
        "pulse":         f"z='1.09+0.05*sin(on/{fps}*1.3)':{center}",
        "pan_right":     f"z=1.15:x='(iw-iw/zoom)*on/{n1}':{ymid}",
        "pan_left":      f"z=1.15:x='(iw-iw/zoom)*(1-on/{n1})':{ymid}",
        "pan_up":        f"z=1.15:{xmid}:y='(ih-ih/zoom)*(1-on/{n1})'",
        "pan_down":      f"z=1.15:{xmid}:y='(ih-ih/zoom)*on/{n1}'",
        "diag_tl":       f"z=1.13:x='(iw-iw/zoom)*on/{n1}':y='(ih-ih/zoom)*on/{n1}'",
        "diag_tr":       f"z=1.13:x='(iw-iw/zoom)*(1-on/{n1})':y='(ih-ih/zoom)*on/{n1}'",
        "diag_bl":       f"z=1.13:x='(iw-iw/zoom)*on/{n1}':y='(ih-ih/zoom)*(1-on/{n1})'",
        "diag_br":       f"z=1.13:x='(iw-iw/zoom)*(1-on/{n1})':y='(ih-ih/zoom)*(1-on/{n1})'",
        "zoompan_r":     f"z='1+0.15*on/{n1}':x='(iw-iw/zoom)*on/{n1}':{ymid}",
        "zoompan_l":     f"z='1+0.15*on/{n1}':x='(iw-iw/zoom)*(1-on/{n1})':{ymid}",
        "pullpan_r":     f"z='1.15-0.13*on/{n1}':x='(iw-iw/zoom)*on/{n1}':{ymid}",
        "pullpan_l":     f"z='1.15-0.13*on/{n1}':x='(iw-iw/zoom)*(1-on/{n1})':{ymid}",
        "arc_r":         (f"z=1.15:x='(iw-iw/zoom)*on/{n1}':"
                          f"y='(ih-ih/zoom)*(0.5+0.45*sin(on/{n1}*3.1416))'"),
        "arc_l":         (f"z=1.15:x='(iw-iw/zoom)*(1-on/{n1})':"
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
                 "v_pan_r", "v_pan_l", "v_drift", "v_shake",
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
    _run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(lst),
          "-c", "copy", str(dest)], label=dest.stem)


# ---------- 4. Финальная сборка ----------

SUB_SIZES = {"мелкие": 12, "средние": 15, "крупные": 19}


def _subtitles_filter(srt: Path, size: int = 15) -> str:
    """Экранирование Windows-пути для фильтра subtitles + стиль:
    белый с чёрной обводкой, нижняя треть кадра, размер настраивается."""
    p = str(srt.resolve()).replace("\\", "/").replace(":", "\\:")
    style = (f"FontName=Arial,FontSize={size},Bold=1,"
             "PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,"
             "Outline=2,Shadow=0,BorderStyle=1,Alignment=2,MarginV=45")
    return f"subtitles='{p}':force_style='{style}'"


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
    if opts.get("vignette"):
        chain.append("vignette=angle=PI/5")
    if opts.get("letterbox"):
        chain.append("drawbox=x=0:y=0:w=iw:h=ih*0.125:color=black:t=fill,"
                     "drawbox=x=0:y=ih*0.875:w=iw:h=ih*0.125:color=black:t=fill")
    return chain


def assemble(group_files: list[Path], audio: Path, srt: Path | None,
             dest: Path, fps: int, total: float, opts: dict, tmp: Path,
             look_chain: str = "", ovls: list[dict] | None = None):
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
        post.append(_subtitles_filter(
            srt, SUB_SIZES.get(opts.get("subs_style", "средние"), 15)))
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
        CRF_SEGMENT, CRF_FINAL = "18", "19"
        PRESET_SEG, PRESET_FINAL = "fast", "medium"
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

    final = out_dir / "output_final.mp4"
    log("[Рендер] Финальный проход: звук + оверлеи + субтитры + цветокор...")
    assemble(group_files, audio, srt, final, fps, total, opts, tmp,
             look_chain, ovls)
    tick()
    size_mb = final.stat().st_size / 1e6
    shutil.rmtree(tmp, ignore_errors=True)   # временные сегменты больше не нужны
    log(f"[Рендер] ГОТОВО: {final} ({size_mb:.0f} МБ). Временные файлы "
        "удалены. Это черновик — доведи в Premiere перед публикацией.")
    return final
