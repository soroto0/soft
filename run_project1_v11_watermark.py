# -*- coding: utf-8 -*-
"""v11 — добавляет постоянный бейдж (watermark) на весь ролик поверх
слоёной раскладки v10. Та же раскадровка/музыка, ноль новых Veo-запросов.
Пишет в output_final_v11.mp4."""
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


print(f"=== 1. Оверлеи + постоянный бейдж [{elapsed()}] ===")
srt = PROJ / "subs" / "voiceover.srt"
rows = core.parse_srt(srt)
manifest = []
mf = PROJ / "manifest.json"
if mf.exists():
    manifest = json.loads(mf.read_text(encoding="utf-8"))
draft = ov.suggest_overlays_auto(rows, manifest, PROJ, print, min_gap=5.0,
                                 watermark="Content Factory")
(PROJ / "overlays.txt").write_text(draft.strip() + "\n", encoding="utf-8")
parsed = ov.parse_overlays(draft)
print(f"Строк: {len(draft.splitlines())}, распознано: {len(parsed)}")
if not parsed:
    raise SystemExit(1)

print(f"\n=== 2. Рендер [{elapsed()}] ===")
opts = {
    "resolution": "1080p", "fps": 30, "quality": "обычное",
    "intensity": "средняя", "sub_size": "огромные", "sub_style": "karaoke",
    "look": "cinematic", "subs": True,
    "grain": True, "vignette": True, "letterbox": False, "vhs": False,
    "chromab": True, "chapters_grade": True, "no_music": False,
    "out_name": "output_final_v11",
}
final = render.render_project(PROJ, print, None, opts)
print(f"\n=== ГОТОВО [{elapsed()}] ===")
print(f"RESULT: {final} exists={final.exists()} "
     f"{final.stat().st_size / 1e6:.1f} MB")
print(f"DURATION: {core.audio_duration(final):.1f} c")
