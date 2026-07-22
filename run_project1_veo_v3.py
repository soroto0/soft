# -*- coding: utf-8 -*-
"""project1, третий проход — исправляет то, что не понравилось в v2:
  1. storyboard/ полностью очищается перед стартом — иначе анти-повтор
     в render.py подмешивает СТАРЫЕ файлы (сток из самого первого прогона,
     потом клипы v2) в пул, и в кадре мелькает не то, что только что
     сгенерировано.
  2. min_beat=5.0 (== MAX_SCENE в render.py) — почти 1 уникальный
     ИИ-план на 1 финальный сегмент, вместо 7 планов на 17 сегментов
     (тройной повтор одного и того же клипа).
  3. Промпты для Veo — НЕ короткий сток-запрос (smart_queries, 2-4 слова,
     он и давал штампы вроде «power control symbol» -> лампочка), а
     ai_scene_prompts(): развёрнутое описание конкретной сцены, без
     абстрактных символов-клише.
  4. Whisper переrazбирается заново с max_line_width=20 — короче и
     чётче строки субтитров (было 42).
  5. sub_size=крупные (24pt вместо 19) — субтитры покрупнее.
  6. Оверлеи min_gap=5.0 — заметно чаще (было 13-20).
Пишет в output_final_v3.mp4."""
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

print(f"\n=== 1. Субтитры заново (Whisper, короче строки) [{elapsed()}] ===")
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
beats = core.build_beats(rows, min_beat=5.0, total=total)
gemini_key = os.getenv("GEMINI_API_KEY", "")
queries = core.ai_scene_prompts(beats, gemini_key, print) if gemini_key else None
if queries:
    print(f"Готово: {sum(1 for q in queries if q)}/{len(queries)} планов")
else:
    print("Gemini недоступен — планы уйдут на локальные ключевые слова")
print(f"Планов будет: {len(beats)} (было 7 в v2 — меньше поводов для повтора)")

print(f"\n=== 3. Раскадровка (visual_mode=ai, Veo — основной провайдер) "
     f"[{elapsed()}] ===")
timeline = core.auto_storyboard(
    PROJ, print, min_beat=5.0,
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

print(f"\n=== 5. Рендер (Remotion, крупные субтитры) [{elapsed()}] ===")
print(f"Движок оверлеев: {ov.overlay_engine()}")
opts = {
    "resolution": "1080p", "fps": 30, "quality": "обычное",
    "intensity": "средняя", "sub_size": "крупные", "sub_style": "karaoke",
    "look": "cinematic", "subs": True,
    "grain": True, "vignette": True, "letterbox": False, "vhs": False,
    "chromab": True, "chapters_grade": True, "no_music": True,
    "out_name": "output_final_v3",
}
final = render.render_project(PROJ, print, None, opts)
print(f"\n=== ГОТОВО [{elapsed()}] ===")
print(f"RESULT: {final} exists={final.exists()} "
     f"{final.stat().st_size / 1e6:.1f} MB")
print(f"DURATION: {core.audio_duration(final):.1f} c")
