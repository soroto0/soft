# -*- coding: utf-8 -*-
"""project1, финальный штрих к v4: та же раскадровка (storyboard/,
timeline.json), НИ ОДНОГО нового Veo-запроса — только:
  1. Фоновая музыка (add_music, sidechain-приглушение под голосом).
  2. Пересборка оверлеев (новые типы compare/banner + гнутая стрелка
     в callout уже в remotion/src/Overlay.tsx) и финальный рендер.
Пишет в output_final_v5.mp4."""
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


print(f"=== 1. Музыка [{elapsed()}] ===")
voice = PROJ / "audio" / "voiceover.mp3"
core.add_music(voice, MUSIC, print, gain_db=-17)

print(f"\n=== 2. Оверлеи (без изменений таймингов, тот же overlays.txt) "
     f"[{elapsed()}] ===")
srt = PROJ / "subs" / "voiceover.srt"
rows = core.parse_srt(srt)
manifest = []
mf = PROJ / "manifest.json"
if mf.exists():
    manifest = json.loads(mf.read_text(encoding="utf-8"))
draft = ov.suggest_overlays_auto(rows, manifest, PROJ, print, min_gap=5.0)
(PROJ / "overlays.txt").write_text(draft.strip() + "\n", encoding="utf-8")
print(f"Оверлеев: {len(ov.parse_overlays(draft))}")

print(f"\n=== 3. Рендер (музыка + новые типы оверлеев) [{elapsed()}] ===")
print(f"Движок оверлеев: {ov.overlay_engine()}")
opts = {
    "resolution": "1080p", "fps": 30, "quality": "обычное",
    "intensity": "средняя", "sub_size": "огромные", "sub_style": "karaoke",
    "look": "cinematic", "subs": True,
    "grain": True, "vignette": True, "letterbox": False, "vhs": False,
    "chromab": True, "chapters_grade": True, "no_music": False,
    "out_name": "output_final_v5",
}
final = render.render_project(PROJ, print, None, opts)
print(f"\n=== ГОТОВО [{elapsed()}] ===")
print(f"RESULT: {final} exists={final.exists()} "
     f"{final.stat().st_size / 1e6:.1f} MB")
print(f"DURATION: {core.audio_duration(final):.1f} c")
