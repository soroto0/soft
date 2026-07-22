# -*- coding: utf-8 -*-
"""project1, четвёртый проход — добивает то, что осталось после v3:
  1. min_beat=3.5 (было 5.0) — v3 дал 12 уникальных планов на 21 финальный
     сегмент рендера (некоторые планы короче MAX_SCENE=5.0 в render.py,
     поэтому 1 план не всегда покрывает 1 сегмент) -> антиповтор в
     assign_materials() лез в общий пул и показывал один и тот же клип по
     3 раза в РАЗНЫХ местах таймлайна. Цель — планов примерно столько же,
     сколько будет финальных сегментов, чтобы почти никогда не пришлось
     брать что-то повторно.
  2. Без тряски камеры — "shake"/"shake_soft"/"v_shake" убраны из пула
     движений в render.py (IMAGE_MOTIONS/VIDEO_MOTIONS).
  3. sub_size=огромные (30pt, новый уровень в render.py, было 24).
  4. storyboard/ полностью очищается — те же 12 клипов v3 не путаются
     под ногами.
Всё остальное — как в v3 (Whisper теперь сам чистит пунктуацию,
ai_scene_prompts без клише, оверлеи раз в ~5с). Пишет в output_final_v4.mp4.
"""
import os
import json
import shutil
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


print(f"=== 0. Очистка старой раскадровки [{elapsed()}] ===")
sdir = PROJ / "storyboard"
if sdir.exists():
    n = len(list(sdir.iterdir()))
    shutil.rmtree(sdir)
    print(f"Удалено файлов: {n}")
sdir.mkdir(parents=True, exist_ok=True)
tl = PROJ / "timeline.json"
if tl.exists():
    tl.unlink()

print(f"\n=== 1. Субтитры заново (Whisper, короткие строки, без пунктуации) "
     f"[{elapsed()}] ===")
for f in (PROJ / "subs").glob("voiceover.*"):
    f.unlink()
srt = core.transcribe_whisper(PROJ / "audio" / "voiceover.mp3",
                              os.getenv("WHISPER_MODEL", "base.en"),
                              PROJ, print, max_line_width=20)
rows = core.parse_srt(srt)
print(f"Фраз: {len(rows)}")

print(f"\n=== 2. ИИ-промпты по смыслу текста (Gemini, без штампов) "
     f"[{elapsed()}] ===")
voice = PROJ / "audio" / "voiceover.mp3"
total = core.audio_duration(voice)
beats = core.build_beats(rows, min_beat=3.5, total=total)
gemini_key = os.getenv("GEMINI_API_KEY", "")
queries = core.ai_scene_prompts(beats, gemini_key, print) if gemini_key else None
if queries:
    print(f"Готово: {sum(1 for q in queries if q)}/{len(queries)} планов")
else:
    print("Gemini недоступен — планы уйдут на локальные ключевые слова")
print(f"Планов будет: {len(beats)} (было 12 в v3 — почти столько же, "
     "сколько финальных сегментов)")

print(f"\n=== 3. Раскадровка (visual_mode=ai, Veo — основной провайдер) "
     f"[{elapsed()}] ===")
timeline = core.auto_storyboard(
    PROJ, print, min_beat=3.5,
    visual_mode="ai", visual_style="документальный", queries=queries)
print(f"Планов в таймлайне: {len(timeline)}  [{elapsed()}]")

print(f"\n=== 4. Оверлеи (авто, чаще — раз в ~5с) [{elapsed()}] ===")
manifest = []
mf = PROJ / "manifest.json"
if mf.exists():
    manifest = json.loads(mf.read_text(encoding="utf-8"))
draft = ov.suggest_overlays_auto(rows, manifest, PROJ, print, min_gap=5.0)
(PROJ / "overlays.txt").write_text(draft.strip() + "\n", encoding="utf-8")
print(f"Оверлеев: {len(ov.parse_overlays(draft))}")

print(f"\n=== 5. Рендер (Remotion, огромные субтитры, без тряски) "
     f"[{elapsed()}] ===")
print(f"Движок оверлеев: {ov.overlay_engine()}")
opts = {
    "resolution": "1080p", "fps": 30, "quality": "обычное",
    "intensity": "средняя", "sub_size": "огромные", "sub_style": "karaoke",
    "look": "cinematic", "subs": True,
    "grain": True, "vignette": True, "letterbox": False, "vhs": False,
    "chromab": True, "chapters_grade": True, "no_music": True,
    "out_name": "output_final_v4",
}
final = render.render_project(PROJ, print, None, opts)
print(f"\n=== ГОТОВО [{elapsed()}] ===")
print(f"RESULT: {final} exists={final.exists()} "
     f"{final.stat().st_size / 1e6:.1f} MB")
print(f"DURATION: {core.audio_duration(final):.1f} c")
