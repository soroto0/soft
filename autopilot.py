#!/usr/bin/env python3
"""Ночной автопилот: по ролику на каждый канал, пока ноутбук стоит без тебя.

Запуск:
    python autopilot.py                  # по одному ролику на каждый канал
    python autopilot.py --videos 2       # по два ролика на канал
    python autopilot.py --channel abyss  # только этот канал
    python autopilot.py --draft          # черновое качество (быстрее)

Утром: сводка в autopilot_report.txt, подробности — в app.log.

Почему это не отдельная реализация пайплайна. Ролик собирает та же
webapp.Api.generate_all, что и кнопка «Генерировать видео» в приложении.
Копия цепочки жила бы своей жизнью: прошлая версия автопилота была именно
копией, в ней стояло visual_mode="stock" и genvideo=False — и ночь работы
давала ролики, целиком собранные из стоковых клипов, без единого ИИ-кадра.
Здесь такого разъезда быть не может: шаг добавили в приложении — он есть и
ночью.

Что автопилот добавляет сверх кнопки:
  * ролик каждой ночи уходит в СВОЮ папку с датой. Папка канала одна на все
    ролики, и лежащий в ней script.txt цепочка считает готовым сценарием —
    ночь подряд переозвучивала бы вчерашний текст вместо нового;
  * канал, упавший на любом шаге, не уносит с собой остальные: ночь из трёх
    каналов не должна пропадать целиком из-за одного;
  * сводка за ночь одним файлом.
"""
import argparse
import os
import sys
import time
import traceback
from datetime import datetime
from pathlib import Path

BASE = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE))

import channels as channels_mod          # noqa: E402
import webapp                            # noqa: E402

REPORT = BASE / "autopilot_report.txt"

# Опрос «задача ещё идёт?». Раз в 5 секунд: цепочка длится десятки минут,
# частить незачем.
POLL_S = 5.0
# Потолок на один ролик. Ночь конечна: зависший канал не должен съесть её
# целиком, ролики следующих каналов важнее. Пустая переменная = считать по
# длине канала (см. _budget_for).
MAX_VIDEO_S = float(os.getenv("AUTOPILOT_MAX_VIDEO_S", "0"))

# Замер 2026-08-03: один ИИ-кадр ≈ 110 c (текст→видео 55, фото→видео 68,
# апскейл 52), один кадр закрывает ~9 c ролика, ИИ-доля 0.85. Отсюда минута
# готового видео ≈ 10-11 минут работы.
SEC_PER_VIDEO_MINUTE = 11 * 60


def _budget_for(channel: dict) -> float:
    """Сколько давать одному ролику, ПО ЕГО ДЛИНЕ, а не одним числом на всех.

    Общий потолок в 6 часов был ошибкой: 13-минутный abyss укладывается в 2.3 ч,
    а 45-минутный испанский идёт 7.8 ч — и его бросали бы недоделанным ровно
    на середине, каждую ночь. Считаем от длины канала и добавляем половину
    сверху: озвучка, субтитры и рендер тоже занимают время, а лимиты Veo
    добавляют непредсказуемые паузы.
    """
    if MAX_VIDEO_S > 0:
        return MAX_VIDEO_S          # задано руками — уважаем
    minutes = float(channel.get("minutes") or 12)
    return max(2 * 3600, minutes * SEC_PER_VIDEO_MINUTE * 1.5)


