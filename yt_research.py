# -*- coding: utf-8 -*-
"""Разбор ЧУЖИХ каналов по публичным данным YouTube Data API.

Что можно узнать и чего нельзя — важно понимать до того, как делать выводы:

ДОСТУПНО: список роликов канала, названия, описания, даты, длительность,
просмотры, лайки, комментарии, число подписчиков.

НЕДОСТУПНО НИКОМУ, кроме владельца: удержание, CTR обложек, время
просмотра, источники трафика. Инструменты, которые обещают эти цифры по
чужим каналам, считают их по косвенным признакам — то есть угадывают.

Главная величина здесь — во сколько раз ролик обогнал МЕДИАНУ своего же
канала. Она показывает выбор алгоритма и не зависит от размера канала, в
отличие от абсолютных просмотров.

Нужен только API-ключ (не OAuth, аудит не требуется): YOUTUBE_API_KEY.
Лимиты: 100 поисков в сутки + 10 000 обычных запросов, по 1 единице за штуку.
"""
import os
import re
import statistics
from datetime import datetime, timezone

API = "https://www.googleapis.com/youtube/v3"


def _key(api_key: str = "") -> str:
    k = (api_key or os.getenv("YOUTUBE_API_KEY", "")).strip()
    if not k:
        raise RuntimeError(
            "Нет YOUTUBE_API_KEY. Создай ключ типа «API key» в консоли Google "
            "(проект gen-lang-client-0342364734, страница Credentials) и "
            "положи в .env строкой YOUTUBE_API_KEY=...")
    if k.startswith("AQ."):
        raise RuntimeError(
            "Ключ вида AQ.… — это Vertex Express, YouTube Data API его не "
            "принимает. Нужен ключ вида AIza…")
    return k


def _get(path: str, params: dict, api_key: str = "") -> dict:
    import requests
    p = dict(params)
    p["key"] = _key(api_key)
    r = requests.get(f"{API}/{path}", params=p, timeout=60)
    if r.status_code != 200:
        raise RuntimeError(f"YouTube API {r.status_code}: {r.text[:250]}")
    return r.json()


def resolve_channel(ref: str, api_key: str = "") -> dict:
    """Канал по ссылке, @handle, названию или ID. Возвращает основные поля
    плюс id плейлиста загрузок — через него дешевле всего забрать каталог."""
    ref = (ref or "").strip()
    cid = None
    m = re.search(r"youtube\.com/channel/(UC[\w-]+)", ref)
    if m:
        cid = m.group(1)
    elif re.fullmatch(r"UC[\w-]{20,}", ref):
        cid = ref
    if cid:
        data = _get("channels", {"part": "snippet,statistics,contentDetails",
                                 "id": cid}, api_key)
    else:
        handle = re.search(r"youtube\.com/@([\w.-]+)", ref)
        handle = handle.group(1) if handle else ref.lstrip("@")
        data = _get("channels", {"part": "snippet,statistics,contentDetails",
                                 "forHandle": handle}, api_key)
        if not data.get("items"):
            # по handle не нашлось — ищем по названию (стоит 100 из 100 в сутки)
            s = _get("search", {"part": "snippet", "q": handle,
                                "type": "channel", "maxResults": 1}, api_key)
            items = s.get("items") or []
            if not items:
                raise RuntimeError(f"Канал «{ref}» не найден")
            data = _get("channels", {"part": "snippet,statistics,contentDetails",
                                     "id": items[0]["snippet"]["channelId"]},
                        api_key)
    items = data.get("items") or []
    if not items:
        raise RuntimeError(f"Канал «{ref}» не найден")
    c = items[0]
    st = c.get("statistics", {})
    return {
        "id": c["id"],
        "title": c["snippet"]["title"],
        "published": c["snippet"].get("publishedAt", "")[:10],
        "subs": int(st.get("subscriberCount", 0) or 0),
        "views": int(st.get("viewCount", 0) or 0),
        "count": int(st.get("videoCount", 0) or 0),
        "uploads": c["contentDetails"]["relatedPlaylists"]["uploads"],
    }


