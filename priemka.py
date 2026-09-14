# -*- coding: utf-8 -*-
"""ПРИЁМКА ГОТОВОГО РОЛИКА: что не так с ФАЙЛОМ, а не с прогоном.

Зачем отдельно от quality.py. Тот модуль собирает деградации, о которых
СООБЩИЛИ САМИ СТАДИИ: не ответила нейросеть, не нашлось фото, свернули на
запасной путь. Это ответ на вопрос «что пошло не так по дороге».

Но ровно те поломки, которые владелец видел глазами и на которые жаловался,
ни одна стадия не сообщала — потому что каждая отработала «успешно»:

  * замирания на 2-3 секунды, когда кончался ИИ-клип;
  * розовый цветовой сдвиг от наложения в режиме screen на цветовые
    плоскости;
  * чёрная плашка на весь кадр от потерянного заголовка;
  * обложка, нечитаемая в ленте;
  * тайм-коды в описании, не совпадающие с карточками в кадре.

Всё это находится ТОЛЬКО замером готового файла. Замер 11.08.2026: четырнадцать
таких поломок нашлись в уже ОПУБЛИКОВАННЫХ роликах — то есть порядок был
«машина собрала, человек выложил, дефект нашёлся через неделю». Этот модуль
разворачивает порядок: сначала замер, потом публикация.

Смотрит не только на картинку и звук. Вторая половина проверок — про то,
дойдёт ли зритель ДО картинки вообще: читается ли обложка в ленте шириной
210 px, зовёт ли заголовок, не спит ли первая минута. Это тоже свойства
готового файла и папки, а не рассказ конвейера о себе.

Ничего не чинит и не перерисовывает. Задача — назвать числом, что не так,
и сказать, что с этим делать. Чинить дешевле на своей стадии, а не поверх
готового файла.

Каждая проверка отвечает сама за себя: упавшая не роняет ни соседей, ни
цепочку — приёмка идёт последней в ночи, и молчание всей приёмки хуже
любого пропущенного замечания.

    python priemka.py einsturzpunkt/2026-08-10
"""
import json
import re
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path


# Окно консоли НЕ ДОЛЖНО выскакивать. Программа живёт в своём окне
# (pythonw), а каждый вызов ffmpeg, ffprobe и npx без этого флага открывает
# чёрный прямоугольник поверх всего — при рендере их сотни за ролик, и они
# перехватывают фокус, пока человек работает. Замер 2026-08-12: восемь мест
# в четырёх файлах запускали процессы без него.
CREATE_NO_WINDOW = getattr(subprocess, "CREATE_NO_WINDOW", 0)

# Порог замирания. 2 c выбраны не на глаз: жалоба владельца звучала как
# «замирает на 2-3 секунды, когда кончается ИИ-клип», а осмысленная статичная
# заставка короче двух секунд в этом конвейере не встречается.
FREEZE_S = 2.0
# Насколько цветовые плоскости могут отойти от серого (128), прежде чем это
# станет видно как оттенок.
#
# ПОРОГ ПОДНЯТ С 6 ДО 18 ПОСЛЕ ЛОЖНОГО СРАБАТЫВАНИЯ. Первый же прогон на
# настоящем ролике (fisura-critica, 12.08) дал U 120.8, V 133.3 — отклонение
# 7.2 — и приёмка назвала это КРИТИЧНЫМ. Кадр посмотрен глазами: синее небо,
# серое здание, никакого оттенка. Такой разброс даёт обычный цветокор и сам
# подбор кадров, а не поломка.
#
# Ориентир для настоящей поломки — тот розовый сдвиг, ради которого проверка
# и писалась: наложение в режиме screen на цветовые плоскости даёт
# screen(128,128) = 192, то есть +64. Восемнадцать лежит вчетверо ниже
# настоящего дефекта и вдвое выше живого разброса.
#
# Кричать зря здесь дороже, чем пропустить: приёмка идёт каждую ночь, и
# проверку, которая ошибается, перестают читать целиком.
CHROMA_DRIFT = 18.0
# Целевая громкость программы и потолок пика — те же, что держит микс.
LUFS_TARGET, LUFS_TOL, PEAK_MAX = -16.0, 2.0, -0.5

# ---------- обложка в ленте ----------
# Перепад яркости уменьшенной до 210 px копии: p95 минус p5, а НЕ max-min.
# max-min здесь не измеряет ничего: у всех девятнадцати готовых обложек трёх
# каналов он вышел 249-255, потому что упирается в один белый блик или в
# один чёрный угол. p95-p5 на тех же файлах разошёлся от 120 до 209.
# Ориентиры замерены на настоящих обложках: ровный серый бетон 127-133,
# старая обложка канала 171, кадр с выраженным предметом 184. Порог 140
# отделяет первое от второго и не задевает ни одну из нормальных.
FEED_RANGE_MIN = 140.0
# Строку текста на обложке ищем по числу переходов «светлое/тёмное» в строке
# пикселей: у текста их десятки, у горизонта или края предмета — единицы.
INK_WHITE, INK_TRANSITIONS, INK_MIN_ROWS = 200, 8, 4
# Доля кегля, которую занимает прописная буква. Нужна, чтобы перевести
# измеренную по пикселям высоту строки в тот кегль, которым строку меряет
# core.thumb_feed_report. Проверено обратным счётом: у обложки einsturzpunkt
# 10.08 самая высокая полоса текста 69 px при ширине файла 1280, и
# 69 / 0.74 * 0.164 = 15.3 px в ленте — ровно то «крупнейшее слово 15 px»,
# которое записано про эту же обложку в core.THUMB_STYLES.
CAP_RATIO = 0.74

