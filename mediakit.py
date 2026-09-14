# -*- coding: utf-8 -*-
"""Набор материала под РУЧНОЙ монтаж: Premiere Pro, DaVinci, Vegas — любой.

ЧЕМ ЭТО ОТЛИЧАЕТСЯ ОТ ОСНОВНОГО КОНВЕЙЕРА. Конвейер собирает готовый ролик
и решает за монтажёра всё: длину плана, порядок, склейки, субтитры. Здесь
наоборот — программа только ДОБЫВАЕТ материал и раскладывает его по полкам,
а режет человек сам. Поэтому тут нет ни рендера, ни таймлайна: на выходе
папка, которую втаскиваешь в проект целиком.

Что кладётся в папку:
    01_stock_video   клипы со стоков (Pexels, Pixabay)
    02_stock_photo   фото со стоков и из Wikimedia
    03_ai_frames     кадры, нарисованные ИИ по этой же теме
    04_ai_clips      короткие клипы, снятые ИИ (по просьбе — они долгие)
    05_music         музыкальная подложка под настроение темы
    06_voice         озвучка сценария и .srt, если сценарий передан
    СПИСОК.txt       что это за файл, откуда взят и под какой он план
    kit.json         то же самое машиночитаемо

ПОЧЕМУ ИМЕНА ФАЙЛОВ ЛАТИНИЦЕЙ И С НОМЕРОМ. В корзине Premiere файлы стоят
по алфавиту, и «01_», «02_» — единственный способ сохранить порядок планов.
Латиница — потому что путь с кириллицей ломает часть плагинов и командные
утилиты на Windows, а имя файла здесь всё равно техническое: что это за
кадр, написано в СПИСОК.txt.

Запуск отдельным файлом:
    python mediakit.py "крушение моста Моранди" --shots 8
    python mediakit.py "тема" --script сценарий.txt --ai-clips 3
"""
from __future__ import annotations

import json
import os
import re
import time
from pathlib import Path

import core

# Сколько кандидатов запрашивать у стока на один план. Больше — дольше и без
# толку: берём мы один, а разбирать руками всё равно человеку.
POOL = 15

FOLDERS = {
    "stock_video": "01_stock_video",
    "stock_photo": "02_stock_photo",
    "ai_frames": "03_ai_frames",
    "ai_clips": "04_ai_clips",
    "music": "05_music",
    "voice": "06_voice",
}

PLAN_PROMPT = """You are a documentary researcher preparing FOOTAGE for an
editor. The editor will cut the film manually.

Topic (may be a phrase, a few keywords, or a whole script):
__QUERY__

Break it into __N__ distinct visual shots. For each shot give:
  "title"  - what the shot shows, in Russian, max 5 words
  "search" - a STOCK FOOTAGE search query in English, 2-4 plain words.
             Stock libraries index by generic nouns: "collapsed bridge",
             "rescue workers", "empty highway". Never use proper names,
             dates or abstractions - they return nothing.
  "prompt" - a prompt for an AI image generator, English, one sentence,
             cinematic and concrete (lighting, angle, mood).

Also give "mood": exactly one of calm, dark, epic, hopeful, sad, tense, upbeat.

Reply with ONLY a JSON object, no markdown fences:
{"mood": "...", "shots": [{"title": "...", "search": "...", "prompt": "..."}]}
"""


# Кириллица в имени папки. Без переписи латиницей запрос «старый маяк в шторм»
# давал папку «2026-08-24_1520_shot» — обнаружено запуском: у РУССКОГО запроса
# латинских букв нет вовсе, регулярка вычищала всё, и все наборы назывались
# одинаково. Имена файлов внутри берутся из английского поискового запроса и
# этой беды не знают, а имя папки — из того, что человек написал.
_ТРАНСЛИТ = {
    "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "e",
    "ж": "zh", "з": "z", "и": "i", "й": "y", "к": "k", "л": "l", "м": "m",
    "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u",
    "ф": "f", "х": "h", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "sch",
    "ъ": "", "ы": "y", "ь": "", "э": "e", "ю": "yu", "я": "ya",
}


