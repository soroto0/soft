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


def _say(log, msg: str) -> None:
    """Печать в консоль Windows (cp1251) не должна ронять разбор.

    Названия ЧУЖИХ каналов приходят какие угодно — эмодзи, иероглифы,
    турецкие буквы; print такого текста в cp1251-консоли падает с
    UnicodeEncodeError и убивает весь прогон уже после того, как квота
    на запросы потрачена."""
    try:
        log(msg)
    except UnicodeEncodeError:
        log(msg.encode("ascii", "backslashreplace").decode("ascii"))


def _get(path: str, params: dict, api_key: str = "") -> dict:
    import requests
    p = dict(params)
    p["key"] = _key(api_key)
    try:
        r = requests.get(f"{API}/{path}", params=p, timeout=60)
    except requests.RequestException as e:
        # В тексте исключения requests печатает URL ЦЕЛИКОМ, вместе с
        # ?key=AIza… — а журналы отсюда попадают в переписку и в публичный
        # репозиторий. Наружу отдаём только имя метода и род ошибки.
        raise RuntimeError(f"YouTube API {path}: нет связи ({type(e).__name__})")
    if r.status_code != 200:
        # r.text ответа Google ключ не содержит, но обрезаем и его на всякий
        raise RuntimeError(f"YouTube API {r.status_code}: "
                           f"{r.text[:250].replace(p['key'], '***')}")
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
    sn = c.get("snippet", {})
    # Части ответа необязательны: у канала со скрытой статистикой нет
    # statistics, а без contentDetails (бывает у ответов на forHandle)
    # прежний код падал KeyError вместо внятного «нет каталога».
    uploads = ((c.get("contentDetails") or {}).get("relatedPlaylists")
               or {}).get("uploads")
    if not uploads:
        raise RuntimeError(f"У канала «{ref}» не отдан плейлист загрузок — "
                           "разобрать каталог нечем")
    return {
        "id": c.get("id", ""),
        "title": sn.get("title", ""),
        "published": sn.get("publishedAt", "")[:10],
        "subs": int(st.get("subscriberCount", 0) or 0),
        "views": int(st.get("viewCount", 0) or 0),
        "count": int(st.get("videoCount", 0) or 0),
        "uploads": uploads,
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
        # У удалённых и приватных роликов в плейлисте videoId может не быть —
        # пустая строка дальше попадёт в id=... и испортит весь запрос из 50.
        ids += [vid for vid in
                ((it.get("contentDetails") or {}).get("videoId")
                 for it in page.get("items", []))
                if vid]
        token = page.get("nextPageToken")
        # Страница без роликов, но с токеном, крутила цикл вечно: len(ids) не
        # растёт, значит условие выхода по limit никогда не сработает.
        if not token or not page.get("items"):
            break
    ids = ids[:limit]
    out = []
    for i in range(0, len(ids), 50):
        chunk = _get("videos", {"part": "snippet,statistics,contentDetails",
                                "id": ",".join(ids[i:i + 50])}, api_key)
        for v in chunk.get("items", []):
            st, sn = v.get("statistics", {}), v.get("snippet", {})
            out.append({
                "id": v.get("id", ""),
                "title": sn.get("title", ""),
                "published": sn.get("publishedAt", ""),
                "views": int(st.get("viewCount", 0) or 0),
                "likes": int(st.get("likeCount", 0) or 0),
                "comments": int(st.get("commentCount", 0) or 0),
                "seconds": _iso_seconds(
                    (v.get("contentDetails") or {}).get("duration", "")),
            })
    _say(log, f"[Разбор] Собрано роликов: {len(out)}")
    return out


def analyse(channel: dict, videos: list[dict]) -> dict:
    """Что в этом канале сработало. Меряем ОТНОСИТЕЛЬНО медианы самого
    канала: абсолютные просмотры говорят лишь о размере канала, а кратность
    медиане — о том, какие ролики алгоритм вытащил, а какие закопал.

    Свежие ролики не успели набрать просмотры, поэтому в сравнение идут
    только те, что старше 30 дней — иначе последние выпуски всегда выглядят
    провальными."""
    if not videos:
        # statistics.median([]) бросает StatisticsError — сообщение, по
        # которому непонятно, что каталог просто пуст (канал без публичных
        # роликов или квота кончилась на первой же странице).
        raise RuntimeError("Нечего разбирать: каталог канала пуст")
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
    #
    # Целочисленное деление на двух-трёх роликах давало НОЛЬ топов: при
    # len(ranked)==1 срез [:0] пуст, и разбор возвращался «нормальным»
    # словарём без единого примера — а вызывающий молча собирал ролик без
    # ниши. Хотя бы один пример есть всегда, когда есть хоть один ролик.
    n_top = min(8, max(1, len(ranked) // 2)) if ranked else 0
    n_flop = min(5, len(ranked) - n_top)
    tops = ranked[:n_top]
    flops = ranked[len(ranked) - n_flop:] if n_flop else []
    return {
        "channel": channel,
        "videos": len(videos),
        # Сколько роликов реально годилось в сравнение (зрелых, старше
        # 30 дней). По этому числу видно, ПОЧЕМУ разбор вышел пустым:
        # квоты хватило, ключ живой, просто сравнивать не с чем.
        "mature": len(ranked),
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


def find_breakouts(queries: list[str], api_key: str = "", log=print,
                   lang: str = "en", long_only: bool = True,
                   min_views: int = 5000, max_subs: int = 300_000,
                   min_ratio: float = 1.5, since: str = "2025-08-01",
                   svc=None) -> list[dict]:
    """Молодые каналы, чей ролик разошёлся ДАЛЕКО за пределы своей базы.

    ЗАЧЕМ ЭТО ОТДЕЛЬНО ОТ research(). research разбирает канал, который ему
    НАЗВАЛИ, и обычно называют большой образец. Но большому каналу прощают
    то, чего не простят новому: его ролик показывают подписчикам сразу, и
    «что у него сработало» может держаться на одной этой форе. Нужен
    канал, пробившийся БЕЗ неё. Мера — просмотры лучшего ролика, делённые
    на число подписчиков: всё выше единицы значит, что ролик ушёл к чужим.

    long_only=True — СТРОГО длиннее 20 минут, и это не украшение. Первый
    прогон без этого условия (2026-08-08) вернул 82 канала, и почти все
    жили на тридцатисекундных Shorts: Value Crafts — 2 950 подписчиков и
    18.5 млн просмотров, лучший ролик 6.6 млн. Приёмы оттуда не переносятся
    на документальный ролик ни производством, ни деньгами с рекламы, а в
    выдаче по любому запросу они забивают всё остальное.

    svc — готовый клиент googleapiclient (yt_stats). Нужен потому, что
    поиск требует ключ YOUTUBE_API_KEY, а он есть не у всех установок:
    доступ, выданный каналу владельца, делает то же самое.
    """
    def ask(path: str, params: dict) -> dict:
        if svc is not None:
            return getattr(svc, path)().list(**params).execute()
        return _get(path, params, api_key)

    hits: dict[str, list] = {}
    for q in queries:
        p = {"part": "snippet", "q": q, "type": "video",
             "order": "viewCount", "maxResults": 25,
             "publishedAfter": f"{since}T00:00:00Z",
             "relevanceLanguage": lang}
        if long_only:
            p["videoDuration"] = "long"
        try:
            found = ask("search", p)
        except Exception as e:
            _say(log, f"[Разбор] запрос «{q}» не прошёл: {str(e)[:90]}")
            continue
        ids = [x["id"]["videoId"] for x in found.get("items", [])]
        if not ids:
            continue
        det = ask("videos", {"part": "snippet,statistics",
                             "id": ",".join(ids)})
        for it in det.get("items", []):
            views = int((it.get("statistics") or {}).get("viewCount") or 0)
            if views < min_views:
                continue
            sn = it["snippet"]
            hits.setdefault(sn["channelId"], []).append(
                (views, sn["title"], sn["publishedAt"][:10]))
    out, ids = [], list(hits)
    for i in range(0, len(ids), 50):
        ch = ask("channels", {"part": "snippet,statistics",
                              "id": ",".join(ids[i:i + 50])})
        for it in ch.get("items", []):
            st, sn = it.get("statistics") or {}, it["snippet"]
            subs = int(st.get("subscriberCount") or 0)
            best = max(hits[it["id"]])
            ratio = best[0] / max(subs, 1)
            if ratio < min_ratio or subs > max_subs:
                continue
            out.append({
                "id": it["id"], "name": sn["title"],
                "born": sn.get("publishedAt", "")[:10], "subs": subs,
                "videos": int(st.get("videoCount") or 0),
                "total_views": int(st.get("viewCount") or 0),
                "ratio": ratio, "best_views": best[0], "best_title": best[1],
                "best_date": best[2],
                "url": f"https://www.youtube.com/channel/{it['id']}",
            })
    out.sort(key=lambda x: -x["ratio"])
    _say(log, f"[Разбор] прорвавшихся каналов найдено: {len(out)}")
    return out


def research(ref: str, api_key: str = "", limit: int = 200, log=print) -> dict:
    """Полный проход: найти канал -> собрать каталог -> разобрать."""
    ch = resolve_channel(ref, api_key)
    _say(log, f"[Разбор] {ch['title']}: {ch['subs']:,} подписчиков, "
              f"{ch['count']} роликов".replace(",", " "))
    vids = channel_videos(ch["uploads"], api_key, limit, log)
    if not vids:
        raise RuntimeError("не удалось собрать ролики канала")
    return analyse(ch, vids)
