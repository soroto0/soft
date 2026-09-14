#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Уборка диска: что можно удалить, чтобы ночь не умирала от нехватки места.

    python disk.py                     # ПОКАЗАТЬ, что удалю (ничего не трогая)
    python disk.py --all               # показать и то, что требует решения
    python disk.py --apply             # удалить безопасное
    python disk.py --rule storyboard --days 21 --apply   # разобрать старые кадры

ЗАЧЕМ ОТДЕЛЬНЫЙ ФАЙЛ

Ночь на 2026-08-12 дала ноль роликов на четырёх каналах. Одна причина на все
четыре: «No space left on device» — из 511 ГБ оставалось 11. Разбор занятого:
55.5 ГБ в render_tmp (промежуточные куски ffmpeg), 45.8 ГБ в storyboard,
14.0 ГБ в готовых роликах. То есть три четверти съеденного места — это мусор
оборванных сборок, который никто не убирал, потому что убирался он ТОЛЬКО
после успеха.

Чинить это внутри рендера мало: рендер видит свой проект и свою папку, а
место кончается на диске целиком. Поэтому правила хранения живут здесь —
модулем без побочных эффектов, который можно позвать перед ночью
(before_night), из интерфейса или руками из командной строки, и который по
умолчанию НИЧЕГО НЕ УДАЛЯЕТ, а показывает список.