def _translit(text: str) -> str:
    return "".join(_ТРАНСЛИТ.get(c, _ТРАНСЛИТ.get(c.lower(), c))
                   if c.lower() in _ТРАНСЛИТ else c
                   for c in (text or ""))


def _slug(text: str, limit: int = 40) -> str:
    """Латинский кусок имени из запроса — годный и для файла, и для папки."""
    s = re.sub(r"[^a-zA-Z0-9]+", "-",
               _translit((text or "").strip())).strip("-").lower()
    return (s[:limit].rstrip("-") or "shot")


def _json_from(text: str) -> dict:
    """Достать объект JSON из ответа модели.

    Модель регулярно оборачивает ответ в ```json ...```, несмотря на прямой
    запрет в промпте, — поэтому берём кусок от первой фигурной скобки до
    последней, а не доверяем формату ответа.
    """
    t = (text or "").strip()
    i, j = t.find("{"), t.rfind("}")
    if i < 0 or j <= i:
        raise ValueError("в ответе нет JSON")
    return json.loads(t[i:j + 1])


def plan_shots(query: str, count: int = 8, log=print,
               gemini_key: str = "") -> dict:
    """Разложить тему на планы: что искать на стоке и что рисовать ИИ.

    Если Gemini недоступен (кончилась квота, нет ключа), НЕ падаем: ищем по
    самому запросу пользователя. Набор выйдет однообразнее, но он выйдет —
    а пустая папка не нужна никому.
    """
    keys = [gemini_key] if gemini_key else core._gemini_keys()
    prompt = PLAN_PROMPT.replace("__QUERY__", query[:6000]).replace(
        "__N__", str(count))
    for i, k in enumerate(keys, 1):
        try:
            raw = core.gemini_chat([{"role": "user", "content": prompt}], k,
                                   temperature=0.6, max_tokens=2048)
            data = _json_from(raw)
            shots = [s for s in (data.get("shots") or [])
                     if s.get("search")][:count]
            if shots:
                mood = core.normalize_mood(str(data.get("mood") or ""),
                                           fallback="calm")
                log(f"[Набор] Тема разложена на {len(shots)} планов, "
                    f"настроение «{mood}»")
                return {"mood": mood, "shots": shots}
        except Exception as e:                                # noqa: BLE001
            log(f"[Набор] Ключ Gemini {i}/{len(keys)}: разбор темы не вышел "
                f"({core._redact(e)})")
    log("[Набор] Тему разложить не удалось — ищу по самому запросу")
    words = " ".join(query.split()[:4])
    return {"mood": "calm",
            "shots": [{"title": query[:40], "search": words,
                       "prompt": query[:300]}]}


def _fetch_stock_video(getters, shot: dict, dest_dir: Path, n: int,
                       log=print) -> dict | None:
    """Один клип со стока под план. Pexels и Pixabay спрашиваются ОБА.

    Спрашивать оба обязательно: замер основного конвейера показал, что при
    опросе одного Pexels половина полки просто не открывается — на тех же
    запросах Pixabay отдаёт столько же кандидатов.
    """
    pexels_get, pixabay_get = getters
    q = shot["search"]
    try:
        r = pexels_get("https://api.pexels.com/videos/search",
                       {"query": q, "per_page": POOL,
                        "orientation": "landscape"})
        for v in (r.json().get("videos") or []
                  if r is not None and r.status_code == 200 else []):
            try:
                link = core.pick_video_file(v["video_files"])["link"]
            except Exception:                                 # noqa: BLE001
                continue
            dest = dest_dir / f"{n:02d}_{_slug(q)}_pexels.mp4"
            core.download_file(link, dest)
            return {"file": dest, "source": "Pexels",
                    "url": v.get("url", ""), "seconds": v.get("duration") or 0}
    except Exception as e:                                    # noqa: BLE001
        log(f"[Набор] Pexels видео «{q}»: {core._redact(e)}")
    try:
        r = pixabay_get({"q": q, "per_page": POOL, "video_type": "all"},
                        videos=True)
        for v in (r.json().get("hits") or []
                  if r is not None and r.status_code == 200 else []):
            f = (v.get("videos") or {})
            f = f.get("medium") or f.get("large") or f.get("small")
            if not (f or {}).get("url"):
                continue
            dest = dest_dir / f"{n:02d}_{_slug(q)}_pixabay.mp4"
            core.download_file(f["url"], dest)
            return {"file": dest, "source": "Pixabay",
                    "url": v.get("pageURL", ""),
                    "seconds": v.get("duration") or 0}
    except Exception as e:                                    # noqa: BLE001
        log(f"[Набор] Pixabay видео «{q}»: {core._redact(e)}")
    return None


