#!/usr/bin/env python3
"""
Общая логика пайплайна: озвучка (Edge TTS / Amazon Polly), субтитры (Whisper),
стоки (Pexels / Pixabay), Ken Burns, фоновая музыка. Используется и CLI
(pipeline.py), и GUI (app.py).

Все функции пишут прогресс через переданный log(msg) — CLI передаёт print,
GUI передаёт свой потокобезопасный логгер.
"""

import os
import re
import json
import time
import random
import shutil
import subprocess
from pathlib import Path
from xml.sax.saxutils import escape

# ffmpeg может быть установлен, но отсутствовать в PATH процесса
# (терминал, открытый до установки; ярлык со старым окружением)
if shutil.which("ffmpeg") is None and Path(r"C:\ffmpeg\bin\ffmpeg.exe").exists():
    os.environ["PATH"] += os.pathsep + r"C:\ffmpeg\bin"

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
        subprocess.run(["ffmpeg", "-y", "-i", str(mp3), "-af", chain,
                        "-c:a", "libmp3lame", "-q:a", "2", str(tmp)],
                       check=True, stdout=subprocess.DEVNULL,
                       stderr=subprocess.DEVNULL, creationflags=CREATE_NO_WINDOW)
        tmp.replace(mp3)
        log("[Озвучка] Голос обработан: компрессия + глубина + нормализация "
            "(документальный «дикторский» звук)")
    except Exception as e:
        tmp.unlink(missing_ok=True)
        log(f"[Озвучка] Обработку голоса пропустил ({e.__class__.__name__})")
    return mp3


