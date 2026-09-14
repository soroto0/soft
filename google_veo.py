"""Официальный поставщик видео: Google Gemini API (Veo 3.1).

Второй путь генерации — на случай, когда veononstop недоступен, подорожал
или забанил ключ. Интерфейс намеренно повторяет veo_client, чтобы core.py
не переписывать: выбор поставщика делает veo_client по переменной среды
VEO_PROVIDER (см. veo_client.provider()).

Переменные среды:
    VEO_PROVIDER=google         — включить этот путь (по умолчанию veononstop)
    GEMINI_API_KEY=...          — ключ (уже есть в .env, тот же, что для картинок)
    VEO_GOOGLE_MODEL=...        — модель, по умолчанию veo-3.1-fast-generate-preview
    VEO_GOOGLE_RESOLUTION=...   — 720p (по умолчанию), 1080p или 4k
    VEO_DAILY_BUDGET_USD=...    — дневной потолок трат, по умолчанию 20

Ограничения самого API (проверено по документации 2026-08-22):
    durationSeconds  — только "4", "6" или "8";
    1080p и 4k       — только при 8 секундах;
    numberOfVideos   — всегда 1 на запрос;
    апскейла нет     — нужное разрешение запрашивается сразу.
"""

from __future__ import annotations

import base64
import json
import os
import time
import urllib.error
import urllib.request
from datetime import date
from pathlib import Path

BASE_URL = os.getenv("VEO_GOOGLE_BASE_URL",
                     "https://generativelanguage.googleapis.com/v1beta")
DEFAULT_MODEL = os.getenv("VEO_GOOGLE_MODEL", "veo-3.1-fast-generate-preview")
DEFAULT_RESOLUTION = os.getenv("VEO_GOOGLE_RESOLUTION", "720p")

# Цены Gemini API за секунду готового видео, звук включён.
# Снято со страницы тарифов 22.08.2026 — при изменении править здесь.
PRICE_PER_SECOND = {
    "veo-3.1-generate-preview":      {"720p": 0.40, "1080p": 0.40, "4k": 0.60},
    "veo-3.1-fast-generate-preview": {"720p": 0.10, "1080p": 0.12, "4k": 0.30},
    "veo-3.1-lite-generate-preview": {"720p": 0.05, "1080p": 0.08},
}

ALLOWED_DURATIONS = ("4", "6", "8")
SPEND_FILE = Path(__file__).resolve().parent / ".veo_google_spend.json"


class GoogleVeoError(RuntimeError):
    """Ошибка официального поставщика. status — код HTTP, если он был."""

    def __init__(self, message: str, status: int | None = None):
        super().__init__(message)
        self.status = status


# ─────────────────────────── ключ и запросы ───────────────────────────

def _key(api_key: str = "") -> str:
    key = (api_key or os.getenv("GEMINI_API_KEY", "")).strip()
    if not key:
        raise GoogleVeoError(
            "Нет ключа Google. Положите GEMINI_API_KEY в .env или передайте "
            "api_key= явно.")
    return key


def _request(method: str, url: str, api_key: str = "",
             body: dict | None = None, timeout: int = 120) -> dict:
    data = json.dumps(body).encode() if body is not None else None
    headers = {"x-goog-api-key": _key(api_key)}
    if data:
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        detail = e.read()[:600].decode("utf-8", "replace")
        raise GoogleVeoError(f"HTTP {e.code}: {detail}", status=e.code) from None
    except urllib.error.URLError as e:
        raise GoogleVeoError(f"нет связи с API: {e.reason}") from None


# ─────────────────────────── учёт денег ───────────────────────────

def cost_of(seconds: int, model: str = "", resolution: str = "") -> float:
    """Сколько будет стоить ролик такой длины на этой модели, в долларах."""
    model = model or DEFAULT_MODEL
    resolution = resolution or DEFAULT_RESOLUTION
    table = PRICE_PER_SECOND.get(model)
    if not table:
        raise GoogleVeoError(f"неизвестная модель {model}: цены на неё нет")
    if resolution not in table:
        raise GoogleVeoError(
            f"{model} не умеет {resolution}; доступно: {', '.join(table)}")
    return round(seconds * table[resolution], 4)