def _iso_seconds(dur: str) -> int:
    m = re.fullmatch(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", dur or "")
    if not m:
        return 0
    h, mi, s = (int(x) if x else 0 for x in m.groups())
    return h * 3600 + mi * 60 + s


def channel_videos(uploads_id: str, api_key: str = "", limit: int = 200,
                   log=print) -> list[dict]:
    """Каталог канала со статистикой. Идём через плейлист загрузок, а не
    через search: тот стоит отдельной квоты в 100 вызовов в сутки, а этот —
    по единице за 50 роликов."""
    ids, token = [], None
    while len(ids) < limit:
        page = _get("playlistItems",
                    {"part": "contentDetails", "playlistId": uploads_id,
                     "maxResults": 50, **({"pageToken": token} if token else {})},
                    api_key)
        ids += [i["contentDetails"]["videoId"] for i in page.get("items", [])]
        token = page.get("nextPageToken")
        if not token:
            break
    ids = ids[:limit]
    out = []
    for i in range(0, len(ids), 50):
        chunk = _get("videos", {"part": "snippet,statistics,contentDetails",
                                "id": ",".join(ids[i:i + 50])}, api_key)
        for v in chunk.get("items", []):
            st, sn = v.get("statistics", {}), v["snippet"]
            out.append({
                "id": v["id"],
                "title": sn.get("title", ""),
                "published": sn.get("publishedAt", ""),
                "views": int(st.get("viewCount", 0) or 0),
                "likes": int(st.get("likeCount", 0) or 0),
                "comments": int(st.get("commentCount", 0) or 0),
                "seconds": _iso_seconds(v["contentDetails"].get("duration", "")),
            })
    log(f"[Разбор] Собрано роликов: {len(out)}")
    return out


def analyse(channel: dict, videos: list[dict]) -> dict:
    """Что в этом канале сработало. Меряем ОТНОСИТЕЛЬНО медианы самого
    канала: абсолютные просмотры говорят лишь о размере канала, а кратность
    медиане — о том, какие ролики алгоритм вытащил, а какие закопал.

    Свежие ролики не успели набрать просмотры, поэтому в сравнение идут
    только те, что старше 30 дней — иначе последние выпуски всегда выглядят
    провальными."""
    now = datetime.now(timezone.utc)

    def age_days(v):
        try:
            return (now - datetime.fromisoformat(
                v["published"].replace("Z", "+00:00"))).days
        except Exception:
            return 999

    mature = [v for v in videos if age_days(v) >= 30] or videos
    med = statistics.median([v["views"] for v in mature]) or 1
    for v in videos:
        v["x"] = round(v["views"] / med, 2)     # во сколько раз выше медианы
        v["age"] = age_days(v)
    ranked = sorted(mature, key=lambda v: v["x"], reverse=True)

    # частота выхода — по промежуткам между последними 20 роликами
    dates = sorted((v["published"] for v in videos), reverse=True)[:20]
    gaps = []
    for a, b in zip(dates, dates[1:]):
        try:
            gaps.append((datetime.fromisoformat(a.replace("Z", "+00:00"))
                        - datetime.fromisoformat(b.replace("Z", "+00:00"))).days)
        except Exception:
            pass

    # При коротком списке (меньше 13 зрелых роликов) срезы [:8] и [-5:]
    # пересекались, и один и тот же ролик попадал разом в топ и во флоп —
    # то есть подавался как пример и удачи, и провала. Делим пополам.
    n_top = min(8, len(ranked) // 2)
    n_flop = min(5, len(ranked) - n_top)
    tops = ranked[:n_top]
    flops = ranked[len(ranked) - n_flop:] if n_flop else []
    return {
        "channel": channel,
        "videos": len(videos),
        "median_views": int(med),
        "top": tops,
        "flop": flops,
        "median_seconds": int(statistics.median(
            [v["seconds"] for v in videos if v["seconds"]] or [0])),
        "top_seconds": int(statistics.median(
            [v["seconds"] for v in tops if v["seconds"]] or [0])),
        "days_between": round(statistics.median(gaps), 1) if gaps else None,
        "engagement": round(statistics.median(
            [(v["likes"] / v["views"] * 100) for v in mature
             if v["views"] > 100] or [0]), 2),
    }


def report(a: dict) -> str:
    """Разбор словами — то, что можно прочитать и применить."""
    c = a["channel"]
    L = [f"КАНАЛ: {c['title']}",
         f"  подписчиков {c['subs']:,}".replace(",", " ")
         + f", роликов {c['count']}, с {c['published']}",
         f"  медиана просмотров: {a['median_views']:,}".replace(",", " "),
         f"  типичная длина: {a['median_seconds'] // 60} мин, "
         f"у лучших: {a['top_seconds'] // 60} мин",
         f"  выходит раз в {a['days_between']} дн." if a["days_between"] else "",
         f"  лайков к просмотрам: {a['engagement']}%",
         "",
         "ВЫСТРЕЛИЛИ (во сколько раз выше медианы канала):"]
    for v in a["top"]:
        L.append(f"  x{v['x']:<5} {v['views']:>9,}".replace(",", " ")
                 + f"  {v['seconds'] // 60:>3} мин  {v['title'][:70]}")
    L += ["", "ПРОВАЛИЛИСЬ:"]
    for v in a["flop"]:
        L.append(f"  x{v['x']:<5} {v['views']:>9,}".replace(",", " ")
                 + f"  {v['seconds'] // 60:>3} мин  {v['title'][:70]}")
    return "\n".join(x for x in L if x != "")


def research(ref: str, api_key: str = "", limit: int = 200, log=print) -> dict:
    """Полный проход: найти канал -> собрать каталог -> разобрать."""
    ch = resolve_channel(ref, api_key)
    log(f"[Разбор] {ch['title']}: {ch['subs']:,} подписчиков, "
        f"{ch['count']} роликов".replace(",", " "))
    vids = channel_videos(ch["uploads"], api_key, limit, log)
    if not vids:
        raise RuntimeError("не удалось собрать ролики канала")
    return analyse(ch, vids)
