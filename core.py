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
            capture_output=True, text=True, check=True)
        return float(r.stdout.strip())
    except Exception:
        return None


# ---------- Озвучка ----------

def tts_edge(text: str, voice: str, out_dir: Path, log, rate: int = 0) -> Path:
    """Бесплатная озвучка через Edge TTS (голоса Microsoft, ключи не нужны).
    rate — отклонение темпа в процентах, например -5 или +10."""
    import asyncio
    import edge_tts

    audio_dir = out_dir / "audio"
    audio_dir.mkdir(parents=True, exist_ok=True)
    final = audio_dir / "voiceover.mp3"
    log(f"[Озвучка] Edge TTS, голос {voice}, темп {rate:+d}%, {len(text)} символов...")

    async def run():
        await edge_tts.Communicate(text, voice, rate=f"{rate:+d}%").save(str(final))

    asyncio.run(run())
    log(f"[Озвучка] Готово: {final}")
    return final


def tts_polly(text: str, voice: str, engine: str, out_dir: Path, log,
              rate: int = 0, pauses: bool = True) -> Path:
    """Озвучка через Amazon Polly: куски по предложениям + склейка ffmpeg.
    rate — отклонение темпа в процентах; pauses — паузы между абзацами (SSML).
    Если движок не принимает SSML, автоматически откатывается на обычный текст."""
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
                   check=True, cwd=audio_dir,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
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