# ---------- первые 30 секунд ----------
# Окно, за которое зритель решает, остаётся ли он. Замер аналитики
# home-vault: обрыв на 26-й секунде, минус 26 % зрителей разом.
OPEN_S = 30.0
# Порог смены плана. 0.3 из подсказки ffmpeg проверен против timeline.json
# того же ролика (там лежат настоящие границы планов): в окне 300-360 с он
# нашёл 4 границы из 7 — все растворки прошли мимо. 0.2 нашёл 7 из 7 и не
# придумал ни одной лишней. Абсолютное число всё равно остаётся оценкой
# снизу, поэтому сравниваем ТОЛЬКО замеренное с замеренным тем же способом.
SCENE_TH = 0.2
# Растворка даёт три-четыре подряд идущих кадра выше порога (замерено:
# 23.867, 23.900, 23.933). Ближе полусекунды — одна склейка, а не четыре.
SCENE_MERGE = 0.5
# Темп образца ниши, замеренный тем же фильтром: первая склейка на 1.4 с,
# 16 склеек за первые 30 с. Порог вдвое мягче образца — говорим только про
# заведомо спящее начало.
OPEN_CUTS_MIN, FIRST_CUT_MAX = 8, 3.0
# Сколько секунд смотрим ради среднего темпа по ролику. Весь файл считать
# нельзя: 19-минутный ролик стоит 2.8 минуты только на этом. Выборкой из
# шести окон по 20 с то же число обходится в 25 секунд.
PACE_WINDOWS, PACE_WIN_S = 6, 20.0

# Насколько готовый ролик может быть короче заказанного в профиле, прежде
# чем это перестанет быть округлением и станет куцыми главами.
SHORT_TOL = 0.20

# Заголовок, набравший меньше этого из четырёх элементов закона клика,
# отправлять в публикацию нельзя.
TITLE_MIN = 3

# ---------- субтитры в кадре ----------
# Порог «в кадре есть вжённая строка субтитра»: медиана по выборке кадров от
# числа переходов белое/небелое в самой «текстовой» строке пикселей.
# Замерено на контрольных клипах с ВЖЁННЫМИ субтитрами (стили pill и
# grotesk_air, тот же шрифт и кегль канала): медиана 97 и 100, минимум по
# отдельному кадру 78. На пяти готовых роликах БЕЗ вжигания: медиана 0-8.
# Порог 25 лежит посреди разрыва в четыре раза.
SUBS_INK_TH = 25
SUBS_PROBES = 7


def _run(cmd: list[str], timeout: int = 3600) -> str:
    """ffmpeg пишет измерения в stderr — возвращаем оба потока одной строкой."""
    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8",
                       errors="replace", timeout=timeout, creationflags=CREATE_NO_WINDOW)
    return (r.stdout or "") + (r.stderr or "")


def _dur(mp4: Path) -> float:
    try:
        out = _run(["ffprobe", "-v", "error", "-show_entries",
                    "format=duration", "-of", "json", str(mp4)], 120)
        return float(json.loads(out)["format"]["duration"])
    except Exception:
        return 0.0


def freezes(mp4: Path, log=print) -> list[dict]:
    """Замирания длиннее FREEZE_S. Один проход декодирования без записи."""
    out = _run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(mp4),
                "-vf", f"freezedetect=n=-60dB:d={FREEZE_S}",
                "-map", "0:v:0", "-f", "null", "-"])
    found = []
    start = None
    for m in re.finditer(r"freeze_(start|duration|end)\s*:\s*([\d.]+)", out):
        kind, val = m.group(1), float(m.group(2))
        if kind == "start":
            start = val
        elif kind == "duration" and start is not None:
            found.append({"at": start, "len": val})
            start = None
    return found


def blacks(mp4: Path) -> list[dict]:
    """Полностью чёрные куски — обычно провал между группами склейки."""
    out = _run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(mp4),
                "-vf", "blackdetect=d=0.8:pic_th=0.98",
                "-map", "0:v:0", "-f", "null", "-"])
    return [{"at": float(m.group(1)), "len": float(m.group(3))}
            for m in re.finditer(
                r"black_start:([\d.]+)\s+black_end:([\d.]+)\s+black_duration:([\d.]+)",
                out)]


