# -*- coding: utf-8 -*-
"""Накопленная статистика каналов: сбор, хранение, отчёт.

ЗАЧЕМ ОТДЕЛЬНЫЙ МОДУЛЬ, КОГДА ЕСТЬ yt_stats И yt_research.
Те два умеют СПРОСИТЬ. Они не умеют ПОМНИТЬ. Каждый запуск ролика заново
дёргал YouTube Analytics (webapp._own_brief и _retention_brief — по три
запроса плюс по одному на кривую каждого ролика), получал мгновенный
снимок и выбрасывал его. Отсюда две беды сразу:

1. Нельзя сравнить «до» и «после». Сменили формулу темы — а выросло ли
   что-нибудь, сказать нечем: прошлых цифр не сохранилось нигде. Именно
   этот вопрос владелец и задаёт, и до сих пор ответа на него не было.
2. Квота тратится впустую. Замер по журналу (app.log, 7-9 августа):
   разбор ниши звался 15 раз за трое суток, своя статистика — 6 раз, и
   каждый раз это были ТЕ ЖЕ цифры. Кэш ниши на сутки в webapp есть, у
   своей статистики кэша нет вовсе.

ЧТО ЗДЕСЬ ЛЕЖИТ. Снимок в сутки на канал в analytics/history.json:
каталог роликов с метриками, источники трафика, поисковые запросы,
доля подписчиков, сводка кривой удержания и медиана эталонного канала
из ниши. Снимки копятся, поэтому рост считается вычитанием, а не верой.

ЧЕГО ЗДЕСЬ НЕТ И НЕ БУДЕТ. CTR обложки и показов. Это не недосмотр:
YouTube Analytics API v2 метрик impressions и impressionClickThroughRate
НЕ ЗНАЕТ ВООБЩЕ — проверено живым запросом 2026-08-09, ответ «Unknown
identifier (impressions) given in field parameters.metrics». Права
доступа тут ни при чём, добавить их нельзя. CTR живёт только в Studio,
руками. См. ОГРАНИЧЕНИЯ ниже.

ПОЧЕМУ СЫРЬЁ ХРАНИТСЯ ЦЕЛИКОМ, А ОТСЕКАЕТСЯ ПРИ ЧТЕНИИ. stats_from
(дата, с которой статистика канала считается своей) — величина, которую
владелец меняет: сменил нишу, сдвинул дату. Отсекай мы старые ролики при
ЗАПИСИ, история до смены ниши исчезла бы навсегда, и сравнить «как было
в прежней нише» стало бы не с чем. Поэтому в файл идёт всё, а фильтр
живёт в чтении — см. _fresh().

ОГРАНИЧЕНИЯ — что проверено живым запросом 2026-08-09 и чего добиться
нельзя ни настройкой, ни правкой кода:

  CTR обложки, показы (impressions). НЕДОСТУПНО СОВСЕМ. Ответ API:
  «Unknown identifier (impressions) given in field parameters.metrics».
  Таких метрик в Analytics API v2 нет; они существуют только в веб-
  интерфейсе Studio. Никакой объём прав это не открывает.

  Тексты комментариев. Требуют права youtube.force-ssl, а нынешние
  токены выданы на yt-analytics.readonly + youtube.readonly. Запрос
  commentThreads к своему же ролику отвечает 403 «insufficient
  authentication scopes». Расширение прав — действие ВЛАДЕЛЬЦА (заново
  дать доступ в браузере), само по себе не появится. ЧИСЛО
  комментариев при этом доступно и собирается.

  Публичные данные о своих роликах по ключу YOUTUBE_API_KEY. Пока
  ролики лежат приватными, публичный API отвечает на них 404 — свои
  цифры идут только через OAuth. Это не поломка, а следствие
  приватности.
"""
import json
import os
import statistics
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

BASE = Path(__file__).resolve().parent
ANALYTICS = BASE / "analytics"
STORE = ANALYTICS / "history.json"

# Сколько просмотров должно быть у ролика, чтобы его цифры вообще что-то
# значили. Досмотр ролика с одним зрителем — это поведение ОДНОГО
# человека; поставленное рядом с роликом на два десятка зрителей как
# «лучший против худшего», оно учит сценариста случайности. Порог тот же,
# что в webapp._own_brief, и это НЕ совпадение: разъедься они, отчёт
# владельцу говорил бы одно, а сценарист получал другое.
MIN_VIEWS = 10

# Снимок в сутки. За час цифры YouTube шевелятся на единицы и шумят, а
# квота обращений конечна.
DAY = 86400

# Сколько ежедневных снимков держать целиком. Дальше — по одному на
# месяц: на диске мало места (замер 2026-08-09: занято 87%), а для
# ответа «растём ли» помесячных точек за прошлый год достаточно.
KEEP_DAILY = 90

# Потолок на разбор кривых удержания за один сбор. Кривая стоит
# отдельного запроса НА КАЖДЫЙ ролик, и на канале с сотней роликов сбор
# в одиночку съел бы дневную квоту.
MAX_CURVES = 25

# Сколько своих роликов с цифрами нужно, чтобы ВПИСАТЬ вывод в профиль
# канала. Порог выше, чем у строки в отчёте, и это осознанно: отчёт
# читают и забывают, а topic_formula живёт в channels.json и влияет на
# КАЖДЫЙ следующий ролик, пока её не перепишут. Замер 2026-08-09: у
# home-vault ровно два ролика перевалили за MIN_VIEWS — с 16 и 25
# просмотрами. Разница их досмотров (25% против 11%) вполне может быть
# поведением полутора десятков человек, и закреплять её как правило
# канала рано. В отчёт — да, в формулу — нет.
MIN_FORMULA_VIDEOS = 4


def _today() -> str:
    return time.strftime("%Y-%m-%d")


