#!/usr/bin/env python3
"""Доделать abyss/2026-08-04 без проверки кадров — только оверлеи и рендер.

Всё дорогое уже на диске: сценарий, озвучка, субтитры, 92 плана раскадровки.
Проверку кадров выключаем намеренно (check_shots=False): она необязательна, а
именно она сегодня упёрлась в суточный лимит картинок и заморозила конвейер.
"""
import sys
import time
from pathlib import Path

BASE = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE))

import webapp                                  # noqa: E402


def main() -> int:
    proj = BASE / "abyss" / "2026-08-04"
    api = webapp.Api()
    api.channel_select("abyss")
    api.set_project(str(proj))
    api.log(f"[Доделка] {proj.name}: проверка кадров ВЫКЛЮЧЕНА, "
            "идут только оверлеи и рендер")

    api.generate_all({
        "visual_mode": "mixed", "ai_ratio": 0.85,
        "script": "", "topic": "",
        "engine": "edge", "polly_engine": "neural", "rate": "0",
        "pauses": True, "enhance": True,
        "whisper": "tiny.en", "beat": 6.0,
        "resolution": "1080p", "fps": 30, "quality": "обычное",
        "draft": False, "subs": True, "chapters": True,
        "overlays": "", "randomize": True,
        "thumbs": True,
        "grow_variants": False,   # библиотека уже пополнена этим роликом
        "check_shots": False,     # ГЛАВНОЕ: не упираться в лимит ради косметики
        "seo": True,
    })
    t0 = time.time()
    while api._busy:
        time.sleep(10)
    out = proj / "output_final.mp4"
    ok = out.exists() and out.stat().st_size > 1_000_000
    print(f"ГОТОВО: {out} ({out.stat().st_size / 2**20:.0f} МБ)" if ok
          else "НЕ ВЫШЛО — смотри app.log")
    print(f"заняло {(time.time() - t0) / 60:.0f} мин")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
