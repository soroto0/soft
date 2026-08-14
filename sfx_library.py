#!/usr/bin/env python3
"""Библиотека звуковых эффектов из Internet Archive (CC0).

Зачем. В рендере было ТРИ синтезированных звука — whoosh, pop, ding — на все
18 типов оверлеев. Замер по готовому ролику: 98 оверлеев на 13.6 минуты, и один
и тот же «вжух» звучал 59 раз, каждые 14 секунд. Самая повторяемая КАРТИНКА
показывалась 6.5 раз — то есть на слух ролик бил в одну ноту в девять раз
назойливее, чем на глаз.

Источник: коллекции SSE_Library_* на archive.org — 63 штуки, 3066 аудиофайлов,
ВСЕ под CC0 (public domain, коммерческое использование без атрибуции, ключ не
нужен). Из них ~382 короче шести секунд, то есть годятся под появление оверлея.

    python sfx_library.py --fetch            # скачать подборку под все каналы
    python sfx_library.py --fetch --limit 20 # поменьше, для пробы
    python sfx_library.py --report           # что уже лежит

Лицензии CC BY-NC-* и *-ND сюда НЕ берутся: NC запрещает монетизацию, ND —
переработку. На канале с рекламой это прямой риск.
"""
import argparse
import json
import random
import sys
from pathlib import Path

import requests

BASE = Path(__file__).resolve().parent
SFX_DIR = BASE / "assets" / "sfx"
LEDGER = SFX_DIR / "library.json"
UA = {"User-Agent": "ContentFactory/1.0"}

# Категория библиотеки -> наша роль звука. Роли те же, что понимает рендер:
# whoosh (что-то выезжает), pop (щёлкает/ставится), ding (итог/число),
# плюс новые thud (тяжёлый удар) и tick (мелкая механика).
#
# Подбор под каналы, а не «всё подряд»: abyss про разрушение конструкций,
# home-vault про дом и инструмент. Библиотека игровая, в ней много оружия и
# фантастики — это мы намеренно не берём.
CATEGORIES = {
    "SSE_Library_SWOOSHES":    "whoosh",
    "SSE_Library_AIR":         "whoosh",
    "SSE_Library_MOVEMENT":    "whoosh",
    "SSE_Library_WIND":        "whoosh",
    "SSE_Library_METAL":       "thud",
    "SSE_Library_DESTRUCTION": "thud",
    "SSE_Library_ROCKS":       "thud",
    "SSE_Library_WOOD":        "thud",
    "SSE_Library_DOORS":       "pop",
    "SSE_Library_MECHANICAL":  "pop",
    "SSE_Library_TOOLS":       "pop",
    "SSE_Library_OBJECTS":     "pop",
    "SSE_Library_FOLEY":       "pop",
    "SSE_Library_CLOCKS":      "tick",
    "SSE_Library_ELECTRICITY": "tick",
    "SSE_Library_BELLS":       "ding",
    "SSE_Library_MUSICAL":     "ding",
    "SSE_Library_GLASS":       "ding",
    "SSE_Library_ICE":         "ding",
    # Добор 11.08.2026. Шапка модуля обещает 63 коллекции, а подключено было
    # 19 — и ровно поэтому фон у каналов совпадал. Замер: после --fetch все 11
    # скачанных файлов оказались ДУБЛЯМИ, роль thud упёрлась в потолок 14, а
    # ding и pop остановились на пяти каждая. Пять не-ударных на два канала,
    # которым нужны именно они, — отсюда пересечение наборов 7 из 10 у тёплого
    # с созерцательным (при 1 из 10 у хроники с тёплым).
    #
    # Добираем перекосом в голодные роли, а не «всё подряд»: ударных не
    # трогаем, их и так с запасом. Намеренно НЕ берём CREATURES, VOICES,
    # CROWDS, BIRDS, CARTOON, FIGHT, BULLETS — голоса и живность под голосом
    # диктора читаются как посторонний звук в записи, а не как атмосфера.
    "SSE_Library_BEEPS":          "ding",
    "SSE_Library_COMMUNICATIONS": "ding",
    "SSE_Library_CHAINS":         "ding",
    "SSE_Library_FOOD_DRINK":     "pop",
    "SSE_Library_FOOTSTEPS":      "pop",
    "SSE_Library_DIRT_SAND":      "pop",
    "SSE_Library_MACHINES":       "tick",
    "SSE_Library_MOTORS":         "tick",
    "SSE_Library_WEATHER":        "whoosh",
    "SSE_Library_SNOW":           "whoosh",
    "SSE_Library_AIRCRAFT":       "whoosh",
    "SSE_Library_TRAINS":         "thud",
    "SSE_Library_LIQUID_MUD":     "thud",
    # Второй добор того же дня: первый поднял фон с 26 файлов до 34, но
    # пересечение тёплого с созерцательным упало только с 7 до 6 из 10 —
    # не-ударных стало 17 на два канала, которым нужны они же. Берём ещё.
    "SSE_Library_GAMES":          "tick",
    "SSE_Library_DESIGNED":       "ding",
    "SSE_Library_SPORTS":         "pop",
    "SSE_Library_ARCHIVED":       "pop",
    "SSE_Library_RAIN":           "whoosh",
    "SSE_Library_GEOTHERMAL":     "whoosh",
}

