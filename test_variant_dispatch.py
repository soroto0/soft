#!/usr/bin/env python3
"""Сквозная проверка: доезжает ли выбранный вариант до рендера.

Зачем именно такая. Каждый кусок по отдельности можно проверить и получить
зелёный результат, а ролик всё равно выйдет со встроенным видом: вариант
выбирается в одном месте, рендерится в другом, а связывает их СТРОКОВЫЙ
ПРЕФИКС имени. Так и случилось с Lottie: ветка рендера проверяла
«remotion_ai_», обёртки Lottie назывались «lot_», и ни одна из них не
рисовалась — молча, без единой строки в журнале.

Проверяется цепочка целиком:
    variants.json -> _variant_options() -> колесо чередования
                  -> условие ветки рендера -> имя, уходящее в Overlay.tsx
                  -> ключ в _registry.ts

Запуск:  python test_variant_dispatch.py
"""
import json
import re
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE))

import overlays  # noqa: E402

FAILS: list[str] = []


def check(cond: bool, msg: str) -> None:
    if not cond:
        FAILS.append(msg)
        print(f"  ПРОВАЛ: {msg}")


def registry_keys() -> tuple[set[str], set[str]]:
    """Что реально экспортирует _registry.ts — VARIANTS и DECOR."""
    src = (overlays.VARIANTS_DIR / "_registry.ts").read_text(encoding="utf-8")

    def block(name: str) -> set[str]:
        m = re.search(rf"export const {name}[^{{]*{{(.*?)\n}};", src, re.S)
        return set(re.findall(r"'([^']+)'\s*:", m.group(1))) if m else set()

    return block("VARIANTS"), block("DECOR")


def main() -> int:
    meta = overlays.load_variants_meta()
    var_keys, decor_keys = registry_keys()
    print(f"в реестре: VARIANTS={len(var_keys)}, DECOR={len(decor_keys)}\n")

    # ------- 1. Каждый включённый вариант доезжает до рендера -------
    print("1. Выбранный вариант доходит до ветки рендера и до реестра")
    checked = 0
    for key, rec in sorted(meta.items()):
        if not rec.get("enabled", True):
            continue
        if rec.get("engine", "remotion") != "remotion":
            continue
        if not overlays._variant_file(rec).exists():
            continue
        kind, variant = rec["type"], rec["variant"]
        pick = f"remotion_{variant}"

        # ветка рендера обязана опознать его как библиотечный
        check(overlays._is_lib_pick(pick),
              f"{key}: ветка рендера не опознаёт «{pick}» — "
              "вариант молча упадёт на встроенный вид")

        # имя, которое уйдёт в props.variant, и ключ, по которому
        # Overlay.tsx ищет компонент
        sent = pick[len("remotion_"):]
        want = f"{kind}/{sent}"
        pool = decor_keys if rec.get("mode") == "decor" else var_keys
        where = "DECOR" if rec.get("mode") == "decor" else "VARIANTS"
        check(want in pool,
              f"{key}: Overlay.tsx будет искать «{want}» в {where}, "
              "а такого ключа там нет")
        checked += 1
    print(f"   проверено вариантов: {checked}")

    # ------- 2. Вариант вообще попадает в жребий -------
    print("\n2. Вариант попадает в набор, из которого идёт выбор")
    for key, rec in sorted(meta.items()):
        if not rec.get("enabled", True) or rec.get("engine", "remotion") != "remotion":
            continue
        if not overlays._variant_file(rec).exists():
            continue
        ch = rec.get("channel", "")
        # проект того же канала (или общий, если метки нет)
        opts = overlays._variant_options(_project_dir(ch), rec["type"])
        check(f"remotion_{rec['variant']}" in opts,
              f"{key}: не попал в набор вариантов для своего типа/канала")

    # ------- 3. Lottie: файл анимации на месте -------
    print("\n3. У Lottie-вариантов есть сам файл анимации")
    lot = [r for r in meta.values() if r.get("source") == "lottie"]
    for rec in lot:
        f = overlays.LOTTIE_DIR / rec.get("lottie", "")
        check(f.exists(), f"{rec['type']}/{rec['variant']}: нет {f}")
    print(f"   Lottie-вариантов: {len(lot)}")

    # ------- 4. Режим decor не попадает в VARIANTS и наоборот -------
    print("\n4. Режимы не перепутаны между картами реестра")
    check(not (var_keys & decor_keys),
          f"один ключ и в VARIANTS, и в DECOR: {var_keys & decor_keys}")

    print("\n" + "=" * 58)
    if FAILS:
        print(f"ПРОВАЛОВ: {len(FAILS)}")
        return 1
    print("всё сходится: выбор, рендер и реестр говорят об одном и том же")
    return 0


_DIRS: dict[str, Path] = {}


def _project_dir(channel: str) -> Path:
    """Настоящая папка проекта с meta.json нужного канала.

    Подделывать Path объектом-заглушкой нельзя: _project_channel делает
    Path(out_dir), и заглушка туда не пролезает. Настоящая временная папка
    заодно проверяет и само чтение meta.json.
    """
    if channel not in _DIRS:
        import tempfile
        d = Path(tempfile.mkdtemp(prefix="vdisp_"))
        (d / "meta.json").write_text(
            json.dumps({"channel": channel}, ensure_ascii=False),
            encoding="utf-8")
        _DIRS[channel] = d
    return _DIRS[channel]


if __name__ == "__main__":
    sys.exit(main())