def has_token(channel_id: str) -> bool:
    """Есть ли УЖЕ выданный доступ именно к этому каналу.

    ПРОВЕРКА ОБЯЗАТЕЛЬНА ПЕРЕД ЛЮБЫМ ОБРАЩЕНИЕМ. yt_stats._creds устроен
    для работы за человеком: не найдя токен, он поднимает локальный
    сервер и ЖДЁТ, пока в браузере выберут аккаунт. Для сбора по
    расписанию это тупик — первый же прогон встал намертво (проверено
    2026-08-09: collect_all дошёл до канала без токена и висел, пока его
    не сняли руками), а ночной автопилот получил бы вместо цифр
    зависшую задачу.

    Разница между «нет доступа» и «доступ есть, но API не ответил» —
    разная починка: первое требует человека с браузером, второе пройдёт
    само. Поэтому это отдельная проверка, а не ветка в обработке ошибок.

    yt_stats.ready() здесь не годится: он отвечает «да», если токен есть
    ХОТЯ БЫ У ОДНОГО канала, а токены тут раздельные — у каждого канала
    свой владелец и свой аккаунт Google.
    """
    import yt_stats
    if yt_stats.token_path(channel_id).exists():
        return True
    # Первый вход в проекте делался до разделения токенов по каналам.
    return (ANALYTICS / "token.json").exists()


def _say(log, msg: str) -> None:
    """Печать не должна ронять сбор.

    Названия роликов приходят с эмодзи и типографскими кавычками, а
    консоль Windows живёт в cp1251: print такого текста падает
    UnicodeEncodeError — уже ПОСЛЕ того, как квота на запросы потрачена.
    """
    try:
        log(msg)
    except UnicodeEncodeError:
        log(msg.encode("ascii", "backslashreplace").decode("ascii"))


# ---------------------------------------------------------------- хранилище

def _blank() -> dict:
    return {"version": 1, "channels": {}}


def load() -> dict:
    """Всё накопленное. Битый файл НЕ обнуляем молча.

    Пустой словарь и испорченный файл — разные вещи, и раньше в проекте
    это уже стоило дорого (см. channels._read). Здесь цена та же: вернуть
    пустоту на битом файле значит, что следующий сбор запишет поверх один
    сегодняшний снимок, а вся история сравнений исчезнет. Поэтому битый
    файл отодвигается в сторону с меткой времени, а не затирается.
    """
    if not STORE.exists():
        return _blank()
    try:
        data = json.loads(STORE.read_text(encoding="utf-8"))
    except Exception as e:
        spoiled = STORE.with_name(f"history.broken-{int(time.time())}.json")
        try:
            STORE.replace(spoiled)
        except Exception:
            pass
        raise RuntimeError(
            f"history.json не читается ({e}). Файл отложен как "
            f"{spoiled.name}, сбор начнёт новый — но прошлые сравнения "
            "останутся только в отложенном файле")
    if not isinstance(data, dict) or "channels" not in data:
        return _blank()
    return data


def save(data: dict) -> None:
    """Запись через временный файл: падение посередине не должно оставить
    обрезанный history.json, то есть всю историю разом."""
    ANALYTICS.mkdir(parents=True, exist_ok=True)
    tmp = STORE.with_name(STORE.name + ".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=1),
                   encoding="utf-8")
    os.replace(tmp, STORE)


def _prune(snaps: list[dict]) -> list[dict]:
    """Проредить старьё, сохранив форму роста.

    Свежие 90 суток — как есть, дальше по первому снимку месяца. Выкинуть
    старое целиком нельзя: вопрос «растём ли» без прошлогодней точки
    не имеет ответа. Держать всё тоже нельзя — место на диске.
    """
    if len(snaps) <= KEEP_DAILY:
        return snaps
    edge = (datetime.now(timezone.utc) - timedelta(days=KEEP_DAILY)).strftime("%Y-%m-%d")
    fresh = [s for s in snaps if s.get("date", "") >= edge]
    old, seen = [], set()
    for s in sorted((s for s in snaps if s.get("date", "") < edge),
                    key=lambda s: s.get("date", "")):
        month = s.get("date", "")[:7]
        if month not in seen:
            seen.add(month)
            old.append(s)
    return old + sorted(fresh, key=lambda s: s.get("date", ""))


def snapshots(channel_id: str, data: dict | None = None) -> list[dict]:
    d = data if data is not None else load()
    return (d.get("channels", {}).get(channel_id, {}) or {}).get("snapshots", [])


def latest(channel_id: str, data: dict | None = None) -> dict:
    """Последний снимок ЛЮБОГО исхода — включая неудачный."""
    s = snapshots(channel_id, data)
    return s[-1] if s else {}


def latest_ok(channel_id: str, data: dict | None = None) -> dict:
    """Последний УДАВШИЙСЯ снимок.

    Главная точка входа для всех, кто хочет цифры. Смысл в том, что при
    недоступном API вызывающий получает вчерашние настоящие данные, а не
    пустоту и не нули. Пустота здесь означала бы ровно то, чего просили
    не допускать: ролик молча снимается без учёта статистики, и никто не
    замечает, что она отвалилась неделю назад. Возраст снимка виден в
    поле date, и отчёт про него говорит вслух.
    """
    for s in reversed(snapshots(channel_id, data)):
        if s.get("ok"):
            return s
    return {}


# ------------------------------------------------------------------- сбор

def _channel_facts(yt) -> dict:
    me = yt.channels().list(part="contentDetails,snippet,statistics",
                            mine=True).execute()
    items = me.get("items") or []
    if not items:
        raise RuntimeError(
            "У этого аккаунта нет каналов — вход выполнен не тем аккаунтом, "
            "на котором заведён канал. Это самая частая ошибка здесь")
    c = items[0]
    st = c.get("statistics") or {}
    return {
        "id": c.get("id", ""),
        "title": (c.get("snippet") or {}).get("title", ""),
        "subs": int(st.get("subscriberCount", 0) or 0),
        "views": int(st.get("viewCount", 0) or 0),
        "videos": int(st.get("videoCount", 0) or 0),
        "uploads": ((c.get("contentDetails") or {}).get("relatedPlaylists")
                    or {}).get("uploads", ""),
    }


