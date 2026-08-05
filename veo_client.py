"""Клиент для VeoNonStop API (генерация видео Veo + картинок Banana).

Документация: https://veononstop.org (см. .env: VEO_API_KEY, VEO_BASE_URL).
"""
import os
import time
import base64
import hashlib
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
    """status — код HTTP-ответа, если ошибка пришла от сервера.

    Нужен опросу готовности, чтобы отличать «сервер сейчас занят» (429, 5xx —
    задача продолжает считаться) от «задача не существует/запрос неверный»
    (4xx). Без этого различия любой разовый 502 обрывал ожидание, а вызывающий
    код считал это провалом задачи."""

    def __init__(self, message: str, status: int = 0):
        super().__init__(message)
        self.status = status


def configure_task_store(project_dir: Path | str | None) -> None:
    """Включает журнал незавершённых Veo-задач для одного проекта."""
    global _TASK_STORE
    with _TASK_LOCK:
        _TASK_STORE = (Path(project_dir) / "veo_tasks.json") if project_dir else None


def _complain(what: str, why: str = "", hint: str = "",
              level: str = "заметно") -> None:
    """Сказать в сводку прогона, что с генерацией видео что-то пошло не так.

    Обёртка нужна, потому что журнал (callback log) есть далеко не у всех
    функций этого файла, а сводка деградаций одна на прогон и печатается
    последними строками. Сюда идёт то, что видно зрителю (кадр вышел хуже
    качеством) или стоит денег и слотов Veo — по правилу quality.py.
    """
    try:
        import quality
        quality.degraded("Видео Veo", what, why=why, hint=hint, level=level)
    except Exception:
        pass