def tts_edge(text: str, voice: str, out_dir: Path, log, rate: int = 0,
             enhance: bool = False) -> Path:
    """Бесплатная озвучка через Edge TTS (голоса Microsoft, ключи не нужны).
    rate — отклонение темпа в процентах; enhance — «дикторская» обработка."""
    import asyncio
    import edge_tts

    audio_dir = out_dir / "audio"
    audio_dir.mkdir(parents=True, exist_ok=True)
    final = audio_dir / "voiceover.mp3"
    log(f"[Озвучка] Edge TTS, голос {voice}, темп {rate:+d}%, {len(text)} символов...")

    async def run():
        await edge_tts.Communicate(text, voice, rate=f"{rate:+d}%").save(str(final))

    asyncio.run(run())
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

    audio_dir = out_dir / "audio"
    audio_dir.mkdir(parents=True, exist_ok=True)
    chunks = split_text(text)
    use_ssml = pauses or rate != 0
    log(f"[Озвучка] {len(text)} символов -> {len(chunks)} кусков, "
        f"голос {voice} ({engine}), темп {rate:+d}%"
        + (", паузы между абзацами" if pauses else ""))
    polly = boto3.client("polly", region_name=os.getenv("AWS_REGION", "us-east-1"))
    parts = []
    for i, chunk in enumerate(chunks, 1):
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
                use_ssml = False
        if resp is None:
            resp = polly.synthesize_speech(Text=chunk.replace("\n", " "), **kwargs)
        p = audio_dir / f"part_{i:03d}.mp3"
        p.write_bytes(resp["AudioStream"].read())
        parts.append(p)

    concat = audio_dir / "concat.txt"
    concat.write_text("\n".join(f"file '{p.name}'" for p in parts), encoding="utf-8")
    final = audio_dir / "voiceover.mp3"
    subprocess.run(["ffmpeg", "-y", "-f", "concat", "-safe", "0",
                    "-i", str(concat), "-c", "copy", str(final)],
                   check=True, cwd=audio_dir, creationflags=CREATE_NO_WINDOW,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
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

    subprocess.run(["ffmpeg", "-y", "-i", str(voice_mp3)] + inputs
                   + ["-filter_complex", fc, "-map", "[mix]",
                      "-c:a", "libmp3lame", "-q:a", "2", str(dest)],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                   creationflags=CREATE_NO_WINDOW)
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
        subprocess.run(["ffmpeg", "-y", "-i", str(base_mp3)] + inputs
                       + ["-filter_complex", fc, "-map", "[mix]",
                          "-c:a", "libmp3lame", "-q:a", "2", str(dest)],
                       check=True, stdout=subprocess.DEVNULL,
                       stderr=subprocess.DEVNULL, creationflags=CREATE_NO_WINDOW)
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
        r = requests.post(url, params={"key": api_key}, json=body, timeout=300)
        if r.status_code != 200:
            last = f"{r.status_code}: {r.text[:200]}"
            continue
        cands = r.json().get("candidates") or []
        parts = (cands[0].get("content") or {}).get("parts") if cands else []
        text = "".join(p.get("text", "") for p in parts or []).strip()
        if text:
            return text
        last = "пустой ответ"
    raise RuntimeError(f"Gemini (текст): {last}")


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
    return r.json()["choices"][0]["message"]["content"].strip()


def _gemini_keys() -> list[str]:
    """Все ключи Gemini для ротации при 429 — GEMINI_API_KEY, GEMINI_API_KEY2..."""
    keys = []
    for k in (os.getenv("GEMINI_API_KEY", ""), os.getenv("GEMINI_API_KEY2", ""),
              os.getenv("GEMINI_API_KEY3", "")):
        k = (k or "").strip()
        if k and k not in keys:
            keys.append(k)
    return keys


def llm_chat(messages: list[dict], api_key: str = "",
             temperature: float = 0.7, max_tokens: int = 4096) -> str:
    """Тексты: сначала Gemini (GEMINI_API_KEY, потом GEMINI_API_KEY2... при
    429/ошибке), потом Agnes (api_key или AGNES_API_KEY). api_key — ключ
    Agnes из «Настроек API» (для совместимости)."""
    gem_keys = _gemini_keys()
    agn_keys = _agnes_keys(api_key)
    if not gem_keys and not agn_keys:
        raise RuntimeError("Нет ключей для текстов: задай GEMINI_API_KEY или "
                           "AGNES_API_KEY (.env или «Настройки API»).")
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
    raise RuntimeError("; ".join(errors))


# Жанры/тон — под ЛЮБУЮ тему. base — общий каркас, дальше добавка тона.
SCRIPT_BASE = (
    "You write long-form YouTube voice-over narration in {lang}. "
    "Style: tight, specific, zero filler. Every sentence carries a fact, an "
    "image, or tension. Banned phrases: 'in this video', 'let's dive in', "
    "'stay tuned', 'as we mentioned', 'in conclusion', 'without further ado'. "
    "No headings, no lists, no stage directions — pure spoken narration. "
    "Separate paragraphs with a blank line. "
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
               tone: str = "документальный", lang: str = "английский") -> str:
    """Длинный сценарий без воды на ЛЮБУЮ тему: план из глав, потом главы по
    очереди. tone — жанр/подача, lang — язык. ~150 слов на минуту."""
    target_words = minutes * WORDS_PER_MINUTE
    n_sections = max(5, round(minutes / 4))
    sec_words = target_words // n_sections
    lang_name = LANGS.get(lang, "English")
    system = SCRIPT_BASE.format(lang=lang_name) + TONES.get(
        tone, TONES["документальный"])
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
        api_key, 0.8, 1500)
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
        tail_words, part_words = norm(tail), part.split()
        part_norm = norm(part)
        for k in range(min(len(tail_words), len(part_norm)), 1, -1):
            if part_norm[:k] == tail_words[-k:]:
                return " ".join(part_words[k:]).strip()
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
        log(f"[Агент] Глава {i}/{len(chapters)}: {ch}")
        if i == 1:
            flow = ("Open with a hook that grabs attention within the first "
                    "two sentences. ")
        else:
            flow = (f"Continue seamlessly from the previous chapter, which "
                    f"ended with: \"...{prev_tail}\". Do not repeat any of "
                    "that text — start with genuinely new content. ")
        if i == len(chapters):
            flow += "End with a satisfying payoff that rewards watching to the end. "
        else:
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
                continue
        parts.append(part)
        prev_tail = " ".join(part.split()[-25:])

    text = "\n\n".join(parts)
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
    for start in range(0, n, batch_size):
        chunk = beats[start:start + batch_size]
        numbered = "\n".join(f"{i}. {b['text'][:280]}"
                             for i, b in enumerate(chunk, 1))
        try:
            out = llm_chat(
                [{"role": "system", "content": system},
                 {"role": "user", "content":
                  instruction.format(n=len(chunk)) + "\n\n" + numbered}],
                api_key, temperature, max_tokens)
            qs = _parse_query_list(out, len(chunk))
            for j in range(len(chunk)):
                if j < len(qs) and qs[j]:
                    result[start + j] = qs[j]
                    got += 1
        except Exception as e:
            log(f"[Агент] {label}, планы {start + 1}-{start + len(chunk)}: "
                f"{e.__class__.__name__} — эти уйдут на ключевые слова.")
    if got == 0:
        return None
    if got < n:
        log(f"[Агент] {label}: {got}/{n} по смыслу, остальные — по ключевым словам.")
    else:
        log(f"[Агент] {label}: все {n} по смыслу текста.")
    return result