def _catalog(yt, uploads: str, limit: int = 200) -> dict:
    """Свои ролики: id -> название, дата, длительность, приватность.

    Длительность нужна, чтобы кривая удержания читалась в СЕКУНДАХ.
    Доля ролика не говорит ничего: «уходят на 2%» одинаково верно для
    13-минутного и для минутного, а чинить надо разное.

    Приватность здесь не для красоты. Приватный ролик не видит ни поиск,
    ни рекомендации, ни публичный API — он не наберёт ничего ни при какой
    формуле темы, и объяснять его цифры выбором темы бессмысленно.
    Замер 2026-08-09: у abyss приватными лежат ровно два ролика ПРЕЖНЕЙ
    ниши (те самые, что отсекает stats_from), нынешние шесть — public.
    Поэтому отчёт говорит об этом отдельной строкой и только когда есть
    о чём: постоянное предупреждение перестают читать.
    """
    ids, token = [], None
    while len(ids) < limit:
        r = yt.playlistItems().list(
            part="contentDetails", playlistId=uploads, maxResults=50,
            **({"pageToken": token} if token else {})).execute()
        ids += [v for v in ((it.get("contentDetails") or {}).get("videoId")
                            for it in r.get("items") or []) if v]
        token = r.get("nextPageToken")
        # Страница без роликов, но с токеном крутила бы цикл вечно.
        if not token or not r.get("items"):
            break
    out = {}
    for i in range(0, len(ids[:limit]), 50):
        det = yt.videos().list(part="snippet,contentDetails,status,statistics",
                               id=",".join(ids[i:i + 50])).execute()
        for it in det.get("items") or []:
            sn, st = it.get("snippet") or {}, it.get("statistics") or {}
            out[it["id"]] = {
                "title": sn.get("title", ""),
                "published": (sn.get("publishedAt") or "")[:10],
                "duration": _iso_secs(
                    (it.get("contentDetails") or {}).get("duration", "")),
                "privacy": (it.get("status") or {}).get("privacyStatus", ""),
                "likes": int(st.get("likeCount", 0) or 0),
                "comments": int(st.get("commentCount", 0) or 0),
            }
    return out


def _iso_secs(txt: str) -> int:
    """«PT13M45S» -> 825."""
    import re
    m = re.fullmatch(r"P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?",
                     (txt or "").strip())
    if not m:
        return 0
    d, h, mi, s = (int(x or 0) for x in m.groups())
    return ((d * 24 + h) * 60 + mi) * 60 + s


def _rows(ya, **kw) -> list[dict]:
    """Отчёт Analytics в список словарей. Пустой список — законный ответ
    (канал без просмотров), поэтому наверх он идёт как есть."""
    r = ya.reports().query(ids="channel==MINE", startDate="2005-01-01",
                           endDate=_today(), **kw).execute()
    cols = [h["name"] for h in r.get("columnHeaders") or []]
    return [dict(zip(cols, row)) for row in (r.get("rows") or [])]


def _side(ya, missing: list, what: str, **kw) -> list[dict] | None:
    """Второстепенный разрез — источники трафика, устройства, запросы.

    ЗАЧЕМ ОТДЕЛЬНО ОТ _rows. Живой случай 2026-08-09: запрос разреза
    subscribedStatus по каналу home-vault вернул HTTP 500 «An internal
    error has occurred» — обычная временная осечка Google. Но снимок
    собирался одним куском, и эта осечка отменила ВЕСЬ сбор: каталог
    роликов, просмотры и досмотры уже были получены и были выброшены.
    В отчёте канал выглядел как «цифр нет вовсе».

    Поэтому здесь возвращается None, а не пустой словарь. None означает
    «не спросили или не ответили», пустой — «спросили, там пусто». Для
    отчёта это противоположные вещи: первое молчит, второе говорит «ноль
    просмотров». Ровно та подмена нулями, которой быть не должно.
    """
    try:
        return _rows(ya, **kw)
    except Exception as e:
        missing.append(f"{what}: {str(e)[:80]}")
        return None


def _tally(rows: list[dict] | None, key: str) -> dict | None:
    if rows is None:
        return None
    return {r.get(key, "?"): int(r.get("views") or 0) for r in rows}


def _curve_summary(ya, video_id: str, duration: int) -> dict:
    """Сводка кривой удержания вместо самой кривой.

    Кривая — это сотня точек на ролик; хранить её посуточно значит
    вырастить файл на порядок ради данных, которыми никто не пользуется.
    Решения принимаются по трём числам: где самый крутой обвал, сколько
    зрителей он уносит и когда осталась половина.
    """
    r = ya.reports().query(
        ids="channel==MINE", startDate="2005-01-01", endDate=_today(),
        metrics="audienceWatchRatio", dimensions="elapsedVideoTimeRatio",
        filters=f"video=={video_id}", sort="elapsedVideoTimeRatio").execute()
    curve = sorted((float(x[0]), float(x[1])) for x in (r.get("rows") or []))
    if len(curve) < 4:
        return {}
    big = max(((curve[i][1] - curve[i + 1][1], curve[i][0])
               for i in range(len(curve) - 1)), default=(0.0, 0.0))
    half = next((p for p, v in curve if v <= 0.5), None)
    return {
        "drop_frac": round(big[1], 4),
        "drop_size": round(big[0], 4),
        "drop_sec": round(big[1] * duration) if duration else None,
        "half_sec": round(half * duration) if (half is not None and duration) else None,
    }