def _fetch_stock_photo(getters, shot: dict, dest_dir: Path, n: int,
                       used: dict, log=print) -> dict | None:
    """Одно фото под план: Pexels -> Pixabay -> Wikimedia.

    Wikimedia держим третьей не для количества, а ради РЕАЛЬНЫХ съёмок
    событий, людей и мест: на стоках их нет по определению — там постановка.
    """
    pexels_get, pixabay_get = getters
    q = shot["search"]
    try:
        r = pexels_get("https://api.pexels.com/v1/search",
                       {"query": q, "per_page": POOL,
                        "orientation": "landscape"})
        for p in (r.json().get("photos") or []
                  if r is not None and r.status_code == 200 else []):
            link = (p.get("src") or {}).get("original")
            if not link:
                continue
            dest = dest_dir / f"{n:02d}_{_slug(q)}_pexels.jpg"
            core.download_file(link, dest)
            return {"file": dest, "source": "Pexels", "url": p.get("url", "")}
    except Exception as e:                                    # noqa: BLE001
        log(f"[Набор] Pexels фото «{q}»: {core._redact(e)}")
    try:
        r = pixabay_get({"q": q, "per_page": POOL,
                         "orientation": "horizontal", "image_type": "photo"})
        for h in (r.json().get("hits") or []
                  if r is not None and r.status_code == 200 else []):
            if not h.get("largeImageURL"):
                continue
            dest = dest_dir / f"{n:02d}_{_slug(q)}_pixabay.jpg"
            core.download_file(h["largeImageURL"], dest)
            return {"file": dest, "source": "Pixabay",
                    "url": h.get("pageURL", "")}
    except Exception as e:                                    # noqa: BLE001
        log(f"[Набор] Pixabay фото «{q}»: {core._redact(e)}")
    try:
        got = core.fetch_wiki_images(q, 1, dest_dir, f"{n:02d}_{_slug(q)}",
                                     used, log)
        if got:
            return {"file": got[0], "source": "Wikimedia", "url": ""}
    except Exception as e:                                    # noqa: BLE001
        log(f"[Набор] Wikimedia «{q}»: {core._redact(e)}")
    return None


def _fetch_music(mood: str, dest_dir: Path, music_dir: Path,
                 log=print) -> dict | None:
    """Подложка под настроение: своя библиотека -> Архив -> Openverse.

    Порядок ровно такой же, как в конвейере, и по той же причине: скачанное
    один раз лежит на диске, а лезть в сеть за тем, что уже есть, — только
    ждать.
    """
    try:
        track = core.pick_music_by_mood(Path(music_dir), mood)
        dest = dest_dir / f"music_{mood}{track.suffix}"
        dest.write_bytes(track.read_bytes())
        return {"file": dest, "source": "локальная библиотека", "url": ""}
    except Exception:                                         # noqa: BLE001
        pass
    for name, fn in (("Internet Archive", core.archive_music),
                     ("Openverse", core.openverse_music)):
        try:
            got = fn(mood, dest_dir, log=log)
            return {"file": got, "source": name, "url": ""}
        except Exception as e:                                # noqa: BLE001
            log(f"[Набор] {name}: музыки нет ({core._redact(e)})")
    return None


