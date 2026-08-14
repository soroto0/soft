#!/usr/bin/env python3
"""
Авторендер чернового mp4 из материалов проекта.

Конвейер:
  1. build_render_plan  — сцены по таймкодам srt с ритм-логикой (вариация
     длительностей, перебивки, динамичный старт, seed на проект)
  2. render_segment     — каждый план в отдельный mp4-сегмент с движением
     внутри кадра (Ken Burns / drift / push-in / shake для картинок,
     обрезка для видео)
  3. render_group       — склейка сегментов группами по GROUP_SIZE через
     xfade (пул переходов, взвешенный выбор, без повторов подряд)
  4. assemble           — конкат групп + озвучка + вшитые субтитры +
     стилевые слои (зерно/виньетка/letterbox/VHS)

Выход: output_final.mp4 в папке проекта.
"""

import os
import re
import json
import time
import random
import shutil
import zlib
import wave
import struct
import math
import threading
import subprocess
from collections import deque
from pathlib import Path

from core import (srt_to_seconds, parse_srt, load_whisper_words, audio_duration,
                  CREATE_NO_WINDOW, sound_palette_of, voice_track,
                  # run_tree зовётся в _bake_overlays, но в этот список не
                  # входил — и запекание падало с NameError КАЖДЫЙ раз. Замер
                  # по app.log 2026-08-05 00:19:51: «Запекание не вышло (name
                  # 'run_tree' is not defined)», следом «Оверлеев 91, беру
                  # первые 78». То есть весь смысл запекания (не терять
                  # плашки) не работал ни разу с момента написания, а наружу
                  # это выходило одной строкой warn.
                  run_tree)

CONSOLE = None  # хук GUI: сюда льётся живой вывод ffmpeg (кадр/время/скорость)
CANCEL = threading.Event()  # кнопка «Стоп»: убивает текущий ffmpeg и рендер


def _console(msg: str):
    if CONSOLE:
        try:
            CONSOLE(msg)
        except Exception:
            pass

RESOLUTIONS = {
    "1080p": (1920, 1080),
    "4K": (3840, 2160),
    # ВЕРТИКАЛЬ ДЛЯ SHORTS. Кадр 1080x1920 — то, что YouTube, TikTok и
    # Reels показывают на весь экран телефона; горизонтальный ролик в
    # ленте Shorts ужимается в полоску посередине и пролистывается.
    #
    # Зачем вообще. Поиск прорвавшихся каналов (2026-08-08) вернул 82
    # штуки, и почти все жили на Shorts: Value Crafts — 2 950
    # подписчиков против 18.5 млн просмотров, лучший ролик 6.6 млн. У
    # длинных роликов той же ниши разрыв на порядок скромнее.
    #
    # Своя цена у формата тоже есть, и она не в пикселях: Shorts — не
    # короткая версия ролика, а другой продукт. Одна мысль вместо главы,
    # крючок в первые ДВЕ секунды, склейка каждые 1-2 с, и смотрят его
    # без звука — значит текст в кадре обязателен.
    "shorts": (1080, 1920),
}


def is_vertical(resolution: str) -> bool:
    """Вертикальный ли формат. Нужно в трёх местах: заказ кадров у Veo
    (там свой ключ aspect_ratio), вёрстка плашек и раскладка субтитров."""
    w, h = RESOLUTIONS.get(resolution, (1920, 1080))
    return h > w


def aspect_of(resolution: str) -> str:
    """Соотношение сторон строкой — в том виде, в каком его просит Veo."""
    return "9:16" if is_vertical(resolution) else "16:9"
GROUP_SIZE = 8          # сегментов в одной xfade-команде

# Запас в конце входа xfade, секунды. Ровно на границе (offset+duration ==
# длина первого входа) фильтр отдаёт обрубок и МОЛЧИТ — ffmpeg завершается
# с кодом 0. Замерено: вход 4.000 с, offset 3.967 + duration 0.033 дали на
# выходе 4.33 с вместо 8.23; offset 3.900 (запас 2 кадра) — верные 8.17.
# 0.1 с это три кадра при 30 fps, с запасом на округление таймбазы.
XFADE_GUARD = 0.1

# ---- Дотяжка коротких клипов (см. _fill_gap) ----
# Длительность плана задаёт озвучка, а ИИ-клип выдаётся фиксированной длины
# (8 с у Veo, 5 с у части моделей). Разницу раньше закрывал
# tpad=stop_mode=clone — то есть застывший последний кадр. Замерено на
# готовых роликах 2026-08-05: abyss — 56 планов из 86 с паузой, суммарно
# 105.8 с заморозки; home-vault — 106 из 138, 192.6 с. Это те самые «паузы
# на 2-3 секунды, когда ИИ-видео заканчивается».
FILL_SLOW_SOFT = 1.15   # замедление, которого глаз не ловит (24 fps -> ~21)
FILL_SLOW_MAX = 1.6     # дальше дубли кадров уже читаются как рывки
# Сколько секунд материала разрешено развернуть назад. Ограничение не
# художественное, а по памяти: фильтр reverse держит ВЕСЬ разворачиваемый
# кусок в RAM распакованными кадрами (~3 МБ на кадр 1080p), 3 с при 30 fps
# это ~280 МБ. Что не влезло в бумеранг — добирается замедлением.
FILL_TAIL_MAX = 3.0

CRF_SEGMENT = "18"      # качество/пресеты подменяются в черновом режиме
CRF_FINAL = "19"
PRESET_SEG = "fast"
PRESET_FINAL = "medium"

_HW_ENCODER: str | None = None      # кэш результата проверки (None = не проверяли)
_HW_DISABLED = False                # «выключено навсегда» переживает гонку проверок
# Почему аппаратного пути нет. Хранится ОТДЕЛЬНО от кэша результата, потому
# что проверка делается один раз на процесс, а ролик за ночь собирается не
# один: без этой строки предупреждение попадало бы в сводку только первого
# ролика, а второй и третий выглядели бы так, будто с видеокартой всё хорошо.
_HW_FAIL_REASON = ""
_HW_BY_USER = False                 # выключено человеком (HW_ENCODE=0), не сбой


def _hw_report() -> None:
    """Сказать в сводку ЭТОГО ролика, что видеокарта в рендере не участвует.

    Зовётся при каждой выдаче пустого кодировщика, а не только в момент
    проверки. quality.degraded схлопывает одинаковые записи, так что лишних
    строк это не даёт."""
    if not _HW_FAIL_REASON or _HW_BY_USER:
        return
    import quality
    quality.degraded(
        "Рендер", "видеокарта в рендере не участвует, всё считает процессор",
        why=_HW_FAIL_REASON,
        hint="если видеокарта NVIDIA есть — обнови драйвер и закрой другие "
             "программы, кодирующие видео. Промежуточные проходы это самая "
             "долгая часть рендера, на процессоре ждать в разы дольше",
        level="мелочь")


def hw_encoder() -> str:
    """Имя доступного аппаратного кодировщика ("h264_nvenc") или "" если его
    нет. Проверяется РЕАЛЬНЫМ пробным кодированием, а не наличием в списке
    ffmpeg -encoders: сборка ffmpeg почти всегда собрана с nvenc/qsv/amf, но
    это флаги компиляции, а не наличие железа. На машине без подходящей
    видеокарты вызов упадёт, и мы честно вернём "".

    Отключается принудительно через HW_ENCODE=0 в .env.
    Результат кэшируется — проверка стоит ~1 с."""
    global _HW_ENCODER, _HW_FAIL_REASON, _HW_BY_USER
    if _HW_DISABLED:
        _hw_report()
        return ""
    if _HW_ENCODER is not None:
        if not _HW_ENCODER:
            _hw_report()
        return _HW_ENCODER
    # пустое значение = «не задано» -> берём умолчание (как _env_switch в core)
    flag = os.getenv("HW_ENCODE", "").strip().lower()
    if flag in ("0", "false", "no", "off"):
        # Это выбор человека, а не отказ железа — в деградации не пишем, но
        # вслух говорим: иначе «почему видеокарта простаивает» приходится
        # выяснять чтением .env.
        _console("[Рендер] Аппаратное кодирование выключено вручную "
                 "(HW_ENCODE=0 в .env) — считает процессор")
        _HW_BY_USER = True
        _HW_FAIL_REASON = "выключено вручную: HW_ENCODE=0 в .env"
        _HW_ENCODER = ""
        return _HW_ENCODER
    # Причину отказа КАЖДОГО кандидата запоминаем. Раньше здесь стоял голый
    # `except: continue`, и на машине с работающей GeForce отказ NVENC (занятые
    # сессии, старый драйвер, ffmpeg без поддержки) выглядел ровно как
    # отсутствие видеокарты: пустая строка, ни слова в журнале. Владелец три
    # дня считал, что рендер идёт на видеокарте, пока тот шёл на процессоре.
    why: list[str] = []
    for enc in ("h264_nvenc", "h264_qsv", "h264_amf"):
        try:
            r = subprocess.run(
                ["ffmpeg", "-hide_banner", "-loglevel", "error", "-f", "lavfi",
                 "-i", "color=c=black:s=256x144:d=0.1", "-c:v", enc,
                 "-f", "null", "-"],
                capture_output=True, text=True, timeout=10,
                creationflags=CREATE_NO_WINDOW)
            if r.returncode == 0:
                if _HW_DISABLED:      # пока шла проверка, кодировщик отключили
                    return ""
                _HW_ENCODER = enc
                _console(f"[Рендер] Аппаратное кодирование: {enc}")
                return _HW_ENCODER
            # Берём ПЕРВЫЕ строки stderr, а не последние: при -loglevel error
            # ffmpeg сначала печатает настоящую причину («Cannot load
            # nvcuda.dll», «No capable devices found», «OpenEncodeSessionEx
            # failed: out of memory»), а последней — общее «Error initializing
            # output stream», по которому ничего не понять.
            tail = (r.stderr or "").strip().splitlines()
            why.append(f"{enc}: " + (" | ".join(tail[:2])[:200] if tail
                                     else f"код {r.returncode}"))
        except Exception as e:
            why.append(f"{enc}: {e.__class__.__name__}: {str(e)[:120]}")
    _HW_ENCODER = ""
    _HW_FAIL_REASON = "; ".join(why) or "ни один кандидат не запустился"
    _console("[Рендер] Аппаратного кодирования НЕТ — весь рендер считает "
             f"процессор. Почему: {_HW_FAIL_REASON}")
    _hw_report()
    return _HW_ENCODER


# Ниже этого остатка сборку продолжать нельзя: следующая группа успеет добрать
# место до нуля, и вместо одной понятной ошибки выйдет каскад из отказа
# видеокарты, провала переходов и трёх упавших каналов подряд. Пять гигабайт —
# это примерно две группы восьмисекундных сцен с запасом.
DISK_FLOOR_GB = float(os.getenv("RENDER_DISK_FLOOR_GB", "5"))

# Диск, на котором лежит софт: на него же пишутся и проекты, и render_tmp.
# Нужен, чтобы спросить остаток места из мест, где папки проекта под рукой нет
# (например, из _run — он видит только команду ffmpeg).
BASE_ANCHOR = Path(__file__).resolve().anchor


def disable_hw(reason: str = "", where: str = "") -> None:
    """Выключает аппаратный путь до конца процесса. Нужно при отказе на
    лету: у GeForce жёсткий лимит одновременных сессий NVENC, и когда
    сегменты пойдут параллельно, лишние просто не закодируются. Без этого
    отката вызывающий уходил в _placeholder, то есть в ЧЁРНЫЙ КАДР.

    reason — ТЕКСТ ОШИБКИ ffmpeg, а не имя сегмента. Раньше сюда приходила
    метка («seg_042»), и журнал отвечал на вопрос «где», но не «почему»:
    строка «аппаратное кодирование отключено: seg_042» одинаково выглядит и
    при занятых сессиях NVENC, и при слетевшем драйвере, и при битом файле.
    where — метка, чтобы не потерять и «где» тоже.
    """
    global _HW_ENCODER, _HW_DISABLED, _HW_FAIL_REASON
    # ДИСК КОНЧИЛСЯ — это не отказ видеокарты, и путать их дорого. В ночь
    # 2026-08-09 место кончилось на 130 сегментах, ffmpeg ответил «No space
    # left on device», и софт объявил это отказом NVENC: выключил аппаратный
    # путь до конца процесса, посоветовал «закрой другие программы, которые
    # кодируют видео» и пошёл на процессор — где немедленно упал с той же
    # ошибкой. Утром в сводке значилось «видеокарта в рендере не участвует
    # ×13», а настоящая причина стояла одной строкой ниже.
    if "No space left" in reason or "Errno 28" in reason:
        _console("[Рендер] На диске кончилось место — это НЕ отказ видеокарты. "
                 "Аппаратный путь не выключаю, освободи место и повтори")
        import quality
        quality.degraded(
            "Рендер", "на диске кончилось место — рендер оборван",
            why=reason[:200],
            hint="освободи место на диске C: во время сборки render_tmp "
                 "занимает десятки гигабайт и удаляется только после успеха",
            level="критично")
        return
    _HW_DISABLED = True
    if _HW_ENCODER:
        _HW_FAIL_REASON = (f"отказал на лету{' (' + where + ')' if where else ''}"
                           f"{': ' + reason if reason else ''}")
        _console(f"[Рендер] Аппаратное кодирование отключено — {_HW_FAIL_REASON}"
                 ". Перехожу на процессор (libx264): картинка та же, но "
                 "промежуточные проходы это самая долгая часть рендера, и "
                 "теперь их считает процессор — ждать в разы дольше")
        # Картинка от этого не портится (финал и так всегда libx264), но
        # рендер разом становится в разы дольше — а причина терялась.
        import quality
        quality.degraded(
            "Рендер", "промежуточные проходы считает процессор, а не видеокарта",
            why=_HW_FAIL_REASON,
            hint="у GeForce жёсткий лимит одновременных сессий NVENC — "
                 "закрой другие программы, которые кодируют видео. Рендер от "
                 "этого не портится, но идёт в разы дольше",
            level="мелочь")
    _HW_ENCODER = ""


# Цветовые метки на КАЖДОМ выходном файле рендера.
#
# Материал приходит в трёх разных цветовых пространствах, и это замер, а не
# предположение: в раскадровке одного ролика 250 клипов без меток, 83 клипа
# yuvj420p/pc/bt470bg (это кадры, собранные из фотографий: JPEG отдаёт полный
# диапазон и матрицу BT.601) и 29 клипов yuv420p/tv/bt709. Всё это лежало на
# одной дорожке, никто не приводил их к общему виду, и готовый ролик наследовал
# метку первого попавшегося входа — BT.601 с полным диапазоном.
#
# Что видит зритель: картинку, посчитанную по BT.709, показывают через матрицу
# BT.601. Даёт равномерный розово-сиреневый налив по всему кадру и уход зелени
# в кислотный — ровно та жалоба, с которой это и нашлось. На отдельных кадрах
# ошибку не поймать: если писать PNG прямо из фильтра, метка не участвует и
# кадр выходит нормальным. Видно только в собранном файле.
COLOR_TAGS = ["-color_range", "tv", "-colorspace", "bt709",
              "-color_primaries", "bt709", "-color_trc", "bt709"]

# Приведение к тем же меткам внутри фильтра. Ставится в хвост КАЖДОГО сегмента:
# метки на кодировщике только подписывают файл, а сами пиксели пересчитать
# обязан scale — иначе подпись «bt709» окажется враньём поверх данных BT.601,
# и сдвиг никуда не денется.
COLOR_FIX = ("scale=in_range=auto:out_range=tv:"
             "in_color_matrix=auto:out_color_matrix=bt709")


def venc_args(crf: str, preset: str, final: bool = False) -> list[str]:
    """Аргументы кодировщика: аппаратный, если есть, иначе libx264.
    NVENC не понимает -crf/-preset от x264: у него -cq и свои пресеты
    (p1 самый быстрый .. p7 самый качественный).

    ФИНАЛЬНЫЙ проход всегда идёт через libx264: именно он определяет
    качество готового ролика, а x264 при равном размере даёт лучшую
    картинку, чем NVENC. Аппаратный кодировщик экономит время только на
    промежуточных сегментах и группах, которые всё равно перекодируются."""
    enc = "" if final else hw_encoder()
    if not enc:
        return ["-c:v", "libx264", "-preset", preset, "-crf", crf] + COLOR_TAGS
    if enc == "h264_nvenc":
        return ["-c:v", enc, "-preset", "p2", "-rc", "vbr", "-cq", crf,
                "-b:v", "0"] + COLOR_TAGS
    if enc == "h264_qsv":
        return ["-c:v", enc, "-global_quality", crf] + COLOR_TAGS
    return ["-c:v", enc, "-rc", "cqp", "-qp_i", crf,
            "-qp_p", crf] + COLOR_TAGS


# ---------- Синтезированные SFX (whoosh/pop/ding на появление оверлеев) ----------

SFX_DIR = Path(__file__).parent / "assets" / "sfx"
SFX_SR = 44100

# Какой звук на какой тип оверлея. watermark — без звука: это фоновый
# неисчезающий бейдж, а не эпизодическое появление (см. overlays.py).
SFX_FOR_TYPE = {
    "popup": "pop", "counter": "ding", "callout": "pop",
    "banner": "whoosh", "titlecard": "whoosh", "lower3": "whoosh",
    "compare": "whoosh", "collage": "whoosh",
    "bars": "ding", "timeline": "ding", "infographic": "whoosh",
    # Эти семь появились позже таблицы и остались НЕМЫМИ: тип рисуется, а
    # звука под ним нет. На замеренном плане (378 оверлеев на 54 минуты)
    # они составляют заметную долю, то есть беззвучным выходил каждый
    # третий-четвёртый появляющийся элемент — при включённой галке «звуки».
    # Звук подобран по характеру движения: выезжает — whoosh, щёлкает или
    # ставится на место — pop, встаёт число или итог — ding.
    "kinetic": "whoosh", "quote": "whoosh", "gallery": "whoosh",
    "stamp": "pop", "redact": "pop", "marker": "pop",
    "highlight": "pop",
}


def _sfx_write_wav(samples: list[float], path: Path, sr: int = SFX_SR):
    path.parent.mkdir(parents=True, exist_ok=True)
    frames = b"".join(struct.pack("<h", max(-32768, min(32767, int(s * 32767))))
                      for s in samples)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(frames)


def _sfx_whoosh(dur: float = 0.30, sr: int = SFX_SR) -> list[float]:
    """Шум с растущей яркостью (однополюсный ФНЧ со срезом, растущим во
    времени) под огибающую быстрая атака/плавный спад — «свист» появления."""
    n = int(dur * sr)
    rng = random.Random(1)
    out, prev = [], 0.0
    for i in range(n):
        t = i / n
        env = math.sin(math.pi / 2 * min(t / 0.12, 1.0)) if t < 0.12 \
            else math.exp(-(t - 0.12) * 6.5)
        cutoff = 0.04 + 0.55 * t
        prev += cutoff * (rng.uniform(-1, 1) - prev)
        out.append(prev * env * 0.5)
    return out


def _sfx_pop(dur: float = 0.09, sr: int = SFX_SR) -> list[float]:
    """Короткий щелчок — синус с очень быстрым экспоненциальным спадом."""
    n = int(dur * sr)
    freq = 900.0
    return [math.sin(2 * math.pi * freq * (i / sr)) * math.exp(-(i / sr) * 45) * 0.7
            for i in range(n)]


def _sfx_ding(dur: float = 0.8, sr: int = SFX_SR) -> list[float]:
    """Колокольчик — основной тон + 2 негармоничных обертона (соотношения
    как у настоящего колокола), экспоненциальный спад."""
    n = int(dur * sr)
    freq = 1100.0
    out = []
    for i in range(n):
        t = i / sr
        env = math.exp(-t * 4.2)
        s = (math.sin(2 * math.pi * freq * t)
             + 0.5 * math.sin(2 * math.pi * freq * 2.41 * t)
             + 0.25 * math.sin(2 * math.pi * freq * 3.76 * t))
        out.append(s * env * 0.28)
    return out


def sfx_pool(role: str) -> list[Path]:
    """Готовые эффекты этой роли из библиотеки (assets/sfx/ready).

    Пусто — значит библиотека не скачана, и всё работает как раньше, на
    трёх синтезированных звуках. Наполняется через sfx_library.py.
    """
    d = SFX_DIR / "ready"
    if not d.is_dir():
        return []
    return sorted(p for p in d.glob(f"{role}_*.wav") if p.stat().st_size > 2000)


def pick_sfx(role: str, index: int) -> str:
    """Какой именно звук роли поставить на этот по счёту оверлей.

    Раньше на роль был ОДИН файл, и замер по готовому ролику показал:
    «вжух» звучал 59 раз за 13.6 минуты, каждые 14 секунд. Самая частая
    КАРТИНКА повторялась 6.5 раз — то есть на слух ролик бил в одну ноту
    в девять раз назойливее, чем на глаз.

    Идём по пулу по кругу со сдвигом, а не случайно: случайный выбор даёт
    повторы подряд («вжух-вжух» на соседних плашках слышно сразу), а ровный
    круг гарантирует, что вернёмся к звуку только пройдя все остальные.
    """
    pool = sfx_pool(role)
    if not pool:
        return role                        # библиотеки нет — старое поведение
    return f"{role}#{index % len(pool)}"