def colour(mp4: Path) -> dict:
    """Средние по цветовым плоскостям. Оттенок кадра — это уход U и V от 128.

    Розовый/пурпурный, на который жаловался владелец, — этоU и V ВМЕСТЕ выше
    128: наложение в режиме screen применялось не только к яркости, но и к
    цветовым плоскостям, и screen(128,128) даёт 192.
    """
    out = _run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(mp4),
                "-vf", "signalstats,metadata=mode=print:file=-",
                "-map", "0:v:0", "-f", "null", "-"])
    u = [float(m.group(1)) for m in re.finditer(r"lavfi\.signalstats\.UAVG=([\d.]+)", out)]
    v = [float(m.group(1)) for m in re.finditer(r"lavfi\.signalstats\.VAVG=([\d.]+)", out)]
    if not u or not v:
        return {}
    return {"u": sum(u) / len(u), "v": sum(v) / len(v), "frames": len(u)}


def loudness(mp4: Path) -> dict:
    out = _run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(mp4),
                "-af", "ebur128=peak=true", "-f", "null", "-"])
    tail = out[-1800:]
    got = {}
    for key, rx in (("lufs", r"I:\s*(-?[\d.]+)\s*LUFS"),
                    ("peak", r"Peak:\s*(-?[\d.]+)\s*dBFS")):
        m = list(re.finditer(rx, tail))
        if m:
            got[key] = float(m[-1].group(1))
    return got


def chapters_vs_cards(d: Path) -> dict:
    """Совпадают ли тайм-коды в описании с карточками глав В КАДРЕ.

    Это ровно та поломка, из-за которой зритель жал «09:30» и попадал в
    середину чужой мысли: две системы жили порознь. Замер einsturzpunkt
    10.08 — совпадал 1 тайм-код из 7.
    """
    seo, over = d / "seo.txt", d / "overlays.txt"
    if not seo.exists() or not over.exists():
        return {}
    txt = seo.read_text("utf-8", errors="ignore")
    i = txt.upper().find("CHAPTERS")
    if i < 0:
        return {"chapters": 0, "cards": 0, "matched": 0}
    secs = []
    for ln in txt[i:].splitlines()[1:]:
        m = re.match(r"\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s+\S", ln)
        if not m:
            if secs:
                break
            continue
        a, b, c = m.group(1), m.group(2), m.group(3)
        secs.append(int(a) * 3600 + int(b) * 60 + int(c) if c
                    else int(a) * 60 + int(b))
    cards = []
    for ln in over.read_text("utf-8", errors="ignore").splitlines():
        p = [x.strip() for x in ln.split("|")]
        if len(p) > 2 and p[1].lower() == "titlecard":
            m = re.match(r"^(\d{1,2}):(\d{2})(?::(\d{2}))?$", p[0])
            if m:
                a, b, c = m.group(1), m.group(2), m.group(3)
                cards.append(int(a) * 3600 + int(b) * 60 + int(c) if c
                             else int(a) * 60 + int(b))
    matched = sum(1 for s in secs if any(abs(s - c) <= 5 for c in cards))
    return {"chapters": len(secs), "cards": len(cards), "matched": matched}


def _size(mp4: Path) -> tuple[int, int]:
    out = _run(["ffprobe", "-v", "error", "-select_streams", "v:0",
                "-show_entries", "stream=width,height", "-of", "json",
                str(mp4)], 120)
    s = json.loads(out)["streams"][0]
    return int(s["width"]), int(s["height"])


def _profile(d: Path) -> dict:
    """Профиль канала этого ролика.

    Канал берём из meta.json, а не из имени папки: папка называется датой, а
    лежит она внутри папки канала — но проект можно и перенести. Имя папки
    остаётся запасным путём."""
    import channels
    cid = ""
    try:
        cid = str(json.loads((d / "meta.json").read_text("utf-8"))["channel"])
    except Exception:
        pass
    return channels.get(cid) or channels.get(d.parent.name) or {}


def _first_title(d: Path) -> str:
    """Первая строка блока TITLES — та, что уйдёт в публикацию."""
    if not (d / "seo.txt").exists():
        return ""           # нечего проверять, а не «проверка упала»
    txt = (d / "seo.txt").read_text("utf-8", errors="ignore")
    i = txt.upper().find("TITLES")
    if i < 0:
        return ""
    for ln in txt[i:].splitlines()[1:]:
        s = ln.strip()
        if not s:
            continue
        if re.match(r"^[A-ZА-Я]{3,}\s*:?\s*$", s):     # начался соседний раздел
            return ""
        return re.sub(r"^\s*\d+[.)]\s*", "", s).strip()
    return ""


# ---------- 1. Обложка в ленте ----------