def _spend_load() -> dict:
    try:
        return json.loads(SPEND_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {}


def spent_today() -> float:
    return float(_spend_load().get(date.today().isoformat(), 0.0))


def daily_budget() -> float:
    try:
        return float(os.getenv("VEO_DAILY_BUDGET_USD", "20"))
    except ValueError:
        return 20.0


def _spend_add(amount: float) -> None:
    data = _spend_load()
    today = date.today().isoformat()
    data[today] = round(float(data.get(today, 0.0)) + amount, 4)
    # старше 30 записей не храним — файл не должен пухнуть
    for old in sorted(data)[:-30]:
        data.pop(old, None)
    try:
        SPEND_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2),
                              encoding="utf-8")
    except Exception:
        pass


def _budget_check(seconds: int, model: str, resolution: str) -> float:
    """Не пускает запрос, если дневной потолок уже выбран. Возвращает цену."""
    price = cost_of(seconds, model, resolution)
    limit = daily_budget()
    already = spent_today()
    if limit > 0 and already + price > limit:
        raise GoogleVeoError(
            f"дневной лимит трат исчерпан: сегодня уже ${already:.2f}, "
            f"этот ролик стоит ${price:.2f}, потолок ${limit:.2f}. "
            f"Поднимите VEO_DAILY_BUDGET_USD или подождите до завтра.")
    return price


# ─────────────────────────── генерация ───────────────────────────

def _normalize_duration(seconds) -> str:
    s = str(int(seconds))
    if s not in ALLOWED_DURATIONS:
        # ближайшее допустимое, а не отказ: конвейеру нужен ролик, не спор
        s = min(ALLOWED_DURATIONS, key=lambda d: abs(int(d) - int(seconds)))
    return s


def _check_combo(resolution: str, duration: str) -> None:
    if resolution in ("1080p", "4k") and duration != "8":
        raise GoogleVeoError(
            f"{resolution} доступно только при 8 секундах, запрошено {duration}")


def start_generation(prompt: str, aspect_ratio: str = "16:9",
                     image_path: Path | str | None = None,
                     mime_type: str = "image/jpeg",
                     duration_s: int = 8, model: str = "",
                     resolution: str = "", api_key: str = "",
                     negative_prompt: str = "") -> tuple[str, float]:
    """Ставит задачу. Возвращает (имя операции, ожидаемая цена в долларах)."""
    model = model or DEFAULT_MODEL
    resolution = resolution or DEFAULT_RESOLUTION
    duration = _normalize_duration(duration_s)
    _check_combo(resolution, duration)
    price = _budget_check(int(duration), model, resolution)

    instance: dict = {"prompt": prompt}
    if image_path:
        raw = Path(image_path).read_bytes()
        instance["image"] = {"inlineData": {
            "mimeType": mime_type,
            "data": base64.b64encode(raw).decode(),
        }}
    params: dict = {
        "aspectRatio": aspect_ratio,
        "resolution": resolution,
        "durationSeconds": duration,
        "numberOfVideos": 1,
    }
    if negative_prompt:
        params["negativePrompt"] = negative_prompt

    url = f"{BASE_URL}/models/{model}:predictLongRunning"
    resp = _request("POST", url, api_key,
                    {"instances": [instance], "parameters": params})
    name = resp.get("name")
    if not name:
        raise GoogleVeoError(f"API не вернул имя операции: {resp}")
    return name, price


def operation_status(op_name: str, api_key: str = "") -> dict:
    return _request("GET", f"{BASE_URL}/{op_name}", api_key)


def wait_for_completion(op_name: str, api_key: str = "", poll_s: int = 10,
                        timeout_s: int = 1800, log=lambda *_: None) -> dict:
    """Ждёт готовности. 429 и 5xx — это «сервер занят», а не провал задачи."""
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        try:
            st = operation_status(op_name, api_key)
        except GoogleVeoError as e:
            if e.status and e.status != 429 and e.status < 500:
                raise
            log(f"[Veo/Google] сервер занят ({e}); жду {poll_s} с")
            time.sleep(poll_s)
            continue
        if st.get("done"):
            if "error" in st:
                raise GoogleVeoError(f"генерация отклонена: {st['error']}")
            return st
        time.sleep(poll_s)
    raise GoogleVeoError(f"не дождался готовности за {timeout_s} с ({op_name})")


