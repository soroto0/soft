#!/usr/bin/env python3
"""Ночной автопилот из командной строки: по ролику на каждый канал.

Запуск:
    python autopilot.py                  # по одному ролику на каждый канал
    python autopilot.py --videos 2       # по два ролика на канал
    python autopilot.py --channel abyss  # только этот канал
    python autopilot.py --draft          # черновое качество (быстрее)
    python autopilot.py --plan           # только показать план, ничего не делать
    python autopilot.py --resume         # доделать брошенное, а не начинать новое
    python autopilot.py --fit            # старое поведение: пропускать каналы,
                                         # которые точно не успеют до утра

Утром: сводка в autopilot_report.txt, подробности — в app.log.


ПОЧЕМУ ЗДЕСЬ НЕТ ЦИКЛА ПО КАНАЛАМ

Ночь целиком живёт в webapp.Api.autopilot, а этот файл — тонкая обёртка:
разбирает ключи, зовёт тот же метод, что и кнопка «Автопилот на ночь», и ждёт.
Пока реализаций было две, они расходились молча и по мелочам, а стоило это
целых ночей. Пример из ночи 2026-08-03: командная строка запускала каждый
канал отдельной фоновой задачей и потому сбрасывала между каналами бюджет
ожидания лимита Veo, а кнопка гнала всё одной задачей и не сбрасывала — второй
канал у неё уходил на сток с первого кадра. Разъехались они не по злому
умыслу, а потому что правку внесли в одном месте из двух.

Ещё раньше копией был весь пайплайн: в той копии стояло visual_mode="stock" и
genvideo=False, и ночь работы давала ролики, целиком собранные из стоковых
клипов, без единого ИИ-кадра.

Расчёт «что делать и сколько на это дать» тоже общий — он в night_plan.py,
модуле без побочных эффектов (его можно импортировать и прогнать всухую, чего
про этот файл сказать нельзя: он тянет webapp).
"""
import argparse
import os
import sys
import time
from pathlib import Path

BASE = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE))

import channels as channels_mod          # noqa: E402
import night_plan                        # noqa: E402

REPORT = BASE / "autopilot_report.txt"

# Как часто спрашивать «ночь ещё идёт?». Раз в 5 секунд: ночь длится часами,
# частить незачем.
POLL_S = 5.0


def _params(draft: bool) -> dict:
    """Настройки прогона.

    Язык, жанр, голос, визуальный стиль и длину задаёт ПРОФИЛЬ КАНАЛА —
    цепочка накладывает его через channels.apply_to_params поверх этих
    значений. Здесь только то, чего в профиле нет.

    visual_mode="mixed" — не "stock". Ролик ради того и собирается ИИ-кадрами,
    чтобы канал выглядел единым фильмом; стоки в нём — запасной путь на случай
    лимита, а не основной материал.
    """
    return {
        "visual_mode": "mixed",
        "ai_ratio": 0.85,
        "script": "",            # пусто = цепочка сама возьмёт тему по нише
        "topic": "",
        # Ровно та строка, что стоит в выпадающем списке интерфейса. 2026-08-03
        # здесь стояло «edge» строчными, проверка в _tts_step искала «Edge» с
        # учётом регистра и не срабатывала: автопилот уходил в Amazon Polly,
        # получал NoCredentialsError (ключей AWS нет) и заваливал канал сразу
        # после готового сценария. Саму проверку с тех пор сделали
        # нечувствительной к регистру, но строку оставляем точной — совпадение
        # с интерфейсом здесь и есть смысл этого поля.
        "engine": "Edge TTS (бесплатно)",
        "polly_engine": "neural",
        "rate": "0",
        "pauses": True,
        "enhance": True,
        "whisper": os.getenv("WHISPER_MODEL", "tiny.en"),
        "beat": 6.0,
        "resolution": "1080p",
        "fps": 30,
        "quality": "черновое" if draft else "обычное",
        "draft": draft,
        "subs": True,
        "chapters": True,
        "overlays": "",          # пусто = авто-расстановка, не чужие плашки
        "randomize": True,
        "thumbs": True,
        "grow_variants": True,
        "check_shots": True,
        "seo": True,
    }