def _ink_bands(jpg: Path) -> tuple[list[int], int]:
    """Высоты полос ТЕКСТА на обложке и ширина файла, в пикселях.

    Ищем по числу переходов «светлое/тёмное» вдоль строки пикселей: у строки
    текста их десятки (каждая буква — два перехода), у горизонта или края
    предмета — единицы. Проверено на девятнадцати готовых обложках: полосы
    выделяются по 45-69 px и совпадают со строками заголовка на глаз.

    Меряем СВЕТЛЫЙ текст: у всех трёх каналов заголовок светлый на тёмном.
    Тёмный текст на светлом эта мера просто не увидит и вернёт пусто — и это
    правильнее, чем придумать замечание там, где мерить нечем."""
    import numpy as np
    from PIL import Image
    im = Image.open(jpg).convert("L")
    a = np.asarray(im, dtype=np.uint8)
    white = a >= INK_WHITE
    tr = np.abs(np.diff(white.astype(np.int8), axis=1)).sum(axis=1)
    rows = tr >= INK_TRANSITIONS
    out, start = [], None
    for i, r in enumerate(list(rows) + [False]):
        if r and start is None:
            start = i
        elif not r and start is not None:
            if i - start >= INK_MIN_ROWS:
                out.append(i - start)
            start = None
    return out, im.width


def _feed_range(png: Path) -> float:
    """Перепад яркости уменьшенной копии: p95 - p5."""
    import numpy as np
    from PIL import Image
    a = np.asarray(Image.open(png).convert("L"), dtype=np.float32)
    return float(np.percentile(a, 95) - np.percentile(a, 5))


def thumbs_feed(d: Path, log=print) -> list[dict]:
    """Читается ли обложка ТАМ, ГДЕ ЕЁ ВИДЯТ — в ленте шириной 210 px.

    Узкое место канала именно здесь: CTR 2,3 % при норме старта 5-8 %.
    Судить обложку по файлу 1280x720 бессмысленно — см. core.feed_preview,
    там же и уменьшение, которым пользуется зритель.

    Меряем две вещи, обе по уменьшенной копии:
      * перепад яркости — за что взгляду зацепиться в ленте;
      * кегль самой крупной строки заголовка — прочтут ли слова вообще.

    Кегль пришлось мерить по пикселям, а не звать core.thumb_feed_report:
    тот считает по ТЕКСТУ заголовка, а текст обложки в папке ролика нигде не
    сохраняется — ни отдельным файлом, ни в самом JPEG (проверено). Поэтому
    высоту строки снимаем с картинки и приводим к ширине ленты core.FEED_W,
    чтобы порог остался общим с генератором — core.FEED_MIN_FONT."""
    import core
    bad: list[dict] = []
    # Сначала — не разъехались ли числа макета с Thumbnail.tsx. Если
    # разъехались, порог ниже считает не то, что нарисовано, и об этом надо
    # сказать РАНЬШЕ, чем про сами обложки.
    drift = core.thumb_metrics_drift(lambda *a, **k: None)
    if drift:
        bad.append({
            "уровень": "мелочь",
            "что": "числа макета обложки разъехались с Thumbnail.tsx: "
                   + "; ".join(drift),
            "где": "core.THUMB_LAYOUT против remotion/src/Thumbnail.tsx",
            "делать": "проверка читаемости считает не тот кегль, который "
                      "рисуется — сверить оба места"})

    files = sorted((d / "thumbs").glob("thumb*.jpg"))
    if not files:
        return bad + [{"уровень": "критично", "что": "обложек нет",
                       "где": str(d / "thumbs"),
                       "делать": "ролик без обложки не выложить"}]

    tmp = Path(tempfile.mkdtemp(prefix="priemka_feed_"))
    flat, small = [], []
    try:
        for f in files:
            rng = _feed_range(core.feed_preview(f, tmp / (f.stem + ".png")))
            # Кегль приводим по ширине САМОГО ФАЙЛА, а не по 1280: обложка
            # может прийти и в 1920, и пересчёт по чужой ширине завысил бы
            # кегль в полтора раза.
            bands, w = _ink_bands(f)
            feed_font = (max(bands) / CAP_RATIO * (core.FEED_W / w)
                         if bands else 0.0)
            log(f"[Приёмка] {f.name}: перепад {rng:.0f}, "
                f"крупнейшая строка {feed_font:.1f} px в ленте")
            if rng < FEED_RANGE_MIN:
                flat.append(f"{f.name} {rng:.0f}")
            if bands and feed_font < core.FEED_MIN_FONT:
                small.append(f"{f.name} {feed_font:.1f} px")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    if flat:
        bad.append({
            "уровень": "заметно" if len(flat) == len(files) else "мелочь",
            "что": f"плоская картинка в ленте ({len(flat)} из {len(files)}): "
                   + ", ".join(flat) + f" при норме от {FEED_RANGE_MIN:.0f}",
            "где": str(d / "thumbs"),
            "делать": "фон без выраженного предмета и без контраста — в "
                      "ленте это серый прямоугольник; правится в промпте "
                      "фона (core.THUMB_STYLES[...]['bg'])"})
    if small:
        chars, lines, words = core.thumb_char_budget(
            _profile(d).get("palette", ""))
        bad.append({
            "уровень": "заметно",
            "что": "заголовок мельче порога ленты: " + ", ".join(small)
                   + f" при пороге {core.FEED_MIN_FONT:.0f} px",
            "где": str(d / "thumbs"),
            "делать": f"слов больше, чем влезает: бюджет канала — {chars} "
                      f"знаков в строке, до {lines} строк, до {words} слов "
                      "(core.thumb_char_budget); резать надо в концепции, а "
                      "не переносами — core.fit_headline"})
    return bad