def get_sfx(name: str) -> Path:
    """Путь к WAV файлу SFX; синтезирует и кэширует в assets/sfx/ при первом
    обращении (дальше просто отдаёт готовый файл)."""
    # «роль#номер» — выбранный вариант из библиотеки (см. pick_sfx).
    if "_v" in name and name.rsplit("_v", 1)[-1].isdigit():
        role, _, idx = name.rpartition("_v")
        pool = sfx_pool(role)
        if pool:
            return pool[int(idx) % len(pool)]
        name = role                        # библиотеку удалили — на синтез
    path = SFX_DIR / f"{name}.wav"
    if path.exists():
        return path
    gens = {"whoosh": _sfx_whoosh, "pop": _sfx_pop, "ding": _sfx_ding}
    fn = gens.get(name)
    if not fn:
        raise ValueError(f"неизвестный sfx: {name}")
    _sfx_write_wav(fn(), path)
    return path

# (xfade transition, длительность, вес). "cut" — жёсткая склейка.
# КИНОМОНТАЖ, а не телевизор 2010-х. В реальном монтаже большинство склеек
# это hard cut, остальное — мягкие переходы (crossfade, dip-to-black,
# короткий dissolve, редкий white-flash, лёгкий zoom-blur на акцентах).
# Кричащие wipe/slide/circle/cover/reveal/wind/slice/squeeze УБРАНЫ —
# именно они выдавали «старьё».
# МНОГО видов, но веса держат киномонтаж: cut/fade доминируют, кричащие
# (wipe/slide/circle/…) — редкие акценты, а не каждый стык.
# ВАЖНО: только переходы, которые смешивают ДВА кадра по всей площади
# (crossfade / dip / blur / dissolve). Геометрические свайпы xfade
# (circleopen/circleclose/radial/rectcrop/diagtl/squeeze/cover/wipe/slide)
# УБРАНЫ намеренно и навсегда: во-первых, они выдают «старьё» 2010-х;
# во-вторых — и это главное — при малейшем рассинхроне длительностей
# сегментов незакрытая область такого перехода заливается ЗЕЛЁНЫМ (нулевой
# YUV), что пользователь и видел как зелёный полукруг поверх кадра.
TRANSITIONS = [
    # ---- основа (частые) ----
    ("cut",        0.00, 34),   # жёсткая склейка — основа монтажа
    ("fade",       0.45, 20),   # crossfade
    ("fadefast",   0.28, 10),   # быстрый crossfade
    ("dissolve",   0.40, 8),    # растворение
    ("fadeblack",  0.55, 7),    # dip to black — смена главы
    ("hblur",      0.40, 5),    # blur-dissolve
    ("zoomin",     0.38, 4),    # zoom-переход (полнокадровый, не свайп)
    # ---- акценты (реже) ----
    ("fadewhite",  0.18, 3),    # white flash
    ("pixelize",   0.30, 2),    # пикселизация (полнокадровая)
    ("distance",   0.42, 2),    # разлёт (смешивает оба кадра, не свайп)
    ("fadegrays",  0.45, 2),    # обесцвечивание
]

# max_scene — потолок длины плана ДЛЯ ЭТОГО ПРЕСЕТА. Раньше он был один на
# всех и зашит в код (5.0 с), и рубил длинные планы у КАЖДОГО пресета: у
# «слабой» они 8-12 с, у «сильной» 6-9 — то есть под нож шло ровно то, чем
# пресеты друг от друга и отличались. Оставались одни короткие, и все четыре
# положения давали почти одинаковый результат: замерено 358/366/370/382
# сцены при среднем 3.8 с вместо заявленных пяти. Плюс лишние 29% работы
# рендеру: каждый лишний кусок — отдельный сегмент.
INTENSITY = {
    "слабая":  dict(short=(3.0, 5.0), long=(8.0, 12.0), burst_every=(90, 120),
                    short_prob=0.15, max_scene=12.0),
    "средняя": dict(short=(2.5, 4.0), long=(7.0, 11.0), burst_every=(75, 100),
                    short_prob=0.25, max_scene=11.0),
    "сильная": dict(short=(2.0, 3.5), long=(6.0, 9.0),  burst_every=(60, 85),
                    short_prob=0.35, max_scene=9.0),
    # ~5с/план в среднем (short 0.4*4.25 + long 0.6*5.75 ≈ 5.15с) — темп
    # референсного канала: смена кадра каждые пять секунд, но не метроном —
    # узкий разброс 3.5-6.5с сохраняет живую вариацию без скачков "сильной".
    "документальная 5с": dict(short=(3.5, 5.0), long=(5.0, 6.5),
                              burst_every=(45, 65), short_prob=0.4,
                              max_scene=6.5),
}

# ТЕМП МОНТАЖА — ПРИЗНАК КАНАЛА, а не положение выпадающего списка.
#
# Так уже сделаны плотность плашек (overlays.DENSITY_SECS), тон подложки
# (remotion/src/scenes/backdrop.tsx, BASES) и звук (core.SOUND_PALETTES) —
# здесь ровно тот же приём: словарь по полю profile.palette, незнакомое имя
# или пусто = прежнее поведение по выпадающему списку intensity.
#
# ЧИСЛА ИЗ ЗАМЕРА ОБРАЗЦОВ (ref_edit.py), а не из головы:
#   warm (home-vault) — у образца средний план 3.7 c, 44% планов короче трёх
#     секунд, 436 склеек на ролик. У нас было 34.6 c и 2% коротких, то есть
#     разрыв почти в десять раз — самая заметная разница из всех замеренных.
#   contemplative (estoico-es) — здесь разрыв ДРУГОЙ. Средний план почти
#     совпадает (42.7 у образца против 45.5 у нас), но у образца ритм РВАНЫЙ:
#     27% планов короче трёх секунд при самом длинном в 191 c. У нас ровно —
#     7% коротких. Совпадает среднее, различается ХАРАКТЕР, поэтому здесь
#     широкий разброс, а не другое среднее.
#   harsh (abyss) — образца по этому каналу НЕ ЗАМЕРЯЛИ, поэтому его тут
#     НЕТ. Придумать ему числа значило бы выдать догадку за замер; abyss
#     остаётся на своём пресете «документальная 5с» из профиля.
#
# split_to_target — см. build_render_plan. Без него короткие планы физически
# недостижимы: сцены нарезаются по границам фраз субтитров, а фраза длится
# 5.7 c у home-vault и 6.3 c у estoico-es (замер по voiceover.srt от
# 2026-08-07). Это ПОЛ длины плана: короче фразы просто нечем резать, и
# любой short=(1.8, 2.8) молча округляется вверх до целой фразы. Ключ
# разрешает дробить сцену ВНУТРИ фразы до её собственного target — только
# для палитр, чтобы у пресетов intensity ничего не поехало.
# Числа подобраны прогоном build_render_plan по НАСТОЯЩИМ субтитрам
# (home-vault/2026-08-07 и estoico-es/2026-08-07, по шесть разных seed), а не
# прикинуты: замер после правки — warm 426 склеек, средний план 4.0 c, 42%
# короче трёх секунд (образец: 436 / 3.7 c / 44%); contemplative 282 склейки,
# средний 9.8 c, 32% коротких при самом долгом в 24 c, ровность ритма 0.71
# против 0.34 до правки — то есть из метронома он стал неровным, чего и
# добивались.
#
# burst_every у палитр НАМНОГО реже, чем у пресетов intensity (400-600 c
# против 45-120 c), и это не описка. С split_to_target одна «врезка»
# разворачивается уже не в один короткий план, а в три: серия из 2-3 врезок
# даёт около семи коротких планов подряд. При прежнем интервале коротких
# выходило 56% вместо 27% — врезки перестали быть врезками и стали фоном.
PALETTE_CUTS = {
    "warm": dict(short=(2.4, 3.4), long=(4.2, 6.0), burst_every=(140, 200),
                 short_prob=0.30, max_scene=6.0, split_to_target=True),
    "contemplative": dict(short=(2.0, 3.6), long=(9.0, 18.0),
                          burst_every=(400, 600), short_prob=0.12,
                          max_scene=22.0, split_to_target=True),
}


def cuts_of(palette: str = "", intensity: str = "средняя") -> dict:
    """Профиль нарезки: сначала почерк канала, потом выпадающий список.

    Отдельной функцией — чтобы её можно было замерить, не запуская рендер.
    """
    pal = PALETTE_CUTS.get((palette or "").strip().lower())
    return pal or INTENSITY.get(intensity, INTENSITY["средняя"])


IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}
VIDEO_EXTS = {".mp4", ".mov", ".mkv", ".webm"}


# Предел длины командной строки Windows — 32767 символов. Ниже него держим
# запас: превышение даёт «[WinError 206] Имя файла или его расширение имеет
# слишком большую длину» — сообщение, по которому невозможно догадаться, что
# речь о команде, а не о файле. Один такой отказ стоил трёх часов рендера,
# упав на самом последнем шаге.
CMDLINE_LIMIT = 30000


class DiskFull(RuntimeError):
    """Кончилось место на диске. ОТДЕЛЬНЫЙ тип, а не текст внутри RuntimeError.

    Зачем тип: у рендера три слоя отступления, и каждый ловит RuntimeError,
    чтобы продолжить работу похуже. При полном диске это ровно то, чего делать
    нельзя, — продолжать некуда, а человек утром читает не причину, а список
    отступлений. Так и вышло в ночь 2026-08-12: сперва «отказал h264_nvenc»,
    потом «склейка переходами не удалась, собираю встык», и только третьей
    строкой «No space left on device». Владелец полез проверять видеокарту.

    Этот тип пролетает все три слоя насквозь: каждый обработчик начинается с
    `except DiskFull: raise`.
    """


# Как ffmpeg (и Windows) говорят «места нет». Строки разные, повод один.
_NOSPACE = ("no space left", "errno 28", "enospc",
            "недостаточно места", "not enough space", "disk full")


def _disk_full(err: str) -> bool:
    low = (err or "").lower()
    return any(s in low for s in _NOSPACE)


def _run(cmd: list[str], label: str = "ffmpeg", cwd: Path | None = None):
    """ffmpeg с живым прогрессом в Консоль и внятной ошибкой (хвост stderr)."""
    full = list(cmd)
    if full and full[0] == "ffmpeg":
        # -progress pipe:1 даёт машиночитаемый прогресс построчно в stdout
        full[1:1] = ["-hide_banner", "-loglevel", "error",
                     "-nostats", "-progress", "pipe:1"]
    line = " ".join(str(a) for a in full)
    if len(line) > CMDLINE_LIMIT:
        raise RuntimeError(
            f"команда ffmpeg длиной {len(line)} символов — Windows примет не "
            f"более {CMDLINE_LIMIT}. Обычно это слишком много входов -i "
            "(оверлеи, звуки): вынеси их в файл или переиспользуй входы.")
    _console(f"[{label}] $ " + line)
    p = subprocess.Popen(full, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                         text=True, encoding="utf-8", errors="replace",
                         cwd=str(cwd) if cwd else None,
                         creationflags=CREATE_NO_WINDOW)
    err_tail = deque(maxlen=40)

    def read_err():
        for line in p.stderr:
            line = line.rstrip()
            if line:
                err_tail.append(line)
                _console(f"[{label}] ! {line}")

    t = threading.Thread(target=read_err, daemon=True)
    t.start()
    stat, last = {}, 0.0
    for line in p.stdout:
        if CANCEL.is_set():
            p.kill()
            p.wait()
            raise RuntimeError("Остановлено пользователем")
        key, _, val = line.strip().partition("=")
        stat[key] = val
        if key == "progress" and time.time() - last >= 1.0:
            last = time.time()
            _console(f"[{label}] кадр {stat.get('frame', '?')}   "
                     f"время {stat.get('out_time', '?')[:11]}   "
                     f"скорость {stat.get('speed', '?')}")
    p.wait()
    t.join(timeout=2)
    if CANCEL.is_set():
        raise RuntimeError("Остановлено пользователем")
    if p.returncode != 0:
        tail = "\n".join(err_tail) or (
            f"код {p.returncode}, stderr пуст — процесс, похоже, был убит "
            "системой (обычно не хватило оперативной памяти: 60fps и большие "
            "группы прожорливы; попробуй 30 fps или черновой режим)")
        # Полный диск отделяем ЗДЕСЬ, в единственном месте, где запускается
        # ffmpeg. Дальше по стеку стоят обработчики, которые на любую ошибку
        # ffmpeg отступают на путь похуже (процессор вместо видеокарты, стык
        # вместо перехода, чёрная заглушка вместо кадра) — и каждое такое
        # отступление пишет в журнал свою причину поверх настоящей.
        if _disk_full(tail):
            raise DiskFull(
                f"НА ДИСКЕ КОНЧИЛОСЬ МЕСТО (свободно "
                f"{shutil.disk_usage(str(BASE_ANCHOR)).free / 1024 ** 3:.1f} ГБ) "
                f"— ffmpeg не смог дописать «{label}». Это НЕ отказ "
                "видеокарты и не битый материал.\n"
                "Освободи место (python disk.py покажет, что можно убрать) и "
                "запусти заново: сценарий, озвучка и кадры уже готовы.\n"
                + tail)
        raise RuntimeError(f"ffmpeg упал ({label}):\n" + tail)


def _has_video(path: Path) -> bool:
    """Есть ли в файле видеопоток. ffmpeg может «успешно» записать пустой
    файл (например, -ss за концом видео) — такой сегмент рвёт xfade-склейку
    ошибкой «matches no streams»."""
    try:
        r = subprocess.run(
            ["ffprobe", "-v", "quiet", "-select_streams", "v:0",
             "-show_entries", "stream=codec_type", "-of", "csv=p=0", str(path)],
            capture_output=True, text=True, timeout=60,
            creationflags=CREATE_NO_WINDOW)
        return Path(path).exists() and "video" in r.stdout
    # Таймаут обязателен: на битом/недописанном mp4 (а сюда зовут именно
    # такие — проверка стоит после отказа кодировщика) ffprobe умеет висеть
    # вечно, и весь рендер замирает молча. «Стоп» тут тоже не поможет: он
    # убивает только ffmpeg внутри _run, а этот процесс запущен мимо него.
    except (OSError, subprocess.SubprocessError):
        return False


def _video_dur(path: Path) -> float | None:
    """Длительность именно ВИДЕОпотока (контейнер бывает длиннее видео —
    например, из-за звуковой дорожки; -ss по контейнеру попадает в пустоту)."""
    try:
        r = subprocess.run(
            ["ffprobe", "-v", "quiet", "-select_streams", "v:0",
             "-show_entries", "stream=duration", "-of", "csv=p=0", str(path)],
            capture_output=True, text=True, timeout=60,
            creationflags=CREATE_NO_WINDOW)
        return float(r.stdout.strip().splitlines()[0])
    # subprocess.SubprocessError — тот же зависший ffprobe, что и в
    # _has_video: без таймаута рендер встаёт намертво без единой строки в
    # журнале (см. комментарий там)
    except (OSError, subprocess.SubprocessError, ValueError, IndexError):
        return None


def _run_enc(build_cmd, label: str, crf: str, preset: str, final: bool = False):
    """Кодирование с ЕДИНЫМ откатом на процессор.

    build_cmd(venc) -> список аргументов ffmpeg, куда venc подставляется
    распаковкой. Если аппаратный кодировщик отказал (у GeForce жёсткий лимит
    одновременных сессий NVENC — при параллельных сегментах это штатная
    ситуация), выключаем его насовсем и повторяем на libx264.

    Ключевое: какой кодировщик РЕАЛЬНО использовался, запоминаем ДО попытки.
    Проверять hw_encoder() уже в обработчике нельзя: соседний поток мог
    успеть отключить аппаратный путь, и тогда откат бы не сработал — сегмент
    ушёл бы в чёрную заглушку."""
    used = venc_args(crf, preset, final)
    is_hw = used[:2] != ["-c:v", "libx264"]
    try:
        _run(build_cmd(used), label=label)
        return
    except DiskFull:
        # Повторять на процессоре бессмысленно: он упрётся в тот же полный
        # диск. Именно эта попытка и породила в журнале «видеокарта в рендере
        # не участвует ×13» — тринадцать отказов NVENC подряд, из которых ни
        # один не был отказом NVENC.
        raise
    except RuntimeError as e:
        if CANCEL.is_set() or not is_hw:
            raise          # отмена пользователем или уже процессор — не глушим
        # Текст ошибки ffmpeg НЕ выбрасываем: это единственное место, где видно,
        # почему видеокарта отказала. Раньше сюда передавалась только метка
        # сегмента, и причина («OpenEncodeSessionEx failed: out of memory»,
        # «No capable devices») терялась вместе с исключением.
        # Первая строка сообщения — наш же заголовок «ffmpeg упал (метка)», её
        # пропускаем; дальше идёт stderr, и настоящая причина в его начале.
        err = [s for s in str(e).strip().splitlines()[1:] if s.strip()]
        hw_err = " | ".join(err[:2])[:200] if err else str(e)[:200]
    disable_hw(hw_err, where=label)
    # COLOR_TAGS и здесь: этот откат собирает аргументы сам, мимо venc_args, и
    # без них сегмент, переехавший на процессор, ушёл бы без цветовых меток —
    # то есть ровно один клип посреди ролика оказался бы в другом цветовом
    # пространстве. Именно такой разнобой и дал розовый налив.
    _run(build_cmd(["-c:v", "libx264", "-preset", preset, "-crf", crf]
                   + COLOR_TAGS), label=label)


def _placeholder(dest: Path, dur: float, w: int, h: int, fps: int):
    """Тёмная заглушка вместо битого сегмента — рендер продолжается."""
    # Запись здесь, а не в каждом обработчике: заглушку зовут из всех
    # откатов сегмента, и итог у них один — зритель несколько секунд смотрит
    # в пустой тёмный кадр. Какой именно план осыпался, видно в журнале.
    import quality
    quality.degraded(
        "Рендер", "в кадре пустая тёмная заглушка вместо материала",
        why="сегмент не закодировался — причина выше в журнале, у метки "
            "этого сегмента",
        hint="чаще всего это битый или недокачанный файл в video/ images/ — "
             "перекачай материал этого плана",
        level="критично")
    # ВСЕГДА процессор: заглушку зовут из except-обработчиков, и если
    # аппаратный кодировщик отказал (именно это и привело сюда), попытка
    # снова через него роняет весь рендер вместо продолжения.
    _run(["ffmpeg", "-y", "-f", "lavfi",
          "-i", f"color=c=0x14120f:s={w}x{h}:r={fps}",
          "-t", f"{max(dur, 0.2):.3f}", "-vf", "format=yuv420p,setsar=1",
          "-c:v", "libx264", "-preset", PRESET_SEG, "-crf", CRF_SEGMENT,
          str(dest)], label=dest.stem + "~заглушка")


# ---------- 1. План сцен ----------

def project_seed(out_dir: Path) -> int:
    """Фиксированный seed на проект, разный между проектами."""
    return zlib.crc32(str(Path(out_dir).resolve()).encode("utf-8"))