def add_music(voice_mp3: Path, music_path: Path, log, gain_db: int = -14) -> Path:
    """Подмешивает музыку под озвучку с автопригушением под голосом (sidechain).
    music_path — файл или папка (из папки берётся случайный трек).
    Результат: voiceover_music.mp3 рядом с озвучкой, оригинал не трогается."""
    voice_mp3 = Path(voice_mp3)
    music_path = Path(music_path)
    if not voice_mp3.exists():
        raise FileNotFoundError(f"Нет озвучки: {voice_mp3}")
    if music_path.is_dir():
        tracks = [p for p in music_path.iterdir() if p.suffix.lower() in MUSIC_EXTS]
        if not tracks:
            raise FileNotFoundError(
                f"В {music_path} нет аудио ({', '.join(sorted(MUSIC_EXTS))})")
        music = random.choice(tracks)
    else:
        music = music_path

    dest = voice_mp3.with_name("voiceover_music.mp3")
    log(f"[Музыка] Трек: {music.name}, громкость {gain_db} dB, "
        "приглушение под голосом, fade in/out... (проверь лицензию трека!)")
    dur = audio_duration(voice_mp3)
    fades = "afade=t=in:d=2"
    if dur and dur > 8:
        fades += f",afade=t=out:st={dur - 3:.2f}:d=3"
    fc = (f"[1:a]volume={gain_db}dB,{fades}[m];"
          "[m][0:a]sidechaincompress=threshold=0.02:ratio=12:attack=25:release=700[duck];"
          "[0:a][duck]amix=inputs=2:duration=first:normalize=0[mix]")
    subprocess.run(["ffmpeg", "-y", "-i", str(voice_mp3),
                    "-stream_loop", "-1", "-i", str(music),
                    "-filter_complex", fc, "-map", "[mix]",
                    "-c:a", "libmp3lame", "-q:a", "2", str(dest)],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    log(f"[Музыка] Готово: {dest} (чистый голос остался в {voice_mp3.name})")
    return dest


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


def llm_chat(messages: list[dict], api_key: str = "",
             temperature: float = 0.7, max_tokens: int = 4096) -> str:
    """Тексты: сначала Gemini (GEMINI_API_KEY), потом Agnes (api_key или
    AGNES_API_KEY). api_key — ключ Agnes из «Настроек API» (для совместимости)."""
    gem = os.getenv("GEMINI_API_KEY", "").strip()
    agn_keys = _agnes_keys(api_key)
    if not gem and not agn_keys:
        raise RuntimeError("Нет ключей для текстов: задай GEMINI_API_KEY или "
                           "AGNES_API_KEY (.env или «Настройки API»).")
    errors = []
    if gem:
        try:
            return gemini_chat(messages, gem, temperature, max_tokens)
        except Exception as e:
            errors.append(str(e))
    for key in agn_keys:
        try:
            return agnes_chat(messages, key, temperature, max_tokens)
        except Exception as e:
            errors.append(f"Agnes: {e}")
    raise RuntimeError("; ".join(errors))


SCRIPT_SYSTEM = (
    "You write long-form YouTube documentary narration in English. "
    "Style: tight, specific, zero filler. Every sentence carries a fact, an "
    "image, or tension. Banned phrases: 'in this video', 'let's dive in', "
    "'stay tuned', 'as we mentioned', 'in conclusion', 'without further ado'. "
    "No headings, no lists, no stage directions — pure spoken narration. "
    "Separate paragraphs with a blank line.")


def gen_script(topic: str, minutes: int, api_key: str = "", log=print) -> str:
    """Длинный сценарий без воды: план из глав, потом главы по очереди
    (каждая продолжает предыдущую). ~150 слов на минуту хронометража."""
    target_words = minutes * WORDS_PER_MINUTE
    n_sections = max(5, round(minutes / 4))
    sec_words = target_words // n_sections
    log(f"[Агент] Сценарий «{topic}»: ~{minutes} мин (~{target_words} слов), "
        f"{n_sections} глав по ~{sec_words} слов")

    outline = llm_chat(
        [{"role": "system", "content": SCRIPT_SYSTEM},
         {"role": "user", "content":
          f"Create an outline for a {minutes}-minute documentary about: {topic}. "
          f"Output exactly {n_sections} chapter titles, one per line, numbered "
          "1..N. Each chapter is a concrete sub-topic with a specific angle — "
          "no vague titles. The chapters must build a narrative arc: hook, "
          "escalation, payoff."}],
        api_key, 0.8, 1500)
    chapters = [re.sub(r"^\s*\d+[.)]\s*", "", ln).strip()
                for ln in outline.splitlines() if re.match(r"\s*\d+[.)]", ln)]
    if not chapters:
        chapters = [ln.strip() for ln in outline.splitlines() if ln.strip()][:n_sections]
    log(f"[Агент] План готов: {len(chapters)} глав")

    parts, prev_tail = [], ""
    for i, ch in enumerate(chapters, 1):
        log(f"[Агент] Глава {i}/{len(chapters)}: {ch}")
        if i == 1:
            flow = ("Open with a hook that grabs attention within the first "
                    "two sentences. ")
        else:
            flow = (f"Continue seamlessly from the previous chapter, which "
                    f"ended with: \"...{prev_tail}\". Do not repeat it. ")
        if i == len(chapters):
            flow += "End with a satisfying payoff that rewards watching to the end. "
        else:
            flow += "End on a note that pulls the viewer into the next chapter. "
        part = llm_chat(
            [{"role": "system", "content": SCRIPT_SYSTEM},
             {"role": "user", "content":
              f"Documentary about: {topic}.\n"
              f"Chapter {i} of {len(chapters)}: {ch}.\n"
              f"Write about {sec_words} words of narration for this chapter. "
              + flow}],
            api_key, 0.75, min(max(sec_words * 3, 1200), 8000))
        parts.append(part)
        prev_tail = " ".join(part.split()[-25:])

    text = "\n\n".join(parts)
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


def smart_queries(beats: list[dict], api_key: str = "", log=print) -> list[str] | None:
    """Поисковые запросы для стока по смыслу текста каждого плана (LLM).
    Идёт батчами по 20: один общий запрос на десятки планов обрезается по
    лимиту токенов, JSON рвётся посередине. Возвращает список длиной
    len(beats), где пустая строка = откат на ключевые слова для этого плана;
    None только если ни один план не удался."""
    n = len(beats)
    if not n:
        return None
    result = [""] * n
    got = 0
    BATCH = 20
    for start in range(0, n, BATCH):
        chunk = beats[start:start + BATCH]
        numbered = "\n".join(f"{i}. {b['text'][:280]}"
                             for i, b in enumerate(chunk, 1))
        try:
            out = llm_chat(
                [{"role": "system", "content":
                  "You convert narration fragments into stock-footage search queries."},
                 {"role": "user", "content":
                  "For each numbered narration fragment output ONE stock video "
                  "search query: 2-4 English words, concrete and visual — what "
                  "should literally be on screen while these words are spoken. "
                  f"Reply with a JSON array of exactly {len(chunk)} strings, "
                  "no markdown, nothing else.\n\n" + numbered}],
                api_key, 0.4, 1200)
            qs = _parse_query_list(out, len(chunk))
            for j in range(len(chunk)):
                if j < len(qs) and qs[j]:
                    result[start + j] = qs[j]
                    got += 1
        except Exception as e:
            log(f"[Агент] Умные запросы, планы {start + 1}-{start + len(chunk)}: "
                f"{e.__class__.__name__} — эти уйдут на ключевые слова.")
    if got == 0:
        return None
    if got < n:
        log(f"[Агент] Умные запросы: {got}/{n} по смыслу, остальные — "
            "по ключевым словам.")
    else:
        log(f"[Агент] Умные запросы: все {n} по смыслу текста.")
    return result


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


def agnes_image(prompt: str, dest: Path, api_key: str, log=print) -> Path:
    """Картинка через Agnes (/images/generations по официальной доке:
    size-тир 2K + ratio 16:9, response_format внутри extra_body)."""
    import base64
    import requests
    r = requests.post(f"{AGNES_BASE_URL}/images/generations",
                      headers={"Authorization": f"Bearer {api_key}"},
                      json={"model": AGNES_IMAGE_MODEL,
                            "prompt": f"{prompt}. {IMAGE_STYLE}",
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


def gemini_image(prompt: str, dest: Path, api_key: str) -> Path:
    """Картинка 16:9 через Gemini (AI Studio или Vertex Express по типу ключа)."""
    import base64
    import requests
    body = {
        "contents": [{"parts": [{"text": f"{prompt}. {IMAGE_STYLE}"}]}],
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


def gen_image(prompt: str, dest: Path, api_key: str = "", log=print) -> Path:
    """Картинка: Agnes (с ротацией всех ключей), потом Gemini (api_key или
    GEMINI_API_KEY). api_key — ключ Gemini из «Настроек API» (совместимость)."""
    agn_keys = _agnes_keys()
    gem = (api_key or os.getenv("GEMINI_API_KEY", "")).strip()
    if not agn_keys and not gem:
        raise RuntimeError("Нет ключей для картинок: задай AGNES_API_KEY или "
                           "GEMINI_API_KEY (.env или «Настройки API»).")
    last = None
    for i, key in enumerate(agn_keys, 1):
        try:
            return agnes_image(prompt, dest, key, log)
        except Exception as e:
            last = e
            if i < len(agn_keys):
                log(f"[Картинка] Ключ Agnes #{i} не сработал ({e}) — следующий...")
    if gem:
        if last:
            log(f"[Картинка] Agnes не справился ({last}) — пробую Gemini...")
        return gemini_image(prompt, dest, gem)
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


def gen_video(prompt: str, dest: Path, log=print,
              seconds: float = 5.0) -> Path:
    """Генерация видеоклипа ИИ с ротацией ключей Agnes при занятости."""
    keys = _agnes_keys()
    if not keys:
        raise RuntimeError("Нет ключа Agnes (AGNES_API_KEY) — видеогенерация "
                           "работает только через Agnes.")
    log(f"[Видео-ИИ] Клип ~{seconds:.0f} c: «{prompt[:60]}» (1-3 мин)")
    last = None
    for attempt in (1, 2):
        for i, key in enumerate(keys, 1):
            try:
                agnes_video(prompt, dest, key, log, seconds)
                log(f"[Видео-ИИ] Готово: {dest.name}")
                return dest
            except RuntimeError as e:
                last = e
                s = str(e)
                if not any(x in s for x in ("429", "503", "饱和", "saturat")):
                    raise      # настоящая ошибка — не маскируем ротацией
                log(f"[Видео-ИИ] Занято (ключ {i}/{len(keys)}, "
                    f"попытка {attempt}/2)")
        if attempt == 1:
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
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


# ---------- Субтитры ----------

CONSOLE = None  # хук GUI: живой вывод дочерних процессов (страница «Консоль»)


def _console(msg: str):
    if CONSOLE:
        try:
            CONSOLE(msg)
        except Exception:
            pass


def transcribe_whisper(audio_path: Path, model: str, out_dir: Path, log) -> Path:
    subs_dir = out_dir / "subs"
    subs_dir.mkdir(parents=True, exist_ok=True)
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
    # максимум 2 строки — иначе субтитры «расползаются» по всему кадру
    cmd = [exe, str(audio_path), "--model", model,
           "--language", "en", "--output_format", "srt",
           "--word_timestamps", "True",
           "--max_line_width", "42", "--max_line_count", "2",
           "--output_dir", str(subs_dir)]
    _console("[whisper] $ " + " ".join(cmd))
    # PYTHONUTF8: без него whisper на Windows печатает в cp1251 и падает
    # с UnicodeEncodeError на первой же нелатинской букве (é, ü, ...) —
    # транскрипция обрывается и .srt не записывается
    env = {**os.environ, "PYTHONUTF8": "1", "PYTHONIOENCODING": "utf-8"}
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                         text=True, encoding="utf-8", errors="replace",
                         env=env)
    for line in p.stdout:
        line = line.strip()
        if line:
            _console(f"[whisper] {line}")
    p.wait()
    if p.returncode != 0:
        raise RuntimeError(f"whisper упал (код {p.returncode}) — подробности "
                           "на странице «Консоль»")
    # Whisper может назвать файл по-своему — ищем самый свежий .srt в папке
    srt_files = sorted(subs_dir.glob("*.srt"),
                       key=lambda p: p.stat().st_mtime, reverse=True)
    if not srt_files:
        raise FileNotFoundError(f"Whisper отработал, но .srt не найден в {subs_dir}")
    srt = srt_files[0]
    # приводим к стандартному имени, чтобы остальные шаги его находили
    target = subs_dir / "voiceover.srt"
    if srt != target:
        if target.exists():
            target.unlink()
        srt.rename(target)
        srt = target
    log(f"[Субтитры] Готово: {srt}")
    return srt


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


def auto_storyboard(out_dir: Path, log, pexels_keys: str = "",
                    pixabay_keys: str = "", min_beat: float = 6.0,
                    gemini_key: str = "", agnes_key: str = "",
                    genvideo: bool = False):
    """Подбирает материал по таймлайну озвучки: субтитры -> планы по min_beat
    секунд -> ключевые слова из текста каждого плана -> сток под план
    (видео нужной длины; если нет — фото + Ken Burns ровно на длину плана;
    если и фото нет, а ключ Gemini задан — картинка генерируется).
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

    queries = None
    if (agnes_key or os.getenv("AGNES_API_KEY", "")
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
        r = pexels_get("https://api.pexels.com/v1/search",
                       {"query": query, "per_page": SEARCH_POOL,
                        "orientation": "landscape"})
        photos = r.json().get("photos") if r is not None and r.status_code == 200 else None
        picked = [(p["src"]["original"], p) for p in
                  _pick_unused(photos or [], "pexels_photo", used, 1, log)]
        if not picked:
            r = pixabay_get({"q": query, "per_page": SEARCH_POOL,
                             "orientation": "horizontal", "image_type": "photo"})
            hits = r.json().get("hits") if r is not None and r.status_code == 200 else None
            picked = [(h["largeImageURL"], h) for h in
                      _pick_unused(hits or [], "pixabay", used, 1, log)]
        if not picked:
            return None
        jpg = dest.with_suffix(".jpg")
        download_file(picked[0][0], jpg)
        ken_burns(jpg, dest, duration=need)   # фото оживает зумом/панорамой
        return need

    # Чередуем видео и фото: раньше фото попадали только когда видео не
    # нашлось — ролик выходил «чисто из видео». Первые два плана — живое
    # видео (хук), дальше через один фото с Ken Burns (документальный вид).
    plan_kinds = ["video" if i < 2 or i % 2 == 0 else "photo"
                  for i in range(len(beats))]

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
        try:
            if want_photo:
                clip = sdir / f"beat_{i:03d}_{safe}_kb.mp4"
                src_dur = fetch_photo(query, need, clip)
                if src_dur is None:                       # фото нет — берём видео
                    clip = sdir / f"beat_{i:03d}_{safe}.mp4"
                    src_dur = fetch_video(query, need, clip)
            else:
                clip = sdir / f"beat_{i:03d}_{safe}.mp4"
                src_dur = fetch_video(query, need, clip)
                if src_dur is None:                       # видео нет — берём фото
                    clip = sdir / f"beat_{i:03d}_{safe}_kb.mp4"
                    src_dur = fetch_photo(query, need, clip)
            if src_dur is None:
                clip = None
        except Exception as e:
            log(f"[Раскадровка] План {i}: ошибка {e}")
            clip = None
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