# ---------- 2. Первые 30 секунд ----------

def _cuts(mp4: Path, start: float, length: float) -> list[float]:
    """Склейки в окне [start, start+length) — в секундах от начала ролика.

    Ищем окном, а не по всему файлу: полный проход 19-минутного ролика стоит
    2.8 минуты, а ночная приёмка идёт после всего остального."""
    out = _run(["ffmpeg", "-hide_banner", "-nostats", "-v", "error",
                "-ss", f"{start:.2f}", "-t", f"{length:.2f}", "-i", str(mp4),
                "-an", "-map", "0:v:0",
                "-vf", f"select='gt(scene,{SCENE_TH})',"
                       "metadata=mode=print:file=-",
                "-f", "null", "-"], 600)
    got: list[float] = []
    for m in re.finditer(r"pts_time:([\d.]+)", out):
        t = float(m.group(1))
        # Первые доли секунды после перемотки отбрасываем: декодер начинает с
        # опорного кадра, и первый же кадр окна регулярно объявляется сменой
        # плана. У окна с нуля отбрасывать нечего.
        if start > 0 and t < 0.3:
            continue
        if got and t - got[-1] < SCENE_MERGE:
            continue
        got.append(t)
    return [start + t for t in got]


def opening_pace(mp4: Path, total: float) -> dict:
    """Темп склеек в первые 30 с против темпа по всему ролику.

    Удержание умирает именно здесь: у home-vault обрыв на 26-й секунде,
    минус 26 % зрителей разом. Ролик-образец ниши в те же 30 секунд делает
    16 склеек и первую из них на 1.4 с.

    Средний темп считаем по выборке окон, а не по всему файлу — это разница
    между 25 секундами и 2.8 минуты на ролик."""
    opening = _cuts(mp4, 0.0, OPEN_S)
    rest, seen = [], 0.0
    if total > OPEN_S + PACE_WIN_S:
        span = total - OPEN_S - PACE_WIN_S
        for i in range(PACE_WINDOWS):
            st = OPEN_S + span * i / max(PACE_WINDOWS - 1, 1)
            rest += _cuts(mp4, st, PACE_WIN_S)
            seen += PACE_WIN_S
    return {"open": len(opening),
            "first": opening[0] if opening else None,
            "shot_all": seen / len(rest) if rest else 0.0,
            "shot_open": OPEN_S / len(opening) if opening else 0.0,
            "sampled": seen}


def slow_opening(mp4: Path, total: float, log=print) -> list[dict]:
    """Замечание по первым 30 секундам, если они спят."""
    p = opening_pace(mp4, total)
    log(f"[Приёмка] первые {OPEN_S:.0f} с: склеек {p['open']}, первая на "
        + (f"{p['first']:.1f} с" if p["first"] is not None else "—")
        + f"; средний план по выборке {p['shot_all']:.1f} с "
          f"({p['sampled']:.0f} с просмотрено)")
    why = []
    if p["open"] < OPEN_CUTS_MIN:
        why.append(f"склеек за первые {OPEN_S:.0f} с всего {p['open']} "
                   f"(у образца ниши 16)")
    if p["first"] is None or p["first"] > FIRST_CUT_MAX:
        why.append("первая склейка "
                   + (f"на {p['first']:.1f} с" if p["first"] is not None
                      else "не найдена вовсе")
                   + " (у образца на 1.4 с)")
    # Открытие, идущее МЕДЛЕННЕЕ середины, — отдельный довод, и он не зависит
    # от чужого образца: ролик здесь сам себе мера.
    if (p["shot_all"] and p["shot_open"]
            and p["shot_open"] > p["shot_all"] * 1.3):
        why.append(f"план в начале {p['shot_open']:.1f} с против "
                   f"{p['shot_all']:.1f} с по ролику — начало медленнее "
                   "середины")
    if not why:
        return []
    return [{
        "уровень": "заметно",
        "что": "первые 30 секунд спят: " + "; ".join(why),
        "где": f"{mp4.name}, 0:00-0:{int(OPEN_S):02d}",
        "делать": "именно здесь уходит зритель (замер: обрыв на 26-й "
                  "секунде, минус 26 %). Первые планы резать короче и первую "
                  "склейку ставить в первые пару секунд — это решается в "
                  "плане монтажа, а не поверх готового файла"}]


# ---------- 3. Длительность против заказа ----------