def build_kit(query: str, out_dir: Path | str, *, shots: int = 8,
              stock_video: bool = True, stock_photo: bool = True,
              ai_frames: int = 0, ai_clips: int = 0, music: bool = True,
              script: str = "", voice: str = "ru-RU-DmitryNeural",
              music_dir: Path | str = "", log=print) -> dict:
    """Собрать папку с материалом по теме. Возвращает сводку.

    ai_frames и ai_clips — ЧИСЛА, а не галки, и это намеренно: генерация
    небесплатна и небыстра (замер 24.08.2026 на запасном генераторе Agnes:
    кадр 2624x1472 — около двух минут, клип 5 с в 720p — 98 секунд). Человек
    должен видеть, сколько он заказывает, а не ставить галку «ещё и ИИ».

    Ни один сбойный источник не обрывает сборку: не нашлось видео — будет
    фото, не нашлось ничего — план просто отмечен пустым в СПИСОК.txt.
    Полупустая папка полезнее, чем исключение на седьмом плане из восьми.
    """
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    music_dir = Path(music_dir or (Path(__file__).resolve().parent
                                   / "music_library"))
    t0 = time.time()

    plan = plan_shots(query, shots, log)
    mood, shot_list = plan["mood"], plan["shots"]

    dirs = {}
    for key, name in FOLDERS.items():
        d = out / name
        d.mkdir(exist_ok=True)
        dirs[key] = d

    pexels = core.KeyRotator(os.getenv("PEXELS_API_KEY", "").replace(",", "\n"))
    pixabay = core.KeyRotator(os.getenv("PIXABAY_API_KEY", "").replace(",", "\n"))
    getters = core._stock_getters(pexels, pixabay, log)

    used: dict = {}
    items: list[dict] = []

    for i, shot in enumerate(shot_list, 1):
        core._stop_check()
        title = shot.get("title") or shot["search"]
        log(f"[Набор] План {i}/{len(shot_list)}: {title}")
        if stock_video:
            got = _fetch_stock_video(getters, shot, dirs["stock_video"], i, log)
            if got:
                items.append({**got, "n": i, "title": title, "kind": "видео"})
        if stock_photo:
            got = _fetch_stock_photo(getters, shot, dirs["stock_photo"], i,
                                     used, log)
            if got:
                items.append({**got, "n": i, "title": title, "kind": "фото"})

    # ИИ-материал идёт ОТДЕЛЬНЫМ проходом, после стока. Сток быстрый, ИИ
    # медленный: если человек прервёт сборку на середине, у него уже будет
    # чем работать, а не половина самого долгого шага.
    for i, shot in enumerate(shot_list[:ai_frames], 1):
        core._stop_check()
        dest = dirs["ai_frames"] / f"{i:02d}_{_slug(shot['search'])}_ai.jpg"
        log(f"[Набор] ИИ-кадр {i}/{ai_frames}: {shot.get('title') or ''}")
        try:
            core.gen_image(shot.get("prompt") or shot["search"], dest, log=log)
            items.append({"file": dest, "n": i, "kind": "ИИ-кадр",
                          "title": shot.get("title") or shot["search"],
                          "source": "сгенерировано", "url": ""})
        except Exception as e:                                # noqa: BLE001
            log(f"[Набор] ИИ-кадр {i}: не вышел ({core._redact(e)})")

    for i, shot in enumerate(shot_list[:ai_clips], 1):
        core._stop_check()
        dest = dirs["ai_clips"] / f"{i:02d}_{_slug(shot['search'])}_ai.mp4"
        log(f"[Набор] ИИ-клип {i}/{ai_clips}: {shot.get('title') or ''}")
        try:
            core.gen_video(shot.get("prompt") or shot["search"], dest, log=log)
            items.append({"file": dest, "n": i, "kind": "ИИ-клип",
                          "title": shot.get("title") or shot["search"],
                          "source": "сгенерировано", "url": ""})
        except Exception as e:                                # noqa: BLE001
            log(f"[Набор] ИИ-клип {i}: не вышел ({core._redact(e)})")

    if music:
        core._stop_check()
        got = _fetch_music(mood, dirs["music"], music_dir, log)
        if got:
            items.append({**got, "n": 0, "kind": "музыка",
                          "title": f"подложка «{mood}»"})

    if script.strip():
        core._stop_check()
        log("[Набор] Озвучиваю сценарий...")
        try:
            mp3 = core.tts_edge(script, voice, dirs["voice"], log,
                                enhance=True)
            items.append({"file": Path(mp3), "n": 0, "kind": "озвучка",
                          "title": "начитка сценария",
                          "source": "Edge TTS", "url": ""})
        except Exception as e:                                # noqa: BLE001
            log(f"[Набор] Озвучка не вышла ({core._redact(e)})")

    # ── описи ──────────────────────────────────────────────────────────
    lines = [f"НАБОР МАТЕРИАЛА: {query.strip()[:200]}",
             f"Собран: {time.strftime('%d.%m.%Y %H:%M')}",
             f"Настроение музыки: {mood}",
             f"Файлов: {len(items)}",
             "",
             "Лицензии: Pexels и Pixabay разрешают коммерческое "
             "использование без указания автора, но указать не мешает.",
             "Wikimedia и Openverse — по ссылке рядом с файлом, там бывает "
             "обязательная атрибуция.",
             ""]
    for it in sorted(items, key=lambda x: (x["n"], x["kind"])):
        rel = Path(it["file"]).relative_to(out)
        lines.append(f"{rel}")
        lines.append(f"    план {it['n'] or '-'}: {it['title']}")
        lines.append(f"    {it['kind']}, источник: {it['source']}"
                     + (f"  {it['url']}" if it.get("url") else ""))
    (out / "СПИСОК.txt").write_text("\n".join(lines), encoding="utf-8")

    summary = {
        "query": query, "mood": mood,
        "shots": shot_list,
        "files": [{"path": str(Path(it["file"]).relative_to(out)),
                   "kind": it["kind"], "title": it["title"],
                   "source": it["source"], "url": it.get("url", ""),
                   "n": it["n"]} for it in items],
        "seconds": round(time.time() - t0, 1),
        "dir": str(out),
    }
    (out / "kit.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    log(f"[Набор] Готово: {len(items)} файлов за "
        f"{summary['seconds']:.0f} с -> {out}")
    return summary