def build_render_plan(rows, total: float, rng: random.Random,
                      intensity: str = "средняя",
                      palette: str = "") -> list[dict]:
    """Сцены по границам фраз srt: вариация длительностей, врезки-перебивки
    каждые 60-120 с, первые 15 секунд — короткий динамичный монтаж,
    фразы с вопросом/цифрами начинают новую сцену.

    palette — почерк канала (PALETTE_CUTS). Если он известен, темп берётся
    из него, а не из выпадающего списка intensity: как часто канал режет —
    такой же его постоянный признак, как палитра переходов и звук."""
    cfg = cuts_of(palette, intensity)
    phrases = [(srt_to_seconds(s), srt_to_seconds(e), t) for s, e, t in rows]
    if not phrases:
        raise RuntimeError("Пустые субтитры — нечего рендерить.")

    scenes, i = [], 0
    cur = 0.0
    next_burst = rng.uniform(*cfg["burst_every"])
    burst_left = 0
    while i < len(phrases):
        start = cur
        if start < 15:                       # retention hook
            target = rng.uniform(2.0, 4.0)
        elif burst_left > 0:                 # серия коротких врезок
            target = rng.uniform(1.5, 2.5)
            burst_left -= 1
        elif rng.random() < cfg["short_prob"]:
            target = rng.uniform(*cfg["short"])
        else:
            target = rng.uniform(*cfg["long"])

        end = start
        while i < len(phrases) and end - start < target:
            txt = phrases[i][2]
            # вопрос или цифры — смена кадра точно на начало фразы
            if end > start and end - start >= 2.0 and \
                    ("?" in txt or re.search(r"\d", txt)):
                break
            end = phrases[i][1]
            i += 1
        if end <= start:                     # фраза длиннее target — берём её
            # i уже мог уехать за конец списка (перекрывающиеся таймкоды в
            # srt: очередная фраза заканчивается не позже предыдущей, цикл
            # выше крутит i, но end не растёт) — раньше это давало IndexError
            # на последней фразе. Берём последнюю доступную границу.
            if i < len(phrases):
                end = max(phrases[i][1], start + 0.5)
                i += 1
            else:
                end = max(phrases[-1][1], start + 0.5)
        # "want" — та длина, которую этой сцене ЗАКАЗЫВАЛИ. Дальше по ней
        # дробится сцена, не влезшая в одну фразу (см. split_to_target).
        scenes.append({"start": round(start, 3), "end": round(end, 3),
                       "want": round(target, 3)})
        cur = end
        if burst_left == 0 and cur >= next_burst:
            burst_left = rng.randint(2, 3)
            next_burst = cur + rng.uniform(*cfg["burst_every"])

    if total and total > scenes[-1]["end"]:
        scenes[-1]["end"] = round(total, 3)

    # Кадр не висит дольше MAX_SCENE секунд — длинные сцены дробятся на
    # равные куски (каждому потом назначается СВОЙ материал). Требование:
    # «одно фото/видео не должно быть на экране дольше 5 секунд».
    MAX_SCENE = float(cfg.get("max_scene", 5.0))
    # ДРОБИТЬ ЛИ ВНУТРИ ФРАЗЫ. Сцена не может быть короче одной фразы
    # субтитров — цикл выше режет только по их границам, а фраза длится
    # 5.7-6.3 c (замер voiceover.srt, home-vault и estoico-es 2026-08-07).
    # Пока порог дробления один на всю дорожку (MAX_SCENE), коротких планов
    # взять неоткуда: либо потолок низкий и ВСЕ планы становятся короткими
    # (метроном), либо высокий и коротких нет вовсе. Ровно это и намерено у
    # нас: 2% планов короче трёх секунд против 44% у образца warm и 27% у
    # образца contemplative.
    #
    # split_to_target дробит КАЖДУЮ сцену до её собственного заказа: сцене,
    # которой заказали 2 c, шестисекундная фраза режется на три куска, а
    # соседней с заказом в 15 c — не режется вовсе. Так в одном ролике
    # уживаются рубленые врезки и долгие планы, то есть тот самый рваный
    # ритм. Ключ стоит только у палитр: у пресетов intensity поведение
    # обязано остаться прежним (abyss рендерится ими).
    to_target = bool(cfg.get("split_to_target"))
    split = []
    for sc in scenes:
        dur = sc["end"] - sc["start"]
        cap = min(MAX_SCENE, float(sc.get("want", MAX_SCENE))) if to_target \
            else MAX_SCENE
        if dur <= cap * 1.12:
            split.append({"start": sc["start"], "end": sc["end"]})
        else:
            # round, а не «целая часть плюс один»: прежняя формула прибавляла
            # единицу ВСЕГДА, поэтому кусок в 6 с при потолке 5 резался на два
            # по три — то есть целилась она не в потолок, а заметно ниже него.
            # Отсюда средняя длина 3.8 с при заявленных пяти.
            n = max(1, round(dur / cap))
            step = dur / n
            for k in range(n):
                split.append({"start": round(sc["start"] + k * step, 3),
                              "end": round(sc["start"] + (k + 1) * step, 3)})
    return split


def assign_materials(scenes: list[dict], out_dir: Path,
                     rng: random.Random, log) -> None:
    """Назначает файл каждой сцене. Если есть timeline.json (раскадровка) —
    сохраняем смысловую привязку по времени; иначе пул video/ + images/
    вперемешку по кругу."""
    out_dir = Path(out_dir)
    tl_file = out_dir / "timeline.json"
    timeline = []
    if tl_file.exists():
        try:
            timeline = json.loads(tl_file.read_text(encoding="utf-8"))
        except Exception as e:
            # Молчать тут нельзя: без раскадровки материал раскладывается
            # случайным пулом, ролик собирается «успешно», но кадр больше не
            # соответствует тексту — а причина (битый timeline.json) нигде не
            # видна. Работу не прерываем, пул остаётся рабочим запасным путём.
            log(f"[Рендер] timeline.json не прочитан "
                f"({e.__class__.__name__}: {e}) — материал раскладывается "
                "пулом, привязка к раскадровке потеряна")
            import quality
            quality.degraded(
                "Рендер", "кадры идут вразнобой с текстом: смысловая "
                "привязка к раскадровке потеряна",
                why=f"timeline.json не прочитан ({e.__class__.__name__}: "
                    f"{str(e)[:80]})",
                hint="перезапусти раскадровку — файл timeline.json в папке "
                     "проекта повреждён",
                level="критично")

    # ЗАПАСНОЙ ПУЛ — ТОЛЬКО ИЗ МАТЕРИАЛА ЭТОГО РОЛИКА.
    #
    # Здесь пул собирался обходом папок video/, images/ и storyboard/ целиком.
    # Рабочая папка у канала ОДНА на все его ролики, кадры прошлых с диска
    # никто не убирает — и всё это шло в пул наравне со своим. Дальше пул
    # используется не в крайнем случае, а постоянно: MAX_ONSCREEN=2 отправляет
    # в него каждую сцену, чей кадр из раскадровки уже был на экране дважды.
    #
    # Замер 2026-08-05 на настоящих папках: в home-vault/storyboard 439
    # файлов, а timeline.json нового ролика ссылается на 61 — треть сцен
    # (43 из 132) ролика про обрушение моста бралась из прошлого ролика про
    # починку крана (beat_009_faucet_handle_repair, beat_012_plumber_van...).
    # В abyss то же самое: 170 сцен из 512, включая горные пейзажи в ролике
    # про обрушение переходов отеля.
    #
    # Свой материал перечислен в timeline.json — раскадровка пишет его под
    # ЭТОТ сценарий. Обход папок остаётся только там, где timeline.json нет
    # вовсе: это ручной режим, когда человек сам кладёт файлы в video/ и
    # images/, и тогда чужому взяться неоткуда.
    pool = []
    if timeline:
        seen = set()
        for item in timeline:
            if not item.get("file"):
                continue
            p = Path(item["file"])
            if p.suffix.lower() in IMAGE_EXTS | VIDEO_EXTS and p.exists():
                if str(p) not in seen:
                    seen.add(str(p))
                    pool.append(p)
    else:
        for d in (out_dir / "video", out_dir / "images", out_dir / "storyboard"):
            if d.exists():
                pool += [p for p in sorted(d.iterdir())
                         if p.suffix.lower() in IMAGE_EXTS | VIDEO_EXTS]
    rng.shuffle(pool)
    if not pool and not timeline:
        raise RuntimeError("Нет материала: пусто в video/, images/, storyboard/ "
                           "и нет timeline.json — сначала скачай стоки.")

    def _content_key(p: Path) -> str:
        """Фото и его же Ken Burns-видео (beat_004_x_kb.jpg / _kb.mp4, или
        beat_004_x_ai.jpg / _ai_kb.mp4) — одна и та же картинка, просто с
        разным движением камеры. Без этого их считало ДВУМЯ разными кадрами
        с отдельным лимитом MAX_ONSCREEN каждому — итог: один и тот же снимок
        мелькал до 4 раз (2х как .jpg, 2х как .mp4)."""
        stem = p.stem
        return stem[:-3] if stem.endswith("_kb") else stem

    # Интенсивность режет сцены чаще, чем раскадровка качает материал (напр.
    # «документальная 5с» = смена каждые ~5с, а на один пункт раскадровки
    # обычно 6-10с) — несколько сцен подряд попадают в окно ОДНОГО файла
    # timeline.json. Раньше защита была только «не то же самое, что сразу
    # перед этим» — тот же кадр всё равно повторялся по всему ролику
    # (не подряд, но заметно зрителю). MAX_ONSCREEN — сколько раз одно и то
    # же содержимое вообще может мелькнуть за весь ролик, прежде чем
    # уступит пулу.
    MAX_ONSCREEN = 2
    pi, last_key = 0, None
    reused = 0
    use_count = {}
    for sc in scenes:
        f = None
        for item in timeline:                # привязка по смыслу (раскадровка)
            if item.get("file") and item["start"] <= sc["start"] < item["end"]:
                p = Path(item["file"])
                if p.exists():
                    f = p
                break
        key = _content_key(f) if f else None
        # не показывать одно и то же содержимое два раза подряд, и не чаще
        # MAX_ONSCREEN раз за весь ролик — берём из пула следующий файл,
        # отличный от предыдущего и ещё не примелькавшийся
        if (f is None or key == last_key or use_count.get(key, 0) >= MAX_ONSCREEN) and pool:
            for _ in range(len(pool)):
                cand = pool[pi % len(pool)]
                pi += 1
                cand_key = _content_key(cand)
                if cand_key != last_key and use_count.get(cand_key, 0) < MAX_ONSCREEN:
                    f, key = cand, cand_key
                    break
        if f is None and pool:
            f = pool[pi % len(pool)]
            key = _content_key(f)
            pi += 1
        if f is None:
            raise RuntimeError("Не хватило материала для сцены "
                               f"{sc['start']:.0f}s.")
        if key == last_key or use_count.get(key, 0) >= MAX_ONSCREEN:
            reused += 1
        use_count[key] = use_count.get(key, 0) + 1
        sc["file"] = f
        sc["kind"] = "image" if f.suffix.lower() in IMAGE_EXTS else "video"
        last_key = key
    log(f"[Рендер] Материал: {len(scenes)} сцен, кадр меняется каждые <=5 c "
        f"({'таймлайн + ' if timeline else ''}пул {len(pool)} файлов"
        + (f", повторов подряд: {reused}" if reused else "") + ")")
    # Раньше нехватку своего материала незаметно закрывали кадры прошлых
    # роликов из той же папки, и в журнале всё выглядело благополучно. Теперь
    # чужое не берётся вовсе, поэтому дефицит проявляется повторами — и о нём
    # надо сказать вслух, иначе он так же молча ухудшает ролик.
    if timeline and reused > len(scenes) * 0.15:
        import quality
        quality.degraded(
            "Рендер", f"кадры повторяются: {reused} сцен из {len(scenes)} "
            "заняты уже показанным материалом",
            why=f"на ролик хватило только {len(pool)} своих файлов",
            hint="увеличь долю ИИ-кадров или уменьши интенсивность монтажа — "
                 "раскадровка качает по одному материалу на план",
            level="заметно")


# ---------- 2. Сегменты ----------

# 26 движений камеры для картинок: зумы, панорамы (4 стороны), диагонали,
# зум+панорама, дуги, дрейф, наезды, тряска, пульс, статика
IMAGE_MOTIONS = [
    "zoom_in", "zoom_out", "zoom_in_fast", "zoom_out_fast", "pulse",
    "pan_right", "pan_left", "pan_up", "pan_down",
    "diag_tl", "diag_tr", "diag_bl", "diag_br",
    "zoompan_r", "zoompan_l", "pullpan_r", "pullpan_l",
    "arc_r", "arc_l", "drift", "drift_fast",
    "push_in", "push_out", "hold", "parallax",
]


def _motion_expr(motion: str, frames: int, fps: int) -> str:
    center = "x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
    xmid = "x='iw/2-(iw/zoom/2)'"
    ymid = "y='ih/2-(ih/zoom/2)'"
    zr = 0.24 / frames    # заметный наезд (было 0.15 — почти не видно)
    zrf = 0.44 / frames   # быстрый драматичный наезд
    n1 = max(frames - 1, 1)
    e = {
        "zoom_in":       f"z='min(zoom+{zr:.6f},1.24)':{center}",
        "zoom_out":      f"z='if(lte(on,1),1.24,max(zoom-{zr:.6f},1.0))':{center}",
        "zoom_in_fast":  f"z='min(zoom+{zrf:.6f},1.44)':{center}",
        "zoom_out_fast": f"z='if(lte(on,1),1.44,max(zoom-{zrf:.6f},1.0))':{center}",
        "pulse":         f"z='1.12+0.07*sin(on/{fps}*1.3)':{center}",
        "pan_right":     f"z=1.22:x='(iw-iw/zoom)*on/{n1}':{ymid}",
        "pan_left":      f"z=1.22:x='(iw-iw/zoom)*(1-on/{n1})':{ymid}",
        "pan_up":        f"z=1.22:{xmid}:y='(ih-ih/zoom)*(1-on/{n1})'",
        "pan_down":      f"z=1.22:{xmid}:y='(ih-ih/zoom)*on/{n1}'",
        "diag_tl":       f"z=1.20:x='(iw-iw/zoom)*on/{n1}':y='(ih-ih/zoom)*on/{n1}'",
        "diag_tr":       f"z=1.20:x='(iw-iw/zoom)*(1-on/{n1})':y='(ih-ih/zoom)*on/{n1}'",
        "diag_bl":       f"z=1.20:x='(iw-iw/zoom)*on/{n1}':y='(ih-ih/zoom)*(1-on/{n1})'",
        "diag_br":       f"z=1.20:x='(iw-iw/zoom)*(1-on/{n1})':y='(ih-ih/zoom)*(1-on/{n1})'",
        "zoompan_r":     f"z='1+0.24*on/{n1}':x='(iw-iw/zoom)*on/{n1}':{ymid}",
        "zoompan_l":     f"z='1+0.24*on/{n1}':x='(iw-iw/zoom)*(1-on/{n1})':{ymid}",
        "pullpan_r":     f"z='1.24-0.22*on/{n1}':x='(iw-iw/zoom)*on/{n1}':{ymid}",
        "pullpan_l":     f"z='1.24-0.22*on/{n1}':x='(iw-iw/zoom)*(1-on/{n1})':{ymid}",
        "arc_r":         (f"z=1.20:x='(iw-iw/zoom)*on/{n1}':"
                          f"y='(ih-ih/zoom)*(0.5+0.45*sin(on/{n1}*3.1416))'"),
        "arc_l":         (f"z=1.20:x='(iw-iw/zoom)*(1-on/{n1})':"
                          f"y='(ih-ih/zoom)*(0.5-0.45*sin(on/{n1}*3.1416))'"),
        "drift":         (f"z=1.04:x='iw/2-(iw/zoom/2)+9*sin(on/{fps}*0.7)':"
                          f"y='ih/2-(ih/zoom/2)+6*sin(on/{fps}*0.45)'"),
        "drift_fast":    (f"z=1.06:x='iw/2-(iw/zoom/2)+15*sin(on/{fps}*1.1)':"
                          f"y='ih/2-(ih/zoom/2)+10*sin(on/{fps}*0.8)'"),
        "push_in":       f"z='1+0.20*pow(on/{n1},2)':{center}",
        "push_out":      f"z='1.20-0.20*pow(on/{n1},2)':{center}",
        "shake":         ("z=1.03:x='iw/2-(iw/zoom/2)+4*sin(on*1.7)+3*sin(on*0.83)':"
                          "y='ih/2-(ih/zoom/2)+3*sin(on*2.3)+2*sin(on*1.1)'"),
        "shake_soft":    ("z=1.02:x='iw/2-(iw/zoom/2)+2*sin(on*1.3)+1.5*sin(on*0.7)':"
                          "y='ih/2-(ih/zoom/2)+1.5*sin(on*1.9)'"),
        "hold":          f"z=1.06:{center}",
    }
    return e.get(motion, e["zoom_in"])


# движения для видео: статика чаще, лёгкие панорамы/зумы/дрейф — акцентами
VIDEO_MOTIONS = ["static", "static", "static", "static",
                 "v_pan_r", "v_pan_l", "v_drift",
                 "v_zoom_in", "v_zoom_out"]


# ---------- Палитра канала: свой язык монтажа у каждого ----------
#
# До этого все каналы тянули из ОДНОГО пула переходов с одними весами и из
# одного списка движений; отличалось только зерно случайности. Значит и
# распределение приёмов выходило одинаковым — зритель видит один почерк на
# трёх разных каналах. Замер: из 18 типов оверлеев 16 доставались двум и более
# каналам одновременно, а грамматика монтажа совпадала полностью.
#
# Палитра — это ХАРАКТЕР канала, а не забор вокруг него. Ключевое решение:
# палитра НИЧЕГО НЕ ЗАПРЕЩАЕТ. Каналу доступны все переходы и все движения;
# палитра лишь говорит, что он любит, а что использует изредка. Первая версия
# была списками разрешённого — и урезала канал с 25 движений до шести. Канал
# от этого становится не уникальным, а бедным: узнаваемым по нищете приёмов.
#
# Числа — множители к базовому весу. 6 = «фирменный приём», 1 = «как у всех»,
# 0.15 = «редкая краска, но она есть». Ноля здесь не бывает.
BASE_EMPHASIS = 1.0

# Множитель для приёмов, которых в палитре канала НЕТ ВООБЩЕ.
#
# Раньше здесь стояла единица, и это тихо съедало всю разницу между каналами.
# Пул движений картинки — 25 приёмов; палитра называла девять, остальные
# шестнадцать оставались с полным весом У ВСЕХ ТРЁХ. То есть две трети
# движения в каждом ролике бралось из одного и того же общего хвоста, и
# каналы совпадали по замеру на 61-73% — при том, что «фирменные» приёмы у
# них разные. Владелец сказал ровно это: «монтаж трёх каналов друг друга оч
# похож».
#
# Ноль здесь по-прежнему недопустим: канал должен отличаться характером, а не
# бедностью. 0.25 означает «редкая краска» — приём остаётся возможным, но не
# формирует почерк.
REST_EMPHASIS = 0.25
PALETTES = {
    # Хроника. Рубит склейками, камера почти не живёт — так снимают репортаж,
    # а не рекламу. Но плавный переход всё же случается: раз в двадцать сцен
    # он читается как приём, а не как чужой почерк.
    "harsh": {
        "transitions": {"cut": 6, "fadeblack": 2.5, "fadefast": 1.6,
                        "hblur": 1.2, "pixelize": 0.6, "fadegrays": 0.4,
                        "fade": 0.25, "dissolve": 0.3, "zoomin": 0.2,
                        "fadewhite": 0.15, "distance": 0.15},
        # Репортажная камера: стоит или коротко подаётся вперёд. Панорам и
        # дуг почти нет — это язык рекламы, а не разбора аварии.
        "image_motions": {"hold": 6, "push_in": 3.5, "drift": 0.8,
                          "zoom_in": 2.5, "zoom_in_fast": 1.5,
                          "pan_up": 1.2, "pan_down": 1.2,
                          "pulse": 0.2, "arc_r": 0.2, "arc_l": 0.2,
                          "zoompan_r": 0.3, "zoompan_l": 0.3,
                          "parallax": 0.3},
        "video_motions": {"static": 5, "v_drift": 2, "v_zoom_in": 0.4,
                          "v_pan_r": 0.4, "v_pan_l": 0.4, "v_zoom_out": 0.3},
    },
    # Тёплый рассказ: мягкие растворения, живая подвижная камера.
    "warm": {
        "transitions": {"fade": 2.0, "fadefast": 3.5, "zoomin": 4,
                        "dissolve": 1.0, "hblur": 2.0, "fadewhite": 0.8,
                        "cut": 0.7, "fadeblack": 0.4, "fadegrays": 0.2,
                        "pixelize": 0.15, "distance": 0.15},
        # Камера в руках: ведёт по предмету, обходит его, чуть дышит.
        "image_motions": {"pan_right": 3.5, "pan_left": 3.5,
                          "zoompan_r": 3, "zoompan_l": 3,
                          "arc_r": 2.5, "arc_l": 2.5, "pulse": 2,
                          "diag_tl": 1.8, "diag_br": 1.8,
                          "diag_tr": 1.5, "diag_bl": 1.5,
                          "pullpan_r": 1.5, "pullpan_l": 1.5,
                          "hold": 0.3, "drift": 0.4},
        "video_motions": {"v_pan_r": 2.5, "v_pan_l": 2.5, "v_zoom_in": 2,
                          "v_drift": 1.2, "static": 0.6, "v_zoom_out": 0.5},
    },
    # Созерцание: время течёт, а не режется. Долгие растворения, медленный
    # дрейф, глубина кадра.
    "contemplative": {
        # Растворения тут ДЛИННЫЕ, а не просто частые. Замер образца ниши
        # (2026-08-09): один наплыв разобран покадрово с шагом 0.25 c —
        # старый кадр начал уходить на 306.0 c, новый встал на 308.5 c,
        # то есть переход длится ~2.5 c. По всему ролику медиана перехода
        # 2.0 c, и 81% переходов длиннее секунды. У нас на том же замере
        # медиана 1.0 c при 33% длинных: веса растворений уже стояли
        # правильно, а вот сами длительности брались из общего TRANSITIONS
        # (fade 0.45, dissolve 0.40) — вчетверо короче образца. Частый, но
        # мгновенный наплыв читается как обычная склейка, и всё «время
        # течёт» пропадало именно здесь.
        "trans_scale": 3.5,
        "transitions": {"dissolve": 7, "fade": 1.8, "fadegrays": 4,
                        "fadeblack": 2, "distance": 2.5, "hblur": 1.0,
                        "cut": 0.35, "fadefast": 0.3, "fadewhite": 0.3,
                        "zoomin": 0.2, "pixelize": 0.15},
        # Камера на штативе с очень медленным ходом: дрейф, подача вперёд и
        # назад, параллакс. Рывков нет вовсе.
        "image_motions": {"drift": 6, "push_in": 1.2, "push_out": 4,
                          "parallax": 3.5, "zoom_out": 3, "hold": 1.2,
                          "pan_up": 0.8, "pan_down": 0.8,
                          "zoom_in_fast": 0.15, "drift_fast": 0.2,
                          "pulse": 0.2, "pan_right": 0.3, "pan_left": 0.3},
        "video_motions": {"v_drift": 3, "static": 2, "v_zoom_out": 2,
                          "v_zoom_in": 0.5, "v_pan_r": 0.3, "v_pan_l": 0.3},
    },
}