def _niche(channel: dict, log) -> dict:
    """Медиана эталонного канала ниши — из кэша, если он свежий.

    Своей квотой не сорим: webapp уже кладёт разбор в .niche_cache на
    сутки, и второй такой же запрос ничего нового не покажет. Сюда
    переносим только сводку — топы и провалы целиком уже лежат в кэше,
    дублировать их в истории незачем.
    """
    ref = (channel.get("reference") or "").strip()
    if not ref:
        return {}
    cache = BASE / ".niche_cache" / f"{channel['id']}.json"
    data = None
    if cache.exists() and time.time() - cache.stat().st_mtime < DAY:
        try:
            data = json.loads(cache.read_text(encoding="utf-8"))
        except Exception:
            data = None
    if data is None:
        try:
            import yt_research
            data = yt_research.research(ref, log=lambda *_: None)
            cache.parent.mkdir(parents=True, exist_ok=True)
            cache.write_text(json.dumps(data, ensure_ascii=False),
                             encoding="utf-8")
        except Exception as e:
            _say(log, f"[История] Ниша {ref} не обновилась: {str(e)[:90]}")
            return {}
    return {
        "ref": ref,
        "title": (data.get("channel") or {}).get("title", ""),
        "subs": (data.get("channel") or {}).get("subs", 0),
        "median_views": data.get("median_views", 0),
        "median_seconds": data.get("median_seconds", 0),
        "top_seconds": data.get("top_seconds", 0),
        "days_between": data.get("days_between"),
    }


def collect(channel: dict, log=print, force: bool = False) -> dict:
    """Снять сегодняшний срез канала и положить в историю.

    force — переснять, даже если сегодняшний снимок уже есть. Обычный
    прогон этого не делает: два снимка за сутки различаются шумом, а
    квота тратится настоящая.

    ПРИ СБОЕ ПИШЕТСЯ СНИМОК С ok=false И ПРИЧИНОЙ. Не ноль, не пропуск.
    Ноль здесь — прямая ложь: «просмотров ноль» и «спросить не вышло»
    для отчёта о росте противоположны по смыслу, а выглядели бы
    одинаково. Пропуск тоже плох: молчаливая дыра в истории читается как
    «в этот день не собирали», хотя собирали и не смогли.
    """
    cid = channel.get("id") or ""
    data = load()
    ch_box = data.setdefault("channels", {}).setdefault(cid, {})
    snaps = ch_box.setdefault("snapshots", [])
    if not force:
        today = [s for s in snaps if s.get("date") == _today() and s.get("ok")]
        if today:
            _say(log, f"[История] {cid}: снимок за сегодня уже есть")
            return today[-1]

    snap = {"date": _today(), "at": datetime.now(timezone.utc).isoformat(timespec="seconds")}
    try:
        import yt_stats
        ok, why = yt_stats.ready()
        if not ok:
            raise RuntimeError(why)
        if not has_token(cid):
            # Ровно та ветка, где НЕЛЬЗЯ звать _creds: он бы полез
            # открывать браузер и ждать человека. Сбор обязан
            # закончиться сам и сказать, чего ему не хватает.
            raise RuntimeError(
                f"нет доступа к каналу «{cid}»: владелец должен один раз "
                "войти в его аккаунт Google (кнопка статистики в "
                "интерфейсе). Сбор сам этого не делает и не должен")
        creds = yt_stats._creds(lambda *a: None, cid)
        yt = yt_stats._svc(creds, "youtube", "v3")
        ya = yt_stats._svc(creds, "youtubeAnalytics", "v2")

        facts = _channel_facts(yt)
        cat = _catalog(yt, facts["uploads"]) if facts.get("uploads") else {}
        facts.pop("uploads", None)

        per = _rows(ya, metrics=("views,estimatedMinutesWatched,"
                                 "averageViewDuration,averageViewPercentage,"
                                 "subscribersGained,likes,shares"),
                    dimensions="video", sort="-views", maxResults=200)
        vids = []
        for r in per:
            vid = r.get("video", "")
            meta = cat.get(vid, {})
            vids.append({
                "id": vid,
                "title": meta.get("title", ""),
                "published": meta.get("published", ""),
                "duration": meta.get("duration", 0),
                "privacy": meta.get("privacy", ""),
                "views": int(r.get("views") or 0),
                "watched_pct": round(float(r.get("averageViewPercentage") or 0), 2),
                "avg_sec": int(r.get("averageViewDuration") or 0),
                "minutes": int(r.get("estimatedMinutesWatched") or 0),
                "subs_gained": int(r.get("subscribersGained") or 0),
                "likes": int(r.get("likes") or 0),
                "shares": int(r.get("shares") or 0),
                "comments": meta.get("comments", 0),
            })
        # Ролики, которые Analytics не вернул вовсе (ни одного просмотра),
        # всё равно попадают в снимок. Иначе «выложили и он не пошёл»
        # выглядело бы как «мы его не выкладывали», а это разные факты.
        known = {v["id"] for v in vids}
        for vid, meta in cat.items():
            if vid not in known:
                vids.append({
                    "id": vid, "title": meta.get("title", ""),
                    "published": meta.get("published", ""),
                    "duration": meta.get("duration", 0),
                    "privacy": meta.get("privacy", ""),
                    "views": 0, "watched_pct": 0.0, "avg_sec": 0,
                    "minutes": 0, "subs_gained": 0,
                    "likes": meta.get("likes", 0), "shares": 0,
                    "comments": meta.get("comments", 0),
                })

        # Кривые — только тем, у кого хватает просмотров. YouTube на
        # единичных просмотрах кривую не отдаёт вовсе, а запрос всё равно
        # стоит квоты.
        curves, spent = {}, 0
        for v in sorted(vids, key=lambda v: -v["views"]):
            if v["views"] < MIN_VIEWS or spent >= MAX_CURVES:
                continue
            try:
                s = _curve_summary(ya, v["id"], v["duration"])
            except Exception:
                continue
            spent += 1
            if s:
                curves[v["id"]] = s

        # Второстепенные разрезы — каждый сам по себе. Осечка на одном не
        # отменяет остальных и не отменяет главного (каталога и метрик).
        missing: list[str] = []
        searches = _side(ya, missing, "поисковые запросы", metrics="views",
                         dimensions="insightTrafficSourceDetail",
                         filters="insightTrafficSourceType==YT_SEARCH",
                         sort="-views", maxResults=25)
        snap.update({
            "ok": True,
            "channel": facts,
            "videos": vids,
            "curves": curves,
            "traffic": _tally(_side(ya, missing, "источники трафика",
                                    metrics="views",
                                    dimensions="insightTrafficSourceType",
                                    sort="-views"),
                              "insightTrafficSourceType"),
            "subscribed": _tally(_side(ya, missing, "подписчики/чужие",
                                       metrics="views",
                                       dimensions="subscribedStatus"),
                                 "subscribedStatus"),
            "devices": _tally(_side(ya, missing, "устройства", metrics="views",
                                    dimensions="deviceType", sort="-views"),
                              "deviceType"),
            "searches": ([[r.get("insightTrafficSourceDetail", "?"),
                           int(r.get("views") or 0)] for r in searches]
                         if searches is not None else None),
            "niche": _niche(channel, log),
        })
        # Неполнота записывается в сам снимок: иначе через месяц по нему
        # нельзя будет понять, почему в тот день не было источников
        # трафика — не спросили, не ответили или их правда не было.
        if missing:
            snap["partial"] = missing
        _say(log, f"[История] {cid}: {len(vids)} роликов, "
                  f"{facts['subs']} подписчиков, кривых {len(curves)}"
                  + (f"; не далось: {len(missing)}" if missing else ""))
    except Exception as e:
        # Текст ошибки может тянуть за собой URL с ключом — обрезаем и
        # прячем: этот файл читают люди и он лежит рядом с репозиторием.
        why = str(e)
        key = os.getenv("YOUTUBE_API_KEY", "")
        if key:
            why = why.replace(key, "***")
        snap.update({"ok": False, "error": why[:300]})
        _say(log, f"[История] {cid}: снять не вышло — {why[:120]}")

    # Неудачный снимок не должен вытеснять удачный за те же сутки: иначе
    # одна вечерняя осечка стёрла бы утренние настоящие цифры.
    snaps[:] = [s for s in snaps
                if not (s.get("date") == snap["date"]
                        and bool(s.get("ok")) == bool(snap.get("ok")))]
    snaps.append(snap)
    snaps.sort(key=lambda s: (s.get("date", ""), bool(s.get("ok"))))
    ch_box["snapshots"] = _prune(snaps)
    save(data)
    return snap


