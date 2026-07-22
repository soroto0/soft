# -*- coding: utf-8 -*-
"""project1 v7 — реальный баг найден: parse_overlays() в overlays.py имел
свой whitelist типов, и туда не попали новые "banner"/"compare" — все 6
баннеров в overlays.txt молча отфильтровывались ДО Remotion. Именно
поэтому оверлеев не было видно в v4/v5/v6, хотя движок был выбран
правильно. Ничего больше не меняем — та же раскадровка, музыка,
overlays.txt (просто перечитываем тем же suggest_overlays_auto для
свежих файлов картинок, если что). Пишет в output_final_v7.mp4."""
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


print(f"=== 1. Оверлеи (тот же LLM-фолбэк, теперь banner не фильтруется) "
     f"[{elapsed()}] ===")
srt = PROJ / "subs" / "voiceover.srt"
rows = core.parse_srt(srt)
manifest = []
mf = PROJ / "manifest.json"
if mf.exists():
    manifest = json.loads(mf.read_text(encoding="utf-8"))
draft = ov.suggest_overlays_auto(rows, manifest, PROJ, print, min_gap=5.0)
(PROJ / "overlays.txt").write_text(draft.strip() + "\n", encoding="utf-8")
parsed = ov.parse_overlays(draft)
print(f"Оверлеев в overlays.txt: {len(draft.splitlines())}, "
     f"реально распознано parse_overlays: {len(parsed)}")

print(f"\n=== 2. Рендер [{elapsed()}] ===")
opts = {
    "resolution": "1080p", "fps": 30, "quality": "обычное",
    "intensity": "средняя", "sub_size": "огромные", "sub_style": "karaoke",
    "look": "cinematic", "subs": True,
    "grain": True, "vignette": True, "letterbox": False, "vhs": False,
    "chromab": True, "chapters_grade": True, "no_music": False,
    "out_name": "output_final_v7",
}
final = render.render_project(PROJ, print, None, opts)
print(f"\n=== ГОТОВО [{elapsed()}] ===")
print(f"RESULT: {final} exists={final.exists()} "
     f"{final.stat().st_size / 1e6:.1f} MB")
print(f"DURATION: {core.audio_duration(final):.1f} c")