def short_vs_order(d: Path, total: float) -> list[dict]:
    """Готовый ролик короче заказанного в профиле канала.

    Профиль просит N минут не от красоты: длина — это единица сравнения с
    каналом-образцом. Ролик, вышедший вдвое короче заказа, — это не «чуть
    компактнее», а главы, вернувшиеся куцыми, и никакая стадия про это не
    сообщит: каждая вернула текст, каждая отработала успешно."""
    prof = _profile(d)
    try:
        want = float(prof.get("minutes") or 0) * 60
    except (TypeError, ValueError):
        want = 0.0
    if want <= 0 or total <= 0:
        return []
    if total >= want * (1 - SHORT_TOL):
        return []
    return [{
        "уровень": "заметно",
        "что": f"ролик {total/60:.1f} мин при заказанных "
               f"{want/60:.0f} ({(1 - total/want)*100:.0f} % недобора)",
        "где": f"профиль канала {prof.get('id') or d.parent.name}, "
               f"поле minutes",
        "делать": "столько недобирают не паузы, а главы: сверь число глав в "
                  "seo.txt с планом и посмотри, какая вернулась короткой"}]


# ---------- 4. Заголовок ----------

def title_score(d: Path) -> list[dict]:
    """Сколько из четырёх элементов закона клика есть в ОПУБЛИКУЕМОМ
    заголовке — в первой строке блока TITLES.

    Язык обязательно передаём из профиля. Без него счёт идёт по английским
    словарям, и немецкое «Warum stürzte diese brandneue Brücke ein?» —
    заведомые 4 из 4 — получает 1 из 4 и ложное замечание. Проверено на этом
    самом заголовке: с языком (4, []), без языка (1, [...])."""
    import core
    title = _first_title(d)
    if not title:
        return []
    lang = _profile(d).get("lang") or "английский"
    n, miss = core.title_click_score(title, lang)
    if n >= TITLE_MIN:
        return []
    return [{
        "уровень": "заметно",
        "что": f"заголовок набирает {n} из 4 по закону клика "
               f"({', '.join(miss)}): «{title}»",
        "где": f"seo.txt, блок TITLES, строка 1 (язык {lang})",
        "делать": "в публикацию уходит именно эта строка — переставь на неё "
                  "лучший из соседних вариантов или перепроси заголовки"}]


# ---------- 5. Субтитры в кадре ----------

def _srt_cues(p: Path) -> list[tuple[float, float]]:
    rx = re.compile(r"(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*"
                    r"(\d{2}):(\d{2}):(\d{2})[,.](\d{3})")
    out = []
    for m in rx.finditer(p.read_text("utf-8", errors="ignore")):
        g = [int(x) for x in m.groups()]
        out.append((g[0] * 3600 + g[1] * 60 + g[2] + g[3] / 1000,
                    g[4] * 3600 + g[5] * 60 + g[6] + g[7] / 1000))
    return out


def _plate_windows(p: Path) -> list[tuple[float, float, str, str]]:
    """Плашки из overlays.txt: (начало, конец, тип, позиция)."""
    out = []
    for ln in p.read_text("utf-8", errors="ignore").splitlines():
        q = [x.strip() for x in ln.split("|")]
        if len(q) < 5:
            continue
        m = re.match(r"^(\d{1,2}):(\d{2})(?::(\d{2}))?$", q[0])
        if not m:
            continue
        a, b, c = m.group(1), m.group(2), m.group(3)
        t = (int(a) * 3600 + int(b) * 60 + int(c) if c
             else int(a) * 60 + int(b))
        try:
            dur = float(re.sub(r"[^\d.]", "", q[4]) or 4)
        except ValueError:
            dur = 4.0
        out.append((float(t), t + dur, q[1].lower(), q[3].lower()))
    return out


def _ink_line(mp4: Path, t: float, w: int, h: int) -> int:
    """Насколько «текстовая» самая текстовая строка пикселей в этом кадре.

    Смотрим две полосы: низ (там лежат все стили субтитров) и верх (там
    лежит стиль top). Берём большее из двух.

    Приводим к ширине 1920, на которой порог и замерен: на кадре вдвое шире
    та же строка текста дала бы вдвое больше переходов, и порог поехал бы
    вместе с разрешением."""
    import numpy as np
    out = subprocess.run(
        ["ffmpeg", "-v", "error", "-ss", f"{t:.2f}", "-i", str(mp4),
         "-frames:v", "1", "-vf", "format=gray", "-f", "rawvideo", "-"],
        capture_output=True, timeout=120, creationflags=CREATE_NO_WINDOW).stdout
    if len(out) < w * h:
        return 0
    a = np.frombuffer(out[:w * h], dtype=np.uint8).reshape(h, w)
    white = a >= 235
    tr = np.abs(np.diff(white.astype(np.int8), axis=1)).sum(axis=1)
    lo, hi = tr[int(h * 0.66):], tr[:int(h * 0.18)]
    best = max(np.sort(lo)[-6:].mean(), np.sort(hi)[-6:].mean())
    return int(best * 1920 / max(w, 1))


