# -*- coding: utf-8 -*-
"""Статистика СВОИХ каналов из YouTube Analytics.

Зачем. Софт разбирает ниши по чужим каналам (yt_research) и от них берёт
темы, длину и формулы заголовков. О собственных роликах он не знает
ничего: где зрители уходят, какая обложка кликается, до какой минуты
досматривают. Вся настройка удержания идёт от общих правил жанра, а не от
поведения СВОЕЙ аудитории.

Доступ выдаётся один раз. Google отдаёт статистику канала только
владельцу, поэтому файл client_secret*.json создаёт человек (см.
analytics/КАК_ПОДКЛЮЧИТЬ_API.md), а вход выполняется им же в браузере.
Дальше рядом ложится token.json, и участие человека больше не требуется —
ни при перезапуске, ни через месяц.

Личные данные: client_secret*.json, token.json и выгрузки лежат в
analytics/ и закрыты .gitignore — репозиторий публичный.
"""
import json
import re
import time
from pathlib import Path

BASE = Path(__file__).resolve().parent
ANALYTICS = BASE / "analytics"
# По токену НА КАНАЛ: у каждого канала свой аккаунт Google, и общего
# доступа к трём каналам не существует — Google выдаёт статистику только
# владельцу, а владельцы тут разные. Поэтому вход выполняется трижды, и
# токены лежат рядом, различаясь именем канала.
def token_path(channel: str = "") -> Path:
    name = (channel or "").strip() or "default"
    safe = "".join(c if c.isalnum() or c in "-_" else "_" for c in name)
    return ANALYTICS / f"token_{safe}.json"


TOKEN = ANALYTICS / "token.json"     # старое имя, для совместимости

SCOPES = [
    "https://www.googleapis.com/auth/yt-analytics.readonly",
    "https://www.googleapis.com/auth/youtube.readonly",
]

# Сколько держать выгрузку, прежде чем спрашивать заново. Сутки: цифры за
# час шумные и уводят в ложные выводы, а квота обращений конечна.
CACHE_S = 24 * 3600


def _secret_file() -> Path | None:
    """Файл ключа, скачанный из Google Cloud. Имя не фиксировано: консоль
    выдаёт его как client_secret_<длинный-id>.apps.googleusercontent.com.json,
    и переименовывать его человеку незачем."""
    if not ANALYTICS.is_dir():
        return None
    got = sorted(ANALYTICS.glob("client_secret*.json"))
    return got[0] if got else None


def ready() -> tuple[bool, str]:
    """Можно ли идти за статистикой. -> (да/нет, что мешает)."""
    try:
        import google.oauth2.credentials  # noqa: F401
        import google_auth_oauthlib  # noqa: F401
        import googleapiclient  # noqa: F401
    except ImportError:
        return False, ("не установлены библиотеки Google: "
                       "pip install google-api-python-client "
                       "google-auth-oauthlib")
    if any(ANALYTICS.glob('token*.json')):
        return True, ""
    if _secret_file() is None:
        return False, ("нет ключа доступа: положи client_secret*.json в "
                       f"{ANALYTICS} (как получить — "
                       "analytics/КАК_ПОДКЛЮЧИТЬ_API.md)")
    return True, "ключ есть, но вход ещё не выполнен — потребуется браузер"


def _creds(log=print, channel: str = ""):
    """Учётные данные: из token.json, а если его нет — разовый вход.

    Вход выполняет ЧЕЛОВЕК в своём браузере: run_local_server поднимает
    страницу на localhost, туда возвращается ответ Google. Пароль в этот
    код не попадает и нигде не хранится — только выданный токен.
    """
    from google.oauth2.credentials import Credentials
    from google.auth.transport.requests import Request
    from google_auth_oauthlib.flow import InstalledAppFlow

    tok = token_path(channel)
    creds = None
    if not tok.exists() and channel and TOKEN.exists():
        tok = TOKEN          # первый вход был сделан до разделения по каналам
    if tok.exists():
        creds = Credentials.from_authorized_user_file(str(tok), SCOPES)
    if creds and creds.expired and creds.refresh_token:
        # Обычный случай: токен живёт час, обновляется молча и без человека.
        creds.refresh(Request())
        tok.write_text(creds.to_json(), encoding="utf-8")
        return creds
    if creds and creds.valid:
        return creds
    secret = _secret_file()
    if secret is None:
        raise RuntimeError(
            f"Нет client_secret*.json в {ANALYTICS}. См. "
            "analytics/КАК_ПОДКЛЮЧИТЬ_API.md")
    log("[Статистика] Открываю браузер для входа — выбери аккаунт, на "
        "котором заведены каналы, и нажми «Разрешить». Это один раз.")
    flow = InstalledAppFlow.from_client_secrets_file(str(secret), SCOPES)
    creds = flow.run_local_server(port=0)
    ANALYTICS.mkdir(parents=True, exist_ok=True)
    token_path(channel).write_text(creds.to_json(), encoding="utf-8")
    log("[Статистика] Доступ выдан, сохранён. Больше входить не нужно.")
    return creds


