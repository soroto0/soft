# -*- coding: utf-8 -*-
"""project1 v6 — última доводка v5: та же раскадровка И музыка (ничего не
трогаем), только:
  1. Оверлеи заново — теперь с LLM-фолбэком (suggest_overlays_llm), раз
     жёсткие правила в этом тексте ничего не нашли (пустой overlays.txt
     в v4/v5 — вот откуда «где Remotion»).
  2. Субтитры крупнее (36pt, было 30).
Ноль новых Veo-запросов. Пишет в output_final_v6.mp4."""
import json
import time
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

import core
import render
import overlays as ov

PROJ = Path(r"C:\Users\ali\Desktop\2\project1")
t0 = time.time()


def elapsed():
    return f"{(time.time() - t0) / 60:.1f} мин"


print(f"=== 1. Оверлеи (с LLM-фолбэком) [{elapsed()}] ===")
srt = PROJ / "subs" / "voiceover.srt"
rows = core.parse_srt(srt)
manifest = []
mf = PROJ / "manifest.json"
if mf.exists():
    manifest = json.loads(mf.read_text(encoding="utf-8"))
draft = ov.suggest_overlays_auto(rows, manifest, PROJ, print, min_gap=5.0)
(PROJ / "overlays.txt").write_text(draft.strip() + "\n", encoding="utf-8")
print(f"Оверлеев: {len(ov.parse_overlays(draft))}")
print(draft)

print(f"\n=== 2. Рендер (36pt субтитры, музыка из v5) [{elapsed()}] ===")
print(f"Движок оверлеев: {ov.overlay_engine()}")
opts = {
    "resolution": "1080p", "fps": 30, "quality": "обычное",
    "intensity": "средняя", "sub_size": "огромные", "sub_style": "karaoke",
    "look": "cinematic", "subs": True,
    "grain": True, "vignette": True, "letterbox": False, "vhs": False,
    "chromab": True, "chapters_grade": True, "no_music": False,
    "out_name": "output_final_v6",
}
final = render.render_project(PROJ, print, None, opts)
print(f"\n=== ГОТОВО [{elapsed()}] ===")
print(f"RESULT: {final} exists={final.exists()} "
     f"{final.stat().st_size / 1e6:.1f} MB")
print(f"DURATION: {core.audio_duration(final):.1f} c")