MIN_S, MAX_S = 0.15, 6.0


def _secs(v) -> float:
    if v is None:
        return 0.0
    s = str(v)
    if ":" in s:
        p = [float(x) for x in s.split(":")]
        while len(p) < 3:
            p.insert(0, 0.0)
        return p[0] * 3600 + p[1] * 60 + p[2]
    try:
        return float(s)
    except ValueError:
        return 0.0


def _license_ok(url: str) -> bool:
    """Только CC0 и public domain.

    NC (некоммерческая) и ND (без переработки) не годятся: ролики
    монетизируются, а звук в них подмешивается — это и есть переработка.
    """
    u = (url or "").lower()
    if "-nc" in u or "-nd" in u:
        return False
    return "zero" in u or "publicdomain" in u or "/by/" in u


def _read_ledger() -> tuple[dict, str]:
    """Разбор library.json: (записи, причина отказа).

    Различать «файла нет» и «файл испорчен» здесь обязательно, потому что
    ОБА раньше давали пустой словарь, а дальше по коду пустой словарь
    означает «библиотека ещё не качалась». И fetch(), и process() в конце
    ПЕРЕЗАПИСЫВАЮТ ledger целиком — то есть один битый байт стирал опись всех
    скачанных эффектов. Файлы при этом остаются на диске, но роли, лицензии и
    длительности к ним уже не привязать, и docking пойдёт качать всё заново.

    Слышно это в ролике сразу: без готовых эффектов рендер откатывается на
    три синтезированных звука, и «вжух» снова звучит каждые четырнадцать
    секунд — ровно та беда, ради которой библиотека и заводилась.
    """
    try:
        raw = LEDGER.read_text(encoding="utf-8")
    except FileNotFoundError:
        return {}, ""                 # библиотека ещё не качалась — норма
    except OSError as e:
        return {}, f"{LEDGER} не читается: {e}"
    try:
        data = json.loads(raw)
    except ValueError as e:
        return {}, f"{LEDGER} испорчен (не разбирается как JSON): {e}"
    if not isinstance(data, dict):
        return {}, (f"{LEDGER} испорчен: ожидался объект, "
                    f"а лежит {type(data).__name__}")
    return data, ""


def load_ledger(log=None) -> dict:
    """Опись библиотеки. Пусто — библиотека не скачана (это норма)."""
    data, err = _read_ledger()
    if err and log:
        log(f"[Звуки] ВНИМАНИЕ: {err}")
    return data


def _ledger_for_write() -> dict:
    """Опись для тех, кто её потом ПЕРЕЗАПИШЕТ.

    Отдельный вход, потому что цена ошибки разная: читателю (pool, report)
    испорченный файл стоит одного неверного ответа, а писателю — всей описи
    целиком. Поэтому писателю мы вместо пустого словаря отдаём отказ.
    """
    data, err = _read_ledger()
    if err:
        raise RuntimeError(
            f"{err}. Перезаписать опись сейчас — значит потерять роли и "
            "лицензии всех уже скачанных эффектов; почини файл или удали "
            "его вместе с папкой assets/sfx, если библиотеку не жалко")
    return data