def smart_queries(beats: list[dict], api_key: str = "", log=print) -> list[str] | None:
    """Поисковые запросы для стока по смыслу текста каждого плана (LLM),
    батчами по 20 — короткая фраза под сток-поиск (2-4 слова)."""
    return _llm_batch_prompts(
        beats, api_key, log, batch_size=20,
        system="You convert narration fragments into stock-footage search queries.",
        instruction=(
            "For each numbered narration fragment output ONE stock video "
            "search query: 2-4 English words, concrete and visual — what "
            "should literally be on screen while these words are spoken. "
            "Reply with a JSON array of exactly {n} strings, no markdown, "
            "nothing else."),
        temperature=0.4, max_tokens=1200, label="Умные запросы")


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
    while len(paras) > max_scenes:  # слишком много абзацев — склеиваем соседние
        paras = [" ".join(paras[i:i + 2]) for i in range(0, len(paras), 2)]
    numbered = "\n".join(f"{i}. {p[:300]}" for i, p in enumerate(paras, 1))
    log(f"[Агент] Составляю сцены по смыслу текста: {len(paras)} фрагментов...")
    out = llm_chat(
        [{"role": "system", "content":
          "You plan stock footage for documentary videos."},
         {"role": "user", "content":
          "For each numbered narration fragment, decide what should literally "
          "be on screen while it is spoken. Output a JSON array of exactly "
          f"{len(paras)} objects: "
          '{"q": "2-4 concrete English words for a stock footage search", '
          '"type": "video" or "image"}. Prefer "video"; use "image" for '
          "static, historical or abstract moments. Nothing but the JSON "
          "array.\n\n" + numbered}],
        api_key, 0.4, 4000)
    m = re.search(r"\[.*\]", out, re.S)
    if not m:
        raise RuntimeError("ответ без JSON")
    lines = []
    for it in json.loads(m.group(0)):
        q = str(it.get("q", "")).strip()
        t = "image" if str(it.get("type", "")).lower().startswith("i") else "video"
        if q:
            lines.append(f"{q} | type: {t}")
    if not lines:
        raise RuntimeError("ИИ не вернул ни одной сцены")
    log(f"[Агент] Готово: {len(lines)} сцен")
    return "\n".join(lines)


def gen_seo(script_text: str, api_key: str = "", log=print) -> str:
    """Варианты названия, описание и теги для YouTube по готовому сценарию."""
    log("[Агент] Генерирую названия, описание и теги...")
    return llm_chat(
        [{"role": "system", "content":
          "You are a YouTube strategist for documentary channels. "
          "Curiosity-driven, never misleading."},
         {"role": "user", "content":
          "Based on this script, output in English:\n"
          "TITLES: 5 options, each under 70 characters\n"
          "DESCRIPTION: 2 short paragraphs, first line must hook\n"
          "TAGS: 15 comma-separated tags\n\nScript:\n"
          + script_text[:6000]}],
        api_key, 0.8, 1500)


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
        r = requests.post(url, params={"key": api_key}, json=body, timeout=120)
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
              style: str = "", upscale: bool = True) -> Path:
    """Картинка через VeoNonStop (Banana Pro), синхронно. upscale=True —
    дополнительно апскейлит результат до 2K через banana_upscale; апскейл
    не критичен для результата, поэтому любая его ошибка тихо падает
    обратно на исходную (не апскейленную) картинку, а не проваливает вызов."""
    import veo_client
    data = veo_client.banana_generate(_image_prompt(prompt, style), api_key=api_key)
    media = data.get("media") or []
    if not media:
        raise RuntimeError("VeoNonStop Banana: ответ без картинки")
    if upscale:
        try:
            jpg_bytes = veo_client.banana_upscale(
                media[0]["mediaGenerationId"], data.get("project_id", ""),
                api_key=api_key)
            dest.write_bytes(jpg_bytes)
            return dest
        except Exception as e:
            log(f"[Картинка] Апскейл до 2K не удался ({e}) — беру оригинал")
    download_file(media[0]["fifeUrl"], dest)
    return dest


