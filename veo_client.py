"""Клиент для VeoNonStop API (генерация видео Veo + картинок Banana).

Документация: https://veononstop.org (см. .env: VEO_API_KEY, VEO_BASE_URL).
"""
import os
import time
import base64
from pathlib import Path

import requests

VEO_BASE_URL = os.getenv("VEO_BASE_URL", "https://veononstop.org/api/v1")
VEO_API_KEY = os.getenv("VEO_API_KEY", "")

DONE_STATES = {"completed"}
FAILED_STATES = {"failed"}


class VeoError(RuntimeError):
    pass


def _headers(api_key: str = "") -> dict:
    key = (api_key or VEO_API_KEY).strip()
    if not key:
        raise VeoError("VEO_API_KEY не задан (см. .env)")
    return {"X-API-Key": key, "Content-Type": "application/json"}


def _request(method: str, path: str, api_key: str = "", **kw) -> dict:
    r = requests.request(method, f"{VEO_BASE_URL}{path}",
                          headers=_headers(api_key), timeout=kw.pop("timeout", 120), **kw)
    try:
        data = r.json()
    except ValueError:
        raise VeoError(f"VeoNonStop {r.status_code}: {r.text[:300]}")
    if not data.get("success", r.status_code < 400):
        raise VeoError(f"VeoNonStop {r.status_code}: {data.get('error', r.text[:300])}")
    return data.get("data", data)


def _b64_file(path: Path) -> str:
    return base64.b64encode(Path(path).read_bytes()).decode("ascii")


# ---------- Видео: постановка задач ----------

def text_to_video(prompt: str, aspect_ratio: str = "16:9", count: int = 1,
                   api_key: str = "") -> str:
    """Создаёт задачу text-to-video, возвращает task_id."""
    body = {"prompt": prompt, "aspect_ratio": aspect_ratio, "count": count}
    return _request("POST", "/video/text-to-video", api_key, json=body)["task_id"]


def image_to_video(prompt: str, image_path: Path, mime_type: str = "image/jpeg",
                    aspect_ratio: str = "9:16", count: int = 1, api_key: str = "") -> str:
    body = {
        "prompt": prompt,
        "image_base64": _b64_file(image_path),
        "mime_type": mime_type,
        "aspect_ratio": aspect_ratio,
        "count": count,
    }
    return _request("POST", "/video/image-to-video", api_key, json=body)["task_id"]


def multi_image_to_video(prompt: str, images: list[dict], aspect_ratio: str = "16:9",
                          count: int = 1, api_key: str = "") -> str:
    """images: [{"name": "Alex", "path": Path(...), "mime_type": "image/jpeg"}, ...]"""
    payload_images = [{
        "name": im["name"],
        "image_base64": _b64_file(im["path"]),
        "mime_type": im.get("mime_type", "image/jpeg"),
    } for im in images]
    body = {"prompt": prompt, "images": payload_images,
            "aspect_ratio": aspect_ratio, "count": count}
    return _request("POST", "/video/multi-image-to-video", api_key, json=body)["task_id"]


def batch_frame_to_video(prompt: str, start_image: Path, end_image: Path,
                          aspect_ratio: str = "16:9", count: int = 1, api_key: str = "") -> str:
    body = {
        "prompt": prompt,
        "start_image_base64": _b64_file(start_image),
        "end_image_base64": _b64_file(end_image),
        "aspect_ratio": aspect_ratio,
        "count": count,
    }
    return _request("POST", "/video/batch-frame", api_key, json=body)["task_id"]


def upsample_video(media_generation_id: str, video_url: str = "",
                    aspect_ratio: str = "16:9", api_key: str = "") -> str:
    body = {"media_generation_id": media_generation_id, "aspect_ratio": aspect_ratio}
    if video_url:
        body["video_url"] = video_url
    return _request("POST", "/video/upsample", api_key, json=body)["task_id"]


# ---------- Видео: статус / результат ----------

def get_status(task_id: str, api_key: str = "") -> dict:
    return _request("GET", f"/video/status/{task_id}", api_key)


def get_result(task_id: str, api_key: str = "") -> dict:
    return _request("GET", f"/video/result/{task_id}", api_key)


def cancel_task(task_id: str, api_key: str = "") -> dict:
    return _request("POST", f"/video/cancel/{task_id}", api_key)


def cancel_all(api_key: str = "") -> dict:
    return _request("POST", "/video/cancel-all", api_key)


def download_video(task_id: str, dest: Path, video_index: int = 0, api_key: str = ""):
    r = requests.get(f"{VEO_BASE_URL}/video/download/{task_id}",
                      headers=_headers(api_key), params={"video_index": video_index},
                      stream=True, timeout=300)
    if r.status_code != 200:
        raise VeoError(f"VeoNonStop download {r.status_code}: {r.text[:300]}")
    dest = Path(dest)
    with open(dest, "wb") as f:
        for chunk in r.iter_content(chunk_size=1 << 16):
            f.write(chunk)
    return dest


