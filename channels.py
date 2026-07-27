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
    # Доля кадров, СОЗДАВАЕМЫХ ИИ, а не найденных в стоках. Было общее 0.35 —
    # и проверка зрением честно браковала 57-63% планов: стоковая библиотека
    # просто не имеет кадра под многие фразы, поиск отдаёт случайно совпавшее
    # по слову. Сгенерированный кадр соответствует тексту по построению.
    # Цена — время и лимиты Veo, поэтому величина на канал, а не общая.
    "ai_ratio": 0.35,
    # Субтитры — тоже часть почерка канала, а не общая настройка:
    #   sub_style — bold_box | pill | karaoke | yellow_pop | cyan_pop |
    #               red_alert | thin_clean | top
    #   sub_size  — мелкие | средние | крупные | огромные
    #   sub_width — символов в строке (узкая строка читается быстрее, но
    #               чаще перескакивает; 42 — обычный компромисс)
    #   sub_font  — гарнитура из установленных в системе. Раньше все каналы
    #               делили один Segoe UI Black, и субтитры — самый заметный
    #               на экране элемент — у трёх разных каналов выглядели
    #               одинаково. Имя должно точно совпадать с системным,
    #               иначе libass молча подставит свой запасной шрифт.
    "sub_style": "",
    "sub_size": "",
    "sub_width": 0,
    "sub_font": "",
    "subs_on": True,           # вжигать ли субтитры в кадр
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
    """Добавить или обновить профиль по его id. Частичное обновление (как
    из формы UI — присылает не все ~26 полей) мёрджится ПОВЕРХ уже
    сохранённой записи, а не поверх DEFAULTS — иначе любое поле, которое
    форма не прислала (topic_formula, used_topics, script_extra и т.д.),
    тихо откатывалось на дефолт при каждом редактировании канала."""
    cid = str(channel.get("id", "")).strip()
    if not cid:
        raise ValueError("у канала должен быть id")
    chans = load()
    for i, ch in enumerate(chans):
        if ch["id"] == cid:
            chans[i] = {**ch, **channel, "id": cid}
            break
    else:
        chans.append({**DEFAULTS, **channel, "id": cid})
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
    for key in ("lang", "tone", "visual_style", "sub_style", "sub_size",
                "sub_font"):
        if channel.get(key):
            out[key] = channel[key]
    if channel.get("ai_ratio"):
        out["ai_ratio"] = float(channel["ai_ratio"])
    out["subs"] = bool(channel.get("subs_on", True))
    if channel.get("sub_width"):
        out["sub_width"] = int(channel["sub_width"])
    if channel.get("voice"):
        out["voice"] = channel["voice"]
        out["rate"] = f"{int(channel.get('rate', 0)):+d}%"
        # почерк канала важнее случайного разнообразия: при заданном голосе
        # «Разнообразие» больше не имеет права его перебить
        out["randomize"] = False
    if channel.get("minutes"):
        out.setdefault("minutes", channel["minutes"])
    return out