def _svc(creds, name: str, ver: str):
    from googleapiclient.discovery import build
    return build(name, ver, credentials=creds, cache_discovery=False)


def _iso_secs(txt: str) -> int:
    """«PT13M45S» -> 825. Ноль, если формат незнакомый.

    YouTube отдаёт длительность только строкой ISO 8601 и только через
    videos().list — в playlistItems её нет. Без неё вся статистика
    удержания остаётся в долях ролика, а доля неприменима: «уходят на 2%»
    не говорит ничего, «уходят на 15-й секунде» говорит всё.
    """
    m = re.fullmatch(r"P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?",
                     (txt or "").strip())
    if not m:
        return 0
    d, h, mi, s = (int(x or 0) for x in m.groups())
    return ((d * 24 + h) * 60 + mi) * 60 + s


def my_videos(limit: int = 50, log=print, channel: str = "") -> list[dict]:
    """Свои ролики: id, название, дата, длительность в секундах.

    Длительность заявлялась в этом описании с самого начала, но не
    возвращалась НИ РАЗУ: playlistItems её не отдаёт, а второго запроса
    здесь не было. Из-за этого weak_spots честно писал «длительность знает
    вызывающий» — а вызывающий её тоже не знал, и разбор удержания
    застревал в долях. Второй запрос стоит один вызов на 50 роликов.
    """
    creds = _creds(log, channel)
    yt = _svc(creds, "youtube", "v3")
    me = yt.channels().list(part="contentDetails,snippet",
                            mine=True).execute()
    items = me.get("items") or []
    if not items:
        raise RuntimeError(
            "У этого аккаунта нет каналов. Проверь, что вошёл тем, на "
            "котором они заведены, — это самая частая ошибка здесь.")
    ch = items[0]
    uploads = ch["contentDetails"]["relatedPlaylists"]["uploads"]
    log(f"[Статистика] Канал «{ch['snippet']['title']}»")
    out, token = [], None
    while len(out) < limit:
        r = yt.playlistItems().list(
            part="snippet,contentDetails", playlistId=uploads,
            maxResults=min(50, limit - len(out)), pageToken=token).execute()
        for it in r.get("items") or []:
            out.append({
                "id": it["contentDetails"]["videoId"],
                "title": it["snippet"]["title"],
                "published": it["contentDetails"].get("videoPublishedAt", ""),
            })
        token = r.get("nextPageToken")
        if not token:
            break
    # Длительность — вторым запросом, пачками по 50 (столько принимает
    # videos().list за раз). Неудача здесь не должна ронять весь разбор:
    # без длительности останутся доли, что хуже, но не смертельно.
    for i in range(0, len(out), 50):
        chunk = out[i:i + 50]
        try:
            det = yt.videos().list(part="contentDetails",
                                   id=",".join(v["id"] for v in chunk)).execute()
            secs = {it["id"]: _iso_secs(it["contentDetails"].get("duration", ""))
                    for it in det.get("items") or []}
        except Exception as e:
            log(f"[Статистика] Длительности не пришли ({e}) — разбор "
                "удержания останется в долях ролика, а не в секундах")
            secs = {}
        for v in chunk:
            v["duration"] = secs.get(v["id"], 0)
    return out


def retention(video_id: str, log=print, channel: str = "") -> list[tuple[float, float]]:
    """Кривая удержания: [(доля ролика 0..1, доля оставшихся зрителей)].

    Это главная цифра. Она показывает СЕКУНДЫ, на которых уходят, — а
    значит, куда ставить перецепы в сценарии и где сгущать графику. Всё
    остальное (длина, темп, плотность плашек) сейчас берётся из общих
    правил жанра, то есть вслепую.
    """
    creds = _creds(log, channel)
    ya = _svc(creds, "youtubeAnalytics", "v2")
    r = ya.reports().query(
        ids="channel==MINE", startDate="2005-01-01",
        endDate=time.strftime("%Y-%m-%d"),
        metrics="audienceWatchRatio",
        dimensions="elapsedVideoTimeRatio",
        filters=f"video=={video_id}", sort="elapsedVideoTimeRatio",
    ).execute()
    return [(float(row[0]), float(row[1])) for row in (r.get("rows") or [])]