def main() -> int:
    ap = argparse.ArgumentParser(
        description="Ночной автопилот: ролик на каждый канал")
    ap.add_argument("--channel", help="только этот канал (id или имя)")
    ap.add_argument("--videos", type=int, default=1,
                    help="сколько роликов на канал (по умолчанию 1)")
    ap.add_argument("--draft", action="store_true",
                    help="черновое качество — быстрее")
    ap.add_argument("--night", type=float, default=night_plan.NIGHT_H,
                    help=f"сколько часов есть у ночи "
                         f"(по умолчанию {night_plan.NIGHT_H:.0f})")
    # Ключ --all убран: пропуска, который он отменял, больше нет по умолчанию.
    # Вместо него --fit включает СТАРОЕ поведение. Смысл перевернулся вместе с
    # ценой обрыва: пока прерванный ролик означал переделку с нуля, начинать
    # то, что не успеешь, было чистым убытком; теперь он доделывается
    # следующей ночью за минуты, и убыток — наоборот, пропущенный канал.
    ap.add_argument("--resume", action="store_true",
                    help="доделать брошенные ролики вместо новых")
    ap.add_argument("--fit", action="store_true",
                    help="пропускать каналы, которые точно не успеют до утра "
                         "(прежнее поведение по умолчанию)")
    ap.add_argument("--plan", action="store_true",
                    help="показать план ночи и выйти, ничего не делая")
    args = ap.parse_args()

    chans = channels_mod.load()
    if args.channel:
        q = args.channel.strip().lower()
        chans = [c for c in chans
                 if q in (str(c.get("id", "")).lower(),
                          str(c.get("name", "")).lower())]
        if not chans:
            print(f"Канал «{args.channel}» не найден", file=sys.stderr)
            return 2

    # Остаток картинок читаем ЗДЕСЬ и отдаём в план: сам dry_run в сеть не
    # ходит (иначе его нельзя было бы прогнать всухую и без ключей), а план
    # ночи обязан показывать те же пропуски, что сделает настоящий прогон.
    quota = night_plan.image_quota()
    plan = night_plan.dry_run(chans, args.night, args.videos, args.fit,
                              force_new=not args.resume,
                              images_left=(None if quota.get("unlimited")
                                           else quota.get("remaining")))
    print(f"План ночи ({len(chans)} канал(ов) x {args.videos}, "
          f"в ночи {args.night:.0f} ч):")
    if quota.get("remaining") is not None:
        print(f"Картинок на сегодня осталось {quota['remaining']} из "
              f"{quota.get('limit', '?')} (лимит только на КАРТИНКИ, "
              f"живое видео Veo под него не попадает)"
              + ("" if quota.get("exact") else " — ОЦЕНКА, а не ответ сервиса"))
    print(night_plan.format_plan(plan))
    if args.plan:
        # Сухой прогон намеренно НЕ импортирует webapp: его импорт сам по себе
        # переписывает Overlay.tsx и ходит в платный API. Посмотреть план
        # должно быть безопасно.
        return 0

    import webapp                        # noqa: E402  (тяжёлый импорт — по делу)
    api = webapp.Api()

    p = _params(args.draft)
    p.update({"videos": args.videos, "night_h": args.night,
              "fit_only": args.fit, "channel": args.channel or "",
              # Без этой строки сухой прогон показывал бы одно, а ночь делала
              # другое: план строится здесь, а сама работа идёт в webapp, и
              # ключ должен доехать до неё.
              "resume": args.resume})
    t_start = time.time()
    api.autopilot(p)
    if api._busy is None:
        # Ночь даже не началась — «занято» другой задачей или каналы не нашлись.
        # Без этой проверки дальше распечаталась бы сводка ПРОШЛОЙ ночи, и
        # человек утром решил бы, что всё отработало.
        print("Ночь не запустилась — смотри последние строки app.log",
              file=sys.stderr)
        return 2

    # Ночь идёт в фоновом потоке, как и по кнопке. Ждём её здесь, а не
    # управляем ею: любое «управление» отсюда — это второй экземпляр логики,
    # ровно то, из-за чего пути и разъезжались.
    try:
        while api._busy:
            time.sleep(POLL_S)
    except KeyboardInterrupt:
        # Ctrl+C = «Стоп» человека, а не сбой канала. Раньше цикл по каналам
        # ловил его через `except BaseException` наравне со сбоем канала, и
        # прерывание не прерывало ничего: автопилот просто переходил к
        # следующему каналу. Гасим ночь тем же путём, что и кнопка.
        print("\nCtrl+C — останавливаю ночь…", file=sys.stderr)
        api.stop_render()
        for _ in range(120):
            if not api._busy:
                break
            time.sleep(1)
        return 130

    # Сводку читаем, только если она НОВАЯ. Файл один на все ночи, и печатать
    # вчерашний, когда сегодняшняя ночь не дописала свой, — прямой способ
    # сказать человеку «всё готово» про несделанное.
    fresh = REPORT.exists() and REPORT.stat().st_mtime >= t_start
    report = REPORT.read_text(encoding="utf-8") if fresh else ""
    if not report:
        print("Сводка не записана — ночь оборвалась нештатно, смотри app.log",
              file=sys.stderr)
        return 1
    print("\n" + report)
    # Код возврата — по сводке: 0, только если у каждого канала стоит «+».
    return 0 if report and "\n  - " not in report else 1


if __name__ == "__main__":
    sys.exit(main())
