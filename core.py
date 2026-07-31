#!/usr/bin/env python3
"""
Общая логика пайплайна: озвучка (Edge TTS / Amazon Polly), субтитры (Whisper),
стоки (Pexels / Pixabay), Ken Burns, фоновая музыка. Используется и CLI
(pipeline.py), и GUI (app.py).

Все функции пишут прогресс через переданный log(msg) — CLI передаёт print,
GUI передаёт свой потокобезопасный логгер.

Длинные стадии прерываются флагом CANCEL (см. раздел «Отмена работы»):
запускающая сторона зовёт reset_cancel() перед задачей и CANCEL.set() по
кнопке «Стоп», стадия обрывается исключением Cancelled на ближайшей
безопасной границе, а её дочерние процессы гасятся вместе с потомками.
"""

import os
import re
import json
import sys
import time
import random
import shutil
import subprocess
import tempfile
import threading
from pathlib import Path
from xml.sax.saxutils import escape

# ffmpeg может быть установлен, но отсутствовать в PATH процесса
# (терминал, открытый до установки; ярлык со старым окружением)
if shutil.which("ffmpeg") is None and Path(r"C:\ffmpeg\bin\ffmpeg.exe").exists():
    os.environ["PATH"] += os.pathsep + r"C:\ffmpeg\bin"

# Консоль Windows здесь в cp1251, а стадии зовут log=print (pipeline.py). Любой
# символ вне cp1251 в строке журнала — значок «⚠»/«✔» из наших же сообщений или
# иероглифы, пришедшие в тексте ошибки чужого API, — валил print с
# UnicodeEncodeError и уносил с собой ВЕСЬ фоновый прогон. Потерять ролик из-за
# значка в логе дороже, чем увидеть на его месте «?».
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(errors="replace")
    except Exception:
        pass

# Приложение — окно pywebview без своей консоли (запуск через pythonw.exe);
# без этого флага каждый вызов ffmpeg/ffprobe/whisper/npx мигает отдельным
# окном консоли поверх интерфейса.
CREATE_NO_WINDOW = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0

POLLY_CHUNK_LIMIT = 2600  # запас под SSML-теги (лимит Polly — 3000 символов)
USED_MEDIA_FILE = Path(__file__).parent / "used_media.json"  # история клипов
MUSIC_EXTS = {".mp3", ".wav", ".m4a", ".ogg", ".flac",
              ".mp4", ".aac", ".opus", ".wma"}  # из mp4 берётся звуковая дорожка
MAX_CLIPS_PER_SCENE = 5
SEARCH_POOL = 15  # сколько результатов запрашивать у стоков для выбора


# ---------- Отмена работы («Стоп») ----------

# Флаг «Стоп» для стадий, которые живут ЗДЕСЬ: озвучка, Whisper, раскадровка,
# генерация кадров, проверки зрением. Устроен как render.CANCEL и работает
# так же, но покрывает другое: render.CANCEL знает про ffmpeg-сборку ролика и
# только про неё, а обо всём, что делает core, он не подозревал. Из-за этого
# «Стоп» на этих стадиях либо не действовал вовсе (Whisper — одна длинная
# операция почти без строк в журнале), либо срабатывал случайно — на ближайшем
# сообщении в лог, если вызывающий догадался бросать исключение из log().
CANCEL = threading.Event()


class Cancelled(BaseException):
    """Работа прервана кнопкой «Стоп».

    От BaseException, а не от Exception, СПЕЦИАЛЬНО (та же причина, что у
    webapp.Stopped): в core десятки блоков `except Exception`, которые глушат
    сбой отдельного плана, чтобы ролик не рушился из-за одной картинки, — и
    обычное исключение отмены они проглотили бы точно так же, а «Стоп» опять
    ничего бы не остановил.

    Побочно это же спасает деньги на Veo: `except Exception` внутри veo_client
    помечает задачу завершённой (finish_task), и после отмены следующий запуск
    заказал бы генерацию заново вместо того, чтобы продолжить уже оплаченную.
    Сквозь BaseException этот обработчик не срабатывает, и задача остаётся в
    журнале как продолжаемая."""


def reset_cancel():
    """Снять флаг перед НОВОЙ задачей.

    Сбрасывает тот, кто задачу запускает (GUI перед стартом рабочего потока,
    CLI перед прогоном), а не сами стадии. Внутри стадии сброс был бы вреден:
    в цепочке «сценарий -> озвучка -> субтитры -> раскадровка -> оверлеи»
    каждый следующий шаг затирал бы «Стоп», нажатый во время предыдущего.
    На этом уже обжигались с render.render_project: он делает CANCEL.clear()
    на старте, и именно поэтому «Стоп», нажатый ДО рендера, рендер не
    останавливал — тот спокойно начинался с чистым флагом."""
    CANCEL.clear()


def cancelled() -> bool:
    """Взведён ли «Стоп». Для мест, где нужен аккуратный выход (дописать
    журнал, сохранить уже сделанное), а не исключение из середины работы."""
    return CANCEL.is_set()


def _stop_check():
    """Бросает Cancelled, если нажат «Стоп». Ставится только там, где обрыв
    безопасен: между планами, между батчами LLM, перед запуском очередного
    дочернего процесса — но не посреди записи файла."""
    if CANCEL.is_set():
        raise Cancelled("Остановлено пользователем")


def _sleep_cancel(seconds: float):
    """time.sleep, прерываемый «Стопом».

    Пауз в пайплайне много и они долгие: пережидание лимитов Veo и зрения
    доходит до двух минут суммарно, опрос задачи Veo — по 10 c. С обычным
    sleep «Стоп» отзывался бы только после конца паузы."""
    if CANCEL.wait(max(0.0, seconds)):
        raise Cancelled("Остановлено пользователем")


def _cancel_log(log):
    """Обёртка над log для ЧУЖИХ длинных ожиданий — veo_client.wait_for_completion.

    Донести отмену внутрь veo_client больше нечем: статус он опрашивает своим
    циклом, а наружу отдаёт только строки в log — зато зовёт его на КАЖДОМ
    опросе (раз в 10 c). Без этой обёртки «Стоп» во время генерации кадра ждал
    бы серверного таймаута задачи, то есть до получаса."""
    def wrapped(msg=""):
        _stop_check()
        log(msg)
    return wrapped


def _env_switch(name: str, default: bool) -> bool:
    """Безопасно читает флаги режима из .env.

    Пустое значение (`VEO_FAST_MODE=` в .env — обычный способ «погасить»
    переменную) раньше означало True, потому что "" не входит в список
    выключающих слов: флаг с default=False молча ВКЛЮЧАЛСЯ. Теперь пустая
    строка трактуется как «не задано» и берётся default."""
    value = os.getenv(name, "").strip().lower()
    if not value:
        return default
    return value not in {"0", "false", "no", "off"}


def _local_prompt_chat(messages: list[dict], temperature: float,
                       max_tokens: int) -> str:
    """Локальный Ollama только для черновиков промптов/сцен.

    Veo, картинки и видео через него не идут. Ошибка здесь обрабатывается
    вызывающим кодом и даёт откат к облачному LLM, поэтому отсутствие модели
    никогда не останавливает создание ролика.
    """
    import requests
    model = os.getenv("LOCAL_PROMPT_MODEL", "qwen2.5:1.5b").strip()
    response = requests.post(
        os.getenv("OLLAMA_URL", "http://127.0.0.1:11434") + "/api/chat",
        json={"model": model, "messages": messages, "stream": False,
              "options": {"temperature": temperature,
                          "num_predict": max_tokens}},
        timeout=300,
    )
    response.raise_for_status()
    data = response.json()
    content = ((data.get("message") or {}).get("content") or "").strip()
    if not content:
        raise RuntimeError("локальная модель вернула пустой ответ")
    return content

# для извлечения ключевых слов из текста плана (авто-раскадровка)
STOPWORDS = frozenset("""
a an the and or but if then than that this these those there here is are was
were be been being am do does did done doing have has had having will would
shall should can could may might must of in on at by for with without from to
into onto over under about against between through during before after above
below up down out off again further once more most some any all both each few
other such no nor not only own same so too very just because as until while
what which who whom whose when where why how it its itself they them their
theirs themselves he him his himself she her hers herself we us our ours
ourselves you your yours yourself i me my mine myself one two also even ever
never always often sometimes still yet now today tomorrow yesterday thing
things something anything everything nothing someone anyone everyone way ways
time times year years day days get got gets getting go goes going went gone
come comes coming came make makes making made take takes taking took know
knows knowing knew known think thinks thinking thought say says saying said
see sees seeing saw seen look looks looking looked want wants wanted like
likes liked really actually basically literally kind sort lot lots bit quite
rather much many well back new old good bad big small long short high low
right wrong first last next part parts every around another
""".split())


# ---------- Утилиты ----------

def split_text(text: str, limit: int = POLLY_CHUNK_LIMIT) -> list[str]:
    """Разбивает текст на куски <= limit символов по границам предложений.
    Границы абзацев сохраняются внутри кусков как одиночный '\\n'
    (озвучка превращает их в паузы)."""
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text.strip()) if p.strip()]
    units = []  # (предложение, номер абзаца)
    for pi, para in enumerate(paragraphs):
        for s in re.split(r"(?<=[.!?])\s+", para):
            if s.strip():
                units.append((s.strip(), pi))

    chunks, current, current_pi = [], "", None
    for s, pi in units:
        sep = "" if not current else ("\n" if pi != current_pi else " ")
        if len(current) + len(sep) + len(s) <= limit:
            current += sep + s
        else:
            if current:
                chunks.append(current)
            # предложение длиннее лимита — режем жёстко
            while len(s) > limit:
                chunks.append(s[:limit])
                s = s[limit:]
            current = s
        current_pi = pi
    if current:
        chunks.append(current)
    return chunks


class KeyRotator:
    """Несколько ключей, по одному на строку. При ошибке лимита -> следующий."""

    def __init__(self, keys_text: str):
        self.keys = [k.strip() for k in keys_text.splitlines() if k.strip()]
        self.idx = 0

    @property
    def current(self) -> str:
        return self.keys[self.idx] if self.keys else ""

    def rotate(self) -> bool:
        """Переключает на следующий ключ. False, если ключи кончились."""
        if self.idx + 1 < len(self.keys):
            self.idx += 1
            return True
        return False


def download_file(url: str, dest: Path):
    import requests
    with requests.get(url, stream=True, timeout=120) as r:
        r.raise_for_status()
        with open(dest, "wb") as f:
            for chunk in r.iter_content(chunk_size=1 << 16):
                f.write(chunk)


def _kill_tree(p: subprocess.Popen):
    """Погасить процесс ВМЕСТЕ С ПОТОМКАМИ.

    p.kill() гасит только прямого потомка, а реальную работу часто делает внук
    (npx -> node, whisper -> torch), и он остаётся сиротой: зависший процесс
    однажды намотал 26000 секунд процессорного времени за 8 часов, и снимать
    его пришлось вручную через диспетчер."""
    try:
        if os.name == "nt":
            # /T — вместе с деревом потомков, /F — принудительно
            subprocess.run(["taskkill", "/F", "/T", "/PID", str(p.pid)],
                           capture_output=True, creationflags=CREATE_NO_WINDOW)
        else:
            p.kill()
    except OSError:
        pass


def run_tree(cmd: list, timeout: float, **kw):
    """subprocess.run, но убивающий ВСЁ дерево процессов — по таймауту и по «Стопу».

    Штатный run() при таймауте гасит только прямого потомка. Для npx/npm это
    не работает: npx — тонкая обёртка, реальную работу делает внук node, и он
    остаётся сиротой. Реальный случай: зависший `remotion still` крутился два
    часа и съел 6800 секунд CPU уже после того, как питон-родитель умер.

    Ожидание идёт короткими шагами, а не одним communicate(timeout=...), ровно
    чтобы между шагами смотреть на CANCEL: иначе «Стоп» на минутном ffmpeg или
    получасовом рендере Remotion отзывался бы только после конца команды."""
    kw.setdefault("creationflags", CREATE_NO_WINDOW)
    _stop_check()          # на взведённом флаге новый процесс не заводим
    # errors="replace" обязателен: часть windows-утилит пишет в cp866, и на
    # первом же нерусском байте поток-читатель падал с UnicodeDecodeError,
    # уводя за собой весь вызов (поймано на таймаут-тесте с ping)
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                         text=True, encoding="utf-8", errors="replace", **kw)
    deadline = time.time() + timeout
    while True:
        try:
            # Повторный communicate с таймаутом — штатный сценарий: потоки-
            # читатели создаются один раз и переиспользуются, уже прочитанное
            # не теряется.
            out, err = p.communicate(timeout=min(0.5, max(0.05, deadline - time.time())))
            break
        except subprocess.TimeoutExpired:
            if CANCEL.is_set():
                _kill_tree(p)
                p.communicate()
                raise Cancelled(f"Остановлено пользователем: {cmd[0]}")
            if time.time() >= deadline:
                _kill_tree(p)
                p.communicate()
                # свой TimeoutExpired, а не проброс шагового: у шагового в
                # .timeout стояли бы полсекунды вместо настоящего лимита
                raise subprocess.TimeoutExpired(cmd, timeout)
    return subprocess.CompletedProcess(cmd, p.returncode, out, err)


def _run_child(cmd: list, timeout: float = 3600, check: bool = False, **kw):
    """subprocess.run для ДОЛГИХ дочерних процессов (ffmpeg), знающий про «Стоп».

    Обычный subprocess.run ждёт конца команды, а конец — это минуты: сведение
    звука часового ролика, Ken Burns на каждый план. По «Стопу» такой вызов
    не прерывался, и ffmpeg доживал команду уже никому не нужным. Здесь
    ожидание идёт через run_tree, то есть с проверкой флага и убийством дерева.

    Из subprocess.run поддержан только check: вывод всегда читается в трубу
    (без этого процесс не погасить по-человечески), поэтому stdout/stderr
    задавать не нужно — при успехе он просто отбрасывается."""
    r = run_tree(cmd, timeout, **kw)
    if check and r.returncode != 0:
        raise subprocess.CalledProcessError(r.returncode, cmd, r.stdout, r.stderr)
    return r


def _stream_child(cmd: list, label: str, env: dict | None = None, cwd=None) -> int:
    """Процесс с живым выводом в «Консоль», который можно оборвать «Стопом».

    Проверять флаг в цикле чтения строк НЕДОСТАТОЧНО — именно на этом «Стоп» и
    ломался: у Whisper между строками бывают минуты (модель молчит, пока
    считает), а первый запуск ещё и качает модель. Поэтому за флагом следит
    отдельный сторож: по «Стопу» он гасит дерево процессов, чтение обрывается
    на закрытой трубе, и вызов заканчивается Cancelled — вместо whisper'а,
    молотящего в фоне до самого конца транскрипции."""
    _stop_check()
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                         text=True, encoding="utf-8", errors="replace",
                         env=env, cwd=cwd, creationflags=CREATE_NO_WINDOW)
    done = threading.Event()

    def watchdog():
        while not done.wait(0.5):
            if CANCEL.is_set():
                _kill_tree(p)
                return

    guard = threading.Thread(target=watchdog, daemon=True)
    guard.start()
    try:
        for line in p.stdout:
            line = line.strip()
            if line:
                _console(f"[{label}] {line}")
        p.wait()
    finally:
        done.set()
        guard.join(timeout=2)
    # Процесс погас от сторожа — это отмена, а не сбой команды: без этой
    # проверки вызывающий доложил бы «упал с кодом 1».
    _stop_check()
    return p.returncode


def audio_duration(path: Path) -> float | None:
    """Длительность аудио в секундах через ffprobe (None, если не удалось)."""
    try:
        r = subprocess.run(
            ["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
             "-of", "csv=p=0", str(path)],
            capture_output=True, text=True, check=True,
            creationflags=CREATE_NO_WINDOW)
        return float(r.stdout.strip())
    except Exception:
        return None


# ---------- Озвучка ----------

def enhance_voice(mp3: Path, log=print) -> Path:
    """Делает голос глубоким и «дикторским», как в документалках: сильная
    компрессия (плотность), лёгкий подъём низов (глубина), де-эссер (убрать
    свист «с»), нормализация громкости под стандарт YouTube. Перезаписывает
    файл. При сбое ffmpeg — оставляет оригинал."""
    mp3 = Path(mp3)
    if not mp3.exists():
        return mp3
    tmp = mp3.with_name(mp3.stem + "_enh.mp3")
    chain = (
        "highpass=f=80,"                                  # убрать гул
        "equalizer=f=110:t=q:w=1:g=2.5,"                  # тепло/глубина низов
        "equalizer=f=6500:t=q:w=2:g=-3,"                  # де-эссер (мягче «с»)
        "acompressor=threshold=-20dB:ratio=4:attack=6:release=180:makeup=3,"
        "equalizer=f=3000:t=q:w=2:g=2,"                   # presence — разборчивость
        "loudnorm=I=-16:TP=-1.5:LRA=11")                  # громкость под YouTube
    try:
        _run_child(["ffmpeg", "-y", "-i", str(mp3), "-af", chain,
                    "-c:a", "libmp3lame", "-q:a", "2", str(tmp)],
                   timeout=3600, check=True)
        tmp.replace(mp3)
        log("[Озвучка] Голос обработан: компрессия + глубина + нормализация "
            "(документальный «дикторский» звук)")
    except Cancelled:
        # обрывок обработки рядом с готовым файлом никому не нужен, а исходник
        # цел — отмену пробрасываем дальше, в отличие от сбоя ffmpeg ниже
        tmp.unlink(missing_ok=True)
        raise
    except Exception as e:
        tmp.unlink(missing_ok=True)
        log(f"[Озвучка] Обработку голоса пропустил ({e.__class__.__name__})")
        import quality
        quality.degraded(
            "Озвучка", "голос остался сырым: без дикторской плотности и без "
            "нормализации громкости под YouTube",
            why=f"обработка ffmpeg не прошла ({e.__class__.__name__})",
            level="заметно")
    return mp3


def strip_cues(text: str) -> tuple[str, list[str]]:
    """Убрать из сценария режиссёрские ремарки в квадратных скобках и вернуть
    (чистый текст для озвучки, список ремарок).

    Нужно потому, что сценарий уходит в TTS как есть: подсказка вроде
    «[берег моря, задумчиво]» была бы ЗАЧИТАНА ВСЛУХ. При этом сами ремарки
    ценны — по ним снимают и подбирают кадры, поэтому не выбрасываем, а
    отдаём вызывающему."""
    cues = re.findall(r"\[([^\[\]]{2,200})\]", text or "")
    clean = re.sub(r"\[[^\[\]]{2,200}\]", " ", text or "")
    clean = re.sub(r"[ \t]{2,}", " ", clean)
    clean = re.sub(r" +([,.!?;:])", r"\1", clean)
    clean = re.sub(r"\n{3,}", "\n\n", clean)
    return clean.strip(), [c.strip() for c in cues if c.strip()]


def tts_edge(text: str, voice: str, out_dir: Path, log, rate: int = 0,
             enhance: bool = False, pauses: bool = True) -> Path:
    """Бесплатная озвучка через Edge TTS (голоса Microsoft, ключи не нужны).
    rate — отклонение темпа в процентах; enhance — «дикторская» обработка;
    pauses — паузы между абзацами.

    Паузы делаются НАРЕЗКОЙ по абзацам со вставкой тишины, а не через SSML:
    edge_tts.Communicate принимает только plain text, теги <break/> он
    зачитал бы вслух. Раньше пауз в этом движке не было вовсе (они были
    только у Polly) — начитка шла сплошным потоком без воздуха между
    мыслями, что для документалки слышно сразу."""
    import asyncio
    import edge_tts

    if not text.strip():
        raise RuntimeError("Пустой сценарий — озвучивать нечего. Сначала "
                           "сгенерируй/вставь текст на вкладке «Сценарий».")
    audio_dir = out_dir / "audio"
    audio_dir.mkdir(parents=True, exist_ok=True)
    final = audio_dir / "voiceover.mp3"
    paras = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    if not pauses or len(paras) < 2:
        log(f"[Озвучка] Edge TTS, голос {voice}, темп {rate:+d}%, "
            f"{len(text)} символов...")

        async def run():
            await edge_tts.Communicate(
                text, voice, rate=f"{rate:+d}%").save(str(final))

        asyncio.run(run())
    else:
        log(f"[Озвучка] Edge TTS, голос {voice}, темп {rate:+d}%, "
            f"{len(text)} символов -> {len(paras)} абзацев с паузами...")
        parts = []
        for i, para in enumerate(paras, 1):
            # между абзацами — единственное безопасное место обрыва: сшивка
            # ещё не началась, готовый voiceover.mp3 не тронут
            _stop_check()
            p = audio_dir / f"part_{i:03d}.mp3"

            async def run(txt=para, dest=p):
                await edge_tts.Communicate(
                    txt, voice, rate=f"{rate:+d}%").save(str(dest))

            asyncio.run(run())
            parts.append(p)
            if i % 10 == 0:
                log(f"[Озвучка] абзац {i}/{len(paras)}...")
        gap = audio_dir / "_gap.mp3"
        _run_child(
            ["ffmpeg", "-y", "-f", "lavfi", "-i",
             "anullsrc=r=24000:cl=mono", "-t", "0.55", "-q:a", "9", str(gap)],
            timeout=120, check=True)
        seq = []
        for i, p in enumerate(parts):
            if i:
                seq.append(gap)
            seq.append(p)
        concat = audio_dir / "concat.txt"
        concat.write_text("\n".join(f"file '{p.name}'" for p in seq),
                          encoding="utf-8")
        _run_child(["ffmpeg", "-y", "-f", "concat", "-safe", "0",
                    "-i", str(concat), str(final)],
                   timeout=1800, check=True, cwd=audio_dir)
        for p in parts + [gap, concat]:
            p.unlink(missing_ok=True)
    if enhance:
        enhance_voice(final, log)
    log(f"[Озвучка] Готово: {final}")
    return final


def tts_polly(text: str, voice: str, engine: str, out_dir: Path, log,
              rate: int = 0, pauses: bool = True, enhance: bool = False) -> Path:
    """Озвучка через Amazon Polly: куски по предложениям + склейка ffmpeg.
    rate — отклонение темпа; pauses — паузы между абзацами (SSML);
    enhance — «дикторская» обработка голоса. Если движок не принимает SSML,
    автоматически откатывается на обычный текст."""
    import boto3
    from botocore.exceptions import BotoCoreError, ClientError

    if not text.strip():
        raise RuntimeError("Пустой сценарий — озвучивать нечего. Сначала "
                           "сгенерируй/вставь текст на вкладке «Сценарий».")
    audio_dir = out_dir / "audio"
    audio_dir.mkdir(parents=True, exist_ok=True)
    chunks = split_text(text)
    use_ssml = pauses or rate != 0
    log(f"[Озвучка] {len(text)} символов -> {len(chunks)} кусков, "
        f"голос {voice} ({engine}), темп {rate:+d}%"
        + (", паузы между абзацами" if pauses else ""))
    polly = boto3.client("polly", region_name=os.getenv("AWS_REGION", "us-east-1"))
    # long-form/generative поддерживают не все голоса — проверяем ОДИН РАЗ
    # до цикла (раньше пробный запрос летел на каждый кусок — на длинном
    # сценарии это десятки лишних платных вызовов); при отказе откатываемся
    # на neural, который есть почти везде, вместо падения
    if engine in ("long-form", "generative"):
        try:
            polly.synthesize_speech(Text="test", OutputFormat="mp3",
                                    VoiceId=voice, Engine=engine)
        except (BotoCoreError, ClientError) as e:
            log(f"[Озвучка] Голос {voice} не поддерживает движок "
                f"«{engine}» ({e.__class__.__name__}) — беру neural")
            import quality
            quality.degraded(
                "Озвучка", "голос звучит проще заказанного: начитка сделана "
                "обычным движком neural",
                why=f"голос {voice} не поддерживает движок «{engine}» "
                    f"({e.__class__.__name__})",
                hint="выбери голос, у которого этот движок есть, или оставь "
                     "neural осознанно",
                level="заметно")
            engine = "neural"
    parts = []
    for i, chunk in enumerate(chunks, 1):
        _stop_check()      # до склейки: куски — временные файлы, терять нечего
        log(f"[Озвучка] Кусок {i}/{len(chunks)}...")
        kwargs = dict(OutputFormat="mp3", VoiceId=voice, Engine=engine)
        resp = None
        if use_ssml:
            body = escape(chunk).replace("\n", '<break time="550ms"/>')
            if rate != 0:
                body = f'<prosody rate="{100 + rate}%">{body}</prosody>'
            try:
                resp = polly.synthesize_speech(
                    Text=f"<speak>{body}</speak>", TextType="ssml", **kwargs)
            except (BotoCoreError, ClientError) as e:
                log(f"[Озвучка] Движок {engine} не принял SSML "
                    f"({e.__class__.__name__}) — перехожу на обычный текст.")
                import quality
                quality.degraded(
                    "Озвучка", "речь идёт сплошным потоком: пропали паузы "
                    "между абзацами и заданный темп",
                    why=f"движок {engine} не принял SSML "
                        f"({e.__class__.__name__})",
                    level="заметно")
                use_ssml = False
        if resp is None:
            resp = polly.synthesize_speech(Text=chunk.replace("\n", " "), **kwargs)
        p = audio_dir / f"part_{i:03d}.mp3"
        p.write_bytes(resp["AudioStream"].read())
        parts.append(p)

    concat = audio_dir / "concat.txt"
    concat.write_text("\n".join(f"file '{p.name}'" for p in parts), encoding="utf-8")
    final = audio_dir / "voiceover.mp3"
    _run_child(["ffmpeg", "-y", "-f", "concat", "-safe", "0",
                "-i", str(concat), "-c", "copy", str(final)],
               timeout=1800, check=True, cwd=audio_dir)
    if enhance:
        enhance_voice(final, log)
    log(f"[Озвучка] Готово: {final}")
    return final


PREVIEW_TEXT = ("Every great story begins with a single question. "
                "This is how this voice will sound in your video.")