def collect_all(log=print, force: bool = False) -> dict:
    """Обойти каналы, к которым доступ уже выдан.

    Неудача на одном не отменяет остальных: у каналов разные владельцы и
    разные токены, и протухший токен одного не повод остаться без цифр по
    двум другим.

    Каналы без токена пропускаются НЕ МОЛЧА, но и без записи в историю.
    Запись каждые сутки «доступа нет» замусорила бы файл строками, из
    которых ни одна не станет цифрой: пока владелец не войдёт, положение
    не изменится. Достаточно сказать это один раз в конце прогона —
    список уходит в отчёт отдельной строкой.
    """
    import channels as ch_mod
    out, need_login = {}, []
    for ch in ch_mod.load():
        cid = ch.get("id", "")
        if not has_token(cid):
            need_login.append(ch.get("name") or cid)
            continue
        try:
            out[cid] = collect(ch, log, force=force)
        except Exception as e:
            _say(log, f"[История] {cid}: {str(e)[:120]}")
            out[cid] = {"ok": False, "error": str(e)[:300]}
    if need_login:
        _say(log, "[История] Без доступа, цифр не будет, пока владелец не "
                  "войдёт: " + ", ".join(need_login))
    return out


# ------------------------------------------------------------------ чтение

def _fresh(snap: dict, channel: dict) -> list[dict]:
    """Ролики ТЕКУЩЕЙ ниши канала.

    Само правило — в channels.in_current_niche, и это не формальность:
    отсекать надо в трёх местах сразу (тема, удержание, история), а три
    копии одного условия расходятся молча. Здесь остаётся только обход
    списка.
    """
    import channels as ch_mod
    return [v for v in (snap.get("videos") or [])
            if ch_mod.in_current_niche(channel, v.get("published") or "")]


def _at_least(snaps: list[dict], days: int) -> dict:
    """Самый свежий удачный снимок НЕ МОЛОЖЕ days суток. Нужен для
    сравнения «сейчас против тогда»: брать первый попавшийся старый
    нельзя, окно должно быть известной ширины."""
    edge = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
    got = [s for s in snaps if s.get("ok") and s.get("date", "") <= edge]
    return got[-1] if got else {}


def growth(channel_id: str, days: int = 28, data: dict | None = None) -> dict:
    """Рост за окно: подписчики, просмотры, время просмотра.

    Пустой ответ, если сравнивать не с чем. Показать «+0» на канале, у
    которого просто нет прошлого снимка, — значит соврать про застой.
    """
    snaps = [s for s in snapshots(channel_id, data) if s.get("ok")]
    if len(snaps) < 2:
        return {}
    now, then = snaps[-1], _at_least(snaps, days)
    if not then or then is now:
        return {}
    a, b = now.get("channel") or {}, then.get("channel") or {}
    span = 0
    try:
        span = (datetime.fromisoformat(now["date"])
                - datetime.fromisoformat(then["date"])).days
    except Exception:
        pass
    return {
        "days": span,
        "from": then.get("date", ""), "to": now.get("date", ""),
        "subs": a.get("subs", 0) - b.get("subs", 0),
        "subs_now": a.get("subs", 0),
        "views": a.get("views", 0) - b.get("views", 0),
        "views_now": a.get("views", 0),
        "videos": a.get("videos", 0) - b.get("videos", 0),
    }