def _load_tasks() -> dict:
    if not _TASK_STORE or not _TASK_STORE.exists():
        return {}                      # задач ещё не ставили — норма
    try:
        data = json.loads(_TASK_STORE.read_text(encoding="utf-8"))
    except (OSError, ValueError) as e:
        # Испорченный журнал раньше был неотличим от пустого, и это стоило
        # денег: незавершённые задачи Veo остаются жить на сервере, «Стоп»
        # ищет их ТОЛЬКО по этому файлу, а следующий запуск, не найдя записи,
        # ставит те же кадры заново. То есть кадр оплачивается дважды, а
        # первый висит в лимите конкурентных задач (их всего два слота).
        _complain("журнал незавершённых задач Veo потерян — уже отправленные "
                  "кадры будут сгенерированы заново",
                  why=f"{_TASK_STORE.name}: {e}",
                  hint="нажми «Отменить все задачи Veo» в интерфейсе — иначе "
                       "прежние задачи будут держать слоты до своего таймаута",
                  level="критично")
        return {}
    if not isinstance(data, dict):
        _complain("журнал незавершённых задач Veo потерян — уже отправленные "
                  "кадры будут сгенерированы заново",
                  why=f"{_TASK_STORE.name}: ожидался объект, "
                      f"а лежит {type(data).__name__}",
                  hint="нажми «Отменить все задачи Veo» в интерфейсе",
                  level="критично")
        return {}
    return data


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
    cancelled, lost = 0, 0
    for item in pending_tasks():
        task_id = str(item.get("task_id", ""))
        if not task_id:
            continue
        drop = True
        try:
            cancel_task(task_id, api_key)
            cancelled += 1
        except VeoError as e:
            # Разбираем ОТКАЗ ПО КОДУ, а не «любая ошибка — забыли и пошли
            # дальше». 4xx кроме 429 означает, что задачи на сервере уже нет
            # (готова, отменена, истекла) — запись можно смело убирать.
            # А 429, 5xx и обрыв связи означают ровно обратное: задача жива и
            # ЖРЁТ ОДИН ИЗ ДВУХ СЛОТОВ. Раньше запись стиралась и в этом
            # случае, и отменить такую задачу становилось нечем — «Стоп»
            # ходит только по журналу. Человек видел «остановлено», а Veo
            # продолжал считать оплаченный кадр до серверного таймаута.
            drop = bool(e.status) and e.status != 429 and e.status < 500
            if not drop:
                lost += 1
        except Exception:
            drop = False
            lost += 1
        finally:
            if drop:
                finish_task(Path(str(item["dest"])))
    if lost:
        _complain(f"не удалось отменить задач Veo: {lost}",
                  why="сервер не ответил на отмену — эти задачи продолжают "
                      "считаться и держать слоты генерации",
                  hint="повтори «Стоп» через минуту; записи о них оставлены "
                       "в veo_tasks.json, поэтому отмена ещё возможна",
                  level="заметно")
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
        raise VeoError(f"VeoNonStop {r.status_code}: {r.text[:300]}", r.status_code)
    if not data.get("success", r.status_code < 400):
        raise VeoError(f"VeoNonStop {r.status_code}: {data.get('error', r.text[:300])}",
                       r.status_code)
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
        raise VeoError(f"VeoNonStop download {r.status_code}: {r.text[:300]}",
                       r.status_code)
    dest = Path(dest)
    dest.parent.mkdir(parents=True, exist_ok=True)
    # Качаем в .part и переименовываем в конце. Раньше писали прямо в dest, и
    # оборванная закачка оставляла на месте готового ролика обрезанный файл:
    # он проходил и как «файл уже есть» при возобновлении, и дальше в монтаж —
    # ролик собирался с битым кадром без единой ошибки в журнале.
    tmp = dest.with_name(dest.name + ".part")
    got = 0
    try:
        with open(tmp, "wb") as f:
            for chunk in r.iter_content(chunk_size=1 << 16):
                f.write(chunk)
                got += len(chunk)
        # Content-Length сверяем только без перекодировки на лету: при gzip
        # заголовок описывает сжатый размер, а на диск лёг распакованный.
        expected = int(r.headers.get("Content-Length") or 0)
        if not r.headers.get("Content-Encoding") and expected and got != expected:
            raise VeoError(f"VeoNonStop download {task_id}: скачано {got} байт "
                           f"из {expected} — файл неполный")
        if not got:
            raise VeoError(f"VeoNonStop download {task_id}: пустой ответ")
        os.replace(tmp, dest)
    finally:
        # недокачанный кусок не должен пережить ошибку и быть принят за ролик
        try:
            tmp.unlink(missing_ok=True)
        except OSError:
            pass
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
    errors = 0
    while time.time() - t0 < timeout_s:
        try:
            data = get_status(task_id, api_key)
        except VeoError as e:
            # 429/5xx и обрыв связи — это «сервер занят», а НЕ провал задачи:
            # она продолжает считаться и держать слот. Раньше такая ошибка
            # летела наружу, вызывающий код (generate_video_and_wait, core)
            # стирал запись из журнала — и задача оставалась висеть на сервере,
            # но кнопка «Стоп» её уже не находила, потому что ходит по журналу.
            # 4xx кроме 429 (нет такой задачи, неверный ключ) повторять
            # бессмысленно — они не рассосутся.
            if e.status and e.status != 429 and e.status < 500:
                raise
            errors += 1
            # Три причины ждать выглядят одинаково («не удалось»), а означают
            # РАЗНОЕ и лечатся по-разному: лимит надо переждать или сменить
            # ключ, лежащий сервер — только переждать, обрыв связи — починить
            # сеть. По журналу они были неотличимы, и разбор ночного прогона
            # каждый раз начинался с гадания, во что именно упёрлись.
            kind = ("упёрся в лимит запросов (429)" if e.status == 429
                    else f"сервер VeoNonStop не отвечает ({e.status or 'без кода'})")
            if errors > 5:
                log(f"[VeoNonStop] {task_id}: {kind}, 6 попыток подряд — "
                    f"сдаюсь ({e})")
                raise
            log(f"[VeoNonStop] {task_id}: {kind} — повтор {errors}/5 ({e})")
            time.sleep(poll_s)
            continue
        except requests.RequestException as e:
            errors += 1
            if errors > 5:
                log(f"[VeoNonStop] {task_id}: связь с VeoNonStop не "
                    f"восстановилась за 6 попыток — сдаюсь ({e})")
                raise
            log(f"[VeoNonStop] {task_id}: связь оборвалась ({e}) — "
                f"повтор {errors}/5")
            time.sleep(poll_s)
            continue
        errors = 0
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
    if upscale and not (videos and videos[0].get("mediaGenerationId")):
        # Сервер сказал «готово», но не дал, ЧТО апскейлить. Кадр останется
        # 720p и в ролике будет заметно мягче соседних — а раньше об этом не
        # говорилось ни строчки: ветка апскейла просто не выполнялась.
        log(f"[VeoNonStop] {task_id}: ответ без mediaGenerationId — "
            "апскейл до 1080p невозможен, беру 720p")
        _complain("часть кадров осталась в 720p вместо 1080p",
                  why="VeoNonStop вернул готовую задачу без "
                      "mediaGenerationId, апскейлить нечего",
                  hint="кадр мягче соседних; если таких много — перегенерируй "
                       "эти планы позже, апскейл обычно работает",
                  level="заметно")
    if upscale and videos and videos[0].get("mediaGenerationId"):
        last_err = None
        for attempt in range(2):
            up_task = ""
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
                # Гасим апскейл сами, а не через журнал: дальше по коду идёт
                # finish_task(dest), запись исчезает — и «Стоп» уже не найдёт
                # эту задачу, а она может быть жива (ошибка опроса, не провал)
                # и держать один из двух слотов Veo.
                if up_task:
                    try:
                        cancel_task(up_task, api_key)
                    except Exception:
                        pass
                if attempt == 0:
                    log(f"[VeoNonStop] Апскейл до 1080p не вышел с первой попытки "
                        f"({e}) — пробую ещё раз")
        log(f"[VeoNonStop] Апскейл до 1080p не удался ({last_err}) — беру оригинал 720p")
        # Это ВИДНО ЗРИТЕЛЮ: 720p-кадр растягивается рендером до 1080p и в
        # ролике читается заметно мягче соседних, снятых или апскейленных.
        # Раньше про откат говорила одна строка среди сотен, а «готово» в
        # конце выглядело одинаково и с апскейлом, и без него.
        _complain("часть кадров осталась в 720p вместо 1080p",
                  why=f"апскейл не прошёл с двух попыток: {last_err}",
                  hint="чаще всего это занятые слоты Veo или таймаут — "
                       "перегенерируй эти планы, когда очередь освободится",
                  level="заметно")
    result = download_video(task_id, dest, api_key=api_key)
    finish_task(dest)
    return result


