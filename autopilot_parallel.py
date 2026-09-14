#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Ночь ПАРАЛЛЕЛЬНО: по отдельному процессу на канал.

    python autopilot_parallel.py                 # все включённые каналы разом
    python autopilot_parallel.py --max 2         # не больше двух одновременно
    python autopilot_parallel.py --channels a,b  # только эти

ПОЧЕМУ ПРОЦЕССЫ, А НЕ ПОТОКИ

Внутри одного процесса каналы параллелить НЕЛЬЗЯ, и это не осторожность, а
замер по коду (31.08). Общее на весь процесс:

  core.VIDEO_ASPECT   ОДНА переменная на формат кадра. У einsturzpunkt он
                      теперь 9:16, у estoico-es 16:9 — в одном процессе они
                      перезапишут друг друга, и кадры закажутся не того
                      формата. Испорченные картинки будут выглядеть как
                      «ИИ опять нарисовал ерунду», а причина — здесь.
  render.CANCEL       флаг «Стоп» один на всех: остановка одного канала
  core.reset_cancel   гасит ffmpeg второго.
  quality.reset()     список замечаний общий — приёмка смешает два ролика.
  core._МЁРТВЫЕ_КАРТИНОЧНЫЕ, core._VEO_ABSENT_SAID — тоже общие.

У отдельного процесса всё это своё. Цена: каждый процесс поднимает свой
Python и свои модули (~200 МБ), и оба пишут в общий app.log вперемешку —
поэтому у каждого канала есть ещё и свой отдельный файл журнала.

ЧЕГО ЖДАТЬ ОТ ПАРАЛЛЕЛЬНОСТИ

Замер одной сборки (30.08, ролик 17.4 мин, 148.7 мин работы): ffmpeg занят
33% времени (финал 26% + нарезка 7%), остальное — ожидание сети. Значит
пока один канал ждёт ответа сервера, второй может жать видео, и два канала
идут заметно быстрее, чем два подряд. Но не вдвое: упрутся в суточные
лимиты картинок и в один кодировщик на финале.
"""
from __future__ import annotations

import argparse
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def channels_to_run(only: str) -> list[dict]:
    sys.path.insert(0, str(ROOT))
    import channels as channels_mod
    if only:
        want = {x.strip().lower() for x in only.split(",") if x.strip()}
        return [c for c in channels_mod.load()
                if str(c.get("id", "")).lower() in want]
    return channels_mod.active()


def main() -> int:
    ap = argparse.ArgumentParser(
        description="Ночь параллельно: отдельный процесс на канал")
    ap.add_argument("--channels", default="",
                    help="список id через запятую; по умолчанию все включённые")
    ap.add_argument("--max", type=int, default=2,
                    help="сколько каналов держать одновременно (по умолчанию 2)")
    ap.add_argument("--videos", type=int, default=1,
                    help="роликов на канал")
    ap.add_argument("--plan", action="store_true",
                    help="только показать, что будет запущено")
    # ДОКРУТКА БРОШЕННОГО. autopilot.py этот ключ понимал всегда, а сюда его
    # не пробрасывали — и перезапуск после сорванной ночи начинал ролики с
    # нуля. В ночь на 01.09 так и вышло: сценарии, озвучка, субтитры и по
    # полторы сотни готовых кадров на трёх каналах лежали на диске, а
    # процессы сели писать новые сценарии.
    ap.add_argument("--resume", action="store_true",
                    help="доделать брошенные ролики вместо новых")
    a = ap.parse_args()

    chans = channels_to_run(a.channels)
    if not chans:
        print("Нет ни одного канала: включи каналы или назови их через --channels")
        return 1

    print(f"Параллельная ночь: {len(chans)} канал(ов), "
          f"одновременно до {a.max}")
    for c in chans:
        print(f"  - {c.get('name')} ({c.get('id')})")
    if a.plan:
        return 0

    logs = ROOT / "autopilot_logs"
    logs.mkdir(exist_ok=True)
    queue = list(chans)
    running: list[tuple[subprocess.Popen, dict, object, float]] = []
    started = time.time()

    while queue or running:
        # добираем до потолка
        while queue and len(running) < max(1, a.max):
            c = queue.pop(0)
            cid = str(c.get("id"))
            lf = (logs / f"{cid}.log").open("w", encoding="utf-8",
                                            errors="replace")
            команда = [sys.executable, "-X", "utf8",
                       str(ROOT / "autopilot.py"),
                       "--channel", cid, "--videos", str(a.videos)]
            if a.resume:
                команда.append("--resume")
            p = subprocess.Popen(
                команда, cwd=str(ROOT), stdout=lf,
                stderr=subprocess.STDOUT)
            running.append((p, c, lf, time.time()))
            print(f"[{time.strftime('%H:%M:%S')}] пошёл: {c.get('name')} "
                  f"(pid {p.pid}), журнал autopilot_logs/{cid}.log")
        # ждём, кто первый закончит
        time.sleep(20)
        still = []
        for p, c, lf, t0 in running:
            if p.poll() is None:
                still.append((p, c, lf, t0))
                continue
            lf.close()
            mins = (time.time() - t0) / 60
            ok = "готово" if p.returncode == 0 else f"код {p.returncode}"
            print(f"[{time.strftime('%H:%M:%S')}] {c.get('name')}: {ok}, "
                  f"{mins:.1f} мин")
        running = still

    print(f"\nВся ночь заняла {(time.time() - started) / 60:.1f} мин")
    print("Журналы по каналам: autopilot_logs/<id>.log")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