def tts_preview(edge: bool, voice: str, engine: str, rate: int,
                tmp_dir: Path, log) -> Path:
    """Короткий пример звучания голоса во временную папку (для кнопки
    «Прослушать голос»). Возвращает путь к mp3."""
    safe_voice = re.sub(r"[^\w-]+", "_", voice)
    dest = Path(tmp_dir) / f"preview_{safe_voice}.mp3"
    if edge:
        import asyncio
        import edge_tts

        async def run():
            await edge_tts.Communicate(
                PREVIEW_TEXT, voice, rate=f"{rate:+d}%").save(str(dest))

        asyncio.run(run())
    else:
        import boto3
        polly = boto3.client("polly",
                             region_name=os.getenv("AWS_REGION", "us-east-1"))
        resp = polly.synthesize_speech(Text=PREVIEW_TEXT, OutputFormat="mp3",
                                       VoiceId=voice, Engine=engine)
        dest.write_bytes(resp["AudioStream"].read())
    log(f"[Озвучка] Пример голоса {voice} готов — открываю в плеере")
    return dest


# ---------- Фоновая музыка ----------

def _collect_tracks(music_path) -> list[Path]:
    """Список аудиофайлов: папка -> все треки; строка с '|' или переносами ->
    несколько путей; один файл -> [файл]."""
    if isinstance(music_path, (list, tuple)):
        items = [Path(p) for p in music_path]
    else:
        s = str(music_path)
        if "\n" in s or "|" in s:
            items = [Path(p.strip()) for p in re.split(r"[\n|]", s) if p.strip()]
        else:
            items = [Path(s)]
    tracks = []
    for it in items:
        if it.is_dir():
            tracks += sorted(p for p in it.iterdir()
                             if p.suffix.lower() in MUSIC_EXTS)
        elif it.exists() and it.suffix.lower() in MUSIC_EXTS:
            tracks.append(it)
    return tracks


def add_music(voice_mp3: Path, music_path, log, gain_db: int = -14) -> Path:
    """Подмешивает музыку под озвучку с автопригушением под голосом (sidechain).
    music_path — файл, папка, список файлов или многострочный/через | список.
    Несколько треков склеиваются последовательно (плейлист) и зацикливаются
    под всю длину озвучки. Результат: voiceover_music.mp3 рядом с озвучкой."""
    voice_mp3 = Path(voice_mp3)
    if not voice_mp3.exists():
        raise FileNotFoundError(f"Нет озвучки: {voice_mp3}")
    tracks = _collect_tracks(music_path)
    if not tracks:
        raise FileNotFoundError(
            f"Нет аудио-треков ({', '.join(sorted(MUSIC_EXTS))})")
    random.shuffle(tracks)

    dest = voice_mp3.with_name("voiceover_music.mp3")
    dur = audio_duration(voice_mp3)
    fades = "afade=t=in:d=2"
    if dur and dur > 8:
        fades += f",afade=t=out:st={dur - 3:.2f}:d=3"

    if len(tracks) == 1:
        log(f"[Музыка] Трек: {tracks[0].name}, громкость {gain_db} dB, "
            "приглушение под голосом... (проверь лицензию!)")
        inputs = ["-stream_loop", "-1", "-i", str(tracks[0])]
        music_lbl = "[1:a]"
    else:
        # плейлист: склеиваем все треки подряд и зацикливаем под длину видео
        log(f"[Музыка] Плейлист из {len(tracks)} треков (чередуются), "
            f"громкость {gain_db} dB, приглушение под голосом...")
        for t in tracks:
            log(f"[Музыка]   • {t.name}")
        inputs = []
        for t in tracks:
            inputs += ["-i", str(t)]
        concat_in = "".join(f"[{k + 1}:a]" for k in range(len(tracks)))
        pre = (f"{concat_in}concat=n={len(tracks)}:v=0:a=1[pl];"
               "[pl]aloop=loop=-1:size=2e9[loopmus];")
        music_lbl = "[loopmus]"
        fades = "_PRE_" + fades

    if len(tracks) == 1:
        fc = (f"[1:a]volume={gain_db}dB,{fades}[m];"
              "[m][0:a]sidechaincompress=threshold=0.02:ratio=12:attack=25:release=700[duck];"
              "[0:a][duck]amix=inputs=2:duration=first:normalize=0[mix]")
    else:
        fc = (pre + f"{music_lbl}volume={gain_db}dB,{fades.replace('_PRE_','')}[m];"
              "[m][0:a]sidechaincompress=threshold=0.02:ratio=12:attack=25:release=700[duck];"
              "[0:a][duck]amix=inputs=2:duration=first:normalize=0[mix]")

    _run_child(["ffmpeg", "-y", "-i", str(voice_mp3)] + inputs
               + ["-filter_complex", fc, "-map", "[mix]",
                  "-c:a", "libmp3lame", "-q:a", "2", str(dest)],
               timeout=3600, check=True)
    log(f"[Музыка] Готово: {dest} (чистый голос остался в {voice_mp3.name})")
    return dest


def add_ambience(base_mp3: Path, sfx_path, log, gain_db: int = -19,
                 every: float = 22.0) -> Path:
    """Сам раскидывает ASMR-звуки быта (шорох, звон ложки, вода) по дорожке:
    случайный звук из папки примерно каждые `every` секунд, тихо под голосом.
    Создаёт эффект присутствия, как в документалках Hidden Homestead.
    sfx_path — папка/файлы со звуками. Пишет поверх base_mp3."""
    base_mp3 = Path(base_mp3)
    if not base_mp3.exists():
        raise FileNotFoundError(f"Нет дорожки: {base_mp3}")
    sfx = _collect_tracks(sfx_path)
    if not sfx:
        raise FileNotFoundError(
            "Нет ASMR-звуков. Положи в папку короткие звуки быта (шорох, "
            "звон, вода) — mp3/wav, и укажи её. Скачать можно бесплатно "
            "на pixabay.com/sound-effects.")
    dur = audio_duration(base_mp3) or 0
    if dur < 5:
        return base_mp3
    n = max(2, int(dur / every))
    picks = [random.choice(sfx) for _ in range(n)]
    # каждый звук — со случайной задержкой по таймлайну, тихо
    inputs, parts = [], []
    for k, s in enumerate(picks, 1):
        inputs += ["-i", str(s)]
        at = random.uniform(2, dur - 2)
        parts.append(f"[{k}:a]volume={gain_db}dB,"
                     f"adelay={int(at * 1000)}|{int(at * 1000)}[a{k}]")
    mixn = len(picks) + 1
    fc = (";".join(parts) + ";"
          + "[0:a]" + "".join(f"[a{k}]" for k in range(1, len(picks) + 1))
          + f"amix=inputs={mixn}:duration=first:normalize=0[mix]")
    dest = base_mp3.with_name("voiceover_asmr.mp3")
    log(f"[ASMR] Раскидываю {n} звуков быта каждые ~{every:.0f} c "
        f"(тихо, {gain_db} dB) — эффект присутствия")
    try:
        _run_child(["ffmpeg", "-y", "-i", str(base_mp3)] + inputs
                   + ["-filter_complex", fc, "-map", "[mix]",
                      "-c:a", "libmp3lame", "-q:a", "2", str(dest)],
                   timeout=3600, check=True)
    except Cancelled:
        # недоделанный микс не должен подменить рабочую дорожку ниже
        dest.unlink(missing_ok=True)
        raise
    except Exception as e:
        log(f"[ASMR] Пропустил ({e.__class__.__name__})")
        return base_mp3
    # заменяем итоговую дорожку, которую берёт рендер
    dest.replace(base_mp3)
    log(f"[ASMR] Готово: звуки быта вплетены в {base_mp3.name}")
    return base_mp3


# ---------- LLM-агенты ----------
# Роли провайдеров: тексты (сценарий, сцены, SEO, умные запросы) — Gemini,
# если задан GEMINI_API_KEY, иначе Agnes; картинки (type: gen, раскадровка) —
# Agnes, если задан AGNES_API_KEY, иначе Gemini. При ошибке одного провайдера
# автоматически пробуется второй.

AGNES_BASE_URL = os.getenv("AGNES_BASE_URL", "https://apihub.agnes-ai.com/v1")
AGNES_MODEL = os.getenv("AGNES_MODEL", "agnes-2.0-flash")
GEMINI_TEXT_MODEL = os.getenv("GEMINI_TEXT_MODEL", "gemini-2.5-flash")
WORDS_PER_MINUTE = 150  # средний темп закадровой начитки


def _redact(text) -> str:
    """Вычистить ключи из текста ошибки перед тем, как он попадёт в журнал.

    Ключи Gemini/Pixabay/Jamendo уходят в запрос ПАРАМЕТРОМ URL (иначе эти API
    их не принимают), а requests кладёт полный URL в текст своего исключения.
    Через `log(f"...({e})")` он оседает в app.log — на момент правки там
    накопилось 416 строк с настоящим ключом Gemini.

    Уточнение к прежней редакции этого комментария: app.log в ПУБЛИЧНЫЙ
    репозиторий НЕ попадал. Проверено: файл в .gitignore, в истории git его
    нет ни в одной версии, ни один *.log не отслеживается. Опасность в
    другом — журнал показывают в переписке и пересылают при разборе проблем.

    Менять способ авторизации нельзя, поэтому чистим на выходе. Чистить надо
    в ДВУХ местах: и там, где исключение поднимается (вызов API), и там, где
    его текст пишут в журнал — иначе любой новый обработчик, добавленный мимо
    первой линии, снова потечёт."""
    return re.sub(
        r"(?i)([?&](?:key|api_key|apikey|client_id|token|access_token)=)[^&\s\"')]+",
        r"\1<ключ скрыт>", str(text))


def _gemini_endpoints(model: str, key: str) -> list[str]:
    """Эндпоинты AI Studio (ключи AIza...) и Vertex Express (AQ....) —
    сначала тот, что соответствует типу ключа."""
    eps = [
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
        f"https://aiplatform.googleapis.com/v1/publishers/google/models/{model}:generateContent",
    ]
    if key.startswith("AQ."):
        eps.reverse()
    return eps


def gemini_chat(messages: list[dict], api_key: str,
                temperature: float = 0.7, max_tokens: int = 4096) -> str:
    import requests
    sys_text = "\n".join(m["content"] for m in messages if m["role"] == "system")
    contents = [{"role": "model" if m["role"] == "assistant" else "user",
                 "parts": [{"text": m["content"]}]}
                for m in messages if m["role"] != "system"]
    body = {"contents": contents,
            "generationConfig": {"temperature": temperature,
                                 "maxOutputTokens": max_tokens}}
    if sys_text:
        body["systemInstruction"] = {"parts": [{"text": sys_text}]}
    last = "нет ответа"
    for url in _gemini_endpoints(GEMINI_TEXT_MODEL, api_key):
        # try вокруг запроса — как в gemini_vision. Без него сетевой сбой на
        # ПЕРВОМ эндпоинте уносил всю функцию, и второй (запасной!) даже не
        # пробовался. Реальный случай из журнала: у ключа AQ. первым идёт
        # aiplatform, он не резолвился — и расстановка оверлеев ушла на
        # слабый regex, хотя generativelanguage мог ответить.
        try:
            r = requests.post(url, params={"key": api_key}, json=body,
                              timeout=300)
        except Exception as e:
            last = _redact(e)
            continue
        if r.status_code != 200:
            last = f"{r.status_code}: {r.text[:200]}"
            continue
        try:
            data = r.json()
        except ValueError as e:
            last = f"ответ не JSON: {e}"
            continue
        cands = data.get("candidates") or []
        parts = (cands[0].get("content") or {}).get("parts") if cands else []
        text = "".join(p.get("text", "") for p in parts or []).strip()
        if text:
            return text
        # Причину пустоты называем вслух: MAX_TOKENS («размышления» съели весь
        # бюджет), SAFETY/RECITATION (фильтр), blockReason (отклонён промпт) —
        # это разные беды с разным лечением, а «пустой ответ» их сваливал в
        # кучу, и вызывающий три попытки подряд не понимал, что чинить.
        block = str((data.get("promptFeedback") or {}).get("blockReason") or "")
        reason = str(cands[0].get("finishReason") or "") if cands else "нет кандидатов"
        last = "пустой ответ (" + (f"блокировка промпта: {block}" if block
                                   else f"finishReason={reason or '?'}") + ")"
    raise RuntimeError(f"Gemini (текст): {last}")


def gemini_vision(prompt: str, image_bytes: bytes, api_key: str = "",
                  system: str = "", temperature: float = 0.2,
                  max_tokens: int = 1024, mime: str = "image/png") -> str:
    """Отдать Gemini КАРТИНКУ вместе с вопросом. Нужно там, где текстовой
    проверки принципиально мало: код может быть валидным, а кадр — уродливым
    или с обрезанным текстом. Перебирает ключи так же, как llm_chat: у
    Gemini первым кончается лимит, а фолбэка на Agnes здесь нет — тот текстовый."""
    import base64
    import requests
    keys = [k for k in ([api_key] if api_key else []) + _gemini_keys() if k]
    if not keys:
        raise RuntimeError("Нет GEMINI_API_KEY для проверки картинки")
    body = {
        "contents": [{"role": "user", "parts": [
            {"text": prompt},
            {"inline_data": {"mime_type": mime,
                             "data": base64.b64encode(image_bytes).decode()}},
        ]}],
        "generationConfig": {"temperature": temperature,
                             "maxOutputTokens": max_tokens},
    }
    if system:
        body["systemInstruction"] = {"parts": [{"text": system}]}
    last = "нет ответа"
    for key in keys:
        for url in _gemini_endpoints(GEMINI_TEXT_MODEL, key):
            try:
                r = requests.post(url, params={"key": key}, json=body, timeout=180)
            except Exception as e:
                last = _redact(e)   # в тексте сетевой ошибки лежит URL с ключом
                continue
            if r.status_code != 200:
                last = f"{r.status_code}: {r.text[:200]}"
                continue
            cands = r.json().get("candidates") or []
            parts = (cands[0].get("content") or {}).get("parts") if cands else []
            text = "".join(p.get("text", "") for p in parts or []).strip()
            if text:
                return text
            last = "пустой ответ"
    raise RuntimeError(f"Gemini (зрение): {last}")


def agnes_vision(prompt: str, image_bytes: bytes, api_key: str = "",
                 system: str = "", temperature: float = 0.2,
                 max_tokens: int = 1024, mime: str = "image/png") -> str:
    """То же, что gemini_vision, но через Agnes (OpenAI-совместимый формат:
    картинка идёт как data-URI в content-части image_url). Нужен как фолбэк:
    ключей Gemini всего два, и при параллельной генерации они упираются в
    лимит запросов в минуту — зрение тогда молча отключалось."""
    import base64
    import requests
    keys = _agnes_keys(api_key)
    if not keys:
        raise RuntimeError("Нет AGNES_API_KEY для проверки картинки")
    data_uri = f"data:{mime};base64," + base64.b64encode(image_bytes).decode()
    messages = ([{"role": "system", "content": system}] if system else []) + [
        {"role": "user", "content": [
            {"type": "text", "text": prompt},
            {"type": "image_url", "image_url": {"url": data_uri}},
        ]}]
    last = "нет ответа"
    for key in keys:
        try:
            r = requests.post(f"{AGNES_BASE_URL}/chat/completions",
                              headers={"Authorization": f"Bearer {key}"},
                              json={"model": AGNES_MODEL, "messages": messages,
                                    "temperature": temperature,
                                    "max_tokens": max_tokens},
                              timeout=180)
        except Exception as e:
            last = str(e)
            continue
        if r.status_code != 200:
            last = f"{r.status_code}: {r.text[:200]}"
            continue
        try:
            text = r.json()["choices"][0]["message"]["content"].strip()
        except Exception as e:
            last = f"неожиданный ответ: {e}"
            continue
        if text:
            return text
    raise RuntimeError(f"Agnes (зрение): {last}")


def _is_rate_limit(err: str) -> bool:
    """Лимит запросов, а не настоящая ошибка. Отличать важно: лимит надо
    переждать, а на «неверный ключ» ждать бессмысленно."""
    e = err.lower()
    return ("429" in e or "rate limit" in e or "quota" in e
            or "resource_exhausted" in e)


def _is_transient(err: str) -> bool:
    """Сбой, который имеет смысл ПЕРЕЖДАТЬ, а не считать окончательным: лимит
    запросов, обрыв/таймаут связи, 5xx у провайдера. Отличать нужно от
    «неверный ключ» и «фильтр контента» — там ожидание ничего не изменит."""
    e = str(err).lower()
    if _is_rate_limit(e):
        return True
    if re.search(r"\b(500|502|503|504)\b", e):
        return True
    return any(x in e for x in (
        "connection", "timed out", "timeout", "getaddrinfo",
        "nameresolution", "max retries exceeded", "temporarily",
        "unavailable", "reset by peer", "ssl"))


VISION_RATE_ATTEMPTS = 4
VISION_RATE_BACKOFF = 20      # секунд, умножается на номер попытки


def vision_chat(prompt: str, image_bytes: bytes, api_key: str = "",
                system: str = "", temperature: float = 0.2,
                max_tokens: int = 1024) -> str:
    """Спросить про картинку у того, кто ответит: Gemini, иначе Agnes.
    Порядок как в llm_chat — Gemini первым, но здесь фолбэк особенно важен:
    Gemini упирается в лимит именно тогда, когда идёт генерация, то есть
    ровно в момент, когда проверка и нужна.

    Когда лимит выбран у ОБОИХ — ждём и повторяем, а не сдаёмся. Сдача тут
    хуже, чем кажется: вызывающий (review_storyboard) считает несостоявшуюся
    проверку просто пропуском, и на исчерпанной квоте ролик уезжает в
    сборку с непроверенными кадрами, показывая в логе «брака 6». То же
    рассуждение, что и у картинок Veo: лимит временный, переждать дешевле,
    чем потерять проверку."""
    errors = []
    for attempt in range(1, VISION_RATE_ATTEMPTS + 1):
        errors = []
        try:
            return gemini_vision(prompt, image_bytes, "", system,
                                 temperature, max_tokens)
        except Exception as e:
            errors.append(f"Gemini: {e}")
        try:
            return agnes_vision(prompt, image_bytes, api_key, system,
                                temperature, max_tokens)
        except Exception as e:
            errors.append(f"Agnes: {e}")
        # повторяем ТОЛЬКО если оба отказали именно по лимиту
        if attempt == VISION_RATE_ATTEMPTS or not all(
                _is_rate_limit(x) for x in errors):
            break
        _sleep_cancel(VISION_RATE_BACKOFF * attempt)
    raise RuntimeError("; ".join(errors))


def agnes_chat(messages: list[dict], api_key: str,
               temperature: float = 0.7, max_tokens: int = 4096) -> str:
    import requests
    r = requests.post(f"{AGNES_BASE_URL}/chat/completions",
                      headers={"Authorization": f"Bearer {api_key}"},
                      json={"model": AGNES_MODEL, "messages": messages,
                            "temperature": temperature, "max_tokens": max_tokens},
                      timeout=300)
    if r.status_code != 200:
        raise RuntimeError(f"Agnes API {r.status_code}: {r.text[:300]}")
    text = r.json()["choices"][0]["message"]["content"].strip()
    if not text:
        # как в gemini_chat: HTTP 200 с пустым содержимым (модерация/сбой) —
        # это ОШИБКА, а не результат. Иначе пустая строка тихо утекает в
        # gen_script -> пустой сценарий -> невнятный краш уже на озвучке.
        raise RuntimeError("Agnes: пустой ответ (возможно, фильтр контента)")
    return text


def _gemini_keys() -> list[str]:
    """Все ключи Gemini для ротации при 429: GEMINI_API_KEY, GEMINI_API_KEY2,
    GEMINI_API_KEY3, ... — сколько бы их ни было в .env.

    Список был жёстко на три штуки, и четвёртый ключ молча не работал:
    добавил в .env — а квота кончается там же, где и раньше, и понять почему
    нельзя. Читаем всё, что подходит по имени."""
    keys, names = [], ["GEMINI_API_KEY"]
    names += sorted((n for n in os.environ
                     if re.fullmatch(r"GEMINI_API_KEY\d+", n)),
                    key=lambda n: int(n[len("GEMINI_API_KEY"):]))
    for name in names:
        k = (os.getenv(name, "") or "").strip()
        if k and k not in keys:
            keys.append(k)
    return keys


LLM_RETRY_ATTEMPTS = 3
LLM_RETRY_BACKOFF = 15        # секунд, умножается на номер попытки


def llm_chat(messages: list[dict], api_key: str = "",
             temperature: float = 0.7, max_tokens: int = 4096) -> str:
    """Тексты: сначала Gemini (GEMINI_API_KEY, потом GEMINI_API_KEY2... при
    429/ошибке), потом Agnes (api_key или AGNES_API_KEY). api_key — ключ
    Agnes из «Настроек API» (для совместимости).

    Когда ВСЕ провайдеры отказали по временной причине (лимит квоты, обрыв
    сети, 5xx) — ждём и повторяем, как это давно делает vision_chat. До сих
    пор здесь была ровно одна попытка на ключ, и минутная просадка стоила
    целой стадии: в реальном прогоне на 429 у обоих ключей Gemini молча
    рассыпалась расстановка оверлеев (9 штук вместо 80 на 20-минутном
    ролике), потому что вызывающий считает исключение отсюда окончательным
    приговором и уходит на слабый запасной путь.

    Условие повтора — «хоть одна ошибка временная», а не «все»: постоянно
    сломанный Agnes (пустой ответ на фильтре контента) иначе запрещал бы
    переждать временный лимит Gemini — то самое сочетание, что и наблюдалось."""
    gem_keys = _gemini_keys()
    agn_keys = _agnes_keys(api_key)
    if not gem_keys and not agn_keys:
        raise RuntimeError("Нет ключей для текстов: задай GEMINI_API_KEY или "
                           "AGNES_API_KEY (.env или «Настройки API»).")
    errors = []
    for attempt in range(1, LLM_RETRY_ATTEMPTS + 1):
        errors = []
        for i, key in enumerate(gem_keys, 1):
            try:
                return gemini_chat(messages, key, temperature, max_tokens)
            except Exception as e:
                errors.append(f"Gemini #{i}: {e}")
        for key in agn_keys:
            try:
                return agnes_chat(messages, key, temperature, max_tokens)
            except Exception as e:
                errors.append(f"Agnes: {e}")
        if attempt == LLM_RETRY_ATTEMPTS or not any(
                _is_transient(x) for x in errors):
            break
        _sleep_cancel(LLM_RETRY_BACKOFF * attempt)
    raise RuntimeError(_redact("; ".join(errors)))


# Жанры/тон — под ЛЮБУЮ тему. base — общий каркас, дальше добавка тона.
SCRIPT_BASE = (
    "You write long-form YouTube voice-over narration in {lang}. "
    "Style: tight, specific, zero filler. Every sentence carries a fact, an "
    "image, or tension. Banned phrases: 'in this video', 'let's dive in', "
    "'stay tuned', 'as we mentioned', 'in conclusion', 'without further ado'. "
    "No headings, no lists, no stage directions — pure spoken narration. "
    "Separate paragraphs with a blank line. "
    "\n\nSTRUCTURE — this decides whether anyone watches past the first "
    "minute, so it outweighs any individual sentence:\n"
    "- COLD OPEN. The first three sentences drop the viewer inside a "
    "specific moment, image or unresolved fact. No throat-clearing, no "
    "scene-setting preamble, no defining terms, no announcing the subject. "
    "Never open with 'imagine', a dictionary definition, or a rhetorical "
    "question the viewer has no reason to care about yet. Start where it is "
    "already strange.\n"
    "- OPEN LOOP. Within the first 30 seconds raise ONE concrete question "
    "the viewer now needs answered — something missing, withheld, "
    "unexplained or contradictory. Do NOT answer it until the final third; "
    "everything between should feel like circling closer to it.\n"
    "- WITHHOLD THE BEST. The single most surprising fact belongs late. "
    "Front-loading it leaves no reason to stay.\n"
    "- NEVER PREVIEW THE STRUCTURE. Do not say what will be covered, do not "
    "number sections, do not signpost 'first… then… finally'. A viewer who "
    "already knows the shape of the video has permission to leave.\n"
    "- RE-HOOK ROUGHLY EVERY 90 SECONDS. At each turn add a complication, a "
    "contradiction of something said earlier, a new witness/document/number, "
    "or a question that reopens the tension. Tension must never sit flat for "
    "two minutes.\n"
    "- ESCALATE. Each section raises the stakes or narrows the mystery "
    "compared to the one before. A section that could be moved anywhere in "
    "the video without loss is not doing its job.\n"
    "- LAND, DON'T SUMMARISE. The ending pays off the opening loop and then "
    "stops on an implication or a detail that lingers. No recap, no moral, "
    "no 'so what have we learned'.\n"
    "\n\nCRITICAL — this must not read as AI-generated (platforms flag "
    "formulaic AI narration as inauthentic/reused content and demonetize "
    "it, so avoid every tell below):\n"
    "- No stock AI transitions/hedges: 'moreover', 'furthermore', "
    "'it's worth noting', 'interestingly', 'not only... but also', "
    "'this begs the question', 'the truth is', 'at the end of the day'.\n"
    "- No AI-cliche vocabulary: 'delve', 'unravel', 'tapestry', "
    "'testament to', 'boundless', 'in the realm of', 'stands as a symbol', "
    "'plays a crucial/pivotal role', 'a rich history of'.\n"
    "- Vary sentence length and rhythm hard — mix short punches with long "
    "winding ones; never let three sentences in a row share the same "
    "structure or the same opening word.\n"
    "- Don't make every paragraph the same shape or every section the same "
    "length — real writers ramble on what excites them and rush the boring "
    "parts.\n"
    "- Take a specific point of view, not a neutral encyclopedia summary — "
    "let the narrator sound mildly opinionated, surprised, or skeptical "
    "where it fits.\n"
    "- Prefer one vivid concrete detail (a number, a name, a smell, a "
    "specific place) over a general abstract claim.\n"
    "- Don't wrap every section in a tidy 'setup — three examples — neat "
    "conclusion' bow; let some threads trail off into the next section "
    "instead of resolving cleanly.\n"
    "- Use em dashes sparingly, at most once or twice total. ")