def _params(draft: bool) -> dict:
    """Настройки прогона.

    Язык, жанр, голос, визуальный стиль и длину задаёт ПРОФИЛЬ КАНАЛА —
    generate_all накладывает его через channels.apply_to_params поверх этих
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
        # Ровно та строка, что стоит в выпадающем списке интерфейса. Проверка
        # в _tts_step ищет подстроку «Edge», и на «edge» строчными она НЕ
        # срабатывает: 2026-08-03 автопилот из-за этого ушёл в Amazon Polly,
        # получил NoCredentialsError (ключей AWS нет) и завалил канал сразу
        # после готового сценария.
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


def project_dir_for_night(channel: dict) -> Path:
    """Своя папка на каждый ролик: <канал>/2026-08-04, при повторе — _2, _3.

    Без этого второй ролик за ночь лёг бы поверх первого, а лежащий в папке
    script.txt цепочка приняла бы за готовый сценарий и вместо новой темы
    переозвучила бы вчерашнюю.
    """
    root = channels_mod.projects_dir(channel)
    if not root.is_absolute():
        root = BASE / root
    stamp = datetime.now().strftime("%Y-%m-%d")
    d = root / stamp
    i = 1
    # Занятой считается ЛЮБАЯ существующая папка, даже пустая: пустую оставляет
    # ролик, упавший на первом же шаге, и следующий лёг бы поверх него.
    while d.exists():
        i += 1
        d = root / f"{stamp}_{i}"
    d.mkdir(parents=True, exist_ok=True)
    return d


def _wait(api, log, budget: float) -> bool:
    """Дождаться конца задачи. True — дошла до конца, False — упёрлась в потолок.

    budget приходит СНАРУЖИ, из _budget_for(канал). Раньше здесь читалась
    глобальная MAX_VIDEO_S, а у неё значение по умолчанию стало 0 — то есть
    первая же проверка срабатывала через секунду после старта, и автопилот
    убивал каждый ролик, не дав ему начаться.

    _bg гасит исключения внутри себя и просто снимает _busy, поэтому «как всё
    прошло» видно не отсюда, а по тому, появился ли файл ролика.
    """
    t0 = time.time()
    while api._busy:
        if time.time() - t0 > budget:
            log(f"[Автопилот] Ролик идёт дольше "
                f"{budget / 3600:.1f} ч — останавливаю и перехожу "
                "к следующему каналу")
            api.stop_render()      # общий «Стоп»: гасит любую стадию, не только ffmpeg
            # даём цепочке свернуться самой, прежде чем занимать её следующим
            for _ in range(60):
                if not api._busy:
                    break
                time.sleep(1)
            return False
        time.sleep(POLL_S)
    return True


def run_one(api, channel: dict, draft: bool, log) -> dict:
    """Один ролик. Исключения наружу не пускает — их разбирает вызывающий."""
    name = channel.get("name") or channel.get("id")
    t0 = time.time()
    api.channel_select(channel["id"])
    budget = _budget_for(channel)
    d = project_dir_for_night(channel)
    api.set_project(str(d))
    log(f"[Автопилот] «{name}» -> {d.name} "
        f"({channel.get('minutes', '?')} мин, {channel.get('lang', '?')}); "
        f"на этот ролик отвожу {budget / 3600:.1f} ч")

    # Проверяем занятость ДО запуска, а не после. После — гонка: цепочка,
    # упавшая на первой же строке, успевает снять _busy раньше, чем мы на него
    # посмотрим, и настоящая ошибка подменилась бы выдуманным «занято».
    if api._busy:
        raise RuntimeError(f"занято другой задачей: {api._busy}")
    api.generate_all(_params(draft))
    finished = _wait(api, log, budget)

    out = d / "output_final.mp4"
    size = out.stat().st_size if out.exists() else 0
    return {
        "channel": name, "dir": d, "file": out if size else None,
        "size": size, "sec": time.time() - t0,
        "why": "" if size else ("прервано по таймауту" if not finished
                                else "рендер не дал файла — смотри app.log"),
    }


def main() -> int:
    ap = argparse.ArgumentParser(
        description="Ночной автопилот: ролик на каждый канал")
    ap.add_argument("--channel", help="только этот канал (id или имя)")
    ap.add_argument("--videos", type=int, default=1,
                    help="сколько роликов на канал (по умолчанию 1)")
    ap.add_argument("--draft", action="store_true",
                    help="черновое качество — быстрее")
    args = ap.parse_args()

    api = webapp.Api()
    log = api.log                      # тот же журнал, что и у приложения

    chans = channels_mod.load()
    if args.channel:
        q = args.channel.strip().lower()
        chans = [c for c in chans
                 if q in (str(c.get("id", "")).lower(),
                          str(c.get("name", "")).lower())]
        if not chans:
            print(f"Канал «{args.channel}» не найден", file=sys.stderr)
            return 2

    total = len(chans) * args.videos
    log(f"[Автопилот] Ночь началась: {len(chans)} канал(ов) x {args.videos} = "
        f"{total} ролик(ов). Качество: "
        f"{'черновое' if args.draft else 'обычное'}")
    started = datetime.now()
    results = []

    for ch in chans:
        for _ in range(args.videos):
            try:
                results.append(run_one(api, ch, args.draft, log))
            except BaseException as e:
                # BaseException, а не Exception: core.Cancelled и webapp.Stopped
                # унаследованы от него, и без этого «Стоп» на одном канале унёс
                # бы с собой всю оставшуюся ночь.
                nm = ch.get("name") or ch.get("id")
                log(f"[Автопилот] «{nm}» упал: {e}", "err")
                log(traceback.format_exc().rstrip(), "dim")
                results.append({"channel": nm, "dir": None, "file": None,
                                "size": 0, "sec": 0.0, "why": str(e)})

    ok = [r for r in results if r["file"]]
    lines = [
        "=" * 62,
        f"Автопилот: {started:%Y-%m-%d %H:%M} — {datetime.now():%H:%M}",
        f"Готово {len(ok)} из {len(results)}",
        "=" * 62, "",
    ]
    for r in results:
        if r["file"]:
            lines.append(f"  ✔ {r['channel']}: {r['file']} "
                         f"({r['size'] / 2**20:.0f} МБ, "
                         f"{r['sec'] / 60:.0f} мин)")
        else:
            lines.append(f"  ✖ {r['channel']}: {r['why']}")
    lines += ["", "Подробности каждого шага — в app.log.",
              "Перед загрузкой на YouTube отметь «Altered content», если в "
              "ролике есть реалистичные ИИ-кадры."]
    report = "\n".join(lines)
    REPORT.write_text(report + "\n", encoding="utf-8")
    print("\n" + report)
    for line in lines:
        log(line)
    return 0 if len(ok) == len(results) else 1


if __name__ == "__main__":
    sys.exit(main())
