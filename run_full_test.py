# -*- coding: utf-8 -*-
"""Полный тестовый прогон: сценарий (ИИ) -> озвучка -> субтитры (word-level)
-> раскадровка (mixed 35% ИИ-кадров) -> оверлеи (авто) -> рендер с
караоке-субтитрами. Тема: муравьи-суперорганизм, 3 минуты, документальный тон.
"""
import sys
import json
from pathlib import Path

sys.path.insert(0, r"C:\Users\A3 PRINT\Documents\2\soft")
from dotenv import load_dotenv
load_dotenv(r"C:\Users\A3 PRINT\Documents\2\soft\.env")
import core
import render
import overlays as ov

PROJ = Path(r"C:\Users\A3 PRINT\Documents\2\soft\project_ants")
PROJ.mkdir(parents=True, exist_ok=True)

GEMINI = core.os.getenv("GEMINI_API_KEY", "")
AGNES = core.os.getenv("AGNES_API_KEY", "")
PEXELS = core.os.getenv("PEXELS_API_KEY", "")
PIXABAY = core.os.getenv("PIXABAY_API_KEY", "")

print("=== 1. Сценарий (ИИ, 5 минут) ===")
topic = "The Ant Superorganism: How a Colony Thinks Without a Brain"
script = core.gen_script(topic, 3, GEMINI, print, tone="документальный",
                         lang="английский")
(PROJ / "script.txt").write_text(script, encoding="utf-8")
print(f"Слов: {len(script.split())}")

print("\n=== 2. Озвучка (Edge TTS) ===")
core.tts_edge(script, "en-US-GuyNeural", PROJ, print, rate=0, enhance=False)

print("\n=== 3. Субтитры (Whisper, word-level) ===")
srt = core.transcribe_whisper(PROJ / "audio" / "voiceover.mp3", "base.en",
                              PROJ, print, max_line_width=42, lang="английский")
words = core.load_whisper_words(srt.parent / "voiceover.json")
print(f"Фраз: {len(core.parse_srt(srt))}, слов с таймкодами: {len(words)}")

print("\n=== 4. Раскадровка (mixed, 35% ИИ-кадров) ===")
timeline = core.auto_storyboard(
    PROJ, print, PEXELS, PIXABAY, min_beat=6.0,
    gemini_key=GEMINI, agnes_key=AGNES, genvideo=False, max_unique=60,
    visual_mode="mixed", visual_style="документальный", ai_ratio=0.35)
print(f"Планов в таймлайне: {len(timeline)}")

print("\n=== 5. Оверлеи (авто, по субтитрам) ===")
rows = core.parse_srt(srt)
manifest = []
mf = PROJ / "manifest.json"
if mf.exists():
    manifest = json.loads(mf.read_text(encoding="utf-8"))
draft = ov.suggest_overlays_auto(rows, manifest, PROJ, print, min_gap=20.0)
(PROJ / "overlays.txt").write_text(draft.strip() + "\n", encoding="utf-8")
n_ov = len(ov.parse_overlays(draft))
print(f"Оверлеев: {n_ov}")

print("\n=== 6. Рендер (караоке-субтитры, mixed-эффекты) ===")
opts = {
    "resolution": "1080p", "fps": 30, "quality": "обычное",
    "intensity": "средняя", "sub_size": "средние", "sub_style": "karaoke",
    "look": "cinematic", "subs": True,
    "grain": True, "vignette": True, "letterbox": False, "vhs": False,
    "chromab": True, "chapters_grade": True, "no_music": True,
}
final = render.render_project(PROJ, print, None, opts)
print(f"\nRESULT: {final.exists()}  {final.stat().st_size / 1e6:.1f} MB")
print(f"DURATION: {core.audio_duration(final):.1f} c")