TONES = {
    "документальный": "Tone: authoritative documentary — calm, factual, "
        "builds trust; weave in concrete numbers, dates and named sources.",
    "истории/крайм":  "Tone: gripping true-story storytelling — suspense, "
        "vivid scenes, cliffhangers between chapters.",
    "образовательный": "Tone: clear educational explainer — simple analogies, "
        "step-by-step logic, a curious friendly voice.",
    "топ-лист":       "Tone: engaging countdown/list — each item a punchy "
        "mini-story, rising stakes toward number one.",
    "мотивация":      "Tone: cinematic motivational — vivid imagery, rhythm, "
        "an emotional arc that lands on an uplifting payoff.",
    "мистика/хоррор": "Tone: eerie atmospheric — dread, unanswered questions, "
        "slow-burning tension.",
}
LANGS = {"английский": "English", "русский": "Russian", "испанский": "Spanish",
         "немецкий": "German", "французский": "French", "португальский": "Portuguese"}


def gen_script(topic: str, minutes: int, api_key: str = "", log=print,
               tone: str = "документальный", lang: str = "английский",
               extra: str = "") -> str:
    """Длинный сценарий без воды на ЛЮБУЮ тему: план из глав, потом главы по
    очереди. tone — жанр/подача, lang — язык. ~150 слов на минуту."""
    target_words = minutes * WORDS_PER_MINUTE
    n_sections = max(5, round(minutes / 4))
    sec_words = target_words // n_sections
    lang_name = LANGS.get(lang, "English")
    system = SCRIPT_BASE.format(lang=lang_name) + TONES.get(
        tone, TONES["документальный"])
    if (extra or "").strip():
        # указания канала идут ПОСЛЕДНИМИ и потому перевешивают общие:
        # это голос конкретного канала, а не ещё один совет вообще
        system += ("\n\nCHANNEL VOICE — these instructions describe THIS "
                   "channel specifically and take precedence over the general "
                   "guidance above wherever they conflict:\n" + extra.strip())
    log(f"[Агент] Сценарий «{topic}»: ~{minutes} мин (~{target_words} слов), "
        f"{n_sections} глав, жанр «{tone}», язык {lang_name}")

    outline = llm_chat(
        [{"role": "system", "content": system},
         {"role": "user", "content":
          f"Create an outline for a {minutes}-minute video about: {topic}. "
          f"Output exactly {n_sections} chapter titles in {lang_name}, one per "
          "line, numbered 1..N. Each chapter is a concrete sub-topic with a "
          "specific angle — no vague titles. Build a narrative arc: hook, "
          "escalation, payoff."}],
        # с запасом: на длинном ролике глав больше, а «размышления»
        # модели расходуют тот же лимит — обрезанный план глав молча
        # укорачивал сценарий
        api_key, 0.8, 6000)
    chapters = [re.sub(r"^\s*\d+[.)]\s*", "", ln).strip()
                for ln in outline.splitlines() if re.match(r"\s*\d+[.)]", ln)]
    if not chapters:
        chapters = [ln.strip() for ln in outline.splitlines() if ln.strip()][:n_sections]
    if not chapters:
        # без этого падало тихо: пустой сценарий -> пустая озвучка -> Whisper
        # не находит речи -> невнятная ошибка на третьем шаге вместо явной
        # здесь же, в настоящем месте сбоя
        raise RuntimeError(
            "ИИ не вернул план глав (пустой/непарсящийся ответ на outline) "
            f"— попробуй ещё раз. Сырой ответ: {outline[:300]!r}")
    log(f"[Агент] План готов: {len(chapters)} глав")

    def _strip_echo(part: str, tail: str) -> str:
        """Модель иногда дословно повторяет переданный «хвост» предыдущей
        главы в начале ответа, несмотря на инструкцию не делать этого —
        обрезаем совпадающий префикс, чтобы текст не дублировался.
        Наблюдаемый брак — короткие (2-4 слова) буквальные эхо-повторы
        конца предыдущей главы, а не длинные куски, поэтому порог низкий."""
        if not tail:
            return part
        norm = lambda s: re.sub(r"[^\w\s]", "", s.lower()).split()
        tail_words = norm(tail)
        part_norm = norm(part)
        for k in range(min(len(tail_words), len(part_norm)), 1, -1):
            if part_norm[:k] == tail_words[-k:]:
                # Режем ровно k слов С НАЧАЛА, не трогая остальной текст.
                # Раньше здесь было part.split() + " ".join(...) — это
                # склеивало главу в одну строку, УНИЧТОЖАЯ разбивку на
                # абзацы. А по пустым строкам режется всё дальнейшее:
                # планировщик сцен видел один абзац вместо сотни и
                # выдавал один план на весь 51-минутный ролик.
                cut, seen = 0, 0
                for m in re.finditer(r"\S+", part):
                    seen += 1
                    if seen > k:
                        cut = m.start()
                        break
                return part[cut:].lstrip() if cut else part
        return part

    def _gen_chapter(i, ch, flow, sec_words):
        return llm_chat(
            [{"role": "system", "content": system},
             {"role": "user", "content":
              f"Video about: {topic}.\n"
              f"Chapter {i} of {len(chapters)}: {ch}.\n"
              f"Write AT LEAST {sec_words} words of narration in {lang_name} "
              f"for this chapter — {sec_words} is a hard minimum, do not "
              "stop early, expand with concrete detail if needed. "
              + flow}],
            api_key, 0.75, min(max(sec_words * 4, 1500), 8000))

    parts, prev_tail = [], ""
    for i, ch in enumerate(chapters, 1):
        # Каждая глава — отдельный запрос на минуты, а весь сценарий отдаётся
        # вызывающему одним куском: недописанный текст возвращать НЕЛЬЗЯ, его
        # сохранили бы как готовый. Поэтому на «Стопе» обрываемся исключением.
        _stop_check()
        log(f"[Агент] Глава {i}/{len(chapters)}: {ch}")
        if i == 1:
            # Открытая петля задаётся ЗДЕСЬ и закрывается только в последней
            # главе — без явного указания модель отвечает на собственный
            # вопрос через абзац, и смотреть дальше становится незачем
            flow = ("COLD OPEN: drop straight into a specific moment, image "
                    "or unresolved fact — no preamble, no defining the "
                    "subject, no 'imagine'. Within the first 30 seconds of "
                    "narration plant ONE concrete unanswered question (a gap, "
                    "a contradiction, something missing) that this video will "
                    "not resolve until its very last chapter. Do NOT answer "
                    "it here, and do not hint at what the video will cover. ")
        else:
            flow = (f"Continue seamlessly from the previous chapter, which "
                    f"ended with: \"...{prev_tail}\". Do not repeat any of "
                    "that text — start with genuinely new content. ")
        if i == len(chapters):
            flow += ("This is the FINAL chapter: pay off the question planted "
                     "at the very start, then stop on an implication or a "
                     "detail that lingers. No recap, no moral, no summary of "
                     "what was covered. ")
        elif i > 1:
            flow += ("Partway through, RE-HOOK: introduce a complication, a "
                     "fact that contradicts something said earlier, or a new "
                     "document/witness/number that reopens the tension. Raise "
                     "the stakes compared to the previous chapter. ")
        if i != len(chapters):
            flow += "End on a note that pulls the viewer into the next chapter. "
        flow += ("Always end the chapter on a grammatically complete sentence "
                "— never cut off mid-clause, since the next chapter is a "
                "separate paragraph and cannot finish your sentence for you. ")
        part = _strip_echo(_gen_chapter(i, ch, flow, sec_words), prev_tail)
        if len(part.split()) < sec_words * 0.6:   # заметно короче заказа — один повтор
            log(f"[Агент] Глава {i}: {len(part.split())} слов вместо "
                f"~{sec_words} — прошу расширить...")
            part2 = _strip_echo(_gen_chapter(i, ch, flow, sec_words), prev_tail)
            if len(part2.split()) > len(part.split()):
                part = part2
            if not part.strip():
                log(f"[Агент] ⚠ Глава {i} «{ch}» не сгенерировалась даже "
                    "со второй попытки — в сценарии не будет этой главы, "
                    "допиши её вручную.")
                import quality
                quality.degraded(
                    "Сценарий", "в ролике не хватает целой главы — ИИ не "
                    "вернул её текст даже со второй попытки",
                    why="пустой ответ модели (возможно, фильтр контента на "
                        "этой теме)",
                    hint="перегенерируй сценарий или допиши эту главу вручную "
                         "перед озвучкой",
                    level="критично")
                continue
        parts.append(part)
        prev_tail = " ".join(part.split()[-25:])

    text = "\n\n".join(parts)
    if not text.strip():
        # все главы вернулись пустыми (модерация/сбой провайдера) — падаем
        # ЗДЕСЬ с внятной причиной, а не через два шага в TTS/Whisper
        raise RuntimeError(
            "ИИ не сгенерировал ни одной главы (все ответы пустые — "
            "возможно, фильтр контента на этой теме). Попробуй ещё раз "
            "или переформулируй тему.")
    words = len(text.split())
    # заказанная длительность — это и минимум (retry выше), и максимум:
    # модель нередко расходится и сильно перевыполняет план, особенно
    # если совместить неск. коротких глав с ретраем на расширение
    limit = round(target_words * 1.2)
    if words > limit:
        cut = " ".join(text.split()[:limit])
        m = list(re.finditer(r"[.!?](?:\s|$)", cut))
        if m:
            cut = cut[:m[-1].end()].rstrip()
        log(f"[Агент] Сценарий вышел длиннее заказа ({words} слов) — "
            f"обрезаю по последнему законченному предложению до ~{limit}.")
        text = cut
        words = len(text.split())
    if words < target_words * 0.8:
        # ролик выйдет короче заказанного — это видно по хронометражу, и
        # обычно означает, что часть глав вернулась куцыми или пустыми
        import quality
        quality.degraded(
            "Сценарий", "ролик выйдет заметно короче заказанного — сценарий "
            "получился короче, чем просили",
            why=f"{words} слов вместо ~{target_words} "
                f"(~{words // WORDS_PER_MINUTE} мин вместо {minutes})",
            hint="перегенерируй сценарий или закажи меньшую длительность",
            level="заметно")
    log(f"[Агент] Сценарий готов: {words} слов (~{words // WORDS_PER_MINUTE} мин). "
        "Обязательно вычитай и переработай его перед озвучкой — сырой текст "
        "нейросети это «inauthentic content».")
    return text


def _parse_query_list(out: str, expect: int) -> list[str]:
    """Достаёт список запросов из ответа LLM. Терпим к обрезке, markdown-
    обёртке и нумерованным спискам (иначе оборванный JSON рушил весь шаг)."""
    m = re.search(r"\[.*\]", out, re.S)          # 1) целый JSON-массив
    if m:
        try:
            return [str(x).strip() for x in json.loads(m.group(0))]
        except Exception:
            pass
    frag = out[out.find("["):] if "[" in out else out
    parts = re.findall(r'"([^"]{1,60})"', frag)   # 2) строки в кавычках
    if len(parts) >= expect // 2:
        return [p.strip() for p in parts]
    lines = []                                    # 3) построчно
    for ln in out.splitlines():
        ln = re.sub(r'^[\s\-\*\d.)\]\[",]+', "", ln.strip())
        ln = ln.strip().strip('",').strip()
        if ln and not ln.startswith("```") and len(ln) < 60:
            lines.append(ln)
    return lines


def _llm_batch_prompts(beats: list[dict], api_key: str, log, *, batch_size: int,
                       system: str, instruction: str, temperature: float,
                       max_tokens: int, label: str) -> list[str] | None:
    """Общий батчинг LLM-промптов «один план -> одна строка». Идёт порциями
    по batch_size (один запрос на все планы разом рвёт JSON посередине по
    лимиту токенов). Возвращает список длиной len(beats), где пустая строка
    = откат на ключевые слова для этого плана; None, только если ни один
    план не удался."""
    n = len(beats)
    if not n:
        return None
    result = [""] * n
    got = 0
    effective_batch = min(batch_size, 5) if _env_switch("LOCAL_PROMPT_MODE", False) else batch_size
    for start in range(0, n, effective_batch):
        # На границе батча ничего не записано, кроме result в памяти: обрыв
        # здесь безопасен, а вот отдавать половину запросов дальше нельзя —
        # раскадровка приняла бы их за полный набор и поехала по ключевым словам.
        _stop_check()
        chunk = beats[start:start + effective_batch]
        numbered = "\n".join(f"{i}. {b['text'][:280]}"
                             for i, b in enumerate(chunk, 1))
        # Контекст по краям батча. Планы режутся по времени, а не по
        # предложениям: замерено, что 99% фрагментов не заканчиваются точкой
        # и 92% не начинаются с заглавной. Фраза «why leave your food
        # supplies untouched?» живёт в ДВУХ соседних планах, и без соседей
        # модель видит «why leave your» — ни подлежащего, ни отрицания.
        # Внутри батча соседи и так рядом, а на его границах терялись.
        before = beats[start - 1]["text"][-200:] if start else ""
        after = (beats[start + len(chunk)]["text"][:200]
                 if start + len(chunk) < n else "")
        ctx = ""
        if before:
            ctx += f"\n\n[фрагмент ПЕРЕД первым: ...{before}]"
        if after:
            ctx += f"\n\n[фрагмент ПОСЛЕ последнего: {after}...]"
        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content":
             instruction.format(n=len(chunk)) + "\n\n" + numbered + ctx},
        ]
        try:
            if _env_switch("LOCAL_PROMPT_MODE", False):
                # Маленькой CPU-модели не даём огромные батчи: так она даёт
                # стабильный черновик, а облако остаётся страховкой качества.
                out = _local_prompt_chat(messages, temperature,
                                         min(max_tokens, 1200))
                log(f"[Локальный ИИ] {label}, планы {start + 1}-"
                    f"{start + len(chunk)}: черновик готов")
            else:
                out = llm_chat(messages, api_key, temperature, max_tokens)
            qs = _parse_query_list(out, len(chunk))
            for j in range(len(chunk)):
                if j < len(qs) and qs[j]:
                    result[start + j] = qs[j]
                    got += 1
        except Exception as e:
            if _env_switch("LOCAL_PROMPT_MODE", False) and api_key:
                try:
                    out = llm_chat(messages, api_key, temperature, max_tokens)
                    qs = _parse_query_list(out, len(chunk))
                    for j in range(len(chunk)):
                        if j < len(qs) and qs[j]:
                            result[start + j] = qs[j]
                            got += 1
                    log(f"[Локальный ИИ] {label}: недоступен "
                        f"({e.__class__.__name__}), использую облачный резерв")
                    continue
                except Exception:
                    pass
            log(f"[Агент] {label}, планы {start + 1}-{start + len(chunk)}: "
                f"{e.__class__.__name__} — эти уйдут на ключевые слова.")
    import quality
    if got == 0:
        # то же, что случилось с оверлеями: основной путь молча уступил
        # место нарезке по словам, а стадия отрапортовала об успехе
        quality.degraded(
            "Раскадровка", "кадры подобраны по отдельным словам текста, а не "
            "по его смыслу",
            why=f"{label}: ни один план не получил описания от ИИ",
            hint="обычно это лимит квоты — добавь ещё ключ GEMINI_API_KEY в "
                 ".env; на тяжёлой теме мог сработать фильтр безопасности",
            level="критично")
        return None
    if got < n:
        log(f"[Агент] {label}: {got}/{n} по смыслу, остальные — по ключевым словам.")
        quality.degraded(
            "Раскадровка", "часть кадров подобрана по отдельным словам "
            "текста, а не по его смыслу",
            why=f"{label}: описания получили {got} планов из {n}",
            hint="обычно это лимит квоты — добавь ещё ключ GEMINI_API_KEY в .env",
            level="заметно")
    else:
        log(f"[Агент] {label}: все {n} по смыслу текста.")
    return result


# Правила для ЛЮБОГО поискового запроса к стоку. Вынесены в константу,
# потому что нужны и smart_queries(), и gen_scenes_ai() — а копия неизбежно
# разъедется, и половина роликов снова поедет с несоответствием.
#
# Появились после разбора реального ролика: запрос «rotten egg smell sink»
# (запах!) вернул КОРОБКУ ЯИЦ под рассказ о серной кислоте. Проверка зрением
# нашла 3 таких кадра из 6 — это и есть главный видимый признак сборки
# «на автомате», хуже которого для канала ничего нет.
SHOT_RULES = (
    "THE ONE RULE: name something a camera can physically photograph. "
    "A stock library matches your words literally, so anything abstract "
    "comes back as nonsense.\n"
    "FORBIDDEN — these are not things: smells, tastes, feelings, "
    "sensations, risks, warnings, concepts, statistics, chemical names, "
    "organisation names, processes, absences ('invisible', 'silent').\n"
    "Real failures from a previous run — do not repeat them:\n"
    '  a sulfur smell -> "rotten egg smell sink" returned a carton of EGGS. '
    'Correct: "kitchen sink drain closeup"\n'
    '  fumes -> "volatile organic compounds lungs" is unfilmable. '
    'Correct: "spray bottle mist sunlight"\n'
    '  danger -> "strict safety protocols" is unfilmable. '
    'Correct: "worker gloves goggles chemical"\n'
    "When the narration is abstract, film its PHYSICAL EVIDENCE: the object "
    "involved, the place it happens, the hand doing it, the damage it "
    "leaves. Every fragment has something physical in it — find that.\n"
    "READ THE WHOLE SENTENCE, NOT THE NOUNS. Narration constantly says a "
    "thing was ABSENT, ruled out, or contradicted — and a shot of that very "
    "thing then contradicts the narrator on screen. Measured failures:\n"
    '  "...far from any airbase or industrial zone" -> "rocket fuel canister '
    'warehouse". The line is about there being NO industry for miles. '
    'Correct: "empty snowy mountain pass"\n'
    '  "...consistent with a jet exhaust plume, but the sky was clear" -> '
    '"jet engine exhaust plume sky". The line RULES OUT the plume. '
    'Correct: "clear empty night sky"\n'
    "If the sentence denies, doubts or excludes something, film what was "
    "actually there instead — the empty place, the intact object, the "
    "unmarked snow."
)


def smart_queries(beats: list[dict], api_key: str = "", log=print) -> list[str] | None:
    """Поисковые запросы для стока по смыслу текста каждого плана (LLM),
    батчами по 20 — короткая фраза под сток-поиск (2-5 слов)."""
    return _llm_batch_prompts(
        beats, api_key, log, batch_size=20,
        system=("You are a documentary shot-lister. You never describe ideas "
                "— you describe what a camera is pointed at."),
        instruction=(
            "For each numbered narration fragment output ONE stock video "
            "search query naming the SHOT that plays while it is spoken.\n\n"
            "THE FRAGMENTS ARE ONE CONTINUOUS NARRATION, cut by timing and "
            "not by sentence. A sentence routinely starts in one fragment "
            "and finishes in the next, so a fragment on its own can be "
            "missing its subject, its verb or its 'not'. ALWAYS read the "
            "neighbouring fragments before deciding what fragment N shows. "
            "Measured example: fragment 12 ended '...why leave your' and "
            "fragment 13 began 'food supplies untouched?' — one question "
            "split in half, and each half alone gives a wrong shot.\n\n"
            + SHOT_RULES +
            "\n\nEach query is 2-5 English words: a concrete subject, plus a "
            "setting or shot size (closeup, overhead, slow motion) where it "
            "helps.\n"
            "Reply with a JSON array of exactly {n} strings, no markdown, "
            "nothing else."),
        # лимит с запасом: 20 запросов в батче плюс «размышления» модели,
        # на 1200 ответ обрывался и батч уходил в фолбэк
        temperature=0.4, max_tokens=4000, label="Умные запросы")


def ai_scene_prompts(beats: list[dict], api_key: str = "", log=print
                     ) -> list[str] | None:
    """Промпты для ИИ-генерации кадра (Veo/Banana и т.п.) по смыслу текста
    каждого плана — В ОТЛИЧИЕ от smart_queries() это не короткий поисковый
    запрос (2-4 слова под сток), а полноценное описание сцены (10-20 слов):
    конкретное место действие, субъект, настроение. Явно просим избегать
    штампов-символов (лампочка = «идея», шестерёнки = «система», весы =
    «правосудие», цепи = «контроль») — картинка должна быть привязана к
    реальному контексту повествования, а не к абстрактной иконографии."""
    return _llm_batch_prompts(
        beats, api_key, log, batch_size=15,
        system=("You write vivid, concrete visual scene descriptions for "
               "an AI video/image generator, illustrating documentary "
               "narration."),
        instruction=(
            "The fragments are ONE continuous narration cut by timing, not "
            "by sentence: a sentence often starts in one fragment and ends "
            "in the next, so a fragment alone can lack its subject or its "
            "'not'. Read the neighbours before deciding what fragment N "
            "shows, and never illustrate a thing the narration says was "
            "ABSENT or ruled out.\n\n"
            "For each numbered narration fragment, write ONE concrete "
            "visual scene description (10-20 English words): specific "
            "setting, subject, action, camera framing and mood — "
            "exactly what should be seen on screen while these words "
            "are spoken. Ground it in the ACTUAL narrative/subject "
            "matter of the text (real places, people, objects, "
            "actions tied to the story) — never fall back on generic "
            "symbolic clichés (no lightbulb for 'idea', no gears for "
            "'system', no scales for 'justice', no chains/locks for "
            "'control', no glowing brain for 'mind'). "
            "Reply with a JSON array of exactly {n} strings, no markdown, "
            "nothing else."),
        temperature=0.7, max_tokens=2400, label="ИИ-промпты")


def gen_scenes_ai(script_text: str, api_key: str = "", log=print,
                  max_scenes: int = 50) -> str:
    """Сцены для scenes.txt через LLM: для каждого абзаца сценария — что
    должно быть на экране (2-4 английских слова для поиска стока) и тип
    (video/image). При любой ошибке бросает исключение — вызывающий
    откатывается на auto_scenes()."""
    paras = [p.strip() for p in re.split(r"\n\s*\n", script_text.strip())
             if p.strip()]
    if not paras:
        raise RuntimeError("пустой сценарий")
    # Сценарий без пустых строк даёт ОДИН «абзац» на весь ролик — и тогда на
    # 51 минуту приходится один план, а видеоряд разъезжается с текстом.
    # Реальный случай: script.txt на 47 000 символов в одну строку. Режем по
    # предложениям на куски примерно по 60 слов — это близко к абзацу.
    if len(paras) < 4 and len(script_text.split()) > 400:
        sents = re.split(r"(?<=[.!?])\s+", " ".join(paras))
        paras, buf = [], []
        for s in sents:
            buf.append(s)
            if sum(len(x.split()) for x in buf) >= 60:
                paras.append(" ".join(buf))
                buf = []
        if buf:
            paras.append(" ".join(buf))
        log(f"[Агент] В сценарии не размечены абзацы — разбил по смыслу на "
            f"{len(paras)} фрагментов, иначе весь ролик получил бы один план")
    while len(paras) > max_scenes:  # слишком много абзацев — склеиваем соседние
        paras = [" ".join(paras[i:i + 2]) for i in range(0, len(paras), 2)]
    numbered = "\n".join(f"{i}. {p[:300]}" for i, p in enumerate(paras, 1))
    log(f"[Агент] Составляю сцены по смыслу текста: {len(paras)} фрагментов...")
    out = llm_chat(
        [{"role": "system", "content":
          "You are a documentary shot-lister. You never describe ideas — you "
          "describe what a camera is pointed at."},
         {"role": "user", "content":
          "For each numbered narration fragment, write the SHOT that plays "
          "while it is spoken.\n\n"
          + SHOT_RULES +
          "\n\nEach `q` is 2-5 English words naming a concrete subject, and "
          "where useful a setting or shot size (closeup, overhead, slow "
          "motion).\n\n"
          f"Output ONLY a JSON array of exactly {len(paras)} objects: "
          '{"q": "...", "type": "video" or "image"}. Prefer "video"; use '
          '"image" for historical or still subjects.\n\n' + numbered}],
        # по объекту JSON на КАЖДЫЙ абзац сценария: на 35-минутном ролике
        # это сотни строк, 4000 токенов обрезало массив и вся раскладка
        # сцен падала в фолбэк
        api_key, 0.4, 16000)
    m = re.search(r"\[.*\]", out, re.S)
    if not m:
        raise RuntimeError("ответ без JSON")
    # Слова, которые НЕЛЬЗЯ снять. Сток цепляется за них буквально и отдаёт
    # мусор: на «rotten egg smell» пришла коробка ЯИЦ под рассказ о серной
    # кислоте. Ловим здесь, а не после рендера, когда исправлять уже дорого.
    UNFILMABLE = (
        "smell", "odor", "odour", "scent", "aroma", "stench", "fume",
        "taste", "feeling", "sensation", "emotion", "fear", "risk",
        "danger", "warning", "protocol", "policy", "concept", "idea",
        "process", "invisible", "unseen", "silent", "society", "agency",
        "association", "compound", "molecule", "statistic", "percent",
    )
    lines, flagged = [], []
    for it in json.loads(m.group(0)):
        q = str(it.get("q", "")).strip()
        t = "image" if str(it.get("type", "")).lower().startswith("i") else "video"
        if not q:
            continue
        # по НАЧАЛУ слова, а не по точному совпадению: иначе множественное
        # число проскакивает («compounds», «protocols» мимо «compound»)
        if any(w.startswith(UNFILMABLE) for w in re.findall(r"[a-z]+", q.lower())):
            flagged.append(q)
        lines.append(f"{q} | type: {t}")
    if flagged:
        log(f"[Агент] ⚠ {len(flagged)} запросов описывают НЕснимаемое — сток "
            f"подберёт по случайному слову: {', '.join(flagged[:5])}"
            + (" …" if len(flagged) > 5 else "")
            + ". Проверь эти планы в scenes.txt.")
    if not lines:
        raise RuntimeError("ИИ не вернул ни одной сцены")
    log(f"[Агент] Готово: {len(lines)} сцен")
    return "\n".join(lines)