def wait_for_completion(task_id: str, api_key: str = "", poll_s: int = 10,
                         timeout_s: int = 1800, log=lambda *_: None) -> dict:
    """Опрашивает статус задачи до completed/failed. Возвращает data со списком videos.
    Быстрый путь: сперва пробуем get_result (может оказаться уже готов без
    единого опроса статуса). На таймауте отменяем задачу на сервере
    (cancel_task) перед тем, как сдаться — иначе слот из лимита конкурентных
    задач висит занятым до серверного таймаута (30 мин)."""
    try:
        fast = get_result(task_id, api_key)
        if fast.get("videos"):
            log(f"[VeoNonStop] {task_id}: completed (уже был готов)")
            return fast
    except Exception:
        pass
    t0 = time.time()
    while time.time() - t0 < timeout_s:
        data = get_status(task_id, api_key)
        status = data.get("status", "")
        log(f"[VeoNonStop] {task_id}: {status}")
        if status in DONE_STATES:
            return data
        if status in FAILED_STATES:
            raise VeoError(f"VeoNonStop задача {task_id} failed: {data.get('error')}")
        time.sleep(poll_s)
    try:
        cancel_task(task_id, api_key)
    except Exception:
        pass
    raise VeoError(f"VeoNonStop задача {task_id}: таймаут ожидания ({timeout_s}s)")


def generate_video_and_wait(prompt: str, dest: Path, aspect_ratio: str = "16:9",
                             api_key: str = "", poll_s: int = 10,
                             timeout_s: int = 1800, upscale: bool = True,
                             log=lambda *_: None) -> Path:
    """Text-to-video: создаёт задачу, ждёт готовности, скачивает ролик в dest.
    upscale=True (по умолчанию) — после готовности 720p-ролика запускает
    upsample_video (с video_url — быстрый FFmpeg-путь на стороне сервера,
    ~4-8 c в документации, но под параллельной нагрузкой на практике
    наблюдался апскейл дольше 180с — поэтому таймаут 420с и один повтор)
    до 1080p и скачивает уже апскейленную версию; если обе попытки не
    удались, тихо скачивает исходный 720p, а не проваливает всю генерацию."""
    task_id = text_to_video(prompt, aspect_ratio=aspect_ratio, api_key=api_key)
    data = wait_for_completion(task_id, api_key, poll_s, timeout_s, log)
    videos = data.get("videos") or []
    if upscale and videos and videos[0].get("mediaGenerationId"):
        last_err = None
        for attempt in range(2):
            try:
                up_task = upsample_video(
                    videos[0]["mediaGenerationId"],
                    video_url=videos[0].get("fifeUrl") or videos[0].get("servingBaseUri") or "",
                    aspect_ratio=aspect_ratio, api_key=api_key)
                wait_for_completion(up_task, api_key, poll_s=5, timeout_s=420, log=log)
                return download_video(up_task, dest, api_key=api_key)
            except Exception as e:
                last_err = e
                if attempt == 0:
                    log(f"[VeoNonStop] Апскейл до 1080p не вышел с первой попытки "
                        f"({e}) — пробую ещё раз")
        log(f"[VeoNonStop] Апскейл до 1080p не удался ({last_err}) — беру оригинал 720p")
    return download_video(task_id, dest, api_key=api_key)


# ---------- Картинки: Banana (синхронно) ----------

def banana_generate(prompt: str, num_images: int = 1, aspect_ratio: str = "16:9",
                     model_key: str = "GEM_PIX_2", project_id: str = "",
                     reference_images: list[dict] | None = None,
                     use_all_ref_images: bool = False, api_key: str = "") -> dict:
    """reference_images: [{"name": ..., "path": Path(...), "mime_type": ...}, ...]"""
    body = {
        "prompt": prompt,
        "num_images": num_images,
        "aspect_ratio": aspect_ratio,
        "model_key": model_key,
        "use_all_ref_images": use_all_ref_images,
    }
    if project_id:
        body["project_id"] = project_id
    if reference_images:
        body["reference_images"] = [{
            "name": im["name"],
            "image_base64": _b64_file(im["path"]),
            "mime_type": im.get("mime_type", "image/jpeg"),
        } for im in reference_images]
    return _request("POST", "/image/banana/generate", api_key, json=body, timeout=120)


def banana_upscale(media_id: str, project_id: str,
                    target_resolution: str = "UPSAMPLE_IMAGE_RESOLUTION_2K",
                    api_key: str = "") -> bytes:
    """Возвращает сырые байты JPEG апскейленного изображения."""
    body = {"media_id": media_id, "project_id": project_id,
            "target_resolution": target_resolution}
    data = _request("POST", "/image/banana/upscale", api_key, json=body, timeout=120)
    return base64.b64decode(data["encodedImage"])


# ---------- Аккаунт ----------

def account_info(api_key: str = "") -> dict:
    return _request("GET", "/account/info", api_key)


def account_usage(api_key: str = "") -> dict:
    return _request("GET", "/account/usage", api_key)