def palette_of(name: str) -> dict | None:
    """Палитра по имени; None — общий пул с общими весами, как было."""
    return PALETTES.get((name or "").strip().lower())


def _weighted(pool, emphasis: dict | None, base_weights=None):
    """Веса по всему пулу: каждый элемент доступен, множитель меняет частоту.

    Возвращает (имена, веса). Элемент, не упомянутый в палитре, получает
    ПОНИЖЕННЫЙ вес (REST_EMPHASIS), но не нулевой: он остаётся возможным.
    Именно это отличает акцент от запрета — канал звучит по-своему и при этом
    ничего не теряет.

    Пониженный, а не базовый: пул движений вдвое длиннее любого канального
    списка, и на полном весе общий хвост перевешивал фирменные приёмы. Замер
    до правки — совпадение движений каналов 61-73%, после — см. отчёт.
    Канал без палитры (emphasis пуст) работает как раньше, на базовых весах.
    """
    names = list(dict.fromkeys(pool))          # порядок сохраняем, дубли убираем
    if base_weights:
        base = [float(base_weights.get(n, BASE_EMPHASIS)) for n in names]
    else:
        # дубли в исходном списке — это и есть вес (VIDEO_MOTIONS так устроен)
        counts = {n: list(pool).count(n) for n in names}
        base = [float(counts[n]) for n in names]
    rest = REST_EMPHASIS if emphasis else BASE_EMPHASIS
    emphasis = emphasis or {}
    return names, [b * float(emphasis.get(n, rest))
                   for n, b in zip(names, base)]


def _fill_gap(have: float, need: float,
              fps: int) -> tuple[str, str, str, float]:
    """Чем закрыть нехватку длины клипа, ЧТОБЫ КАРТИНКА НЕ ВСТАВАЛА.

    have — сколько секунд настоящего материала осталось от точки входа,
    need — сколько требует план. Возвращает четыре вещи:
      loop  — фильтр удлинения материала (бумеранг), «» если не нужен;
      slow  — фильтр замедления, «» если не нужен;
      note  — человеческая пометка для лога, «» если ничего не делали;
      ext   — сколько секунд материала получится ПОСЛЕ loop, до slow.
    Loop и slow отданы порознь не для красоты: zoompan выставляет кадрам
    СВОИ временные метки по своему параметру fps= и тем самым стирает
    предшествующий setpts. Замерено: план 11.08 с давал сегмент 9.60 с —
    ровно длину бумеранга без замедления. Поэтому для зума замедление
    вешается ПОСЛЕ zoompan, а для проездов (они читают t) — до.

    Почему не заморозка последнего кадра. Длину плана диктует озвучка, её
    подвинуть нельзя, а клип короче — и tpad=clone честно добивал разницу
    копиями последнего кадра. Для зрителя это выглядит как зависший плеер:
    голос идёт, картинка мёртвая. Ровно на это и пожаловался владелец.

    Почему именно замедление + бумеранг, а не что-то одно.
      * Одно замедление. Чтобы закрыть 8 с -> 11.4 с нужен коэффициент 1.43;
        при 24 fps исходника это ~17 уникальных кадров в секунду, каждый
        третий кадр — дубль, движение начинает дёргаться. Мягкие 1.15 глаз
        не ловит, поэтому маленькие нехватки закрываем только им.
      * Один бумеранг. Он бесшовен (стык идёт по тому же кадру, с которого
        начинается разворот) и даёт настоящее движение, но разворачивать
        приходится ровно столько, сколько не хватает, а reverse держит это
        в памяти целиком. На 5-секундном клипе под 10-секундный план это
        4 с распакованного 1080p.
    Поэтому сначала берём бесплатные 15% замедления, остаток закрываем
    разворотом, и только если и этого мало (план длиннее двух клипов) —
    добираем замедлением до предела.

    Порядок слоёв важен: развернутый хвост клеится к исходному материалу ДО
    замедления, иначе коэффициент пришлось бы пересчитывать под уже
    растянутый поток.
    """
    frame = 1.0 / max(fps, 1)
    if have <= frame * 3 or need <= have + 0.04:
        return "", "", "", have
    # Целимся на два кадра ДЛИННЕЕ плана: длина считается в секундах, а
    # выдаётся кадрами, и округление вниз оставляло сегмент короче плана на
    # кадр-другой (замерено на зуме: 11.03 с при плане 11.08). Лишнее срежет
    # -t, а вот недостача уводит стык xfade за край входа.
    need += frame * 2

    # 1) незаметное замедление — если хватает его одного, на этом и стоим
    slow = min(need / have, FILL_SLOW_SOFT)
    tail = 0.0
    if have * slow < need - 0.02:
        # 2) сколько ИСХОДНОГО материала надо развернуть назад
        tail = min(need / slow - have, have - frame, FILL_TAIL_MAX)
        if (have + tail) * slow < need - 0.02:
            # 3) плана хватило бы на два клипа — добираем замедлением
            slow = min(need / (have + tail), FILL_SLOW_MAX)

    loop, note = "", []
    if tail > frame:
        # Бумеранг ровно на нужный хвост, а не на весь клип: и памяти в
        # разы меньше, и назад отыгрывается только та часть, которой не
        # хватило. trim=start_frame=1 убирает кадр-близнец на стыке —
        # reverse отдаёт первым тот же кадр, которым закончился прямой ход.
        loop = (
            f"setpts=PTS-STARTPTS,"       # своя база времени для trim ниже
            f"split[fw][bk];"
            f"[bk]trim=start={max(have - tail, 0.0):.3f},setpts=PTS-STARTPTS,"
            f"reverse,trim=start_frame=1,setpts=PTS-STARTPTS[bwd];"
            f"[fw][bwd]concat=n=2:v=1:a=0,")
        note.append(f"бумеранг {tail:.1f} c")
    slow_f = ""
    if slow > 1.002:
        slow_f = f"setpts={slow:.5f}*PTS,"
        note.append(f"замедление x{slow:.2f}")
    if not note:
        return "", "", "", have
    return loop, slow_f, ", ".join(note), have + tail


def render_segment(src: Path, kind: str, dur: float, dest: Path,
                   w: int, h: int, fps: int, rng: random.Random,
                   motion: str | None = None, extra_vf: str = "",
                   palette: dict | None = None) -> str:
    """Один сегмент: картинка с движением или обрезанное видео. Без звука.
    extra_vf — доп. фильтр (например, цветокор по главам).
    Возвращает пометку о дотяжке короткого клипа для лога («» — не тянули)."""
    dur = max(dur, 0.2)
    tail_vf = ((extra_vf + "," if extra_vf else "")
               + COLOR_FIX + ",format=yuv420p,setsar=1")
    if kind == "image":
        frames = max(int(round(dur * fps)), 2)
        # Движения — почерк канала, но доступны ВСЕ: палитра меняет частоту,
        # а не состав. Иначе канал отличался бы бедностью приёмов.
        if motion is None:
            _n, _w = _weighted(IMAGE_MOTIONS,
                               (palette or {}).get("image_motions"))
            motion = rng.choices(_n, weights=_w)[0]
        if motion == "parallax":
            # передний план поверх своей размытой тёмной копии,
            # слои движутся с разной скоростью — псевдо-3D
            n1 = max(frames - 1, 1)
            fg_h = int(h * 0.82) // 2 * 2
            amp = int(w * 0.05)
            fc = (
                f"[0:v]split[bg0][fg0];"
                f"[bg0]scale={int(w * 1.6)}:-2:flags=lanczos,"
                f"zoompan=z=1.06:x='(iw-iw/zoom)*on/{n1}':"
                f"y='ih/2-(ih/zoom/2)':d={frames}:s={w}x{h}:fps={fps},"
                f"gblur=sigma=16,eq=brightness=-0.28[bg];"
                f"[fg0]scale=-2:{fg_h}:flags=lanczos[fg];"
                f"[bg][fg]overlay=eof_action=repeat:"
                f"x='(W-w)/2-{amp}+{amp * 2}*n/{frames}':y='(H-h)/2',"
                + tail_vf)
            try:
                _run_enc(lambda v: ["ffmpeg", "-y", "-i", str(src),
                                    "-filter_complex", fc, *v,
                                    "-an", str(dest)],
                         dest.stem, CRF_SEGMENT, PRESET_SEG)
                if not _has_video(dest):
                    raise RuntimeError("пустой результат")
            except DiskFull:
                raise          # заглушку тоже некуда писать — см. DiskFull
            except RuntimeError as e:
                if CANCEL.is_set():
                    raise
                _console(f"[{dest.stem}] parallax не получился "
                         f"({str(e)[:80]}) — заглушка")
                _placeholder(dest, dur, w, h, fps)
            return ""
        vf = (f"scale={int(w * 1.6)}:-2:flags=lanczos,"
              f"zoompan={_motion_expr(motion, frames, fps)}"
              f":d={frames}:s={w}x{h}:fps={fps},"
              + tail_vf)
        try:
            _run_enc(lambda v: ["ffmpeg", "-y", "-i", str(src), "-vf", vf, *v,
                                "-an", str(dest)],
                     dest.stem, CRF_SEGMENT, PRESET_SEG)
            if not _has_video(dest):
                raise RuntimeError("пустой результат")
        except DiskFull:
            raise              # заглушку тоже некуда писать — см. DiskFull
        except RuntimeError as e:
            if CANCEL.is_set():
                raise
            _console(f"[{dest.stem}] картинка не закодировалась "
                     f"({str(e)[:80]}) — заглушка")
            _placeholder(dest, dur, w, h, fps)
        return ""      # картинка и так рисуется ровно на нужную длину
    else:
        src_dur = _video_dur(src) or audio_duration(src) or dur
        offset = rng.uniform(0, src_dur - dur) if src_dur > dur + 0.5 else 0
        if motion is None:
            _n, _w = _weighted(VIDEO_MOTIONS,
                               (palette or {}).get("video_motions"))
            motion = rng.choices(_n, weights=_w)[0]
        D = max(dur, 0.5)
        pans = {
            "v_pan_r": f"x='(iw-{w})*min(t/{D:.3f},1)':y='(ih-{h})/2'",
            "v_pan_l": f"x='(iw-{w})*(1-min(t/{D:.3f},1))':y='(ih-{h})/2'",
            "v_drift": (f"x='(iw-{w})/2+{max(int(w * 0.012), 6)}*sin(t*0.6)':"
                        f"y='(ih-{h})/2+{max(int(h * 0.012), 5)}*sin(t*0.42)'"),
            "v_shake": (f"x='(iw-{w})/2+5*sin(t*11)+3*sin(t*6.3)':"
                        f"y='(ih-{h})/2+4*sin(t*13.7)'"),
        }
        if motion in pans:
            # запас 8% и окно постоянного размера w x h с анимированным x/y
            w2 = int(w * 1.08) // 2 * 2
            h2 = int(h * 1.08) // 2 * 2
            pre = (f"scale={w2}:{h2}:force_original_aspect_ratio=increase,"
                   f"crop={w2}:{h2},fps={fps},")
        else:
            pre = (f"scale={w}:{h}:force_original_aspect_ratio=increase,"
                   f"crop={w}:{h},fps={fps},")
        zoom = motion in ("v_zoom_in", "v_zoom_out")
        note = ""

        def enc(off: float, pad: bool = False, plain: bool = False):
            # Дотяжка стоит МЕЖДУ приведением кадра и движением камеры.
            # До неё — потому что бумерангу и замедлению нужен поток уже
            # постоянного размера и частоты (исходники приходят и 1088x832,
            # и 1920x1080). До движения — потому что проезд камеры считается
            # по t/номеру кадра и должен идти ровно на всю длину плана, а не
            # заканчиваться там, где кончился исходный материал.
            nonlocal note
            loop, slow, note, ext = ("", "", "", 0.0) if plain else _fill_gap(
                max(src_dur - off, 0.0), dur, fps)
            # Замедление растягивает МЕТКИ ВРЕМЕНИ, кадров от этого не
            # прибавляется — поток становится переменной частоты. Замерено
            # без этой строки: сегмент под план 11.400 c вышел 11.367 c и
            # 297 кадров вместо 342, то есть 26.1 кадра в секунду посреди
            # тридцатикадрового ролика. И то и другое опасно: недостача в
            # кадр уводит стык xfade за край входа (см. XFADE_GUARD), а
            # разнобой частоты внутри группы xfade считает по первому входу.
            # fps= достраивает недостающие кадры дублями и возвращает поток
            # к постоянной частоте.
            if slow:
                slow += f"fps={fps},"
            if zoom:
                # У зума арка считается в КАДРАХ, и кадров после бумеранга
                # ровно ext*fps — по плановой длительности их было бы больше,
                # и зум не доезжал бы до конца. А замедление идёт после
                # zoompan: он выставляет свои метки времени и стёр бы его.
                frames = max(int(round((ext or max(dur, 0.5)) * fps)), 2)
                zexpr = _motion_expr(
                    "zoom_in" if motion == "v_zoom_in" else "zoom_out",
                    frames, fps)
                post = f"zoompan={zexpr}:d=1:s={w}x{h}:fps={fps}," + slow
                mid = loop
            elif motion in pans:
                post = f"crop={w}:{h}:{pans[motion]},"
                mid = loop + slow
            else:                                   # static
                post = ""
                mid = loop + slow
            v = pre + mid + post
            if note or pad or src_dur - off < dur + 0.05:
                # Страховка, а не основной механизм: длину исходника мы знаем
                # со слов ffprobe, и если он приврал на пару кадров, сегмент
                # выйдет короче плана и xfade оборвёт видеодорожку. Когда
                # длины хватает, -t режет поток раньше, чем tpad вообще
                # что-нибудь склонирует, — то есть заморозки здесь не будет.
                v += "tpad=stop_mode=clone:stop=-1,"
            _run_enc(lambda vv: ["ffmpeg", "-y", "-ss", f"{off:.2f}",
                                 "-i", str(src), "-t", f"{dur:.3f}",
                                 "-vf", v + tail_vf, *vv,
                                 "-an", str(dest)],
                     dest.stem, CRF_SEGMENT, PRESET_SEG)

        try:
            enc(offset)
            ok = _has_video(dest)
        except DiskFull:
            raise              # см. DiskFull: отступать некуда, диск полон
        except RuntimeError as e:
            if CANCEL.is_set():
                raise
            _console(f"[{dest.stem}] не закодировался ({str(e)[:100]})")
            ok = False
        if not ok and note:
            # Дотяжка — надстройка над рабочим механизмом, и она не имеет
            # права ронять сегмент: reverse может не влезть в память, граф
            # может не собраться на редкой сборке ffmpeg. Тогда откатываемся
            # на старое поведение (заморозка) — это хуже на вид, но это
            # готовый сегмент, а не дыра в ролике.
            _console(f"[{dest.stem}] дотяжка ({note}) не собралась — "
                     "откат на заморозку последнего кадра")
            try:
                enc(offset, pad=True, plain=True)
                ok = _has_video(dest)
            except DiskFull:
                raise
            except RuntimeError:
                if CANCEL.is_set():
                    raise
                ok = False
        if not ok:
            _console(f"[{dest.stem}] пустой сегмент (offset {offset:.1f} c "
                     f"за концом видеопотока {src.name}?) — пробую с начала")
            try:
                enc(0, pad=True, plain=True)
                ok = _has_video(dest)
            except DiskFull:
                raise
            except RuntimeError as e:
                if CANCEL.is_set():
                    raise
                ok = False
        if not ok:
            _console(f"[{dest.stem}] исходник не читается — ставлю заглушку, "
                     "рендер продолжается")
            _placeholder(dest, dur, w, h, fps)
        return note


# ---------- 3. Переходы ----------

def pick_transitions(n: int, rng: random.Random,
                     palette: dict | None = None) -> list[tuple[str, float]]:
    """n-1 переходов из пула, взвешенно, без повторов подряд.

    palette задаёт СВОИ веса каналу: какими приёмами канал пользуется и как
    часто — его собственное дело. Без палитры поведение прежнее: общий пул с
    общими весами.

    trans_scale — множитель ДЛИТЕЛЬНОСТИ перехода для канала. Раньше
    длительность жёстко бралась из TRANSITIONS «потому что она привязана к
    самому переходу», и это оказалось неверно: замер образца созерцательной
    ниши дал наплывы по 2.0-2.5 c против наших 0.40-0.45 c. Канал отличается
    не только тем, КАК часто растворяет, но и тем, НАСКОЛЬКО медленно.
    Пусто/1.0 — прежние длительности, то есть все каналы без ключа ведут
    себя как раньше.

    Переход при этом не может съесть план: render_project режет припуск по
    room = 40% меньшего из соседних планов и укорачивает сам переход, если
    места мало (см. там же). Поэтому множитель безопасен и на коротких планах.
    """
    scale = float((palette or {}).get("trans_scale", 1.0) or 1.0)
    # cut остаётся нулевым при любом множителе: 0.0 — это признак жёсткой
    # склейки, render_group опознаёт его по значению и подставляет кадровый
    # fade. Умножить его на 3.5 значило бы превратить все резкие склейки
    # канала в наплывы.
    durs = {t[0]: (t[1] * scale if t[1] > 0 else 0.0) for t in TRANSITIONS}
    # Палитра меняет ЧАСТОТУ, а не состав: ни один переход не исключается,
    # иначе канал беднеет вместо того, чтобы отличаться.
    names, weights = _weighted(
        [t[0] for t in TRANSITIONS],
        (palette or {}).get("transitions"),
        {t[0]: t[2] for t in TRANSITIONS})
    out, prev = [], None
    for _ in range(max(n - 1, 0)):
        for _try in range(10):
            ch = rng.choices(names, weights=weights)[0]
            if ch != prev:
                break
        out.append((ch, durs[ch]))
        prev = ch
    return out


def render_group(seg_files: list[Path], durs: list[float],
                 trans: list[tuple[str, float]], dest: Path, fps: int,
                 chromab: bool = False, w: int = 1920, h: int = 1080):
    """Склейка группы сегментов цепочкой xfade одной командой.
    chromab — хроматическая аберрация в момент каждого перехода."""
    # страховка: сегмент без видеопотока рвёт xfade ошибкой
    # «matches no streams» — заменяем такой заглушкой до склейки
    for f, d in zip(seg_files, durs):
        if not _has_video(f):
            _console(f"[{dest.stem}] {f.name} без видеопотока — заглушка")
            _placeholder(f, d + 1.0, w, h, fps)
    if len(seg_files) == 1:
        seg_files[0].replace(dest)
        return
    cmd = ["ffmpeg", "-y"]
    for f in seg_files:
        cmd += ["-i", str(f)]
    # фактические длительности сегментов: страховка от коротких исходников —
    # offset за пределами накопленного потока обрывает xfade-цепочку
    real = [audio_duration(f) or d for f, d in zip(seg_files, durs)]
    fc, acc = "", "[0:v]"
    acc_len = real[0]     # фактическая длина накопленного потока
    want_off = 0.0        # желаемый offset по плану (для синхрона со звуком)
    tr_times = []         # моменты переходов (для аберрации)
    for k in range(1, len(seg_files)):
        name, tdur = trans[k - 1]
        want_off += durs[k - 1]
        if name == "cut" or tdur <= 0:
            name, tdur = "fade", 1.0 / fps    # технически xfade, визуально cut
        tdur = max(min(tdur, real[k] - 0.1), 1.0 / fps)
        # Отступ от конца накопленного потока обязателен: при
        # offset+duration ровно в его конце xfade отдаёт обрубок и НЕ
        # сообщает об ошибке (см. XFADE_GUARD). Раньше здесь стоял
        # max(acc_len - tdur, 0) — то есть офсет садился ровно на границу
        # всякий раз, когда припуска не хватало, и группа схлопывалась.
        off = min(want_off, max(acc_len - tdur - XFADE_GUARD, 0.0))
        lbl = f"[vx{k}]"
        # Переход начинается РОВНО на плановой границе плана, а не раньше её.
        # Сегменты уже нарезаны с припуском (dur + tail, см. render_project) —
        # именно его переход и должен съедать. Раньше здесь стояло
        # offset = off - tdur: переход начинался ДО границы, съедал полезное
        # время, и каждая склейка укорачивала дорожку на свою длительность.
        # На 84 планах это дало 20 секунд разницы между видео (700 c) и
        # звуком (720 c) — плеер доигрывал звук на застывшем последнем кадре.
        fc += (f"{acc}[{k}:v]xfade=transition={name}:"
               f"duration={tdur:.3f}:offset={off:.3f}{lbl};")
        acc = lbl
        acc_len = off + real[k]
        if tdur > 0.1:
            tr_times.append((off, off + tdur))
    if chromab and tr_times:
        enable = "+".join(f"between(t,{a - 0.05:.3f},{b + 0.05:.3f})"
                          for a, b in tr_times)
        fc += f"{acc}rgbashift=rh=4:bv=4:enable='{enable}'[vab];"
        acc = "[vab]"
    fc = fc.rstrip(";")
    tail = ["-filter_complex", fc, "-map", acc]
    try:
        _run_enc(lambda v: cmd + tail + list(v) + ["-r", str(fps), str(dest)],
                 dest.stem, CRF_SEGMENT, PRESET_SEG)
    except DiskFull:
        # Склейка встык пишет ФАЙЛ ТОГО ЖЕ РАЗМЕРА: на полном диске она не
        # запасной путь, а вторая такая же ошибка через двадцать минут.
        raise
    except RuntimeError as e:
        if CANCEL.is_set():
            raise
        # xfade-цепочка тяжёлая (8 декодеров разом): если ffmpeg убит или
        # упал — собираем группу встык, рендер продолжается без переходов
        _console(f"[{dest.stem}] xfade-склейка не удалась "
                 f"({str(e)[:120]}) — собираю группу встык (hard cut)")
        import quality
        quality.degraded(
            "Рендер", "планы склеены встык, без переходов",
            why=f"склейка переходами не удалась: {str(e)[:100]}",
            level="заметно")
        _group_concat_fallback(seg_files, durs, dest, fps)