# ---------- Суточный лимит КАРТИНОК ----------
#
# С 2026-08-05 VeoNonStop ограничивает число картинок в сутки по тарифу
# (4 потока — 500, 12 — 1500, 24 — 3000): «есть лимиты на генерацию на самих
# аккаунтах гугл, а также аккаунтов дефицит».
#
# ЛИМИТ ТОЛЬКО НА КАРТИНКИ. Владелец спросил сервис прямо — ответ дословно
# «только картинки», и /account/usage это подтверждает живьём: video_limit и
# video_remaining приходят null, а image_limit — числом. Поэтому здесь нет и
# не должно быть НИ ОДНОЙ проверки для text_to_video: при VEO_VIDEO_RATIO=1
# вся раскадровка идёт живым видео, и «на всякий случай» придушенное видео
# означало бы возврат к стоковым роликам, с которыми боролись неделю.
#
# Числа НЕ зашиты: сервис прямо предупредил, что «лимиты не окончательные и
# возможно будут изменяться в лучшую сторону». Всё берём из ответа, а из
# констант — только политика (сколько беречь под что), и та с env.
#
# Живой ответ /account/usage на 2026-08-05 (одинаковый на основном домене и
# на европейском зеркале):
#   {"video_used": 0, "video_limit": null, "video_remaining": null,
#    "image_used": 19, "image_limit": 500, "image_remaining": 481,
#    "unlimited": false, "resets_in_seconds": 53726}
#
# ВНИМАНИЕ на будущее: этим же ответом сервис ВЫКИНУЛ прежние поля
# (cookies_allocated, active_tasks, completed_tasks, failed_tasks,
# max_concurrent_tasks). Код, который их читал, теперь везде получает 0 —
# см. подбор числа потоков в core.

# Оценка расхода живёт рядом с кодом, а не в папке ролика: лимит суточный и
# общий на аккаунт, а роликов за ночь несколько.
_IMAGE_LEDGER = Path(__file__).resolve().parent / ".veo_image_usage.json"
_IMAGE_LOCK = threading.RLock()


def _key_id(api_key: str = "") -> str:
    """Короткий отпечаток ключа: лимит считается НА АККАУНТ, а ключей у нас
    несколько (VEO_API_KEY, VEO_API_KEY2, ...) и они ротируются. Храним хеш,
    а не сам ключ и не его хвост — файл лежит на диске рядом с кодом."""
    key = (api_key or VEO_API_KEY).strip()
    return hashlib.sha1(key.encode("utf-8")).hexdigest()[:12] if key else "-"


def _as_int(v) -> int | None:
    """None остаётся None: у «сервис не сказал» и «сказал ноль» разный смысл —
    первое значит «считай сам», второе «картинок больше нет»."""
    if v is None:
        return None
    try:
        return int(v)
    except (TypeError, ValueError):
        return None


