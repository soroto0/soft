# -*- coding: utf-8 -*-
"""Фабрика ПЛАШЕК КАНАЛА: столько своих видов, сколько каналу нужно.

Задача, которую она решает. Плашки закреплены за каналом (поле `channel` в
variants.json), и это правильно — владелец сказал прямо: «я не хочу чтобы эти
баннеры использовались в других моих каналах лишь в abyss хочу». Но у
закрепления есть цена: если просто поделить общую библиотеку на три, каждый
канал обеднеет втрое, а второе требование звучало не менее твёрдо — «я не
хочу чтобы мои каналы ограничивались».

Поэтому библиотека канала не делится, а ДОПРОИЗВОДИТСЯ. Здесь — механическая
её часть: без ИИ, без единого платного вызова, за доли секунды. Вид собирается
из словаря приёмов канала (remotion/src/variants/_look.ts): своё место в
кадре, своя подложка, своя техника появления, свой шрифт. Словари у трёх
каналов не пересекаются ни одним приёмом, поэтому два канала физически не
могут получить одинаковую плашку.

Вторая, «дорогая» часть роста осталась прежней — ИИ пишет по одному новому
компоненту на ролик (webapp._grow_variant_library). Она добавляет каналу
штучные, ни на что не похожие виды; фабрика держит нижнюю планку, чтобы канал
не выглядел бедным, пока их накопится достаточно.

    python variant_factory.py            # добить все каналы до планки
    python variant_factory.py --floor 10
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent

# Сколько своих видов на КАЖДЫЙ тип держим у канала. Почему восемь: в
# 20-минутном ролике одного типа набирается до полутора десятков плашек, и
# внутри ролика колесо (build_overlays) прокручивает весь доступный набор.
# При двух видах зритель видит один и тот же дизайн через раз — это и была
# исходная жалоба. Восемь — это восемь непохожих сочетаний «место + подложка +
# появление» (см. formSpec), их хватает и на ролик, и на то, чтобы соседние
# ролики канала начинались с разных видов.
FLOOR = 8

# 18 типов оверлеев. Список дублирует ключи gen_remotion_gemini.TYPE_BRIEF
# СОЗНАТЕЛЬНО: тот модуль при импорте перезаписывает боевой Overlay.tsx и
# делает платные вызовы, поэтому его нельзя импортировать ради одного списка.
OVERLAY_TYPES = (
    "banner", "lower3", "titlecard", "callout", "highlight", "kinetic",
    "marker", "quote", "stamp", "redact", "compare", "counter", "bars",
    "timeline", "infographic", "popup", "collage", "gallery",
)

# Имя палитры -> как называть её виды. Держим отдельно от самой палитры,
# потому что имя попадает и в имя файла, и в имя React-компонента.
PALETTE_TAG = {
    "harsh": ("harsh", "ChHarsh"),
    "warm": ("warm", "ChWarm"),
    "contemplative": ("calm", "ChCalm"),
}

_HEADER = """import React from 'react';
import type {{ VariantProps }} from '../types';
import {{ Formed }} from './_forms';

