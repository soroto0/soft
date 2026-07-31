# -*- coding: utf-8 -*-
"""Наполнение библиотеки оверлеев: много РАЗНЫХ вариантов на каждый тип.

Однотипность роликов бралась не из движка, а из библиотеки: на тип был
ровно один вариант, поэтому выбирать было не из чего. Здесь мы просим ИИ
придумать по несколько вариантов на тип, каждый — под свою визуальную тему,
и на двух движках сразу (Remotion .tsx и HyperFrames .html).

Каждый вариант перед попаданием в библиотеку проходит компиляцию, реальный
рендер и проверку зрением — что не прошло, до роликов не доходит.

    python fill_variants.py               # ходовые типы, обе машины
    python fill_variants.py lower3 quote  # только эти типы
"""
import os
import sys
import time
from datetime import datetime

try:                                    # ключи лежат в .env рядом со скриптом
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

import gen_remotion_gemini as G

# Темы намеренно далеки друг от друга: если просить ИИ «сделай красиво» без
# опоры, он раз за разом выдаёт один и тот же тёмный градиент с неоном.
THEMES = [
    "швейцарская типографика: белый фон, чёрный гротеск, тонкая красная линия",
    "печатная машинка и бумага: кремовый лист, зерно, штамп чернилами",
    "тёмный кинематограф: глубокий уголь, тёплый янтарный свет сбоку",
    "журнальный разворот: крупная засечная антиква, широкие поля, охра",
    "чертёж инженера: синяя калька, белые тонкие линии, моноширинный шрифт",
    "ретро-ТВ 80-х: скан-линии, хроматическая аберрация, пурпур и циан",
    "минимализм галереи: почти пустой кадр, одна тонкая рамка, светло-серый",
    "рукописный блокнот: клетка, наброски маркером, жёлтая подсветка",
    "мрамор и золото: холодный камень, тонкая золотая линия, засечки",
    "брутализм: жирные чёрные блоки, кислотно-зелёный акцент, резкие сдвиги",
]

# Типы, которые реально часто встречаются в роликах, — им нужнее разнообразие.
HOT = ["lower3", "titlecard", "quote", "callout", "kinetic", "banner",
       "stamp", "marker", "collage", "gallery", "compare", "timeline"]

PER_KIND = int(os.getenv("VARIANTS_PER_KIND", "3"))


def log(*a):
    msg = " ".join(str(x) for x in a)
    print(f"{datetime.now():%H:%M:%S} {msg}", flush=True)


def main():
    key = (os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or "").strip()
    if not key:
        log("Нет GEMINI_API_KEY в окружении — генерация невозможна")
        return 1

    kinds = [k for k in sys.argv[1:] if k in G.TYPE_BRIEF] or HOT
    t0 = time.time()
    ok, fail = [], []

    for i, kind in enumerate(kinds):
        for n in range(PER_KIND):
            # тема сдвигается и по типу, и по номеру — соседние варианты
            # одного типа заведомо не приходят с одинаковым описанием
            theme = THEMES[(i * PER_KIND + n) % len(THEMES)]
            # чётные — Remotion, нечётные — HyperFrames: библиотека
            # наполняется обоими движками, а не перекашивается в один
            hf = (n % 2 == 1)
            engine = "HyperFrames" if hf else "Remotion"
            log(f"[{len(ok) + len(fail) + 1}] {kind} / {engine} / {theme[:40]}...")
            try:
                fn = G.gen_variant_hyperframes if hf else G.gen_variant
                name = fn(kind, theme, key, log=log)
            except Exception as e:
                name = None
                log(f"    сорвалось: {e}")
            (ok if name else fail).append(f"{kind}:{engine}")
            if name:
                log(f"    принят: {name}")

    log(f"ИТОГ за {(time.time() - t0) / 60:.1f} мин: принято {len(ok)}, "
        f"отклонено {len(fail)}")
    if fail:
        log("не прошли: " + ", ".join(fail))
    return 0


if __name__ == "__main__":
    sys.exit(main())