def _concat_line(p: Path) -> str:
    """Строка для списка concat-демуксера. Апостроф в пути закрывает кавычку
    раньше времени, и ffmpeg получает обрезанное имя («No such file») — а
    путь задаёт пользователь кнопкой «Обзор…», то есть в нём может быть что
    угодно. Экранирование апострофа внутри одинарных кавычек делается только
    так: закрыть кавычку, дать \\', открыть заново."""
    return "file '" + str(p.resolve().as_posix()).replace("'", "'\\''") + "'"


def _group_concat_fallback(seg_files: list[Path], durs: list[float],
                           dest: Path, fps: int):
    """Запасная склейка группы без переходов: каждый сегмент обрезается до
    плановой длительности (хвосты под переходы больше не нужны) и клеится
    concat-демуксером. Дешевле по памяти в разы."""
    parts = []
    for i, (f, d) in enumerate(zip(seg_files, durs)):
        p = dest.parent / f"{dest.stem}_cut{i:02d}.mp4"
        _run_enc(lambda v: ["ffmpeg", "-y", "-i", str(f), "-t", f"{d:.3f}",
                            "-r", str(fps), *v, "-an", str(p)],
                 p.stem, CRF_SEGMENT, PRESET_SEG)
        parts.append(p)
    lst = dest.parent / f"{dest.stem}_list.txt"
    lst.write_text("\n".join(_concat_line(p) for p in parts),
                   encoding="utf-8")
    # ВАЖНО: НЕ "-c copy". Куски кодировались отдельными вызовами ffmpeg —
    # у них независимые внутренние временные метки, и потоковая склейка
    # без перекодирования копирует эти метки как есть. На стыке это дало
    # рассинхрон PTS: реальный ролик (11) 23 секунды кадра "застывали"
    # (счётчик кадров почти не рос, а таймкод разом скакнул на 23с вперёд —
    # видно по логу finalного прохода). Перекодирование пересчитывает PTS
    # с нуля по кадрам — дороже по CPU, но без разрыва.
    _run_enc(lambda v: ["ffmpeg", "-y", "-f", "concat", "-safe", "0",
                        "-i", str(lst), *v, "-r", str(fps),
                        "-fflags", "+genpts", str(dest)],
             dest.stem, CRF_SEGMENT, PRESET_SEG)


# ---------- 4. Финальная сборка ----------

SUB_SIZES = {"мелкие": 15, "средние": 19, "крупные": 24, "огромные": 36}

# Сетка координат в стилях субтитров. Числа в force_style — НЕ пиксели:
# ffmpeg отдаёт srt библиотеке libass через свой конвертер в ASS, а тот
# пишет в заголовок PlayResX 384, PlayResY 288 и не спрашивает, какого
# размера кадр. libass растягивает эту сетку на весь кадр, то есть 384 —
# это ширина кадра целиком, 288 — высота целиком, при любом разрешении.
# Замерено на СОБРАННОМ mp4 1920x1080 (стиль bold_box, размер «крупные»):
# MarginL=90 дал отступ 439 px (90 * 1920/384 = 450 минус боковой вынос
# глифа), MarginR=90 — 437 px, MarginV=60 — 218 px снизу (60 * 1080/288 =
# 225). То есть отступы были впятеро больше, чем читались по числу.
#
# Чем это плохо. Отступы 439+437 оставляли тексту 1020 px из 1920 — 53%
# кадра. Строка субтитра из настоящего ролика abyss (87 знаков) в такой
# колонке разваливалась на ТРИ строки и занимала y 596..861, то есть
# лезла в середину кадра, где стоят одиннадцать из семнадцати типов
# плашек. Отсюда и «поверх субтитра ложится другой элемент».
SUB_GRID_X, SUB_GRID_Y = 384, 288
# Доли кадра, а не пиксели: единица сетки сама масштабируется под 1080p и
# 4K. 6% по бокам — 115 px на 1920, колонка 1690 px (было 1020).
SUB_MARGIN_X = round(SUB_GRID_X * 0.06)     # 23 -> 115 px на ширине 1920
SUB_MARGIN_V = round(SUB_GRID_Y * 0.07)     # 20 -> 75 px на высоте 1080


def _subtitles_filter(srt: Path, size: int = 19, style_name: str = "bold_box",
                      font: str = "") -> str:
    """Красивые субтитры для YouTube. Стили:
      bold_box   — крупный жирный белый, толстая обводка + мягкая тень
                   (универсальный «документальный» вид)
      pill       — белый текст на полупрозрачной тёмной плашке
      yellow_pop — жёлтый жирный с чёрной обводкой (viral/MrBeast-стиль)
    Позиция — нижняя треть, с воздухом от края.

    font — гарнитура канала (см. channels.sub_font). Шрифт субтитров это
    часть почерка канала: расследование и бытовые лайфхаки не могут быть
    набраны одним и тем же гротеском. Пусто — общий Segoe UI Black."""
    p = str(srt.resolve()).replace("\\", "/").replace(":", "\\:")
    # Bold=0: шрифт "Segoe UI Black" сам по себе уже самого жирного начертания
    # — Bold=1 поверх него раньше давал "фальшивый" сверх-жир (жалоба: "слишком
    # жирный"). Обводка/тень тоже почти вдвое тоньше — раньше 3.0-3.4/1.2-1.4
    # выглядело как тяжёлый ободок-ореол вокруг каждой буквы.
    # У обычных гарнитур (Georgia, Franklin Gothic) своего сверхжира нет —
    # им Bold=1 нужен, иначе субтитр на светлом кадре плывёт.
    name = (font or "Segoe UI Black").strip()
    bold = 0 if "Black" in name or "Impact" in name else 1
    common = (f"FontName={name},FontSize={size},Bold={bold},"
              f"Alignment=2,MarginV={SUB_MARGIN_V},MarginL={SUB_MARGIN_X},"
              f"MarginR={SUB_MARGIN_X},Spacing=0.3")
    if style_name == "pill":            # текст на полупрозрачной плашке
        # BorderStyle=3 — сплошной прямоугольник по строке. Было 4 с
        # Outline=14: такая обводка рисуется вокруг КАЖДОГО знака, наплывы
        # соседних букв сливались, и вместо плашки выходила бугристая клякса
        # с двойным контуром. Проверено рендером на реальном кадре.
        #
        # MarginV У ПЛАШКИ СЧИТАЕТСЯ НЕ ОТ ТОГО, ЧТО ВИДНО. libass отмеряет
        # MarginV до текстового блока, а BorderStyle=3 рисует прямоугольник
        # ЕЩЁ на Outline вниз — и нарисованный низ оказывается ниже
        # обещанного. Замер на собранном кадре 1920x1080, настоящая двухстрочная
        # реплика einsturzpunkt (Outline=6, MarginV=20): плашка занимает
        # y 840..1027, то есть её низ в 52 px от края кадра — 4.8% высоты.
        # А правило этого же файла (см. grotesk_air) говорит: ниже 7% нельзя,
        # там полоса проигрывателя YouTube, которая вылезает при наведении
        # мыши. То есть капсула субтитра лежала ПОД скрубером — на глаз это
        # и есть «субтитр не на месте», хотя число 20 читалось как 7%.
        #
        # Лечим двумя числами сразу, а не одним:
        #   Outline 6 -> 3.5 — плашка перестаёт быть слэбом. Замер той же
        #     реплики: высота блока 188 px была, 170 px стала, и капсулы
        #     соседних строк почти перестают налезать друг на друга (при 6
        #     они перекрывались на треть высоты, и в месте наложения две
        #     полупрозрачные заливки давали тёмный шов поперёк субтитра).
        #   MarginV = SUB_MARGIN_V + Outline — вот и вся поправка: ровно на
        #     столько единиц сетки прямоугольник свисает ниже текста.
        # Итог замером: плашка y 834..1003, низ 76 px = 7.0% — точно на
        # объявленном полу, а верх поднялся всего на 6 px (840 -> 834).
        # Менять Outline — обязательно вместе с MarginV, иначе низ снова
        # уедет под скрубер.
        pill_outline = 3.5
        style = (common
                 .replace(f"MarginV={SUB_MARGIN_V}",
                          f"MarginV={SUB_MARGIN_V + round(pill_outline)}")
                 + ",PrimaryColour=&H00FFFFFF,OutlineColour=&H90000000,"
                 "BackColour=&H90000000,BorderStyle=3,"
                 f"Outline={pill_outline},Shadow=0")
    elif style_name == "yellow_pop":    # жёлтый viral (MrBeast-стиль)
        style = (common + ",PrimaryColour=&H0000F0FF,OutlineColour=&H00101010,"
                 "BorderStyle=1,Outline=1.8,Shadow=0.6")
    elif style_name == "cyan_pop":      # голубой неон
        style = (common + ",PrimaryColour=&H00F0FF00,OutlineColour=&H00201000,"
                 "BorderStyle=1,Outline=1.8,Shadow=0.7")
    elif style_name == "red_alert":     # красный акцент (под красную тему)
        style = (common + ",PrimaryColour=&H004040FF,OutlineColour=&H00101010,"
                 "BorderStyle=1,Outline=1.8,Shadow=0.6")
    elif style_name == "serif_air":
        # АНТИКВА БЕЗ ПЛАШКИ — выбран владельцем из четырёх вариантов,
        # отрисованных на настоящих кадрах (2026-08-08).
        #
        # Откуда взялся. Разбор ролика-образца той же ниши (1.24 млн
        # просмотров): светлая антиква тонким штрихом, чистый белый, НИ
        # ПЛАШКИ, НИ ОБВОДКИ, только мягкая тень, одна строка. До этого у
        # канала стоял pill — полупрозрачная капсула под строкой, и
        # владелец про неё сказал прямо: «какие уродливые субтитры».
        #
        # Отличие от образца одно, и оно нарочное: тонкая обводка 0.8. У
        # образца кадры рисованные и ровные по свету, тени хватает. У нас
        # в кадре живая съёмка и генерация — на снежной пустоши или на
        # блике доспеха белый текст без обводки пропадает. Проверено
        # отрисовкой на тёмном и светлом кадре одного и того же ролика.
        # 0.8, а не 1.2: обводка должна страховать, а не рисоваться.
        # Общую часть переписываем, а не дополняем: там Bold=1 (антиква от
        # этого мутнеет), поля в 23 (строка тянется во всю ширину кадра) и
        # отступ снизу 20 (субтитр лежит на самом краю). Числа взяты с
        # отрисованного варианта, который выбрал владелец.
        style = (common
                 .replace(f"Bold={bold}", "Bold=0")
                 .replace(f"MarginV={SUB_MARGIN_V}",
                          f"MarginV={round(SUB_GRID_Y * 0.153)}")
                 .replace(f"MarginL={SUB_MARGIN_X}", "MarginL=68")
                 .replace(f"MarginR={SUB_MARGIN_X}", "MarginR=68")
                 .replace("Spacing=0.3", "Spacing=0.4")
                 + ",PrimaryColour=&H00FFFFFF,OutlineColour=&H00101010,"
                 "BorderStyle=1,Outline=0.8,Shadow=1.3")
    elif style_name == "grotesk_air":
        # ГРОТЕСК БЕЗ ПЛАШКИ — выбран владельцем для бытового канала из
        # трёх отрисованных вариантов (2026-08-08).
        #
        # Пара к serif_air, и пара НАРОЧНАЯ: каналы должны узнаваться и по
        # субтитрам тоже. У созерцательного антиква, у бытового гротеск —
        # зритель отличает канал, не читая названия.
        #
        # Обводка 1.7 против 0.8 у антиквы. Разница не в стиле, а в
        # материале: у философского канала кадры тёмные и ровные по свету,
        # у бытового — светлые и пёстрые (плитка, раковина, металл, блики).
        # Проверено отрисовкой на тёмном и светлом кадре одного ролика.
        #
        # Отдельно к сведению: у ролика-образца этого канала субтитров
        # речи НЕТ ВООБЩЕ — проверено пятью выборками по всему
        # хронометражу, только ярлыки предметов и подписи разделов. Но там
        # человек говорит в кадр, а у нас закадровый голос поверх стоков:
        # субтитры отчасти заменяют живого рассказчика и вытягивают тех,
        # кто смотрит без звука. Поэтому образец здесь скопирован НЕ
        # полностью, и это решение владельца, а не упущение.
        style = (common
                 .replace(f"Bold={bold}", "Bold=0")
                 # 7.6% от низа, а не 14.6%. Первая версия поднимала строку
                 # почти в середину нижней трети, и владелец сказал прямо:
                 # «внизу, а не в середине». Ниже 7% уводить нельзя — там
                 # начинается зона, которую YouTube перекрывает полосой
                 # проигрывателя при наведении мыши.
                 .replace(f"MarginV={SUB_MARGIN_V}",
                          f"MarginV={round(SUB_GRID_Y * 0.076)}")
                 .replace(f"MarginL={SUB_MARGIN_X}", "MarginL=62")
                 .replace(f"MarginR={SUB_MARGIN_X}", "MarginR=62")
                 .replace("Spacing=0.3", "Spacing=0.5")
                 # Обводка 0.6, а не 1.7. Первую версию владелец забраковал
                 # словами «без чёрных полос»: на плотном рубленом гротеске
                 # кайма в 1.7 сливается вокруг букв и читается как тёмная
                 # лента под строкой. Из трёх отрисованных степеней (0 /
                 # 0.6 / 1.0) выбрана средняя: каймы не видно, но буква
                 # отделена от фона и не пропадает на светлой плитке.
                 + ",PrimaryColour=&H00FFFFFF,OutlineColour=&H00101010,"
                 "BorderStyle=1,Outline=0.6,Shadow=1.2")
    elif style_name == "thin_clean":    # тонкий контур, минимализм
        style = (common + ",PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,"
                 "BorderStyle=1,Outline=1.2,Shadow=0.5")
    elif style_name == "top":           # субтитры сверху (не мешают кадру)
        # Alignment=6, а не 8. Связка ffmpeg+libass считает выравнивание в
        # force_style по СТАРОЙ нумерации SSA, а не по «клавиатурной» из
        # ASS v4+. Значение 8 (верх-центр в ASS v4+) ставило субтитры ровно
        # в середину экрана, поверх сюжета — то есть стиль «сверху, чтобы не
        # мешать» мешал сильнее всех прочих.
        #
        # Полная таблица, перемерена 2026-08-11 на кадре 1920x1080
        # (MarginV=20, MarginL=MarginR=23, по центру строки в % высоты):
        #     0,1,2,3,12 -> низ  (90.0%)   0/1/12 слева, 2 по центру, 3 справа
        #     4,5,6,7    -> верх (10.5%)   4/5 слева, 6 по центру, 7 справа
        #     8,9        -> середина (50.3%), причём СЛЕВА, а не по центру
        #     10         -> середина по центру, 11 -> середина справа
        # То есть «8-11 центр» — правда только про вертикаль: 8 и 9 прижаты
        # к левому краю. Ставить середину по центру — только 10.
        #
        # Общий Alignment=2 при этом трогать НЕ НАДО: «низ по центру» — это
        # 2 в ОБЕИХ нумерациях, замер подтверждает (y 953..991, строка по
        # центру кадра). Расхождение начинается с четвёрки, не раньше.
        style = (common.replace("Alignment=2", "Alignment=6")
                 .replace(f"MarginV={SUB_MARGIN_V}",
                          f"MarginV={round(SUB_GRID_Y * 0.055)}")
                 + ",PrimaryColour=&H00FFFFFF,OutlineColour=&H00151515,"
                 "BorderStyle=1,Outline=1.8,Shadow=0.6")
    else:  # bold_box — по умолчанию: белый, аккуратная обводка + мягкая тень
        style = (common + ",PrimaryColour=&H00FFFFFF,OutlineColour=&H00151515,"
                 "BorderStyle=1,Outline=2.0,Shadow=0.7,BackColour=&H40000000")
    return f"subtitles='{p}':force_style='{style}'"


def _ass_escape(text: str) -> str:
    return text.replace("{", "(").replace("}", ")").replace("\n", " ")