# Чем кончилась последняя докачка. Отдельно от возвращаемого числа, потому
# что «скачано 0» — это ДВА противоположных случая: библиотека уже полная
# (всё хорошо) и источник недоступен (не сделано ничего). Раньше оба
# заканчивались бодрым «скачано новых: 0» и нулевым кодом возврата.
_LAST_FETCH: dict = {}


def fetch(limit_per_role: int = 14, log=print) -> int:
    """Скачать короткие CC0-эффекты, разложив по ролям."""
    ledger = _ledger_for_write()
    got = 0
    by_role: dict[str, int] = {}
    for r in ledger.values():
        by_role[r["role"]] = by_role.get(r["role"], 0) + 1

    stat = {"tried": 0, "unreachable": 0, "denied": 0, "full": 0,
            "files_failed": 0}
    _LAST_FETCH.clear()
    _LAST_FETCH.update(stat)
    items = list(CATEGORIES.items())
    random.shuffle(items)          # чтобы повторный запуск брал другое
    for ident, role in items:
        if by_role.get(role, 0) >= limit_per_role:
            stat["full"] += 1
            continue
        stat["tried"] += 1
        try:
            meta = requests.get(f"https://archive.org/metadata/{ident}",
                                headers=UA, timeout=90).json()
        except Exception as e:
            # Раньше здесь оставалось только имя класса исключения, и
            # «archive.org не отвечает» выглядело так же, как «в коллекции
            # ничего не подошло». Пишем причину целиком: недоступный источник
            # лечится повтором позже, а не переборкой ролей.
            stat["unreachable"] += 1
            log(f"[Звуки] {ident}: источник не ответил — "
                f"{type(e).__name__}: {str(e)[:150]}")
            continue
        lic = str((meta.get("metadata") or {}).get("licenseurl") or "")
        if not _license_ok(lic):
            stat["denied"] += 1
            log(f"[Звуки] {ident}: лицензия {lic or '?'} — пропускаю")
            continue
        files = [f for f in (meta.get("files") or [])
                 if str(f.get("name", "")).lower().endswith((".wav", ".mp3"))
                 and MIN_S <= _secs(f.get("length")) <= MAX_S]
        random.shuffle(files)
        for f in files:
            if by_role.get(role, 0) >= limit_per_role:
                break
            name = f["name"]
            key = f"{ident}/{name}"
            if key in ledger:
                continue
            dest_dir = SFX_DIR / role
            dest_dir.mkdir(parents=True, exist_ok=True)
            safe = "".join(c if c.isalnum() or c in "-_." else "_"
                           for c in Path(name).name)[:70]
            dest = dest_dir / safe
            url = f"https://archive.org/download/{ident}/{requests.utils.quote(name)}"
            try:
                resp = requests.get(url, headers=UA, timeout=120)
                if resp.status_code != 200 or len(resp.content) < 2000:
                    # Сорванная закачка отдельного файла — мелочь, пока их
                    # единицы. Но молчать про них нельзя: когда source лежит,
                    # ТАК выглядят все триста файлов, и роль остаётся пустой
                    # при бодром «скачано новых: 0».
                    stat["files_failed"] += 1
                    continue
                dest.write_bytes(resp.content)
            except Exception:
                stat["files_failed"] += 1
                continue
            ledger[key] = {"role": role, "file": str(dest.relative_to(SFX_DIR)),
                           "seconds": round(_secs(f.get("length")), 2),
                           "source": f"https://archive.org/details/{ident}",
                           "license": lic}
            by_role[role] = by_role.get(role, 0) + 1
            got += 1
            log(f"[Звуки] + {role}/{safe} ({_secs(f.get('length')):.1f} c)")

    SFX_DIR.mkdir(parents=True, exist_ok=True)
    LEDGER.write_text(json.dumps(ledger, ensure_ascii=False, indent=2),
                      encoding="utf-8")
    _LAST_FETCH.update(stat, got=got)
    if stat["unreachable"]:
        log(f"[Звуки] ИСТОЧНИК НЕДОСТУПЕН: не ответил на "
            f"{stat['unreachable']} коллекций(ю) из {stat['tried']}. "
            "Библиотека пополнена не полностью — повтори --fetch позже")
    if stat["files_failed"]:
        log(f"[Звуки] не скачалось отдельных файлов: {stat['files_failed']}")
    if stat["denied"]:
        log(f"[Звуки] отклонено по лицензии (NC/ND нельзя): {stat['denied']}")
    return got