def gen_seo(script_text: str, api_key: str = "", log=print,
            lang: str = "английский", srt: Path | None = None,
            formula: str = "") -> str:
    """Названия, описание, теги и главы для YouTube по готовому сценарию.

    Язык раньше был ЗАШИТ английским — русский сценарий получал английское
    описание, и это тихо портило выдачу. Теперь берётся язык ролика.

    Сценарий отдаётся началом И концом: заголовок должен отражать вопрос,
    поставленный в начале, а описание — не спойлерить развязку; по одному
    только началу модель не видит, чем всё кончилось."""
    log("[Агент] Генерирую названия, описание, теги и главы...")
    lang_name = LANGS.get(lang, "English")
    body = script_text[:5000]
    if len(script_text) > 9000:
        body += "\n\n[…середина пропущена…]\n\n" + script_text[-3500:]
    chapters_note = ""
    if srt and Path(srt).exists():
        try:
            rows = parse_srt(Path(srt))
            total = srt_to_seconds(rows[-1][1]) if rows else 0
            chapters_note = (
                "\nCHAPTERS: 5-8 YouTube chapters covering the whole video. "
                "The FIRST one must be exactly '00:00' and its label must not "
                "give away the ending. Format one per line as 'M:SS Label' "
                f"(the video is {int(total // 60)}:{int(total % 60):02d} long, "
                "so spread them across that whole span, never past it). "
                "Labels are 2-5 words, concrete, no numbering.\n")
        except Exception:
            chapters_note = ""
    return llm_chat(
        [{"role": "system", "content":
          "You are a YouTube strategist for documentary channels. You write "
          "for curiosity, never for clickbait you cannot deliver on."},
         {"role": "user", "content":
          f"Based on this documentary script, write everything in {lang_name}.\n\n"
          + (("WHAT WORKS ON THIS CHANNEL'S NICHE — measured on competing "
              "channels, follow this pattern for the titles, it matters more "
              f"than anything else here:\n{formula}\n\n") if formula.strip() else "")
          + "TITLES: 5 options, each under 60 characters so nothing is cut off "
          "on mobile.\n"
          + ("The SHAPE of the title must copy the winning pattern above — "
             "that pattern was measured, it beat its own channel many times "
             "over, and it outranks every other instruction here. If the "
             "pattern is a phrasing like \"How to <task>\", write full "
             "titles in exactly that phrasing. Do NOT compress a title into "
             "bare keywords (\"Replace Tub Caulk\") — a search string is not "
             "a title and does not get clicked.\n"
             if formula.strip() else
             "Each must open a curiosity gap tied to the actual unresolved "
             "question the script raises — not a summary of the topic.\n")
          + "Put the most concrete, specific words FIRST (the tail gets "
          "truncated). Forbidden: ALL-CAPS words, 'You won't believe', "
          "'SHOCKING', 'This is why', trailing '...', any promise the script "
          "does not actually keep.\n\n"
          "DESCRIPTION: first sentence under 120 characters — it is all that "
          "shows in search and above the fold, so it must stand alone and "
          "restate the hook without answering it. Then 2 short paragraphs of "
          "real context. Do NOT spoil the ending. No hashtag spam, no 'like "
          "and subscribe', no links.\n\n"
          "TAGS: 15 comma-separated, lower-case. Mix three kinds: 3-4 broad "
          "(the genre/field), 6-7 specific (names, places, events actually in "
          "the script), 4-5 long-tail phrases someone would really type.\n"
          + chapters_note +
          "\nUse these exact section headers: TITLES:, DESCRIPTION:, TAGS:"
          + (", CHAPTERS:" if chapters_note else "") +
          "\n\nScript:\n" + body}],
        # лимит с большим запасом: у gemini-2.5-flash «размышления» тратят
        # тот же бюджет maxOutputTokens, и на 2500 ответ обрывался прямо на
        # главах — последней секции («CHAPTERS:\n00:00 T» и конец)
        api_key, 0.8, 8000)


# ---------- Генерация изображений (Agnes -> Gemini) ----------

GEMINI_IMAGE_MODEL = os.getenv("GEMINI_IMAGE_MODEL", "gemini-2.5-flash-image")
AGNES_IMAGE_MODEL = os.getenv("AGNES_IMAGE_MODEL", "agnes-image-2.1-flash")

IMAGE_STYLE = ("Cinematic photography, realistic, high detail, "
               "no text or watermarks.")

# Единый визуальный стиль проекта — главное, что делает канал «фильмом», а
# не нарезкой стоков: ВСЕ кадры генерируются в одной эстетике. Выбирается
# на проект; строка добавляется к каждому промпту генерации.
VISUAL_STYLES = {
    "кинематографичный": IMAGE_STYLE,
    "винтаж/документ.":  "Vintage documentary photograph, warm faded film "
        "colors, subtle grain, nostalgic 1950s-1970s aesthetic, soft natural "
        "light, no text or watermarks.",
    "тёплый уют":        "Cozy warm cinematic photo, golden hour light, soft "
        "focus background, inviting homely atmosphere, film look, no text.",
    "тёмный кино":       "Dark moody cinematic still, low-key dramatic "
        "lighting, deep shadows, teal-orange grade, film grain, no text.",
    "архив ч/б":         "Authentic black and white archival photograph, "
        "historical documentary look, fine grain, aged tone, no text.",
    "яркий научпоп":     "Clean bright editorial photo, vivid colors, sharp "
        "detail, modern documentary style, no text or watermarks.",
}


def _image_prompt(prompt: str, style: str = "") -> str:
    """Промпт для генерации: описание сцены + единый стиль проекта."""
    style_text = VISUAL_STYLES.get(style, "") or IMAGE_STYLE
    return f"{prompt}. {style_text}"


def agnes_image(prompt: str, dest: Path, api_key: str, log=print,
                style: str = "") -> Path:
    """Картинка через Agnes (/images/generations по официальной доке:
    size-тир 2K + ratio 16:9, response_format внутри extra_body)."""
    import base64
    import requests
    r = requests.post(f"{AGNES_BASE_URL}/images/generations",
                      headers={"Authorization": f"Bearer {api_key}"},
                      json={"model": AGNES_IMAGE_MODEL,
                            "prompt": _image_prompt(prompt, style),
                            "size": "2K", "ratio": "16:9",
                            "extra_body": {"response_format": "url"}},
                      timeout=360)
    if r.status_code != 200:
        raise RuntimeError(f"Agnes images ({AGNES_IMAGE_MODEL}) "
                           f"{r.status_code}: {r.text[:200]}")
    item = (r.json().get("data") or [{}])[0]
    if item.get("b64_json"):
        dest.write_bytes(base64.b64decode(item["b64_json"]))
    elif item.get("url"):
        download_file(item["url"], dest)
    else:
        raise RuntimeError(f"Agnes images ({AGNES_IMAGE_MODEL}): "
                           "ответ без картинки")
    return dest


def gemini_image(prompt: str, dest: Path, api_key: str, style: str = "") -> Path:
    """Картинка 16:9 через Gemini (AI Studio или Vertex Express по типу ключа)."""
    import base64
    import requests
    body = {
        "contents": [{"parts": [{"text": _image_prompt(prompt, style)}]}],
        "generationConfig": {"responseModalities": ["IMAGE"],
                             "imageConfig": {"aspectRatio": "16:9"}},
    }
    last_err = "нет ответа"
    for url in _gemini_endpoints(GEMINI_IMAGE_MODEL, api_key):
        # та же причина, что в gemini_chat: без try сетевой сбой на первом
        # эндпоинте лишал нас второго, а в тексте ошибки уезжал ключ
        try:
            r = requests.post(url, params={"key": api_key}, json=body,
                              timeout=120)
        except Exception as e:
            last_err = _redact(e)
            continue
        if r.status_code != 200:
            last_err = f"{r.status_code}: {r.text[:200]}"
            continue
        cands = r.json().get("candidates") or []
        parts = (cands[0].get("content") or {}).get("parts") if cands else []
        for part in parts or []:
            data = part.get("inlineData") or part.get("inline_data") or {}
            if data.get("data"):
                dest.write_bytes(base64.b64decode(data["data"]))
                return dest
        last_err = "ответ без изображения (возможно, промпт отклонён фильтром)"
    raise RuntimeError(f"Gemini не сгенерировал изображение: {last_err}")


def veo_image(prompt: str, dest: Path, api_key: str, log=print,
              style: str = "", upscale: bool | None = None) -> Path:
    """Картинка через VeoNonStop (Banana Pro), синхронно. upscale —
    дополнительно апскейлит результат до 2K через banana_upscale (1 повтор
    при транзиентной ошибке); апскейл не критичен для результата, поэтому
    провал обеих попыток тихо падает обратно на исходную (не апскейленную)
    картинку, а не проваливает вызов.

    upscale=None (по умолчанию) — берём из VEO_UPSCALE, как и видео. Раньше
    здесь стояло True, а VEO_UPSCALE читался только в veo_video: настройка
    «быстрый черновик без апскейла» молча не действовала на картинки, и
    каждое ИИ-фото делало лишний вызов banana_upscale. Замер: 51 c без
    апскейла против 74 c с ним — на ~117 фото это ~46 минут лишней работы."""
    import veo_client
    if upscale is None:
        upscale = os.getenv("VEO_UPSCALE", "1").strip().lower() not in (
            "0", "false", "no", "off")
    data = veo_client.banana_generate(_image_prompt(prompt, style), api_key=api_key)
    media = data.get("media") or []
    if not media:
        raise RuntimeError("VeoNonStop Banana: ответ без картинки")
    if upscale:
        last_err = None
        for attempt in range(2):
            try:
                jpg_bytes = veo_client.banana_upscale(
                    media[0]["mediaGenerationId"], data.get("project_id", ""),
                    api_key=api_key)
                dest.write_bytes(jpg_bytes)
                return dest
            except Exception as e:
                last_err = e
                if attempt == 0:
                    _sleep_cancel(2)
        log(f"[Картинка] Апскейл до 2K не удался ({last_err}) — беру оригинал")
        import quality
        quality.degraded(
            "Картинка", "кадр остался в исходном разрешении, без апскейла до 2K",
            why=f"обе попытки апскейла не прошли ({last_err})",
            level="мелочь")
    download_file(media[0]["fifeUrl"], dest)
    return dest


# Сколько раз пережидать занятость VeoNonStop, прежде чем сдаться. Фолбэков
# на другие генераторы больше нет (разнородные кадры рушат единый вид ролика),
# поэтому ждать — единственный способ не потерять план.
VEO_IMAGE_ATTEMPTS = 4
VEO_IMAGE_BACKOFF = 6      # секунд; умножается на номер попытки


def gen_image(prompt: str, dest: Path, api_key: str = "", log=print,
              style: str = "") -> Path:
    """Картинка: VeoNonStop (Banana, ОСНОВНОЙ) -> Agnes -> Gemini (фолбэки,
    если Veo недоступен/ключ истёк/упал). style — единый визуальный стиль
    проекта (VISUAL_STYLES), добавляется к промпту."""
    veo_key = os.getenv("VEO_API_KEY", "").strip()
    if not veo_key:
        raise RuntimeError("Нет VEO_API_KEY — картинки генерирует только "
                           "VeoNonStop (.env или «Настройки API»).")
    # ТОЛЬКО VeoNonStop. Раньше при его отказе шли фолбэки на Agnes и Gemini,
    # но три разных генератора в одном ролике дают визуально разнородные
    # кадры — а весь смысл в том, чтобы канал выглядел одним фильмом, а не
    # нарезкой. Вместо смены генератора ЖДЁМ: RATE_LIMIT у Veo временный,
    # переждать его выгоднее, чем подменять картинку чужой эстетикой.
    last = None
    for attempt in range(1, VEO_IMAGE_ATTEMPTS + 1):
        _stop_check()      # пережидание лимита не должно переживать «Стоп»
        try:
            return veo_image(prompt, dest, veo_key, log, style)
        except Exception as e:
            last = e
            msg = str(e)
            if attempt == VEO_IMAGE_ATTEMPTS:
                break
            # лимит — ждём с нарастанием; прочие ошибки повторять смысла мало
            if "RATE_LIMIT" in msg or "429" in msg or "500" in msg:
                pause = VEO_IMAGE_BACKOFF * attempt
                log(f"[Картинка] VeoNonStop занят (попытка {attempt}/"
                    f"{VEO_IMAGE_ATTEMPTS}) — жду {pause} c...")
                _sleep_cancel(pause)
                continue
            break
    log(f"[Картинка] VeoNonStop не справился ({last}) — этот план возьмёт "
        "сток/Ken Burns")
    raise last


VIDEO_REVIEW_PROMPT = """This is a single frame from a finished documentary
video, taken at __TIME__.

At this exact moment the narrator is saying:
"__LINE__"

You are a demanding documentary editor doing quality control on the finished
cut. Judge ONLY this frame. Report a problem if any of these is true:
- the picture has nothing to do with what is being narrated right now
- the frame is blank, black, a solid colour, or visually dead
- on-screen text (subtitles, lower-thirds, banners) is cut off, overlapping
  something, or unreadable against what is behind it
- the shot looks like a generic stock-photo slideshow rather than a documentary
- the image is obviously distorted, badly stretched, or upscaled to mush
- a graphic covers the subject of the shot

If the frame is fine, say so. Do not invent problems; a plain but relevant shot
is FINE — documentaries are full of them.

Reply with ONLY a JSON object, no markdown fences:
{"ok": true|false, "problem": "<if not ok: one short concrete sentence>"}"""


STORYBOARD_REVIEW_PROMPT = """This is one shot from a documentary, taken from
the clip that will play while the narrator says:

"__LINE__"

It was found by searching a stock library for: "__QUERY__"

You are the editor checking the shot before the cut is locked. Answer one
question: does this picture belong under those words?

Say NO if the shot is about something else entirely — the classic failure is a
stock library matching one word literally (a search for a "rotten egg smell"
returning a carton of eggs under narration about acid).

Say YES if it is relevant, even loosely: an object, place, action or mood that
fits what is being said. Documentaries are full of plain establishing shots and
that is fine. A shot does not have to illustrate every word.

Reply with ONLY a JSON object, no markdown fences:
{"ok": true|false, "better": "<if not ok: a 2-5 word stock search naming
something a camera can photograph that WOULD fit these words; empty if ok>"}"""


def review_storyboard(project_dir: Path, api_key: str = "", log=print,
                      limit: int = 0, every: int = 1, workers: int = 3,
                      only: list[int] | None = None) -> list[dict]:
    """Проверяет ПОДБОР КАДРОВ до рендера — там, где исправить дёшево.

    Смысл в этом: та же проверка на готовом ролике находит брак, когда
    пересобирать уже три часа. Здесь достаточно перекачать один клип.

    Для каждого плана берётся кадр из его клипа и показывается модели вместе
    с фразой, которая в этот момент звучит, и запросом, по которому клип
    нашли. Возвращает [{i, query, text, file, better}] по несовпадениям —
    `better` это предложенный моделью исправленный запрос.

    every — шаг проверки, и по умолчанию он 1, то есть смотрим КАЖДЫЙ план.
    Раньше стояло 3 с обоснованием «брак идёт не поодиночке, выборки хватит
    его увидеть». Увидеть — да, но чинится-то ровно то, что попало в
    выборку: refix_storyboard работает по списку найденных записей и соседей
    не трогает. При шаге 3 две трети брака просто не осматривались, и доля
    несоответствий в готовом ролике упиралась в потолок около 70% сверху
    вниз. Осмотр стоит одного запроса к зрению на план — против генерации
    кадра это копейки, экономить надо было не здесь.

    workers — проверки идут параллельно: они упираются в сеть, а не в
    процессор, и последовательный обход сотни планов добавлял бы минуты
    к каждой сборке. Но не больше трёх: у бесплатной квоты Gemini лимит
    на ЗАПРОСЫ В МИНУТУ, и шесть потоков выбивали 429 на обоих зрениях
    сразу — то есть ускорение ломало ровно ту проверку, которую ускоряло.

    only — проверить именно эти планы (по индексу), игнорируя every/limit.
    Нужно для второго прохода: после замены пересматриваются ТОЛЬКО
    заменённые кадры. Иначе замена никем не проверяется — сгенерировали
    новый кадр и поверили ему на слово, а он тоже может быть мимо.
    """
    from concurrent.futures import ThreadPoolExecutor

    tl_path = Path(project_dir) / "timeline.json"
    if not tl_path.exists():
        raise FileNotFoundError("нет timeline.json — сначала раскадровка")
    beats = json.loads(tl_path.read_text(encoding="utf-8"))
    if only is not None:
        idx = [i for i in only if 0 <= i < len(beats)]
    else:
        idx = list(range(0, len(beats), max(1, every)))
        if limit:
            idx = idx[:limit]
    if not idx:
        return []
    log(f"[Кадры] Проверяю {len(idx)} планов из {len(beats)}...")
    # Сорванные проверки считаем отдельно. Молчаливо считать непроверенный
    # план хорошим — как раз тот способ получить «0 несоответствий» на
    # сплошном отказе ключа и уйти в рендер с чувством выполненного долга.
    errors: list[str] = []

    def check(job):
        """Один план -> запись о браке или None. Индекс берётся из позиции в
        beats, а не через beats.index(b): одинаковые планы (повтор запроса на
        соседних фразах) находились бы по первому вхождению и чинился бы
        каждый раз один и тот же клип."""
        n, i, tmp = job
        # Задачи ставятся в пул все разом, поэтому «Стоп» проверяется здесь:
        # ещё не начатые проверки просто ничего не делают, и пул закрывается
        # почти сразу, а не после сотни оплаченных запросов к зрению.
        if CANCEL.is_set():
            return None
        b = beats[i]
        src = Path(b.get("file", ""))
        if not src.exists():
            return None
        shot = Path(tmp) / f"s{i}.jpg"
        try:
            _run_child(
                ["ffmpeg", "-y", "-ss", "0.5", "-i", str(src),
                 "-frames:v", "1", "-vf", "scale=640:-2", "-q:v", "5",
                 str(shot)],
                timeout=60, check=True)
        except Exception:
            return None
        if not shot.exists():
            return None
        line = str(b.get("text", "")).replace("\n", " ")[:250]
        try:
            out = vision_chat(
                STORYBOARD_REVIEW_PROMPT.replace("__LINE__", line)
                    .replace("__QUERY__", str(b.get("query", ""))),
                shot.read_bytes(), api_key,
                system="You are a documentary editor checking shot choices.",
                max_tokens=300)
            m = re.search(r"\{.*\}", out, re.S)
            if not m:
                return None
            data = json.loads(m.group(0))
            if data.get("ok"):
                return None
            return {"i": i, "query": b.get("query", ""), "text": line,
                    "file": str(src),
                    "better": str(data.get("better", "")).strip()}
        except Exception as e:
            errors.append(str(e)[:120])
            log(f"[Кадры] план {i + 1}: проверка не прошла ({_redact(e)})")
            return None

    bad = []
    with tempfile.TemporaryDirectory() as tmp:
        jobs = [(n, i, tmp) for n, i in enumerate(idx, 1)]
        done = 0
        with ThreadPoolExecutor(max_workers=max(1, workers)) as ex:
            for rec in ex.map(check, jobs):
                if CANCEL.is_set():
                    break
                done += 1
                if rec:
                    bad.append(rec)
                    log(f"[Кадры] план {rec['i'] + 1}: «{rec['query']}» мимо"
                        + (f" -> лучше «{rec['better']}»" if rec["better"] else ""))
                if done % 25 == 0:
                    log(f"[Кадры] проверено {done}/{len(jobs)}, брака {len(bad)}")
    # Вне `with`: пул уже закрыт, чужие потоки не висят. Отчёт по половине
    # планов отдавать нельзя — вызывающий чинит ровно то, что в отчёте, и
    # непроверенные кадры молча считались бы хорошими.
    _stop_check()
    bad.sort(key=lambda r: r["i"])
    checked = len(idx) - len(errors)
    share = len(bad) / checked * 100 if checked else 0
    log(f"[Кадры] Итого: {len(bad)} несоответствий из {checked} "
        f"проверенных ({share:.0f}%)")
    if errors:
        # Отдельной заметной строкой, а не примечанием: «брака 6» на
        # исчерпанной квоте читается как «ролик почти чистый», хотя на самом
        # деле кадры просто никто не смотрел. Худший вид отчёта — тот, что
        # выглядит хорошо именно потому, что проверка не работала.
        lost = len(errors) / len(idx) * 100
        log(f"[Кадры] ⚠ ПРОВЕРКА НЕ СОСТОЯЛАСЬ на {len(errors)} из "
            f"{len(idx)} планов ({lost:.0f}%) — эти кадры НЕ проверены и "
            f"НЕ починены. Причина: {errors[0]}")
        import quality
        quality.degraded(
            "Кадры", "часть кадров ушла в ролик непроверенной — за ними "
            "никто не посмотрел, соответствуют ли они словам диктора",
            why=f"проверка зрением не прошла на {len(errors)} из {len(idx)} "
                f"планов ({lost:.0f}%): {errors[0]}",
            hint="обычно это лимит квоты Gemini — добавь ещё ключ в .env и "
                 "прогони проверку кадров заново",
            level="критично" if lost > 50 else "заметно")
        if lost > 50:
            log("[Кадры] ⚠ Проверено меньше половины — считайте, что "
                "проверки кадров в этом ролике не было.")
    return bad


def refix_storyboard(project_dir: Path, bad: list[dict], log=print,
                     pexels_keys: str = "", pixabay_keys: str = "",
                     visual_style: str = "", prefer_ai: bool = True) -> int:
    """Перекачивает ТОЛЬКО забракованные планы по исправленному запросу.

    Файл перезаписывается под тем же именем, поэтому timeline.json и все
    ссылки остаются валидными — пересобирать раскадровку целиком не нужно.
    Возвращает число реально заменённых клипов.

    Если замена не нашлась — старый клип остаётся: плохой кадр всё же лучше
    дырки в монтаже."""
    if not bad:
        return 0
    pexels = KeyRotator(pexels_keys or os.getenv("PEXELS_API_KEY", ""))
    pixabay = KeyRotator(pixabay_keys or os.getenv("PIXABAY_API_KEY", ""))
    if not pexels.current and not pixabay.current:
        log("[Кадры] Нет ключей стоков — заменить нечем")
        import quality
        quality.degraded(
            "Кадры", "кадры, не отвечающие закадровому тексту, остались в "
            "ролике — заменить их было нечем",
            why=f"найдено несоответствий: {len(bad)}, а ключей стоков нет",
            hint="добавь ключ Pexels или Pixabay в «Настройки API»",
            level="критично")
        return 0
    pexels_get, _ = _stock_getters(pexels, pixabay, log)
    used = _load_used()
    fixed = 0
    for rec in bad:
        # Замена клипа — операция «удалить старый, переименовать новый»; рвать
        # её посередине нельзя, а между планами — можно, уже заменённые файлы
        # остаются валидными (имена не менялись, timeline.json тоже).
        if CANCEL.is_set():
            log(f"[Кадры] ⛔ Стоп: заменено {fixed} из {len(bad)}, остальные "
                "остались с прежними клипами")
            _save_used(used)
            raise Cancelled("Остановлено пользователем")
        q = (rec.get("better") or "").strip()
        dest = Path(rec.get("file", ""))
        if not q or not dest.parent.exists():
            continue
        old_q = (rec.get("query") or "").strip()
        # Судья иногда предлагает ТОТ ЖЕ запрос, который сам и забраковал —
        # менять клип на другой по тому же запросу бессмысленно, а лотерея
        # может дать хуже. Наблюдалось на живом прогоне.
        if q.lower() == old_q.lower():
            log(f"[Кадры] план {rec['i'] + 1}: замена совпала с оригиналом "
                f"«{q}» — оставляю как есть")
            continue
        # Замена не должна терять предмет: если в новом запросе нет ни одного
        # значимого слова из старого и он при этом расплывчатый, это скорее
        # уход в сторону, чем исправление.
        VAGUE = ("close up", "hand touching", "person using", "man on phone",
                 "looking at camera", "surface", "object")
        if any(v in q.lower() for v in VAGUE) and len(q.split()) <= 5:
            log(f"[Кадры] план {rec['i'] + 1}: «{q}» слишком общий — пропускаю")
            continue
        need = 6
        # ГЛАВНОЕ ЛЕКАРСТВО от несоответствия: сначала СОЗДАТЬ кадр под
        # запрос, а не искать его в стоках. Стоковая библиотека часто просто
        # НЕ ИМЕЕТ кадра под конкретную фразу («термоудар в трубе» никто не
        # снимал), и поиск отдаёт то, что случайно совпало по слову. Кадр,
        # сгенерированный по описанию, соответствует тексту по построению.
        if prefer_ai and os.getenv("VEO_API_KEY", "").strip():
            try:
                jpg = dest.with_suffix(".ai.jpg")
                gen_image(q, jpg, "", log, visual_style)
                tmp_mp4 = dest.with_suffix(".ai.mp4")
                ken_burns(jpg, tmp_mp4, duration=max(need, 6), fps=25)
                dest.unlink(missing_ok=True)
                tmp_mp4.rename(dest)
                jpg.unlink(missing_ok=True)
                fixed += 1
                log(f"[Кадры] план {rec['i'] + 1}: «{old_q}» -> ИИ-кадр «{q}» ✔")
                continue
            except Exception as e:
                log(f"[Кадры] план {rec['i'] + 1}: ИИ-кадр не вышел ({_redact(e)}) "
                    "— пробую сток")
        try:
            r = pexels_get("https://api.pexels.com/videos/search",
                           {"query": q, "per_page": SEARCH_POOL,
                            "orientation": "landscape"})
            vids = (r.json().get("videos")
                    if r is not None and r.status_code == 200 else None)
            if not vids:
                log(f"[Кадры] план {rec['i'] + 1}: по «{q}» ничего не нашлось")
                continue
            long_enough = [v for v in vids if (v.get("duration") or 0) >= need]
            picked = _pick_unused(long_enough or vids, "pexels_video",
                                  used, 1, log)
            if not picked:
                continue
            tmp_dest = dest.with_suffix(".new.mp4")
            download_file(pick_video_file(picked[0]["video_files"])["link"],
                          tmp_dest)
            # заменяем только после УСПЕШНОЙ загрузки: иначе при обрыве сети
            # останется ни старого клипа, ни нового, и рендер упадёт
            dest.unlink(missing_ok=True)
            tmp_dest.rename(dest)
            fixed += 1
            log(f"[Кадры] план {rec['i'] + 1}: «{rec['query']}» -> «{q}» ✔")
        except Exception as e:
            log(f"[Кадры] план {rec['i'] + 1}: заменить не вышло ({_redact(e)})")
    _save_used(used)
    log(f"[Кадры] Заменено {fixed} из {len(bad)}")
    if fixed < len(bad):
        # незаменённый план — это кадр не про то, о чём говорит диктор:
        # самый заметный признак сборки «на автомате»
        import quality
        quality.degraded(
            "Кадры", "кадры, не отвечающие закадровому тексту, остались в "
            "ролике",
            why=f"заменить удалось {fixed} из {len(bad)} забракованных",
            hint="перезапусти проверку кадров или замени эти планы вручную",
            level="критично" if not fixed else "заметно")
    return fixed