ГЛАВНОЕ ПРАВИЛО ЭТОГО ФАЙЛА: удаляется только то, что софт умеет посчитать
заново БЕСПЛАТНО. Готовые ролики, сценарии, озвучка, субтитры и обложки не
удаляются никогда и никаким правилом — их не из чего восстановить. Кадры
раскадровки стоят денег (Veo), поэтому правило про них есть, но само оно
ночью не включается: за него отвечает человек.
"""
import argparse
import json
import os
import shutil
import sys
import time
from pathlib import Path

BASE = Path(__file__).resolve().parent
GB = 1024 ** 3

# Ниже этого остатка ночь начинать бессмысленно: одна сборка съедает
# промежуточными файлами вдвое-втрое больше готового ролика, а роликов за ночь
# несколько. Значение совпадает с render.DISK_FLOOR_GB не случайно — это тот
# же порог, только проверенный ДО начала работы, а не на четвёртой группе из
# семнадцати.
NIGHT_FLOOR_GB = float(os.getenv("NIGHT_DISK_FLOOR_GB", "25"))

# Сколько минут папка должна лежать нетронутой, чтобы считать её брошенной.
# Защита от главного способа выстрелить себе в ногу: удалить render_tmp у
# сборки, которая прямо сейчас идёт. Полтора часа — с запасом: рендер пишет в
# render_tmp непрерывно, самая длинная тихая пауза внутри него это финальный
# проход, и он короче.
IDLE_MIN = float(os.getenv("DISK_IDLE_MIN", "90"))

# Через сколько дней после сборки ролика его кадры считаются отработавшими.
DAYS_FINISHED = int(os.getenv("DISK_DAYS_FINISHED", "14"))
# Через сколько дней разбирать проекты ВЫКЛЮЧЕННОГО канала.
DAYS_OFF = int(os.getenv("DISK_DAYS_OFF", "30"))

# Что не удаляется НИКОГДА, ни одним правилом. Проверяется перед каждым
# удалением, а не только при сборе списка: список собирают шесть разных
# функций, и достаточно ошибиться в одной.
KEEP_NAMES = {
    "output_final.mp4", "script.txt", "seo.txt", "meta.json", "timeline.json",
    "chapters.json", "queries.json", "overlays.txt", "cues.txt",
    "sequence.xml", "veo_tasks.json",
}
KEEP_DIRS = {"audio", "subs", "video", "images"}


# ---------- замер ----------

def free_gb(where: Path | str | None = None) -> float:
    """Свободно на диске, ГБ. По умолчанию — на диске с софтом."""
    p = Path(where) if where else BASE
    try:
        return shutil.disk_usage(str(Path(p).resolve().anchor)).free / GB
    except OSError:
        return 0.0


def dir_size(p: Path) -> int:
    """Сколько байт занимает папка (или файл)."""
    p = Path(p)
    try:
        if p.is_file():
            return p.stat().st_size
    except OSError:
        return 0
    total = 0
    try:
        for f in p.rglob("*"):
            try:
                if f.is_file():
                    total += f.stat().st_size
            except OSError:
                pass
    except OSError:
        pass
    return total


def _idle_min(p: Path) -> float:
    """Сколько минут папку не трогали. Смотрим и на саму папку, и на её
    содержимое: mtime папки меняется только при создании файла В НЕЙ, а
    ffmpeg дописывает уже существующий сегмент."""
    times = []
    try:
        times.append(p.stat().st_mtime)
        for ch in p.iterdir():
            try:
                times.append(ch.stat().st_mtime)
            except OSError:
                pass
    except OSError:
        pass
    return (time.time() - max(times, default=0.0)) / 60.0


def _age_days(p: Path) -> float:
    """Сколько дней проект не трогали."""
    return _idle_min(p) / (60.0 * 24.0)


# ---------- где что лежит ----------

def _root_of(channel: dict) -> Path:
    """Папка канала. Относительный folder считаем от папки софта, а НЕ от
    текущего каталога: disk.py зовут и из планировщика задач, где рабочий
    каталог чужой, а промахнувшееся правило уборки — это не «ничего не
    нашлось», это «нашлось не то»."""
    folder = (channel.get("folder") or "").strip()
    if not folder:
        return BASE / str(channel.get("id") or channel.get("name") or "")
    p = Path(folder)
    return p if p.is_absolute() else BASE / p


def _channels() -> list[dict]:
    """Профили каналов. Читаем файл сами, без импорта channels: тот тянет
    настройки и умеет жаловаться в интерфейс, а уборке нужно ровно два поля."""
    try:
        raw = json.loads((BASE / "channels.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return []
    out = []
    for c in raw if isinstance(raw, list) else []:
        cid = str(c.get("id") or c.get("name") or "").strip()
        if cid:
            out.append({"id": cid, "name": str(c.get("name") or cid),
                        "active": bool(c.get("active", True)),
                        "folder": c.get("folder", "")})
    return out


def _is_project(p: Path) -> bool:
    """Похожа ли папка на проект. Признак тот же, что у channels.is_project_dir
    и у списка проектов в интерфейсе: расхождение здесь означало бы, что
    уборка считает проектом не то, что показывают человеку."""
    try:
        if p.name.startswith(("_", ".")):
            return False
        return p.is_dir() and ((p / "script.txt").exists()
                               or (p / "audio").exists())
    except OSError:
        return False


def _is_finished(p: Path) -> bool:
    """Ролик собран: есть непустой output_final.mp4. Размер, а не .exists() —
    оборванный ffmpeg оставляет файл нулевой длины, и по одному наличию файла
    «готовым» считался бы огрызок (то же правило в night_plan.is_finished)."""
    out = p / "output_final.mp4"
    try:
        return out.exists() and out.stat().st_size > 1_000_000
    except OSError:
        return False


def projects() -> list[dict]:
    """Все проекты всех каналов: [{channel, active, dir, finished, age_d}].

    Корень канала тоже бывает проектом: у старых каналов (abyss, fisura-critica)
    ролик лежит прямо в папке канала, без подпапки с датой.
    """
    seen, out = set(), []
    for ch in _channels():
        root = _root_of(ch)
        cand = [root]
        try:
            cand += sorted(p for p in root.iterdir() if p.is_dir())
        except OSError:
            pass
        for d in cand:
            key = str(d.resolve()).lower()
            if key in seen or not _is_project(d):
                continue
            seen.add(key)
            out.append({"channel": ch["name"], "active": ch["active"],
                        "dir": d, "finished": _is_finished(d),
                        "age_d": _age_days(d)})
    return out


# ---------- защита ----------

def _guard(p: Path) -> str:
    """Пустая строка — удалять можно. Иначе причина отказа.

    Проверка стоит ПЕРЕД КАЖДЫМ удалением, а не только при сборе списка:
    правил шесть, каждое собирает пути по-своему, и ошибиться достаточно в
    одном. Здесь же ловится случай «правило вернуло корень проекта».
    """
    try:
        p = Path(p).resolve()
    except OSError as e:
        return f"путь не читается: {e}"
    if p == BASE or p.parent == p:
        return "это корень — не трогаю"
    if p.name in KEEP_NAMES:
        return "это результат работы, а не мусор"
    if p.is_dir() and p.name in KEEP_DIRS:
        return "это исходники ролика (озвучка/субтитры/материал)"
    if _is_project(p):
        return "это папка проекта целиком — такое удаляет только человек"
    # Мусор лежит либо внутри папки софта, либо внутри папки канала. Всё
    # прочее (чужой диск, домашняя папка, %TEMP%) правилам недоступно.
    roots = [BASE] + [_root_of(c).resolve() for c in _channels()]
    if any(p == r or r in p.parents for r in roots):
        return ""
    # Единственное исключение — профиль окна нашего же приложения во временной
    # папке. Опознаётся не по имени (оно случайное), а по служебной папке
    # WebView2 внутри, и лежать обязан ПРЯМО во временной папке: так под
    # правило не попадёт ни чужая программа, ни вложенная папка чьего-то
    # профиля.
    try:
        import tempfile
        if (p.parent == Path(tempfile.gettempdir()).resolve()
                and p.name.startswith("tmp") and (p / "EBWebView").is_dir()):
            return ""
    except OSError:
        pass
    return "путь вне папок софта и каналов"


# ---------- правила ----------

# Кадры оверлеев внутри render_tmp: их дорого считать заново (~14 секунд
# Remotion на плашку, 25 минут на ролик со ста плашками), а весят они мало —
# 1.1 ГБ из 7.63 ГБ в оставшемся render_tmp. Поэтому у НЕЗАКОНЧЕННОГО ролика
# уборка их щадит: он ещё будет пересобран. То же правило и в
# render.wipe_render_tmp — там оно применяется на падении сборки.
OVERLAY_CACHE_PREFIX = "ovl_"


def _rule_tmp(cfg: dict) -> list[dict]:
    """render_tmp — промежуточные куски ffmpeg от ОБОРВАННОЙ сборки.

    Ровно эти 55.5 ГБ и убили ночь 2026-08-12. Сегменты, группы и запечённые
    промежуточные файлы удалять безопасно при любом возрасте: они целиком
    пересчитываются из материала проекта, и рендер сам стирает их в начале
    следующего прогона.

    Две опасности, и обе учтены: сборка, идущая ПРЯМО СЕЙЧАС (свежие папки
    пропускаем), и кэш кадров оверлеев у ролика, который ещё будут доделывать.
    """
    out = []
    for pr in projects():
        tmp = pr["dir"] / "render_tmp"
        if not tmp.is_dir():
            continue
        idle = _idle_min(tmp)
        if idle < cfg["idle_min"]:
            out.append({"rule": "tmp", "path": tmp, "size": dir_size(tmp),
                        "channel": pr["channel"], "skip":
                        f"сборка идёт прямо сейчас (писали {idle:.0f} мин назад)"})
            continue
        if pr["finished"]:
            # Ролик собран — в промежуточных файлах не осталось ничего, что
            # ещё понадобится.
            out.append({"rule": "tmp", "path": tmp, "size": dir_size(tmp),
                        "channel": pr["channel"],
                        "why": f"ролик собран, промежуточные файлы лежат "
                               f"{idle / 60:.0f} ч"})
            continue
        try:
            heavy = [c for c in tmp.iterdir()
                     if not (c.is_dir()
                             and c.name.startswith(OVERLAY_CACHE_PREFIX))]
        except OSError:
            continue
        if not heavy:
            continue
        out.append({"rule": "tmp", "path": tmp,
                    "targets": heavy,
                    "size": sum(dir_size(c) for c in heavy),
                    "channel": pr["channel"],
                    "why": f"мусор оборванной сборки, лежит {idle / 60:.0f} ч "
                           f"(кадры оверлеев оставляю — ролик ещё доделают)"})
    return out


def _rule_scraps(cfg: dict) -> list[dict]:
    """Обрывки шагов: черновые фоны обложек, вырезки предметов, кадры сверки.

    Мелочь по сравнению с render_tmp, но это ровно тот случай, когда «мелочь»
    накапливается годами: файлы скрытые (с точки в начале имени), их не видно
    в папке, и ни один шаг их за собой не убирает.
    """
    out = []
    for pr in projects():
        d = pr["dir"]
        junk = []
        thumbs = d / "thumbs"
        if thumbs.is_dir():
            junk += [f for f in thumbs.iterdir()
                     if f.is_file() and f.name.startswith((".bg", ".obj",
                                                           ".feed"))]
        for name in (".ref_frames", ".shots_tmp"):
            if (d / name).is_dir():
                junk.append(d / name)
        for f in junk:
            if _idle_min(f if f.is_dir() else f.parent) < cfg["idle_min"]:
                continue
            out.append({"rule": "scraps", "path": f, "size": dir_size(f),
                        "channel": pr["channel"],
                        "why": "черновик шага, дальше не используется"})
    return out


def _rule_storyboard(cfg: dict) -> list[dict]:
    """Кадры СОБРАННОГО ролика, к которому давно не возвращались.

    ЭТО ПРАВИЛО СТОИТ ДЕНЕГ, и потому его нет в ночном наборе. В storyboard
    лежат не только бесплатные картинки: основную массу занимают клипы Veo
    (замер: у einsturzpunkt/2026-08-11 из 1.50 ГБ на видео приходится 1.46).
    Удалив их, пересобрать этот ролик заново можно будет только оплатив
    генерацию повторно.

    Поэтому два условия вместо одного «ролик готов»:
      * ролик действительно собран (непустой output_final.mp4);
      * к проекту не возвращались cfg["days_finished"] дней.
    Второе условие не формальность: sequence.xml ссылается на файлы
    storyboard (замер: 150 ссылок в одном ролике), то есть удаление кадров
    ломает открытие ролика в Premiere. Пока ролик доводят руками, кадры нужны.
    """
    out = []
    for pr in projects():
        sb = pr["dir"] / "storyboard"
        if not sb.is_dir():
            continue
        if not pr["finished"]:
            continue
        if pr["age_d"] < cfg["days_finished"]:
            out.append({"rule": "storyboard", "path": sb, "size": dir_size(sb),
                        "channel": pr["channel"], "skip":
                        f"ролику всего {pr['age_d']:.0f} д, его ещё доводят "
                        f"(порог {cfg['days_finished']} д)"})
            continue
        out.append({"rule": "storyboard", "path": sb, "size": dir_size(sb),
                    "channel": pr["channel"],
                    "why": f"ролик собран, к проекту не возвращались "
                           f"{pr['age_d']:.0f} д"})
    return out


def _rule_off(cfg: dict) -> list[dict]:
    """Тяжёлое у проектов ВЫКЛЮЧЕННОГО канала.

    Выключенный канал новых роликов не получает, а место держит. Но «выключен»
    — это не «удалён»: профиль, статистика и выложенные ролики остаются, канал
    включают обратно одной галочкой. Поэтому правило разбирает проект, а не
    сносит: уходят кадры и мусор сборки, остаются готовый ролик, обложки,
    сценарий, озвучка и субтитры.

    Незаконченные проекты выключенного канала не трогаем вовсе: у них кадры —
    это вся проделанная работа, и удалить их значит выбросить ролик, который
    ещё можно доделать за двадцать минут.

    Про render_tmp здесь намеренно ни слова: мусор оборванных сборок убирает
    правило «tmp», и делает это у ВСЕХ каналов, включённых и выключенных. Две
    записи на один путь только путали бы отчёт.
    """
    out = []
    for pr in projects():
        if pr["active"]:
            continue
        d = pr["dir"] / "storyboard"
        if not d.is_dir():
            continue
        if not pr["finished"]:
            out.append({"rule": "off", "path": d, "size": dir_size(d),
                        "channel": pr["channel"], "skip":
                        "ролик не собран — кадры это вся работа по нему"})
            continue
        if pr["age_d"] < cfg["days_off"]:
            out.append({"rule": "off", "path": d, "size": dir_size(d),
                        "channel": pr["channel"], "skip":
                        f"проекту {pr['age_d']:.0f} д "
                        f"(порог {cfg['days_off']} д)"})
            continue
        out.append({"rule": "off", "path": d, "size": dir_size(d),
                    "channel": pr["channel"],
                    "why": f"канал выключен, проекту {pr['age_d']:.0f} д"})
    return out


def _rule_webview(cfg: dict) -> list[dict]:
    """Профили окна приложения, брошенные в %TEMP%.

    Окно приложения (pywebview -> WebView2) заводит себе профиль во временной
    папке и НЕ убирает его при выходе. Замер 2026-08-12: во временной папке
    6.86 ГБ, из них пять штук по 68 МБ — это профили от пяти запусков.

    Опознаём по служебной папке EBWebView внутри: имя у временной папки
    случайное, и удалять всё подряд из %TEMP% нельзя — там живут и чужие
    программы. Свежие не трогаем: приложение может быть запущено сейчас.
    """
    out = []
    try:
        import tempfile
        tdir = Path(tempfile.gettempdir())
        entries = list(tdir.iterdir())
    except OSError:
        return out
    for p in entries:
        try:
            if not p.is_dir() or not p.name.startswith("tmp"):
                continue
            if not (p / "EBWebView").is_dir():
                continue
        except OSError:
            continue
        age = _age_days(p)
        if age < 1.0:
            out.append({"rule": "webview", "path": p, "size": dir_size(p),
                        "channel": "(временная папка)", "skip":
                        "моложе суток — приложение может быть запущено"})
            continue
        out.append({"rule": "webview", "path": p, "size": dir_size(p),
                    "channel": "(временная папка)",
                    "why": f"профиль окна от прошлого запуска, {age:.0f} д"})
    return out


def _rule_buildcache(cfg: dict) -> list[dict]:
    """Кеш сборки webpack внутри remotion/node_modules.

    САМОЕ ТЯЖЁЛОЕ НА ДИСКЕ, и уборка проходила мимо. Замер 2026-08-22: вся
    папка проекта 14.47 ГБ, из них remotion 8.71 ГБ, а внутри него
    node_modules/.cache/webpack — 7.99 ГБ в 196 файлах. Это 55% всего диска
    против 0.3% у журнала, который правила уже ловят.

    Кеш восстанавливается сам: webpack соберёт его заново при следующем
    рендере. Цена удаления — одна медленная первая сборка, и только она.

    Свежий не трогаем: если рендер идёт прямо сейчас, кеш ему нужен.
    """
    out = []
    root = BASE / "remotion" / "node_modules" / ".cache"
    if not root.is_dir():
        return out
    for p in sorted(root.iterdir()):
        try:
            if not p.is_dir():
                continue
        except OSError:
            continue
        age = _age_days(p)
        size = dir_size(p)
        if age < 1.0:
            out.append({"rule": "buildcache", "path": p, "size": size,
                        "channel": "(сборка Remotion)",
                        "skip": "моложе суток — рендер может идти сейчас"})
            continue
        out.append({"rule": "buildcache", "path": p, "size": size,
                    "channel": "(сборка Remotion)",
                    "why": f"кеш сборки, {age:.0f} д; webpack соберёт заново"})
    return out


RULES = {
    "tmp": (_rule_tmp, "мусор оборванных сборок (render_tmp)"),
    "buildcache": (_rule_buildcache, "кеш сборки Remotion (восстановим)"),
    "scraps": (_rule_scraps, "черновики шагов (фоны обложек, вырезки)"),
    "storyboard": (_rule_storyboard, "кадры давно собранных роликов"),
    "off": (_rule_off, "тяжёлое у выключенных каналов"),
    "webview": (_rule_webview, "профили окна приложения в %TEMP%"),
}

# Что уборка делает САМА, без спроса. Только то, что софт пересчитает
# бесплатно: промежуточные куски ffmpeg и черновики шагов.
SAFE = ("tmp", "scraps")
# Что показывается, но не делается: за это решает человек — здесь либо
# деньги (оплаченные кадры Veo), либо чужие программы (%TEMP%).
ASK = ("storyboard", "off", "webview", "buildcache")


# ---------- сбор и уборка ----------

def plan(rules=SAFE, days_finished: int = DAYS_FINISHED,
         days_off: int = DAYS_OFF, idle_min: float = IDLE_MIN) -> list[dict]:
    """Что попадает под правила. НИЧЕГО НЕ УДАЛЯЕТ.

    Возвращает список записей: rule, path, size, channel и либо why (удалю),
    либо skip (под правило попало, но не удаляю — с причиной). Пропуски в
    списке нужны так же, как удаления: без них «правило ничего не нашло» и
    «правило нашло, но не тронуло» выглядят одинаково.
    """
    cfg = {"days_finished": days_finished, "days_off": days_off,
           "idle_min": idle_min}
    out, seen = [], {}
    for name in rules:
        fn = RULES.get(name, (None, ""))[0]
        if fn is None:
            continue
        for item in fn(cfg):
            # Один путь под двумя правилами — обычное дело: render_tmp
            # выключенного канала ловят и «tmp», и «off». Считать его дважды
            # нельзя, иначе итог обещает вдвое больше, чем освободится. Но и
            # молча прятать второе правило неправильно: в отчёте оно тогда
            # выглядит как «ничего не нашло». Поэтому не выбрасываем, а
            # помечаем — с именем правила, которое забрало путь первым.
            key = str(item["path"]).lower()
            if key in seen:
                item = dict(item, skip=f"уже посчитано правилом «{seen[key]}»; "
                                       f"своя цифра — «--rule {name}» отдельно")
                item.pop("why", None)
                out.append(item)
                continue
            seen[key] = name
            # targets — что удалять на самом деле. Обычно это сам path, но
            # правило может отдать часть содержимого папки (render_tmp без
            # кадров оверлеев), и тогда путь в отчёте один, а удалений
            # несколько.
            item.setdefault("targets", [item["path"]])
            if not item.get("skip"):
                bad = next((b for b in (_guard(t) for t in item["targets"]) if b),
                           "")
                if bad:
                    item = dict(item, skip=bad)
                    item.pop("why", None)
            out.append(item)
    return out


def sweep(rules=SAFE, apply: bool = False, log=print, **kw) -> dict:
    """Уборка. По умолчанию apply=False — только показывает.

    Возвращает {"freed": байт, "items": [...], "errors": [...]}.
    """
    items = plan(rules, **kw)
    freed, errors = 0, []
    for it in items:
        if it.get("skip"):
            continue
        if not apply:
            freed += it["size"]
            continue
        gone = 0
        for target in it["targets"]:
            bad = _guard(target)          # ещё раз, вплотную к удалению
            if bad:
                errors.append(f"{target}: {bad}")
                continue
            try:
                size = dir_size(target)
                if target.is_dir():
                    shutil.rmtree(target)
                else:
                    target.unlink()
                gone += size
            except OSError as e:
                errors.append(f"{target}: {e}")
                log(f"[Диск] Не удалось удалить {target}: {e}")
        if gone:
            freed += gone
            log(f"[Диск] Удалено {gone / GB:.2f} ГБ: {it['path']}")
    return {"freed": freed, "items": items, "errors": errors}


def before_night(log=print) -> float:
    """Уборка перед ночью. Зовётся автопилотом ДО первого канала.

    Делает только безопасное (SAFE). Если после этого места всё равно мало —
    НЕ удаляет ничего сверх того, а говорит, сколько освободили бы остальные
    правила и какой командой их позвать. Решение про оплаченные кадры принимает
    человек, а не расписание.

    Возвращает остаток свободного места в ГБ.
    """
    before = free_gb()
    res = sweep(SAFE, apply=True, log=log)
    after = free_gb()
    if res["freed"]:
        log(f"[Диск] Убрано {res['freed'] / GB:.1f} ГБ мусора прошлых сборок; "
            f"свободно {after:.0f} ГБ (было {before:.0f})")
    else:
        log(f"[Диск] Свободно {after:.0f} ГБ, убирать нечего")
    if after >= NIGHT_FLOOR_GB:
        return after
    # Причина — ПЕРВОЙ строкой и словами. В ночь 2026-08-12 она стояла
    # последней, после трёх жалоб на видеокарту, и владелец утром читал про
    # NVENC.
    log(f"[Диск] МЕСТА МАЛО: свободно {after:.0f} ГБ, ночи нужно хотя бы "
        f"{NIGHT_FLOOR_GB:.0f} — ролики упрутся в диск и ночь даст ноль")
    extra = plan(ASK)
    by_rule = {}
    for it in extra:
        if not it.get("skip"):
            by_rule[it["rule"]] = by_rule.get(it["rule"], 0) + it["size"]
    for name, size in sorted(by_rule.items(), key=lambda kv: -kv[1]):
        log(f"[Диск] Правило «{name}» ({RULES[name][1]}) освободило бы "
            f"{size / GB:.1f} ГБ — сам не делаю: "
            f"python disk.py --rule {name} --apply")
    if not by_rule:
        log("[Диск] Автоматические правила больше ничего не находят — "
            "освободи место руками (готовые ролики я не трогаю)")
    return after


# ---------- отчёт ----------

def report(rules=None, **kw) -> str:
    """Таблица «правило -> канал -> сколько ГБ». Ничего не удаляет."""
    rules = rules or (SAFE + ASK)
    items = plan(rules, **kw)
    lines = [f"Свободно на диске: {free_gb():.1f} ГБ "
             f"(ночи нужно хотя бы {NIGHT_FLOOR_GB:.0f})", ""]
    total = 0
    for name in rules:
        mine = [i for i in items if i["rule"] == name]
        if not mine:
            continue
        gain = sum(i["size"] for i in mine if not i.get("skip"))
        total += gain
        mark = "  (только показываю)" if name in ASK else ""
        lines.append(f"= {name}: {RULES[name][1]}{mark}")
        by_ch = {}
        for i in mine:
            if not i.get("skip"):
                by_ch[i["channel"]] = by_ch.get(i["channel"], 0) + i["size"]
        for ch, size in sorted(by_ch.items(), key=lambda kv: -kv[1]):
            lines.append(f"    {ch:<26} {size / GB:7.2f} ГБ")
        for i in mine:
            if i.get("skip"):
                lines.append(f"    - пропускаю {i['path']} "
                             f"({i['size'] / GB:.2f} ГБ): {i['skip']}")
        lines.append(f"    ИТОГО по правилу: {gain / GB:.2f} ГБ")
        lines.append("")
    lines.append(f"ВСЕГО освободится: {total / GB:.2f} ГБ")
    return "\n".join(lines)


def main() -> int:
    ap = argparse.ArgumentParser(
        description="Уборка диска: по умолчанию только показывает")
    ap.add_argument("--apply", action="store_true",
                    help="действительно удалить (без ключа — только показать)")
    ap.add_argument("--rule", action="append", default=[],
                    help=f"какие правила: {', '.join(RULES)}")
    ap.add_argument("--all", action="store_true",
                    help="показать и правила, требующие решения человека")
    ap.add_argument("--days", type=int, default=DAYS_FINISHED,
                    help=f"сколько дней ролик считается свежим "
                         f"(по умолчанию {DAYS_FINISHED})")
    ap.add_argument("--days-off", type=int, default=DAYS_OFF,
                    help=f"порог для выключенных каналов "
                         f"(по умолчанию {DAYS_OFF})")
    args = ap.parse_args()

    bad = [r for r in args.rule if r not in RULES]
    if bad:
        print(f"Неизвестное правило: {', '.join(bad)}. "
              f"Есть: {', '.join(RULES)}", file=sys.stderr)
        return 2
    rules = tuple(args.rule) if args.rule else (SAFE + ASK if args.all else SAFE)
    kw = {"days_finished": args.days, "days_off": args.days_off}

    if not args.apply:
        print(report(rules, **kw))
        print("\nНичего не удалено. Чтобы удалить: тот же вызов с --apply")
        return 0
    res = sweep(rules, apply=True, **kw)
    print(f"Освобождено {res['freed'] / GB:.2f} ГБ; "
          f"свободно {free_gb():.1f} ГБ")
    for e in res["errors"]:
        print(f"  не вышло: {e}", file=sys.stderr)
    return 1 if res["errors"] else 0


if __name__ == "__main__":
    sys.exit(main())