def gen_image(prompt: str, dest: Path, api_key: str = "", log=print,
              style: str = "") -> Path:
    """Картинка: VeoNonStop (Banana, ОСНОВНОЙ) -> Agnes -> Gemini (фолбэки,
    если Veo недоступен/ключ истёк/упал). style — единый визуальный стиль
    проекта (VISUAL_STYLES), добавляется к промпту."""
    veo_key = os.getenv("VEO_API_KEY", "").strip()
    agn_keys = _agnes_keys()
    gem = (api_key or os.getenv("GEMINI_API_KEY", "")).strip()
    if not veo_key and not agn_keys and not gem:
        raise RuntimeError("Нет ключей для картинок: задай VEO_API_KEY, "
                           "AGNES_API_KEY или GEMINI_API_KEY (.env или «Настройки API»).")
    last = None
    if veo_key:
        try:
            return veo_image(prompt, dest, veo_key, log, style)
        except Exception as e:
            last = e
            if agn_keys or gem:
                log(f"[Картинка] VeoNonStop не справился ({e}) — пробую Agnes/Gemini...")
    for i, key in enumerate(agn_keys, 1):
        try:
            return agnes_image(prompt, dest, key, log, style)
        except Exception as e:
            last = e
            if i < len(agn_keys):
                log(f"[Картинка] Ключ Agnes #{i} не сработал ({e}) — следующий...")
    if gem:
        try:
            return gemini_image(prompt, dest, gem, style)
        except Exception as e:
            last = e
            log(f"[Картинка] Gemini не справился ({e})")
    raise last


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
    r = requests.get(
        "https://api.jamendo.com/v3.0/tracks/",
        params={"client_id": client_id, "format": "json", "limit": 30,
                "tags": tag, "audioformat": "mp32", "include": "licenses",
                "order": "popularity_total", "boost": "popularity_total"},
        timeout=30)
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
            log(f"[Jamendo] «{mood}»: поиск не удался ({e})")
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
                log(f"[Jamendo] «{t['name']}»: скачивание не удалось ({e})")
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
        time.sleep(10)
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
    log(f"[Видео-ИИ] VeoNonStop: «{prompt[:60]}» (1-3 мин)...")
    veo_client.generate_video_and_wait(prompt, dest, api_key=api_key, log=log)
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
    task_id = veo_client.image_to_video(full_prompt, Path(image_path),
                                        mime_type=mime, aspect_ratio="16:9",
                                        api_key=veo_key)
    veo_client.wait_for_completion(task_id, veo_key, log=log)
    veo_client.download_video(task_id, dest, api_key=veo_key)
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
    task_id = veo_client.multi_image_to_video(prompt, images, aspect_ratio="16:9",
                                              api_key=veo_key)
    veo_client.wait_for_completion(task_id, veo_key, log=log)
    veo_client.download_video(task_id, dest, api_key=veo_key)
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
    task_id = veo_client.batch_frame_to_video(prompt, Path(start_image),
                                              Path(end_image), aspect_ratio="16:9",
                                              api_key=veo_key)
    veo_client.wait_for_completion(task_id, veo_key, log=log)
    veo_client.download_video(task_id, dest, api_key=veo_key)
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
                log(f"[Видео-ИИ] VeoNonStop не справился ({e}) — пробую Agnes...")
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
        time.sleep(45)
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
    subprocess.run(["ffmpeg", "-y", "-i", str(image), "-vf", vf,
                    "-c:v", "libx264", "-preset", "fast", "-an", str(dest)],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                   creationflags=CREATE_NO_WINDOW)


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
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                         text=True, encoding="utf-8", errors="replace",
                         env=env, creationflags=CREATE_NO_WINDOW)
    for line in p.stdout:
        line = line.strip()
        if line:
            _console(f"[whisper] {line}")
    p.wait()
    if p.returncode != 0:
        raise RuntimeError(f"whisper упал (код {p.returncode}) — подробности "
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
    USED_MEDIA_FILE.write_text(
        json.dumps(used, ensure_ascii=False, indent=1), encoding="utf-8")


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
            r = requests.get("https://pixabay.com/api/",
                             params={**params, "key": pixabay.current}, timeout=30)
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


def build_beats(rows: list[tuple[str, str, str]], min_beat: float = 6.0,
                total: float | None = None) -> list[dict]:
    """Группирует srt-сегменты в визуальные планы длиной >= min_beat секунд.
    Планы идут встык: конец плана = начало следующего, без дыр."""
    beats, cur = [], None
    for start_s, end_s, text in rows:
        start, end = srt_to_seconds(start_s), srt_to_seconds(end_s)
        if cur is None:
            cur = {"start": start, "end": end, "text": text}
        else:
            cur["end"] = end
            cur["text"] += " " + text
        if cur["end"] - cur["start"] >= min_beat:
            beats.append(cur)
            cur = None
    if cur is not None:
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

    def run_job(job):
        i, kind, query, dest = job
        try:
            if kind == "photo":
                gen_image(query, dest, gemini_key, log, visual_style)
                if veo_key:   # оживляем кадр (image-to-video) прямо в префетче,
                    clip = dest.with_name(dest.stem + "_kb.mp4")   # параллельно с остальными —
                    try:                                            # иначе это ~1-3 мин НА КАЖДЫЙ
                        gen_video_from_image(dest, query, clip, veo_key, log,
                                             visual_style)
                    except Exception:
                        pass   # не страшно — основной цикл сделает Ken Burns
            else:
                gen_video(_image_prompt(query, visual_style), dest, log)
            return (i, True, None)
        except Exception as e:
            return (i, False, e)

    if veo_key:
        try:
            import veo_client
            usage = veo_client.account_usage(api_key=veo_key)
            free = usage.get("max_concurrent_tasks", workers) - usage.get("active_tasks", 0)
            if free > 0:
                workers = max(1, min(workers, free))
            log(f"[Раскадровка] VeoNonStop: план допускает "
                f"{usage.get('max_concurrent_tasks', '?')} задач одновременно, "
                f"сейчас занято {usage.get('active_tasks', 0)}")
        except Exception:
            pass   # нет ключа/недоступен — остаёмся на переданном workers
    log(f"[Раскадровка] Параллельная генерация: {len(jobs)} кадров, "
        f"до {workers} одновременно...")
    ok = 0
    with ThreadPoolExecutor(max_workers=workers) as ex:
        for i, success, err in ex.map(run_job, jobs):
            if success:
                ok += 1
            else:
                log(f"[Раскадровка] План {i}: параллельно не вышло "
                    f"({err}) — досоздастся в обычном проходе")
    log(f"[Раскадровка] Параллельно готово: {ok}/{len(jobs)}")


def auto_storyboard(out_dir: Path, log, pexels_keys: str = "",
                    pixabay_keys: str = "", min_beat: float = 6.0,
                    gemini_key: str = "", agnes_key: str = "",
                    genvideo: bool = False, max_unique: int = 200,
                    visual_mode: str = "stock", visual_style: str = "",
                    ai_ratio: float = 0.35, queries: list[str] | None = None):
    """Подбирает материал по таймлайну озвучки: субтитры -> планы по min_beat
    секунд -> ключевые слова из текста каждого плана -> сток под план
    (видео нужной длины; если нет — фото + Ken Burns ровно на длину плана;
    если и фото нет, а ключ Gemini задан — картинка генерируется).

    visual_mode:
      "stock"  — только стоки; ИИ-картинка лишь как аварийный fallback,
                 если сток совсем ничего не нашёл (редко — почти всегда
                 что-то находится, поэтому ИИ-кадров в ролике мало).
      "mixed"  — намеренно ai_ratio (по умолчанию 35%) планов генерируются
                 ИИ, ровными интервалами по всему ролику, а не только когда
                 сток провалился — так видео не выглядит «сплошным стоком».
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
    beats = build_beats(rows, min_beat, total)
    log(f"[Раскадровка] {len(rows)} фраз -> {len(beats)} планов по ~{min_beat:.0f} с, "
        f"звук: {voice.name}")

    sdir = out_dir / "storyboard"
    sdir.mkdir(parents=True, exist_ok=True)
    pexels = KeyRotator(pexels_keys or os.getenv("PEXELS_API_KEY", ""))
    pixabay = KeyRotator(pixabay_keys or os.getenv("PIXABAY_API_KEY", ""))
    pexels_get, pixabay_get = _stock_getters(pexels, pixabay, log)
    used = _load_used()

    if queries is None and (agnes_key or os.getenv("AGNES_API_KEY", "")
            or os.getenv("GEMINI_API_KEY", "")):
        log("[Раскадровка] Составляю умные запросы по смыслу текста (LLM)...")
        queries = smart_queries(beats, agnes_key, log)

    def fetch_video(query, need, dest):
        r = pexels_get("https://api.pexels.com/videos/search",
                       {"query": query, "per_page": SEARCH_POOL,
                        "orientation": "landscape"})
        vids = r.json().get("videos") if r is not None and r.status_code == 200 else None
        if not vids:
            return None
        long_enough = [v for v in vids if (v.get("duration") or 0) >= need]
        picked = _pick_unused(long_enough or vids, "pexels_video", used, 1, log)
        if not picked:
            return None
        v = picked[0]
        download_file(pick_video_file(v["video_files"])["link"], dest)
        return v.get("duration") or audio_duration(dest) or need

    def fetch_photo(query, need, dest):
        # источники по очереди: Pexels -> Pixabay -> Openverse -> Wikimedia
        url = None
        r = pexels_get("https://api.pexels.com/v1/search",
                       {"query": query, "per_page": SEARCH_POOL,
                        "orientation": "landscape"})
        photos = r.json().get("photos") if r is not None and r.status_code == 200 else None
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
                    if not animated and os.getenv("VEO_API_KEY", "").strip():
                        try:
                            gen_video_from_image(jpg, query, clip, log=log,
                                                 style=visual_style)
                            animated = True
                        except Exception as e:
                            log(f"[Раскадровка] План {i}: image-to-video не "
                                f"вышел ({e}) — Ken Burns")
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
                log(f"[Раскадровка] План {i}: генерация не удалась ({e}) — "
                    "беру сток")
                clip = None
                if pool:
                    clip = reuse_from_pool()
                    src_dur = audio_duration(clip) or need
                    reused += 1
        else:
            try:
                if want_photo:
                    clip = sdir / f"beat_{i:03d}_{safe}_kb.mp4"
                    src_dur = fetch_photo(query, need, clip)
                    if src_dur is None:                   # фото нет — берём видео
                        clip = sdir / f"beat_{i:03d}_{safe}.mp4"
                        src_dur = fetch_video(query, need, clip)
                else:
                    clip = sdir / f"beat_{i:03d}_{safe}.mp4"
                    src_dur = fetch_video(query, need, clip)
                    if src_dur is None:                   # видео нет — берём фото
                        clip = sdir / f"beat_{i:03d}_{safe}_kb.mp4"
                        src_dur = fetch_photo(query, need, clip)
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
        if clip is None and genvideo:
            # сток не нашёлся — генерируем настоящий видеоклип под длину плана
            try:
                clip = sdir / f"beat_{i:03d}_{safe}_ai.mp4"
                gen_video(query, clip, log, seconds=min(need, 18))
                src_dur = audio_duration(clip) or need
                log(f"[Раскадровка] План {i}: видео сгенерировано ИИ")
            except Exception as e:
                log(f"[Раскадровка] План {i}: видео-ИИ не удалось ({e})")
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
                log(f"[Раскадровка] План {i}: генерация не удалась ({e})")
                clip = None
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

    if reused:
        mx = max(use_count.values()) if use_count else 1
        log(f"[Раскадровка] Скачано уникальных: {downloaded}, повторов: "
            f"{reused} (каждый клип максимум {mx} раз/ролик, с разным "
            "движением камеры) — экономия запросов к стокам")
    _save_used(used)
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