def review_video(video: Path, api_key: str = "", log=print,
                 every: float = 25.0, max_frames: int = 14,
                 srt: Path | None = None) -> list[dict]:
    """Прогоняет ГОТОВЫЙ ролик через того же визуального судью, что проверяет
    оверлеи. Смысл шире: технические проверки смотрят на один элемент, а
    зритель видит кадр целиком — несовпадение картинки со словами, мёртвый
    план, наехавший титр ловятся только так.

    Кадр показывается вместе с фразой, которая звучит в этот момент (из srt),
    иначе судить «в тему ли картинка» невозможно. Возвращает список
    [{t, problem}] — пустой, если всё чисто. Ничего не роняет: недоступный
    API или битый ответ просто уменьшают охват проверки."""
    video = Path(video)
    if not video.exists():
        raise FileNotFoundError(f"нет файла {video}")
    total = audio_duration(video) or 0.0
    if total <= 0:
        log("[Ревью] Не удалось измерить длительность — пропускаю")
        return []
    # фразы по таймкодам, чтобы спросить «картинка в тему того, что говорят?»
    phrases = []
    if srt and Path(srt).exists():
        try:
            phrases = [(srt_to_seconds(s), srt_to_seconds(e), t)
                       for s, e, t in parse_srt(Path(srt))]
        except Exception:
            phrases = []

    def line_at(t: float) -> str:
        for s, e, txt in phrases:
            if s <= t <= e:
                return txt.replace("\n", " ")[:300]
        return "(в этот момент речи нет)"

    step = max(float(every), 5.0)
    points = [t for t in _frange(step / 2, total, step)][:max_frames]
    log(f"[Ревью] Смотрю {len(points)} кадров из {total / 60:.1f} мин ролика...")
    issues = []
    with tempfile.TemporaryDirectory() as tmp:
        for t in points:
            # частичный отчёт по ролику так же обманчив, как в review_storyboard
            _stop_check()
            shot = Path(tmp) / f"f{int(t)}.jpg"
            try:
                _run_child(
                    ["ffmpeg", "-y", "-ss", f"{t:.2f}", "-i", str(video),
                     "-frames:v", "1", "-vf", "scale=854:-2", "-q:v", "4",
                     str(shot)],
                    timeout=120, check=True)
            except Exception as e:
                log(f"[Ревью] {int(t)}с: кадр не достался ({_redact(e)})")
                continue
            if not shot.exists():
                continue
            mm, ss = divmod(int(t), 60)
            try:
                out = vision_chat(
                    VIDEO_REVIEW_PROMPT.replace("__TIME__", f"{mm:02d}:{ss:02d}")
                                       .replace("__LINE__", line_at(t)),
                    shot.read_bytes(), api_key,
                    system="You are a meticulous documentary editor.",
                    max_tokens=300)
                m = re.search(r"\{.*\}", out, re.S)
                if not m:
                    continue
                data = json.loads(m.group(0))
                if not data.get("ok"):
                    problem = str(data.get("problem", "")).strip()
                    issues.append({"t": t, "problem": problem})
                    log(f"[Ревью] {mm:02d}:{ss:02d} — {problem}", )
            except Exception as e:
                log(f"[Ревью] {mm:02d}:{ss:02d}: проверка не прошла ({_redact(e)})")
    if not issues:
        log("[Ревью] Замечаний нет — просмотренные кадры в порядке")
    else:
        log(f"[Ревью] Итого замечаний: {len(issues)} из {len(points)} кадров")
    return issues


def _frange(start: float, stop: float, step: float):
    t = start
    while t < stop:
        yield t
        t += step


def gen_thumbnail_ideas(script_text: str, api_key: str = "", log=print,
                        count: int = 3) -> list[dict]:
    """Идеи обложек по сценарию: короткий текст на картинку + промпт фона.

    Текст обложки — НЕ заголовок ролика: в ленте YouTube карточка шириной
    ~210px, туда влезает 2-4 крупных слова, а не предложение. Поэтому
    просим отдельно и коротко. Возвращает [{headline, bg_prompt, layout}],
    пустой список при любом сбое (обложки — не критичный этап)."""
    text = (script_text or "").strip()
    if not text:
        return []
    try:
        out = llm_chat(
            [{"role": "system", "content":
              "You design YouTube thumbnails for documentary channels. "
              "Curiosity-driven, never clickbait that the video doesn't deliver."},
             {"role": "user", "content":
              f"Based on this narration, propose {count} DIFFERENT thumbnail "
              "concepts.\n\nRules for `headline`:\n"
              "- 2 to 4 words TOTAL, uppercase, no punctuation except ? or !\n"
              "- it must be readable at 210px wide, so short is mandatory\n"
              "- use \\n to split it into at most 2 lines\n"
              "- it is NOT the video title — it is the hook ON the image\n\n"
              "Rules for `bg_prompt`: one sentence describing a photographic "
              "background image for that concept — a place, an object or a "
              "scene from the narration. No text, no words in the image, no "
              "collage, no watermark.\n\n"
              "`layout` must be one of: left, bottom, split.\n\n"
              "Reply with ONLY a JSON array, no markdown fences:\n"
              '[{"headline":"...","bg_prompt":"...","layout":"left"}]\n\n'
              f"NARRATION:\n{text[:5000]}"}],
            api_key, 0.9, 900)
        m = re.search(r"\[.*\]", out or "", re.S)
        if not m:
            log(f"[Обложка] Не нашёл JSON в ответе: {(out or '')[:120]!r}")
            return []
        ideas = []
        for it in json.loads(m.group(0)):
            head = str(it.get("headline", "")).strip()
            if not head:
                continue
            ideas.append({
                "headline": head.replace("\\n", "\n")[:60],
                "bg_prompt": str(it.get("bg_prompt", "")).strip()[:400],
                "layout": (str(it.get("layout", "left")).strip().lower()
                           if str(it.get("layout", "")).strip().lower()
                           in ("left", "bottom", "split") else "left"),
            })
        return ideas[:count]
    except Exception as e:
        log(f"[Обложка] Не вышло придумать концепции ({_redact(e)})")
        return []


def gen_topic(channel: dict, api_key: str = "", log=print) -> str:
    """Тема очередного ролика по ФОРМУЛЕ НИШИ канала.

    Формула — не выдумка, а вывод из замеров соседних каналов (см.
    yt_research): какие темы там обгоняли медиану в разы, а какие проваливались
    в сто раз. Без неё пайплайн делает ролик на любую тему одинаково хорошо и
    одинаково незаметно.

    Пустая строка при сбое — вызывающий тогда попросит тему у пользователя."""
    formula = (channel.get("topic_formula") or "").strip()
    if not formula:
        return ""
    used = channel.get("used_topics") or []
    avoid = ("\n\nALREADY COVERED on this channel — pick something clearly "
             "different:\n- " + "\n- ".join(used[-25:])) if used else ""
    try:
        out = llm_chat(
            [{"role": "system", "content":
              "You choose video topics for a YouTube channel, guided strictly "
              "by what has been measured to work in its niche."},
             {"role": "user", "content":
              f"Channel: {channel.get('name', '')}\n"
              f"Language of the channel: {LANGS.get(channel.get('lang', ''), 'English')}\n\n"
              "WHAT WORKS HERE (measured on competing channels in this exact "
              f"niche):\n{formula}\n"
              + (f"\nWHAT THIS CHANNEL AVOIDS: {channel['avoid']}\n"
                 if channel.get("avoid") else "")
              + avoid +
              "\n\nPropose ONE topic for the next video. It must fit the "
              "pattern above exactly — that pattern is the whole point.\n"
              "Reply with ONLY the topic as a single short phrase in the "
              "channel's language, no quotes, no explanation, no title "
              "formatting."}],
            api_key, 1.0, 800)
        topic = " ".join((out or "").split()).strip().strip('"«»')
        if 8 < len(topic) < 160:
            return topic
        log(f"[Тема] Ответ не похож на тему ({len(topic)} симв.) — пропускаю")
    except Exception as e:
        log(f"[Тема] Не вышло подобрать тему по формуле ниши ({_redact(e)})")
    return ""


def gen_variant_theme(topic: str, kind: str, api_key: str = "",
                      log=print) -> str:
    """Художественное описание НОВОГО оверлея под тему ролика — то, что потом
    получит генератор кода. Придумывает LLM, а не мы: захардкоженный список
    тем быстро исчерпается и библиотека начнёт наполняться близнецами.

    Пустая строка при любом сбое — вызывающий тогда просто не пополнит
    библиотеку, на сам ролик это не влияет."""
    try:
        out = llm_chat(
            [{"role": "system", "content":
              "You are an art director for documentary motion graphics."},
             {"role": "user", "content":
              f'A documentary video about: "{topic or "an unknown subject"}".\n\n'
              f'Invent ONE fresh visual treatment for its "{kind}" on-screen '
              "graphic. Describe the LOOK and the MOTION in 2-3 sentences: "
              "what physical object or material it evokes, how it is built up "
              "on screen, and how it enters and leaves.\n"
              "Be concrete and unusual — name a material (etched brass, "
              "carbon paper, frosted glass, oscilloscope trace, index card, "
              "microfilm), a real motion (unrolls, stamps down, wipes, "
              "develops like a photograph, ticks like a counter), and a "
              "palette. Avoid a plain rectangle with a fade.\n"
              "Reply with ONLY that description, no preamble, no quotes."}],
            # лимит щедрый не по объёму ответа, а потому что у gemini-2.5-flash
            # «размышления» тратят тот же бюджет maxOutputTokens: при 300 текст
            # обрывался на полуслове («A fragment of sea ice, its edges sharp»)
            api_key, 1.0, 2000)
        theme = (out or "").strip().strip('"')
        # обрубок бесполезен: генератору кода нужна законченная мысль,
        # а не половина фразы — лучше не пополнить библиотеку вовсе
        if len(theme) < 80 or not theme.rstrip().endswith((".", "!", "?")):
            log(f"[Варианты] Описание нового оверлея вышло обрывочным "
                f"({len(theme)} симв.) — пропускаю пополнение")
            return ""
        return theme[:600]
    except Exception as e:
        log(f"[Варианты] Не вышло придумать тему нового оверлея ({_redact(e)})")
        return ""


MUSIC_MOODS = ("calm", "dark", "upbeat", "epic", "horror")


def guess_music_mood(script_text: str, fallback: str = "calm",
                     api_key: str = "", log=print) -> str:
    """Настроение музыки по СОДЕРЖАНИЮ сценария, а не по выбранному жанру.
    Жанр один на канал, поэтому таблица «тон → настроение» давала всем
    документалкам одинаковый calm — и ролик про полярную экспедицию звучал
    как ролик про пчеловодство. Ошибка не критична: при любом сбое (нет
    ключей, лимит, мусор в ответе) возвращаем fallback из старой таблицы."""
    text = (script_text or "").strip()
    if not text:
        return fallback
    try:
        out = llm_chat(
            [{"role": "system", "content":
              "You pick background music for documentary videos."},
             {"role": "user", "content":
              "Read this narration and choose the ONE background-music mood "
              "that fits its actual subject and emotional arc.\n"
              f"Allowed answers, reply with one word only: {', '.join(MUSIC_MOODS)}\n"
              "  calm = reflective, observational, gentle\n"
              "  dark = tense, sombre, investigative, tragedy\n"
              "  upbeat = light, curious, energetic, positive\n"
              "  epic = grand scale, awe, survival, historic weight\n"
              "  horror = dread, menace, the supernatural\n\n"
              f"NARRATION (first part):\n{text[:4000]}"}],
            api_key, 0.3, 20)
        word = re.sub(r"[^a-z]", "", (out or "").strip().lower())
        if word in MUSIC_MOODS:
            return word
        log(f"[Музыка] Непонятный ответ про настроение ({out!r:.60}) — "
            f"остаюсь на «{fallback}»")
        _mood_degraded(f"ответ модели не похож на настроение ({out!r:.40})",
                       fallback)
    except Exception as e:
        log(f"[Музыка] Не вышло определить настроение по сценарию ({_redact(e)}) — "
            f"остаюсь на «{fallback}»")
        _mood_degraded(f"{e.__class__.__name__}", fallback)
    return fallback


def _mood_degraded(why: str, fallback: str):
    """Музыка под роликом осталась «по жанру канала» — то есть у всех
    документалок одна и та же. Слышно сразу, поэтому пишем в итог."""
    import quality
    quality.degraded(
        "Музыка", "музыка подобрана по жанру канала, а не по содержанию "
        f"сценария (осталось «{fallback}»)",
        why=why, level="заметно")


def pick_music_by_mood(music_dir: Path, mood: str) -> Path:
    """Трек по настроению: сначала подпапка music_dir/<mood>/, иначе файлы
    со словом mood в имени. Библиотеку наполняй сам (YouTube Audio Library,
    Pixabay Music — скачай треки руками, у них нет публичного API)."""
    music_dir = Path(music_dir)
    sub = music_dir / mood
    cands = []
    if sub.is_dir():
        cands = [p for p in sub.iterdir() if p.suffix.lower() in MUSIC_EXTS]
    if not cands and music_dir.is_dir():
        cands = [p for p in music_dir.rglob("*")
                 if p.suffix.lower() in MUSIC_EXTS
                 and mood.lower() in p.stem.lower()]
    if not cands:
        raise FileNotFoundError(
            f"Нет треков настроения «{mood}»: создай папку {sub} и положи "
            f"туда mp3, либо добавь «{mood}» в имя файла.")
    return random.choice(cands)


# ---------- Jamendo: авто-загрузка лицензионной музыки (свободный API) ----------

# YouTube Audio Library и Pixabay Music публичного API не имеют (см. выше) —
# Jamendo единственный из бесплатных источников музыки с открытым API и
# понятными Creative Commons лицензиями. Тег под каждое настроение — набор
# самых ходовых тегов в их каталоге, не идеальный, но рабочий.
JAMENDO_MOOD_TAGS = {
    "calm": "calm", "dark": "dark", "upbeat": "energetic",
    "epic": "epic", "horror": "horror",
}


def _jamendo_license_ok(ccurl: str) -> bool:
    """Отсекает NC (некоммерческая) и ND (без производных) лицензии — на
    монетизированном канале нужен именно "-by" / "-by-sa" / cc0, иначе есть
    риск жалобы по лицензии, даже если трек формально бесплатный."""
    u = (ccurl or "").lower()
    if "publicdomain" in u or "/zero/" in u:
        return True
    return "-nc" not in u and "/nc" not in u and "-nd" not in u and "/nd" not in u


def jamendo_search(mood: str, client_id: str, count: int = 5) -> list[dict]:
    """Ищет до count треков под настроение mood с разрешённой коммерческой
    лицензией. Возвращает [{id, name, artist, url, ccurl}, ...]."""
    import requests
    tag = JAMENDO_MOOD_TAGS.get(mood, mood)
    # client_id — тоже учётка, а fill_music_library_jamendo пишет текст ошибки
    # в журнал: без обёртки он уезжал бы в публичный app.log вместе с URL
    try:
        r = requests.get(
            "https://api.jamendo.com/v3.0/tracks/",
            params={"client_id": client_id, "format": "json", "limit": 30,
                    "tags": tag, "audioformat": "mp32", "include": "licenses",
                    "order": "popularity_total", "boost": "popularity_total"},
            timeout=30)
    except Exception as e:
        raise RuntimeError(f"Jamendo: {_redact(e)}") from None
    if r.status_code != 200:
        raise RuntimeError(f"Jamendo API {r.status_code}: {r.text[:200]}")
    data = r.json()
    if (data.get("headers") or {}).get("status") == "failed":
        raise RuntimeError("Jamendo API: " + (data["headers"].get("error_message")
                                              or "запрос не выполнен")
                           + " — проверь client_id в Настройках.")
    out = []
    for t in data.get("results", []):
        if not t.get("audio"):
            continue
        if not _jamendo_license_ok(t.get("license_ccurl", "")):
            continue
        out.append({"id": t["id"], "name": t.get("name", "untitled"),
                    "artist": t.get("artist_name", "unknown"),
                    "url": t["audio"], "ccurl": t.get("license_ccurl", "")})
        if len(out) >= count:
            break
    return out


def jamendo_download(track: dict, dest_dir: Path, log=print) -> Path:
    """Качает трек + кладёт рядом .license.txt с автором/лицензией — чтобы
    при необходимости атрибуции в описании ролика было что скопировать."""
    import requests
    import re as _re
    dest_dir.mkdir(parents=True, exist_ok=True)
    safe = _re.sub(r"[^\w\- ]+", "_", track["name"]).strip()[:60] or track["id"]
    dest = dest_dir / f"{safe}_{track['id']}.mp3"
    r = requests.get(track["url"], timeout=60)
    if r.status_code != 200:
        raise RuntimeError(f"Jamendo скачивание {r.status_code}: {track['url']}")
    dest.write_bytes(r.content)
    dest.with_suffix(".license.txt").write_text(
        f"{track['name']} — {track['artist']}\nJamendo, license: {track['ccurl']}\n",
        encoding="utf-8")
    log(f"[Jamendo] Скачан: {track['name']} — {track['artist']} "
        f"({track['ccurl']})")
    return dest


def fill_music_library_jamendo(music_dir: Path, client_id: str, log=print,
                               per_mood: int = 3) -> int:
    """Разово наполняет все 5 папок настроения треками с Jamendo. Уже
    скачанные (по id в имени файла) не повторяет. Возвращает число новых
    файлов."""
    music_dir = Path(music_dir)
    added = 0
    for mood in JAMENDO_MOOD_TAGS:
        # скачанные треки остаются в папках — прерывать между настроениями
        # безопасно, второй запуск просто дольёт недостающие
        _stop_check()
        sub = music_dir / mood
        have_ids = set()
        if sub.is_dir():
            have_ids = {p.stem.rsplit("_", 1)[-1] for p in sub.iterdir()
                       if p.suffix.lower() in MUSIC_EXTS}
        need = per_mood - len(have_ids)
        if need <= 0:
            log(f"[Jamendo] «{mood}»: уже {len(have_ids)} треков, пропускаю")
            continue
        try:
            found = jamendo_search(mood, client_id, count=need + len(have_ids) + 5)
        except Exception as e:
            log(f"[Jamendo] «{mood}»: поиск не удался ({_redact(e)})")
            continue
        fresh = [t for t in found if t["id"] not in have_ids][:need]
        if not fresh:
            log(f"[Jamendo] «{mood}»: подходящих (коммерческая лицензия) "
                "треков не нашлось")
        for t in fresh:
            try:
                jamendo_download(t, sub, log)
                added += 1
            except Exception as e:
                log(f"[Jamendo] «{t['name']}»: скачивание не удалось ({_redact(e)})")
    log(f"[Jamendo] Готово: добавлено {added} треков в {music_dir}")
    return added


# ---------- Генерация видео (Agnes Video V2.0, асинхронный API) ----------

AGNES_VIDEO_MODEL = os.getenv("AGNES_VIDEO_MODEL", "agnes-video-v2.0")


def _agnes_keys(extra: str = "") -> list[str]:
    """Все ключи Agnes для ротации: параметр, AGNES_API_KEY, AGNES_API_KEY2..."""
    keys = []
    for k in (extra, os.getenv("AGNES_API_KEY", ""),
              os.getenv("AGNES_API_KEY2", ""),
              os.getenv("AGNES_API_KEY3", "")):
        k = (k or "").strip()
        if k and k not in keys:
            keys.append(k)
    return keys


def agnes_video(prompt: str, dest: Path, api_key: str, log=print,
                seconds: float = 5.0, timeout_s: int = 900) -> Path:
    """Видеоклип через Agnes Video V2.0: POST /v1/videos создаёт задачу,
    затем опрос GET /agnesapi?video_id=... до status=completed.
    Длительность = num_frames / frame_rate, num_frames по правилу 8n+1."""
    import requests
    headers = {"Authorization": f"Bearer {api_key}"}
    fr = 24
    frames = min(int(round(seconds * fr / 8)) * 8 + 1, 441)
    r = requests.post(f"{AGNES_BASE_URL}/videos", headers=headers,
                      json={"model": AGNES_VIDEO_MODEL,
                            "prompt": f"{prompt}. Cinematic, realistic, "
                                      "high detail, no text or watermarks.",
                            "width": 1152, "height": 768,
                            "num_frames": frames, "frame_rate": fr},
                      timeout=120)
    if r.status_code != 200:
        raise RuntimeError(f"Agnes video {r.status_code}: {r.text[:300]}")
    task = r.json()
    vid = task.get("video_id") or task.get("task_id") or task.get("id")
    if not vid:
        raise RuntimeError(f"Agnes video: ответ без id ({str(task)[:200]})")
    log(f"[Видео-ИИ] Задача создана: ~{task.get('seconds', seconds)} c, "
        f"{task.get('size', '1152x768')} — генерация...")
    host = AGNES_BASE_URL.rsplit("/v1", 1)[0]
    t0, last_prog = time.time(), -1
    while time.time() - t0 < timeout_s:
        _sleep_cancel(10)      # опрос статуса: «Стоп» отзовётся в пределах 10 c
        g = requests.get(f"{host}/agnesapi", params={"video_id": vid},
                         headers=headers, timeout=60)
        if g.status_code != 200:
            raise RuntimeError(f"Agnes video (опрос) {g.status_code}: "
                               f"{g.text[:200]}")
        jd = g.json()
        status = jd.get("status", "")
        if status == "completed" and jd.get("url"):
            download_file(jd["url"], dest)
            return dest
        if status == "failed":
            raise RuntimeError(f"Agnes video: задача failed "
                               f"({str(jd.get('error'))[:200]})")
        prog = jd.get("progress", 0)
        if prog != last_prog:
            log(f"[Видео-ИИ] {status or 'в очереди'}: {prog}%")
            last_prog = prog
    raise RuntimeError(f"Agnes video: не дождался за {timeout_s // 60} мин")


def veo_video(prompt: str, dest: Path, api_key: str, log=print) -> Path:
    """Клип через VeoNonStop (Veo 3.1). Длительность фиксирована API (~8 c) —
    не совпадает с заказанными seconds; при монтаже клип обрезается/тянется
    как обычный сток."""
    import veo_client
    # Апскейл — отдельная задача Veo. Для быстрого черновика его можно
    # отключить через VEO_UPSCALE=0: результат останется в 720p.
    upscale = os.getenv("VEO_UPSCALE", "1").strip().lower() not in (
        "0", "false", "no", "off"
    )
    quality = "1080p с апскейлом" if upscale else "720p без апскейла"
    log(f"[Видео-ИИ] VeoNonStop ({quality}): «{prompt[:60]}» (1-3 мин)...")
    # _cancel_log: ожидание готовности живёт внутри veo_client, и оборвать его
    # можно только через тот log, который он зовёт на каждом опросе статуса
    veo_client.generate_video_and_wait(prompt, dest, api_key=api_key,
                                       upscale=upscale, log=_cancel_log(log))
    log(f"[Видео-ИИ] Готово: {dest.name}")
    return dest


def gen_video_from_image(image_path: Path, prompt: str, dest: Path,
                         api_key: str = "", log=print, style: str = "") -> Path:
    """Оживляет готовую картинку в клип через VeoNonStop image-to-video —
    более «живая» альтернатива Ken Burns (панорама/зум в Pillow). ТОЛЬКО для
    ИИ-сгенерированных картинок: анимировать настоящее фото реального
    человека через ИИ — та же этическая проблема, что и генерация лиц
    (см. докстринг suggest_overlays_auto в overlays.py), поэтому вызывающий
    код обязан передавать сюда лишь свои же сгенерированные изображения."""
    import veo_client
    veo_key = (api_key or os.getenv("VEO_API_KEY", "")).strip()
    if not veo_key:
        raise RuntimeError("Нет VEO_API_KEY для image-to-video")
    mime = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
           "webp": "image/webp"}.get(Path(image_path).suffix.lower().lstrip("."),
                                     "image/jpeg")
    full_prompt = _image_prompt(prompt, style) + " Subtle cinematic motion."
    log(f"[Видео-ИИ] VeoNonStop image-to-video: «{prompt[:60]}» (1-3 мин)...")
    task_id = veo_client.pending_task(dest, "image-to-video")
    if task_id:
        log(f"[Видео-ИИ] Продолжаю сохранённую задачу Veo: {task_id}")
    else:
        task_id = veo_client.image_to_video(full_prompt, Path(image_path),
                                            mime_type=mime, aspect_ratio="16:9",
                                            api_key=veo_key)
        veo_client.track_task(task_id, dest, "image-to-video")
    try:
        # _cancel_log — единственный способ прервать ожидание внутри veo_client
        veo_client.wait_for_completion(task_id, veo_key, log=_cancel_log(log))
    except Exception:
        veo_client.finish_task(dest)
        raise
    veo_client.download_video(task_id, dest, api_key=veo_key)
    veo_client.finish_task(dest)
    log(f"[Видео-ИИ] Готово: {dest.name}")
    return dest