if __name__ == "__main__":
    import argparse

    from dotenv import load_dotenv

    load_dotenv(Path(__file__).resolve().parent / ".env")

    ap = argparse.ArgumentParser(
        description="Набор материала по теме для ручного монтажа")
    ap.add_argument("query", help="тема, пара слов или кусок сценария")
    ap.add_argument("--out", default="", help="куда складывать (по умолчанию "
                                              "папка «Наборы» рядом с программой)")
    ap.add_argument("--shots", type=int, default=8, help="сколько планов")
    ap.add_argument("--ai-frames", type=int, default=0,
                    help="сколько кадров нарисовать ИИ (~2 мин каждый)")
    ap.add_argument("--ai-clips", type=int, default=0,
                    help="сколько клипов снять ИИ (~100 с каждый)")
    ap.add_argument("--no-video", action="store_true", help="без сток-видео")
    ap.add_argument("--no-photo", action="store_true", help="без сток-фото")
    ap.add_argument("--no-music", action="store_true", help="без музыки")
    ap.add_argument("--script", default="", help="файл сценария для озвучки")
    a = ap.parse_args()

    text = ""
    if a.script:
        text = Path(a.script).read_text(encoding="utf-8", errors="replace")

    name = _slug(a.query, 30) or "kit"
    out = Path(a.out) if a.out else (Path(__file__).resolve().parent
                                     / "Наборы"
                                     / f"{time.strftime('%Y-%m-%d_%H%M')}_{name}")
    build_kit(a.query, out, shots=a.shots, ai_frames=a.ai_frames,
              ai_clips=a.ai_clips, stock_video=not a.no_video,
              stock_photo=not a.no_photo, music=not a.no_music, script=text)