// АВТОГЕНЕРИРУЕМЫЙ ФАЙЛ — не редактировать руками.
// Пересоздаётся variant_factory.ensure() под палитру «{palette}».
//
// Каждая строка — один вид плашки этого канала. Номер не декоративный: он
// раскладывается в сочетание «место в кадре + подложка + появление» из
// словаря приёмов канала (_look.ts, formSpec). Соседние номера гарантированно
// дают разный силуэт, а не другой оттенок того же.
"""


def _channels() -> list[dict]:
    import channels
    return channels.load()


def palette_of(channel_id: str) -> str:
    """Палитра канала из channels.json. Пусто — канала нет."""
    for ch in _channels():
        if ch.get("id") == channel_id:
            return (ch.get("palette") or "").strip().lower()
    return ""


def _component(palette: str, n: int) -> str:
    return f"{PALETTE_TAG[palette][1]}{n:02d}"


def _variant_name(palette: str, n: int) -> str:
    return f"ch_{PALETTE_TAG[palette][0]}_{n:02d}"


def _file_name(palette: str) -> str:
    return f"ch_{PALETTE_TAG[palette][0]}.tsx"


def _write_exports(palette: str, count: int, log=print) -> bool:
    """Файл с видами палитры. Перезаписываем ТОЛЬКО при изменении: время
    правки файлов в remotion/src входит в отпечаток кода (overlays._code_stamp),
    и лишняя запись обесценила бы все уже отрисованные секвенции оверлеев —
    ролик пришлось бы рисовать заново целиком (замер прошлых суток: четыре
    таких перерисовки съели полтора часа)."""
    import overlays
    lines = [_HEADER.format(palette=palette)]
    for n in range(1, count + 1):
        lines.append(
            f"export const {_component(palette, n)}: React.FC<VariantProps> ="
            f" (p) => <Formed p={{p}} palette=\"{palette}\" n={{{n}}} />;\n")
    text = "\n".join(lines)
    dest = overlays.VARIANTS_DIR / _file_name(palette)
    try:
        if dest.exists() and dest.read_text(encoding="utf-8") == text:
            return False
    except OSError:
        pass
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(text, encoding="utf-8")
    log(f"[Фабрика] {dest.name}: {count} видов палитры «{palette}»")
    return True


def _own_count(meta: dict, channel_id: str, kind: str) -> int:
    """Сколько своих видов этого типа у канала сейчас. Считаем строго по
    принадлежности: чужие и общие сюда не входят — ролик их и не увидит."""
    import overlays
    n = 0
    for rec in meta.values():
        if rec.get("type") != kind or not rec.get("enabled", True):
            continue
        if rec.get("channel", "") != channel_id:
            continue
        if overlays._variant_file(rec).exists():
            n += 1
    return n


def ensure(channel_id: str, floor: int = FLOOR, log=print,
           rebuild: bool = True) -> int:
    """Добить библиотеку канала до планки. Возвращает, сколько видов добавлено.

    Ничего не удаляет и не переписывает уже накопленное: у типа, где своих
    видов и так хватает, не появится ни одной новой записи.
    """
    import overlays
    from datetime import datetime
    palette = palette_of(channel_id)
    if palette not in PALETTE_TAG:
        log(f"[Фабрика] У канала «{channel_id}» нет известной палитры "
            f"({palette or 'пусто'}) — добавлять нечего")
        return 0
    meta = overlays.load_variants_meta()
    need = {k: max(0, floor - _own_count(meta, channel_id, k))
            for k in OVERLAY_TYPES}
    if not any(need.values()):
        return 0
    # Номера видов, которые вообще понадобятся: у типа с дефицитом 3 это
    # 1..3, у типа с дефицитом 8 — 1..8. Компоненты общие на все типы, файл
    # пишем один раз на самый большой запрос.
    top = max(need.values())
    have_max = 0
    for key, rec in meta.items():
        m = re.match(rf"^ch_{PALETTE_TAG[palette][0]}_(\d+)$",
                     rec.get("variant", ""))
        if m and rec.get("channel", "") == channel_id:
            have_max = max(have_max, int(m.group(1)))
    # КОМПОНЕНТЫ ПИШУТСЯ ПОСЛЕ ЦИКЛА, А НЕ ДО. Здесь стояло
    # _write_exports(palette, max(top, have_max)) перед циклом — то есть
    # файл создавался под ОЦЕНКУ числа видов, а цикл потом свободно уходил
    # за неё. Уйти он может законно: номер n растёт и когда запись уже
    # есть в реестре (её завёл другой канал или прошлый прогон), а need
    # при этом не уменьшается.
    #
    # Цена измерена 2026-08-08: реестр ссылался на ChCalm09..ChCalm16, а в
    # ch_calm.tsx существовали только ChCalm01..08. Восемь битых ссылок —
    # и `tsc --noEmit` по ВСЕМУ проекту падал. А проверка ИИ-сцен гоняет
    # именно его: в том же прогоне 49 сгенерированных схем подряд ушли в
    # брак «не проходит типизацию проекта», 11 сдались совсем. Схемы были
    # ни при чём — их валила одна чужая строка в реестре.
    added, used_max = 0, max(top, have_max)
    for kind in OVERLAY_TYPES:
        n = 1
        while need[kind] > 0:
            used_max = max(used_max, n)
            key = f"{kind}/{_variant_name(palette, n)}"
            if key in meta:
                n += 1
                continue
            meta[key] = {
                "file": _file_name(palette),
                "component": _component(palette, n),
                "type": kind,
                "variant": _variant_name(palette, n),
                "enabled": True,
                "channel": channel_id,
                "engine": "remotion",
                "source": "factory",
                "created": datetime.now().isoformat(timespec="seconds"),
                "theme": f"Почерк канала «{channel_id}» (палитра {palette}), "
                         f"сочетание приёмов №{n}: своё место в кадре, своя "
                         f"подложка, своя техника появления.",
            }
            added += 1
            need[kind] -= 1
            n += 1
    # Теперь известно, до какого номера реестр реально дотянулся.
    _write_exports(palette, used_max, log)
    overlays.save_variants_meta(meta)
    if rebuild:
        overlays.rebuild_registry(log, meta)
    log(f"[Фабрика] Канал «{channel_id}»: добавлено {added} своих видов "
        f"(планка {floor} на тип)")
    return added


def adopt_unmarked(channel_id: str, log=print) -> int:
    """Отдать каналу все записи БЕЗ метки — разовая операция при переходе на
    принадлежность.

    Почему целиком одному каналу, а не поровну на три. Накопленная библиотека
    делалась и принималась на роликах abyss, и владелец сказал именно это:
    «я не хочу чтобы эти баннеры использовались в других моих каналах лишь в
    abyss хочу, а в других каналах должен быть новые баннеры по его стилям».
    Раздача по трети каждому была бы и против его слов, и против арифметики:
    46 видов на 18 типов — это меньше одного вида на тип на канал.
    """
    import overlays
    meta = overlays.load_variants_meta()
    n = 0
    for rec in meta.values():
        if not rec.get("channel", ""):
            rec["channel"] = channel_id
            n += 1
    if n:
        overlays.save_variants_meta(meta)
        overlays.rebuild_registry(log, meta)
        log(f"[Фабрика] {n} видов без метки закреплены за каналом «{channel_id}»")
    return n


def ensure_all(floor: int = FLOOR, log=print) -> int:
    import overlays
    total = 0
    for ch in _channels():
        total += ensure(ch.get("id", ""), floor, log, rebuild=False)
    if total:
        overlays.rebuild_registry(log)
    return total


def main() -> int:
    sys.path.insert(0, str(BASE))
    floor = FLOOR
    if "--floor" in sys.argv:
        floor = int(sys.argv[sys.argv.index("--floor") + 1])
    n = ensure_all(floor)
    print(f"Добавлено видов: {n}")
    import overlays
    meta = overlays.load_variants_meta()
    for ch in _channels():
        cid = ch.get("id", "")
        own = [k for k, r in meta.items() if r.get("channel", "") == cid]
        print(f"  {cid}: своих видов {len(own)}")
    print(f"  общих (без канала): "
          f"{sum(1 for r in meta.values() if not r.get('channel'))}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
