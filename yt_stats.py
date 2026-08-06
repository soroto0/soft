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


def my_videos(limit: int = 50, log=print, channel: str = "") -> list[dict]:
    """Свои ролики: id, название, дата, длительность."""
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
