#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Короткая вертикальная версия ИЗ ГОТОВОГО ролика — довесок для ленты Shorts.

Зачем. Владелец: «рядом с видео сделать отдельно шортс, чтобы поднять актив
в ютубе — ты сделал ролик какой-то и по этому ролику делаешь короткий шортс».
То есть это НЕ отдельный канал и не отдельная сборка с нуля, а минутная
нарезка уже собранного ролика, поставленная вертикально.

Почему берём начало ролика. Открытие — единственный кусок, который автор
и так писал как приманку: там крючок, там названа тема, там самый частый
монтаж. Замер палитр в render.PALETTE_CUTS это подтверждает — в первые
30 секунд заложена частая нарезка (COLD_OPEN), дальше план длиннее.
Брать середину нельзя: без контекста она не читается.

Почему кроп, а не поля. Горизонтальный кадр, вписанный в вертикаль с
чёрными полосами, в ленте Shorts выглядит полоской посреди экрана и
пролистывается — это записано в render.RESOLUTIONS. Поэтому режем по
центру и слегка приближаем.

Запуск отдельно:
    python shorts.py "путь\\к\\output_final.mp4"
    python shorts.py "путь" --secs 45
"""
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

# Кадр ленты Shorts. Тот же, что в render.RESOLUTIONS["shorts"].
W, H = 1080, 1920
# Сколько секунд брать. YouTube считает шортсом всё до 60 с; берём 58,
# чтобы округление длительности не выкинуло ролик из ленты.
DEFAULT_SECS = 58.0


def _run(cmd: list[str]) -> None:
    r = subprocess.run(cmd, capture_output=True, text=True,
                       encoding="utf-8", errors="replace")
    if r.returncode != 0:
        tail = "\n".join((r.stderr or "").strip().splitlines()[-8:])
        raise RuntimeError(f"ffmpeg упал:\n{tail}")


def _dur(path: Path) -> float:
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries",
                        "format=duration", "-of", "csv=p=0", str(path)],
                       capture_output=True, text=True)
    try:
        return float((r.stdout or "0").strip())
    except ValueError:
        return 0.0


def make_short(video: Path, dest: Path | None = None,
               secs: float = DEFAULT_SECS, srt: Path | None = None,
               log=print) -> Path:
    """Собрать вертикальную минуту из готового ролика.

    srt — субтитры исходного ролика. Если есть, вжигаем их КРУПНО: шортсы
    смотрят без звука, и без текста в кадре смысл теряется.
    """
    video = Path(video)
    if not video.exists():
        raise FileNotFoundError(f"нет файла {video}")
    dest = Path(dest) if dest else video.with_name("short.mp4")
    total = _dur(video)
    if total <= 0:
        raise RuntimeError(f"не читается длительность {video.name}")
    take = min(secs, max(5.0, total - 0.5))

    # Кроп по центру + лёгкое приближение: из середины горизонтального кадра
    # берём вертикальную полосу и растягиваем на весь экран телефона.
    vf = [
        f"crop=ih*{W}/{H}:ih:(iw-ih*{W}/{H})/2:0",
        f"scale={W}:{H}:flags=lanczos",
        "setsar=1",
    ]
    if srt and Path(srt).exists():
        # Путь субтитров в фильтре: двоеточие диска экранируется, иначе
        # ffmpeg считает его разделителем параметров.
        s = str(Path(srt).resolve()).replace("\\", "/").replace(":", r"\:")
        # Кегль крупный: в ленте ролик показывают на телефоне, и подпись
        # обязана читаться на ходу, без звука.
        vf.append(
            f"subtitles='{s}':force_style='FontName=Arial,Fontsize=16,"
            "Bold=1,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,"
            "BorderStyle=1,Outline=3,Shadow=0,Alignment=2,MarginV=120'")

    cmd = ["ffmpeg", "-v", "error", "-y", "-t", f"{take:.2f}", "-i", str(video),
           "-vf", ",".join(vf),
           "-c:v", "libx264", "-preset", "medium", "-crf", "20",
           "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
           "-movflags", "+faststart", str(dest)]
    log(f"[Шортс] Режу первые {take:.0f} с и ставлю вертикально…")
    _run(cmd)
    got = _dur(dest)
    log(f"[Шортс] Готово: {dest.name}, {got:.1f} с, "
        f"{dest.stat().st_size / 1e6:.0f} МБ")
    return dest


def main() -> int:
    ap = argparse.ArgumentParser(
        description="Вертикальная минута из готового ролика")
    ap.add_argument("video", help="путь к output_final.mp4")
    ap.add_argument("--secs", type=float, default=DEFAULT_SECS)
    ap.add_argument("--out", default="")
    ap.add_argument("--srt", default="", help="субтитры исходного ролика")
    a = ap.parse_args()
    v = Path(a.video)
    srt = Path(a.srt) if a.srt else (v.parent / "subs" / "voiceover.srt")
    make_short(v, Path(a.out) if a.out else None, a.secs,
               srt if srt.exists() else None)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