def note_images_spent(n: int = 1, api_key: str = "") -> None:
    """Отметить потраченные картинки в местной оценке.

    Нужна ТОЛЬКО как запасной путь: если сервис перестанет отдавать остаток
    (уберёт поля, отдаст 503), софт всё равно должен понимать, сколько
    израсходовал сам, — и честно называть это оценкой, а не фактом.
    """
    if n <= 0:
        return
    day = time.strftime("%Y-%m-%d")
    with _IMAGE_LOCK:
        data = {}
        try:
            data = json.loads(_IMAGE_LEDGER.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            data = {}
        if not isinstance(data, dict) or data.get("day") != day:
            data = {"day": day, "spent": {}}   # новые сутки — счёт с нуля
        spent = data.setdefault("spent", {})
        kid = _key_id(api_key)
        spent[kid] = int(spent.get(kid, 0) or 0) + int(n)
        try:
            tmp = _IMAGE_LEDGER.with_suffix(".json.tmp")
            tmp.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
            os.replace(tmp, _IMAGE_LEDGER)
        except OSError:
            pass       # оценка — не повод ронять генерацию


def images_spent_today(api_key: str = "") -> int:
    """Сколько картинок этот ключ потратил за сегодня ПО НАШЕМУ СЧЁТУ."""
    day = time.strftime("%Y-%m-%d")
    with _IMAGE_LOCK:
        try:
            data = json.loads(_IMAGE_LEDGER.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return 0
    if not isinstance(data, dict) or data.get("day") != day:
        return 0
    try:
        return int((data.get("spent") or {}).get(_key_id(api_key), 0) or 0)
    except (TypeError, ValueError):
        return 0


def image_quota(api_key: str = "") -> dict:
    """Остаток суточного лимита КАРТИНОК одним понятным словарём.

    Всегда возвращает словарь, никогда не бросает: остаток нужен для решения
    «начинать ли шаг», и падение на этой проверке было бы хуже самого лимита.

      exact=True   — числа пришли от сервиса, это факт;
      exact=False  — сервис промолчал, remaining посчитан по нашей оценке
                     расхода и подписан как оценка;
      unlimited    — лимита нет (сервис снял или ещё не ввёл).
    """
    out = {"limit": None, "used": None, "remaining": None, "unlimited": False,
           "resets_in_s": None, "exact": False, "why": ""}
    data = {}
    try:
        data = account_usage(api_key) or {}
    except Exception as e:
        out["why"] = f"сервис не ответил про лимит ({e})"
    limit = _as_int(data.get("image_limit"))
    used = _as_int(data.get("image_used"))
    left = _as_int(data.get("image_remaining"))
    if left is None and limit is not None and used is not None:
        left = max(0, limit - used)
    # «Безлимит» опознаём и по флагу, и по отсутствию чисел при живом ответе:
    # если сервис снимет лимит, он скорее уберёт image_limit, чем выставит
    # unlimited — а нам нельзя при этом считать, что картинок ноль.
    if data and (data.get("unlimited") is True
                 or (limit is None and left is None)):
        out.update(unlimited=True, exact=True,
                   why=out["why"] or "сервис лимита на картинки не объявляет")
        return out
    out["resets_in_s"] = _as_int(data.get("resets_in_seconds"))
    if left is not None:
        out.update(limit=limit, used=used, remaining=left, exact=True)
        return out
    # Сервис не сказал — считаем сами. Это ОЦЕНКА: чужие запуски и ручные
    # генерации мимо этого софта в неё не попадают.
    spent = images_spent_today(api_key)
    out.update(limit=limit, used=spent,
               remaining=(max(0, limit - spent) if limit is not None else None),
               exact=False,
               why=out["why"] or "сервис не вернул остаток картинок")
    return out


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
    data = _request("POST", "/image/banana/generate", api_key, json=body, timeout=120)
    # ЕДИНСТВЕННАЯ ТОЧКА, ГДЕ ТРАТИТСЯ КАРТИНКА. Через неё проходят все пути
    # без исключения: обложки, кадры раскадровки и «картинка → видео» (там
    # картинка сперва рождается здесь, а image_to_video уже видеозадача и под
    # лимит не попадает). Поэтому счётчик стоит здесь, а не у вызывающих: их
    # можно забыть обновить при следующей правке, а этот вызов — нельзя.
    # Считаем ФАКТИЧЕСКИ выданные картинки, а не заказанные: сервис вправе
    # вернуть меньше, и списывать с себя лишнее незачем.
    try:
        note_images_spent(len(data.get("media") or []) or num_images, api_key)
    except Exception:
        pass       # учёт вспомогательный, генерацию он ронять не должен
    return data


def banana_upscale(media_id: str, project_id: str,
                    target_resolution: str = "UPSAMPLE_IMAGE_RESOLUTION_2K",
                    api_key: str = "") -> bytes:
    """Возвращает сырые байты JPEG апскейленного изображения.

    В местную оценку расхода апскейл НЕ засчитывается: объявлен лимит на
    «генерацию изображений», а увеличение готовой картинки — не генерация.
    Проверить это можно было бы только потратив картинку, поэтому оставлено
    как есть; на фактический остаток от сервиса такое допущение не влияет,
    а по умолчанию (VEO_UPSCALE=local) сюда вообще не заходят."""
    body = {"media_id": media_id, "project_id": project_id,
            "target_resolution": target_resolution}
    data = _request("POST", "/image/banana/upscale", api_key, json=body, timeout=120)
    return base64.b64decode(data["encodedImage"])


# ---------- Аккаунт ----------

def account_info(api_key: str = "") -> dict:
    return _request("GET", "/account/info", api_key)


def account_usage(api_key: str = "") -> dict:
    return _request("GET", "/account/usage", api_key)