def gen_video_multi(prompt: str, images: list[dict], dest: Path,
                    api_key: str = "", log=print) -> Path:
    """Клип из НЕСКОЛЬКИХ именованных референсных картинок через VeoNonStop
    multi-image-to-video (совмещает 2+ персонажа/объекта в одной сцене).
    images: [{"name": "Alex", "path": Path(...), "mime_type": "image/jpeg"}, ...]
    — name должно встречаться в prompt словом (латиница, см. доку API), иначе
    API не сматчит картинку и использует все референсы разом."""
    import veo_client
    veo_key = (api_key or os.getenv("VEO_API_KEY", "")).strip()
    if not veo_key:
        raise RuntimeError("Нет VEO_API_KEY для multi-image-to-video")
    log(f"[Видео-ИИ] VeoNonStop multi-image: «{prompt[:60]}» "
        f"({len(images)} референса, 1-3 мин)...")
    task_id = veo_client.pending_task(dest, "multi-image-to-video")
    if task_id:
        log(f"[Видео-ИИ] Продолжаю сохранённую задачу Veo: {task_id}")
    else:
        task_id = veo_client.multi_image_to_video(prompt, images, aspect_ratio="16:9",
                                                  api_key=veo_key)
        veo_client.track_task(task_id, dest, "multi-image-to-video")
    try:
        # _cancel_log — единственный способ прервать ожидание внутри veo_client
        veo_client.wait_for_completion(task_id, veo_key, log=_cancel_log(log))
    except Exception:
        veo_client.finish_task(dest)
        raise
    veo_client.download_video(task_id, dest, api_key=veo_key)
    veo_client.finish_task(dest)
    log(f"[Видео-ИИ] Готово: {dest.name}")
    return dest


def gen_video_transition(prompt: str, start_image: Path, end_image: Path,
                         dest: Path, api_key: str = "", log=print) -> Path:
    """Клип-переход между двумя картинками через VeoNonStop batch-frame
    (start_image -> end_image). Тоже только для ИИ-сгенерированных кадров —
    не для реальных фото (см. gen_video_from_image)."""
    import veo_client
    veo_key = (api_key or os.getenv("VEO_API_KEY", "")).strip()
    if not veo_key:
        raise RuntimeError("Нет VEO_API_KEY для batch-frame")
    log(f"[Видео-ИИ] VeoNonStop batch-frame: «{prompt[:60]}» (1-3 мин)...")
    task_id = veo_client.pending_task(dest, "batch-frame-to-video")
    if task_id:
        log(f"[Видео-ИИ] Продолжаю сохранённую задачу Veo: {task_id}")
    else:
        task_id = veo_client.batch_frame_to_video(prompt, Path(start_image),
                                                  Path(end_image), aspect_ratio="16:9",
                                                  api_key=veo_key)
        veo_client.track_task(task_id, dest, "batch-frame-to-video")
    try:
        # _cancel_log — единственный способ прервать ожидание внутри veo_client
        veo_client.wait_for_completion(task_id, veo_key, log=_cancel_log(log))
    except Exception:
        veo_client.finish_task(dest)
        raise
    veo_client.download_video(task_id, dest, api_key=veo_key)
    veo_client.finish_task(dest)
    log(f"[Видео-ИИ] Готово: {dest.name}")
    return dest


def gen_video(prompt: str, dest: Path, log=print,
              seconds: float = 5.0) -> Path:
    """Генерация видеоклипа ИИ: VeoNonStop (ОСНОВНОЙ) -> Agnes (ротация
    ключей, фолбэк если Veo недоступен/ключ истёк/упал)."""
    veo_key = os.getenv("VEO_API_KEY", "").strip()
    keys = _agnes_keys()
    if not veo_key and not keys:
        raise RuntimeError("Нет ключа для видеогенерации: задай VEO_API_KEY "
                           "или AGNES_API_KEY (.env или «Настройки API»).")
    last = None
    if veo_key:
        try:
            return veo_video(prompt, dest, veo_key, log)
        except Exception as e:
            last = e
            if keys:
                log(f"[Видео-ИИ] VeoNonStop не справился ({_redact(e)}) — пробую Agnes...")
                # разные генераторы = разная эстетика в одном ролике, а весь
                # смысл единого стиля в том, чтобы канал выглядел фильмом
                import quality
                quality.degraded(
                    "Видео-ИИ", "кадр снят запасным генератором — его картинка "
                    "выбивается из общего вида ролика",
                    why=f"основной генератор (VeoNonStop) не справился: "
                        f"{str(e)[:120]}",
                    hint="проверь ключ VEO_API_KEY и остаток квоты",
                    level="заметно")
    if not keys:
        raise last
    log(f"[Видео-ИИ] Клип ~{seconds:.0f} c: «{prompt[:60]}» (1-3 мин)")
    for attempt in (1, 2):
        for i, key in enumerate(keys, 1):
            try:
                agnes_video(prompt, dest, key, log, seconds)
                log(f"[Видео-ИИ] Готово: {dest.name}")
                return dest
            except RuntimeError as e:
                s = str(e)
                if not any(x in s for x in ("429", "503", "饱和", "saturat")):
                    raise      # настоящая ошибка — не маскируем ротацией
                last = e
                log(f"[Видео-ИИ] Занято (ключ {i}/{len(keys)}, "
                    f"попытка {attempt}/2)")
        if attempt == 2:
            break
        log("[Видео-ИИ] Все ключи заняты — пауза 45 c и повтор...")
        _sleep_cancel(45)
    raise last


# ---------- Вырезание фона (rembg) ----------

def rembg_cutout(image_path: Path, log=print) -> Path:
    """Удаляет фон с картинки локально (rembg + onnxruntime).
    Результат: images/cutout_имя.png с прозрачностью — такие вырезки
    в popup-оверлеях выглядят как коллаж."""
    image_path = Path(image_path)
    try:
        from rembg import remove
    except ImportError:
        raise RuntimeError(
            "Библиотека rembg не установлена. Выполни в терминале:\n"
            "pip install rembg onnxruntime")
    log(f"[Вырезка] Убираю фон: {image_path.name} "
        "(первый запуск скачает модель ~170 МБ — подожди)...")
    data = image_path.read_bytes()
    result = remove(data)
    dest = image_path.with_name(f"cutout_{image_path.stem}.png")
    dest.write_bytes(result)
    log(f"[Вырезка] Готово: {dest} — используй её в popup-оверлеях")
    return dest


# ---------- Ken Burns ----------

def ken_burns(image: Path, dest: Path, duration: float = 8.0, fps: int = 25):
    """Превращает картинку в видеоклип с медленным движением камеры
    (случайно: наезд, отъезд, панорама влево/вправо). 1920x1080, без звука."""
    frames = max(int(duration * fps), 2)
    z_rate = 0.15 / frames  # итоговый зум ~1.15
    center = "x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
    y_mid = "y='ih/2-(ih/zoom/2)'"
    variants = [
        f"z='min(zoom+{z_rate:.6f},1.15)':{center}",                       # наезд
        f"z='if(lte(on,1),1.15,max(zoom-{z_rate:.6f},1.0))':{center}",     # отъезд
        f"z=1.15:x='(iw-iw/zoom)*on/{frames - 1}':{y_mid}",                # пан вправо
        f"z=1.15:x='(iw-iw/zoom)*(1-on/{frames - 1})':{y_mid}",            # пан влево
    ]
    vf = (f"scale=3840:-2:flags=lanczos,"
          f"zoompan={random.choice(variants)}:d={frames}:s=1920x1080:fps={fps},"
          f"format=yuv420p")
    # через _run_child: на план это десятки секунд, и по «Стопу» ffmpeg надо
    # гасить, а не досматривать до конца очередной уже ненужный клип
    _run_child(["ffmpeg", "-y", "-i", str(image), "-vf", vf,
                "-c:v", "libx264", "-preset", "fast", "-an", str(dest)],
               timeout=900, check=True)


# ---------- Субтитры ----------

CONSOLE = None  # хук GUI: живой вывод дочерних процессов (страница «Консоль»)


def _console(msg: str):
    if CONSOLE:
        try:
            CONSOLE(msg)
        except Exception:
            pass


WHISPER_LANGS = {"английский": "en", "русский": "ru", "испанский": "es",
                 "немецкий": "de", "французский": "fr", "португальский": "pt"}


def transcribe_whisper(audio_path: Path, model: str, out_dir: Path, log,
                       max_line_width: int = 42, lang: str = "en") -> Path:
    subs_dir = out_dir / "subs"
    subs_dir.mkdir(parents=True, exist_ok=True)
    wl = WHISPER_LANGS.get(lang, lang or "en")
    if wl != "en" and model.endswith(".en"):   # .en-модели только английский
        model = model[:-3]
        log(f"[Субтитры] Язык {wl} — беру мультиязычную модель {model}")
    log(f"[Субтитры] Whisper ({model})... первый запуск скачает модель, подожди")
    # ищем whisper.exe: PATH -> Scripts рядом с текущим Python. Иначе Popen
    # падает с невнятным «[WinError 2] Не удается найти указанный файл»
    import sys
    exe = shutil.which("whisper")
    if not exe:
        cand = Path(sys.executable).parent / "Scripts" / "whisper.exe"
        if cand.exists():
            exe = str(cand)
    if not exe:
        raise RuntimeError(
            "Whisper не найден. Установи его командой:  python -m pip install "
            "openai-whisper  — и перезапусти приложение. (Он же причина "
            "ошибки «[WinError 2] Не удается найти указанный файл».)")
    # word_timestamps + max_line_width/count: Whisper режет длинные фразы
    # (по 6-10 с целыми предложениями) на короткие ровные строки <=42 симв.,
    # максимум 2 строки — иначе субтитры «расползаются» по всему кадру.
    # output_format=all — вместе с .srt получаем .json с таймкодом КАЖДОГО
    # слова (words: [{word, start, end}, ...]) — на нём строятся цветные
    # караоке-субтитры со сменой цвета в такт речи (build_karaoke_ass).
    cmd = [exe, str(audio_path), "--model", model,
           "--language", WHISPER_LANGS.get(lang, lang or "en"),
           "--output_format", "all", "--word_timestamps", "True",
           "--max_line_width", str(max_line_width), "--max_line_count", "2",
           "--output_dir", str(subs_dir)]
    _console("[whisper] $ " + " ".join(cmd))
    # PYTHONUTF8: без него whisper на Windows печатает в cp1251 и падает
    # с UnicodeEncodeError на первой же нелатинской букве (é, ü, ...) —
    # транскрипция обрывается и .srt не записывается
    env = {**os.environ, "PYTHONUTF8": "1", "PYTHONIOENCODING": "utf-8"}
    # _stream_child, а не Popen напрямую: транскрипция — самая длинная операция
    # пайплайна и при этом почти без строк в журнале, поэтому «Стоп» на ней не
    # срабатывал ВООБЩЕ до самого конца. Сторож внутри гасит whisper деревом.
    code = _stream_child(cmd, "whisper", env=env)
    if code != 0:
        raise RuntimeError(f"whisper упал (код {code}) — подробности "
                           "на странице «Консоль»")
    # Whisper может назвать файлы по-своему — приводим к стандартным именам,
    # чтобы остальные шаги их находили. .json (слова с таймкодами) —
    # опционально: старые версии whisper без --output_format all его не дадут.
    for ext, name in ((".srt", "voiceover.srt"), (".json", "voiceover.json")):
        files = sorted(subs_dir.glob(f"*{ext}"),
                       key=lambda p: p.stat().st_mtime, reverse=True)
        if not files:
            if ext == ".srt":
                raise FileNotFoundError(
                    f"Whisper отработал, но .srt не найден в {subs_dir}")
            continue
        src, target = files[0], subs_dir / name
        if src != target:
            if target.exists():
                target.unlink()
            src.rename(target)
    srt = subs_dir / "voiceover.srt"
    strip_srt_punctuation(srt)
    log(f"[Субтитры] Готово: {srt}")
    return srt


def _delower_after_period(text: str) -> str:
    """«insane gaze. But the dry...» -> «insane gaze. but the dry...» —
    точку дальше уберёт strip_srt_punctuation(), а без этого шага слово
    после неё осталось бы с большой буквы посреди фразы, будто это начало
    нового предложения. "I" и акронимы (ALL CAPS) не трогаем."""
    def _fix(m):
        word = m.group(2)
        if word == "I" or (len(word) > 1 and word.isupper()):
            return m.group(0)
        return m.group(1) + word[0].lower() + word[1:]
    return re.sub(r"([.!?]\s+)([A-Z]\w*)", _fix, text)


def strip_srt_punctuation(srt_path: Path):
    """Убирает запятые/точки/двоеточия/тире из текста субтитров (номера и
    таймкоды не трогает) — по просьбе: чистые строки без пунктуации,
    только слова. Знаки вопроса/восклицания и апострофы внутри слов
    оставляем — они несут интонацию/орфографию, а не «шум». Блок может
    состоять из 2 строк текста (Whisper max_line_count=2, перенос ради
    ширины кадра, не новое предложение) — исходные переносы строк не
    трогаем (важно для обычного, некараоке стиля субтитров), но точку на
    стыке строк всё равно ловим, иначе слово после неё осталось бы с
    большой буквы посреди фразы."""
    raw = srt_path.read_text(encoding="utf-8")
    blocks = re.split(r"\n\s*\n", raw.strip())
    out_blocks = []
    for block in blocks:
        lines = block.splitlines()
        if len(lines) < 2:
            out_blocks.append(block)
            continue
        head, text_lines = lines[:2], lines[2:]
        for i in range(len(text_lines) - 1):
            if (re.search(r"[.!?]\s*$", text_lines[i].strip())
                    and re.match(r"[A-Z]", text_lines[i + 1].strip())):
                nxt = text_lines[i + 1]
                m = re.match(r"(\s*)([A-Z]\w*)(.*)", nxt, re.S)
                if m and not (m.group(2) == "I"
                             or (len(m.group(2)) > 1 and m.group(2).isupper())):
                    text_lines[i + 1] = (m.group(1) + m.group(2)[0].lower()
                                         + m.group(2)[1:] + m.group(3))
        cleaned = []
        for t in text_lines:
            t = _delower_after_period(t)
            t = re.sub(r"[,.;:—–]+", "", t)
            t = re.sub(r"[ \t]{2,}", " ", t).strip()
            cleaned.append(t)
        out_blocks.append("\n".join(head + cleaned))
    srt_path.write_text("\n\n".join(out_blocks) + "\n", encoding="utf-8")


def load_whisper_words(json_path: Path) -> list[dict]:
    """Разбирает voiceover.json (whisper --word_timestamps) в плоский список
    [{word, start, end}, ...] по всей озвучке. Пустой список, если файла нет
    или в нём почему-то нет пословных таймкодов (старый whisper) —
    вызывающий код должен откатиться на обычные (нецветные) субтитры."""
    json_path = Path(json_path)
    if not json_path.exists():
        return []
    try:
        data = json.loads(json_path.read_text(encoding="utf-8"))
    except Exception:
        return []
    words = []
    for seg in data.get("segments", []):
        for w in seg.get("words", []):
            word = str(w.get("word", "")).strip()
            if word and "start" in w and "end" in w:
                words.append({"word": word, "start": float(w["start"]),
                             "end": float(w["end"])})
    return words


def parse_srt(srt_path: Path) -> list[tuple[str, str, str]]:
    """Возвращает [(start, end, text), ...]."""
    rows, block = [], []
    for line in srt_path.read_text(encoding="utf-8").splitlines() + [""]:
        if line.strip():
            block.append(line.strip())
        else:
            if len(block) >= 3 and "-->" in block[1]:
                start, end = [t.strip() for t in block[1].split("-->")]
                rows.append((start, end, " ".join(block[2:])))
            block = []
    return rows


# ---------- Стоки ----------

def parse_scenes(scenes_text: str) -> list[dict]:
    """Одна сцена на строку: 'keywords | type: video | count: 2'.
    type и count необязательны и могут идти в любом порядке.
    Пустые строки и строки с # пропускаются, сцены нумеруются подряд."""
    scenes = []
    for line in scenes_text.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        parts = [p.strip() for p in line.split("|")]
        keywords = parts[0]
        mtype, count = "video", 1
        for part in parts[1:]:
            low = part.lower()
            if re.search(r"\b(genvideo|genvid|videogen)\b", low):
                mtype = "genvideo"
            elif re.search(r"\bgen\b", low):
                mtype = "gen"
            elif re.search(r"\b(wiki|person)\b", low):
                mtype = "wiki"
            elif "image" in low:
                mtype = "image"
            elif "video" in low:
                mtype = "video"
            m = re.search(r"count\s*:\s*(\d+)", low)
            if m:
                count = max(1, min(int(m.group(1)), MAX_CLIPS_PER_SCENE))
        scenes.append({"n": len(scenes) + 1, "keywords": keywords,
                       "type": mtype, "count": count})
    return scenes


def pick_video_file(files: list[dict]) -> dict:
    """Файл ближе к 1080p: среди >=1080 берём минимальный по высоте
    (чтобы не тащить 4K-исходники), иначе — самый крупный из доступных."""
    hd = [f for f in files if (f.get("height") or 0) >= 1080]
    if hd:
        return min(hd, key=lambda f: f["height"])
    return max(files, key=lambda f: f.get("height") or 0)


def _load_used() -> dict:
    if USED_MEDIA_FILE.exists():
        try:
            return json.loads(USED_MEDIA_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {}


def _save_used(used: dict):
    """Сохранение с защитой от параллельных прогонов (два канала могут
    рендериться одновременно): 1) перед записью подмешиваем то, что другой
    процесс успел добавить на диск, пока мы работали в памяти — иначе
    последний пишущий стирал чужую историю дедупликации; 2) пишем во
    временный файл + os.replace — атомарно, обрыв посреди записи не
    оставит битый JSON."""
    on_disk = _load_used()
    for k, v in used.items():
        if isinstance(v, list) and isinstance(on_disk.get(k), list):
            merged = list(on_disk[k])
            merged += [x for x in v if x not in on_disk[k]]
            used[k] = merged
        # не-списки (если появятся) — наша версия просто побеждает
    for k, v in on_disk.items():
        if k not in used:          # новый источник, добавленный параллельно
            used[k] = v
    tmp = USED_MEDIA_FILE.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(used, ensure_ascii=False, indent=1),
                   encoding="utf-8")
    os.replace(tmp, USED_MEDIA_FILE)


def used_media_count() -> int:
    used = _load_used()
    return sum(len(v) for v in used.values())


def _pick_unused(items: list[dict], kind: str, used: dict, count: int, log) -> list[dict]:
    """До count случайных элементов, id которых ещё не использовались в прошлых
    видео (история used_media.json). Если свежих нет — берёт повторные."""
    seen = set(map(str, used.get(kind, [])))
    fresh = [it for it in items if str(it["id"]) not in seen]
    if not fresh and items:
        log("[Стоки] Все найденные варианты уже использовались в прошлых видео — "
            "беру повторно (переформулируй ключевые слова для разнообразия).")
        fresh = list(items)
    random.shuffle(fresh)
    picked = fresh[:count]
    used.setdefault(kind, []).extend(str(it["id"]) for it in picked)
    return picked


# Ответ «ни один кандидат не подходит» — не то же самое, что сбой проверки.
NOTHING_FITS = object()

PICK_PROMPT = """This is a contact sheet of stock clips, each numbered.
One of them will play while a documentary narrator says:

"__LINE__"

Pick the number of the clip that actually belongs under those words.

Judge what is IN the picture, not what the search words were. The stock
library ranks by literal word match, so most of these are here by accident
— a search about a smell returns a photo of eggs. A plain establishing shot
that fits the subject beats a dramatic shot about something else.

If the narration says a thing was ABSENT, ruled out or not there, do NOT
pick a picture of that thing.

Answer 0 when none of them fit. That is a NORMAL answer, not a failure —
the shot will then be generated instead, which is better than a wrong one.
Prefer 0 over a picture that would look absurd in a documentary about this
subject (a costumed model, a staged studio scene, an unrelated sport), and
over one that merely shares a word with the narration.

Reply with ONLY a JSON object, no markdown:
{"pick": <number, or 0 if none fit>}"""


