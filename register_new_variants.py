#!/usr/bin/env python3
"""Подключить восемь новых видов оверлеев в библиотеку.

Запускать, когда НЕ идёт сборка Remotion-бандла: скрипт переписывает
remotion/src/variants/_registry.ts, а он читается ровно в момент сборки.
Проверка «идёт ли прогон» встроена — сам ничего не сломает.

    python register_new_variants.py
"""
import os
import sys
import time
from pathlib import Path

BASE = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE))

NEW = [
    ("quote", "ai_4d62", "quote_ai_4d62.tsx", "QuoteAi4D62",
     "Машинка: цитата набирается по буквам на линованной строке, мигает "
     "каретка, линейка прочерчивается впереди текста."),
    ("stamp", "ai_c917", "stamp_ai_c917.tsx", "StampAiC917",
     "Печать: круглый оттиск придавливается сверху со сплющиванием и "
     "доворотом, текст по краю кольца."),
    ("marker", "ai_e5a8", "marker_ai_e5a8.tsx", "MarkerAiE5A8",
     "Текстовыделитель: широкая полупрозрачная полоса проходит ПОВЕРХ "
     "текста с наклоном, а не подчёркивает снизу."),
    ("timeline", "ai_7f30", "timeline_ai_7f30.tsx", "TimelineAi7F30",
     "Горизонтальная ось внизу кадра: по ней едет каретка, событие "
     "поднимается, когда она до него дошла."),
    ("collage", "ai_b845", "collage_ai_b845.tsx", "CollageAiB845",
     "Сборка: снимки слетаются с четырёх сторон кадра в плотную сетку."),
    ("gallery", "ai_2c58", "gallery_ai_2c58.tsx", "GalleryAi2C58",
     "Глубина: снимки сменяются на месте, приходя из глубины и уходя "
     "назад в размытие. Движение по Z, а не по X."),
    ("bars", "ai_9a13", "bars_ai_9a13.tsx", "BarsAi9A13",
     "Столбики из блоков: вертикальные полосы набираются дискретными "
     "кубиками снизу вверх."),
    ("bars", "ai_d461", "bars_ai_d461.tsx", "BarsAiD461",
     "Лучи: значения расходятся из центра, длина луча — величина."),
]


def busy() -> bool:
    """Идёт ли прямо сейчас прогон (журнал пишется прямо сейчас)."""
    log = BASE / "app.log"
    try:
        return (time.time() - os.path.getmtime(log)) < 90
    except OSError:
        return False


def main() -> int:
    if busy() and "--force" not in sys.argv:
        print("Сейчас идёт прогон — реестр переписывать опасно "
              "(он читается при сборке бандла Remotion).")
        print("Дождись конца прогона и запусти снова, либо --force.")
        return 1

    import overlays
    meta = overlays.load_variants_meta()
    added = skipped = 0
    for typ, variant, fname, comp, theme in NEW:
        key = f"{typ}/{variant}"
        if key in meta:
            print(f"  уже есть: {key}")
            skipped += 1
            continue
        if not (overlays.VARIANTS_DIR / fname).exists():
            print(f"  НЕТ ФАЙЛА, пропускаю: {fname}")
            continue
        meta[key] = {
            "file": fname, "component": comp, "type": typ, "variant": variant,
            "enabled": True, "channel": "",
            "created": "2026-08-03T00:00:00", "theme": theme,
            "note": "написан руками, не ИИ; префикс ai_ обязателен — по нему "
                    "overlays.py берёт варианты из библиотеки",
        }
        added += 1
        print(f"  + {key}")

    overlays.save_variants_meta(meta)
    n = overlays.rebuild_registry(print, meta)
    print(f"\nдобавлено {added}, пропущено {skipped}; в реестре {n} вариантов")
    print("Проверь типизацию: cd remotion && npx tsc --noEmit")
    return 0


if __name__ == "__main__":
    sys.exit(main())