def _video_uri(status: dict) -> str:
    resp = status.get("response", {})
    samples = (resp.get("generateVideoResponse", {}).get("generatedSamples")
               or resp.get("generatedSamples") or [])
    if not samples:
        raise GoogleVeoError(f"в ответе нет готового ролика: {status}")
    uri = samples[0].get("video", {}).get("uri")
    if not uri:
        raise GoogleVeoError(f"в ответе нет ссылки на файл: {samples[0]}")
    return uri


def download_video(uri: str, dest: Path | str, api_key: str = "",
                   timeout: int = 600) -> Path:
    dest = Path(dest)
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(uri, headers={"x-goog-api-key": _key(api_key)})
    tmp = dest.with_suffix(dest.suffix + ".part")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r, \
                open(tmp, "wb") as f:
            while True:
                chunk = r.read(1 << 20)
                if not chunk:
                    break
                f.write(chunk)
    except urllib.error.HTTPError as e:
        raise GoogleVeoError(f"скачивание не удалось: HTTP {e.code}",
                             status=e.code) from None
    if tmp.stat().st_size == 0:
        tmp.unlink(missing_ok=True)
        raise GoogleVeoError("скачался пустой файл")
    tmp.replace(dest)
    return dest


def generate_video_and_wait(prompt: str, dest: Path, aspect_ratio: str = "16:9",
                            api_key: str = "", poll_s: int = 10,
                            timeout_s: int = 1800, upscale: bool = True,
                            log=lambda *_: None,
                            duration_s: int = 8, model: str = "",
                            resolution: str = "",
                            image_path: Path | str | None = None,
                            mime_type: str = "image/jpeg") -> Path:
    """Полный цикл: поставить задачу, дождаться, скачать в dest.

    Сигнатура совместима с veo_client.generate_video_and_wait, чтобы core.py
    работал без правок. Отличие одно: параметра upscale здесь нет по сути —
    у официального API апскейла нет, нужное разрешение запрашивается сразу
    (VEO_GOOGLE_RESOLUTION или аргумент resolution). Аргумент принимается и
    игнорируется молча, чтобы старые вызовы не падали.
    """
    dest = Path(dest)
    model = model or DEFAULT_MODEL
    resolution = resolution or DEFAULT_RESOLUTION

    op_name, price = start_generation(
        prompt, aspect_ratio=aspect_ratio, image_path=image_path,
        mime_type=mime_type, duration_s=duration_s, model=model,
        resolution=resolution, api_key=api_key)
    log(f"[Veo/Google] задача поставлена: {model} {resolution} "
        f"{_normalize_duration(duration_s)} с, ~${price:.2f}")

    status = wait_for_completion(op_name, api_key, poll_s, timeout_s, log)
    _spend_add(price)          # платим за готовый ролик, а не за попытку
    path = download_video(_video_uri(status), dest, api_key)
    log(f"[Veo/Google] готово: {path.name} "
        f"({path.stat().st_size / 1048576:.1f} МБ); "
        f"за сегодня ${spent_today():.2f} из ${daily_budget():.2f}")
    return path


def image_to_video_and_wait(prompt: str, image_path: Path, dest: Path,
                            aspect_ratio: str = "9:16", api_key: str = "",
                            mime_type: str = "image/jpeg", **kw) -> Path:
    """Оживление кадра: тот же цикл, но со стартовой картинкой."""
    return generate_video_and_wait(
        prompt, dest, aspect_ratio=aspect_ratio, api_key=api_key,
        image_path=image_path, mime_type=mime_type, **kw)


# ─────────────────────────── заглушки под core.py ───────────────────────────

def account_info(api_key: str = "") -> dict:
    """У официального API нет слотов и cookie — параллельность ограничена
    только квотой проекта и деньгами. Возвращаем пустое, чтобы расчёт потоков
    в core.py остался на переданном значении workers."""
    return {}


def account_usage(api_key: str = "") -> dict:
    return {"spent_today_usd": spent_today(), "daily_budget_usd": daily_budget()}


def available_models(api_key: str = "") -> list[str]:
    """Какие Veo-модели видит ключ. Бесплатный вызов — годится для проверки."""
    data = _request("GET", f"{BASE_URL}/models?pageSize=200", api_key)
    return [m["name"].split("/")[-1] for m in data.get("models", [])
            if "veo" in m.get("name", "").lower()]
