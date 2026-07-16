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
import random
import zlib
import subprocess
from pathlib import Path

from core import srt_to_seconds, parse_srt, audio_duration

RESOLUTIONS = {"1080p": (1920, 1080), "4K": (3840, 2160)}
GROUP_SIZE = 8          # сегментов в одной xfade-команде
CRF_SEGMENT = "18"
CRF_FINAL = "19"

# (xfade transition, длительность, вес). "cut" — жёсткая склейка.
TRANSITIONS = [
    ("fade",        0.55, 30),   # crossfade — базовый
    ("fadeblack",   0.60, 10),   # затемнение между главами
    ("fadewhite",   0.20, 5),    # вспышка
    ("smoothleft",  0.35, 5),    # swipe
    ("smoothright", 0.35, 5),
    ("zoomin",      0.40, 10),   # zoom transition
    ("wipeleft",    0.40, 5),    # luma wipe
    ("wiperight",   0.40, 5),
    ("slideleft",   0.40, 5),
    ("slideright",  0.40, 5),
    ("circleopen",  0.50, 5),
    ("dissolve",    0.45, 5),
    ("cut",         0.00, 10),   # hard cut на границу фразы
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


def _run(cmd: list[str]):
    """ffmpeg с внятной ошибкой (хвост stderr) вместо молчаливого падения."""
    p = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    if p.returncode != 0:
        tail = p.stderr.decode("utf-8", "replace")[-500:]
        raise RuntimeError(f"ffmpeg упал ({' '.join(cmd[:3])}...):\n{tail}")


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

IMAGE_MOTIONS = ["zoom_in", "zoom_out", "pan_right", "pan_left",
                 "diag", "drift", "push_in", "shake"]


def _motion_expr(motion: str, frames: int, fps: int) -> str:
    center = "x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
    ymid = "y='ih/2-(ih/zoom/2)'"
    zr = 0.15 / frames
    n1 = max(frames - 1, 1)
    if motion == "zoom_in":
        return f"z='min(zoom+{zr:.6f},1.15)':{center}"
    if motion == "zoom_out":
        return f"z='if(lte(on,1),1.15,max(zoom-{zr:.6f},1.0))':{center}"
    if motion == "pan_right":
        return f"z=1.15:x='(iw-iw/zoom)*on/{n1}':{ymid}"
    if motion == "pan_left":
        return f"z=1.15:x='(iw-iw/zoom)*(1-on/{n1})':{ymid}"
    if motion == "diag":
        return (f"z=1.13:x='(iw-iw/zoom)*on/{n1}':"
                f"y='(ih-ih/zoom)*on/{n1}'")
    if motion == "drift":       # едва заметное плавание ~3%
        return (f"z=1.04:x='iw/2-(iw/zoom/2)+9*sin(on/{fps}*0.7)':"
                f"y='ih/2-(ih/zoom/2)+6*sin(on/{fps}*0.45)'")
    if motion == "push_in":     # наезд с ускорением к концу
        return f"z='1+0.20*pow(on/{n1},2)':{center}"
    if motion == "shake":       # микро-тряска ~0.7%
        return (f"z=1.03:x='iw/2-(iw/zoom/2)+4*sin(on*1.7)+3*sin(on*0.83)':"
                f"y='ih/2-(ih/zoom/2)+3*sin(on*2.3)+2*sin(on*1.1)'")
    return f"z='min(zoom+{zr:.6f},1.15)':{center}"


def render_segment(src: Path, kind: str, dur: float, dest: Path,
                   w: int, h: int, fps: int, rng: random.Random,
                   motion: str | None = None):
    """Один сегмент: картинка с движением или обрезанное видео. Без звука."""
    dur = max(dur, 0.2)
    if kind == "image":
        frames = max(int(round(dur * fps)), 2)
        motion = motion or rng.choice(IMAGE_MOTIONS)
        vf = (f"scale={w * 2}:-2:flags=lanczos,"
              f"zoompan={_motion_expr(motion, frames, fps)}"
              f":d={frames}:s={w}x{h}:fps={fps},"
              f"format=yuv420p,setsar=1")
        _run(["ffmpeg", "-y", "-i", str(src), "-vf", vf,
              "-c:v", "libx264", "-preset", "fast", "-crf", CRF_SEGMENT,
              "-an", str(dest)])
    else:
        src_dur = audio_duration(src) or dur
        offset = rng.uniform(0, src_dur - dur) if src_dur > dur + 0.5 else 0
        vf = (f"scale={w}:{h}:force_original_aspect_ratio=increase,"
              f"crop={w}:{h},fps={fps},")
        if src_dur - offset < dur + 0.05:
            # исходник короче сцены — замораживаем последний кадр, иначе
            # сегмент выйдет коротким и xfade-склейка оборвёт видеодорожку
            vf += "tpad=stop_mode=clone:stop=-1,"
        vf += "format=yuv420p,setsar=1"
        _run(["ffmpeg", "-y", "-ss", f"{offset:.2f}", "-i", str(src),
              "-t", f"{dur:.3f}", "-vf", vf,
              "-c:v", "libx264", "-preset", "fast", "-crf", CRF_SEGMENT,
              "-an", str(dest)])


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
                 trans: list[tuple[str, float]], dest: Path, fps: int):
    """Склейка группы сегментов цепочкой xfade одной командой."""
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
    fc = fc.rstrip(";")
    cmd += ["-filter_complex", fc, "-map", acc,
            "-c:v", "libx264", "-preset", "fast", "-crf", CRF_SEGMENT,
            "-r", str(fps), str(dest)]
    _run(cmd)