def _ffmpeg(args: list[str]) -> tuple[bool, str]:
    """(получилось, причина отказа).

    Причина возвращается наружу, потому что «этот файл не обработался» и
    «ffmpeg вообще не установлен» раньше выглядели одинаково: во втором
    случае получалось двести одинаковых строк «не обработался» и ноль
    готовых эффектов — а ролик после этого молча звучал на трёх
    синтезированных звуках.
    """
    import subprocess
    try:
        r = subprocess.run(["ffmpeg", "-v", "error", *args, "-y"],
                           capture_output=True, timeout=120,
                           # Без флага каждый синтезируемый звук-акцент
                           # открывал окно консоли, а их по числу плашек.
                           creationflags=getattr(
                               subprocess, "CREATE_NO_WINDOW", 0))
        if r.returncode == 0:
            return True, ""
        return False, (r.stderr or b"").decode("utf-8", "replace")[-160:]
    except FileNotFoundError:
        return False, "ffmpeg не найден"
    except Exception as e:
        return False, f"{type(e).__name__}: {str(e)[:150]}"


def process(log=print) -> int:
    """Превратить сырые записи в звуки появления оверлея.

    Скачанное — это ФОЛИ-библиотека: полевые записи целиком, по 4-6 секунд
    («деревянная дверь открывается И ЗАКРЫВАЕТСЯ», «огнетушитель, длинный
    выхлоп»). Под появление плашки нужен короткий удар с резкой атакой,
    иначе звук тянется через три следующих оверлея и превращается в кашу.

    Что делаем:
      * выбрасываем дубли — архив держит один и тот же звук и в wav, и в mp3;
      * обрезаем по АТАКЕ: ищем первый громкий момент и берём от него
        небольшой хвост, а не начало файла (в начале часто тишина);
      * нормализуем громкость, иначе один эффект бьёт по ушам, а другой
        не слышно под голосом;
      * сводим в моно 44.1 кГц — как остальная звуковая дорожка.
    """
    led = _ledger_for_write()
    # дубли: тот же звук в разных форматах = одинаковое имя без расширения
    seen: dict[str, str] = {}
    dropped = 0
    for key, rec in sorted(led.items()):
        stem = Path(rec["file"]).stem.lower()
        sig = f"{rec['role']}/{stem}"
        if sig in seen:
            p = SFX_DIR / rec["file"]
            p.unlink(missing_ok=True)
            dropped += 1
            continue
        seen[sig] = key
    led = {k: v for k, v in led.items() if k in seen.values()}

    out_dir = SFX_DIR / "ready"
    out_dir.mkdir(parents=True, exist_ok=True)
    made, failed, missing = 0, 0, 0
    for key, rec in led.items():
        src = SFX_DIR / rec["file"]
        if not src.exists():
            # Опись знает про файл, а файла нет: его удалили руками или
            # закачка сорвалась. Молчать нельзя — звук просто не попадёт в
            # ролик, и роль незаметно опустеет.
            missing += 1
            continue
        dest = out_dir / f"{rec['role']}_{Path(rec['file']).stem[:40]}.wav"
        # silenceremove убирает тишину в начале (атака оказывается в нуле),
        # atrim берёт первые 0.9 c, afade гасит хвост — чтобы звук не тянулся
        # под следующий оверлей. loudnorm выравнивает громкость.
        ok, err = _ffmpeg([
            "-i", str(src),
            "-af", ("silenceremove=start_periods=1:start_threshold=-45dB:"
                    "start_silence=0.02,"
                    "atrim=0:0.9,"
                    "afade=t=out:st=0.72:d=0.18,"
                    "loudnorm=I=-20:TP=-2:LRA=7"),
            "-ac", "1", "-ar", "44100", str(dest)])
        if ok and dest.exists() and dest.stat().st_size > 4000:
            rec["ready"] = str(dest.relative_to(SFX_DIR))
            made += 1
        elif err == "ffmpeg не найден":
            # Дальше идти незачем: каждый следующий файл упрётся в то же
            # самое. Останавливаемся сразу и говорим ОДНУ понятную фразу
            # вместо двухсот «не обработался».
            raise RuntimeError(
                "ffmpeg не найден — обработать звуки нечем. Поставь ffmpeg и "
                f"повтори; сырые записи ({len(led)} шт.) остались на месте, "
                "опись не тронута")
        else:
            failed += 1
            log(f"[Звуки] не обработался: {src.name}"
                + (f" — {err}" if err else ""))
    LEDGER.write_text(json.dumps(led, ensure_ascii=False, indent=2),
                      encoding="utf-8")
    log(f"[Звуки] дублей выброшено: {dropped}; готовых эффектов: {made}")
    if missing:
        log(f"[Звуки] ВНИМАНИЕ: записано в описи, но нет на диске: {missing} "
            "— эти эффекты в ролик не попадут, перекачай их через --fetch")
    if failed:
        log(f"[Звуки] ВНИМАНИЕ: не обработалось файлов: {failed} — "
            "на столько вариантов звука в ролике будет меньше")
    if not made:
        log("[Звуки] ВНИМАНИЕ: готовых эффектов НЕТ — рендер вернётся к трём "
            "синтезированным звукам, и один и тот же «вжух» будет звучать "
            "каждые четырнадцать секунд")
    return made


