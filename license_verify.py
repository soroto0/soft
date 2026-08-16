# -*- coding: utf-8 -*-
"""Формат оффлайн-лицензии и её проверка.

Живёт в корне проекта, потому что уезжает к покупателю вместе с программой:
проверять ключ надо на его машине, без всякого интернета.

Выписывает ключи `licensing/signing.py` — он берёт формат отсюда же, чтобы
две половины не разошлись. Секретный ключ остаётся у владельца, здесь только
проверка публичным.
"""
from __future__ import annotations

import base64
import struct
from datetime import datetime, timedelta, timezone
from pathlib import Path

FORMAT_VERSION = 1
# версия(1) + отпечаток(8) + тариф(1) + срок в днях от эпохи(4) + ролики(2)
PAYLOAD = struct.Struct(">B8sBIH")
SIGNATURE_SIZE = 64

PLAN_CODES = {0: "Навсегда", 1: "Подписка, месяц", 2: "Подписка, год"}
PLAN_BY_NAME = {v: k for k, v in PLAN_CODES.items()}

EPOCH = datetime(2026, 1, 1, tzinfo=timezone.utc)

PUBLIC_KEY_PATH = Path(__file__).resolve().parent / "license_pubkey.txt"

# Ключ длиннее этого — точно оффлайн-лицензия, а не серверный KF-XXXX-XXXX-XXXX.
OFFLINE_KEY_MIN_LENGTH = 40


class BadLicense(Exception):
    """Ключ не подошёл — с причиной, понятной покупателю."""


def looks_offline(key: str) -> bool:
    return len(key.strip().replace("\n", "").replace(" ", "")) >= OFFLINE_KEY_MIN_LENGTH


def public_key_hex() -> str:
    if not PUBLIC_KEY_PATH.exists():
        raise BadLicense(
            "Рядом с программой нет файла license_pubkey.txt — сборка неполная, "
            "напишите продавцу."
        )
    return PUBLIC_KEY_PATH.read_text(encoding="utf-8").strip()


def pack_payload(fingerprint: bytes, plan_code: int, expires_day: int, videos: int) -> bytes:
    return PAYLOAD.pack(FORMAT_VERSION, fingerprint, plan_code, expires_day, min(videos, 65535))


def encode(payload: bytes, signature: bytes) -> str:
    return base64.urlsafe_b64encode(payload + signature).decode().rstrip("=")


def verify(key: str, machine_id: str, pubkey_hex: str | None = None) -> dict:
    """Проверить ключ на этой машине. Бросает `BadLicense` с причиной."""
    # Импорт внутри: без оффлайн-лицензии cryptography может и не понадобиться,
    # и падать из-за неё на старте приложения незачем.
    try:
        from cryptography.exceptions import InvalidSignature
        from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
    except ImportError:
        raise BadLicense(
            "Не установлена библиотека cryptography — переустановите программу "
            "через «Запустить.bat»."
        )

    raw = key.strip().replace("\n", "").replace(" ", "")
    try:
        blob = base64.urlsafe_b64decode(raw + "=" * (-len(raw) % 4))
    except (ValueError, TypeError):
        raise BadLicense("Ключ повреждён — скопировался не полностью?")

    if len(blob) != PAYLOAD.size + SIGNATURE_SIZE:
        raise BadLicense("Ключ повреждён — скопировался не полностью?")

    payload, signature = blob[: PAYLOAD.size], blob[PAYLOAD.size:]
    try:
        Ed25519PublicKey.from_public_bytes(
            bytes.fromhex(pubkey_hex or public_key_hex())
        ).verify(signature, payload)
    except (InvalidSignature, ValueError):
        raise BadLicense("Подпись не сходится — ключ поддельный или не от этой программы")

    version, fingerprint, code, expires_day, videos = PAYLOAD.unpack(payload)
    if version != FORMAT_VERSION:
        raise BadLicense("Ключ выписан для другой версии программы")

    if fingerprint.hex() != machine_id.strip().lower():
        raise BadLicense(
            "Ключ выписан для другого компьютера. Пришлите продавцу отпечаток "
            "этой машины — он выпишет новый."
        )

    expires_at = None
    if expires_day:
        expires_at = EPOCH + timedelta(days=expires_day)
        if expires_at < datetime.now(timezone.utc):
            raise BadLicense(f"Срок ключа истёк {expires_at:%d.%m.%Y}")

    return {
        "ok": True,
        "plan": PLAN_CODES.get(code, "?"),
        "expires_at": expires_at.isoformat(timespec="seconds") if expires_at else None,
        "perpetual": expires_at is None,
        "videos_per_month": videos,
        "videos_left": videos,
        "offline_license": True,
    }