def _contact_sheet(images: list[bytes], cols: int = 3, cell: int = 320) -> bytes:
    """Пронумерованный лист из превью кандидатов — ОДИН запрос к зрению на
    весь выбор вместо запроса на каждого кандидата."""
    from PIL import Image, ImageDraw
    import io
    ims = []
    for b in images:
        try:
            ims.append(Image.open(io.BytesIO(b)).convert("RGB"))
        except Exception:
            continue
    if not ims:
        raise ValueError("нет читаемых превью")
    rows = (len(ims) + cols - 1) // cols
    ch = int(cell * 9 / 16)
    sheet = Image.new("RGB", (cols * cell, rows * (ch + 26)), (20, 20, 22))
    d = ImageDraw.Draw(sheet)
    for i, im in enumerate(ims):
        im = im.resize((cell, ch))
        x, y = (i % cols) * cell, (i // cols) * (ch + 26)
        sheet.paste(im, (x, y + 26))
        d.text((x + 8, y + 5), f"{i + 1}", fill=(255, 220, 120))
    buf = io.BytesIO()
    # PNG, а не JPEG: vision_chat отдаёт байты дальше с mime image/png и
    # своего параметра под другой формат не имеет
    sheet.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


def _vision_pick(items: list[dict], thumb_of, line: str, api_key: str,
                 log, top: int = 6):
    """Выбрать из кандидатов тот, что отвечает ФРАЗЕ ДИКТОРА, а не совпал по
    словам. Возвращает элемент или None (тогда решает вызывающий).

    Зачем: сток отдаёт 15 результатов, ранжированных по буквальному
    совпадению слов, а выбирался из них СЛУЧАЙНЫЙ — никто на картинку не
    смотрел. Замерено, что так попадают 48% кадров. Один запрос к зрению
    здесь заменяет такой же запрос в review_storyboard ПОСЛЕ скачивания:
    бюджет тот же, но кадр выбирается верно сразу, без перекачки.

    Любой сбой — не ошибка: возвращаем None и работаем как раньше."""
    import requests
    cands = items[:top]
    if len(cands) < 2:
        return cands[0] if cands else None
    thumbs = []
    keep = []
    for it in cands:
        url = thumb_of(it)
        if not url:
            continue
        try:
            r = requests.get(url, timeout=15)
            if r.status_code == 200 and r.content:
                thumbs.append(r.content)
                keep.append(it)
        except Exception:
            continue
    if len(keep) < 2:
        return keep[0] if keep else None
    try:
        sheet = _contact_sheet(thumbs)
        out = vision_chat(
            PICK_PROMPT.replace("__LINE__", str(line)[:250].replace("\n", " ")),
            sheet, api_key,
            system="You are a documentary editor choosing a shot.",
            max_tokens=120)
        m = re.search(r"\{.*\}", out, re.S)
        if not m:
            return None
        n = int(json.loads(m.group(0)).get("pick", 0))
        if 1 <= n <= len(keep):
            return keep[n - 1]
        # 0 — осознанный ответ «в стоке под эту фразу ничего нет», а не сбой.
        # Отличать важно: при сбое разумно взять что дают, а здесь брать
        # что дают — значит сознательно поставить заведомо чужой кадр.
        # Замер: под «сбежали босиком» лучшим из стока оказался «мужчина с
        # мечом в зимнем лесу». Такой план должен уйти на генерацию.
        log("[Стоки] Под эту фразу в стоке ничего нет — план уйдёт на ИИ")
        return NOTHING_FITS
    except Exception as e:
        log(f"[Стоки] Выбор кадра зрением не вышел ({_redact(e)}) — беру как раньше")
        # замерено: без просмотра картинки мимо текста попадают ~половина
        # кадров — сток ранжирует по буквальному совпадению слов
        import quality
        quality.degraded(
            "Стоки", "кадр взят по совпадению слов, а не выбран по картинке "
            "под фразу диктора",
            why=f"проверка зрением не отработала ({e.__class__.__name__})",
            hint="обычно это лимит квоты Gemini — добавь ещё ключ в .env",
            level="заметно")
        return None


def _stock_getters(pexels: KeyRotator, pixabay: KeyRotator, log):
    """GET-функции для Pexels/Pixabay с ротацией ключей при 401/403/429."""
    import requests

    def pexels_get(url, params):
        while pexels.current:
            r = requests.get(url, headers={"Authorization": pexels.current},
                             params=params, timeout=30)
            if r.status_code in (401, 403, 429):
                log(f"[Ключи] Pexels ключ #{pexels.idx + 1} упёрся в лимит "
                    f"({r.status_code}), переключаюсь...")
                if not pexels.rotate():
                    log("[Ключи] Ключи Pexels закончились.")
                    return None
                continue
            return r
        return None

    def pixabay_get(params):
        while pixabay.current:
            # Ключ Pixabay уходит параметром URL (по-другому их API не умеет),
            # а вызывающие пишут текст исключения в журнал — без этой обёртки
            # ключ утекал бы в публичный app.log, как утекли ключи Gemini.
            try:
                r = requests.get("https://pixabay.com/api/",
                                 params={**params, "key": pixabay.current},
                                 timeout=30)
            except Exception as e:
                raise RuntimeError(f"Pixabay: {_redact(e)}") from None
            if r.status_code in (401, 403, 429):
                log(f"[Ключи] Pixabay ключ #{pixabay.idx + 1} упёрся в лимит, "
                    "переключаюсь...")
                if not pixabay.rotate():
                    log("[Ключи] Ключи Pixabay закончились.")
                    return None
                continue
            return r
        return None

    return pexels_get, pixabay_get


def fetch_wiki_images(query: str, count: int, dest_dir: Path, prefix: str,
                      used: dict, log=print) -> list[Path]:
    """Фото реальных людей, мест и событий из Wikimedia Commons (свободные
    лицензии — стоки Pexels/Pixabay таких фото не содержат). Качает до count
    картинок шириной от 800px; автор и лицензия пишутся в лог: для CC-BY
    обязательно укажи атрибуцию в описании видео."""
    import requests
    ua = {"User-Agent": "ContentFactory/2.0 (YouTube pipeline; personal use)"}
    r = requests.get(
        "https://commons.wikimedia.org/w/api.php",
        params={"action": "query", "generator": "search",
                "gsrsearch": f"filetype:bitmap {query}", "gsrnamespace": 6,
                "gsrlimit": 25, "prop": "imageinfo",
                "iiprop": "url|size|extmetadata", "iiurlwidth": 1920,
                "format": "json"},
        headers=ua, timeout=30)
    if r.status_code != 200:
        raise RuntimeError(f"Wikimedia API {r.status_code}: {r.text[:200]}")
    pages = (r.json().get("query") or {}).get("pages") or {}

    def _meta(info: dict, key: str) -> str:
        raw = str(((info.get("extmetadata") or {}).get(key) or {}).get("value", ""))
        return re.sub(r"<[^>]+>", "", raw).strip()

    cands = []
    for p in sorted(pages.values(), key=lambda p: p.get("index", 999)):
        ii = (p.get("imageinfo") or [{}])[0]
        url = ii.get("thumburl") or ii.get("url")
        if not url or (ii.get("width") or 0) < 800:
            continue
        if url.lower().endswith((".svg", ".gif", ".tif", ".tiff", ".pdf")):
            continue
        cands.append({"id": p.get("title") or url, "url": url,
                      "author": _meta(ii, "Artist")[:60],
                      "license": _meta(ii, "LicenseShortName")})
    out = []
    for j, c in enumerate(_pick_unused(cands, "wikimedia", used, count, log), 1):
        suffix = f"_{j}" if count > 1 else ""
        dest = dest_dir / f"{prefix}{suffix}_wiki.jpg"
        with requests.get(c["url"], headers=ua, stream=True, timeout=120) as rr:
            rr.raise_for_status()
            with open(dest, "wb") as f:
                for chunk in rr.iter_content(chunk_size=1 << 16):
                    f.write(chunk)
        out.append(dest)
        log(f"[Wiki] {dest.name}: лицензия {c['license'] or '?'}, "
            f"автор {c['author'] or 'не указан'} — укажи атрибуцию в описании!")
    return out


def openverse_search(query: str, used: dict, log=print) -> str | None:
    """URL одной свежей CC-картинки из Openverse (агрегатор ~800 млн
    свободных изображений: Flickr CC, музеи, Wikimedia). Ключ не нужен.
    None, если ничего нового не нашлось."""
    import requests
    try:
        r = requests.get(
            "https://api.openverse.org/v1/images/",
            params={"q": query, "page_size": SEARCH_POOL,
                    "license_type": "all-cc", "aspect_ratio": "wide",
                    "mature": "false"},
            headers={"User-Agent": "ContentFactory/2.0 (personal use)"},
            timeout=30)
        if r.status_code != 200:
            return None
        items = [{"id": it["id"], "url": it.get("url"),
                  "license": it.get("license", ""), "author": it.get("creator", "")}
                 for it in r.json().get("results", []) if it.get("url")]
        picked = _pick_unused(items, "openverse", used, 1, log)
        if not picked:
            return None
        p = picked[0]
        if p.get("license"):
            log(f"[Openverse] лицензия {p['license'].upper()}, автор "
                f"{p.get('author') or '?'} — укажи атрибуцию в описании")
        return p["url"]
    except Exception as e:
        log(f"[Openverse] недоступен ({e.__class__.__name__})")
        return None


def fetch_media(scenes_text: str, out_dir: Path, log,
                pexels_keys: str = "", pixabay_keys: str = "",
                kenburns: bool = True, gemini_key: str = ""):
    """Скачивает стоки по сценам, пишет manifest.json.
    - На сцену качается count клипов (по умолчанию 1), выбор случайный из
      топ-15 результатов, уже использованные в прошлых видео клипы пропускаются.
    - type: gen — картинка генерируется через Gemini вместо стоков.
    - type: wiki — фото реального человека/места из Wikimedia Commons.
    - kenburns=True: каждая картинка дополнительно превращается в клип
      с движением камеры (кладётся в video/).
    Ключи — многострочные списки (ротация при лимите); если пусто — из окружения."""
    pexels = KeyRotator(pexels_keys or os.getenv("PEXELS_API_KEY", ""))
    pixabay = KeyRotator(pixabay_keys or os.getenv("PIXABAY_API_KEY", ""))
    pexels_get, pixabay_get = _stock_getters(pexels, pixabay, log)
    vdir, idir = out_dir / "video", out_dir / "images"
    vdir.mkdir(parents=True, exist_ok=True)
    idir.mkdir(parents=True, exist_ok=True)
    used = _load_used()

    scenes = parse_scenes(scenes_text)
    log(f"[Видеоматериал] Сцен: {len(scenes)}" +
        (", Ken Burns для картинок включён" if kenburns else ""))
    manifest = []
    for s in scenes:
        if CANCEL.is_set():
            # Скачанные файлы остаются, а manifest.json НЕ перезаписываем:
            # список половины сцен затёр бы прошлый полный манифест, и
            # следующий шаг решил бы, что материала столько и есть.
            log(f"[Видеоматериал] ⛔ Стоп на сцене {s['n']}: скачанное "
                f"осталось в video/ и images/, manifest.json не тронут")
            _save_used(used)
            raise Cancelled("Остановлено пользователем")
        safe = re.sub(r"[^\w\-]+", "_", s["keywords"])[:40]
        files = []
        try:
            if s["type"] == "video":
                r = pexels_get("https://api.pexels.com/videos/search",
                               {"query": s["keywords"], "per_page": SEARCH_POOL,
                                "orientation": "landscape"})
                vids = r.json().get("videos") if r is not None and r.status_code == 200 else None
                for j, v in enumerate(_pick_unused(vids or [], "pexels_video",
                                                   used, s["count"], log), 1):
                    suffix = f"_{j}" if s["count"] > 1 else ""
                    dest = vdir / f"scene_{s['n']:03d}{suffix}_{safe}.mp4"
                    download_file(pick_video_file(v["video_files"])["link"], dest)
                    files.append(dest.name)
            elif s["type"] == "gen":
                for j in range(1, s["count"] + 1):
                    suffix = f"_{j}" if s["count"] > 1 else ""
                    dest = idir / f"scene_{s['n']:03d}{suffix}_{safe}_gen.jpg"
                    gen_image(s["keywords"], dest, gemini_key, log)
                    files.append(dest.name)
                    if kenburns:
                        clip = vdir / f"scene_{s['n']:03d}{suffix}_{safe}_gen_kb.mp4"
                        try:
                            ken_burns(dest, clip)
                            files.append(clip.name)
                        except Exception as e:
                            log(f"[Видеоматериал] Ken Burns не получился "
                                f"({e.__class__.__name__}) — оставил только jpg.")
            elif s["type"] == "genvideo":
                for j in range(1, s["count"] + 1):
                    suffix = f"_{j}" if s["count"] > 1 else ""
                    dest = vdir / f"scene_{s['n']:03d}{suffix}_{safe}_ai.mp4"
                    gen_video(s["keywords"], dest, log, seconds=8)
                    files.append(dest.name)
            elif s["type"] == "wiki":
                for dest in fetch_wiki_images(s["keywords"], s["count"], idir,
                                              f"scene_{s['n']:03d}_{safe}",
                                              used, log):
                    files.append(dest.name)
                    if kenburns:
                        clip = vdir / f"{dest.stem}_kb.mp4"
                        try:
                            ken_burns(dest, clip)
                            files.append(clip.name)
                        except Exception as e:
                            log(f"[Видеоматериал] Ken Burns не получился "
                                f"({e.__class__.__name__}) — оставил только jpg.")
            else:
                r = pexels_get("https://api.pexels.com/v1/search",
                               {"query": s["keywords"], "per_page": SEARCH_POOL,
                                "orientation": "landscape"})
                photos = r.json().get("photos") if r is not None and r.status_code == 200 else None
                picked = [(p["src"]["large2x"], p) for p in
                          _pick_unused(photos or [], "pexels_photo",
                                       used, s["count"], log)]
                if not picked:
                    r = pixabay_get({"q": s["keywords"], "per_page": SEARCH_POOL,
                                     "orientation": "horizontal",
                                     "image_type": "photo"})
                    hits = r.json().get("hits") if r is not None and r.status_code == 200 else None
                    picked = [(h["largeImageURL"], h) for h in
                              _pick_unused(hits or [], "pixabay",
                                           used, s["count"], log)]
                for j, (url, _) in enumerate(picked, 1):
                    suffix = f"_{j}" if s["count"] > 1 else ""
                    dest = idir / f"scene_{s['n']:03d}{suffix}_{safe}.jpg"
                    download_file(url, dest)
                    files.append(dest.name)
                    if kenburns:
                        clip = vdir / f"scene_{s['n']:03d}{suffix}_{safe}_kb.mp4"
                        try:
                            ken_burns(dest, clip)
                            files.append(clip.name)
                        except Exception as e:
                            log(f"[Видеоматериал] Ken Burns не получился "
                                f"({e.__class__.__name__}) — оставил только jpg.")
        except Exception as e:
            log(f"[Видеоматериал] Сцена {s['n']}: ошибка {e}")
        status = f"OK ({len(files)} файл.)" if files else "НЕ НАЙДЕНО"
        if not files:
            # сцена без единого файла — это место в ролике, которое нечем
            # показать; раньше об этом говорила одна строка из тысячи
            import quality
            quality.degraded(
                "Видеоматериал", "сцена осталась без картинки — показать на "
                "этом месте нечего",
                why=f"ни стоки, ни генерация не дали материала "
                    f"(тип «{s['type']}»)",
                hint="переформулируй ключевые слова сцены или проверь ключи "
                     "стоков",
                level="критично")
        log(f"[Видеоматериал] Сцена {s['n']} ({s['type']}"
            f"{' x' + str(s['count']) if s['count'] > 1 else ''}): "
            f"{s['keywords']} -> {status}")
        manifest.append({**s, "files": files})

    _save_used(used)
    (out_dir / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    log(f"[Видеоматериал] Манифест: {out_dir / 'manifest.json'}, "
        f"история клипов: {USED_MEDIA_FILE.name} ({used_media_count()} шт.)")
    return manifest


# ---------- Авто-раскадровка по таймлайну ----------

def srt_to_seconds(t: str) -> float:
    """'00:01:32,500' -> 92.5"""
    h, m, s = t.replace(",", ".").split(":")
    return int(h) * 3600 + int(m) * 60 + float(s)


def extract_keywords(text: str, n: int = 3) -> str:
    """Ключевые слова для поиска стока: частые не-стоп-слова из текста плана."""
    words = re.findall(r"[a-zA-Z][a-zA-Z'-]{2,}", text.lower())
    freq, order = {}, []
    for w in words:
        if w in STOPWORDS:
            continue
        if w not in freq:
            order.append(w)
        freq[w] = freq.get(w, 0) + 1
    top = sorted(order, key=lambda w: -freq[w])[:n]
    return " ".join(sorted(top, key=order.index))


RANDOM_VOICES = ["en-US-GuyNeural", "en-US-ChristopherNeural",
                 "en-US-EricNeural", "en-US-AndrewNeural", "en-US-BrianNeural",
                 "en-US-JennyNeural", "en-US-AriaNeural", "en-US-MichelleNeural"]


def project_style(project_dir) -> dict:
    """«Почерк» проекта — детерминированно от его пути: разные проекты дают
    разные голос/темп/субтитры/цветокор/интенсивность. Против шаблонности
    (YouTube «inauthentic content»): ролики канала не похожи друг на друга,
    но один проект всегда рендерится одинаково (стабильность)."""
    import zlib
    r = random.Random(zlib.crc32(str(Path(project_dir).resolve()).encode()))
    return {
        "voice": r.choice(RANDOM_VOICES),
        "rate": r.choice([-8, -5, -3, 0, 0, 3, 5]),
        # Субтитры больше НЕ рандомные — жёлтый/голубой/красный "viral"-вид
        # слишком жирный и кричащий (жалоба: "слишком жирный, внешнее
        # свечение жирное"). Один стабильный стиль на все проекты — караоке
        # (подсветка слова в такт голосу), потолще яркого попа не давит.
        "sub_style": "karaoke",
        "sub_size": "средние",
        "intensity": r.choice(["документальная 5с", "документальная 5с",
                               "сильная", "средняя"]),
        "look": "случайный",
        # 1-2 случайных эффекта поверх кадра — добавляют «плёночности»
        "bloom": r.random() < 0.5,
        "light_leak": r.random() < 0.4,
        "dust": r.random() < 0.35,
        "flicker": r.random() < 0.25,
    }


def auto_scenes(script_text: str) -> str:
    """Локальная разметка сцен без API: абзац -> ключевые слова -> строка
    scenes.txt. Чередование: два video, потом image."""
    paras = [p for p in re.split(r"\n\s*\n", script_text.strip()) if p.strip()]
    lines = []
    for i, p in enumerate(paras):
        kw = extract_keywords(p, 3) or "cinematic background"
        mtype = "image" if i % 3 == 2 else "video"
        lines.append(f"{kw} | type: {mtype}")
    return "\n".join(lines)


def _script_sentences(script_text: str) -> list[str]:
    """Сценарий -> список предложений. Нужен потому, что Whisper отдаёт
    расшифровку БЕЗ пунктуации вообще: замерено на реальном ролике — в
    сценарии 550 точек на 8092 слова, в субтитрах 0 точек на 8068 слов.
    Границы предложений у нас есть, мы их просто теряли."""
    clean = strip_cues(script_text)[0] if script_text else ""
    clean = re.sub(r"\s+", " ", clean).strip()
    if not clean:
        return []
    parts = re.split(r"(?<=[.!?])\s+", clean)
    return [p.strip() for p in parts if p.strip()]


def _whole_sentences(sents: list[str], s_sent: list[int],
                     a: int, b: int) -> str:
    """Целые предложения, покрывающие слова сценария [a..b].

    Соседние планы из-за этого делят пограничное предложение — и это
    правильно: смысл нужен обоим целиком. Обрывок «why leave your» без
    продолжения «food supplies untouched?» не даёт подобрать кадр ни
    одному из них."""
    if not sents or a < 0 or b < a or b >= len(s_sent):
        return ""
    return " ".join(sents[s_sent[a]:s_sent[b] + 1]).strip()


def build_beats(rows: list[tuple[str, str, str]], min_beat: float = 6.0,
                total: float | None = None,
                script_text: str = "") -> list[dict]:
    """Группирует srt-сегменты в визуальные планы длиной >= min_beat секунд.
    Планы идут встык: конец плана = начало следующего, без дыр.

    script_text — исходный сценарий. Если он есть, текст плана берётся ИЗ
    НЕГО (с пунктуацией), а план тянется до конца предложения. Иначе плану
    достаётся кусок расшифровки Whisper, оборванный посреди фразы: замерено,
    что так 99% планов не кончаются точкой и 92% не начинаются с заглавной,
    а фраза «why leave your food supplies untouched?» разрезана надвое между
    соседними планами. Генератор запроса видел «why leave your» — ни
    подлежащего, ни отрицания."""
    sents = _script_sentences(script_text)
    # слова сценария и номер предложения для каждого
    s_words, s_sent = [], []
    for si, s in enumerate(sents):
        for w in s.split():
            s_words.append(w)
            s_sent.append(si)
    w_words = [w for _, _, t in rows for w in t.split()]
    # Соответствие пропорцией, а не индекс-в-индекс: расшифровка и сценарий
    # расходятся в словах (8068 против 8092), и накопленный сдвиг к концу
    # ролика увёл бы текст на пару фраз. Пропорция держит оба конца.
    ratio = (len(s_words) / len(w_words)) if (s_words and w_words) else 0.0

    def s_at(wi: int) -> int:
        return min(len(s_words) - 1, int(round(wi * ratio))) if ratio else -1

    beats, cur = [], None
    seen_words = 0          # слов расшифровки пройдено до текущей строки
    for start_s, end_s, text in rows:
        start, end = srt_to_seconds(start_s), srt_to_seconds(end_s)
        n_here = len(text.split())
        if cur is None:
            cur = {"start": start, "end": end, "text": text,
                   "_w0": seen_words}
        else:
            cur["end"] = end
            cur["text"] += " " + text
        seen_words += n_here
        # Режем ПО ВРЕМЕНИ, как и раньше: ритм монтажа задаёт длина плана.
        # Тянуть план до конца предложения нельзя — на реальном ролике это
        # разогнало среднюю длину с 9.5 до 16.8 с, а семнадцать секунд на
        # одном кадре хуже любого обрывка текста. Пунктуацию возвращаем
        # иначе: тексту плана отдаём ЦЕЛЫЕ предложения, попавшие в него.
        if cur["end"] - cur["start"] >= min_beat:
            if ratio:
                cur["text"] = _whole_sentences(
                    sents, s_sent, s_at(cur["_w0"]), s_at(seen_words - 1))
            cur.pop("_w0", None)
            beats.append(cur)
            cur = None
    if cur is not None:
        if ratio:
            cur["text"] = _whole_sentences(
                sents, s_sent, s_at(cur.get("_w0", 0)), len(s_words) - 1)
        cur.pop("_w0", None)
        # короткий хвост приклеиваем к последнему плану
        if beats and cur["end"] - cur["start"] < min_beat / 2:
            beats[-1]["end"] = cur["end"]
            beats[-1]["text"] += " " + cur["text"]
        else:
            beats.append(cur)
    if beats:
        beats[0]["start"] = 0.0
        for i in range(len(beats) - 1):
            beats[i]["end"] = beats[i + 1]["start"]
        if total and total > beats[-1]["end"]:
            beats[-1]["end"] = total
    return beats


def _premiere_pathurl(p: Path) -> str:
    """pathurl для Premiere Pro на Windows. Именно 'file://localhost/C:/…' —
    формат 'file:///C:/…' (как даёт Path.as_uri) Premiere читает неверно и
    показывает клипы как 'Media offline'. Пробелы/юникод -> %-кодирование."""
    from urllib.parse import quote
    s = str(Path(p).resolve()).replace("\\", "/")
    return "file://localhost/" + quote(s, safe="/:")


def export_premiere_xml(timeline: list[dict], audio_path: Path, dest: Path,
                        fps: int = 25, name: str = "AutoStoryboard"):
    """Секвенция в формате FCP7 XML (xmeml) — Premiere Pro: File > Import.
    timeline: [{start, end, file, src_duration}, ...] в секундах."""
    def fr(sec):
        return int(round(sec * fps))

    adur = audio_duration(audio_path) or (timeline[-1]["end"] if timeline else 0)
    total = max(fr(adur), fr(timeline[-1]["end"]) if timeline else 0)
    vclips = []
    for i, t in enumerate(timeline, 1):
        start = fr(t["start"])
        length = max(fr(t["end"]) - start, 1)
        src_frames = max(fr(t.get("src_duration") or (t["end"] - t["start"])), 1)
        out_f = min(length, src_frames)
        f = Path(t["file"]).resolve()
        fname = escape(f.name)
        vclips.append(f"""
          <clipitem id="clip-{i}">
            <name>{fname}</name>
            <enabled>TRUE</enabled>
            <duration>{src_frames}</duration>
            <rate><timebase>{fps}</timebase><ntsc>FALSE</ntsc></rate>
            <start>{start}</start>
            <end>{start + out_f}</end>
            <in>0</in>
            <out>{out_f}</out>
            <file id="file-{i}">
              <name>{fname}</name>
              <pathurl>{escape(_premiere_pathurl(f))}</pathurl>
              <rate><timebase>{fps}</timebase><ntsc>FALSE</ntsc></rate>
              <duration>{src_frames}</duration>
              <media>
                <video>
                  <samplecharacteristics>
                    <rate><timebase>{fps}</timebase><ntsc>FALSE</ntsc></rate>
                    <width>1920</width>
                    <height>1080</height>
                  </samplecharacteristics>
                </video>
              </media>
            </file>
          </clipitem>""")

    a = Path(audio_path).resolve()
    aname = escape(a.name)
    a_frames = max(fr(adur), 1)
    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE xmeml>
<xmeml version="4">
  <sequence id="sequence-1">
    <name>{escape(name)}</name>
    <duration>{total}</duration>
    <rate><timebase>{fps}</timebase><ntsc>FALSE</ntsc></rate>
    <media>
      <video>
        <format>
          <samplecharacteristics>
            <rate><timebase>{fps}</timebase><ntsc>FALSE</ntsc></rate>
            <width>1920</width>
            <height>1080</height>
            <pixelaspectratio>square</pixelaspectratio>
          </samplecharacteristics>
        </format>
        <track>{''.join(vclips)}
        </track>
      </video>
      <audio>
        <format>
          <samplecharacteristics>
            <depth>16</depth>
            <samplerate>48000</samplerate>
          </samplecharacteristics>
        </format>
        <track>
          <clipitem id="clip-audio">
            <name>{aname}</name>
            <enabled>TRUE</enabled>
            <duration>{a_frames}</duration>
            <rate><timebase>{fps}</timebase><ntsc>FALSE</ntsc></rate>
            <start>0</start>
            <end>{a_frames}</end>
            <in>0</in>
            <out>{a_frames}</out>
            <file id="file-audio">
              <name>{aname}</name>
              <pathurl>{escape(_premiere_pathurl(a))}</pathurl>
              <rate><timebase>{fps}</timebase><ntsc>FALSE</ntsc></rate>
              <duration>{a_frames}</duration>
              <media>
                <audio>
                  <samplecharacteristics>
                    <depth>16</depth>
                    <samplerate>48000</samplerate>
                  </samplecharacteristics>
                  <channelcount>2</channelcount>
                </audio>
              </media>
            </file>
          </clipitem>
        </track>
      </audio>
    </media>
  </sequence>
</xmeml>
"""
    dest.write_text(xml, encoding="utf-8")
    return dest


def _prefetch_ai_beats(beats: list[dict], queries: list[str] | None,
                       plan_kinds: list[str], sdir: Path, gemini_key: str,
                       visual_style: str, log, target_indices=None,
                       workers: int = 4):
    """Параллельно (по умолчанию 4 задачи одновременно — под лимит
    большинства тарифов Veo/Agnes) генерирует кадры заранее, до основного
    цикла auto_storyboard. Раньше раскадровка шла строго по одной задаче —
    для ролика из ~20 планов это давало ~20x1-3 мин последовательно.
    target_indices — set 1-based индексов планов для префетча (None = все,
    т.е. полный visual_mode="ai"; конкретный набор — для mixed, где только
    часть планов идёт через ИИ). Имена файлов вычисляются 1-в-1 как в
    основном цикле — он их просто находит на диске и пропускает повторную
    генерацию; план, который префетч не осилил, основной цикл досоздаст сам."""
    from concurrent.futures import ThreadPoolExecutor
    jobs = []
    prev_query = "cinematic background"
    for i, b in enumerate(beats, 1):
        query = ((queries[i - 1] if queries else "")
                 or extract_keywords(b["text"]) or prev_query)
        prev_query = query
        if target_indices is not None and (i - 1) not in target_indices:
            continue
        safe = re.sub(r"[^\w\-]+", "_", query)[:40]
        want_photo = plan_kinds[i - 1] == "photo"
        if want_photo:
            jobs.append((i, "photo", query, sdir / f"beat_{i:03d}_{safe}_ai.jpg"))
        else:
            jobs.append((i, "video", query, sdir / f"beat_{i:03d}_{safe}_ai.mp4"))
    if not jobs:
        return

    veo_key = os.getenv("VEO_API_KEY", "").strip()
    # Разрешает снизить параллельность вручную, но не превысить лимит Veo.
    try:
        configured_workers = int(os.getenv("VEO_WORKERS", str(workers)))
    except ValueError:
        configured_workers = workers
    workers = max(1, configured_workers)

    def run_job(job):
        i, kind, query, dest = job
        # ThreadPoolExecutor.map ставит В ОЧЕРЕДЬ сразу все задачи, и закрытие
        # пула честно дожидается каждой поставленной. Поэтому «Стоп» проверяем
        # первым делом: не начатые кадры просто не начинаются (и не оплачиваются),
        # иначе выход из раскадровки ждал бы всю очередь Veo целиком.
        if CANCEL.is_set():
            return (i, False, None)
        try:
            if kind == "photo":
                gen_image(query, dest, gemini_key, log, visual_style)
                if veo_key and _env_switch("VEO_ANIMATE_PHOTOS", True):
                    clip = dest.with_name(dest.stem + "_kb.mp4")   # параллельно с остальными —
                    try:                                            # иначе это ~1-3 мин НА КАЖДЫЙ
                        gen_video_from_image(dest, query, clip, veo_key, log,
                                             visual_style)
                    except Exception:
                        pass   # не страшно — основной цикл сделает Ken Burns
            else:
                gen_video(_image_prompt(query, visual_style), dest, log)
            return (i, True, None)
        except Cancelled:
            return (i, False, None)   # прерванный кадр — не «неудача», не шумим
        except Exception as e:
            return (i, False, e)

    if veo_key:
        try:
            import veo_client
            usage = veo_client.account_usage(api_key=veo_key)
            # Лимит берём из /account/info (контрактный лимит тарифа), а НЕ из
            # /account/usage: когда аккаунт простаивает, usage отдаёт
            # max_concurrent_tasks=0, и расчёт давал 1 поток вместо 4 — то
            # есть душил параллельность ровно тогда, когда свободны все слоты.
            # Занятость (active_tasks) берём из usage — там она достоверна.
            limit = 0
            try:
                limit = int(veo_client.account_info(
                    api_key=veo_key).get("concurrent_tasks", 0))
            except Exception:
                pass
            if limit <= 0:      # info недоступен — падаем обратно на usage
                limit = int(usage.get("max_concurrent_tasks", 0))
            limit = max(1, limit or workers)
            active = max(0, int(usage.get("active_tasks", 0)))
            free = max(0, limit - active)
            # В run_job фото и image-to-video идут последовательно: сначала
            # Banana возвращает файл, только потом он передаётся в Veo.
            # Значит, один воркер занимает максимум один слот, а не два.
            # Старый расчёт делил лимит 4 на 2 и запускал лишь два видео.
            # При занятых внешним запуском слотах оставляем один поток:
            # контролируемые повторы лучше, чем шторм RATE_LIMIT.
            workers = min(workers, free) if free else 1
            log(f"[Раскадровка] VeoNonStop: план допускает {limit} задач "
                f"одновременно, занято {active}, свободно {free}; "
                f"запускаю {workers} поток(а/ов)")
        except Exception:
            pass   # нет ключа/недоступен — остаёмся на переданном workers
    log(f"[Раскадровка] Параллельная генерация: {len(jobs)} кадров, "
        f"до {workers} одновременно...")
    ok = 0
    with ThreadPoolExecutor(max_workers=workers) as ex:
        for completed, (i, success, err) in enumerate(ex.map(run_job, jobs), 1):
            if CANCEL.is_set():
                break            # остаток очереди отработает пустышками
            if success:
                ok += 1
            elif err is not None:
                log(f"[Раскадровка] План {i}: параллельно не вышло "
                    f"({err}) - досоздастся в обычном проходе")
            log(f"[Очередь Veo] Готово {completed}/{len(jobs)}; "
                f"успешно {ok}, в работе до {workers}")
    # Уже вне `with`: пул закрыт, ни одного живого потока с оплаченной задачей
    # не осталось. Готовые кадры лежат на диске под теми же именами, что ждёт
    # основной цикл, — следующий запуск их подхватит, а не сгенерирует заново.
    if CANCEL.is_set():
        log(f"[Раскадровка] ⛔ Стоп во время параллельной генерации: "
            f"успело {ok}/{len(jobs)} кадров, они сохранены в storyboard/")
    _stop_check()
    log(f"[Раскадровка] Параллельно готово: {ok}/{len(jobs)}")


def auto_storyboard(out_dir: Path, log, pexels_keys: str = "",
                    pixabay_keys: str = "", min_beat: float = 6.0,
                    gemini_key: str = "", agnes_key: str = "",
                    genvideo: bool = False, max_unique: int = 200,
                    visual_mode: str = "stock", visual_style: str = "",
                    ai_ratio: float = 0.85, queries: list[str] | None = None):
    """Подбирает материал по таймлайну озвучки: субтитры -> планы по min_beat
    секунд -> ключевые слова из текста каждого плана -> сток под план
    (видео нужной длины; если нет — фото + Ken Burns ровно на длину плана;
    если и фото нет, а ключ Gemini задан — картинка генерируется).

    visual_mode:
      "stock"  — только стоки; ИИ-картинка лишь как аварийный fallback,
                 если сток совсем ничего не нашёл (редко — почти всегда
                 что-то находится, поэтому ИИ-кадров в ролике мало).
      "mixed"  — намеренно ai_ratio (по умолчанию 85%) планов генерируются
                 ИИ, ровными интервалами по всему ролику, а не только когда
                 сток провалился — так видео не выглядит «сплошным стоком».
                 Высокая доля специально: сток подбирается по ключевым
                 словам и часто не совпадает с тем, о чём говорится именно
                 в этот момент — ИИ-кадр генерируется под конкретный текст
                 плана, поэтому реже расходится с закадровым текстом.
      "ai"     — каждый кадр генерируется ИИ в едином визуальном стиле.

    queries — готовый список умных запросов (по одному на план, см.
    smart_queries()); если передан, внутренний вызов smart_queries()
    пропускается (полезно, если нужно посчитать запросы одним провайдером,
    а генерацию кадров — другим, например Gemini для текста + VeoNonStop
    для картинок/видео).

    Результат: storyboard/ с клипами, timeline.json и sequence.xml
    (Premiere Pro: File > Import). Требует voiceover.mp3 и voiceover.srt."""
    srt = out_dir / "subs" / "voiceover.srt"
    voice = out_dir / "audio" / "voiceover_music.mp3"
    if not voice.exists():
        voice = out_dir / "audio" / "voiceover.mp3"
    if not srt.exists():
        raise FileNotFoundError("Нет субтитров — сначала прогони Whisper (они "
                                "дают таймкоды для привязки материала).")
    if not voice.exists():
        raise FileNotFoundError("Нет озвучки voiceover.mp3.")

    rows = parse_srt(srt)
    total = audio_duration(voice)
    # сценарий даёт пунктуацию, которой в расшифровке Whisper нет вообще
    try:
        script_text = (out_dir / "script.txt").read_text(encoding="utf-8")
    except OSError:
        script_text = ""
        # без сценария плану достаётся кусок расшифровки, оборванный посреди
        # фразы («why leave your» без «food supplies untouched?») — по такому
        # обрывку кадр подбирается наугад
        import quality
        quality.degraded(
            "Раскадровка", "кадры подбираются по обрывкам расшифровки — без "
            "текста сценария у планов нет целых фраз",
            why="script.txt не прочитан",
            hint="положи текст сценария в script.txt проекта и пересобери "
                 "раскадровку",
            level="заметно")
    except UnicodeDecodeError:
        # Сценарий часто правят руками, и «Блокнот → сохранить как ANSI» даёт
        # cp1251. UnicodeDecodeError — это ValueError, мимо except OSError, и
        # раскадровка падала целиком вместо того, чтобы просто остаться без
        # пунктуации (ради неё сценарий тут и читается — см. build_beats).
        script_text = (out_dir / "script.txt").read_text(encoding="cp1251",
                                                         errors="replace")
        log("[Раскадровка] script.txt не в UTF-8 — прочитал как cp1251")
    beats = build_beats(rows, min_beat, total, script_text)
    log(f"[Раскадровка] {len(rows)} фраз -> {len(beats)} планов по ~{min_beat:.0f} с, "
        f"звук: {voice.name}")
    if not beats:
        # Пустые субтитры -> ноль планов -> пустой timeline.json, который
        # затёр бы прошлый рабочий, и рендер молча собрал бы ролик из ничего.
        # Падаем ЗДЕСЬ, в настоящем месте сбоя, а не через стадию.
        raise RuntimeError(
            f"В субтитрах ({srt.name}) нет ни одной фразы — раскладывать "
            "материал не по чему. Обычно это значит, что Whisper не распознал "
            "речь: проверь, что в voiceover.mp3 действительно есть озвучка, и "
            "прогони транскрибацию заново. timeline.json оставлен прежним.")

    sdir = out_dir / "storyboard"
    sdir.mkdir(parents=True, exist_ok=True)
    # После перезапуска Veo-клиент по этому журналу продолжит уже отправленные
    # задачи, а не создаст для той же сцены новую платную генерацию.
    try:
        import veo_client
        veo_client.configure_task_store(out_dir)
    except Exception:
        pass
    pexels = KeyRotator(pexels_keys or os.getenv("PEXELS_API_KEY", ""))
    pixabay = KeyRotator(pixabay_keys or os.getenv("PIXABAY_API_KEY", ""))
    pexels_get, pixabay_get = _stock_getters(pexels, pixabay, log)
    used = _load_used()

    if queries is None and (agnes_key or os.getenv("AGNES_API_KEY", "")
            or os.getenv("GEMINI_API_KEY", "")):
        log("[Раскадровка] Составляю умные запросы по смыслу текста (LLM)...")
        queries = smart_queries(beats, agnes_key, log)

    def fetch_video(query, need, dest, line=""):
        r = pexels_get("https://api.pexels.com/videos/search",
                       {"query": query, "per_page": SEARCH_POOL,
                        "orientation": "landscape"})
        vids = r.json().get("videos") if r is not None and r.status_code == 200 else None
        if not vids:
            return None
        long_enough = [v for v in vids if (v.get("duration") or 0) >= need]
        pool = long_enough or vids
        # Сначала пробуем ВЫБРАТЬ по картинке под фразу диктора, и только
        # если это не вышло — как раньше, случайным из совпавших по словам.
        v = None
        if line and (gemini_key or os.getenv("GEMINI_API_KEY", "")):
            seen = set(map(str, used.get("pexels_video", [])))
            fresh = [x for x in pool if str(x["id"]) not in seen] or pool
            v = _vision_pick(fresh, lambda x: x.get("image"), line,
                             gemini_key, log)
            if v is NOTHING_FITS:
                return None      # пусть вызывающий сгенерирует кадр
            if v is not None:
                used.setdefault("pexels_video", []).append(str(v["id"]))
        if v is None:
            picked = _pick_unused(pool, "pexels_video", used, 1, log)
            if not picked:
                return None
            v = picked[0]
        download_file(pick_video_file(v["video_files"])["link"], dest)
        return v.get("duration") or audio_duration(dest) or need

    def fetch_photo(query, need, dest, line=""):
        # источники по очереди: Pexels -> Pixabay -> Openverse -> Wikimedia
        url = None
        r = pexels_get("https://api.pexels.com/v1/search",
                       {"query": query, "per_page": SEARCH_POOL,
                        "orientation": "landscape"})
        photos = r.json().get("photos") if r is not None and r.status_code == 200 else None
        # то же, что у видео: сначала выбрать по картинке под фразу
        if photos and line and (gemini_key or os.getenv("GEMINI_API_KEY", "")):
            seen = set(map(str, used.get("pexels_photo", [])))
            fresh = [x for x in photos if str(x["id"]) not in seen] or photos
            got = _vision_pick(fresh, lambda x: (x.get("src") or {}).get("medium"),
                               line, gemini_key, log)
            if got is NOTHING_FITS:
                return None      # пусть вызывающий сгенерирует кадр
            if got is not None:
                used.setdefault("pexels_photo", []).append(str(got["id"]))
                url = got["src"]["original"]
        if url is None:
            picked = _pick_unused(photos or [], "pexels_photo", used, 1, log)
            if picked:
                url = picked[0]["src"]["original"]
        if url is None:
            r = pixabay_get({"q": query, "per_page": SEARCH_POOL,
                             "orientation": "horizontal", "image_type": "photo"})
            hits = r.json().get("hits") if r is not None and r.status_code == 200 else None
            picked = _pick_unused(hits or [], "pixabay", used, 1, log)
            if picked:
                url = picked[0]["largeImageURL"]
        if url is None:
            url = openverse_search(query, used, log)
        if url is None:                         # реальные люди/места
            try:
                wiki = fetch_wiki_images(query, 1, sdir, dest.stem, used, log)
                if wiki:
                    ken_burns(wiki[0], dest, duration=need)
                    return need
            except Exception:
                pass
            return None
        jpg = dest.with_suffix(".jpg")
        download_file(url, jpg)
        ken_burns(jpg, dest, duration=need)   # фото оживает зумом/панорамой
        return need

    # Чередуем видео и фото: раньше фото попадали только когда видео не
    # нашлось — ролик выходил «чисто из видео». Первые два плана — живое
    # видео (хук), дальше через один фото с Ken Burns (документальный вид).
    if _env_switch("VEO_FAST_MODE", False):
        try:
            video_ratio = float(os.getenv("VEO_VIDEO_RATIO", "0.25"))
        except ValueError:
            video_ratio = 0.25
        video_ratio = min(1.0, max(0.0, video_ratio))
        video_count = min(len(beats), max(1, round(len(beats) * video_ratio)))
        step = len(beats) / video_count
        video_indices = {min(int(n * step), len(beats) - 1)
                         for n in range(video_count)}
        plan_kinds = ["video" if i in video_indices else "photo"
                      for i in range(len(beats))]
        log(f"[Раскадровка] Быстрый Veo-режим: {video_count}/{len(beats)} "
            f"ключевых сцен — Veo-видео, остальные — фото с Ken Burns")
    else:
        plan_kinds = ["video" if i < 2 or i % 2 == 0 else "photo"
                      for i in range(len(beats))]

    # mixed: заранее фиксируем, какие планы будут ИИ-кадрами — РАВНОМЕРНО
    # по всему ролику (не случайным разбросом, чтобы не было ни скоплений,
    # ни пустых участков), первые два плана не трогаем (живой хук).
    ai_indices = set()
    if visual_mode == "mixed" and ai_ratio > 0:
        eligible = list(range(2, len(beats)))
        n_ai = round(len(eligible) * ai_ratio)
        if n_ai and eligible:
            step = len(eligible) / n_ai
            ai_indices = {eligible[min(int(j * step), len(eligible) - 1)]
                         for j in range(n_ai)}
        log(f"[Раскадровка] Режим MIXED: {len(ai_indices)}/{len(beats)} "
            f"планов ({ai_ratio:.0%}) будут ИИ-кадрами, равномерно по ролику")

    # Пул скачанных клипов для переиспользования: часовое видео = сотни
    # планов, а у стоков лимиты. Качаем до max_unique уникальных клипов,
    # дальше переиспользуем уже скачанные — рендер даёт им РАЗНОЕ движение
    # камеры (зум/панорама), так что визуально это разные кадры.
    # Требование: один клип не чаще MAX_REUSE раз за ролик. Чтобы этого
    # хватило на длинное видео, качаем не меньше планов/MAX_REUSE уникальных.
    MAX_REUSE = 2
    max_unique = max(max_unique, (len(beats) + MAX_REUSE - 1) // MAX_REUSE)
    pool, use_count, downloaded, reused = [], {}, 0, 0

    def reuse_from_pool():
        """Клип из пула, показанный меньше всего раз (в идеале <MAX_REUSE)."""
        if not pool:
            return None
        fresh = [c for c in pool if use_count.get(c, 0) < MAX_REUSE]
        c = min(fresh or pool, key=lambda c: use_count.get(c, 0))
        use_count[c] = use_count.get(c, 0) + 1
        return c

    _has_ai_key = bool(os.getenv("VEO_API_KEY", "").strip() or _agnes_keys()
                      or gemini_key or os.getenv("GEMINI_API_KEY", ""))
    if _has_ai_key and visual_mode == "ai":
        _prefetch_ai_beats(beats, queries, plan_kinds, sdir, gemini_key,
                           visual_style, log)
    elif _has_ai_key and visual_mode == "mixed" and ai_indices:
        # то же самое, но только для beat'ов, которым mixed-режим и так
        # назначил ИИ (ai_indices) — остальные всё равно идут через сток
        _prefetch_ai_beats(beats, queries, plan_kinds, sdir, gemini_key,
                           visual_style, log, target_indices=ai_indices)

    timeline, prev_query = [], "cinematic background"
    for i, b in enumerate(beats, 1):
        if CANCEL.is_set():
            # Обрыв РОВНО на границе плана: клипы, уже сложенные в storyboard/,
            # остаются на месте и подхватятся следующим запуском по именам, а
            # timeline.json и sequence.xml НЕ перезаписываем. Частичный таймлайн
            # был бы худшим исходом: он затёр бы прошлый полный, и рендер молча
            # собрал бы обрубок вместо ролика.
            log(f"[Раскадровка] ⛔ Стоп на плане {i} из {len(beats)}: "
                f"{len(timeline)} готовых клипов остались в storyboard/, "
                "timeline.json не перезаписан (иначе рендер собрал бы обрубок)")
            _save_used(used)   # историю использованных клипов сохраняем: она
                               # только пополняется и защищает от повторов
            raise Cancelled("Остановлено пользователем")
        need = b["end"] - b["start"]
        query = ((queries[i - 1] if queries else "")
                 or extract_keywords(b["text"]) or prev_query)
        prev_query = query
        safe = re.sub(r"[^\w\-]+", "_", query)[:40]
        mm, ss = divmod(int(b["start"]), 60)
        clip, src_dur = None, None
        want_photo = plan_kinds[i - 1] == "photo"

        # лимит уникальных достигнут — берём наименее показанный из пула
        if downloaded >= max_unique and pool:
            clip = reuse_from_pool()
            src_dur = audio_duration(clip) or need
            reused += 1
        elif ((visual_mode == "ai" or (i - 1) in ai_indices)
              and (agnes_key or os.getenv("AGNES_API_KEY", "")
                   or gemini_key or os.getenv("GEMINI_API_KEY", "")
                   or os.getenv("VEO_API_KEY", ""))):
            # ЕДИНЫЙ СТИЛЬ (ai) или намеренная ИИ-вставка (mixed по плану
            # ai_indices) — кадр генерируется без попытки искать сток, это и
            # отличает «фильм» от разношёрстной нарезки стоков. want_photo
            # (тот же plan_kinds, что и в стоковой ветке) решает видео это
            # или фото — иначе ИИ-видео (Agnes/Veo) никогда бы не звучало.
            try:
                if want_photo:
                    jpg = sdir / f"beat_{i:03d}_{safe}_ai.jpg"
                    if not jpg.exists():   # уже мог подготовить префетч
                        gen_image(query, jpg, gemini_key, log, visual_style)
                    clip = sdir / f"beat_{i:03d}_{safe}_ai_kb.mp4"
                    animated = clip.exists()   # уже мог подготовить префетч
                    if (not animated and os.getenv("VEO_API_KEY", "").strip()
                            and _env_switch("VEO_ANIMATE_PHOTOS", True)):
                        try:
                            gen_video_from_image(jpg, query, clip, log=log,
                                                 style=visual_style)
                            animated = True
                        except Exception as e:
                            log(f"[Раскадровка] План {i}: image-to-video не "
                                f"вышел ({_redact(e)}) — Ken Burns")
                            import quality
                            quality.degraded(
                                "Раскадровка", "кадр не ожил: вместо движения "
                                "в сцене — простой зум по неподвижной картинке",
                                why=f"image-to-video не отработал "
                                    f"({e.__class__.__name__})",
                                hint="проверь остаток квоты VeoNonStop",
                                level="заметно")
                    if animated:
                        src_dur = audio_duration(clip) or need
                    else:
                        ken_burns(jpg, clip, duration=need)
                        src_dur = need
                else:
                    clip = sdir / f"beat_{i:03d}_{safe}_ai.mp4"
                    if not clip.exists():   # уже мог подготовить префетч
                        gen_video(_image_prompt(query, visual_style), clip, log,
                                 seconds=need)
                    src_dur = audio_duration(clip) or need
                pool.append(clip)
                use_count[clip] = 1
                downloaded += 1
            except Exception as e:
                log(f"[Раскадровка] План {i}: генерация не удалась ({_redact(e)}) — "
                    "беру сток")
                # план был НАМЕРЕННО отдан ИИ (единый стиль ролика), а
                # получит либо сток, либо повтор уже показанного кадра
                import quality
                quality.degraded(
                    "Раскадровка", "кадр, который должен был быть "
                    "сгенерирован под текст, заменён повтором уже показанного "
                    "клипа или стоком",
                    why=f"генерация не удалась: {str(e)[:120]}",
                    hint="проверь ключ VEO_API_KEY и остаток квоты",
                    level="критично")
                clip = None
                if pool:
                    clip = reuse_from_pool()
                    src_dur = audio_duration(clip) or need
                    reused += 1
        else:
            try:
                # фраза диктора идёт в загрузку: по ней кадр ВЫБИРАЕТСЯ из
                # найденных, а не берётся случайный из совпавших по словам
                line = str(b.get("text", ""))
                if want_photo:
                    clip = sdir / f"beat_{i:03d}_{safe}_kb.mp4"
                    src_dur = fetch_photo(query, need, clip, line)
                    if src_dur is None:                   # фото нет — берём видео
                        clip = sdir / f"beat_{i:03d}_{safe}.mp4"
                        src_dur = fetch_video(query, need, clip, line)
                else:
                    clip = sdir / f"beat_{i:03d}_{safe}.mp4"
                    src_dur = fetch_video(query, need, clip, line)
                    if src_dur is None:                   # видео нет — берём фото
                        clip = sdir / f"beat_{i:03d}_{safe}_kb.mp4"
                        src_dur = fetch_photo(query, need, clip, line)
                if src_dur is None:
                    clip = None
                else:
                    pool.append(clip)
                    use_count[clip] = 1
                    downloaded += 1
            except Exception as e:
                log(f"[Раскадровка] План {i}: ошибка {e}")
                clip = None
            # стоки не дали (лимит/не нашлось), но пул есть — переиспользуем
            if clip is None and pool:
                clip = reuse_from_pool()
                src_dur = audio_duration(clip) or need
                reused += 1
                import quality
                quality.degraded(
                    "Раскадровка", "под этот момент ничего не нашлось — на "
                    "экране повтор уже показанного кадра",
                    why="стоки не дали материала по запросу (лимит ключей "
                        "или в библиотеке нет подходящего)",
                    hint="добавь ещё ключ Pexels/Pixabay или включи "
                         "генерацию кадров ИИ",
                    level="заметно")
        if clip is None and genvideo:
            # сток не нашёлся — генерируем настоящий видеоклип под длину плана
            try:
                clip = sdir / f"beat_{i:03d}_{safe}_ai.mp4"
                gen_video(query, clip, log, seconds=min(need, 18))
                src_dur = audio_duration(clip) or need
                log(f"[Раскадровка] План {i}: видео сгенерировано ИИ")
            except Exception as e:
                log(f"[Раскадровка] План {i}: видео-ИИ не удалось ({_redact(e)})")
                clip = None
        if clip is None and (gemini_key or os.getenv("GEMINI_API_KEY", "")
                             or os.getenv("AGNES_API_KEY", "")):
            # запасной путь: картинка ИИ + Ken Burns на длину плана
            try:
                jpg = sdir / f"beat_{i:03d}_{safe}_gen.jpg"
                gen_image(query, jpg, gemini_key, log)
                clip = sdir / f"beat_{i:03d}_{safe}_gen_kb.mp4"
                ken_burns(jpg, clip, duration=need)
                src_dur = need
                log(f"[Раскадровка] План {i}: картинка сгенерирована ИИ")
            except Exception as e:
                log(f"[Раскадровка] План {i}: генерация не удалась ({_redact(e)})")
                clip = None
        if clip is None:
            # ни сток, ни генерация, ни повтор — в этом месте ролика
            # действительно нечего показать
            import quality
            quality.degraded(
                "Раскадровка", "в ролике осталась дырка — для этого куска "
                "текста картинки нет вовсе",
                why="не отработали ни стоки, ни генерация кадра",
                hint="проверь ключи стоков и генерации в «Настройках API»",
                level="критично")
        status = "OK" if clip else "НЕ НАЙДЕНО (дырка в таймлайне)"
        log(f"[Раскадровка] План {i} [{mm:02d}:{ss:02d}, {need:.0f} c] "
            f"«{query}» -> {status}")
        if clip:
            timeline.append({"start": round(b["start"], 2),
                             "end": round(b["end"], 2),
                             "query": query,
                             "text": b["text"][:200],
                             "file": str(clip.resolve()),
                             "src_duration": src_dur})
        # Историю использованного сбрасываем не только в самом конце: стадия
        # идёт часами, и падение (или убитый процесс) терял её целиком — тогда
        # следующий ролик заново качал ровно те же клипы. Заодно _save_used
        # подмешивает сюда то, что успел занять ПАРАЛЛЕЛЬНЫЙ прогон варианта,
        # так что дальше по циклу мы уже не выберем то же самое, что и он.
        if i % 20 == 0:
            _save_used(used)

    if reused:
        mx = max(use_count.values()) if use_count else 1
        log(f"[Раскадровка] Скачано уникальных: {downloaded}, повторов: "
            f"{reused} (каждый клип максимум {mx} раз/ролик, с разным "
            "движением камеры) — экономия запросов к стокам")
    _save_used(used)
    if beats and not timeline:
        # Ни одного плана — это провал стадии, а не результат. Записать сюда
        # пустой timeline.json значит затереть прошлый рабочий (ровно тем же
        # рассуждением, что и при «Стопе» выше) и отправить рендер собирать
        # ролик из ничего — сбой всплыл бы через стадию, уже без причины.
        raise RuntimeError(
            f"Раскадровка не собрала ни одного плана из {len(beats)}: не "
            "отработали ни стоки, ни генерация (проверь ключи и журнал выше). "
            "timeline.json оставлен прежним.")
    (out_dir / "timeline.json").write_text(
        json.dumps(timeline, ensure_ascii=False, indent=2), encoding="utf-8")
    xml = export_premiere_xml(timeline, voice, out_dir / "sequence.xml", fps=30)
    # инструкция рядом: почему .xml, а не .prproj, и как получить порядок
    (out_dir / "КАК_ОТКРЫТЬ_В_PREMIERE.txt").write_text(
        "КАК ИМПОРТИРОВАТЬ В ADOBE PREMIERE PRO\n"
        "=" * 40 + "\n\n"
        "1. Premiere: File > Import… > выбери sequence.xml\n"
        "   Появится готовая секвенция: видео-клипы стоят ПО ПОРЯДКУ по\n"
        "   таймкодам, под ними — дорожка с озвучкой. Всё уже выстроено.\n\n"
        "2. Субтитры: File > Import… > subs\\voiceover.srt\n"
        "   Перетащи на таймлайн — получишь дорожку подписей (Captions).\n\n"
        "ПОЧЕМУ НЕ .prproj?\n"
        ".prproj — закрытый бинарный формат Adobe, его нельзя создать\n"
        "снаружи программы. sequence.xml (Final Cut Pro XML) — ОФИЦИАЛЬНЫЙ\n"
        "формат обмена, который Premiere открывает напрямую и превращает\n"
        "в такой же редактируемый таймлайн, как .prproj. После открытия\n"
        "сохрани через File > Save As — и получишь свой .prproj.\n\n"
        "Клипы лежат в папке storyboard\\ — не перемещай её до импорта.\n",
        encoding="utf-8")
    log(f"[Раскадровка] Готово: {len(timeline)}/{len(beats)} планов, "
        f"{out_dir / 'timeline.json'}")
    log("[Раскадровка] Premiere Pro: File > Import > sequence.xml — готовый "
        "таймлайн по порядку (видео + озвучка). Субтитры: импортируй "
        "voiceover.srt. Подробности — файл КАК_ОТКРЫТЬ_В_PREMIERE.txt")
    return timeline
