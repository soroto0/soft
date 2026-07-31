"""Клиент для VeoNonStop API (генерация видео Veo + картинок Banana).

Документация: https://veononstop.org (см. .env: VEO_API_KEY, VEO_BASE_URL).
"""
import os
import time
import base64
import json
import threading
from pathlib import Path

import requests

VEO_BASE_URL = os.getenv("VEO_BASE_URL", "https://veononstop.org/api/v1")
VEO_API_KEY = os.getenv("VEO_API_KEY", "")

DONE_STATES = {"completed", "succeeded", "success"}
# cancelled/expired обязаны быть здесь: это ТЕРМИНАЛЬНЫЕ состояния, но раньше
# они не попадали ни в DONE, ни в FAILED — и опрос крутился до полного
# timeout_s (30 мин) на КАЖДОЙ такой задаче. Пока задачи создавались только
# в этом же запуске, состояние «cancelled» было недостижимо; с появлением
# журнала возобновления (pending_task) осиротевшие после аварийного
# завершения задачи сервер отменяет сам — и следующий запуск вставал
# на 30 минут за каждый такой кадр.
FAILED_STATES = {"failed", "cancelled", "canceled", "expired"}

# Незавершённые задачи Veo переживают закрытие приложения. Файл создаётся
# внутри папки конкретного проекта, поэтому задачи разных роликов не смешаны.
_TASK_STORE: Path | None = None
_TASK_LOCK = threading.RLock()


class VeoError(RuntimeError):
    pass


def configure_task_store(project_dir: Path | str | None) -> None:
    """Включает журнал незавершённых Veo-задач для одного проекта."""
    global _TASK_STORE
    with _TASK_LOCK:
        _TASK_STORE = (Path(project_dir) / "veo_tasks.json") if project_dir else None


def _load_tasks() -> dict:
    if not _TASK_STORE or not _TASK_STORE.exists():
        return {}
    try:
        data = json.loads(_TASK_STORE.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except (OSError, ValueError):
        return {}


def _save_tasks(tasks: dict) -> None:
    if not _TASK_STORE:
        return
    _TASK_STORE.parent.mkdir(parents=True, exist_ok=True)
    tmp = _TASK_STORE.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(tasks, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(tmp, _TASK_STORE)


# Задачи Veo живут на сервере ~30 мин, но запись нужна дольше самой
# задачи: ожидание до 30 мин плюс апскейл с повторами. TTL с запасом,
# чтобы НЕ удалить запись задачи, которая ещё в работе, и при этом
# не копить осиротевшие записи вечно.
TASK_TTL_S = 6 * 3600


def pending_task(dest: Path, kind: str) -> str:
    """Возвращает ID ранее отправленной, но ещё не скачанной задачи.
    Просроченные записи (старше TASK_TTL_S) игнорируются: на сервере такой
    задачи давно нет, а раньше её всё равно пытались дождаться."""
    with _TASK_LOCK:
        item = _load_tasks().get(str(Path(dest).resolve())) or {}
        if item.get("kind") != kind:
            return ""
        created = item.get("created_at")
        if created:
            try:
                if time.time() - float(created) > TASK_TTL_S:
                    return ""
            except (TypeError, ValueError):
                pass
        return str(item.get("task_id", ""))


def track_task(task_id: str, dest: Path, kind: str) -> None:
    """Сохраняет ID сразу после отправки задачи, до начала ожидания."""
    with _TASK_LOCK:
        tasks = _load_tasks()
        tasks[str(Path(dest).resolve())] = {
            "task_id": task_id, "kind": kind, "created_at": int(time.time()),
        }
        _save_tasks(tasks)


def finish_task(dest: Path) -> None:
    """Удаляет запись только после успешного скачивания результата."""
    with _TASK_LOCK:
        tasks = _load_tasks()
        tasks.pop(str(Path(dest).resolve()), None)
        _save_tasks(tasks)


def pending_tasks() -> list[dict]:
    """Копия журнала задач текущего проекта, без ключей API. Просроченные
    записи не возвращаются И вычищаются с диска: иначе осиротевшие записи
    (имя файла кадра зависит от запроса, а он меняется между прогонами)
    копились вечно, и интерфейс навсегда показывал «Сохранено задач Veo: N»."""
    now = time.time()
    with _TASK_LOCK:
        tasks = _load_tasks()
        fresh, expired = {}, 0
        for dest, item in tasks.items():
            created = item.get("created_at")
            try:
                stale = created is not None and now - float(created) > TASK_TTL_S
            except (TypeError, ValueError):
                stale = False
            if stale:
                expired += 1
            else:
                fresh[dest] = item
        if expired:
            _save_tasks(fresh)
        return [dict(item, dest=dest) for dest, item in fresh.items()]


def cancel_pending_tasks(api_key: str = "") -> int:
    """Отменяет только задачи текущего проекта, а не всего аккаунта Veo."""
    cancelled = 0
    for item in pending_tasks():
        task_id = str(item.get("task_id", ""))
        if not task_id:
            continue
        try:
            cancel_task(task_id, api_key)
            cancelled += 1
        except Exception:
            # Уже готовая/удалённая задача не должна блокировать отмену.
            pass
        finally:
            finish_task(Path(str(item["dest"])))
    return cancelled


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
        status = str(data.get("status", "")).strip().lower()
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
    dest = Path(dest)
    task_id = pending_task(dest, "text-to-video")
    if task_id:
        log(f"[VeoNonStop] Продолжаю сохранённую задачу {task_id}")
    else:
        task_id = text_to_video(prompt, aspect_ratio=aspect_ratio, api_key=api_key)
        track_task(task_id, dest, "text-to-video")
    try:
        data = wait_for_completion(task_id, api_key, poll_s, timeout_s, log)
    except Exception:
        # Failed/cancelled task нельзя пытаться «продолжать» при следующем
        # запуске: тогда новая попытка никогда не будет создана.
        finish_task(dest)
        raise
    videos = data.get("videos") or []
    if upscale and videos and videos[0].get("mediaGenerationId"):
        last_err = None
        for attempt in range(2):
            try:
                up_task = upsample_video(
                    videos[0]["mediaGenerationId"],
                    video_url=videos[0].get("fifeUrl") or videos[0].get("servingBaseUri") or "",
                    aspect_ratio=aspect_ratio, api_key=api_key)
                # Апскейл — такая же задача Veo, занимающая слот. Без записи в
                # журнал «Стоп» её не отменял: cancel_pending_tasks ходит
                # только по журналу и гасил уже завершённую text-to-video,
                # а апскейл висел на сервере до своего таймаута.
                track_task(up_task, dest, "text-to-video")
                wait_for_completion(up_task, api_key, poll_s=5, timeout_s=420, log=log)
                result = download_video(up_task, dest, api_key=api_key)
                finish_task(dest)
                return result
            except Exception as e:
                last_err = e
                if attempt == 0:
                    log(f"[VeoNonStop] Апскейл до 1080p не вышел с первой попытки "
                        f"({e}) — пробую ещё раз")
        log(f"[VeoNonStop] Апскейл до 1080p не удался ({last_err}) — беру оригинал 720p")
    result = download_video(task_id, dest, api_key=api_key)
    finish_task(dest)
    return result


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