def synth(count: int = 14, log=print) -> int:
    """Досинтезировать то, чего в архиве почти нет.

    Замер: роль whoosh нужна 59 раз за ролик — чаще всех, — а коллекция
    SSE_Library_SWOOSHES отдала всего два пригодных файла. Полевых записей
    «пролёта» мало, зато синтезируется он лучше всего: это шум с плывущим
    фильтром. Вариаций хватает, чтобы ни один не повторился в ролике:
    меняем длительность, направление свипа, резкость фильтра и тембр шума.

    Остальные роли синтезом не добираем — удар, щелчок и звон из настоящих
    записей звучат живее любой математики.
    """
    import math
    import random as _r
    import struct
    import wave

    out_dir = SFX_DIR / "ready"
    out_dir.mkdir(parents=True, exist_ok=True)
    sr = 44100
    made = 0
    for i in range(count):
        rnd = _r.Random(1000 + i)          # воспроизводимо: тот же набор всегда
        # Первый заход давал 14 почти одинаковых звуков: разброс тембра был
        # 6%, на слух — один и тот же вжух. Причина в том, что менялись
        # второстепенные параметры, а полоса частот у всех была одна.
        # Теперь у каждого варианта СВОЙ диапазон и своя роль в кадре:
        # «воздух» высоко и тонко, «полёт» широко, «тяга» низко и глухо.
        kind = i % 3
        if kind == 0:                      # воздух: высокий, короткий, тонкий
            lo, hi = rnd.uniform(1800, 2600), rnd.uniform(7000, 11000)
            dur = rnd.uniform(0.20, 0.34)
        elif kind == 1:                    # полёт: широкий средний свип
            lo, hi = rnd.uniform(500, 900), rnd.uniform(4000, 6500)
            dur = rnd.uniform(0.34, 0.55)
        else:                              # тяга: низкий, глухой, длинный
            lo, hi = rnd.uniform(120, 260), rnd.uniform(1200, 2200)
            dur = rnd.uniform(0.50, 0.85)
        n = int(sr * dur)
        up = rnd.random() < 0.5            # свип вверх или вниз
        f0, f1 = (lo, hi) if up else (hi, lo)
        q = rnd.uniform(0.06, 0.22)        # резкость: узкий свист или широкий шум
        skew = rnd.uniform(1.4, 3.2)       # где пик громкости внутри звука
        prev = lp = bp = 0.0
        buf = []
        for k in range(n):
            t = k / n
            # огибающая с несимметричным пиком — «пролетело», а не «пикнуло»
            env = (t ** 0.6) * ((1 - t) ** skew) * 4.2
            white = rnd.uniform(-1, 1)
            # мягкий розовый оттенок: чистый белый шум звучит цифровым
            pink = (prev + white * 0.35) * 0.72
            prev = pink
            # полосовой фильтр с плывущей частотой = сам свист пролёта
            fc = f0 + (f1 - f0) * (t ** 1.3)
            a = min(0.99, 2 * math.pi * fc / sr)
            lp += a * (pink - lp)
            bp += a * (lp - bp)
            buf.append(max(-1.0, min(1.0, (lp - bp) * env * (1.0 / max(q, 0.05)) * q * 3.0)))
        peak = max(1e-6, max(abs(x) for x in buf))
        buf = [x / peak * 0.72 for x in buf]
        dest = out_dir / f"whoosh_synth_{i:02d}.wav"
        _write(dest, buf, sr)
        made += 1

    # Роль tick пустая по той же причине: коллекции CLOCKS и ELECTRICITY
    # коротких файлов не дали. Щелчок синтезируется ещё проще вжуха — это
    # затухающий импульс с призвуком; нужен разрезу и кривой, где движение
    # мелкое и механическое, а удар был бы не по делу.
    for i in range(max(6, count // 2)):
        rnd = _r.Random(5000 + i)
        dur = rnd.uniform(0.05, 0.14)
        n = int(sr * dur)
        f = rnd.uniform(900, 3400)          # высота призвука
        decay = rnd.uniform(38, 95)         # как быстро гаснет
        body = rnd.uniform(0.15, 0.55)      # доля щелчка против тона
        buf = []
        for k in range(n):
            t = k / sr
            env = math.exp(-t * decay)
            tone = math.sin(2 * math.pi * f * t)
            click = rnd.uniform(-1, 1)
            buf.append(max(-1.0, min(1.0, (tone * (1 - body) + click * body) * env)))
        peak = max(1e-6, max(abs(x) for x in buf))
        buf = [x / peak * 0.62 for x in buf]
        dest = out_dir / f"tick_synth_{i:02d}.wav"
        _write(dest, buf, sr)
        made += 1
    log(f"[Звуки] синтезировано вариантов: {made}")
    return made


def _write(dest, buf, sr: int) -> None:
    """Записать моно-WAV 16 бит."""
    import struct
    import wave
    with wave.open(str(dest), "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(b"".join(struct.pack("<h", int(x * 32767)) for x in buf))



def pool(role: str) -> list[Path]:
    """Все скачанные звуки этой роли, которые лежат на диске."""
    out = []
    for rec in load_ledger(log=print).values():
        if rec.get("role") != role:
            continue
        p = SFX_DIR / rec["file"]
        if p.exists():
            out.append(p)
    return sorted(out)


def report() -> int:
    data, err = _read_ledger()
    if err:
        # «Пусто» и «испорчено» — разные беды с разным лечением, и отчёт
        # обязан их различать: во втором случае звуки на диске ЕСТЬ, и
        # запускать --fetch поверх испорченной описи значит потерять их.
        print(f"опись библиотеки не читается: {err}")
        return 2
    led = data
    if not led:
        print("библиотека пуста — запусти: python sfx_library.py --fetch")
        return 1
    roles: dict[str, list] = {}
    for rec in led.values():
        roles.setdefault(rec["role"], []).append(rec)
    print(f"{'роль':<10}{'звуков':>8}{'суммарно':>12}")
    print("-" * 32)
    for r, recs in sorted(roles.items()):
        print(f"{r:<10}{len(recs):>8}{sum(x['seconds'] for x in recs):>10.1f} c")
    print("-" * 32)
    print(f"{'всего':<10}{len(led):>8}")
    print("\nвсе файлы CC0 / public domain — атрибуция не требуется")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description="Библиотека SFX из Internet Archive")
    ap.add_argument("--fetch", action="store_true", help="скачать эффекты")
    ap.add_argument("--limit", type=int, default=14,
                    help="сколько звуков на роль (по умолчанию 14)")
    ap.add_argument("--report", action="store_true", help="что уже есть")
    args = ap.parse_args()
    if args.report:
        return report()
    if not args.fetch:
        ap.error("нужен --fetch или --report")
    n = fetch(args.limit)
    print(f"\nскачано новых: {n}")
    report()
    # Код возврата ЧЕСТНЫЙ. Раньше главным был report(), и он отдавал 0, пока
    # в описи есть хоть что-то, — то есть докачка при лежащем archive.org
    # выглядела успешной и для человека, и для любого скрипта, который её
    # запустил бы по расписанию.
    if _LAST_FETCH.get("unreachable"):
        print(f"\nисточник не ответил на {_LAST_FETCH['unreachable']} "
              f"коллекций(ю) — библиотека пополнена НЕ ПОЛНОСТЬЮ")
        return 3
    return 0 if load_ledger() else 1


if __name__ == "__main__":
    sys.exit(main())