def _num(vals: list[float]) -> float:
    return round(statistics.median(vals), 1) if vals else 0.0


def topics(channel: dict, data: dict | None = None) -> dict:
    """Что зашло и что нет — по роликам ТЕКУЩЕЙ ниши.

    Отдаёт и число роликов, на которых вывод стоит. Без него любой вывод
    здесь читается одинаково уверенно, а разница между «на семи роликах»
    и «на одном» — это разница между правилом и совпадением.
    """
    snap = latest_ok(channel.get("id", ""), data)
    if not snap:
        return {}
    vids = _fresh(snap, channel)
    scored = [v for v in vids if v.get("views", 0) >= MIN_VIEWS]
    ranked = sorted(scored, key=lambda v: -(v.get("watched_pct") or 0))
    half = max(1, min(3, len(ranked) // 2))
    return {
        "date": snap.get("date", ""),
        "all": len(vids),
        "skipped_old": len(snap.get("videos") or []) - len(vids),
        "scored": len(scored),
        "thin": [v for v in vids if v.get("views", 0) < MIN_VIEWS],
        "best": ranked[:half] if len(ranked) >= 2 else [],
        "worst": ranked[len(ranked) - half:] if len(ranked) >= 2 else [],
        "median_pct": _num([v["watched_pct"] for v in scored]),
        "median_views": _num([v["views"] for v in scored]),
        "private": [v for v in vids if v.get("privacy") == "private"],
    }


def retention(channel: dict, data: dict | None = None) -> dict:
    """Сводный обвал удержания по роликам текущей ниши, в секундах."""
    snap = latest_ok(channel.get("id", ""), data)
    if not snap:
        return {}
    ok_ids = {v["id"] for v in _fresh(snap, channel)}
    got = [c for vid, c in (snap.get("curves") or {}).items() if vid in ok_ids]
    secs = [c["drop_sec"] for c in got if c.get("drop_sec") is not None]
    halves = [c["half_sec"] for c in got if c.get("half_sec") is not None]
    if not secs:
        return {}
    return {
        "videos": len(got),
        "drop_sec": round(sum(secs) / len(secs)),
        "drop_size": round(sum(c["drop_size"] for c in got) / len(got) * 100),
        "half_sec": round(sum(halves) / len(halves)) if halves else None,
    }


# ------------------------------------------------------------------- отчёт

_TRAFFIC_RU = {
    "YT_SEARCH": "поиск YouTube", "RELATED_VIDEO": "рядом с чужими роликами",
    "YT_CHANNEL": "страница канала", "SHORTS": "лента Shorts",
    "EXT_URL": "ссылки извне", "NOTIFICATION": "уведомления",
    "PLAYLIST": "плейлисты", "SUBSCRIBER": "лента подписчиков",
    "NO_LINK_OTHER": "прямые заходы", "NO_LINK_EMBEDDED": "встроенный плеер",
    "ADVERTISING": "реклама", "END_SCREEN": "финальные заставки",
    "YT_OTHER_PAGE": "прочие страницы YouTube",
    "HASHTAGS": "хэштеги", "SOUND_PAGE": "страница звука",
    "VIDEO_REMIXES": "ремиксы",
}


def report(channel: dict, data: dict | None = None) -> str:
    """Отчёт владельцу: не цифры, а ответы. Читается за минуту.

    Порядок строк — по убыванию того, на что владелец может повлиять
    сегодня. Поэтому первым идёт не рост, а препятствие: канал, все
    ролики которого лежат приватными, не вырастет ни при какой формуле
    темы, и обсуждать на нём удачность тем бессмысленно.

    У каждого вывода — «на N роликах». Число маленькое почти всегда, и
    прятать это нельзя: вывод, сделанный на одном ролике, должен ЧИТАТЬСЯ
    как сделанный на одном ролике.
    """
    d = data if data is not None else load()
    cid = channel.get("id", "")
    name = channel.get("name") or cid
    snap = latest_ok(cid, d)
    last = latest(cid, d)
    L = [f"╺╸ {name}"]

    if not snap:
        why = last.get("error") if last else ""
        L.append("   Цифр нет вовсе: " + (why or "сбор ни разу не проходил"))
        L.append("   Что сделать: запустить  python yt_history.py collect")
        return "\n".join(L)

    age = 0
    try:
        age = (datetime.now(timezone.utc).date()
               - datetime.fromisoformat(snap["date"]).date()).days
    except Exception:
        pass
    if age > 1:
        L.append(f"   ! Данные несвежие: снимку {age} дн. "
                 + (f"Последняя попытка не прошла: {last.get('error','')[:90]}"
                    if last and not last.get("ok") else ""))

    t = topics(channel, d)
    ch = snap.get("channel") or {}
    import channels as ch_mod
    channels_since = ch_mod.stats_since(channel)

    # 1. Препятствие, которое перевешивает все выводы о темах.
    priv = t.get("private") or []
    if priv and len(priv) == t.get("all"):
        L.append(f"   ⛔ ВСЕ {len(priv)} роликов канала лежат ПРИВАТНЫМИ — их "
                 "не видит ни поиск, ни рекомендации. Пока это так, тема и "
                 "обложка ни на что не влияют.")
    elif priv:
        L.append(f"   ⛔ Приватными лежат {len(priv)} из {t.get('all')} — "
                 "эти ролики не могут набрать ничего.")

    # 2. Растём ли.
    g = growth(cid, 28, d)
    if g:
        L.append(f"   Рост за {g['days']} дн.: подписчиков "
                 f"{g['subs']:+d} (всего {g['subs_now']}), просмотров "
                 f"{g['views']:+d}, роликов {g['videos']:+d}")
    else:
        L.append(f"   Рост: сравнивать не с чем — снимок пока один "
                 f"(подписчиков {ch.get('subs', 0)}, роликов {ch.get('videos', 0)}). "
                 "Ответ появится, когда накопится второй.")

    # 3. Темы: что зашло.
    if t.get("skipped_old"):
        L.append(f"   Из разбора исключены {t['skipped_old']} ролик(ов) "
                 f"старой ниши (stats_from={channel.get('stats_from')}) — "
                 "они не образец для нынешней темы")
    if t.get("scored", 0) >= 2:
        L.append(f"   Темы (вывод на {t['scored']} роликах, у которых хотя бы "
                 f"{MIN_VIEWS} просмотров; медиана досмотра {t['median_pct']}%):")
        for v in t["best"]:
            L.append(f"     + {v['watched_pct']:.0f}% досмотр, {v['views']} "
                     f"просм. — {v['title'][:64]}")
        for v in t["worst"]:
            L.append(f"     - {v['watched_pct']:.0f}% досмотр, {v['views']} "
                     f"просм. — {v['title'][:64]}")
    else:
        n = t.get("scored", 0)
        L.append(f"   Темы: сказать нечего — роликов, набравших хотя бы "
                 f"{MIN_VIEWS} просмотров, всего {n}. "
                 "Сравнивать досмотр на одном-двух зрителях — гадание.")
    if t.get("thin"):
        L.append(f"     ({len(t['thin'])} ролик(ов) почти без просмотров — в "
                 "выводы не берутся)")

    # 4. Удержание.
    r = retention(channel, d)
    if r:
        L.append(f"   Удержание (на {r['videos']} ролике(ах)): обвал на "
                 f"{r['drop_sec']}-й секунде, разом уходит {r['drop_size']}%"
                 + (f"; половина зрителей — к {r['half_sec']}-й"
                    if r.get("half_sec") else ""))
    else:
        L.append("   Удержание: кривых нет — YouTube не строит их на "
                 "единичных просмотрах")

    # 5. Откуда приходят. None и {} различаются: «не спросили» против
    #    «спросили, пусто». Молчать про первое нельзя — иначе разрез
    #    тихо исчезает из отчёта и никто не замечает, что он отвалился.
    traffic = snap.get("traffic")
    if traffic is None:
        L.append("   Приходят: разрез не дался в этот сбор — цифры не "
                 "потеряны, просто не спрошены (см. partial в history.json)")
    else:
        tr = {k: v for k, v in traffic.items() if v}
        if tr:
            top = sorted(tr.items(), key=lambda kv: -kv[1])[:3]
            total = sum(tr.values()) or 1
            L.append("   Приходят: " + ", ".join(
                f"{_TRAFFIC_RU.get(k, k)} {v * 100 // total}%" for k, v in top))
            # Оговорка обязательна, а не для порядка. Источники трафика и
            # поисковые запросы YouTube отдаёт ТОЛЬКО В ЦЕЛОМ ПО КАНАЛУ —
            # разреза «с такой-то даты» у них нет, и stats_from к ним
            # неприменим. На abyss это видно в чистом виде: 93% приходов —
            # «лента Shorts», то есть след прежней ниши, которой на канале
            # уже нет. Принять это за нынешнее положение дел значит чинить
            # то, чего не существует.
            if channels_since:
                L.append(f"     ↑ это ПО ВСЕМУ каналу, включая время до "
                         f"{channels_since} — разреза по дате у источников "
                         "трафика в API нет")
        srch = snap.get("searches")
        if srch:
            L.append("   Ищут словами: " + ", ".join(
                f"«{q}»" for q, _ in srch[:4]))
    sub = snap.get("subscribed")
    if sub and sum(sub.values()):
        share = sub.get("SUBSCRIBED", 0) * 100 // (sum(sub.values()) or 1)
        L.append(f"   Из них подписчиков: {share}% — "
                 + ("канал живёт на случайных заходах"
                    if share < 15 else "своя аудитория уже возвращается"))
    if snap.get("partial"):
        L.append(f"   (в снимке не хватает {len(snap['partial'])} разрез(ов) — "
                 "остальное собрано полностью)")

    # 6. Ниша: с чем сравниваемся.
    n = snap.get("niche") or {}
    if n.get("median_views"):
        mine = t.get("median_views") or 0
        L.append(f"   Ниша ({n.get('title', '')[:30]}): медиана "
                 f"{n['median_views']:,}".replace(",", " ")
                 + f" просм., у нас {mine:.0f}")
    return "\n".join(L)


def report_all(data: dict | None = None, only_active: bool = False) -> str:
    """Сводка по каналам, к которым есть доступ.

    Фильтр — по наличию токена, а НЕ по active. active означает «ночью
    делать сюда ролики»; выключенный канал остаётся выложенным и
    продолжает набирать просмотры, а его цифры — единственное, по чему
    видно, стоит ли включать его обратно. Первый вариант фильтровал по
    active и прятал abyss — канал с самой длинной историей из трёх.
    """
    import channels as ch_mod
    d = data if data is not None else load()
    chans = [c for c in (ch_mod.active() if only_active else ch_mod.load())
             if has_token(c.get("id", "")) or snapshots(c.get("id", ""), d)]
    head = ["СВОДКА ПО КАНАЛАМ  " + _today(), ""]
    body = [report(c, d) for c in chans]
    tail = ["",
            "Чего здесь нет и почему:",
            "  CTR обложки и показы — YouTube Analytics API таких метрик не "
            "отдаёт вовсе (не вопрос доступа). Только Studio, глазами.",
            "  Тексты комментариев — нужен доступ шире нынешнего, "
            "см. ОГРАНИЧЕНИЯ в yt_history.py"]
    return "\n".join(head + body + tail)


# ------------------------------------------------- связь с генерацией темы

def evidence(channel: dict, data: dict | None = None) -> str:
    """Брифинг для выбора темы — ИЗ НАКОПЛЕННОГО, без обращений к API.

    Заменяет собой webapp._own_brief в той части, где тот каждый раз
    ходил в сеть. Разница не только в квоте: снимок из истории есть
    ВСЕГДА, даже когда API лежит, — и ролик не остаётся молча без учёта
    собственных результатов.

    Пустая строка, когда данных мало. Это не осторожность ради
    осторожности: указание, выведенное из двух зрителей, сценарист примет
    за правило и будет писать под случайность.
    """
    t = topics(channel, data)
    if not t or t.get("scored", 0) < 2:
        return ""
    def _line(v):
        return (f"  {v['title'][:70]} — {v['views']} views, "
                f"{v['watched_pct']:.0f}% watched")
    return ("\n\nTHIS CHANNEL'S OWN RESULTS (measured "
            f"{t['date']}, {t['scored']} videos with at least {MIN_VIEWS} "
            "views each). These are YOUR videos, not the reference "
            "channel's, and they outrank niche averages wherever the two "
            "disagree.\n"
            "WATCHED LONGEST:\n" + "\n".join(_line(v) for v in t["best"]) +
            "\nABANDONED FASTEST:\n" + "\n".join(_line(v) for v in t["worst"]) +
            "\nWork out what the top ones promised that the bottom ones did "
            "not, and carry that difference into the new topic. Never repeat "
            "a subject already listed above.")


MARK_A = "<<< СВОИ ЗАМЕРЫ — обновляется автоматически, руками не править"
MARK_B = ">>>"


def formula_block(channel: dict, data: dict | None = None) -> str:
    """Измеренный блок для topic_formula — то, что можно вписать в профиль.

    ЗАЧЕМ. topic_formula в channels.json — текст, выведенный однажды
    руками из разбора ниши и с тех пор не менявшийся; в профилях он так и
    подписан «MEASURED on the reference channel». Пока канал не набрал
    своих цифр, это единственное, что есть. Как только свои цифры
    появились, они важнее: ниша говорит, что работает у соседа, свои
    ролики — что работает здесь.

    Блок отделён маркерами, чтобы обновление не съедало ручную часть
    формулы. Всё, что владелец написал выше маркера, остаётся его.
    """
    t = topics(channel, data)
    if not t or t.get("scored", 0) < MIN_FORMULA_VIDEOS:
        return ""
    lines = [MARK_A,
             f"# обновлено {t['date']}, выводы на {t['scored']} своих роликах",
             "OUR OWN MEASURED RESULTS (these beat the reference channel "
             "wherever they disagree):"]
    for v in t["best"]:
        lines.append(f"  WORKED  {v['watched_pct']:.0f}% watched, "
                     f"{v['views']} views: {v['title'][:80]}")
    for v in t["worst"]:
        lines.append(f"  FAILED  {v['watched_pct']:.0f}% watched, "
                     f"{v['views']} views: {v['title'][:80]}")
    r = retention(channel, data)
    if r:
        lines.append(f"  Viewers leave in a cliff at second {r['drop_sec']} "
                     f"({r['drop_size']}% at once) — measured on "
                     f"{r['videos']} of our videos.")
    lines.append(MARK_B)
    return "\n".join(lines)


def refresh_formula(channel: dict, log=print, data: dict | None = None) -> bool:
    """Вписать свежий блок замеров в topic_formula профиля канала.

    Ручная часть формулы не трогается: заменяется только участок между
    маркерами. Возвращает True, если профиль изменился.

    Пишем через channels.upsert, а не своей записью в channels.json: там
    замок и запись через временный файл, а профиль в это же время правят
    из интерфейса и из ночной цепочки (та дописывает used_topics). Своя
    запись поверх стёрла бы чужую правку целиком.
    """
    block = formula_block(channel, data)
    if not block:
        return False
    import channels as ch_mod
    cur = ch_mod.get(channel.get("id", "")) or {}
    old = cur.get("topic_formula") or ""
    if MARK_A in old and MARK_B in old:
        head, _, rest = old.partition(MARK_A)
        _, _, tail = rest.partition(MARK_B)
        new = head.rstrip() + "\n\n" + block + tail
    else:
        new = old.rstrip() + "\n\n" + block
    if new.strip() == old.strip():
        return False
    ch_mod.upsert({"id": channel["id"], "topic_formula": new})
    _say(log, f"[История] {channel['id']}: формула темы обновлена своими "
              "замерами")
    return True


# --------------------------------------------------------------------- CLI

def _cli(argv: list[str]) -> int:
    """Запуск руками или по расписанию:

        python yt_history.py collect      — снять срез всех каналов
        python yt_history.py report       — сводка владельцу
        python yt_history.py formula      — вписать замеры в topic_formula
    """
    try:
        from dotenv import load_dotenv
        load_dotenv(BASE / ".env")
    except Exception:
        pass
    # Консоль Windows живёт в cp1251, а в отчёте есть рамки и стрелки.
    # Без этого весь вывод молча пропадал: print падал UnicodeEncodeError,
    # труба съедала ошибку, и прогон выглядел как «отработал и промолчал».
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
    cmd = (argv[1] if len(argv) > 1 else "report").strip().lower()
    import channels as ch_mod
    if cmd == "collect":
        collect_all(force="--force" in argv)
        print()
        print(report_all())
    elif cmd == "report":
        # Без выбора «только активные»: отбор идёт по наличию доступа, а
        # не по active. Выключенный из ночи канал (abyss) остаётся
        # выложенным и продолжает набирать просмотры — и именно его цифры
        # отвечают на вопрос, стоит ли включать его обратно. Прежний флаг
        # выкидывал его из сводки молча.
        print(report_all())
    elif cmd == "formula":
        for c in ch_mod.active():
            if not refresh_formula(c):
                print(f"{c['id']}: своих цифр пока мало, формула не тронута")
    else:
        print(_cli.__doc__)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(_cli(sys.argv))