def overview(log=print, channel: str = "") -> list[dict]:
    """По каждому ролику: просмотры, CTR обложки, средний просмотр, подписки."""
    creds = _creds(log, channel)
    ya = _svc(creds, "youtubeAnalytics", "v2")
    r = ya.reports().query(
        ids="channel==MINE", startDate="2005-01-01",
        endDate=time.strftime("%Y-%m-%d"),
        metrics=("views,estimatedMinutesWatched,averageViewDuration,"
                 "averageViewPercentage,subscribersGained"),
        dimensions="video", sort="-views", maxResults=200,
    ).execute()
    cols = [h["name"] for h in r.get("columnHeaders") or []]
    return [dict(zip(cols, row)) for row in (r.get("rows") or [])]


def drop_profile(log=print, channel: str = "", min_views: int = 10) -> dict:
    """Где канал ТЕРЯЕТ зрителя — сведённое по всем роликам, в секундах.

    ЗАЧЕМ ОТДЕЛЬНАЯ ФУНКЦИЯ, А НЕ ПРОСТО overview. Средний досмотр —
    одно число на ролик, и по нему нельзя понять, что чинить: 10% могут
    означать «ушли на пятнадцатой секунде» и «досмотрели треть и устали»,
    а это противоположные починки. Кривая различает их однозначно.

    Замер на этих каналах 2026-08-07 (три ролика, у которых хватило
    просмотров на кривую): обвал у ВСЕХ трёх пришёлся на 1-2% ролика —
    минус 28.3%, минус 31.2% и минус 25% зрителей разом. При 13 минутах
    это секунды 8-16. К 5% ролика оставалась половина. Середина и конец
    теряли вяло. То есть чинить надо холодное открытие, а не темп,
    плотность плашек или длину — на них уходит меньшая часть аудитории.

    Ролики с единичными просмотрами YouTube кривой не даёт вовсе, поэтому
    min_views: включать их — значит считать шум.

    Отдаёт {} , если данных не хватило. Пустой ответ здесь ЛУЧШЕ
    выдуманного: сценарист получит указание, построенное на трёх
    зрителях, и оно будет вреднее его отсутствия.
    """
    try:
        rows = [r for r in overview(log, channel)
                if (r.get("views") or 0) >= min_views]
    except Exception as e:
        log(f"[Статистика] Разбор удержания не вышел: {e}")
        return {}
    if not rows:
        return {}
    meta = {v["id"]: v for v in my_videos(50, lambda *a: None, channel)}
    worst, curves = [], 0
    for r in rows:
        vid = r.get("video", "")
        try:
            curve = sorted(retention(vid, lambda *a: None, channel))
        except Exception:
            continue
        if len(curve) < 4:
            continue
        curves += 1
        dur = (meta.get(vid) or {}).get("duration") or 0
        # Самый крутой обвал и момент, когда осталась половина.
        big = max(((curve[i][1] - curve[i + 1][1], curve[i][0])
                   for i in range(len(curve) - 1)), default=(0.0, 0.0))
        half = next((p for p, v in curve if v <= 0.5), None)
        worst.append({
            "video": vid,
            "title": (meta.get(vid) or {}).get("title", "?"),
            "views": r.get("views", 0),
            "watched_pct": r.get("averageViewPercentage", 0),
            "duration": dur,
            "drop_frac": big[1],
            "drop_size": big[0],
            "drop_sec": round(big[1] * dur) if dur else None,
            "half_sec": round(half * dur) if (half is not None and dur) else None,
        })
    if not worst:
        return {}
    with_sec = [w["drop_sec"] for w in worst if w["drop_sec"] is not None]
    halves = [w["half_sec"] for w in worst if w["half_sec"] is not None]
    return {
        "videos": curves,
        "drop_sec": round(sum(with_sec) / len(with_sec)) if with_sec else None,
        "drop_size": round(sum(w["drop_size"] for w in worst) / len(worst) * 100),
        "half_sec": round(sum(halves) / len(halves)) if halves else None,
        "per_video": sorted(worst, key=lambda w: -w["views"]),
    }


def weak_spots(video_id: str, log=print, channel: str = "") -> list[dict]:
    """Где именно теряются зрители — участки самого крутого падения.

    Отдаёт доли ролика, а не секунды: длительность знает вызывающий, и
    перевести долю в секунды он может точнее, чем этот модуль.
    """
    curve = retention(video_id, log, channel)
    if len(curve) < 4:
        return []
    drops = []
    for i in range(1, len(curve)):
        pos, val = curve[i]
        prev = curve[i - 1][1]
        if prev > 0:
            drops.append({"at": pos, "left": val, "drop": prev - val})
    drops.sort(key=lambda d: -d["drop"])
    return drops[:8]