# ---------- 4. Финальная сборка ----------

def _subtitles_filter(srt: Path) -> str:
    """Экранирование Windows-пути для фильтра subtitles + стиль:
    крупный белый с чёрной обводкой, нижняя треть кадра."""
    p = str(srt.resolve()).replace("\\", "/").replace(":", "\\:")
    style = ("FontName=Arial,FontSize=15,Bold=1,"
             "PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,"
             "Outline=2,Shadow=0,BorderStyle=1,Alignment=2,MarginV=45")
    return f"subtitles='{p}':force_style='{style}'"


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
             dest: Path, fps: int, total: float, opts: dict, tmp: Path):
    concat_list = tmp / "groups.txt"
    concat_list.write_text(
        "\n".join(f"file '{f.resolve().as_posix()}'" for f in group_files),
        encoding="utf-8")
    filters = []
    if srt and srt.exists() and opts.get("subs", True):
        filters.append(_subtitles_filter(srt))
    filters += _style_chain(opts)
    filters.append("format=yuv420p")
    cmd = ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(concat_list),
           "-i", str(audio), "-map", "0:v", "-map", "1:a",
           "-vf", ",".join(filters),
           "-t", f"{total:.3f}",
           "-c:v", "libx264", "-preset", "medium", "-crf", CRF_FINAL,
           "-c:a", "aac", "-b:a", "192k", str(dest)]
    _run(cmd)


# ---------- Оркестратор ----------

def render_project(out_dir: Path, log, progress=None, opts: dict | None = None):
    """Полный авторендер. opts: resolution, fps, intensity, grain, vignette,
    letterbox, vhs, subs. progress(done, total) — для прогресс-бара."""
    opts = opts or {}
    out_dir = Path(out_dir)
    w, h = RESOLUTIONS.get(opts.get("resolution", "1080p"), (1920, 1080))
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
    log(f"[Рендер] {w}x{h}@{fps}, интенсивность: {intensity}, seed {seed}, "
        f"звук {audio.name} ({total:.0f} c)")

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
        render_segment(sc["file"], sc["kind"], dur + tail, dest, w, h, fps, rng)
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
                     trans[lo:hi - 1], dest, fps)
        group_files.append(dest)
        log(f"[Рендер] Группа {g + 1}/{n_groups} склеена "
            f"(сцены {lo + 1}-{hi})")
        tick()

    # 4. финал
    final = out_dir / "output_final.mp4"
    log("[Рендер] Финальный проход: звук + субтитры + стилевые слои...")
    assemble(group_files, audio, srt, final, fps, total, opts, tmp)
    tick()
    size_mb = final.stat().st_size / 1e6
    log(f"[Рендер] ГОТОВО: {final} ({size_mb:.0f} МБ). Это черновик — "
        "доведи в Premiere перед публикацией.")
    return final
