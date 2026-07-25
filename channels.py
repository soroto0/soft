# -*- coding: utf-8 -*-
"""Профили каналов: у каждого свой язык, жанр, голос, визуальный стиль и
СВОЯ библиотека оверлеев.

Зачем отдельная сущность, а не просто папки проектов: почерк канала должен
быть стабильным ВНУТРИ канала и разным МЕЖДУ каналами. Раньше голос, темп и
цветокор выбирались от хеша пути проекта — то есть два ролика одного канала
получались разными, а это ровно наоборот тому, что нужно каналу.

Библиотеки вариантов тоже разделены: вариант, сгенерированный для канала про
сантехнику, не должен всплыть на канале про полярные экспедиции.
"""
import json
from pathlib import Path

BASE = Path(__file__).resolve().parent
CHANNELS_FILE = BASE / "channels.json"

# Поля профиля и их значения по умолчанию. Всё, чего нет в файле, берётся
# отсюда — чтобы добавление нового поля не ломало уже сохранённые каналы.
DEFAULTS = {
    "name": "Без названия",
    "folder": "",              # где лежат проекты канала; пусто — рядом с софтом
    "lang": "английский",
    "tone": "документальный",
    "minutes": 10,
    "voice": "",               # пусто — берётся из «почерка» проекта
    "rate": 0,                 # темп речи, %
    "visual_style": "кинематографичный",
    "watermark": "",           # постоянный бейдж на весь ролик
    "accent": "",              # акцентный цвет обложек, #rrggbb
    "thumb_layout": "",        # left | bottom | split; пусто — по очереди
    "thumb_ref": "",           # папка с картинками-референсами обложек
    "avoid": "",               # чего на канале быть не должно
    # Собственные указания канала для сценариста — дописываются к общему
    # промпту. Именно это делает каналы РАЗНЫМИ по содержанию, а не только
    # по голосу и цвету: у одного канал ведёт аналитик-расследователь, у
    # другого — практик с инструментом, у третьего — рассказчик от первого
    # лица. Общий промпт такой разницы дать не может.
    "script_extra": "",
    # Формула темы, выведенная из РАЗБОРА НИШИ (yt_research): что именно
    # взлетает на соседних каналах и что проваливается. По ней подбирается
    # тема очередного ролика, если пользователь не задал свою.
    "topic_formula": "",
    "used_topics": [],         # чтобы не предлагать одно и то же дважды
    "series": "",              # формат серии, напр. "Findings" -> «… | Findings #7»
    "series_next": 1,          # номер следующего выпуска
    "youtube_url": "",
    "notes": "",
}


def series_suffix(channel: dict) -> str:
    """Хвост заголовка для канала с нумерованной серией. Пусто, если серии
    нет. Нужен, потому что у такого канала заголовок вне формата сразу
    выпадает из ряда — зритель узнаёт выпуск именно по «| Findings #N»."""
    name = (channel.get("series") or "").strip()
    if not name:
        return ""
    return f" | {name} #{int(channel.get('series_next', 1))}"


def bump_series(channel_id: str) -> None:
    """Сдвинуть номер выпуска после того, как ролик собран."""
    ch = get(channel_id)
    if not ch or not (ch.get("series") or "").strip():
        return
    ch["series_next"] = int(ch.get("series_next", 1)) + 1
    upsert(ch)


def load() -> list[dict]:
    """Все профили. Пустой список — каналы ещё не заведены (это норма)."""
    try:
        data = json.loads(CHANNELS_FILE.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return []
    if not isinstance(data, list):
        return []
    out = []
    for rec in data:
        if isinstance(rec, dict) and rec.get("id"):
            out.append({**DEFAULTS, **rec})
    return out


def save(channels: list[dict]) -> None:
    CHANNELS_FILE.write_text(
        json.dumps(channels, ensure_ascii=False, indent=2), encoding="utf-8")


def get(channel_id: str) -> dict | None:
    for ch in load():
        if ch["id"] == channel_id:
            return ch
    return None


def upsert(channel: dict) -> list[dict]:
    """Добавить или обновить профиль по его id."""
    cid = str(channel.get("id", "")).strip()
    if not cid:
        raise ValueError("у канала должен быть id")
    chans = load()
    merged = {**DEFAULTS, **channel, "id": cid}
    for i, ch in enumerate(chans):
        if ch["id"] == cid:
            chans[i] = {**ch, **merged}
            break
    else:
        chans.append(merged)
    save(chans)
    return chans


def projects_dir(channel: dict) -> Path:
    """Папка, где лежат проекты этого канала. Разводим их по разным папкам,
    чтобы список проектов в интерфейсе не превращался в кашу из трёх каналов
    и чтобы случайно не отрендерить ролик одного канала в стиле другого."""
    folder = (channel.get("folder") or "").strip()
    return Path(folder) if folder else BASE / channel["id"]


def apply_to_params(channel: dict, p: dict) -> dict:
    """Наложить настройки канала на параметры запуска из интерфейса.

    Канал ЗАДАЁТ, а не предлагает: язык, жанр, голос и визуальный стиль
    берутся из профиля. Иначе достаточно один раз забыть переключить
    выпадающий список — и ролик выйдет чужим голосом на чужом языке.
    Пустые поля профиля ничего не навязывают."""
    out = dict(p)
    for key in ("lang", "tone", "visual_style"):
        if channel.get(key):
            out[key] = channel[key]
    if channel.get("voice"):
        out["voice"] = channel["voice"]
        out["rate"] = f"{int(channel.get('rate', 0)):+d}%"
        # почерк канала важнее случайного разнообразия: при заданном голосе
        # «Разнообразие» больше не имеет права его перебить
        out["randomize"] = False
    if channel.get("minutes"):
        out.setdefault("minutes", channel["minutes"])
    return out
