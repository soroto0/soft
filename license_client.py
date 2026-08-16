# -*- coding: utf-8 -*-
"""Лицензия на стороне покупателя: проверка ключа и обновление библиотеки.

Живёт в корне проекта, потому что это часть приложения, а не сервера.
Никаких зависимостей сверх стандартной библиотеки — покупателю и так ставить
три гигабайта, добавлять ему поводов для сбоя не нужно.

Как это выглядит в жизни:

    import license_client
    state = license_client.check()          # пускать или нет
    if state.ok:
        license_client.sync_library()       # подтянуть свежие плашки и сцены

Что важно понимать про честность этой защиты. Исходники у покупателя открыты,
и проверку он при желании вырежет. Смысл не в том, чтобы это запретить, а в
том, что вырезанная проверка не даёт доступа к библиотеке: плашки и сцены
лежат на сервере и обновляются. Через месяц-другой снятая копия отстаёт,
и подписка становится дешевле возни.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import math
import os
import shutil
import subprocess
import tempfile
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path

import license_verify

ROOT = Path(__file__).resolve().parent
CONFIG_PATH = ROOT / "license.json"
CACHE_PATH = ROOT / ".license_cache.json"

DEFAULT_SERVER = "http://127.0.0.1:8787"
OFFLINE_GRACE_DAYS = 7
TIMEOUT = 20

# Внутрь пака кладём только эти ветки. Всё остальное — попытка залезть
# не туда, и мы её не исполняем.
ALLOWED_PREFIXES = ("variants.json", "remotion/src/variants/", "remotion/src/scenes/")


# ─────────────────────────────── состояние ───────────────────────────────

@dataclass
class State:
    ok: bool
    reason: str = ""
    code: str = ""
    plan: str = ""
    expires_at: str | None = None
    perpetual: bool = False
    videos_left: int = 0
    videos_per_month: int = 0
    pack_version: str | None = None
    offline: bool = False
    raw: dict = field(default_factory=dict)

    @property
    def days_left(self) -> int | None:
        if not self.expires_at:
            return None
        # Округляем вверх: купив тридцать дней, покупатель должен увидеть
        # «осталось 30», а не «29» из-за пары секунд, ушедших на выпуск ключа.
        left = (datetime.fromisoformat(self.expires_at) - _now()).total_seconds()
        return math.ceil(left / 86400)

    def human(self) -> str:
        """Строка для заголовка окна."""
        if not self.ok:
            return f"Лицензия: {self.reason}"
        if self.perpetual:
            tail = "бессрочно"
        else:
            tail = f"осталось {self.days_left} дн."
        offline = ", работа без сети" if self.offline else ""
        return f"{self.plan} — {tail}, роликов: {self.videos_left}{offline}"


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ─────────────────────────── отпечаток машины ───────────────────────────

def machine_id() -> str:
    """Устойчивый отпечаток компьютера.

    На Windows берём MachineGuid — он переживает смену железа и не меняется
    от перезагрузки. Если реестр недоступен, откатываемся на MAC-адрес:
    хуже, но лучше, чем ничего.
    """
    guid = ""
    try:
        out = subprocess.check_output(
            ["reg", "query", r"HKLM\SOFTWARE\Microsoft\Cryptography", "/v", "MachineGuid"],
            stderr=subprocess.DEVNULL,
            text=True,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
        guid = out.strip().split()[-1]
    except (OSError, subprocess.SubprocessError, IndexError):
        import uuid

        guid = f"mac-{uuid.getnode()}"
    return hashlib.sha256(guid.encode()).hexdigest()[:16]


# ───────────────────────────── настройки ─────────────────────────────

def load_config() -> dict:
    """Ключ и адрес сервера. Переменные окружения главнее файла."""
    cfg = {"server": DEFAULT_SERVER, "key": ""}
    if CONFIG_PATH.exists():
        try:
            cfg.update(json.loads(CONFIG_PATH.read_text(encoding="utf-8")))
        except (OSError, ValueError):
            pass
    cfg["server"] = os.environ.get("KF_LICENSE_SERVER", cfg["server"]).rstrip("/")
    cfg["key"] = normalize_key(os.environ.get("KF_LICENSE_KEY", cfg["key"]))
    return cfg


def normalize_key(key: str) -> str:
    """Причесать ключ, введённый человеком.

    Короткий серверный `kf-79zt-...` поднимаем в верхний регистр — его
    диктуют и переписывают руками, и регистр там ничего не значит. А
    оффлайн-лицензия закодирована base64, где «A» и «a» — разные символы:
    её трогать нельзя, иначе подпись перестанет сходиться.
    """
    key = key.strip()
    return key if license_verify.looks_offline(key) else key.upper()


def save_config(key: str, server: str | None = None) -> None:
    cfg = load_config()
    cfg["key"] = normalize_key(key)
    if server:
        cfg["server"] = server.rstrip("/")
    CONFIG_PATH.write_text(json.dumps(cfg, ensure_ascii=False, indent=2), encoding="utf-8")


# ─────────────────────────── кэш на случай без сети ───────────────────────────

def _cache_secret() -> bytes:
    """Ключ подписи кэша, привязанный к машине.

    Не крипто-защита — от неё тут толку мало при открытых исходниках. Это
    заслон от простого: скопировать чужой кэш или подправить дату в блокноте.
    """
    return hashlib.sha256(f"kf-cache-{machine_id()}".encode()).digest()


def _cache_write(state: dict) -> None:
    payload = {"state": state, "at": _now().isoformat(timespec="seconds")}
    raw = json.dumps(payload, sort_keys=True, ensure_ascii=False)
    payload["sig"] = hmac.new(_cache_secret(), raw.encode(), hashlib.sha256).hexdigest()
    try:
        CACHE_PATH.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    except OSError:
        pass


def _cache_read() -> dict | None:
    if not CACHE_PATH.exists():
        return None
    try:
        payload = json.loads(CACHE_PATH.read_text(encoding="utf-8"))
        sig = payload.pop("sig", "")
        raw = json.dumps(payload, sort_keys=True, ensure_ascii=False)
        expect = hmac.new(_cache_secret(), raw.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expect, sig):
            return None
        if _now() - datetime.fromisoformat(payload["at"]) > timedelta(days=OFFLINE_GRACE_DAYS):
            return None
        return payload["state"]
    except (OSError, ValueError, KeyError):
        return None


# ─────────────────────────── обращения к серверу ───────────────────────────

def _post(server: str, path: str, body: dict) -> tuple[int, dict]:
    req = urllib.request.Request(
        f"{server}{path}",
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        try:
            return exc.code, json.loads(exc.read().decode("utf-8"))
        except (ValueError, OSError):
            return exc.code, {"ok": False, "reason": f"Сервер ответил {exc.code}",
                              "code": "http_error"}


def check() -> State:
    """Проверить лицензию. Зовётся при запуске приложения.

    Два вида ключей. Короткий `KF-XXXX-XXXX-XXXX` — подписка, её проверяет
    сервер. Длинный — оффлайн-лицензия «навсегда», она проверяется прямо
    здесь подписью, и никакой сети для этого не нужно.
    """
    cfg = load_config()
    if not cfg["key"]:
        return State(False, "Ключ не введён. Вставь ключ, который прислал продавец.",
                     "no_key")

    if license_verify.looks_offline(cfg["key"]):
        try:
            data = license_verify.verify(cfg["key"], machine_id())
        except license_verify.BadLicense as exc:
            return State(False, str(exc), "bad_license")
        return State(**_state_kwargs(data))

    try:
        status, data = _post(cfg["server"], "/api/verify",
                             {"key": cfg["key"], "machine_id": machine_id()})
    except (urllib.error.URLError, TimeoutError, OSError):
        cached = _cache_read()
        if cached:
            return State(**{**_state_kwargs(cached), "offline": True})
        return State(
            False,
            "Нет связи с сервером лицензий, а сохранённая проверка устарела. "
            f"Подключись к интернету — программа работает без сети до {OFFLINE_GRACE_DAYS} дней.",
            "offline",
        )

    if status != 200 or not data.get("ok"):
        # Отказ сервера — окончательный: кэшем его не обойти.
        CACHE_PATH.unlink(missing_ok=True)
        return State(False, data.get("reason", "Отказано"), data.get("code", "denied"))

    _cache_write(data)
    return State(**_state_kwargs(data))


def _state_kwargs(data: dict) -> dict:
    return {
        "ok": True,
        "plan": data.get("plan", ""),
        "expires_at": data.get("expires_at"),
        "perpetual": bool(data.get("perpetual")),
        "videos_left": int(data.get("videos_left", 0)),
        "videos_per_month": int(data.get("videos_per_month", 0)),
        "pack_version": data.get("pack_version"),
        "raw": data,
    }


def consume_video() -> State:
    """Списать ролик. Зовётся после того, как готовый файл лёг на диск."""
    cfg = load_config()
    if license_verify.looks_offline(cfg["key"]):
        # Лицензия «навсегда» ничего не считает: считать некому и незачем.
        return State(True, "", "offline_license")
    try:
        status, data = _post(cfg["server"], "/api/consume",
                             {"key": cfg["key"], "machine_id": machine_id()})
    except (urllib.error.URLError, TimeoutError, OSError):
        # Без сети не наказываем: ролик уже сделан, а связь — не его вина.
        return State(True, "Расход не записан: нет связи", "offline", offline=True)
    if status != 200 or not data.get("ok"):
        return State(False, data.get("reason", "Отказано"), data.get("code", "denied"))
    return State(**_state_kwargs(data))


# ─────────────────────── обновление библиотеки ───────────────────────

def local_pack_version() -> str | None:
    marker = ROOT / ".pack_version"
    return marker.read_text(encoding="utf-8").strip() if marker.exists() else None


def _safe_members(zf: zipfile.ZipFile) -> list[str]:
    """Отсеять всё, что лезет за пределы разрешённых веток.

    Zip умеет носить пути вида `../../windows/system32`. Мы такие не
    распаковываем — берём только то, за чем пришли.
    """
    out = []
    for name in zf.namelist():
        if name.endswith("/"):
            continue
        if name in ("_manifest.json", "_stamp.json"):
            continue
        normalized = name.replace("\\", "/")
        if ".." in normalized.split("/") or normalized.startswith("/"):
            continue
        if not normalized.startswith(ALLOWED_PREFIXES):
            continue
        out.append(name)
    return out


def sync_library(force: bool = False) -> tuple[bool, str]:
    """Скачать свежую библиотеку плашек и сцен, если на сервере новее.

    Возвращает (обновилось, сообщение для лога).
    """
    cfg = load_config()
    if license_verify.looks_offline(cfg["key"]):
        # У бессрочной лицензии сервера нет вовсе: библиотека остаётся той,
        # что пришла в установщике. Так и написано в оффере.
        return False, "Лицензия «Навсегда»: библиотека обновляется вручную"

    mid = machine_id()
    params = urllib.parse.urlencode({"key": cfg["key"], "machine_id": mid})

    try:
        with urllib.request.urlopen(
            f"{cfg['server']}/api/pack/manifest?{params}", timeout=TIMEOUT
        ) as resp:
            manifest = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        try:
            reason = json.loads(exc.read().decode("utf-8")).get("reason", str(exc))
        except (ValueError, OSError):
            reason = str(exc)
        return False, f"Библиотека не обновлена: {reason}"
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        return False, f"Библиотека не обновлена, нет связи: {exc}"

    remote = manifest.get("version")
    if not force and remote == local_pack_version():
        return False, f"Библиотека уже свежая ({remote})"

    try:
        with urllib.request.urlopen(
            f"{cfg['server']}/api/pack/download?{params}", timeout=TIMEOUT * 6
        ) as resp:
            blob = resp.read()
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, OSError) as exc:
        return False, f"Не удалось скачать библиотеку: {exc}"

    with tempfile.TemporaryDirectory() as tmp:
        tmp_zip = Path(tmp) / "pack.zip"
        tmp_zip.write_bytes(blob)
        try:
            with zipfile.ZipFile(tmp_zip) as zf:
                members = _safe_members(zf)
                if not members:
                    return False, "В паке нет ожидаемых файлов — обновление отменено"
                staging = Path(tmp) / "unpacked"
                for name in members:
                    target = staging / name
                    target.parent.mkdir(parents=True, exist_ok=True)
                    with zf.open(name) as src, open(target, "wb") as dst:
                        shutil.copyfileobj(src, dst)
        except zipfile.BadZipFile:
            return False, "Пак повреждён — обновление отменено"

        # Переносим в проект только после того, как весь пак распакован
        # без ошибок: иначе можно остаться с половиной новой библиотеки.
        for name in members:
            dest = ROOT / name
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(staging / name, dest)

    (ROOT / ".pack_version").write_text(remote, encoding="utf-8")
    notes = manifest.get("notes") or ""
    tail = f" — {notes}" if notes else ""
    return True, f"Библиотека обновлена до {remote}, файлов: {len(members)}{tail}"


if __name__ == "__main__":
    # Ручная проверка: python license_client.py
    st = check()
    print(f"Отпечаток машины: {machine_id()}")
    print(f"Лицензия: {st.human()}")
    if st.ok:
        changed, msg = sync_library()
        print(msg)
