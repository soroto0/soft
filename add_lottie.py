#!/usr/bin/env python3
"""Добавить скачанные Lottie-анимации в библиотеку оверлеев.

Откуда брать: jitter.video (бесплатно, экспорт -> Lottie/JSON),
lottiefiles.com, motionelements.com. Нужен именно .json — After Effects в
конвейере нет, шаблоны .aep использовать нечем.

    python add_lottie.py файл.json --type callout
    python add_lottie.py папка --type titlecard --channel abyss
    python add_lottie.py --report          # что уже есть в библиотеке

Подходят ВСЕ типы оверлеев. Режим выбирается сам:

  replace — анимация встаёт ВМЕСТО встроенного вида. Для типов, где оверлей
            это «картинка с подписью»: callout, popup, titlecard, lower3,
            banner, highlight, quote, stamp, marker, kinetic.

  decor   — анимация ложится ФОНОМ ПОД встроенный вид. Для типов, где рисунок
            задан данными: bars, infographic, compare, timeline, counter,
            collage, gallery, redact. Заменить их нельзя — скачанная анимация
            не знает ни значений, ни числа колонок; а дать движение под
            настоящими цифрами может.

Режим можно задать руками: --mode replace|decor.
"""
import argparse
import collections
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE))

import overlays  # noqa: E402

KINDS = ("lower3", "counter", "bars", "infographic", "timeline", "callout",
         "popup", "compare", "banner", "collage", "titlecard", "kinetic",
         "highlight", "quote", "stamp", "redact", "marker", "gallery")


def report() -> int:
    """Сколько видов у каждого типа и как они разложены по каналам.

    Нужен потому, что разнообразие — это не количество. Триста однотипных
    заголовков дают меньше, чем три структурно разных; а если все варианты
    лежат общими, каналы становятся неотличимы друг от друга — ровно то,
    ради чего профили каналов и заводятся.
    """
    meta = overlays.load_variants_meta()
    per_type = collections.Counter()
    per_chan = collections.Counter()
    lottie = collections.Counter()
    off = []
    for key, rec in meta.items():
        if not rec.get("enabled", True):
            off.append(key)
            continue
        t = rec.get("type", "?")
        per_type[t] += 1
        per_chan[rec.get("channel", "") or "(общие)"] += 1
        if rec.get("source") == "lottie":
            lottie[t] += 1

    base = {"banner": 3, "lower3": 3, "counter": 2}
    print(f"{'тип':<14}{'всего':>6}{'из них Lottie':>15}  режим Lottie")
    print("-" * 56)
    thin = []
    for t in KINDS:
        total = base.get(t, 1) + per_type[t]
        if total <= 2:
            thin.append(t)
        print(f"{t:<14}{total:>6}{lottie[t]:>15}  {overlays.lottie_mode_for(t)}")
    print("-" * 56)
    print(f"{'ИТОГО':<14}{sum(base.get(t, 1) + per_type[t] for t in KINDS):>6}")

    print("\nпо каналам:")
    for ch, n in per_chan.most_common():
        print(f"  {ch:<16}{n:>4}")
    if per_chan.get("(общие)", 0) > 12:
        print("  ! общих вариантов много — каналы будут похожи друг на друга."
              "\n    Добавляй новые с --channel <id>.")
    if thin:
        print(f"\nтонкие типы (2 вида и меньше): {', '.join(thin)}")
    if off:
        print(f"выключено: {', '.join(off)}")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(
        description="Lottie-анимация -> вариант оверлея")
    ap.add_argument("path", nargs="?", help="файл .json или папка с ними")
    ap.add_argument("--type", choices=KINDS,
                    help="тип оверлея, к которому приписать анимацию")
    ap.add_argument("--mode", choices=("auto", "replace", "decor"),
                    default="auto",
                    help="вместо встроенного вида или фоном под ним "
                         "(по умолчанию решается по типу)")
    ap.add_argument("--decor-opacity", type=float, default=0.5,
                    help="насколько приглушить фоновый слой (0.05-1.0)")
    ap.add_argument("--size", type=int, default=420,
                    help="размер в кадре, px (только для режима replace)")
    ap.add_argument("--loop", action="store_true",
                    help="крутить по кругу; без флага анимация растягивается "
                         "ровно на длительность оверлея")
    ap.add_argument("--channel", default="",
                    help="приписать одному каналу; пусто — общая для всех")
    ap.add_argument("--source", default="", help="откуда взята (для журнала)")
    ap.add_argument("--report", action="store_true",
                    help="показать, что уже есть в библиотеке, и выйти")
    args = ap.parse_args()

    if args.report:
        return report()
    if not args.path or not args.type:
        ap.error("нужны путь и --type (или --report)")

    p = Path(args.path)
    if not p.exists():
        print(f"Нет такого пути: {p}", file=sys.stderr)
        return 2
    files = sorted(p.glob("*.json")) if p.is_dir() else [p]
    if not files:
        print(f"В папке {p} нет ни одного .json", file=sys.stderr)
        return 2

    if len(files) > 3 and not args.channel:
        print(f"! Добавляешь {len(files)} анимаций общими, без --channel. "
              "Они достанутся всем каналам сразу, и каналы станут похожи.\n"
              "  Если это не то, что нужно — прерви и добавь --channel <id>.\n")

    ok = bad = 0
    for f in files:
        try:
            key = overlays.add_lottie_variant(
                f, kind=args.type, source=args.source or f.name,
                size=args.size, loop=args.loop, channel=args.channel,
                mode=args.mode, decor_opacity=args.decor_opacity)
            ok += 1
            print(f"  + {key}")
        except Exception as e:
            bad += 1
            print(f"  ! {f.name}: {e}")

    print(f"\nдобавлено {ok}, отклонено {bad}")
    if ok:
        print("Проверь типизацию:  cd remotion && npx tsc --noEmit")
        print("И посмотри кадр глазами — цифры пропускают кривую вёрстку.")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
