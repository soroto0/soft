#!/usr/bin/env python3
"""Доделать конкретный проект, не открывая окно приложения.

Нужен после того, как прогон оборвался на финальном сборе: сценарий, озвучка,
субтитры и ИИ-кадры уже лежат в папке, и всё это переиспользуется — заново
идут только оверлеи и рендер.

    python resume_abyss.py abyss\\2026-08-04

Остановить: закрыть окно консоли или убить процесс python.
"""
import sys
import time
from pathlib import Path

BASE = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE))

import webapp                                  # noqa: E402
import channels as channels_mod                # noqa: E402


def main() -> int:
    proj = Path(sys.argv[1] if len(sys.argv) > 1 else "abyss/2026-08-04")
    if not proj.is_absolute():
        proj = BASE / proj
    if not proj.exists():
        print(f"Нет папки проекта: {proj}", file=sys.stderr)
        return 2

    api = webapp.Api()
    # Канал берём из meta.json проекта — от него зависят палитра, голос,
    # длина и набор оверлеев. Без него ролик соберётся «общими» настройками.
    ch_id = ""
    try:
        import json
        ch_id = json.loads((proj / "meta.json").read_text(encoding="utf-8")
                           ).get("channel", "")
    except Exception:
        pass
    if not ch_id:
        ch_id = proj.parent.name
    if channels_mod.get(ch_id):
        api.channel_select(ch_id)
    api.set_project(str(proj))
    api.log(f"[Возобновление] {proj.name}, канал «{ch_id}»")

    have = {f: (proj / f).exists() for f in
            ("script.txt", "audio/voiceover.mp3", "subs/voiceover.srt")}
    n_ai = len(list((proj / "storyboard").glob("*_ai*"))) if (proj / "storyboard").exists() else 0
    api.log(f"[Возобновление] на диске: "
            + ", ".join(k for k, v in have.items() if v)
            + f"; ИИ-кадров {n_ai} — они переиспользуются")

    p = {
        "visual_mode": "mixed", "ai_ratio": 0.85,
        "script": "", "topic": "",
        "engine": "edge", "polly_engine": "neural", "rate": "0",
        "pauses": True, "enhance": True,
        "whisper": "tiny.en", "beat": 6.0,
        "resolution": "1080p", "fps": 30, "quality": "обычное",
        "draft": False, "subs": True, "chapters": True,
        "overlays": "", "randomize": True, "thumbs": True,
        "grow_variants": False,      # библиотека уже пополнена этим роликом
        "check_shots": False,        # кадры проверены в прошлом заходе
        "seo": True,
    }
    api.generate_all(p)
    t0 = time.time()
    while api._busy:
        time.sleep(10)
    out = proj / "output_final.mp4"
    ok = out.exists() and out.stat().st_size > 1_000_000
    print(("ГОТОВО: " + str(out) + f" ({out.stat().st_size/2**20:.0f} МБ)")
          if ok else "НЕ ВЫШЛО — смотри app.log")
    print(f"заняло {(time.time()-t0)/60:.0f} мин")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
