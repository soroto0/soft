#!/usr/bin/env python3
"""
YouTube Video Pipeline — CLI.
Сценарий (script.txt) -> Озвучка (Edge TTS / Amazon Polly) -> Стоки (Pexels/Pixabay)
-> Субтитры (Whisper) -> папка output/ для импорта в Premiere Pro

Вся логика — в core.py (общая с GUI app.py).

Использование:
    python pipeline.py                  # полный прогон (Polly)
    python pipeline.py --tts edge       # озвучка бесплатным Edge TTS
    python pipeline.py --skip-tts       # пропустить озвучку
    python pipeline.py --skip-media     # пропустить скачивание стоков
    python pipeline.py --skip-subs      # пропустить субтитры
"""

import os
import sys
import argparse
from pathlib import Path

from dotenv import load_dotenv

import core

load_dotenv()

BASE_DIR = Path(__file__).parent
SCRIPT_FILE = BASE_DIR / "script.txt"   # текст сценария (английский)
SCENES_FILE = BASE_DIR / "scenes.txt"   # сцены: "keywords | type: video"
OUTPUT_DIR = BASE_DIR / "output"


def main():
    ap = argparse.ArgumentParser(description="Сценарий -> озвучка -> стоки -> субтитры")
    ap.add_argument("--tts", choices=["polly", "edge"],
                    default=os.getenv("TTS_PROVIDER", "polly"),
                    help="движок озвучки (edge — бесплатно, без ключей)")
    ap.add_argument("--rate", type=int, default=0, metavar="N",
                    help="отклонение темпа речи в процентах, например -5 или 10")
    ap.add_argument("--no-pauses", action="store_true",
                    help="не вставлять паузы между абзацами (Polly SSML)")
    ap.add_argument("--music", default=os.getenv("MUSIC_DIR", ""), metavar="PATH",
                    help="папка или файл с музыкой — подмешать под озвучку")
    ap.add_argument("--music-gain", type=int, default=-14, metavar="DB",
                    help="громкость музыки в dB (по умолчанию -14)")
    ap.add_argument("--no-kenburns", action="store_true",
                    help="не делать из картинок клипы с движением камеры")
    ap.add_argument("--storyboard", action="store_true",
                    help="подбирать материал по таймлайну озвучки (вместо "
                         "scenes.txt) и собрать sequence.xml для Premiere")
    ap.add_argument("--beat", type=float, default=6.0, metavar="SEC",
                    help="минимальная длина плана в секундах для --storyboard")
    ap.add_argument("--skip-tts", action="store_true")
    ap.add_argument("--skip-media", action="store_true")
    ap.add_argument("--skip-subs", action="store_true")
    args = ap.parse_args()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    if not args.skip_tts:
        if not SCRIPT_FILE.exists():
            sys.exit(f"[TTS] Файл {SCRIPT_FILE} не найден. Положи сценарий и запусти снова.")
        text = SCRIPT_FILE.read_text(encoding="utf-8")
        if args.tts == "edge":
            core.tts_edge(text, os.getenv("EDGE_VOICE", "en-US-GuyNeural"),
                          OUTPUT_DIR, print, rate=args.rate)
        else:
            core.tts_polly(text, os.getenv("POLLY_VOICE", "Matthew"),
                           os.getenv("POLLY_ENGINE", "neural"), OUTPUT_DIR, print,
                           rate=args.rate, pauses=not args.no_pauses)

    if args.music:
        voice = OUTPUT_DIR / "audio" / "voiceover.mp3"
        if voice.exists():
            core.add_music(voice, Path(args.music), print, gain_db=args.music_gain)
        else:
            print("[Музыка] Пропущено: нет voiceover.mp3")

    if args.storyboard:
        # субтитры нужны до подбора материала — они дают таймкоды
        audio = OUTPUT_DIR / "audio" / "voiceover.mp3"
        if not audio.exists():
            sys.exit("[SUBS] Нет voiceover.mp3 — сначала прогони озвучку.")
        if not args.skip_subs:
            core.transcribe_whisper(audio, os.getenv("WHISPER_MODEL", "base.en"),
                                    OUTPUT_DIR, print)
        core.auto_storyboard(OUTPUT_DIR, print, min_beat=args.beat)
        print("\n=== ГОТОВО ===")
        print(f"Premiere Pro: File > Import > {OUTPUT_DIR / 'sequence.xml'}")
        print("  — готовый таймлайн: клипы по таймкодам + озвучка")
        return

    if not args.skip_media:
        if not SCENES_FILE.exists():
            sys.exit(f"[MEDIA] Файл {SCENES_FILE} не найден.")
        core.fetch_media(SCENES_FILE.read_text(encoding="utf-8"), OUTPUT_DIR, print,
                         kenburns=not args.no_kenburns)

    if not args.skip_subs:
        audio = OUTPUT_DIR / "audio" / "voiceover.mp3"
        if not audio.exists():
            sys.exit("[SUBS] Нет voiceover.mp3 — сначала прогони озвучку.")
        core.transcribe_whisper(audio, os.getenv("WHISPER_MODEL", "base.en"),
                                OUTPUT_DIR, print)

    print("\n=== ГОТОВО ===")
    print(f"Импортируй в Premiere Pro папку: {OUTPUT_DIR}")
    print("  audio/voiceover.mp3  — озвучка")
    print("  video/ и images/     — визуал по сценам")
    print("  subs/voiceover.srt   — субтитры (File > Import в Premiere)")


if __name__ == "__main__":
    main()
