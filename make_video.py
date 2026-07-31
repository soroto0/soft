# -*- coding: utf-8 -*-
"""Полный прогон ролика без окна: та же generate_all, что и по кнопке в UI.

Нужен, чтобы делать ролик из терминала (и чтобы прогон переживал закрытие
интерфейса). Api умеет работать без окна — _js молча ничего не делает, когда
self._win пуст, — поэтому достаточно собрать параметры и дождаться потока.

    python make_video.py --project abyss --topic "..." --minutes 10
"""
import argparse
import sys
import time
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

import webapp


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--project", required=True, help="папка проекта")
    ap.add_argument("--channel", default="", help="id канала (задаёт язык и стиль)")
    ap.add_argument("--topic", default="", help="тема сценария")
    ap.add_argument("--minutes", type=int, default=10)
    ap.add_argument("--beat", type=float, default=6.0)
    ap.add_argument("--intensity", default="средняя")
    args = ap.parse_args()

    api = webapp.Api()
    proj = Path(args.project).resolve()
    proj.mkdir(parents=True, exist_ok=True)
    api.set_project(str(proj))
    if args.channel:
        api.channel_select(args.channel)

    p = {"topic": args.topic, "minutes": args.minutes, "beat": args.beat,
         "intensity": args.intensity}
    api.generate_all(p)

    # _bg отдаёт управление сразу, работа идёт в демоне: без ожидания
    # интерпретатор завершится и убьёт прогон на первом же шаге
    time.sleep(2)
    while api._busy:
        time.sleep(5)
    print("готово")
    return 0


if __name__ == "__main__":
    sys.exit(main())