def build_karaoke_ass(srt_path: Path, words_path: Path, dest: Path,
                      W: int, H: int, size: int = 19,
                      accent: str = "29d9ff", font: str = "") -> Path | None:
    """Цветные субтитры с пословной подсветкой (караоке-заливка) точно в
    такт озвучке: слово подсвечивается акцентным цветом в момент, когда его
    произносят. Границы и текст фраз — как в voiceover.srt (строки уже
    разбиты по ширине канала, см. core._wrap_srt_line); таймкоды слов —
    из voiceover.json (--word_timestamps). Если слов меньше, чем в тексте
    фразы (несовпадение токенизации), остаток распределяется поровну —
    видимый текст никогда не обрезается.
    None, если voiceover.json нет или в нём пусто (старый Whisper без
    --output_format all) — вызывающий откатывается на обычные субтитры."""
    words = load_whisper_words(words_path)
    if not words:
        return None
    phrases = parse_srt(srt_path)
    if not phrases:
        return None

    # BGR-hex для ASS (не RGB!)
    def bgr(hexrgb: str) -> str:
        r, g, b = hexrgb[0:2], hexrgb[2:4], hexrgb[4:6]
        return f"&H00{b}{g}{r}".upper()

    primary = bgr(accent)      # уже произнесённое слово — акцент
    secondary = "&H00E6E6E6"   # ещё не произнесённое — светло-серый
    outline = "&H00151515"
    # то же правило, что и в _subtitles_filter: сверхжирным гарнитурам
    # Bold не нужен, обычным — обязателен
    kfont = (font or "Segoe UI Black").strip()
    kbold = 0 if "Black" in kfont or "Impact" in kfont else 1

    # Здесь заголовок пишем МЫ, и PlayRes равен кадру — значит все числа
    # стиля это настоящие пиксели, а не сетка 384x288 из _subtitles_filter
    # (см. SUB_GRID_Y). Одно и то же слово «средние» давало поэтому два
    # РАЗНЫХ субтитра. Замерено на собранных mp4 1920x1080 по одному и тому
    # же тексту: bold_box, размер 19 — высота букв 73 px; караоке, размер
    # 19 — 18 px, то есть вчетверо мельче и с экрана нечитаемо. А караоке —
    # это стиль целого канала (The Home Vault), то есть так выходил КАЖДЫЙ
    # его ролик. Переводим размер и отступы в пиксели по той же сетке.
    k = H / SUB_GRID_Y
    ksize = round(size * k)
    kmar_x, kmar_v = round(W * 0.06), round(H * 0.07)

    header = f"""[Script Info]
ScriptType: v4.00+
WrapStyle: 0
PlayResX: {W}
PlayResY: {H}
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, \
OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, \
ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, \
MarginR, MarginV, Encoding
Style: Karaoke,{kfont},{ksize},{primary},{secondary},{outline},\
&H64000000,{kbold},0,0,0,100,100,0.3,0,1,{2.0 * k:.1f},{0.6 * k:.1f},2,\
{kmar_x},{kmar_x},{kmar_v},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

    def fmt(t: float) -> str:
        cs = round(t * 100)
        h, rem = divmod(cs, 360000)
        m, rem = divmod(rem, 6000)
        s, cs = divmod(rem, 100)
        return f"{h:d}:{m:02d}:{s:02d}.{cs:02d}"

    wi = 0  # указатель в общем списке слов — фразы идут по порядку
    lines = []
    for start_s, end_s, text in phrases:
        p_start, p_end = srt_to_seconds(start_s), srt_to_seconds(end_s)
        toks = text.split()
        if not toks:
            continue
        # берём следующие len(toks) слов из общего списка — тот же прогон
        # Whisper, порядок гарантированно совпадает даже при иной пунктуации
        chunk = words[wi:wi + len(toks)]
        wi += len(chunk)
        if len(chunk) < len(toks):  # запасной путь: не хватило слов
            even = (p_end - p_start) / len(toks)
            chunk = [{"start": p_start + i * even,
                     "end": p_start + (i + 1) * even}
                     for i in range(len(toks))]
        k_tags = []
        for i, (tok, w) in enumerate(zip(toks, chunk)):
            nxt = chunk[i + 1]["start"] if i + 1 < len(chunk) else p_end
            dur_cs = max(round((nxt - w["start"]) * 100), 1)
            k_tags.append(f"{{\\k{dur_cs}}}{_ass_escape(tok)}")
        # лёгкий «влёт» строки: 85% -> 100% за 180мс
        body = ("{\\fscx85\\fscy85\\t(0,180,\\fscx100\\fscy100)}"
                + " ".join(k_tags))
        lines.append(f"Dialogue: 0,{fmt(p_start)},{fmt(p_end)},Karaoke,,"
                     f"0,0,0,,{body}")

    dest.write_text(header + "\n".join(lines) + "\n", encoding="utf-8")
    return dest


def _ass_filter(ass_path: Path) -> str:
    p = str(ass_path.resolve()).replace("\\", "/").replace(":", "\\:")
    return f"ass='{p}'"


# Цветокор-пресеты (выбор на вкладке «Авторендер»; «случайный» решает
# seed проекта). Применяются до субтитров, чтобы текст оставался чистым.
LOOKS = {
    "teal_orange":   "colorbalance=rs=.08:bs=-.06:rm=.05:bm=-.05,"
                     "eq=saturation=1.1:contrast=1.05",
    "cinematic":     "eq=brightness=-0.04:contrast=1.12:saturation=0.92",
    "golden_hour":   "colorbalance=rs=.1:gs=.03:bs=-.08,"
                     "eq=brightness=0.02:saturation=1.1",
    "warm_sunset":   "colortemperature=temperature=4600,eq=saturation=1.08",
    "cold_thriller": "colortemperature=temperature=8600,"
                     "eq=saturation=0.9:contrast=1.07",
    "arctic":        "colortemperature=temperature=9500,"
                     "eq=saturation=0.7:brightness=0.03",
    "moonlight":     "colorbalance=bs=.12:bm=.06,"
                     "eq=brightness=-0.05:saturation=0.8",
    "sepia":         "colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:"
                     ".272:.534:.131",
    "bw_noir":       "hue=s=0,eq=contrast=1.25:brightness=-0.02",
    "bw_soft":       "hue=s=0,eq=contrast=1.05",
    "faded_film":    "curves=all='0/0.06 0.5/0.5 1/0.94',eq=saturation=0.85",
    "vintage_70s":   "curves=r='0/0.04 1/0.95':b='0/0.1 1/0.88',"
                     "eq=saturation=0.9",
    "cross_process": "curves=r='0/0 0.5/0.55 1/1':b='0/0.1 0.5/0.45 1/0.9'",
    "dreamy":        "gblur=sigma=1.1,eq=brightness=0.03:saturation=1.05",
    "crisp":         "unsharp=5:5:0.8,eq=saturation=1.05",
    "high_contrast": "eq=contrast=1.2:saturation=1.05",
    "bleach":        "eq=saturation=0.45:contrast=1.25",
    "pastel":        "eq=saturation=0.78:brightness=0.04:contrast=0.95",
    "cyberpunk":     "colorbalance=rs=-.05:bs=.15:rm=.02:bm=.1,"
                     "eq=saturation=1.25:contrast=1.08",
    "matrix":        "colorbalance=gs=.12:gm=.08,"
                     "eq=saturation=0.85:contrast=1.1",
    "crimson":       "colorbalance=rs=.15:rm=.08,eq=saturation=1.05",
    "forest":        "colorbalance=gs=.08:gm=.05,eq=saturation=1.02",
    "documentary":   "eq=saturation=0.97:contrast=1.03",
    "noir_blue":     "colorbalance=bs=.1:bm=.05,hue=s=0.35,"
                     "eq=contrast=1.18:brightness=-0.03",
    "sunbleached":   "curves=all='0/0.1 0.5/0.55 1/0.95',"
                     "eq=saturation=0.7:brightness=0.05",
}


def _screen_luma(opacity: float) -> str:
    """Свечение поверх кадра: screen ТОЛЬКО по яркости, цвет кадра не трогаем.

    Это и была причина розово-сиреневого налива во всех роликах 04–05.08.
    `blend=all_mode=screen` применяет screen ко ВСЕМ плоскостям, включая U и V,
    а в YUV нейтральный серый — это 128, а не 0. Формула screen ничего не знает
    про смещённую середину: screen(128,128) = 255-(255-128)²/255 = 192. То есть
    любое «свечение» тащит U и V к 192 — к синему И красному разом, то есть в
    мадженту. Зелёный в YUV живёт на противоходе (G = Y - 0.19·U' - 0.47·V'),
    поэтому чем сильнее свет, тем сильнее гаснет зелень — ровно то, что видел
    владелец: «залито розовым, зелень гаснет».

    Замер на пятисекундном куске beat_001 (собранный mp4, кадр на 2 c):
      без эффектов         Y 138.09  U 137.47  V 123.74
      засветка             Y 140.79  U 144.13  V 131.21
      bloom                Y 139.58  U 147.08  V 133.85
      песок                Y 141.42  U 141.10  V 127.73
      все три (умолчание)  Y 145.60  U 156.94  V 144.75
    Три слоя разом дают +19 к U и +21 к V. По одному сдвиг мал — потому
    проверка каждого эффекта в отдельности их и оправдала; беда в СУММЕ,
    а sand+light_leak+bloom с 04.08 включены по умолчанию всем каналам.
    В среднем RGB (кадр ужат до 160x90) те же три слоя дают G−R с +8.5 до
    −43.5 и G−B с −19.2 до −69.6, устойчиво на всех трёх проверенных кадрах.
    В готовом ролике владельца разрыв R−G был +38.2 — тот же профиль.

    Отдельно проверено и ОПРОВЕРГНУТО прежнее объяснение «в PNG дефекта не
    видно». Видно: та же цепочка, выгруженная кадром, даёт R 176.0 G 132.4
    B 201.7, а собранная в mp4 — R 175.7 G 132.2 B 201.8. Совпадает до
    десятых. Ловушка была не в PNG, а в том, ЧТО с чем сравнивали: сличали
    кадр старой версии засветки с кадром новой (R 146.8 G 136.2 B 174.7
    против почти того же), они и вправду одинаковы — обе версии были
    сломаны одинаково. Сравнивать надо было с кадром БЕЗ эффектов.

    Починка: c0 (яркость) — screen с нужной прозрачностью, c1/c2 (цвет) —
    normal с opacity=1. У blend вход #0 называется «top», и при opacity=1
    остаётся именно он, а первым входом во всех наших эффектах идёт КАДР.
    Проверено: та же засветка после правки даёт Y 140.80 U 137.48 V 123.73 —
    яркость выросла ровно как раньше, цвет вернулся к исходному до сотых.
    """
    return (f"blend=c0_mode=screen:c0_opacity={opacity}:"
            f"c1_mode=normal:c1_opacity=1:c2_mode=normal:c2_opacity=1")


def _style_chain(opts: dict, wh: tuple[int, int] = (1920, 1080)) -> list[str]:
    chain = []
    if opts.get("vhs"):
        chain.append("noise=alls=10:allf=t,rgbashift=rh=2:bv=2,"
                     "gblur=sigma=0.4,eq=saturation=0.88:contrast=1.05")
    else:
        if opts.get("grain"):
            chain.append("noise=alls=6:allf=t")
    # --- эффекты поверх кадра (световые блики, засветка, пыль, мерцание) ---
    if opts.get("light_leak"):
        # мягкое световое пятно у края — «плёночная» засветка. ВАЖНО:
        # vignette в mode=backward, применённый прямо к кадру, даёт не
        # мягкую засветку, а огромное пятно с жёсткой геометрической
        # границей (эффект «зелёный полукруг поверх кадра», который видел
        # пользователь на реальном рендере) — angle=PI/5 даёт слишком
        # тесный конус, а backward-режим переворачивает его в резкий
        # highlight вместо плавного градиента. Вместо этого строим
        # отдельный белый слой с ОБЫЧНЫМ (forward) vignette (широкий
        # угол — гладкий, без видимой границы) и сводим screen-блендом на
        # низкой прозрачности — тот же приём, что и bloom ниже.
        w, h = wh
        # format=gray -> format=yuv420p приводят слой к формату кадра, чтобы
        # blend не смешивал яркость с красным. Это гигиена, но НЕ лечение
        # розового: перевод в yuv420p ставит U и V слоя в 128, а screen с
        # нейтралью 128 всё равно тащит цвет кадра к 192 (см. _screen_luma).
        # Замерено: с этими двумя format засветка давала U 137.47 -> 144.13.
        # Лечит именно поплоскостной режим смешивания в _screen_luma.
        chain.append(
            f"null[llbase];color=c=white:s={w}x{h},format=gray[llwhite];"
            f"[llwhite]vignette=angle=PI/2.15:x0=w*0.85:y0=h*0.2:aspect=1,"
            f"format=yuv420p[llv];"
            f"[llbase][llv]" + _screen_luma(0.12))
    if opts.get("bloom"):
        # Свечение светлых участков — деликатный кинематографичный «glow».
        # Стиль-цепочка идёт ПОСЛЕДНИМ слоем (поверх титров/субтитров), а
        # белый текст титра — самый яркий объект в кадре, поэтому сильный
        # bloom раздувал его в уродливый белый ореол. Ключевое: сначала
        # curves отсекает всё, кроме почти-белого (0.72 порог), и только
        # это малое ярко-светлое размывается — текст не бьёт в глаза
        # гало, а реально светлые пятна (небо, огни) мягко светятся.
        chain.append("split[a][b];"
                     "[b]curves=all='0/0 0.72/0 1/1',gblur=sigma=9[bl];"
                     "[a][bl]" + _screen_luma(0.16))
    if opts.get("dust"):
        # редкие крапинки-пылинки, как на старой плёнке
        chain.append("noise=alls=3:allf=t+u,eq=contrast=1.02")
    if opts.get("flicker"):
        # лёгкое мерцание яркости — «живая» плёнка
        chain.append("eq=brightness='0.012*sin(2*PI*t*3)'")
    # Частицы поверх кадра. ВАЖНО: шум только по ЛЮМЕ (c0s/c0f), а не alls —
    # alls шумит и по цветовым плоскостям, lutyuv их не чистит, и кадр
    # заливало ядовито-фиолетовым. hue=s=0 добивает остатки цвета, а нужный
    # оттенок задаётся уже при смешивании через colorbalance.
    if opts.get("sand"):
        # Пыльная взвесь в воздухе: мелкое подвижное зерно отдельным слоем,
        # а не правка самого кадра (как у dust) — тени не грязнятся.
        w, h = wh
        chain.append(
            f"null[sdb];color=c=gray:s={w}x{h},format=gray,"
            f"noise=c0s=64:c0f=t+u,boxblur=1:1,eq=contrast=2.2,"
            f"format=yuv420p,colorbalance=rm=0.18:gm=0.06:bm=-0.16[sdn];"
            f"[sdb][sdn]" + _screen_luma(0.07))
    if opts.get("stars"):
        # Редкие светлые точки — «звёзды»/искры. Порог по яркости оставляет
        # только самые светлые крапины, иначе выходит сплошной шум.
        w, h = wh
        chain.append(
            f"null[stb];color=c=black:s={w}x{h},format=gray,"
            f"noise=c0s=100:c0f=t,lutyuv=y='if(gt(val,246),val,0)',"
            # colorbalance тут не ради цвета (сдвиги почти нулевые), а чтобы
            # заставить ffmpeg провести корректное преобразование плоскостей:
            # без него слой уходил в розовый (255,169,255) на реальном видео.
            # Проверено сравнением с/без на настоящем клипе.
            f"boxblur=1:1,format=yuv420p,"
            f"colorbalance=rm=-0.04:gm=0:bm=0.06[stn];"
            # all_opacity — ЧИСЛО, выражение оно не принимает («Unable to
            # parse option value»). Мерцание даёт временной шум c0f=t.
            f"[stb][stn]" + _screen_luma(0.85))
    if opts.get("embers"):
        # Тёплые угольки в луче света — плотнее звёзд, для тёмных сцен.
        w, h = wh
        chain.append(
            f"null[emb];color=c=black:s={w}x{h},format=gray,"
            f"noise=c0s=90:c0f=t,lutyuv=y='if(gt(val,240),val,0)',"
            f"boxblur=2:1,format=yuv420p,"
            f"colorbalance=rm=0.45:gm=0.12:bm=-0.35[emn];"
            f"[emb][emn]" + _screen_luma(0.5))
    if opts.get("vignette"):
        chain.append("vignette=angle=PI/5")
    if opts.get("letterbox"):
        chain.append("drawbox=x=0:y=0:w=iw:h=ih*0.125:color=black:t=fill,"
                     "drawbox=x=0:y=ih*0.875:w=iw:h=ih*0.125:color=black:t=fill")
    return chain


# Атмосферный звук ИИ-клипов: громкость и потолок числа дорожек.
AMB_GAIN = 0.28
AMB_MAX_CLIPS = 40
# Громкость звуков-акцентов. Была вписана числом прямо в фильтр — вынесена,
# чтобы звуковой профиль канала (core.SOUND_PALETTES) мог её сдвигать.
SFX_GAIN = 0.3

# Сколько всего входов «-i» выдерживает финальный ffmpeg. Замер: 106 доезжало,
# 176 вставало намертво. Берём 110 с запасом вниз от найденной границы.
MAX_TOTAL_INPUTS = 110
# Из них на оверлеи — большая часть: их видно, а звуковые слои лишь слышно.
# 2 входа заняты видео и голосом, остаток делится между звуками и атмосферой.
MAX_OVERLAY_INPUTS = 78
MAX_SFX_INPUTS = 12


def _has_audio(path: Path) -> bool:
    """Есть ли в файле звуковая дорожка (ffprobe)."""
    try:
        r = subprocess.run(
            ["ffprobe", "-v", "error", "-select_streams", "a",
             "-show_entries", "stream=index", "-of", "csv=p=0", str(path)],
            capture_output=True, text=True, timeout=60, creationflags=CREATE_NO_WINDOW)
        return bool(r.stdout.strip())
    except Exception:
        return False


def _overlay_chain(ovls: list[dict], first_in: int, src: str) -> str:
    """Цепочка наложения оверлеев на поток `src`. Возвращает filter_complex
    без завершающей метки — последняя метка [vo{N-1}] и есть результат.

    Вынесено отдельно, потому что нужно в двух местах: в финальном проходе и
    в предварительном запекании (см. _bake_overlays)."""
    fc, prev = "", src
    for i, ov in enumerate(ovls):
        fc += (f"[{first_in + i}:v]setpts=PTS-STARTPTS+{ov['t0']:.3f}/TB[o{i}];"
               f"{prev}[o{i}]overlay={ov['x']}:{ov['y']}:"
               f"eof_action=pass:"
               f"enable='between(t,{ov['t0']:.3f},{ov['t1']:.3f})'"
               f"[vo{i}];")
        prev = f"[vo{i}]"
    return fc


def _bake_overlays(base_input: list[str], ovls: list[dict], dest: Path,
                   fps: int, tmp: Path, wh: tuple[int, int], log=print) -> bool:
    """Наложить порцию оверлеев ЗАРАНЕЕ, отдельным проходом.

    Зачем: ffmpeg не тянет больше ~110 входов в одном filter_complex —
    замерено, на 176 он встаёт намертво (0 c процессора, кадр не двигается).
    Раньше лишние оверлеи просто выбрасывались, и ролик выходил беднее
    задуманного. Здесь они не теряются: накладываются предварительным
    проходом, а в финал идёт уже готовая картинка.

    Промежуток кодируется с crf 14 — на глаз неотличимо от исходника, а
    финальный проход всё равно пережмёт до crf 19.

    False — проход не удался; вызывающий тогда обрежется по потолку, как
    раньше: лучше ролик без части плашек, чем зависший рендер.
    """
    base_dir = Path(tmp).parent
    cmd = ["ffmpeg", "-y"] + base_input
    for ov in ovls:
        pat = ov["pattern"]
        try:
            pat = str(Path(pat).relative_to(base_dir))
        except ValueError:
            pass
        cmd += ["-framerate", str(fps), "-start_number", "0", "-i", pat]
    n_base = sum(1 for a in base_input if a == "-i")
    fc = _overlay_chain(ovls, n_base, "[0:v]")
    fc += f"[vo{len(ovls) - 1}]null[vout]"
    fcf = tmp / f"bake_{dest.stem}.txt"
    fcf.write_text(fc, encoding="utf-8")
    cmd += ["-filter_complex_script", str(fcf), "-map", "[vout]", "-an",
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "14",
            "-pix_fmt", "yuv420p"] + COLOR_TAGS + [str(dest)]
    log(f"[Рендер] Запекаю {len(ovls)} оверлеев отдельным проходом "
        "(в один ffmpeg столько входов не влезает)")
    try:
        r = run_tree(cmd, 5400, cwd=str(base_dir))
    except Exception as e:
        log(f"[Рендер] Запекание не вышло ({str(e)[:120]}) — обрежу оверлеи "
            "по потолку", "warn")
        return False
    # ПОЧЕМУ НЕ ВЫШЛО — обязательно вслух. run_tree исключение по коду выхода
    # НЕ бросает, он просто отдаёт CompletedProcess, и до этой строки причину
    # знал только ffmpeg: наружу уходило «запекание не удалось (причина строкой
    # выше)», а строкой выше стояло «Запекаю N оверлеев». Цена молчания —
    # тринадцать плашек готового ролика, потерянных 05.08, и совет «перезапусти
    # рендер» вместо настоящей причины. До правки run_tree эта ветка вообще не
    # исполнялась ни разу (NameError), так что её отказ никто и не видел.
    ok = dest.exists() and dest.stat().st_size > 100_000
    if not ok:
        tail = [s for s in (r.stderr or "").strip().splitlines() if s.strip()]
        log(f"[Рендер] Запекание не дало файла (код {r.returncode}): "
            + (" | ".join(tail[-3:])[:400] if tail else "ffmpeg промолчал")
            + " — обрежу оверлеи по потолку", "warn")
    return ok


def assemble(group_files: list[Path], audio: Path, srt: Path | None,
             dest: Path, fps: int, total: float, opts: dict, tmp: Path,
             look_chain: str = "", ovls: list[dict] | None = None,
             wh: tuple[int, int] = (1920, 1080), log=print,
             scenes: list[dict] | None = None):
    """Финал: конкат групп + оверлеи + звук + субтитры + цветокор + стиль.
    Порядок слоёв: сцена -> цветокор -> оверлеи -> субтитры -> стиль."""
    concat_list = tmp / "groups.txt"
    concat_list.write_text(
        "\n".join(_concat_line(f) for f in group_files),
        encoding="utf-8")
    filters = []
    if look_chain:                        # цветокор до субтитров и оверлеев
        filters.append(look_chain)
    post = []                             # после оверлеев: субтитры и стиль
    if srt and srt.exists() and opts.get("subs", True):
        size = SUB_SIZES.get(opts.get("sub_size", "средние"), 19)
        style_name = opts.get("sub_style", "bold_box")
        sub_font = opts.get("sub_font", "")
        sub_filter = None
        if style_name == "karaoke":
            words_json = srt.parent / "voiceover.json"
            ass = build_karaoke_ass(srt, words_json, tmp / "karaoke.ass",
                                    wh[0], wh[1], size,
                                    opts.get("accent_color", "d9b36c"),
                                    sub_font)
            if ass:
                sub_filter = _ass_filter(ass)
            else:
                style_name = "bold_box"   # нет voiceover.json — откат
                import quality
                quality.degraded(
                    "Субтитры", "субтитры обычные, без пословной подсветки "
                                "(караоке)",
                    why="нет пословных таймкодов: voiceover.json отсутствует "
                        "или пуст",
                    hint="переозвучь проект — Whisper должен отдать "
                         "voiceover.json со словами (--word_timestamps)",
                    level="заметно")
        if sub_filter is None:
            sub_filter = _subtitles_filter(srt, size, style_name, sub_font)
        post.append(sub_filter)
    post += _style_chain(opts, wh)
    # Тот же пересчёт, что и у сегментов: в финал приходят ещё и PNG-секвенции
    # оверлеев и синтетические слои (color=, noise=), а они свои цветовые
    # свойства не объявляют, и без приведения файл снова уедет в BT.601.
    post.append(COLOR_FIX)
    post.append("format=yuv420p")

    # АБСОЛЮТНЫЕ пути: финальный ffmpeg запускается с cwd=папка проекта
    # (чтобы пути к PNG-секвенциям оверлеев были короткими — иначе командная
    # строка Windows переполняется). Относительный путь к groups.txt при этом
    # раскрывался от папки проекта, а не от рабочей папки процесса, и файл
    # «пропадал»: ffmpeg искал estoico-es/estoico-es/render_tmp/groups.txt.
    # Проявлялось только когда проект передан относительным путём И есть
    # оверлеи, поэтому из интерфейса (там путь всегда абсолютный) не всплывало.
    # ПОТОЛОК ЧИСЛА ВХОДОВ. Замер по журналу 2026-08-04: финальный проход с
    # 103 и 106 входами доезжал, со 176 и 320 — вставал НАМЕРТВО. Не медленно:
    # ffmpeg продолжал печатать строки прогресса, но кадр не двигался, а
    # процессорного времени тратилось 0.0 c за 20 секунд — взаимоблокировка.
    # Ролик на 14 минут собрал 107 оверлеев + 27 звуков + 40 клипов атмосферы =
    # 176 входов и встал на 22% за 18 минут до полной остановки.
    #
    # Режем по приоритету: оверлеи видно, атмосферу слышно, звуки-акценты —
    # приятная мелочь. Лучше ролик без части акцентов, чем зависший рендер.
    # Видеовход финала: обычно склейка групп, но если оверлеев слишком много —
    # предварительно запечённый файл (см. ниже).
    video_in = ["-f", "concat", "-safe", "0",
                "-i", str(Path(concat_list).resolve())]
    if len(ovls) > MAX_OVERLAY_INPUTS:
        # Лишние НЕ выбрасываем: накладываем их заранее, порциями. Каждый
        # проход добавляет минуты, зато в ролике остаются все плашки.
        baked = None
        src = list(video_in)
        rest = list(ovls)
        step = 0
        while len(rest) > MAX_OVERLAY_INPUTS:
            chunk, rest = rest[:MAX_OVERLAY_INPUTS], rest[MAX_OVERLAY_INPUTS:]
            step += 1
            out = tmp / f"baked_{step:02d}.mp4"
            if not _bake_overlays(src, chunk, out, fps, tmp, wh, log):
                baked = None
                break
            baked = out
            src = ["-i", str(out.resolve())]
        if baked is not None:
            video_in = ["-i", str(baked.resolve())]
            ovls = rest
            log(f"[Рендер] Запечено за {step} проход(а/ов); в финал идут "
                f"последние {len(ovls)} оверлеев")
        else:
            log(f"[Рендер] Оверлеев {len(ovls)}, беру первые "
                f"{MAX_OVERLAY_INPUTS}: больше {MAX_TOTAL_INPUTS} входов "
                "ffmpeg не переваривает — проверено, встаёт намертво", "warn")
            # Обрезка ВИДНА зрителю: во второй половине ролика плашек просто
            # нет, и выглядит это как «моушн-графика кончилась». Одной строкой
            # warn в журнале на тысячу строк это не заметить — а именно так и
            # терялись длинные ролики.
            import quality
            quality.degraded(
                "Оверлеи",
                f"в ролик попала только часть плашек ({MAX_OVERLAY_INPUTS} из "
                f"{len(ovls)}) — дальше по хронометражу их нет",
                why="запекание лишних оверлеев отдельным проходом не удалось "
                    "(причина строкой выше), а больше "
                    f"{MAX_TOTAL_INPUTS} входов ffmpeg не выдерживает",
                hint="перезапусти рендер: чаще всего запекание срывается из-за "
                     "нехватки места или памяти",
                level="заметно")
            ovls = ovls[:MAX_OVERLAY_INPUTS]

    cmd = ["ffmpeg", "-y"] + video_in + ["-i", str(Path(audio).resolve())]
    if ovls:
        # Пути к секвенциям — относительные, ffmpeg запускается из папки
        # проекта. Абсолютный путь тут повторяется на КАЖДЫЙ оверлей, и на
        # сотне с лишним это тысячи лишних символов в команде, длина которой
        # и так упирается в предел Windows.
        base_dir = Path(tmp).parent
        for ov in ovls:
            pat = ov["pattern"]
            try:
                pat = str(Path(pat).relative_to(base_dir))
            except ValueError:
                pass
            cmd += ["-framerate", str(fps), "-start_number", "0", "-i", pat]
        fc = "[0:v]" + (",".join(filters) if filters else "null") + "[vb];"
        prev = "[vb]"
        for i, ov in enumerate(ovls):
            fc += (f"[{2 + i}:v]setpts=PTS-STARTPTS+{ov['t0']:.3f}/TB[o{i}];"
                   f"{prev}[o{i}]overlay={ov['x']}:{ov['y']}:"
                   f"eof_action=pass:"
                   f"enable='between(t,{ov['t0']:.3f},{ov['t1']:.3f})'"
                   f"[vo{i}];")
            prev = f"[vo{i}]"
        fc += prev + ",".join(post) + "[vout]"

        # SFX (whoosh/pop/ding) синхронно с появлением оверлеев: каждый
        # найденный тип -> отдельный вход-WAV, adelay сдвигает его на t0
        # оверлея, amix сводит с основной дорожкой. watermark и незнакомые
        # типы — без звука (см. SFX_FOR_TYPE). Любая ошибка синтеза/сведения
        # тихо откатывается на обычную дорожку — SFX не критичны для рендера.
        audio_map = "1:a"
        # Звуковой профиль канала: плотность акцентов и громкости. То же поле
        # «palette», что и у монтажа, — канал настраивается целиком, а не
        # наполовину. Пустая палитра даёт прежние числа.
        snd = sound_palette_of(opts.get("palette", ""))
        if opts.get("sfx", True):
            try:
                # Каждый ЗВУК подключается ОДИН раз и размножается asplit.
                # Раньше на каждый оверлей добавлялся свой -i, и один и тот
                # же whoosh.wav попадал в команду 155 раз — это одно и было
                # главным вкладом в переполнение длины командной строки
                # Windows (см. ниже про filter_complex_script).
                want = []
                # Счётчик СВОЙ на каждую роль: иначе whoosh, которых 59 из 98,
                # прокручивал бы пул рывками через общий индекс и повторялся
                # чаще, чем нужно.
                seen_role: dict[str, int] = {}
                for ov in ovls:
                    role = SFX_FOR_TYPE.get(ov.get("type", ""))
                    if not role:
                        continue
                    k = seen_role.get(role, 0)
                    seen_role[role] = k + 1
                    # «#» в имя метки ffmpeg не годится — заменяем на «_v»
                    want.append((pick_sfx(role, k).replace("#", "_v"),
                                 max(0, round(ov["t0"] * 1000))))
                # Прореживание по профилю канала — ТОЛЬКО плашки. Их сотни, и
                # щелчок на каждой это подпись канала: у тёплого он уместен,
                # у созерцательного рвёт ритм. Прореживаем ровным шагом, а не
                # случайно: случай даёт то пусто, то три акцента подряд.
                dens = float(snd.get("sfx_density", 1.0))
                if dens < 1.0 and want:
                    was = len(want)
                    want = [ev for k, ev in enumerate(want)
                            if int((k + 1) * dens) > int(k * dens)]
                    log(f"[Рендер] Звуковой профиль «{snd['name']}»: "
                        f"акценты на {len(want)} плашках из {was}")
                # ЗВУК СЦЕН. Прореживанию выше НЕ подлежит: сцена — это удар,
                # обрушение, целый нарисованный план, а не украшение плашки.
                # Сцены нет в списке оверлеев: без этого кадра она выходила
                # немой, хотя именно ей звук нужен сильнее всего (отказ опоры
                # без удара выглядит мультиком). Опознаём по имени файла: сцены
                # называются beat_NNN_scene_<вид>.mp4.
                for sc in (scenes or []):
                    f = sc.get("file")
                    if not f or "_scene_" not in Path(f).name:
                        continue
                    kind = Path(f).stem.split("_scene_", 1)[1]
                    role = SFX_FOR_SCENE.get(kind, "whoosh")
                    k = seen_role.get(role, 0)
                    seen_role[role] = k + 1
                    want.append((pick_sfx(role, k).replace("#", "_v"),
                                 max(0, round(float(sc.get("start", 0)) * 1000))))
                uniq = sorted({n for n, _ in want})
                # Звуки-акценты режем первыми: каждый уникальный это ещё один
                # вход ffmpeg, а их набегало 27 при потолке в 110 на всё.
                if len(uniq) > MAX_SFX_INPUTS:
                    keep = set(uniq[:MAX_SFX_INPUTS])
                    want = [(n, d) for n, d in want if n in keep]
                    uniq = sorted(keep)
                    _console(f"[Рендер] Звуков-акцентов слишком много — "
                             f"оставляю {MAX_SFX_INPUTS} видов")
                base = 2 + len(ovls)
                slot = {n: base + k for k, n in enumerate(uniq)}
                # Входы копим отдельно и подмешиваем в cmd только когда вся
                # звуковая часть собралась. Раньше -i дописывались сразу, и
                # отказ get_sfx на втором звуке (нет прав на assets/sfx,
                # битый wav) оставлял в команде входы, на которые уже никто
                # не ссылается: except откатывал audio_map, а мусор в cmd —
                # нет, и он молча ел лимит длины командной строки.
                sfx_inputs = []
                for n in uniq:
                    sfx_inputs += ["-i", str(get_sfx(n))]
                sfx_parts, sfx_labels = [], []
                # сколько копий каждого звука нужно — столько выходов у asplit
                need = {n: sum(1 for x, _ in want if x == n) for n in uniq}
                for n in uniq:
                    outs = "".join(f"[{n}_{j}]" for j in range(need[n]))
                    sfx_parts.append(f"[{slot[n]}:a]asplit={need[n]}{outs}")
                used = {n: 0 for n in uniq}
                for n, delay_ms in want:
                    src = f"[{n}_{used[n]}]"
                    used[n] += 1
                    lbl = f"sfx{len(sfx_labels)}"
                    sfx_parts.append(f"{src}adelay={delay_ms}:all=1,"
                                     f"volume={SFX_GAIN * float(snd['sfx_gain']):.3f}"
                                     f"[{lbl}]")
                    sfx_labels.append(lbl)
                if sfx_labels:
                    sfx_parts.append(
                        "[1:a]" + "".join(f"[{l}]" for l in sfx_labels)
                        + f"amix=inputs={1 + len(sfx_labels)}:"
                          "duration=first:normalize=0[aout]")
                    cmd += sfx_inputs
                    fc += ";" + ";".join(sfx_parts)
                    audio_map = "[aout]"
            except Exception as e:
                log(f"[Рендер] SFX пропущены ({e.__class__.__name__}: {e})")
                # Галка «звуки» стоит, а звуков нет — это слышно: плашки
                # выезжают в тишине. Строка выше уходила в общий поток журнала
                # и в итог прогона не попадала никак.
                import quality
                quality.degraded(
                    "Звук", "плашки и сцены появляются беззвучно — "
                            "звуки-акценты в ролик не попали",
                    why=f"сборка звуковой дорожки сорвалась: "
                        f"{e.__class__.__name__}: {str(e)[:120]}",
                    hint="проверь папку assets/sfx — обычно это недоступный "
                         "или битый wav",
                    level="заметно")
                audio_map = "1:a"
        # Атмосферный звук ИИ-клипов. Veo отдаёт ролик СО ЗВУКОМ — замерено
        # ffprobe на свежесгенерированном клипе: дорожки h264 + aac. Дождь по
        # крыше, ветер, шаги приходят вместе с картинкой бесплатно, а
        # конвейер срезал их четырьмя «-an» и оставлял голый голос под
        # музыкой.
        #
        # Только ИИ-клипы (суффикс _ai). У стокового материала своя звуковая
        # дорожка — чужая музыка, речь, хлопки микрофона; подмешать её значит
        # испортить ролик, а не оживить.
        #
        # Приглушение под голосом обязательно: sidechaincompress, как у
        # музыки. Без него дождь забивает диктора.
        # ВНИМАНИЕ: блок живёт внутри «if ovls» — при ПУСТОМ списке оверлеев
        # assemble идёт коротким путём и сюда не заходит. На настоящем ролике
        # оверлеев сотни, так что путь рабочий, но ролик совсем без
        # моушн-графики атмосферы не получит. Вынести отсюда — отдельная
        # правка, требующая перетряхнуть построение fc/cmd целиком.
        if opts.get("clip_audio", True) and scenes:
            try:
                amb = []
                for sc in scenes:
                    f, k = sc.get("file"), sc.get("kind")
                    if not f or k != "video":
                        continue
                    p = Path(f)
                    if "_ai" not in p.stem or not _has_audio(p):
                        continue
                    dur = float(sc["end"]) - float(sc["start"])
                    if dur > 0.4:
                        amb.append((p, float(sc["start"]), dur))
                # Потолок: каждая дорожка — отдельный «-i», а длина команды
                # Windows уже однажды рушила рендер после трёх часов работы.
                # Сколько входов ещё можно потратить: всё, что уже в команде,
                # уже занято (видео, голос, оверлеи, звуки-акценты).
                used_inputs = sum(1 for a in cmd if a == "-i")
                amb_cap = max(4, min(AMB_MAX_CLIPS,
                                     MAX_TOTAL_INPUTS - used_inputs))
                if len(amb) > amb_cap:
                    amb.sort(key=lambda x: -x[2])
                    amb = amb[:amb_cap]
                    amb.sort(key=lambda x: x[1])
                if amb:
                    # Номер входа в ffmpeg = порядок его «-i» в команде.
                    base = sum(1 for a in cmd if a == "-i")
                    parts, labels, ins = [], [], []
                    for k2, (p, t0, dur) in enumerate(amb):
                        ins += ["-i", str(p)]
                        lbl = f"amb{k2}"
                        parts.append(
                            f"[{base + k2}:a]atrim=0:{dur:.3f},"
                            f"asetpts=PTS-STARTPTS,"
                            f"adelay={int(t0 * 1000)}:all=1,"
                            f"volume={AMB_GAIN * float(snd['clip_amb']):.3f}"
                            f"[{lbl}]")
                        labels.append(lbl)
                    voice = (audio_map if audio_map.startswith("[")
                             else f"[{audio_map}]")
                    parts.append(f"{voice}asplit=2[vA][vB]")
                    parts.append("".join(f"[{l}]" for l in labels)
                                 + f"amix=inputs={len(labels)}:"
                                   "duration=longest:normalize=0[ambmix]")
                    parts.append(
                        "[ambmix][vB]sidechaincompress=threshold=0.03:"
                        "ratio=9:attack=25:release=600[ambduck]")
                    parts.append("[vA][ambduck]amix=inputs=2:"
                                 "duration=first:normalize=0[ambout]")
                    cmd += ins
                    fc += ";" + ";".join(parts)
                    audio_map = "[ambout]"
                    log(f"[Рендер] Атмосфера ИИ-клипов: {len(amb)} дорожек "
                        f"подмешано под голос, громкость "
                        f"{AMB_GAIN * float(snd['clip_amb']):.2f} "
                        f"(профиль «{snd['name']}»)")
            except Exception as e:
                log(f"[Рендер] Атмосфера пропущена "
                    f"({e.__class__.__name__}: {e})")
                # Дождь, ветер и шаги из ИИ-клипов приходят вместе с картинкой
                # бесплатно; без них под голосом остаётся мёртвая тишина — это
                # ровно тот «голый голос под музыкой», ради ухода от которого
                # блок и написан.
                import quality
                quality.degraded(
                    "Звук", "в кадре нет собственных звуков ИИ-клипов "
                            "(дождь, ветер, шаги) — под голосом тишина",
                    why=f"подмешивание атмосферы сорвалось: "
                        f"{e.__class__.__name__}: {str(e)[:120]}",
                    level="заметно")
        # filter_complex УХОДИТ В ФАЙЛ. На 54-минутном ролике со 163
        # оверлеями команда превысила лимит Windows (~32000 символов) и
        # рендер упал в самом конце, после трёх часов работы, с
        # «[WinError 206] Имя файла ... слишком большую длину». Сама цепочка
        # фильтров тянет здесь десятки тысяч символов, и никакое сокращение
        # путей её не спасёт — она обязана лежать отдельно.
        fc_file = tmp / "filter_complex.txt"
        fc_file.write_text(fc, encoding="utf-8")
        # .resolve() по той же причине, что и у groups.txt выше: ffmpeg
        # запускается с cwd=папка проекта, и относительный путь удваивал бы
        # её (estoico-es/estoico-es/render_tmp/filter_complex.txt). Тогда
        # чинили только groups.txt, а этот файл и выходной остались
        # относительными — тот же отказ, просто на шаг позже.
        cmd += ["-filter_complex_script", str(Path(fc_file).resolve()),
                "-map", "[vout]", "-map", audio_map]
    else:
        cmd += ["-map", "0:v", "-map", "1:a",
                "-vf", ",".join(filters + post)]
    # Метаданные файла. Раньше в готовом mp4 не было ничего, кроме
    # технического encoder=Lavf — ни названия, ни описания, ни следа
    # происхождения. Это неудобно (в папке лежат десятки output_final.mp4,
    # различимых только путём) и нечестно: ролик собран машиной, и это
    # должно быть написано В САМОМ ФАЙЛЕ, а не только в голове у автора.
    # На флаг «изменённый контент» в YouTube это не влияет — его ставят
    # руками при загрузке, — но файл перестаёт быть анонимным.
    meta = []
    if opts.get("meta_title"):
        meta += ["-metadata", f"title={opts['meta_title']}"]
    if opts.get("meta_desc"):
        meta += ["-metadata", f"description={opts['meta_desc'][:900]}"]
    if opts.get("meta_channel"):
        meta += ["-metadata", f"artist={opts['meta_channel']}",
                 "-metadata", f"album={opts['meta_channel']}"]
    # Имя софта в файл НЕ пишем: какой инструмент использован — дело автора,
    # и рекламировать его в каждом ролике незачем. Но и подделывать чужую
    # метку («смонтировано в CapCut») нельзя: она читается как заявление,
    # что ролик собран человеком вручную, а YouTube требует помечать
    # синтетический контент. Ложная метка — не сокрытие инструмента, а
    # неверное утверждение о происхождении, и наказывают именно за него.
    meta += ["-metadata",
             "comment=Синтезированная озвучка и часть кадров созданы ИИ. "
             "При загрузке на YouTube отметьте «Altered or synthetic content».",
             "-metadata", f"date={time.strftime('%Y-%m-%d')}",
             # -fflags +bitexact убирает строку encoder=Lavf..., то есть
             # версию ffmpeg. Остаётся обычный mp4 без следа сборщика.
             "-fflags", "+bitexact"]
    cmd += ["-t", f"{total:.3f}",
            *venc_args(CRF_FINAL, PRESET_FINAL, final=True),
            "-c:a", "aac", "-b:a", "192k", *meta,
            "-movflags", "+faststart", str(Path(dest).resolve())]
    # cwd = папка проекта: относительные пути секвенций выше разрешаются
    # именно от неё
    try:
        _run(cmd, label="финал", cwd=Path(tmp).parent)
    except BaseException:
        # Недописанный финал удаляем. Он открывается и играет, обрываясь на
        # середине, — отличить его от готового ролика нельзя ни по имени, ни
        # на глаз, а старый файл с этим именем к этому моменту уже удалён
        # (см. render_project). Особенно важно на «Стоп»: _run убивает ffmpeg
        # посреди записи, и в папке проекта остаётся именно такой огрызок.
        try:
            Path(dest).unlink()
        except OSError:
            pass
        raise


# ---------- Оркестратор ----------

# Кэш кадров оверлеев внутри render_tmp. Папки ovl_NN — единственное в
# промежуточных файлах, что дорого посчитать заново: один оверлей это ~14
# секунд Remotion, и на сотне оверлеев перезапуск ролика стоит 25 минут
# (замер 2026-08-04: четыре перезапуска одного видео — полтора часа впустую).
# Весит кэш при этом мало: в оставшемся от оборванной сборки render_tmp на
# 7.63 ГБ на него приходится 1.1 ГБ, а на сегменты, группы и запечённый
# промежуточный файл — 6.5 ГБ. Поэтому уборка после ПАДЕНИЯ его щадит:
# следующая попытка подхватит кадры с диска (отпечаток сверяется, чужие и
# устаревшие всё равно будут перерисованы — см. overlays._stamped_frames).
OVERLAY_CACHE_PREFIX = "ovl_"


def wipe_render_tmp(out_dir: Path, log=None, keep_overlays: bool = False) -> int:
    """Убрать промежуточные файлы сборки. Возвращает освобождённые байты.

    keep_overlays — оставить кэш кадров оверлеев (см. OVERLAY_CACHE_PREFIX).
    Ставится там, где сборка ещё будет повторена: перед новой попыткой и
    после падения. После УСПЕХА папка уходит целиком — ролик собран, кадры
    больше не нужны никому.

    Отдельной функцией, потому что зовётся из трёх мест: перед сборкой (мусор
    прошлого прогона), после успеха и — главное — ПОСЛЕ ПАДЕНИЯ. Раньше был
    только первый и второй случай, и упавшая сборка оставляла папку целиком:
    замер 2026-08-09 — 55.5 ГБ в render_tmp у трёх проектов при 511 ГБ диска.
    Именно этот остаток и не дал ночи 2026-08-12 собрать ни одного ролика.
    """
    tmp = Path(out_dir) / "render_tmp"
    if not tmp.is_dir():
        return 0

    def _size(p: Path) -> int:
        try:
            if p.is_file():
                return p.stat().st_size
            return sum(f.stat().st_size for f in p.rglob("*") if f.is_file())
        except OSError:
            return 0

    size = 0
    if not keep_overlays:
        size = _size(tmp)
        shutil.rmtree(tmp, ignore_errors=True)
    else:
        try:
            children = list(tmp.iterdir())
        except OSError:
            children = []
        for ch in children:
            if ch.is_dir() and ch.name.startswith(OVERLAY_CACHE_PREFIX):
                continue
            size += _size(ch)
            if ch.is_dir():
                shutil.rmtree(ch, ignore_errors=True)
            else:
                try:
                    ch.unlink()
                except OSError:
                    pass
    if log and size > 100 * 1024 ** 2:
        log(f"[Рендер] Убрано {size / 1024 ** 3:.1f} ГБ промежуточных файлов"
            + (" (кадры оверлеев оставлены под повтор)" if keep_overlays
               else ""))
    return size


def render_project(out_dir: Path, log, progress=None, opts: dict | None = None):
    """Полный авторендер. opts: resolution, fps, intensity, grain, vignette,
    letterbox, vhs, subs. progress(done, total) — для прогресс-бара.

    Здесь только уборка за собой, вся работа — в _render_project.

    Зачем обёртка. rmtree в конце работы стоял и раньше, но выполнялся ТОЛЬКО
    при успехе: любое падение (а падает рендер как раз на нехватке места)
    оставляло десятки гигабайт промежуточных кусков. Следующая сборка
    начиналась с ещё меньшим остатком и падала раньше — четыре канала за ночь
    легли именно так, по цепочке. Обёртка нужна потому, что выйти отсюда
    можно из полусотни мест, и ни одно из них про уборку не помнит.
    """
    try:
        return _render_project(out_dir, log, progress, opts)
    except BaseException as e:
        # ЖАЛОБА ПЕРВОЙ СТРОКОЙ. Дальше по стеку сообщение попадёт в общий
        # журнал вперемешку с трассировкой, а решение («освободи место»)
        # человек должен увидеть сразу.
        if isinstance(e, DiskFull):
            try:
                log(f"[Рендер] {str(e).splitlines()[0]}")
                import quality
                quality.degraded(
                    "Рендер", "на диске кончилось место — ролик не собран",
                    why=str(e).splitlines()[0],
                    hint="python disk.py покажет, что можно убрать; "
                         "готовые ролики уборка не трогает",
                    level="критично")
            except BaseException:
                # BaseException, а не Exception: log() интерфейса бросает
                # «Стоп» (webapp.Stopped наследует BaseException), и на
                # остановленной задаче попытка объяснить причину подменила бы
                # настоящую ошибку своей.
                pass
        raise
    finally:
        # Промежуточные файлы не нужны никому и ни при каком исходе: при
        # успехе они уже перекодированы в финал, при падении сборка всё равно
        # начнётся заново (в начале _render_project стоит та же уборка).
        # keep_overlays=True: сюда попадают И успех, И падение, но при успехе
        # _render_project уже снёс папку целиком последней строкой. Значит,
        # реально работает эта уборка только на падении — а там сборку ещё
        # повторят, и кадры оверлеев ей пригодятся.
        try:
            wipe_render_tmp(Path(out_dir), log, keep_overlays=True)
        except Exception:
            pass       # уборка не имеет права заменить собой настоящую ошибку


def _render_project(out_dir: Path, log, progress=None,
                    opts: dict | None = None):
    """Тело авторендера. Наружу зовут render_project — он убирает за собой."""
    opts = opts or {}
    out_dir = Path(out_dir)
    CANCEL.clear()
    global CRF_SEGMENT, CRF_FINAL, PRESET_SEG, PRESET_FINAL
    if opts.get("draft"):   # черновик: 720p + быстрый кодек — проверка монтажа
        w, h = 1280, 720
        CRF_SEGMENT, CRF_FINAL = "26", "26"
        PRESET_SEG = PRESET_FINAL = "ultrafast"
    else:
        w, h = RESOLUTIONS.get(opts.get("resolution", "1080p"), (1920, 1080))
        # пресет качества: чем ниже CRF, тем лучше картинка (и больше файл)
        # Первые два числа — промежуточные сегменты/группы, они ПЕРЕкодируются
        # ещё дважды и в итоговый файл попадают только через финальный проход.
        # Тратить на них medium/slow и CRF 14-16 бессмысленно: качество
        # определяется последним проходом, а время — всеми тремя. Держим
        # промежуточные заведомо КАЧЕСТВЕННЕЕ финала (CRF меньше = лучше:
        # 16 против 19) — запас на потери при перекодировании,
        # но на быстром пресете.
        q = {"обычное":    ("16", "19", "superfast", "medium"),
             "высокое":    ("15", "16", "veryfast", "slow"),
             "максимум":   ("13", "14", "faster", "slow")}
        CRF_SEGMENT, CRF_FINAL, PRESET_SEG, PRESET_FINAL = \
            q.get(opts.get("quality", "обычное"), q["обычное"])
    fps = int(opts.get("fps", 30))
    intensity = opts.get("intensity", "средняя")

    # Дорожку выбирает core.voice_track — там же, где раскадровка. Здесь
    # стояла своя копия того же условия, и она вшивала в ролик микс прошлого
    # ролика, если шаг музыки в этот раз упал (в app.log — трижды).
    audio = voice_track(out_dir, log, bool(opts.get("no_music")))
    srt = out_dir / "subs" / "voiceover.srt"
    if not audio.exists():
        raise RuntimeError("Нет озвучки (audio/voiceover.mp3).")
    if not srt.exists():
        raise RuntimeError("Нет субтитров (subs/voiceover.srt) — таймкоды "
                           "фраз нужны для монтажа. Прогони Whisper.")

    total = audio_duration(audio)
    if not total:
        raise RuntimeError("Не удалось измерить длительность озвучки (ffprobe).")
    seed = project_seed(out_dir)
    rng = random.Random(seed)
    look = opts.get("look", "нет")
    if look == "случайный":
        look = rng.choice(sorted(LOOKS))
    look_chain = LOOKS.get(look, "")
    # Палитра канала: свой словарь переходов и движений. Пусто = общий пул,
    # как было до появления палитр (и как ведёт себя проект вне каналов).
    pal = palette_of(opts.get("palette", ""))
    log(f"[Рендер] {w}x{h}@{fps}, интенсивность: {intensity}, seed {seed}, "
        f"звук {audio.name} ({total:.0f} c)")
    if pal:
        log(f"[Рендер] Почерк канала «{opts.get('palette')}»: доступны все "
            f"{len(TRANSITIONS)} переходов и {len(set(IMAGE_MOTIONS))} движений, "
            f"акценты расставлены на {len(pal['transitions'])} и "
            f"{len(pal['image_motions'])} из них; "
            f"цветокор: {look if look_chain else 'нет'}")
    else:
        log(f"[Рендер] Палитра: {len(TRANSITIONS)} переходов, "
            f"{len(IMAGE_MOTIONS)} движений картинки, "
            f"{len(set(VIDEO_MOTIONS))} движений видео, "
            f"цветокор: {look if look_chain else 'нет'}")
    # Звуковой профиль называем по имени, как и цветокор: «случайный» в
    # журнале не даёт понять, почему ролик звучит именно так.
    snd = sound_palette_of(opts.get("palette", ""))
    log(f"[Рендер] Звуковой профиль «{snd['name']}»: акценты на "
        f"{float(snd['sfx_density']) * 100:.0f}% плашек, громкость акцентов "
        f"x{float(snd['sfx_gain']):.2f}, атмосфера клипов "
        f"x{float(snd['clip_amb']):.2f}")

    scenes = build_render_plan(parse_srt(srt), total, rng, intensity,
                               opts.get("palette", ""))
    assign_materials(scenes, out_dir, rng, log)
    # Откуда взялся темп — из почерка канала или из выпадающего списка.
    # Без этой строки по журналу нельзя отличить «канал режет часто» от
    # «кто-то переключил интенсивность», а это разные поводы для правки.
    if (opts.get("palette", "") or "").strip().lower() in PALETTE_CUTS:
        log(f"[Рендер] Темп монтажа — из почерка канала "
            f"«{opts.get('palette')}» (PALETTE_CUTS), список интенсивности "
            f"«{intensity}» на него не влияет")
    log(f"[Рендер] План: {len(scenes)} сцен, "
        f"средняя {total / len(scenes):.1f} c")

    tmp = out_dir / "render_tmp"
    # МУСОР ПРОШЛОГО ПРОГОНА. Уборка стоит и здесь, и в render_project (в
    # finally, то есть при любом исходе). Две точки, а не одна: finally
    # закрывает падения ЭТОГО процесса, а здешняя — тот случай, когда процесс
    # убили целиком (Windows усыпил машину, человек снял задачу), и никакой
    # finally уже не отработал.
    #
    # keep_overlays=True — ЗДЕСЬ ЭТО ГЛАВНОЕ. Кадры оверлеев лежат в той же
    # папке, и уборка «всё подряд» отменяла кэш, ради которого он заведён:
    # каждый перезапуск ролика заново тратил 25 минут Remotion на плашки,
    # которые уже нарисованы. Сегменты и группы при этом уходят — они и есть
    # те десятки гигабайт.
    было = wipe_render_tmp(out_dir, keep_overlays=True)
    if было > 100 * 1024 ** 2:
        log(f"[Рендер] Убран мусор прошлой сборки: {было / 1024 ** 3:.1f} ГБ "
            "(кадры оверлеев оставлены — их дорого считать заново)")
    tmp.mkdir(parents=True, exist_ok=True)

    # МЕСТО НА ДИСКЕ — ПРОВЕРЯЕМ ДО, А НЕ ПОСЛЕ.
    #
    # Ролик считается часами, и упереться в полный диск на предпоследнем
    # шаге — значит выбросить всю ночь. Хуже того, падает это не сразу и
    # не понятно: сперва «отказал h264_nvenc», потом «склейка переходами
    # не удалась, собираю встык», и только в конце настоящая причина.
    # Владелец читал этот журнал и видел жалобы на видеокарту.
    #
    # Промежуточные файлы весят примерно вдвое-втрое больше готового
    # ролика: каждая сцена кодируется отдельно, потом группами по восемь,
    # и всё это лежит одновременно. 1.2 ГБ на минуту — с запасом по замеру
    # (20-минутный ролик оставлял около 18 ГБ).
    need = max(10.0, total / 60.0 * 1.2)
    free = shutil.disk_usage(str(out_dir.resolve().anchor)).free / 1024 ** 3
    if free < need:
        raise DiskFull(
            f"НА ДИСКЕ МАЛО МЕСТА: свободно {free:.1f} ГБ, а сборке нужно "
            f"около {need:.0f} ГБ. Даже не начинаю — упрусь на середине.\n"
            "Промежуточные файлы весят вдвое-втрое больше готового ролика. "
            "Что можно убрать, покажет «python disk.py» (готовые ролики он "
            "не трогает).\n"
            "Освободи место и запусти заново — сценарий, озвучка и кадры "
            "уже готовы, заново их считать не придётся.")
    log(f"[Рендер] Места на диске: {free:.0f} ГБ, сборке нужно ~{need:.0f} ГБ")
    trans = pick_transitions(len(scenes), rng, pal)

    # шаги прогресса: сегменты + группы + финал
    n_groups = (len(scenes) + GROUP_SIZE - 1) // GROUP_SIZE
    steps_total = len(scenes) + n_groups + 1
    step = 0

    def tick():
        nonlocal step
        step += 1
        if progress:
            progress(step, steps_total)

    # 2. сегменты (учитываем хвост под переход к следующему)
    def _chapter_grade(pos: float) -> str:
        """Цветокор по главам: завязка нейтральная, середина холоднее
        (напряжение), развязка теплее."""
        if pos < 0.15:
            return ""
        if pos < 0.70:
            return "colortemperature=temperature=7400"
        return "colortemperature=temperature=5800,eq=saturation=1.04"

    seg_files, seg_durs = [], []
    n_filled = 0        # сколько планов пришлось дотягивать (см. _fill_gap)
    for i, sc in enumerate(scenes):
        dur = sc["end"] - sc["start"]
        tail = 0.0
        if i < len(scenes) - 1 and (i + 1) % GROUP_SIZE != 0:
            # Припуск = длительность перехода ПЛЮС защитный зазор, и он
            # никогда не нулевой — даже под "cut". Смысл: render_group
            # ставит переход ровно на плановой границе, и для этого поток
            # должен тянуться ещё на tdur + XFADE_GUARD дальше неё. Не
            # хватит — офсет придётся тянуть назад, а это либо обрубок
            # (см. XFADE_GUARD), либо накопительное укорачивание дорожки.
            # У "cut" своя длительность 0, но склеивается он кадровым fade,
            # поэтому запас нужен и ему: без этого КАЖДАЯ группа с резкой
            # склейкой схлопывалась до одного плана (замерено: 4.63 c
            # вместо 31.8).
            tdur = trans[i][1]
            eff = tdur if tdur > 0 else 1.0 / fps   # что реально сделает xfade
            room = min(dur * 0.4, (scenes[i + 1]["end"] -
                                   scenes[i + 1]["start"]) * 0.4)
            tail = min(eff + XFADE_GUARD, room)
            # если места меньше, чем просит переход — укорачиваем ПЕРЕХОД,
            # а не зазор: зазор отвечает за целостность склейки
            eff = max(min(eff, tail - XFADE_GUARD), 1.0 / fps)
            trans[i] = (trans[i][0], 0.0 if tdur <= 0 else eff)
        dest = tmp / f"seg_{i:04d}.mp4"
        extra = (_chapter_grade(sc["start"] / total)
                 if opts.get("chapters_grade") else "")
        fill_note = render_segment(sc["file"], sc["kind"], dur + tail, dest,
                                   w, h, fps, rng, extra_vf=extra, palette=pal)
        seg_files.append(dest)
        seg_durs.append(dur)
        if fill_note:
            n_filled += 1
        log(f"[Рендер] Сегмент {i + 1}/{len(scenes)}: "
            f"{sc['file'].name} ({dur:.1f} c, {sc['kind']}"
            f"{', ' + fill_note if fill_note else ''})")
        tick()
    if n_filled:
        # Отдельной строкой, потому что это главный показатель «живости»
        # ролика: раньше ровно столько планов заканчивались застывшим кадром.
        log(f"[Рендер] Клип короче плана у {n_filled} сцен из {len(scenes)} — "
            "длина добрана движением (бумеранг/замедление), без заморозки")

    # 3. группы (границы групп склеиваются встык — стык прячем в fadeblack)
    group_files = []
    for g in range(n_groups):
        # Место проверяем НЕ ТОЛЬКО на старте. Проверка перед сборкой есть выше,
        # но она опирается на оценку «1.2 ГБ на минуту», а оценка бывает
        # заниженной: ночь 2026-08-09 прошла её и всё равно упёрлась в диск на
        # четвёртой группе из семнадцати. Дальше пошёл каскад, по которому
        # настоящую причину было не узнать: ffmpeg ответил «No space left»,
        # софт счёл это отказом видеокарты, перешёл на процессор, упал там же,
        # свалился на склейку встык, упал и на ней, а потом на нехватке места
        # умерли ещё три канала подряд — каждый со своим ворохом трассировок.
        # Утренняя сводка сообщала «видеокарта не участвует ×13».
        # Здесь ошибка одна, ранняя и по делу.
        free_gb = shutil.disk_usage(str(out_dir.resolve().anchor)).free / 1024 ** 3
        if free_gb < DISK_FLOOR_GB:
            raise DiskFull(
                f"НА ДИСКЕ КОНЧАЕТСЯ МЕСТО: осталось {free_gb:.1f} ГБ. Сборка "
                f"остановлена на группе {g + 1} из {n_groups}, чтобы не "
                "рассыпаться на полпути.\n"
                "Что можно убрать, покажет «python disk.py». Освободи место и "
                "запусти заново: сценарий, озвучка и кадры уже готовы, заново "
                "их считать не придётся.")
        lo, hi = g * GROUP_SIZE, min((g + 1) * GROUP_SIZE, len(scenes))
        dest = tmp / f"group_{g:03d}.mp4"
        render_group(seg_files[lo:hi], seg_durs[lo:hi],
                     trans[lo:hi - 1], dest, fps,
                     chromab=bool(opts.get("chromab")), w=w, h=h)
        group_files.append(dest)
        log(f"[Рендер] Группа {g + 1}/{n_groups} склеена "
            f"(сцены {lo + 1}-{hi})")
        tick()

    # 4. финал
    ovls = []
    try:
        import overlays as _ovmod
        ovls = _ovmod.build_overlays(out_dir, w, h, fps, tmp, log)
    except Exception as e:
        log(f"[Оверлеи] Пропущены целиком ({e.__class__.__name__}: {e})")
        import quality
        quality.degraded(
            "Оверлеи", "в ролике нет ни одной плашки — оверлеи пропущены "
                       "целиком",
            why=f"{e.__class__.__name__}: {str(e)[:100]}",
            level="критично")

    # имя выходного файла настраивается (иначе output_final.mp4)
    out_name = str(opts.get("out_name") or "output_final").strip()
    out_name = re.sub(r"[^\w\- ]+", "_", out_name) or "output_final"
    if not out_name.lower().endswith(".mp4"):
        out_name += ".mp4"
    final = out_dir / out_name
    # Файл с таким именем уже есть? Раньше рендер падал в самом конце, если
    # старый файл был открыт в плеере/Premiere (Windows блокирует запись).
    # Пробуем перезаписать, при блокировке — пишем с суффиксом _2, _3…
    if final.exists():
        try:
            final.unlink()
        except OSError:
            stem = final.stem
            for k in range(2, 100):
                alt = out_dir / f"{stem}_{k}.mp4"
                if not alt.exists():
                    final = alt
                    log(f"[Рендер] «{out_name}» занят (открыт в плеере?) — "
                        f"сохраняю как {alt.name}")
                    break
    log("[Рендер] Финальный проход: звук + оверлеи + субтитры + цветокор...")
    assemble(group_files, audio, srt, final, fps, total, opts, tmp,
             look_chain, ovls, (w, h), log, scenes)
    tick()
    size_mb = final.stat().st_size / 1e6

    # Сверка длины видео со звуком. Ровно этот дефект уехал зрителю: цепочка
    # xfade укорачивала дорожку на каждой склейке, видео кончалось на 20 с
    # раньше звука, и плеер доигрывал озвучку на застывшем последнем кадре.
    # Ни одна проверка того не заметила, потому что смотреть было некому —
    # ffmpeg отработал без ошибок, файл получился. Стоит одного ffprobe.
    # _video_dur, а НЕ audio_duration: последняя читает format=duration, то
    # есть максимум по всем потокам. На битом файле (8.7 c видео и 40 c
    # звука — ровно этот дефект) она отдаёт 40 и рапортует «всё сходится».
    # Первая версия этой проверки так и обманулась.
    vid_len = _video_dur(final)
    aud_len = audio_duration(audio) if audio and Path(audio).exists() else None
    if vid_len and aud_len:
        drift = vid_len - aud_len
        if abs(drift) > 1.5:
            log(f"[Рендер] ⚠ РАСХОЖДЕНИЕ: видео {vid_len:.1f} c, звук "
                f"{aud_len:.1f} c — разница {drift:+.1f} c. "
                + ("Хвост звука пойдёт по застывшему кадру."
                   if drift < 0 else "В конце будет видео без звука."))
            import quality
            quality.degraded(
                "Рендер",
                "конец ролика идёт по застывшему кадру" if drift < 0
                else "в конце ролика видео без звука",
                why=f"видео {vid_len:.1f} c против звука {aud_len:.1f} c, "
                    f"разница {drift:+.1f} c",
                hint="пересобери ролик; если повторится — смотри журнал "
                     "склейки групп, расхождение копится на переходах",
                level="критично")
        else:
            log(f"[Рендер] Длина сходится: видео {vid_len:.1f} c, "
                f"звук {aud_len:.1f} c ({drift:+.1f} c)")

    # Временные сегменты больше не нужны. Тот же вызов стоит в finally у
    # render_project — здесь он остаётся ради строки в журнале: место
    # освобождается ДО того, как вызывающий начнёт следующий ролик.
    wipe_render_tmp(out_dir)
    log(f"[Рендер] ГОТОВО: {final} ({size_mb:.0f} МБ). Временные файлы "
        "удалены. Это черновик — доведи в Premiere перед публикацией.")
    return final


# ---------- Звук СЦЕН ----------

# Сцены — отдельные планы, а не плашки поверх кадра, и звук оверлеев до них
# не доходил: сцена выходила немой. Между тем именно ей звук нужен сильнее
# всего — отказ опоры без удара выглядит мультиком, а не разрушением.
#
# Роль подбирается по СМЫСЛУ сцены, а не по её названию: у разрушения тяжёлый
# удар, у разреза мелкая механика зонда, у планеты и кривой — движение.
SFX_FOR_SCENE = {
    "globe": "whoosh",
    "map": "whoosh",
    "chart": "tick",
    "layers": "tick",
    "forces": "thud",
    "collapse": "thud",
    "sequence": "pop",
    "steps": "pop",
    "exploded": "pop",
    "scale": "whoosh",
}


def scene_sfx(kind: str, index: int = 0) -> Path | None:
    """Звук под сцену: путь к файлу или None, если роли нет в библиотеке.

    None — это нормально и НЕ повод падать: сцена просто выйдет со своим
    голосом и музыкой, как было до библиотеки звуков.
    """
    role = SFX_FOR_SCENE.get(kind, "whoosh")
    pool = sfx_pool(role)
    if not pool:
        return None
    return pool[index % len(pool)]