def subs_in_frame(d: Path, mp4: Path, log=print) -> list[dict]:
    """Есть ли субтитры В КАДРЕ и не лежит ли на них плашка.

    Зачем вообще смотреть глазами машины, а не в настройку. С 07.08 по 12.08
    галочка «Вшить субтитры» стояла снятой в разметке страницы, её состояние
    уезжало и в ночные прогоны — двадцать роликов подряд вышли без субтитров
    при subs_on: true у всех каналов. Настройка говорила «да», файл выходил
    «нет», и заметили это через пять дней. Спрашивать надо картинку.

    Мера — число переходов белое/небелое в самой текстовой строке пикселей,
    медиана по выборке кадров. Кадры берём внутри реплик и НЕ БЛИЖЕ полутора
    секунд к любой плашке из overlays.txt: плашка тоже текст, и без этого
    отступа отдельные кадры давали 271 там, где субтитров нет вовсе.

    Наложение плашки на субтитр проверяем только у banner и только когда
    субтитры в кадре действительно есть. Почему так узко — замер: у lower3
    объявленная позиция «bottom» и настоящая не совпадают, у estoico-es эта
    плашка встала на середине кадра, у einsturzpunkt на 78 % высоты, а
    полоса субтитров у их стилей начинается ниже 84 %. То есть общий ответ
    «bottom пересекается с субтитрами» дал бы 38 ложных замечаний на один
    ролик. У banner позиция объявлена «top» принудительно, и проверка здесь
    сторожит возврат поломки, а не ищет её заново."""
    srt = d / "subs" / "voiceover.srt"
    # ПУСТОЙ ОТВЕТ ЗДЕСЬ ОЗНАЧАЛ «ПРЕТЕНЗИЙ НЕТ» — и проверка оказывалась
    # слепа ровно к тому, ради чего поставлена. Её докстрока выше про это
    # и написана: с 07.08 по 12.08 двадцать роликов подряд вышли без
    # субтитров, и заметили через пять дней. Но если субтитров нет ВОВСЕ,
    # прежний код молча отвечал «всё хорошо» — то есть сторож не видел
    # своего же худшего случая.
    if not srt.exists():
        return [{"уровень": "критично", "что": "субтитров нет — проверить нечем",
                 "где": str(srt),
                 "делать": "шаг субтитров не отработал; ролик выйдет "
                           "без них, а проверка про это молчала"}]
    if not mp4.exists():
        return [{"уровень": "критично", "что": "готового ролика нет",
                 "где": str(mp4),
                 "делать": "рендер не дошёл до конца — смотри журнал"}]
    cues = _srt_cues(srt)
    if not cues:
        return [{"уровень": "заметно", "что": "файл субтитров пуст",
                 "где": str(srt),
                 "делать": "распознавание вернуло ноль реплик"}]
    plates = (_plate_windows(d / "overlays.txt")
              if (d / "overlays.txt").exists() else [])
    free = [(a + b) / 2 for a, b in cues
            if all(not (s - 1.5 <= (a + b) / 2 <= e + 1.5)
                   for s, e, _, _ in plates)]
    if not free:
        return []
    w, h = _size(mp4)
    step = max(1, len(free) // SUBS_PROBES)
    marks = sorted(_ink_line(mp4, t, w, h) for t in free[::step][:SUBS_PROBES])
    med = marks[len(marks) // 2]
    log(f"[Приёмка] субтитры в кадре: мера {med} при пороге {SUBS_INK_TH}")

    if med < SUBS_INK_TH:
        prof = _profile(d)
        if not prof.get("subs_on", True):
            return []           # канал их и не заказывал
        return [{
            "уровень": "заметно",
            "что": f"субтитров в кадре нет (мера {med} при пороге "
                   f"{SUBS_INK_TH}), хотя в профиле subs_on: true",
            "где": f"{mp4.name} против профиля канала "
                   f"{prof.get('id') or d.parent.name}",
            "делать": "текст реплик собран (subs/voiceover.srt на месте), а "
                      "в картинку не попал — значит выключил их не профиль, "
                      "а параметр прогона; смотреть params['subs']"}]

    bad = []
    low = [s for s, e, k, pos in plates
           if k == "banner" and pos != "top"
           and any(cs < e and s < ce for cs, ce in cues)]
    if low:
        s = low[0]
        bad.append({
            "уровень": "заметно",
            "что": f"плашек banner не наверху: {len(low)}, и все они попадают "
                   "во время, когда идёт субтитр",
            "где": f"overlays.txt, первая на "
                   f"{int(s//60)}:{int(s%60):02d}",
            "делать": "banner прижат к верху именно ради субтитра — вернуть "
                      "позицию top (overlays.OVL_POS)"})
    return bad


def check(project: Path, log=print) -> list[dict]:
    """Все проверки по папке проекта. Возвращает список замечаний.

    Каждая проверка идёт через stage(): упавшая пишет строку в журнал и
    возвращает пусто. Так надо не для красоты — приёмка стоит ПОСЛЕДНЕЙ в
    ночи, и исключение в измерителе обложки не должно уносить с собой ни
    замер звука, ни всю цепочку. Молчащая приёмка хуже пропущенного
    замечания: её молчание читается как «претензий нет».

    В конце пишет, сколько секунд стоила каждая проверка. Ночь считает
    минуты, и цена приёмки должна быть видна без секундомера."""
    d = Path(project)
    mp4 = d / "output_final.mp4"
    bad: list[dict] = []
    if not mp4.exists():
        return [{"уровень": "критично", "что": "готового файла нет",
                 "где": str(mp4), "делать": "ролик не собран"}]

    total = _dur(mp4)
    log(f"[Приёмка] {d.name}: {total/60:.1f} мин, смотрю файл…")
    spent: dict[str, float] = {}

    def stage(name: str, fn) -> list[dict]:
        t0 = time.time()
        try:
            got = fn() or []
        except Exception as e:
            log(f"[Приёмка] проверка «{name}» не отработала: "
                f"{type(e).__name__}: {e}")
            got = []
        spent[name] = time.time() - t0
        return got

    def _freezes() -> list[dict]:
        fz = freezes(mp4, log)
        if not fz:
            return []
        worst = max(fz, key=lambda x: x["len"])
        return [{
            "уровень": "заметно",
            "что": f"замираний {len(fz)}, самое долгое {worst['len']:.1f} с",
            "где": f"на {int(worst['at']//60)}:{int(worst['at']%60):02d}",
            "делать": "кончился ИИ-клип, а план длиннее — проверь "
                      "tpad/boomerang в render.py"}]

    def _blacks() -> list[dict]:
        bl = blacks(mp4)
        if not bl:
            return []
        return [{
            "уровень": "критично",
            "что": f"чёрных провалов {len(bl)}",
            "где": f"на {int(bl[0]['at']//60)}:{int(bl[0]['at']%60):02d}",
            "делать": "провал между группами склейки — смотри concat "
                      "в render.py"}]

    def _colour() -> list[dict]:
        c = colour(mp4)
        if not c:
            return []
        du, dv = c["u"] - 128, c["v"] - 128
        if abs(du) <= CHROMA_DRIFT and abs(dv) <= CHROMA_DRIFT:
            return []
        tint = ("розовый/пурпурный" if du > 0 and dv > 0 else
                "зелёный" if du < 0 and dv < 0 else "смещённый")
        return [{
            "уровень": "критично",
            "что": f"цветовой сдвиг {tint}: U {c['u']:.1f}, V {c['v']:.1f} "
                   f"при норме 128",
            "где": "весь ролик",
            "делать": "наложение в режиме screen ушло на цветовые "
                      "плоскости — только по яркости"}]

    def _loudness() -> list[dict]:
        ld = loudness(mp4)
        out = []
        if (ld.get("lufs") is not None
                and abs(ld["lufs"] - LUFS_TARGET) > LUFS_TOL):
            out.append({
                "уровень": "заметно",
                "что": f"громкость {ld['lufs']:.1f} LUFS при цели "
                       f"{LUFS_TARGET}",
                "где": "весь ролик",
                "делать": "YouTube всё равно приведёт к своей норме, но тихий "
                          "ролик проиграет соседям до нормализации"})
        if ld.get("peak") is not None and ld["peak"] > PEAK_MAX:
            out.append({
                "уровень": "заметно",
                "что": f"пик {ld['peak']:.1f} dBFS — близко к перегрузу",
                "где": "весь ролик",
                "делать": "убавь громкость музыки или атмосферы"})
        return out

    def _chapters() -> list[dict]:
        ch = chapters_vs_cards(d)
        if not ch or not ch.get("chapters"):
            return []
        if ch["matched"] >= ch["chapters"]:
            return []
        return [{
            "уровень": "заметно",
            "что": f"из {ch['chapters']} глав в описании подтверждены "
                   f"карточкой в кадре только {ch['matched']}",
            "где": "описание против overlays.txt",
            "делать": "зритель жмёт тайм-код и не видит подтверждения — "
                      "core.apply_chapters должен отработать до рендера"}]

    bad += stage("замирания", _freezes)
    bad += stage("чёрные провалы", _blacks)
    bad += stage("цветовой сдвиг", _colour)
    bad += stage("громкость", _loudness)
    bad += stage("главы против карточек", _chapters)
    bad += stage("обложка в ленте", lambda: thumbs_feed(d, log))
    bad += stage("первые 30 с", lambda: slow_opening(mp4, total, log))
    bad += stage("длина против заказа", lambda: short_vs_order(d, total))
    bad += stage("заголовок", lambda: title_score(d))
    bad += stage("субтитры в кадре", lambda: subs_in_frame(d, mp4, log))

    log("[Приёмка] время проверок, с: " + ", ".join(
        f"{k} {v:.0f}" for k, v in sorted(spent.items(),
                                          key=lambda x: -x[1])))
    return bad


def report(bad: list[dict]) -> str:
    if not bad:
        return "[Приёмка] Замечаний нет — ролик можно выкладывать."
    order = {"критично": 0, "заметно": 1, "мелочь": 2}
    bad = sorted(bad, key=lambda x: order.get(x["уровень"], 9))
    out = [f"[Приёмка] Замечаний: {len(bad)}"]
    for b in bad:
        out.append(f"  • {b['уровень'].upper()}: {b['что']}")
        out.append(f"      где: {b['где']}")
        out.append(f"      что делать: {b['делать']}")
    return "\n".join(out)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        raise SystemExit(2)
    print(report(check(Path(sys.argv[1]))))
