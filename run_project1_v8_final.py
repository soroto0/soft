# -*- coding: utf-8 -*-
"""project1 v8 — три исправленных бага разом:
  1. Субтитры пересобраны Whisper заново — исправленный
     strip_srt_punctuation() больше не оставляет "But"/"So" и т.п.
     с большой буквы посреди фразы после удаления точки.
  2. Музыка тише: -24 dB (было -17, жаловались что громко).
  3. Оверлеи — LLM-фолбэк теперь сортирует моменты по времени перед
     фильтром min_gap (раньше порядок из LLM ломал фильтр и всё
     вырезалось).
Раскадровка (storyboard/, timeline.json) НЕ трогается — ни одного
нового Veo-запроса. Пишет в output_final_v8.mp4."""
import os
import json
import time
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

import core
import render
import overlays as ov

PROJ = Path(r"C:\Users\ali\Desktop\2\project1")
MUSIC = Path(r"C:\Users\ali\Downloads\Gone Away - Blue Beat Review.mp3")
t0 = time.time()


def elapsed():
    return f"{(time.time() - t0) / 60:.1f} мин"


print(f"=== 1. Субтитры заново (исправленный регистр) [{elapsed()}] ===")
for f in (PROJ / "subs").glob("voiceover.*"):
    f.unlink()
srt = core.transcribe_whisper(PROJ / "audio" / "voiceover.mp3",
                              os.getenv("WHISPER_MODEL", "base.en"),
                              PROJ, print, max_line_width=20)
rows = core.parse_srt(srt)
print(f"Фраз: {len(rows)}")

print(f"\n=== 2. Музыка тише (-24 dB) [{elapsed()}] ===")
voice = PROJ / "audio" / "voiceover.mp3"
core.add_music(voice, MUSIC, print, gain_db=-24)

print(f"\n=== 3. Оверлеи (LLM-фолбэк, отсортировано по времени) "
     f"[{elapsed()}] ===")
manifest = []
mf = PROJ / "manifest.json"
if mf.exists():
    manifest = json.loads(mf.read_text(encoding="utf-8"))
draft = ov.suggest_overlays_auto(rows, manifest, PROJ, print, min_gap=5.0)
(PROJ / "overlays.txt").write_text(draft.strip() + "\n", encoding="utf-8")
parsed = ov.parse_overlays(draft)
print(f"Строк в overlays.txt: {len(draft.splitlines())}, "
     f"распознано parse_overlays: {len(parsed)}")
if not parsed:
    print("!!! ОВЕРЛЕИ ПУСТЫЕ — останавливаюсь, рендерить нет смысла !!!")
    raise SystemExit(1)

print(f"\n=== 4. Рендер [{elapsed()}] ===")
opts = {
    "resolution": "1080p", "fps": 30, "quality": "обычное",
    "intensity": "средняя", "sub_size": "огромные", "sub_style": "karaoke",
    "look": "cinematic", "subs": True,
    "grain": True, "vignette": True, "letterbox": False, "vhs": False,
    "chromab": True, "chapters_grade": True, "no_music": False,
    "out_name": "output_final_v8",
}
final = render.render_project(PROJ, print, None, opts)
print(f"\n=== ГОТОВО [{elapsed()}] ===")
print(f"RESULT: {final} exists={final.exists()} "
     f"{final.stat().st_size / 1e6:.1f} MB")
print(f"DURATION: {core.audio_duration(final):.1f} c")
