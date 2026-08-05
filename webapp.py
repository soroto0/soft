#!/usr/bin/env python3
"""
Контент-фабрика — новый интерфейс (HTML/CSS в окне pywebview).

Вся логика пайплайна остаётся в core.py / render.py / overlays.py —
этот файл только мост между веб-страницей ui/ и питоном.

Запуск:  python webapp.py        (старый tkinter-интерфейс: python app.py)
"""

import os
import re
import json
import hashlib
import shutil
import time
import threading
import traceback
from datetime import datetime
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

import webview

import core
import render
import overlays
import gen_remotion_gemini
import channels as channels_mod
import night_plan
import quality

APP_TITLE = "Контент-фабрика"
APP_VERSION = "3.0"
BASE = Path(__file__).resolve().parent
SETTINGS_FILE = BASE / "settings.json"
LOG_FILE = BASE / "app.log"

STAGE_NAMES = ["Сценарий", "Озвучка", "Субтитры", "Раскадровка",
               "Оверлеи", "Рендер", "Premiere"]

# Жанр сценария -> подпапка в библиотеке музыки (см. auto_music). Без всякого
# музыкального API — просто раскладываешь свои лицензионные треки по этим
# пяти папкам один раз, дальше софт сам берёт подходящий под жанр трек.
# Слова — из core.MUSIC_MOODS. «horror» отсюда убран вместе со словарём
# настроений: папки horror нет ни на диске, ни в запросах Openverse и Архива,
# и выбор этого слова уводил музыку в закачку по сети, а при неудаче оставлял
# ролик вообще без музыки. Мистику держит dark.
TONE_TO_MOOD = {
    "документальный": "calm",
    "истории/крайм": "dark",
    "образовательный": "calm",
    "топ-лист": "upbeat",
    "мотивация": "epic",
    "мистика/хоррор": "dark",
}

# Семейство цветов канала — по полю palette из channels.json. Тот же признак,
# по которому разведены монтаж (render.PALETTES), воздух кадра
# (core.ATMOSPHERE) и звук (core.SOUND_PALETTES): вторая независимая настройка
# означала бы канал, настроенный наполовину.
#
# Вынесено в модуль, а не оставлено внутри функции, потому что читателей стало
# двое: палитра плашек на ролик (_regen_overlay_theme) и описание НОВОГО вида
# плашки, который ИИ пишет каналу (_grow_variant_library). Разъедься эти два
# описания — и канал получал бы виды не в своих цветах.
PALETTE_FAMILY = {
    "harsh": "cold, hard, industrial: steel blues, slate greys, "
             "warning oranges. No soft pastels.",
    "warm": "warm and domestic: honey, timber, brick, warm greys. "
            "No clinical blues.",
    "contemplative": "muted and contemplative: dusty greens, stone, "
                     "faded indigo, parchment. No saturated neons.",
}

# Какие типы плашек канал использует ЧАЩЕ ОСТАЛЬНЫХ — их разнообразие для него
# важнее. Разбор разрушения живёт штампами, вымарываниями, шкалами и
# таймлайнами; бережливый быт — счётчиками цены и сравнениями «было/стало»;
# документалка о философах — цитатами и маркером. Список не запрещает
# остальные типы, он только решает спор при равном покрытии: пополнять
# сначала то, что канал показывает каждый ролик.
CHANNEL_SIGNATURE = {
    "harsh": ("stamp", "redact", "bars", "timeline", "callout"),
    "warm": ("counter", "compare", "collage", "banner"),
    "contemplative": ("quote", "marker", "titlecard", "kinetic"),
}


class Stopped(BaseException):
    """Нажата кнопка «Стоп».

    Наследуемся от BaseException, а не от Exception, СПЕЦИАЛЬНО: и в core, и
    в цепочке generate_all десятки блоков `except Exception` глушат сбой
    отдельного плана, чтобы ролик не рушился из-за одной картинки. Обычное
    исключение остановки они бы проглотили ровно так же, и «Стоп» снова
    ничего бы не останавливал — как это и было, пока отмена жила только
    внутри render.py."""


def load_settings() -> dict:
    if SETTINGS_FILE.exists():
        try:
            return json.loads(SETTINGS_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {}


class Api:
    def __init__(self):
        self._settings = load_settings()
        self._project = Path(self._settings.get("last_project")
                            or BASE / "project1")
        self._busy = None
        # «Стоп» на любой стадии, а не только на рендере: render.CANCEL знает
        # про ffmpeg, но озвучка, субтитры и раскадровка живут в core и о нём
        # не подозревали — цепочка молча доезжала до рендера уже без картинок.
        self._cancel = threading.Event()
        # Отдельный флаг «остановил ЧЕЛОВЕК». Ночному сторожу приходится
        # взводить тот же _cancel, что и кнопка, и без второго флага он не мог
        # отличить своё срабатывание от нажатия «Стоп»: нажатие посреди
        # затянувшегося канала выглядело бы как таймаут, и ночь поехала бы
        # дальше вместо того, чтобы встать.
        self._stop_by_user = threading.Event()
        # Время последней строки в журнале. По нему ночной сторож понимает,
        # что шаг не работает, а ВИСИТ: в app.log настоящие зависания выглядят
        # как многочасовая тишина внутри идущей задачи (8.5 ч после «План 262
        # -> OK», 11.3 ч сразу после «▶ запущено»), тогда как самая длинная
        # законная пауза — 20 минут ожидания лимита картинок.
        self._beat = time.time()
        self._worker = None      # поток текущей задачи, см. _stop_check
        self._win = None
        # Канал и рабочая папка обязаны совпадать. Поймано вживую 2026-08-03:
        # в настройках стоял канал abyss, а last_project указывал на папку
        # home-vault — и весь ролик про обрушение моста (тема abyss) уехал
        # в чужой канал: там оказались и script.txt, и meta.json с меткой
        # «home-vault». Разойтись они могут запросто: last_project пишется
        # при любом выборе папки, а current_channel — только при выборе
        # канала, и никто их не сверял. Сверяем на старте — но ПОСЛЕ _win,
        # иначе предупреждение уходит в журнал, которого ещё нет.
        self._sync_project_to_channel()
        self._configure_veo_store()
        # Живой вывод дочерних процессов идёт мимо проверки «Стопа»
        # (_log_raw, а не log): в него льётся ffmpeg строка за строкой прямо
        # из цикла, который сам же и убивает процесс по CANCEL. Брось мы
        # оттуда исключение — ffmpeg остался бы висеть сиротой. Останов на
        # этих стадиях делает render.CANCEL, а в core — обычный callback log.
        core.CONSOLE = lambda m: self._log_raw(m, "dim")
        render.CONSOLE = lambda m: self._log_raw(m, "dim")
        self._apply_env()   # ключи из settings.json -> os.environ (не только
                            # при явном сохранении в диалоге, но и при старте)

    def _apply_env(self):
        for k, env in (("aws_access_key", "AWS_ACCESS_KEY_ID"),
                       ("aws_secret_key", "AWS_SECRET_ACCESS_KEY"),
                       ("aws_region", "AWS_REGION"),
                       ("veo_key", "VEO_API_KEY")):
            if self._settings.get(k):
                os.environ[env] = self._settings[k]

    def _configure_veo_store(self):
        try:
            import veo_client
            veo_client.configure_task_store(self._project)
        except Exception:
            pass

    # ---------- связь с JS ----------
    def _js(self, code: str):
        if self._win:
            try:
                self._win.evaluate_js(code)
            except Exception:
                pass

    def log(self, msg: str, cls: str = ""):
        """Обычный журнал — и одновременно ЕДИНСТВЕННАЯ точка, где стадия из
        core может узнать про «Стоп». Другого способа нет: core.py трогать
        нельзя, а log — тот самый callback, который туда передаётся и который
        зовётся на каждом плане раскадровки, на каждом шаге озвучки и т.д.
        Поэтому здесь бросаем Stopped: работа обрывается на ближайшем
        сообщении, а не через полчаса скачиваний."""
        self._stop_check()
        self._log_raw(msg, cls)

    def _stop_check(self):
        """Точка выхода между стадиями и внутри них. Зовётся из log() и явно
        в цепочке generate_all — там между шагами бывают минуты без единой
        строки в журнале.

        Бросаем только в рабочем потоке: тот же log() зовут и обработчики
        кнопок интерфейса (сохранить сценарий, черновик оверлеев), а там
        исключение вылетело бы прямо в JS и выглядело бы поломкой окна."""
        if self._cancel.is_set() and threading.current_thread() is self._worker:
            raise Stopped()

    def _log_raw(self, msg: str, cls: str = ""):
        """Запись в журнал БЕЗ проверки «Стопа». Нужна там, где бросать
        нельзя: сообщения самой остановки и итоговые строки задачи в finally —
        иначе Stopped вылетал бы из обработчика остановки."""
        # Пульс для ночного сторожа. Отмечаем ЗДЕСЬ, а не в log(): сюда сходятся
        # и вывод дочерних процессов (core.CONSOLE, render.CONSOLE), и строки
        # самой остановки. Ставь отметку в log() — долгий ffmpeg, который сыплет
        # прогрессом мимо log(), выглядел бы для сторожа зависшим.
        self._beat = time.time()
        msg = str(msg)
        if not cls:
            low = msg.lower()
            if "[ошибка]" in low or "ошибка" in low or "упал" in low:
                cls = "err"
            elif "готово" in low or "-> ok" in low or "✔" in msg:
                cls = "ok"
            elif "не найдено" in low or "[ключи]" in low or "⛔" in msg:
                cls = "warn"
        try:
            with open(LOG_FILE, "a", encoding="utf-8") as f:
                f.write(f"{datetime.now():%Y-%m-%d %H:%M:%S}  {msg}\n")
        except OSError:
            pass
        self._js(f"addLog({json.dumps(msg)}, {json.dumps(cls)})")

    def _progress(self, done, total):
        self._js(f"setProgress({int(done)}, {int(total)})")

    def _bg(self, name: str, fn):
        if self._busy:
            self.log(f"[Занято] Уже идёт «{self._busy}» — «{name}» не запущена. "
                     "Дождись завершения или останови (⛔ Стоп).", "warn")
            return
        self._busy = name
        self._stop_by_user.clear()
        # Флаги отмены сбрасываются ЗДЕСЬ: после остановки они остаются
        # взведёнными, и следующая задача обрывалась бы на первой же строке
        # журнала. render.CANCEL чистит и сам себя, но только когда дело
        # доходит до рендера.
        self._cancel.clear()
        render.CANCEL.clear()
        # core сбрасывает флаг только ПО ЗАПРОСУ снаружи, а не внутри стадий:
        # в цепочке «сценарий → озвучка → субтитры → раскадровка» каждый
        # следующий шаг затирал бы «Стоп» предыдущего — ровно та ошибка, из-за
        # которой CANCEL.clear() внутри render_project не давал остановить
        # рендер до его старта. Сбрасываем здесь, на запуске задачи.
        core.reset_cancel()
        # Бюджет ожидания лимита Veo — на ЭТУ задачу, а не на всё время жизни
        # приложения. Иначе второй ролик за ночь начинал бы с уже исчерпанным
        # бюджетом и уходил на сток с первого кадра.
        core.reset_veo_limit()

        def wrap():
            t0 = datetime.now()
            self._worker = threading.current_thread()
            self._js(f"setStatus({json.dumps('⏳ ' + name + '…')})")
            self._log_raw(f"▶ {name}: запущено")
            ok = stopped = False
            try:
                fn()
                ok = True
            # core.Cancelled ловим наравне со Stopped: он тоже унаследован от
            # BaseException (иначе десятки `except Exception` в core проглотили
            # бы отмену), а значит мимо `except Exception` ниже пролетит — и
            # задача доложила бы «прервано» вместо «остановлено», а threading
            # напечатал бы трейсбек в stderr.
            except (Stopped, core.Cancelled):
                stopped = True
                self._log_raw(f"[Стоп] «{name}» прервана по кнопке ⛔ — "
                              "сделанное до этого момента сохранено", "warn")
            except Exception as e:
                self._log_raw(traceback.format_exc().rstrip(), "dim")
                self._log_raw(f"[ОШИБКА] {e}")
            finally:
                self._busy = None
                # флаг живёт РОВНО столько, сколько идёт задача: иначе
                # следующая кнопка оборвалась бы на первой же строке журнала
                self._cancel.clear()
                self._worker = None
                sec = (datetime.now() - t0).total_seconds()
                res = ("завершено" if ok
                       else "остановлено" if stopped else "прервано")
                self._log_raw(f"{'✔' if ok else '✖'} {name}: {res} "
                              f"за {sec:.0f} c", "ok" if ok else "err")
                self._js("taskDone()")
        threading.Thread(target=wrap, daemon=True).start()

    # ---------- состояние ----------
    def _read(self, name: str) -> str:
        p = self._project / name
        try:
            return p.read_text(encoding="utf-8") if p.exists() else ""
        except OSError:
            return ""

    def _read_meta(self) -> dict:
        p = self._project / "meta.json"
        try:
            return json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}
        except (OSError, ValueError):
            return {}

    def _write_meta(self, **kv):
        meta = self._read_meta()
        meta.update(kv)
        self._project.mkdir(parents=True, exist_ok=True)
        (self._project / "meta.json").write_text(
            json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")

    # ОДНО значение на весь конвейер, а не копия. Тем же самым «короткий ли
    # сценарий» меряет и планировщик ночи (night_plan.script_too_short), и эта
    # проверка в цепочке. Копия жила здесь ровно один коммит, и разъехаться ей
    # было достаточно одной правки: планировщик считал бы, что по лежащему
    # сценарию делать почти нечего, а цепочка тут же выбросила бы его и начала
    # ролик заново — то есть ночь распределялась бы по числу, которого сама же
    # не придерживается.
    WORDS_PER_MINUTE = night_plan.WORDS_PER_MINUTE
    SCRIPT_MIN_RATIO = night_plan.SCRIPT_MIN_RATIO

    def _stale_script(self, text: str, ch: dict | None, p: dict) -> str:
        """Почему лежащий в папке script.txt НЕ относится к этому ролику.

        Пустая строка — сценарий свой, можно брать.

        Зачем вообще. Рабочая папка у канала ОДНА на все его ролики, и
        script.txt от прошлого никто с диска не убирает. Цепочка считала шаг
        «сценарий» выполненным по одному факту наличия файла — и вместо того,
        чтобы написать новый текст под новую тему, молча брала чужой.
        Так на 20-минутном канале вышел ролик на ТРИ минуты: в meta.json тема
        была про починку кранов, а в script.txt лежала история патента на
        удлинитель, 509 слов вместо трёх тысяч. Та же болезнь уже вылечена у
        overlays.txt (см. _auto_overlays и _srt_sig) — здесь тот же приём.
        """
        words = len(text.split())
        if not words:
            return ""
        topic = (p.get("topic") or "").strip()
        was = (self._read_meta().get("topic") or "").strip()
        if topic and was and topic.lower() != was.lower():
            return (f"в папке лежит сценарий другого ролика: «{was}», "
                    f"а сейчас тема «{topic}»")
        # НАЖАЛИ «ГЕНЕРИРОВАТЬ» — ЗНАЧИТ ХОТЯТ НОВЫЙ РОЛИК.
        #
        # Раньше сценарий переписывался только при смене темы или если он
        # короче нормы канала. Тема поле необязательное: когда её не вводят,
        # она берётся по формуле ниши — и тогда `topic` пуст, сравнивать не
        # с чем, сценарий признавался своим и брался старый. Второе нажатие
        # давало ТОТ ЖЕ ролик. Владелец: «сделай так, когда нажимаю кнопку
        # генерировать, сценарий обновился».
        #
        # Готовый ролик рядом — признак того, что прошлый заход доведён до
        # конца и продолжать нечего. Если ролика нет, сценарий оставляем:
        # прогон оборвался на середине, и переписать текст значило бы
        # выбросить уже сделанную по нему озвучку, раскадровку и кадры.
        if not topic and (self._project / "output_final.mp4").exists():
            return ("прошлый ролик по этому сценарию уже собран — "
                    "нажатие «Генерировать» просит НОВЫЙ")
        mins = int((ch or {}).get("minutes") or p.get("minutes") or 0)
        if mins:
            need = mins * self.WORDS_PER_MINUTE
            if words < need * self.SCRIPT_MIN_RATIO:
                return (f"сценарий в папке короче, чем нужно каналу: "
                        f"{words} слов — это примерно "
                        f"{words / self.WORDS_PER_MINUTE:.0f} мин видео, "
                        f"а канал заявлен на {mins} мин (нужно ~{need} слов)")
        return ""

    def _warn_stale(self) -> list[str]:
        """Назвать вслух всё, что в папке осталось от ПРОШЛОГО ролика.

        Сеть безопасности для шагов, которые глушат свои сбои: музыка, SEO и
        обложки ловят исключение и пишут «пропущено» одной строкой в журнал на
        тысячу строк. Файл прошлого ролика при этом остаётся на диске и
        выглядит как результат шага — с ним ролик и уходит на публикацию.
        Список общий с галочками интерфейса (STEP_FILES), чтобы они не
        разъезжались."""
        import night_plan as np
        d = self._project
        bad = []
        for name, rel in self.STEP_FILES:
            if rel == "output_final.mp4":
                continue          # его как раз сейчас и собираем
            if (d / rel).exists() and not np.fresh_for_script(d, rel):
                bad.append(f"{name} ({rel})")
        # Обложек рисуется столько, сколько модель придумала концепций. Вышло
        # меньше, чем в прошлый раз — лишние thumb2/thumb3 остаются от того
        # ролика, и выбирать человек будет из смеси.
        try:
            extra = sorted(p.name for p in (d / "thumbs").glob("thumb*.jpg")
                           if p.name != "thumb1.jpg"
                           and not np.fresh_for_script(d, f"thumbs/{p.name}"))
        except OSError:
            extra = []
        if extra:
            bad.append("Обложки прошлого ролика (thumbs/"
                       + ", ".join(extra) + ")")
        # Через core.mix_is_stale, а не своим сравнением дат: ту же дорожку по
        # тому же правилу выбирает рендер (core.voice_track). Две копии одного
        # сравнения дают худшее из возможного — ролик едет с одной дорожкой, а
        # предупреждение человеку про другую.
        if core.mix_is_stale(d):
            bad.append("Музыка (audio/voiceover_music.mp3)")
        if bad:
            self.log("[Остатки] В папке лежат файлы ПРОШЛОГО ролика — их шаги "
                     "в этот раз не отработали: " + ", ".join(bad)
                     + ". В ролик они не попадут (рендер и раскадровка их не "
                       "берут), но публиковать по ним нельзя.", "warn")
            # Эта проверка и есть сеть безопасности, но сама она ловилась
            # только глазами: одна строка «warn» посреди прогона. В сводке она
            # стоит рядом с причинами — видно и что осталось от прошлого
            # ролика, и какой шаг это оставил.
            quality.degraded(
                "Остатки", "в папке лежат файлы прошлого ролика: "
                + ", ".join(bad),
                why="шаги, которые должны были их перезаписать, в этот раз не "
                    "отработали",
                hint="в сам ролик они не попадут, но перед публикацией "
                     "переделай эти шаги — иначе заголовок, обложка или "
                     "музыка будут от другого видео",
                level="заметно")
        return bad

    def _srt_sig(self) -> str:
        """Отпечаток текущих субтитров.

        Оверлеи расставлены ПО НИМ — и таймкоды, и текст. Значит отпечаток
        .srt — единственный надёжный признак того, к какому ролику относится
        лежащий в папке overlays.txt: рабочая папка у канала одна на все его
        ролики, поэтому ни по имени, ни по дате файла новый ролик от прошлого
        не отличить."""
        srt = self._project / "subs" / "voiceover.srt"
        try:
            return (hashlib.sha1(srt.read_bytes()).hexdigest()
                    if srt.exists() else "")
        except OSError:
            return ""

    def _reject_if_busy(self, name: str) -> bool:
        """Проверка «занято» ДО побочных действий.

        _bg проверяет то же самое, но «Рендер» и «Генерировать видео» успевают
        до него переписать overlays.txt и settings.json — то есть входные
        файлы УЖЕ ИДУЩЕЙ задачи. Второе нажатие не должно менять ничего."""
        if self._busy:
            self.log(f"[Занято] Уже идёт «{self._busy}» — «{name}» не "
                     "запущена. Дождись завершения или останови (⛔ Стоп).",
                     "warn")
            return True
        return False

    # Шаги и файлы, по которым видно, что шаг сделан. Список общий для
    # галочек в интерфейсе и для предупреждения в конце цепочки — иначе они
    # разъезжаются, и интерфейс показывает готовым то, о чём цепочка молчит.
    STEP_FILES = (
        ("Озвучка", "audio/voiceover.mp3"),
        ("Субтитры", "subs/voiceover.srt"),
        ("Раскадровка", "timeline.json"),
        ("Оверлеи", "overlays.txt"),
        ("SEO", "seo.txt"),
        ("Обложки", "thumbs/thumb1.jpg"),
        ("Premiere", "sequence.xml"),
        ("Рендер", "output_final.mp4"),
    )

    def _checks(self, d: Path) -> dict:
        # Галочка ставится не по наличию файла, а по тому, сделан ли он под
        # ТЕКУЩИЙ сценарий: рабочая папка у канала одна на все ролики, и
        # раньше новый ролик получал зелёные галочки на всех шагах, которых
        # ещё не делали, — просто потому, что файлы прошлого лежат рядом.
        # На настоящих данных 05.08 home-vault так показывал готовыми
        # раскадровку, оверлеи, Premiere и обложки от ролика недельной
        # давности (timeline.json 01.08 при сценарии 04.08).
        import night_plan as np
        ok = {"Сценарий": (d / "script.txt").exists()}
        for name, rel in self.STEP_FILES:
            ok[name] = (d / rel).exists() and np.fresh_for_script(d, rel)
        if not ok["Раскадровка"]:
            # Ручной путь: человек сам сложил материал в video/ (кнопка
            # «Стоки»), timeline.json при этом не появляется. Условие то же —
            # материал этого ролика, а не оставшийся от прошлого. Смотрим
            # время правки САМОЙ ПАПКИ (оно меняется, когда в неё кладут
            # файл), а не перебираем содержимое: в abyss/storyboard 3627
            # файлов, а этот метод зовётся на каждый опрос состояния из
            # интерфейса и по всем проектам канала сразу.
            ok["Раскадровка"] = any(
                (d / sub).is_dir() and any((d / sub).iterdir())
                and np.fresh_for_script(d, sub)
                for sub in ("video", "storyboard"))
        return ok

    def _projects_root(self) -> Path:
        """Папка, среди подпапок которой лежат проекты текущего канала.

        Здесь всюду стояло self._project.parent, и оно врало в обе стороны:
        пока рабочей папкой был корень канала, .parent давал папку рядом с
        софтом — и список «проектов» оказывался списком КАНАЛОВ вперемешку с
        мусорными папками. Спрашиваем канал напрямую, а .parent оставляем
        запасным вариантом для работы вообще без каналов.
        """
        ch = self._channel()
        if ch:
            root = channels_mod.projects_dir(ch)
            if not root.is_absolute():
                root = BASE / root
            try:
                cur = self._project.resolve()
                r = root.resolve()
                if cur == r or r in cur.parents:
                    return root
            except OSError:
                pass
        return self._project.parent

    def get_state(self):
        d = self._project
        pending_veo = 0
        try:
            import veo_client
            veo_client.configure_task_store(d)
            pending_veo = len(veo_client.pending_tasks())
        except Exception:
            pass
        subs = []
        srt = d / "subs" / "voiceover.srt"
        if srt.exists():
            try:
                subs = [list(r) for r in core.parse_srt(srt)]
            except Exception:
                pass
        projects = []
        try:
            root = self._projects_root()
            cand = channels_mod.channel_projects(root)
            # Сам корень канала тоже бывает проектом: в нём лежат ролики,
            # снятые до того, как автопилот начал раскладывать их по датам.
            # Без этой строки такой ролик пропадал бы из списка совсем.
            if channels_mod.is_project_dir(root) and root not in cand:
                cand.insert(0, root)
            for p in cand:
                ch = self._checks(p)
                projects.append({
                    "name": p.name, "path": str(p),
                    "done": sum(ch.values()), "total": len(ch),
                    "current": p == d,
                    "tags": [t for t, v in
                             [("готов к загрузке", ch["Рендер"])] if v],
                })
        except OSError:
            pass
        return {
            "project": str(d), "version": APP_VERSION,
            "checks": self._checks(d), "projects": projects[:8],
            "pending_veo": pending_veo,
            "script": self._read("script.txt"),
            "scenes": self._read("scenes.txt"),
            "overlays": self._read("overlays.txt"),
            "subs": subs,
        }

    def noop(self):
        return True

    # ---------- каналы ----------
    def channels_get(self):
        """Профили каналов + какой сейчас выбран."""
        return {"channels": channels_mod.load(),
                "current": self._settings.get("current_channel", "")}

    def channel_save(self, ch: dict):
        """Создать или обновить профиль. id — латиницей, он же имя папки."""
        cid = str(ch.get("id", "")).strip()
        if not cid:
            cid = re.sub(r"[^\w\-]+", "_",
                         str(ch.get("name", "")).strip().lower()) or "channel"
            ch["id"] = cid
        channels_mod.upsert(ch)
        self.log(f"[Каналы] Сохранён профиль «{ch.get('name', cid)}»")
        return self.channels_get()

    def channel_select(self, channel_id: str):
        """Переключиться на канал: дальше все запуски идут в его папку и с
        его настройками."""
        ch = channels_mod.get(channel_id)
        if not ch:
            self.log(f"[Каналы] Нет профиля «{channel_id}»", "warn")
            return self.get_state()
        self._settings["current_channel"] = channel_id
        root = channels_mod.projects_dir(ch)
        if not root.is_absolute():
            root = BASE / root
        root.mkdir(parents=True, exist_ok=True)
        # Здесь безусловно вставал КОРЕНЬ канала. Но ролики живут в подпапках
        # с датой (abyss/2026-08-04) — их заводит автопилот, — и выбор канала
        # молча уводил работу из почти готового ролика в пустой корень:
        # «Генерировать видео» начинало всё с нуля, а сценарий, озвучка и
        # ИИ-кадры оставались лежать в подпапке. Дважды за день это стоило
        # целого ролика. Поэтому подхватываем самый свежий проект канала.
        projs = channels_mod.channel_projects(root)
        d = projs[0] if projs else root
        self._project = d
        self._settings["last_project"] = str(d)
        self._save_settings_file()
        self._configure_veo_store()
        self.log(f"[Каналы] Канал «{ch['name']}» — язык {ch['lang']}, "
                 f"жанр «{ch['tone']}», стиль «{ch['visual_style']}»"
                 + (f", голос {ch['voice']}" if ch.get("voice") else ""))
        # Какой именно проект стал текущим — обязательно вслух. Именно
        # молчание и стоило роликов: со стороны выбор канала выглядел
        # безобидным, а рабочая папка под ним менялась.
        if projs:
            self.log(f"[Каналы] Текущий проект — «{d.name}» (самый свежий из "
                     f"{len(projs)}). Другой можно выбрать в списке проектов.")
        else:
            self.log(f"[Каналы] Отдельных папок-проектов внутри «{root.name}» "
                     "нет — работаем в самой папке канала")
        return self.get_state()

    def _channel(self) -> dict | None:
        return channels_mod.get(self._settings.get("current_channel", ""))

    def _sync_project_to_channel(self, log=None) -> bool:
        """Рабочая папка должна лежать ВНУТРИ папки выбранного канала.

        Если нет — чиним и говорим вслух. Молчать тут нельзя: расхождение
        стоит целого ролика, причём заметить его можно только постфактум,
        найдя чужой сценарий в чужой папке.
        """
        ch = self._channel()
        if not ch:
            return False
        root = channels_mod.projects_dir(ch)
        if not root.is_absolute():
            root = BASE / root
        try:
            cur = self._project.resolve()
            if cur == root.resolve() or root.resolve() in cur.parents:
                return False               # всё на месте
        except OSError:
            pass
        root.mkdir(parents=True, exist_ok=True)
        # Не в корень канала, а в его самый свежий проект: корень пустой, и
        # починка расхождения сама по себе означала бы «начать ролик заново».
        dst = channels_mod.latest_project(root)
        msg = (f"[Канал] Рабочая папка «{self._project}» не принадлежит каналу "
               f"«{ch['name']}» — переключаю на «{dst}». Иначе ролик этого "
               "канала записался бы в чужой.")
        self._project = dst
        self._settings["last_project"] = str(dst)
        try:
            self._save_settings_file()
        except OSError:
            pass
        (log or getattr(self, "_log_raw", print))(msg, "warn")
        return True

    # ---------- проект ----------
    def set_project(self, path: str):
        if path:
            self._project = Path(path)
            self._settings["last_project"] = str(self._project)
            self._save_settings_file()
            self._configure_veo_store()

    def browse_project(self):
        res = self._win.create_file_dialog(webview.FOLDER_DIALOG)
        if res:
            self.set_project(res[0])

    def new_project(self, name: str):
        import re
        safe = re.sub(r"[^\w\- ]+", "_", name or "").strip() or "project"
        # Рядом с проектами канала, а не рядом с самим каналом: пока здесь
        # стояло self._project.parent, «Новый проект» из канала без подпапок
        # создавал папку в корне софта — вне канала, и ролик уезжал мимо
        # его настроек.
        d = self._projects_root() / safe
        d.mkdir(parents=True, exist_ok=True)
        self.set_project(str(d))
        self.log(f"[Проект] Создан: {d}")

    def rename_project(self, path: str, new_name: str):
        import re
        safe = re.sub(r"[^\w\- ]+", "_", new_name or "").strip()
        if not safe:
            return
        old = Path(path)
        dst = old.parent / safe
        if dst.exists() and dst != old:
            self.log(f"[Проект] «{safe}» уже существует — выбери другое имя",
                     "warn")
            return
        try:
            old.rename(dst)
            self.log(f"[Проект] Переименован: {old.name} -> {safe}", "ok")
            if old == self._project:
                self.set_project(str(dst))
        except OSError as e:
            self.log(f"[Проект] Не удалось переименовать: {e}", "err")

    def delete_project(self, path: str):
        import shutil
        d = Path(path)
        if d.exists():
            shutil.rmtree(d, ignore_errors=True)
            self.log(f"[Проект] Удалён: {d}")
        if d == self._project:
            self.set_project(str(d.parent / "project1"))

    def delete_current_project(self):
        self.delete_project(str(self._project))

    def open_project_folder(self, path: str):
        if Path(path).exists():
            os.startfile(path)

    def add_own_media(self):
        """Свои фото/видео -> storyboard/ проекта (попадут в пул рендера)."""
        import shutil
        res = self._win.create_file_dialog(
            webview.OPEN_DIALOG, allow_multiple=True,
            file_types=("Медиа (*.mp4;*.mov;*.jpg;*.jpeg;*.png;*.webp)",
                        "Все файлы (*.*)"))
        if not res:
            return 0
        dst = self._project / "storyboard"
        dst.mkdir(parents=True, exist_ok=True)
        n = 0
        for src in res:
            s = Path(src)
            if s.suffix.lower() not in {".mp4", ".mov", ".mkv", ".webm",
                                        ".jpg", ".jpeg", ".png", ".webp"}:
                continue
            target = dst / f"own_{s.name}"
            try:
                shutil.copy2(s, target)
                n += 1
                self.log(f"[Материалы] Добавлен: {target.name}", "ok")
            except OSError as e:
                self.log(f"[Материалы] {s.name}: {e}", "err")
        self.log(f"[Материалы] Добавлено своих файлов: {n} "
                 "(попадут в рендер вперемешку со стоками)")
        return n

    def open_folder(self):
        self._project.mkdir(parents=True, exist_ok=True)
        os.startfile(self._project)

    def open_result(self, name: str = ""):
        import re
        name = re.sub(r"[^\w\- ]+", "_", (name or "").strip()) or "output_final"
        if not name.lower().endswith(".mp4"):
            name += ".mp4"
        p = self._project / name
        if not p.exists():                      # запасной — стандартное имя
            p = self._project / "output_final.mp4"
        if p.exists():
            os.startfile(p)
        else:
            self.log(f"{name} ещё нет — сначала собери видео", "warn")

    # ---------- сценарий ----------
    def save_script(self, text: str):
        self._project.mkdir(parents=True, exist_ok=True)
        f = self._project / "script.txt"
        text = text.strip()
        # ТОТ ЖЕ ТЕКСТ НЕ ПЕРЕЗАПИСЫВАЕМ. По времени правки script.txt
        # решается, относится ли лежащее в папке (озвучка, субтитры,
        # раскадровка, кадры) к текущему ролику или осталось от прошлого —
        # см. night_plan.fresh_for_script. _tts_step сохраняет сценарий на
        # КАЖДОМ прогоне, и без этой проверки время обновлялось бы даже когда
        # ничего не менялось: всё готовое разом становилось бы «чужим», а это
        # час платных ИИ-кадров заново на каждом повторном запуске.
        try:
            if f.exists() and f.read_text(encoding="utf-8") == text:
                self.log("[Сценарий] Тот же текст — файл не трогаю "
                         "(иначе готовые кадры и озвучка сочтутся чужими)")
                return
        except (OSError, UnicodeDecodeError):
            pass
        f.write_text(text, encoding="utf-8")
        self.log(f"[Сценарий] Сохранён: {f}")

    def auto_scenes(self, text: str):
        scenes = core.auto_scenes(text)
        self._project.mkdir(parents=True, exist_ok=True)
        (self._project / "scenes.txt").write_text(scenes + "\n", encoding="utf-8")
        self.log(f"[Сцены] Размечено {scenes.count(chr(10)) + 1} сцен по абзацам")
        return scenes

    def gen_script(self, topic: str, minutes: int,
                   tone: str = "документальный", lang: str = "английский"):
        key = self._settings.get("gemini_key", "") or self._settings.get("agnes_key", "")

        # Профиль канала задаёт язык, жанр, ДЛИНУ и свой голос повествования.
        # Длина здесь особенно важна: она выведена из замеров ниши (у дома
        # 12 мин, у true crime 45), а выпадающий список на странице остался
        # общим на все каналы — без этой строки ролик выходил бы той длины,
        # которая случайно осталась в списке.
        ch = self._channel()
        if ch:
            lang = ch.get("lang") or lang
            tone = ch.get("tone") or tone
            if ch.get("minutes"):
                if int(minutes) != int(ch["minutes"]):
                    self.log(f"[Канал] Длина {ch['minutes']} мин из профиля "
                             f"«{ch['name']}» (в списке стояло {minutes})")
                minutes = int(ch["minutes"])

        def job():
            text = core.gen_script(topic, int(minutes), key, self.log,
                                   tone=tone, lang=lang,
                                   extra=(ch or {}).get("script_extra", ""))
            self.save_script(text)
            self._write_meta(tone=tone, topic=topic,
                             **({"channel": ch["id"]} if ch else {}))
            self._js(f"$('scriptText').value = {json.dumps(text)}; updateStats()")
        self._bg("Генерация сценария", job)

    # ---------- озвучка / музыка ----------
    def _tts_step(self, p: dict):
        # Профиль канала накладывается ЗДЕСЬ, как у рендера в _render_opts:
        # кнопка «Озвучка» шла мимо него, и при выбранном канале с включённым
        # «Разнообразием» одиночная озвучка брала СЛУЧАЙНЫЙ голос вместо
        # канального — ролик выходил чужим голосом, хотя канал голос ЗАДАЁТ,
        # а не предлагает. Наложение идемпотентно: generate_all накладывает
        # профиль сам, и повтор здесь ничего не меняет (включая channel_locked,
        # по которому «Разнообразие» ниже отличает запертые поля).
        ch = self._channel()
        if ch:
            p = channels_mod.apply_to_params(ch, p)
        text = (p.get("script") or "").strip() or self._read("script.txt")
        if not text:
            raise RuntimeError("Нет сценария — заполни страницу «Сценарий».")
        self.save_script(text)
        # Режиссёрские ремарки в скобках диктор зачитал бы вслух. Сохраняем
        # их отдельным файлом (по ним снимают и подбирают кадры) и озвучиваем
        # только чистый текст.
        text, cues = core.strip_cues(text)
        cf = self._project / "cues.txt"
        if cues:
            cf.write_text("\n".join(cues), encoding="utf-8")
            self.log(f"[Озвучка] Вырезал {len(cues)} режиссёрских ремарок "
                     "— сохранил в cues.txt, вслух они не пойдут")
        elif cf.exists():
            # Файл писался ТОЛЬКО когда ремарки есть. У сценария без ремарок
            # в папке оставались ремарки прошлого ролика — по ним подбирают
            # кадры и снимают, то есть человек работал бы по чужому листу.
            cf.write_text("", encoding="utf-8")
            self.log("[Озвучка] В сценарии нет режиссёрских ремарок — очистил "
                     "cues.txt, там лежали ремарки прошлого ролика", "warn")
        voice = p.get("voice")
        rate = int(str(p.get("rate", "0%")).replace("%", "").replace("+", ""))
        if p.get("randomize"):
            # Голос — постоянный признак канала: если профиль его задал, он
            # в channel_locked, и «Разнообразие» перебирает всё остальное,
            # но не голос. Раньше ради этого целиком гасили randomize — и
            # заодно теряли разнообразие монтажа и цветокора.
            if "voice" in (p.get("channel_locked") or ()):
                self.log(f"[Канал] Голос {voice} и темп {rate:+d}% из "
                         "профиля — «Разнообразие» их не трогает")
            else:
                st = core.project_style(self._project)
                voice, rate = st["voice"], st["rate"]
                self.log(f"[Разнообразие] Голос {voice}, темп {rate:+d}% "
                         "(случайно под этот проект)")
        enh = bool(p.get("enhance"))

        # ГОТОВУЮ ОЗВУЧКУ НЕ ПЕРЕДЕЛЫВАЕМ. Дело не в трёх сэкономленных
        # минутах: новая озвучка — это другие тайминги субтитров, а из них
        # строятся планы и запросы к кадрам, из которых складываются ИМЕНА
        # файлов. Переозвучил — имена поехали, и час готовых ИИ-кадров на
        # диске перестаёт узнаваться. Замер 2026-08-04: при возобновлении
        # прогона подхватилось 2 кадра из 76 именно по этой причине.
        #
        # Признак «та же самая озвучка» — отпечаток текста ВМЕСТЕ с голосом,
        # темпом и обработкой: поменял голос в профиле — озвучка обязана
        # перезаписаться, иначе ролик выйдет прежним голосом молча.
        mp3 = self._project / "audio" / "voiceover.mp3"
        stamp_file = self._project / "audio" / ".voice_stamp"
        stamp = hashlib.sha1(
            f"{text}|{voice}|{rate}|{enh}|{p.get('pauses', True)}|"
            f"{p.get('engine', '')}|{p.get('polly_engine', '')}"
            .encode("utf-8")).hexdigest()
        if mp3.exists() and mp3.stat().st_size > 10_000:
            try:
                if stamp_file.read_text(encoding="utf-8").strip() == stamp:
                    self.log("[Озвучка] Уже озвучено этим же текстом и "
                             "голосом — беру готовый файл, тайминги не "
                             "поедут")
                    return
            except OSError:
                pass

        # Регистр не важен: «edge» строчными раньше означало Polly, и вызов
        # без ключей AWS валил весь ролик уже после готового сценария.
        # Пустое значение — тоже Edge: это бесплатный путь, к нему и падаем.
        if "edge" in str(p.get("engine") or "Edge").lower():
            core.tts_edge(text, voice, self._project, self.log, rate, enh,
                          bool(p.get("pauses", True)))
        else:
            # Движок Polly выбирает ПОЛЬЗОВАТЕЛЬ: цены различаются в 25 раз
            # ($4/млн у standard против $100/млн у long-form — на ролике в
            # 32 тыс. символов это $0.13 против $3.23). Прошивать такой
            # выбор в код нельзя, это чужие деньги. По умолчанию neural.
            eng = str(p.get("polly_engine", "neural")).strip() or "neural"
            core.tts_polly(text, voice, eng, self._project,
                           self.log, rate, bool(p.get("pauses", True)), enh)
        try:
            stamp_file.write_text(stamp, encoding="utf-8")
        except OSError:
            pass      # не смогли записать отпечаток — просто переозвучим потом

    def tts(self, p: dict):
        self._bg("Озвучка", lambda: self._tts_step(p))

    def pick_music(self):
        # мультивыбор файлов -> несколько путей через | (плейлист)
        res = self._win.create_file_dialog(
            webview.OPEN_DIALOG, allow_multiple=True,
            file_types=("Аудио (*.mp3;*.wav;*.m4a;*.ogg;*.flac)",
                        "Все файлы (*.*)"))
        return " | ".join(res) if res else None

    def pick_folder(self):
        res = self._win.create_file_dialog(webview.FOLDER_DIALOG)
        return res[0] if res else None

    def mix_music(self, path: str, gain: int):
        def job():
            voice = self._project / "audio" / "voiceover.mp3"
            if not voice.exists():
                raise RuntimeError("Сначала озвучка.")
            src = path.strip() if path else self._settings.get("music_dir", "")
            if not src:
                raise RuntimeError("Укажи файл(ы) или папку с музыкой.")
            self._settings["music_dir"] = src
            self._save_settings_file()
            core.add_music(voice, src, self.log, int(gain))
        self._bg("Музыка", job)

    def _do_auto_music(self, gain: int) -> bool:
        """Сам выбирает трек под жанр сценария и подмешивает. Сначала смотрит
        в локальной библиотеке (settings.music_library); если для этого
        настроения там пусто, а указан ключ Jamendo — сам качает один
        подходящий трек (коммерческая лицензия) и кладёт в библиотеку
        насовсем. Возвращает False (без исключения), если библиотека вообще
        не настроена — используется и кнопкой, и общей цепочкой рендера,
        где отсутствие музыки не должно рушить весь пайплайн."""
        voice = self._project / "audio" / "voiceover.mp3"
        if not voice.exists():
            raise RuntimeError("Сначала озвучка.")
        lib = self._music_dir()
        tone = self._read_meta().get("tone", "документальный")
        # жанр один на весь канал, поэтому по нему все документалки получали
        # одинаковый calm — уточняем по СОДЕРЖАНИЮ сценария, а таблица
        # остаётся страховкой на случай, если LLM недоступна
        by_tone = TONE_TO_MOOD.get(tone, "calm")
        script = self._read("script.txt")
        hint = core.guess_music_mood(
            script, by_tone,
            self._settings.get("gemini_key", "") or self._settings.get("agnes_key", ""),
            self.log)
        if hint != by_tone:
            self.log(f"[Музыка] По сценарию настроение «{hint}» "
                     f"(по жанру было бы «{by_tone}»)")
        # Характер канала поверх содержания. Раньше выбор кончался на строке
        # выше — и три канала, у которых тон в профиле «документальный»,
        # получали один и тот же calm из одной и той же папки.
        pal = (self._channel() or {}).get("palette", "")
        snd = core.sound_palette_of(pal)
        mood = core.pick_music_mood(hint, pal, seed_text=script)
        gain = int(gain) + int(snd["music_gain"])
        if mood != hint:
            self.log(f"[Музыка] Звуковой профиль «{snd['name']}» сместил "
                     f"настроение «{hint}» -> «{mood}»")
        try:
            track = core.pick_music_by_mood(Path(lib), mood)
        except FileNotFoundError:
            # Источников теперь ТРИ, и последний не требует ключа. Раньше их
            # было два, и оба молча оказались мертвы: библиотека пуста, а
            # client_id Jamendo не авторизован (проверено — API отвечает
            # «Your credential is not authorized»). Музыка не появлялась НИ В
            # ОДНОМ ролике, ошибка гасилась в warn, рендер брал голый голос.
            track, why = None, []
            jkey = self._jamendo_key()
            if jkey:
                self.log(f"[Музыка] Локально нет «{mood}» — качаю с Jamendo...")
                try:
                    found = core.jamendo_search(mood, jkey, count=1)
                    if found:
                        track = core.jamendo_download(found[0],
                                                      Path(lib) / mood, self.log)
                    else:
                        why.append("Jamendo: нет трека с коммерческой лицензией")
                except Exception as e:
                    why.append(f"Jamendo: {e}")
            else:
                why.append("Jamendo: ключ не указан")
            if track is None:
                self.log("[Музыка] Пробую Internet Archive (без ключа)...")
                try:
                    track = core.archive_music(mood, Path(lib) / mood, self.log)
                except Exception as e:
                    why.append(f"Архив: {e}")
            if track is None:
                self.log("[Музыка] Пробую Openverse (без ключа)...")
                try:
                    track = core.openverse_music(mood, Path(lib) / mood, self.log)
                except Exception as e:
                    why.append(f"Openverse: {e}")
            if track is None:
                raise RuntimeError(
                    f"Нет треков настроения «{mood}»: " + "; ".join(why)
                    + f". Положи mp3 в {Path(lib) / mood} вручную.")
        # Профиль называем по имени — как цветокор в журнале рендера. Строка
        # должна отвечать на вопрос «почему этот ролик звучит так»: видно и
        # что услышала модель, и как это сместил канал, и с какой громкостью
        # пойдёт подложка.
        self.log(f"[Музыка] Профиль «{snd['name']}» (палитра «{pal or 'нет'}»): "
                 f"жанр «{tone}», по сценарию «{hint}» -> настроение «{mood}» "
                 f"из {len(core.MUSIC_MOODS)} доступных -> {track.name}, "
                 f"{gain} dB")
        core.add_music(voice, track, self.log, int(gain))
        return True

    def auto_music(self, gain: int):
        def job():
            if not self._do_auto_music(int(gain)):
                raise RuntimeError(
                    "Сначала укажи «Библиотека музыки» в Настройках — папку, "
                    "куда будут ложиться треки (свои или с Jamendo).")
        self._bg("Музыка (авто)", job)

    def _jamendo_key(self) -> str:
        """Ключ Jamendo: сначала Настройки, потом .env. Остальные ключи давно
        читаются и оттуда тоже — а этот брался ТОЛЬКО из настроек, поэтому
        прописанный в .env он молча игнорировал, и подбор музыки пропускался
        без единого слова в журнале."""
        return (self._settings.get("jamendo_key", "").strip()
                or os.getenv("JAMENDO_CLIENT_ID", "").strip())

    def _music_dir(self) -> str:
        """Папка библиотеки музыки. Пустая настройка — не повод пропускать
        шаг: берём music_library рядом с софтом (она в .gitignore)."""
        lib = self._settings.get("music_library", "").strip()
        return lib or str(BASE / "music_library")

    def fill_music_library(self, per_mood: int):
        """Разово наполняет все 5 папок настроения треками с Jamendo — после
        этого auto_music работает вообще без интернета."""
        def job():
            lib = self._music_dir()
            jkey = self._jamendo_key()
            if not jkey:
                raise RuntimeError("Сначала укажи Jamendo API Key в Настройках "
                                   "или JAMENDO_CLIENT_ID в .env "
                                   "(бесплатно на jamendo.com/developer).")
            core.fill_music_library_jamendo(Path(lib), jkey, self.log,
                                            int(per_mood))
        self._bg("Наполнение библиотеки музыки", job)

    def add_asmr(self, path: str, every: float):
        def job():
            # Через core.voice_track — тем же правилом, что раскадровка и
            # рендер: микс, оставшийся от прошлого ролика, здесь получил бы
            # поверх чужой начитки ещё и звуки быта.
            base = core.voice_track(self._project, self.log)
            if not base.exists():
                raise RuntimeError("Сначала озвучка (и по желанию музыка).")
            if not (path or "").strip():
                raise RuntimeError("Укажи папку со звуками быта.")
            # Палитра канала — та же, что у монтажа: плотность и громкость
            # быта это такой же признак канала, как переходы.
            core.add_ambience(base, path.strip(), self.log,
                              every=float(every),
                              palette=(self._channel() or {}).get("palette", ""))
        self._bg("ASMR-звуки", job)

    # ---------- субтитры / стоки / раскадровка ----------
    def subs(self, model: str, line_width: int = 42, lang: str = "английский"):
        # Язык берём из профиля канала — так же, как озвучка (_tts_step) и
        # рендер (_render_opts). Выпадающий список на странице общий на все
        # каналы, и на испанском канале кнопка «Транскрибировать» форсила
        # whisper английский (--language + модель .en): субтитры выходили
        # мусором, а по их таймкодам режется ВЕСЬ монтаж и ставятся оверлеи.
        ch = self._channel()
        if ch and ch.get("lang"):
            if ch["lang"] != lang:
                self.log(f"[Канал] Язык субтитров «{ch['lang']}» из профиля "
                         f"«{ch['name']}» (в списке стояло «{lang}»)")
            lang = ch["lang"]

        def job():
            audio = self._project / "audio" / "voiceover.mp3"
            if not audio.exists():
                raise RuntimeError("Сначала озвучка.")
            core.transcribe_whisper(audio, model, self._project, self.log,
                                    int(line_width), lang)
        self._bg("Транскрибация", job)

    def stocks(self, scenes_text: str, kenburns: bool):
        def job():
            if not scenes_text.strip():
                raise RuntimeError("Список сцен пуст — «Сцены по абзацам» "
                                   "на странице Сценарий.")
            (self._project / "scenes.txt").write_text(scenes_text,
                                                     encoding="utf-8")
            core.fetch_media(scenes_text, self._project, self.log,
                             pexels_keys=self._settings.get("pexels_keys", ""),
                             pixabay_keys=self._settings.get("pixabay_keys", ""),
                             kenburns=bool(kenburns))
        self._bg("Стоки", job)

    def storyboard(self, beat: float, genvideo: bool,
                   visual_mode: str = "stock", visual_style: str = "",
                   ai_ratio: float = 0.85):
        def job():
            if visual_mode == "ai":
                self.log("[Раскадровка] Режим ЕДИНЫЙ СТИЛЬ: каждый кадр "
                         f"генерируется ИИ («{visual_style}»). Это даёт вид "
                         "как у канала, но идёт МЕДЛЕННО (сотни картинок) — "
                         "оставь работать.")
            elif visual_mode == "mixed":
                self.log(f"[Раскадровка] Режим MIXED: ~{ai_ratio:.0%} планов "
                         "будут намеренно ИИ-кадрами (не только когда сток "
                         "не найден) — меньше «сплошного стока» в ролике.")
            core.auto_storyboard(
                self._project, self.log,
                self._settings.get("pexels_keys", ""),
                self._settings.get("pixabay_keys", ""),
                float(beat),
                self._settings.get("gemini_key", ""),
                self._settings.get("agnes_key", ""),
                bool(genvideo),
                int(self._settings.get("max_unique", 200)),
                visual_mode, visual_style, float(ai_ratio))
        self._bg("Раскадровка", job)

    # ---------- оверлеи ----------
    def suggest_overlays(self, dur: float = 0):
        srt = self._project / "subs" / "voiceover.srt"
        if not srt.exists():
            self.log("Сначала транскрибация — оверлеи ставятся по таймкодам",
                     "warn")
            return None
        manifest = []
        mf = self._project / "manifest.json"
        if mf.exists():
            try:
                manifest = json.loads(mf.read_text(encoding="utf-8"))
            except Exception:
                pass
        text = overlays.suggest_overlays(core.parse_srt(srt), manifest,
                                         dur=float(dur or 0))
        self.log("[Оверлеи] Черновик готов — вычитай перед рендером")
        return text

    def save_overlays(self, text: str):
        self._project.mkdir(parents=True, exist_ok=True)
        (self._project / "overlays.txt").write_text(text.strip() + "\n",
                                                   encoding="utf-8")
        # Запоминаем, ПОД КАКИЕ субтитры сделана эта расстановка: иначе для
        # следующего ролика того же канала (рабочая папка одна на все) не
        # отличить ручную правку ЭТОГО ролика от файла, оставшегося от
        # прошлого.
        self._write_meta(overlays_srt=self._srt_sig())
        self.log("[Оверлеи] Сохранено: overlays.txt")

    # ---------- рендер ----------
    def _render_opts(self, p: dict) -> dict:
        # Профиль канала накладывается ЗДЕСЬ, а не только в generate_all:
        # раньше кнопка «Рендер» шла мимо него, и пересборка готового
        # проекта выходила с общими субтитрами вместо канальных — то есть
        # ровно тот случай, когда пересобирают ради настроек канала, их и
        # терял. Наложение идемпотентно, повтор после generate_all безвреден.
        ch = self._channel()
        if ch:
            p = channels_mod.apply_to_params(ch, p)
        opts = {"resolution": p.get("resolution", "1080p"),
                "fps": int(p.get("fps", 30)),
                "intensity": p.get("intensity", "средняя"),
                "quality": p.get("quality", "обычное"),
                "sub_size": p.get("sub_size", "средние"),
                "sub_style": p.get("sub_style", "bold_box"),
                # гарнитура канала; «Разнообразие» ниже её НЕ трогает —
                # шрифт это постоянный признак канала, а не то, что должно
                # меняться от ролика к ролику
                "sub_font": p.get("sub_font", ""),
                "look": p.get("look", "нет"),
                # Палитра — почерк канала: какими переходами он говорит и как
                # двигает камеру. Берётся ТОЛЬКО из профиля и «Разнообразием»
                # не перебивается: разнообразие меняет ролики внутри канала,
                # а палитра отличает каналы друг от друга.
                "palette": (ch or {}).get("palette", ""),
                "subs": bool(p.get("subs", True)),
                "sfx": bool(p.get("sfx", True)),
                "grain": bool(p.get("grain")),
                "vignette": bool(p.get("vignette")),
                "letterbox": bool(p.get("letterbox")),
                "vhs": bool(p.get("vhs")),
                "chromab": bool(p.get("chromab")),
                "chapters_grade": bool(p.get("chapters")),  # render.py читает chapters_grade
                # Пылинки в луче света — ВСЕГДА, на любом канале и любой
                # длине. Это то, что отличает кадр «из стока» от кадра «из
                # фильма»: воздух перестаёт быть пустым. Эффекты в рендере
                # были давно, но по умолчанию выключены, и включить их можно
                # было только галкой на конкретный прогон — то есть почти
                # никогда. Явное False в параметрах по-прежнему выключает.
                "bloom": p.get("bloom", True) is not False,
                "light_leak": p.get("light_leak", True) is not False,
                "dust": bool(p.get("dust")),
                "sand": p.get("sand", True) is not False,
                "stars": bool(p.get("stars")),
                "embers": bool(p.get("embers")),
                "flicker": bool(p.get("flicker")),
                "draft": bool(p.get("draft"))}
        if p.get("randomize"):   # свой «почерк» на каждый проект
            # Палитра канала задаёт, КАКАЯ атмосфера ему свойственна: у одного
            # свечение редкость, у другого подпись. Без неё все три канала
            # крутили эффекты с одними вероятностями и пахли одинаково.
            st = core.project_style(self._project, opts.get("palette", ""))
            upd = {"intensity": st["intensity"], "sub_style": st["sub_style"],
                   "sub_size": st["sub_size"], "look": st["look"],
                   "bloom": st["bloom"], "light_leak": st["light_leak"],
                   "dust": st["dust"], "flicker": st["flicker"]}
            # Поля, прибитые профилем канала (стиль и размер субтитров), —
            # такой же постоянный признак, как гарнитура: они не должны
            # меняться от ролика к ролику. Всё остальное — монтаж, цветокор,
            # эффекты — меняется, ради этого «Разнообразие» и существует.
            # Раньше канал с заданным голосом гасил флаг целиком, и ролики
            # канала выходили один в один.
            locked = [k for k in (p.get("channel_locked") or ()) if k in upd]
            for k in locked:
                upd.pop(k)
            opts.update(upd)
            fx = [n for n, k in (("bloom", "bloom"), ("засветка", "light_leak"),
                                 ("пыль", "dust"), ("мерцание", "flicker"))
                  if st[k]]
            # стиль субтитров выбирается всегда, но если галочка «Вшить
            # субтитры» снята — он никуда не пойдёт. Раньше лог всё равно
            # печатал «Субтитры «karaoke»», и это читалось как «субтитры
            # включены» — пишем честно, что именно будет в кадре.
            subs_note = (f"«{opts['sub_style']}»" if opts["subs"]
                         else "в кадр НЕ вжигаются (галочка снята)")
            # Цветокор называем ПО ИМЕНИ, а не «случайный». Строка печаталась
            # до того, как канальные поля выкидываются из случайного набора,
            # и на канале с закреплённым look читалась как «настройка канала
            # перебита» — хотя перебита она не была. Ложная тревога в журнале
            # стоит доверия ко всему остальному журналу.
            look_note = (f"«{opts.get('look')}» (из профиля канала)"
                         if "look" in locked
                         else f"«{opts.get('look', 'нет')}» (случайный)")
            self.log(f"[Разнообразие] Субтитры {subs_note}, монтаж "
                     f"«{opts['intensity']}», цветокор {look_note}, эффекты: "
                     f"{', '.join(fx) or 'нет'} (под этот проект)"
                     + (f"; из профиля канала не менялось: "
                        f"{', '.join(locked)}" if locked else ""))
        return opts

    def _auto_overlays(self):
        """Авто-расстановка моушн-графики по субтитрам (popup/счётчики/плашки).

        Здесь стояло «если overlays.txt непуст — выйти». Рабочая папка у
        канала ОДНА на все его ролики, и overlays.txt от прошлого ролика с
        диска никто не удаляет (ни generate_all, ни set_project, ни
        new_project — new_project вообще только mkdir). Поэтому каждый
        следующий ролик тихо, без единой строки в журнале, наследовал чужую
        расстановку: старые таймкоды, старый текст, старое количество — ровно
        жалоба «оверлеев мало и они не по делу».

        Признак «свой/чужой» — отпечаток субтитров, по которым расстановка
        сделана: оверлеи привязаны к ним таймкодами. Совпал — файл наш, ручные
        правки не трогаем; не совпал — переставляем заново, а прежний файл
        кладём рядом (overlays_prev.txt), чтобы ничья работа не пропала."""
        srt = self._project / "subs" / "voiceover.srt"
        if not srt.exists():
            return
        sig = self._srt_sig()
        ov = self._project / "overlays.txt"
        try:
            old = ov.read_text(encoding="utf-8").strip() if ov.exists() else ""
        except OSError:
            old = ""
        if old and self._read_meta().get("overlays_srt") == sig:
            self.log("[Оверлеи] Расстановка в overlays.txt сделана под эти же "
                     "субтитры — оставляю как есть (ручные правки целы)")
            return
        if old:
            (self._project / "overlays_prev.txt").write_text(
                old + "\n", encoding="utf-8")
            self.log("[Оверлеи] В папке лежала расстановка под ДРУГИЕ "
                     "субтитры (прошлый ролик) — переставляю заново, старое "
                     "сохранил в overlays_prev.txt", "warn")
        manifest = []
        mf = self._project / "manifest.json"
        # Из манифеста берутся КАРТИНКИ для popup-плашек. Он остаётся от
        # ручной закачки стоков и, как всё в общей папке канала, переживает
        # свой ролик — тогда в новом видео всплывали бы кадры прошлого.
        import night_plan as np
        if mf.exists() and not np.fresh_for_script(self._project,
                                                   "manifest.json"):
            self.log("[Оверлеи] manifest.json от прошлого ролика — плашки "
                     "делаю без его картинок", "warn")
        elif mf.exists():
            try:
                manifest = json.loads(mf.read_text(encoding="utf-8"))
            except Exception:
                pass
        # Постоянный бейдж канала на весь ролик. Функция это умела давно, но
        # параметр никто не передавал — код был мёртвым. Берём из профиля
        # канала, чтобы у каждого был свой знак присутствия автора.
        ch = self._channel()
        # Пауза между плашками и НАБОР ТИПОВ — из профиля канала. Оба поля
        # существовали и оба сюда не доезжали: min_gap лежит в channels.json
        # (5 / 7 / 11 с у трёх каналов), а сюда уходило умолчание 5.0 для
        # всех, потому что параметр просто не передавали. Из-за этого
        # 70-минутная философская документалка получала плотность разбора
        # аварии, а разница в темпе между каналами существовала только на
        # бумаге. Палитра решает, КАКИМИ типами канал говорит
        # (overlays.TYPE_MIX).
        gap = (ch or {}).get("min_gap")
        palette = ((ch or {}).get("palette") or "").strip().lower()
        text = overlays.suggest_overlays_auto(
            core.parse_srt(srt), manifest, self._project, self.log,
            min_gap=float(gap) if gap else 5.0,
            watermark=(ch or {}).get("watermark", ""),
            palette=palette)
        if text.strip():
            ov.write_text(text.strip() + "\n", encoding="utf-8")
            # метка «эта расстановка — под эти субтитры»: по ней повторный
            # запуск отличит её от наследства прошлого ролика
            self._write_meta(overlays_srt=sig)
            n = len([l for l in text.splitlines()
                     if l.strip() and not l.startswith("#")])
            self.log(f"[Оверлеи] Авто-расстановка (ИИ): {n} элементов "
                     "(popup/titlecard/collage/счётчики/плашки) добавлены "
                     "в ролик")

    def _regen_overlay_theme(self):
        """Каждое видео получает свою палитру оверлеев (акцент/баннер/плашка)
        под тему/жанр — иначе один и тот же янтарный шаблон кочует из видео
        в видео. Через Agnes, не Gemini: Gemini уже занят сценарием и первым
        упирается в 429 (дневная бесплатная квота), а это не должно от неё
        зависеть. Полная генерация КОДА компонентов (не только цвета) через
        LLM пробовалась отдельно и оказалась ненадёжной (типы игнорировались
        / пустые кадры) — оставлена выключенной (apply_theme, для ручного
        экспериментирования). Здесь — только палитра, сломать ей логику
        компонентов невозможно. Необязательный шаг: нет ключа/темы, или
        Agnes не осилил за несколько попыток — тихо остаёмся на текущей
        палитре, цепочка не должна падать из-за декоративного улучшения."""
        agnes_key = self._settings.get("agnes_key", "") or os.getenv("AGNES_API_KEY", "")
        if not agnes_key:
            return
        meta = self._read_meta()
        topic, tone = meta.get("topic", ""), meta.get("tone", "документальный")
        if not topic:
            return
        # Канал в запросе обязателен. Раньше сюда уходили только тема и жанр,
        # и палитра получалась своя у каждого РОЛИКА, но никакая у КАНАЛА:
        # три канала подряд могли выйти в одинаковой бирюзе, потому что
        # подбирали цвет независимо и про существование друг друга не знали.
        # Узнаваемость канала — это в первую очередь его цвет, и он должен
        # держаться из ролика в ролик, меняясь внутри своего семейства.
        ch = self._channel() or {}
        family = PALETTE_FAMILY.get((ch.get("palette") or "").strip(), "")
        theme = (f"Documentary video about: {topic}. Tone/genre: {tone}. "
                 + (f"This video belongs to the channel «{ch.get('name') or ch.get('id')}», "
                    f"whose permanent visual family is: {family} "
                    "Stay inside that family — the channel must stay "
                    "recognisable across its videos — but pick a distinct "
                    "shade within it for THIS topic. " if family else "")
                 + "Invent a distinctive color palette that fits THIS specific "
                   "topic — a video about something cold/scientific should not "
                   "look like one about crime or myth, etc. Avoid a generic "
                   "dark-charcoal-plus-amber default; pick colors that make "
                   "sense here.")
        self.log("[Цепочка] Палитра оверлеев — прошу Agnes подобрать под эту тему...")
        try:
            gen_remotion_gemini.apply_theme_palette(theme, agnes_key, self.log)
        except Exception as e:
            self.log(f"[Remotion/Тема] Не удалось: {e} — остаюсь на "
                     "текущей палитре", "warn")

    def render(self, p: dict):
        if self._reject_if_busy("Рендер"):
            return
        opts = self._render_opts(p)
        opts["out_name"] = p.get("out_name", "")
        self._settings["render_opts"] = opts
        self._save_settings_file()
        if (p.get("overlays") or "").strip():
            self.save_overlays(p["overlays"])
        self._bg("Рендер", lambda: render.render_project(
            self._project, self.log, self._progress, opts))

    def stop_render(self, by_user: bool = True):
        """Общий «Стоп». by_user=False зовёт ночной сторож, когда канал висит.

        Различать обязательно: нажатие человека гасит ночь целиком, а
        срабатывание сторожа — всего лишь один затянувшийся канал. Флаг у них
        общий (_cancel), поэтому по нему одному их не различить, а гадать
        нельзя: ошибка в любую сторону либо игнорирует «Стоп», либо тихо
        прекращает ночь после первого же таймаута.
        """
        if by_user:
            self._stop_by_user.set()
        # Кнопка одна, а стадий много: раньше она взводила только
        # render.CANCEL, то есть работала лишь если в этот момент крутился
        # ffmpeg. На озвучке, субтитрах и раскадровке нажатие отменяло задачи
        # Veo — и на этом всё: core продолжал работать, а цепочка в конце
        # всё равно запускала рендер (render_project ещё и сбрасывает CANCEL
        # на старте). Взводим общий флаг: его видит log() и проверки между
        # шагами цепочки.
        stage = self._busy
        if stage:
            self._cancel.set()
            self._log_raw(f"[Стоп] ⛔ Останавливаю «{stage}» — оборвётся на "
                          "ближайшем шаге, ffmpeg будет убит", "warn")
        else:
            # ничего не идёт — флаг НЕ взводим, иначе он дождётся следующей
            # кнопки и убьёт её ни за что
            self._log_raw("[Стоп] Сейчас ничего не выполняется — снимаю "
                          "только висящие задачи Veo", "warn")
        render.CANCEL.set()
        # core.CANCEL — отдельный флаг: render.CANCEL знает только про сборку
        # ролика, а озвучка, субтитры и раскадровка живут в core и о нём не
        # подозревали. Без этой строки весь механизм отмены в core.py —
        # мёртвый код: проверки расставлены, но флаг никто не взводит.
        # Он же гасит дерево дочерних процессов (ffmpeg, whisper), которые
        # иначе оставались сиротами: остановка через исключение из log()
        # обрывала питон, а процесс продолжал считать.
        core.CANCEL.set()
        veo_key = os.getenv("VEO_API_KEY", "").strip()
        if veo_key:
            try:
                import veo_client
                veo_client.configure_task_store(self._project)
                n = veo_client.cancel_pending_tasks(api_key=veo_key)
                if n:
                    self.log(f"[Рендер] VeoNonStop: отменено {n} задач "
                             "только этого проекта (освобождены слоты)", "warn")
            except Exception:
                pass   # нет активных задач/недоступен — не критично при Стопе

    def _grow_variant_library(self, topic: str = "") -> str | None:
        """Библиотека плашек ЭТОГО канала — на каждый ролик чуть богаче.

        Рост идёт двумя путями, и они не заменяют друг друга.

        Механический (variant_factory) держит нижнюю планку: у канала не может
        остаться тип с одним-двумя видами. Бесплатный, мгновенный, надёжный —
        нужен потому, что принадлежность плашек каналу без него означала бы
        бедность: разделить общую библиотеку на три и есть тот самый способ
        «ограничить каналы», против которого владелец возражал прямо.

        Дорогой (ИИ) добавляет штучный вид, какого нет ни у кого: своя
        материя, своя техника появления. Один на ролик — этого достаточно,
        чтобы за месяц у канала набралась своя, ни на что не похожая колода.

        Тип для ИИ берём тот, у которого СВОИХ видов меньше всего (иначе он
        будет снова и снова обогащать banner), а при равенстве — тот, что
        канал показывает каждый ролик. Любой провал молча пропускается: ролик
        от пополнения не зависит."""
        ch = self._channel()
        cid = ch["id"] if ch else ""
        palette = (ch or {}).get("palette", "").strip().lower()
        # Планка — ДО генерации: даже если ключа нет или ИИ откажет, канал
        # выйдет из этого шага с полным набором своих видов.
        if cid:
            try:
                import variant_factory
                variant_factory.ensure(cid, log=self.log)
            except Exception as e:
                self.log(f"[Цепочка] Планку видов канала выставить не "
                         f"удалось: {e}", "warn")
        key = (self._settings.get("gemini_key", "")
               or self._settings.get("agnes_key", ""))
        if not key:
            return None
        meta = gen_remotion_gemini.load_variants_meta()
        kinds = list(gen_remotion_gemini.TYPE_BRIEF)
        # считаем покрытие ПО ЭТОМУ КАНАЛУ: у соседнего канала может быть
        # десяток вариантов popup, но этому от них ни холодно ни жарко —
        # он их не увидит, значит и добирать надо свои
        counts = {k: len(overlays.BASE_VARIANTS.get(k, ("classic",)))
                  + len(overlays._library_variants(k, None, cid))
                  for k in kinds}
        use_hf = (len(meta) % 2 == 1) and overlays.hyperframes_available()
        eng = "HyperFrames" if use_hf else "Remotion"
        # Тип с наименьшим покрытием — но НЕ тот, что стоит в паузе после
        # серии провалов. Сама генерация такой тип уже отбивает мгновенно,
        # но выбор всё равно упирался в него на каждом ролике: покрытие у
        # провального типа не растёт, значит он вечно остаётся наименее
        # покрытым, и библиотека не пополнялась вообще ничем. Берём
        # следующего кандидата, а если в паузе оказались все — работаем как
        # раньше, пусть отобьётся на своём уровне.
        engine_id = "hyperframes" if use_hf else "remotion"
        signature = CHANNEL_SIGNATURE.get(palette, ())
        order = sorted(kinds,
                       key=lambda k: (counts[k], 0 if k in signature else 1, k))
        kind = next(
            (k for k in order
             if not gen_remotion_gemini._fail_cooldown(k, engine_id,
                                                       lambda *_: None)),
            order[0])
        # Стиль канала уходит в запрос вместе с темой ролика. Без него ИИ
        # придумывал вид «под тему видео», и вид этот с равной вероятностью
        # оказывался в чужих цветах: библиотека канала пополнялась плашками,
        # которые к каналу не имеют отношения — то есть принадлежность
        # соблюдалась формально, а на экране каналы снова смешивались.
        style = ""
        if ch:
            family = PALETTE_FAMILY.get(palette, "")
            style = (f"This overlay belongs to the channel "
                     f"«{ch.get('name') or cid}» ({ch.get('lang', '')}, tone: "
                     f"{ch.get('tone', '')}). Its permanent visual family is: "
                     f"{family} Its accent colour is {ch.get('accent', '')}. "
                     "Stay inside that family: the look must be recognisable "
                     "as this channel and must NOT be usable on a different "
                     "channel with a different family.")
        theme = core.gen_variant_theme(topic, kind, key, self.log, style=style)
        if not theme:
            return None
        self.log(f"[Цепочка] Новый оверлей «{kind}» через {eng} "
                 f"(у типа сейчас {counts[kind]} видов)"
                 + (f", канал «{ch['name']}»" if ch else "") + "…")
        fn = (gen_remotion_gemini.gen_variant_hyperframes if use_hf
              else gen_remotion_gemini.gen_variant)
        return fn(kind, theme, key, self.log, channel=cid)

    def grow_variants(self):
        self._bg("Новый оверлей",
                 lambda: self._grow_variant_library(
                     self._read_meta().get("topic", "")))

    def _check_and_fix_shots(self, limit: int = 0, every: int = 1) -> int:
        """Проверить подбор кадров зрением и перекачать те, что мимо.

        every=1 — смотрим КАЖДЫЙ план. Здесь стояло 3 «для экономии», и это
        было прямой причиной того, что кадры не отвечали тексту: чинится
        только то, что попало в выборку, поэтому две трети брака доезжали до
        зрителя неосмотренными. Проверка одного плана — один запрос к зрению,
        и идут они параллельно; против часов рендера это ничто."""
        key = (self._settings.get("gemini_key", "")
               or self._settings.get("agnes_key", ""))
        ch = self._channel()
        style = (ch or {}).get("visual_style", "")
        bad = core.review_storyboard(self._project, key, self.log,
                                     limit=limit, every=every)
        if not bad:
            return 0
        fixed = core.refix_storyboard(
            self._project, bad, self.log,
            self._settings.get("pexels_keys", ""),
            self._settings.get("pixabay_keys", ""),
            visual_style=style, prefer_ai=True)
        # Второй проход по ЗАМЕНЁННЫМ планам. Без него петля разомкнута:
        # новый кадр отправлялся зрителю непроверенным, хотя сгенерировать
        # мимо темы можно ровно так же, как найти мимо темы в стоке.
        if fixed:
            again = core.review_storyboard(
                self._project, key, self.log, only=[r["i"] for r in bad])
            if again:
                self.log(f"[Кадры] После замены осталось мимо: {len(again)}"
                         " — вторая попытка")
                fixed += core.refix_storyboard(
                    self._project, again, self.log,
                    self._settings.get("pexels_keys", ""),
                    self._settings.get("pixabay_keys", ""),
                    visual_style=style, prefer_ai=True)
        return fixed

    def check_shots(self):
        self._bg("Проверка кадров", lambda: self._check_and_fix_shots())

    def _do_thumbnails(self, count: int = 3) -> list[str]:
        """Обложки по сценарию: концепции -> AI-фон -> рендер -> проверка
        зрением на читаемость. Возвращает список путей к готовым JPG.

        Ничего не роняет: без сценария/ключей/картинок просто вернёт меньше
        вариантов или пустой список — обложка не критична для ролика."""
        text = self._read("script.txt")
        if not text:
            self.log("[Обложка] Нет сценария — пропускаю", "warn")
            return []
        key = (self._settings.get("gemini_key", "")
               or self._settings.get("agnes_key", ""))
        # Канал целиком, а не «ещё один параметр»: язык обложки, формула
        # ниши, запреты и палитра решают, что на ней будет написано и как
        # это будет выглядеть. До сих пор сюда не доезжало НИЧЕГО из этого,
        # и три канала получали обложки одной формы (см. core.THUMB_STYLES).
        ch = self._channel() or {}
        ideas = core.gen_thumbnail_ideas(text, key, self.log, count,
                                         channel=ch)
        if not ideas:
            self.log("[Обложка] Не удалось придумать концепции", "warn")
            return []
        # Сказать ЗАРАНЕЕ, что фонов не будет, а не выяснять это тремя
        # отказами подряд. Обложки при этом всё равно делаются — на тёмной
        # подложке: текст на плашке лучше, чем отсутствие обложки вовсе.
        core.image_budget_check(len(ideas), "cover", self.log)
        out_dir = self._project / "thumbs"
        out_dir.mkdir(parents=True, exist_ok=True)
        # meta.json ролика заполняет мастер, и visual_style там есть не
        # всегда: в готовых папках всех трёх каналов лежит meta.json из двух
        # полей (channel, topic). Без отката к профилю канала фон обложки
        # генерировался общим «кинематографичным» стилем даже там, где у
        # канала прописан свой.
        style = (self._read_meta().get("visual_style")
                 or ch.get("visual_style", ""))
        made = []
        for i, idea in enumerate(ideas, 1):
            head = idea["headline"]
            self.log(f"[Обложка] {i}/{len(ideas)}: «{head.replace(chr(10), ' / ')}»")
            bg = None
            if idea.get("bg_prompt"):
                try:
                    # wait_on_limit=False: обложка — не ролик. Ждать ради неё
                    # лимит нельзя: 2026-08-04 прогон встал здесь на полтора
                    # часа уже ПОСЛЕ того, как всё видео было собрано.
                    # Не вышло — обложка делается на тёмной подложке.
                    #
                    # purpose="cover" — высший приоритет в суточном лимите
                    # картинок: без обложки ролик не выложить, а кадр или
                    # косметическую перегенерацию пережить можно. Резерв под
                    # эти три штуки держат все остальные потребители
                    # (core.VEO_IMAGE_COVER_RESERVE).
                    bg = core.gen_image(idea["bg_prompt"],
                                        out_dir / f".bg{i}.jpg", key,
                                        self.log, style, wait_on_limit=False,
                                        purpose="cover")
                except Exception as e:
                    self.log(f"[Обложка] Фон не сгенерировался ({e}) — "
                             "делаю на тёмной подложке", "warn")
            dest = out_dir / f"thumb{i}.jpg"
            try:
                # accent и palette канала: цвет — признак канала, форма —
                # его жанр. Оба поля лежали в channels.json и не доезжали
                # до обложки, поэтому все каналы выходили с одной золотой
                # рамкой #f5c451 (значение по умолчанию render_thumbnail).
                overlays.render_thumbnail(head, dest, bg,
                                          idea.get("layout", "left"),
                                          ch.get("accent") or "#f5c451",
                                          log=self.log,
                                          style=ch.get("palette", ""),
                                          extra=idea)
            except Exception as e:
                self.log(f"[Обложка] Рендер {i} не вышел: {e}", "warn")
                continue
            # главная беда самодельных превью — текст, нечитаемый в ленте;
            # спрашиваем у модели, видно ли его, но вердикт НЕ блокирует
            try:
                verdict = core.vision_chat(
                    "This is a YouTube thumbnail. It will be seen 210px wide "
                    "in a feed. Reply with ONLY JSON: "
                    '{"ok":true|false,"problem":"<one short sentence>"}. '
                    "Set ok=false if the headline is hard to read at that "
                    "size, is cut off, or clashes with the background.",
                    dest.read_bytes(), key,
                    system="You are a YouTube thumbnail reviewer.")
                m = re.search(r"\{.*\}", verdict, re.S)
                if m:
                    data = json.loads(m.group(0))
                    if not data.get("ok"):
                        self.log(f"[Обложка] {dest.name}: замечание — "
                                 f"{data.get('problem', '')}", "warn")
            except Exception:
                pass   # проверка необязательна, обложка уже готова
            made.append(str(dest))
        if made:
            self.log(f"[Обложка] Готово: {len(made)} шт. в {out_dir.name}\\")
        return made

    def make_thumbnails(self, count: int = 3):
        self._bg("Обложки", lambda: self._do_thumbnails(int(count)))

    def seo(self):
        text = self._read("script.txt")
        if not text:
            self.log("Нет сценария для SEO", "warn")
            return None
        key = self._settings.get("gemini_key", "") or self._settings.get("agnes_key", "")
        # язык ролика и субтитры — иначе описание выходило по-английски для
        # русского сценария, а глав (тайм-кодов) не было вовсе
        ch = self._channel()
        out = core.gen_seo(
            text, key, self.log,
            (ch or {}).get("lang") or self._read_meta().get("lang", "английский"),
            self._project / "subs" / "voiceover.srt",
            # формула заголовков из разбора ниши — она решает больше всего:
            # на канале-образце разброс между лучшим и худшим в тысячу раз
            formula=(ch or {}).get("topic_formula", ""),
            # а канал целиком решает остальное: форму описания, набор тегов
            # и нарезку глав (script_shape), регистр речи (tone) и запреты
            # канала (avoid). Раньше всё это было общим на три канала
            channel=ch)
        (self._project / "seo.txt").write_text(out, encoding="utf-8")
        self.log("[SEO] Сохранено: seo.txt")
        return out

    # ---------- одна кнопка ----------
    def _sync_beat_to_intensity(self, beat: float, intensity: str) -> float:
        """Раскадровка качает по одному материалу на `beat` секунд, а рендер
        режет кадры по своей интенсивности (напр. «документальная 5с» —
        смена каждые ~5с) — если интенсивность режет чаще, чем раскадровка
        качает, несколько сцен подряд достаются одному и тому же файлу, и он
        неизбежно повторяется по всему ролику (в 5-минутном тесте: 127 смен
        кадра на 51 уникальный кадр из-за такого рассинхрона). Подгоняем
        beat под среднюю длительность плана интенсивности, если он крупнее —
        собственный (меньший) выбор пользователя не трогаем."""
        cfg = render.INTENSITY.get(intensity)
        if not cfg:
            return beat
        avg = (cfg["short_prob"] * sum(cfg["short"]) / 2
              + (1 - cfg["short_prob"]) * sum(cfg["long"]) / 2)
        return min(beat, avg)

    def _niche_brief(self, ch: dict) -> str:
        """Свежий разбор ниши под ЭТОТ ролик — не текст, вписанный однажды.

        yt_research в проекте был, но его никто не вызывал: формулы тем в
        профилях каналов кто-то вывел вручную один раз и вписал строкой.
        Анализ существовал и был мёртвым — не обновлялся и не влиял на
        конкретный ролик. Отсюда и ощущение конвейера: канал живёт по
        снимку ниши неизвестной давности.

        Кэш на сутки: ниша за час не меняется, а квота YouTube API
        конечна. Любой сбой — молча возвращаем пустое: без свежих данных
        ролик сделать можно, а вот падать на этом шаге нельзя.
        """
        ref = (ch.get("reference") or "").strip()
        if not ref:
            return ""
        import time as _t
        cache = BASE / ".niche_cache" / f"{ch['id']}.json"
        try:
            if cache.exists() and _t.time() - cache.stat().st_mtime < 86400:
                data = json.loads(cache.read_text(encoding="utf-8"))
            else:
                import yt_research
                data = yt_research.research(ref, log=lambda *_: None)
                cache.parent.mkdir(parents=True, exist_ok=True)
                cache.write_text(json.dumps(data, ensure_ascii=False),
                                 encoding="utf-8")
        except Exception as e:
            self.log(f"[Ниша] Свежий разбор не вышел ({e}) — иду на "
                     "формуле из профиля", "warn")
            return ""
        med = data.get("median_views") or 0
        top = data.get("top") or []
        flop = data.get("flop") or []
        if not top or not flop:
            return ""
        def _lines(vs):
            return "\n".join(
                f"  {v.get('views', 0):>8} | {v.get('seconds', 0) // 60:>3}m | "
                f"{v.get('title', '')[:80]}" for v in vs[:8])
        self.log(f"[Ниша] Разбор {ref}: медиана {med}, "
                 f"топов {len(top)}, провалов {len(flop)} — "
                 "тема подбирается по свежим данным")
        return (
            "\n\nFRESH NICHE DATA — measured on the reference channel today, "
            f"median {med} views. These are REAL results, not guesses.\n"
            f"BEAT THE MEDIAN:\n{_lines(top)}\n"
            f"FAILED:\n{_lines(flop)}\n"
            "Work out what the winners PROMISE that the losers do not — it is "
            "usually not the subject but the kind of promise. Then pick a "
            "topic that makes that same kind of promise about something NOT "
            "already in the winning list above. Never repeat a subject that "
            "already appears there.")

    def generate_all(self, p: dict):
        if self._reject_if_busy("Генерация видео"):
            return
        job = self._generate_job(p)
        quality.reset()   # список деградаций — про ЭТОТ ролик, не про прошлый
        self._bg("Генерация видео", job)

    def _generate_job(self, p: dict):
        """Собрать цепочку ролика и вернуть её ОДНОЙ функцией.

        Отделено от generate_all ради ночного автопилота: ему нужно прогнать
        ту же самую цепочку подряд по каналам внутри ОДНОЙ фоновой задачи.
        Через generate_all он бы этого не смог — она отдаёт работу в _bg, а
        _bg отказывается стартовать, пока занята другая задача, то есть сам
        автопилот. Копировать цепочку в автопилот нельзя: копия разъедется с
        оригиналом, и шаг, добавленный в приложении, ночью молча не сделается.
        """
        # Профиль канала ЗАДАЁТ язык, жанр, голос и стиль — иначе достаточно
        # один раз забыть переключить выпадающий список, и ролик выйдет
        # чужим голосом на чужом языке. Проект запоминает свой канал, чтобы
        # библиотека оверлеев потом отфильтровалась по нему.
        # Сверяем ПЕРЕД записью meta.json: иначе метка канала легла бы в чужую
        # папку и ролик считался бы принадлежащим не тому каналу — со всеми
        # последствиями для библиотеки оверлеев, которая фильтруется по ней.
        self._sync_project_to_channel(self.log)
        ch = self._channel()
        if ch:
            p = channels_mod.apply_to_params(ch, p)
            self._write_meta(channel=ch["id"])
            if ch.get("watermark") and not (p.get("overlays") or "").strip():
                p["watermark"] = ch["watermark"]
            self.log(f"[Канал] «{ch['name']}»: {p.get('lang')}, "
                     f"«{p.get('tone')}»"
                     + (f", голос {p.get('voice')}" if ch.get("voice") else ""))
            # Разбор ниши НА КАЖДЫЙ ролик, а не однажды вписанной строкой.
            brief = self._niche_brief(ch)
            if brief:
                p["topic_formula"] = (p.get("topic_formula") or "") + brief
        opts = self._render_opts(p)
        # Поле «Оверлеи» интерфейс заполняет ИЗ ФАЙЛА проекта, а файл для
        # нового ролика остался от прошлого (папка канала одна на все ролики).
        # Безусловное сохранение этого текста записывало старую расстановку
        # обратно и заодно ГЛУШИЛО авто-расстановку (условие «оверлеи заданы»),
        # так что новый ролик гарантированно ехал с чужими плашками. Считаем
        # заданными вручную только те, что ОТЛИЧАЮТСЯ от лежащих на диске, —
        # то есть которые пользователь действительно правил.
        ov_in = (p.get("overlays") or "").strip()
        manual_ov = bool(ov_in) and ov_in != self._read("overlays.txt").strip()
        if manual_ov:
            self.save_overlays(ov_in)
        beat = self._sync_beat_to_intensity(float(p.get("beat", 6)),
                                            opts.get("intensity", "средняя"))

        def _chain():
            veo_key = os.getenv("VEO_API_KEY", "").strip()
            if veo_key:
                try:
                    import veo_client
                    info = veo_client.account_info(api_key=veo_key)
                    self.log(f"[VeoNonStop] План: {info.get('plan', '?')}, "
                            f"лимит {info.get('concurrent_tasks', '?')} "
                            "задач одновременно")
                except Exception:
                    pass   # чисто информационно — не блокирует цепочку
            # Сценария может ещё не быть: цепочка начиналась сразу с озвучки
            # и падала с «Нет сценария». Пишем его сами — по теме из поля и
            # ДЛИНЕ ИЗ ПРОФИЛЯ канала, а не из общего выпадающего списка.
            disk_script = self._read("script.txt")
            stale = self._stale_script(disk_script, ch, p) if disk_script else ""
            if stale:
                # Старый текст не затираем молча: кладём копию рядом. Он может
                # оказаться нужным, а восстановить его будет неоткуда.
                #
                # КОПИЯ, А НЕ ПЕРЕИМЕНОВАНИЕ. script.txt — точка отсчёта для
                # всего конвейера: по его времени правки решается, чьи в папке
                # озвучка, кадры и обложки (night_plan.fresh_for_script). Унеси
                # его — и отсчитывать станет не от чего: fresh_for_script
                # честно отвечает «сравнивать не с чем», и весь хлам прошлого
                # ролика разом становится «своим». Проверено: после
                # переименования галочки интерфейса показывали готовыми
                # озвучку, субтитры, раскадровку, оверлеи, SEO и обложки,
                # done_fraction давал 0.81, а _warn_stale не находил ничего —
                # то есть ровно та беда, ради которой всё это писалось.
                # Окно между «унесли» и «написали новый» не теоретическое: в
                # нём стоит запрос к LLM, а он падает по квоте регулярно, и
                # тогда папка остаётся в этом состоянии до следующей ночи.
                # С копией старый сценарий лежит на месте, всё сделанное по
                # нему по-прежнему честно считается сделанным по НЕМУ, а
                # save_script ниже перебьёт файл новым текстом и разом сделает
                # чужим то, что чужим и стало.
                keep = self._project / f"script_чужой_{int(time.time())}.txt"
                try:
                    shutil.copy2(self._project / "script.txt", keep)
                except OSError:
                    pass
                self.log(f"[Сценарий] {stale}. Отложил копию в {keep.name} "
                         "и пишу новый — иначе вышел бы ролик чужой длины "
                         "и не по теме", "warn")
                disk_script = ""
            if not (p.get("script") or "").strip() and not disk_script:
                key = (self._settings.get("gemini_key", "")
                       or self._settings.get("agnes_key", ""))
                topic = (p.get("topic") or "").strip()
                if not topic and ch:
                    # тема по ФОРМУЛЕ НИШИ канала — из разбора конкурентов,
                    # а не наугад. Уже использованные не повторяются.
                    topic = core.gen_topic(ch, key, self.log)
                    if topic:
                        self.log(f"[Тема] По формуле ниши: «{topic}»")
                        used = list(ch.get("used_topics") or [])
                        used.append(topic)
                        ch["used_topics"] = used[-60:]
                        channels_mod.upsert(ch)
                if not topic:
                    raise RuntimeError(
                        "Нет ни сценария, ни темы — впиши тему на странице "
                        "«Сценарий» или сгенерируй черновик.")
                mins = int((ch or {}).get("minutes") or p.get("minutes") or 12)
                self.log(f"[Цепочка] Шаг 0 — сценарий «{topic}», {mins} мин…")
                text = core.gen_script(
                    topic, mins, key, self.log,
                    tone=p.get("tone", "документальный"),
                    lang=p.get("lang", "английский"),
                    extra=(ch or {}).get("script_extra", ""))
                self.save_script(text)
                self._write_meta(topic=topic)
            # Между шагами цепочки бывают минуты без единой строки в
            # журнале (whisper, ожидание Veo), поэтому спрашиваем про «Стоп»
            # явно: иначе нажатие в такую паузу заметили бы только на
            # следующем сообщении — то есть уже следующей стадией.
            self._stop_check()
            self.log("[Цепочка] Шаг 1/4 — озвучка…")
            self._tts_step(p)
            self._stop_check()
            self.log("[Цепочка] Шаг 2/4 — субтитры…")
            # Ширина строки субтитра — из профиля канала, а не 42 на всех.
            # Она и заведена под почерк канала (channels.sub_width: 38, 42 и
            # 46 у трёх каналов), но в автоцепочке стояло число, и настройка
            # не доезжала до кадра НИ РАЗУ — все три канала получали одну и
            # ту же разбивку.
            core.transcribe_whisper(self._project / "audio" / "voiceover.mp3",
                                    p.get("whisper", "tiny.en"),
                                    self._project, self.log,
                                    int(p.get("sub_width") or 42),
                                    p.get("lang", "английский"))
            self._stop_check()
            self.log("[Цепочка] Шаг 3/4 — стоки по таймлайну…")
            core.auto_storyboard(
                self._project, self.log,
                self._settings.get("pexels_keys", ""),
                self._settings.get("pixabay_keys", ""),
                beat,
                self._settings.get("gemini_key", ""),
                self._settings.get("agnes_key", ""), False,
                int(self._settings.get("max_unique", 200)),
                p.get("visual_mode", "mixed"), p.get("visual_style", ""),
                float(p.get("ai_ratio", 0.85)),
                channel=ch,
                # Сцены — планы, нарисованные целиком вместо съёмки. Их
                # придумывает и пишет модель под ЭТОТ сценарий. Ноль —
                # выключено, поведение как раньше.
                scenes=int(p.get("scenes", int(
                    os.getenv("SCENES_PER_VIDEO", "12")))))
            self._stop_check()
            if p.get("check_shots", True):
                # ГЛАВНАЯ проверка качества: кадр не про то, что говорит
                # диктор — самый заметный признак сборки «на автомате».
                # Ловим ЗДЕСЬ, где замена стоит одну закачку, а не после
                # рендера, когда пересобирать часами.
                try:
                    self._check_and_fix_shots()
                except Exception as e:
                    # «Стоп» сюда не попадает: Stopped и core.Cancelled —
                    # BaseException, они пролетают мимо и гасят цепочку.
                    self.log(f"[Цепочка] Проверка кадров пропущена: {e}", "warn")
                    # Пропуск ВСЕЙ проверки хуже, чем частичный отказ внутри
                    # неё (тот уже пишется в сводку из core.review_storyboard).
                    # Здесь кадры не смотрел никто, а стадия отчиталась
                    # «пропущена» одной строкой — и ролик уходил в рендер с
                    # чувством выполненного долга.
                    quality.degraded(
                        "Кадры", "ни один кадр не проверен на соответствие "
                        "словам диктора",
                        why=f"проверка кадров сорвалась целиком: {e}",
                        hint="самый заметный признак сборки «на автомате» — "
                             "кадр не про то, что говорит диктор. Прогони "
                             "«Проверку кадров» отдельной кнопкой",
                        level="критично")
            if not manual_ov:
                # моушн-графика сама; _auto_overlays сам решит, годится ли
                # лежащий в папке файл для ЭТИХ субтитров
                self._auto_overlays()
            self._regen_overlay_theme()   # своя палитра оверлеев под это видео
            # Условия «если настроена библиотека» здесь больше нет: оно было
            # ЕДИНСТВЕННОЙ причиной, по которой музыки не было ни в одном
            # ролике — настройка пустовала, и шаг молча пропускался, ничего
            # не написав в журнал. Теперь папка берётся по умолчанию, а при
            # нехватке трека он докачивается с Jamendo.
            self.log("[Цепочка] Музыка — подбираю под содержание...")
            try:
                self._do_auto_music(-14)
            except Exception as e:
                self.log(f"[Цепочка] Музыка пропущена: {e}", "warn")
                # Музыки не будет СЛЫШНО — это не служебный сбой. И хуже: в
                # папке останется voiceover_music.mp3 прошлого ролика, который
                # выглядит как результат этого шага (см. voice_track).
                quality.degraded(
                    "Звук", "ролик идёт без музыкальной подложки, только голос",
                    why=f"подбор музыки не удался: {e}",
                    hint="проверь папку библиотеки музыки и ключ Jamendo в "
                         "«Настройках»; можно просто положить mp3 руками",
                    level="заметно")
            if p.get("grow_variants", True):
                # библиотека пополняется НА КАЖДЫЙ ролик — иначе десятое
                # видео выглядит ровно как первое
                try:
                    self._grow_variant_library(p.get("topic", "")
                                               or self._read_meta().get("topic", ""))
                except Exception as e:
                    self.log(f"[Цепочка] Новый оверлей пропущен: {e}", "warn")
            if p.get("seo", True):
                # Обложки в цепочке были, а SEO — нет: ролик выходил без
                # заголовка, описания, тегов и глав, и всё это приходилось
                # доделывать руками. Идёт ПОСЛЕ субтитров, чтобы главы
                # получили тайм-коды.
                self.log("[Цепочка] Заголовок, описание, теги, главы…")
                try:
                    self.seo()
                except Exception as e:
                    self.log(f"[Цепочка] SEO пропущено: {e}", "warn")
                    # Заголовок, описание и главы — первое, что видит зритель
                    # на YouTube. Без них ролик либо уйдёт безымянным, либо (что
                    # хуже) под заголовком ПРОШЛОГО ролика, оставшимся в папке.
                    quality.degraded(
                        "Публикация", "нет заголовка, описания, тегов и глав",
                        why=f"шаг SEO не отработал: {e}",
                        hint="нажми «Заголовок и описание» на странице ролика "
                             "перед загрузкой — иначе опубликуешь по остаткам "
                             "прошлого ролика",
                        level="заметно")
            if p.get("thumbs", True):
                self.log("[Цепочка] Обложки для YouTube…")
                try:
                    self._do_thumbnails(3)
                except Exception as e:
                    # обложки не должны рушить готовый ролик
                    self.log(f"[Цепочка] Обложки пропущены: {e}", "warn")
                    # Обложка решает, откроют ролик или нет, и она же чаще
                    # всего остаётся от прошлого ролика: файл thumb1.jpg лежит
                    # на месте и выглядит как готовый результат шага.
                    quality.degraded(
                        "Публикация", "обложек для YouTube нет",
                        why=f"шаг обложек не отработал: {e}",
                        hint="нарисуй обложки кнопкой на странице ролика; в "
                             "папке thumbs/ сейчас лежат картинки прошлого "
                             "ролика — публиковать по ним нельзя",
                        level="заметно")
            # Сводка по остаткам прошлого ролика — ПЕРЕД рендером, пока ещё
            # можно вмешаться. Шаги SEO/обложек/музыки глушат свои сбои в
            # warn, и после такого сбоя в папке остаётся файл прошлого ролика
            # (заголовок не про то, обложка не та, чужой микс озвучки). В
            # журнале на тысячу строк это не видно, а на диске выглядит как
            # успешно сделанный шаг.
            self._warn_stale()
            # Последняя и самая важная проверка: render_project СБРАСЫВАЕТ
            # render.CANCEL на старте, поэтому «Стоп», нажатый на любом
            # предыдущем шаге, рендеру ничего не сообщал — часовой рендер
            # начинался уже после остановки, да ещё и с неполной раскадровкой.
            self._stop_check()
            self.log("[Цепочка] Шаг 4/4 — рендер…")
            render.render_project(self._project, self.log,
                                  self._progress, opts)
            self.log("[YouTube] Перед загрузкой отметь «Да» в поле об "
                     "ИИ-контенте, если в ролике есть реалистичные "
                     "сгенерированные сцены.", "warn")

        def job():
            """Цепочка + ОБЯЗАТЕЛЬНАЯ сводка «на чём ролик просел».

            Сводка вынесена в finally, потому что раньше она стояла последней
            строкой цепочки — то есть печаталась ТОЛЬКО когда всё дошло до
            конца. Ночью до конца доходит не всё: сторож обрывает канал по
            тишине или по потолку времени, рендер падает на последнем проходе.
            Ровно в этих случаях список деградаций нужнее всего, а он молча
            уезжал в мусор вместе со списком (следующий канал зовёт reset()).

            Через _log_raw, а не log: после «Стопа» log бросает Stopped, и
            итог не напечатался бы вообще — как раз в тот раз, когда он важен.
            """
            ok = False
            try:
                _chain()
                ok = True
            finally:
                # Итог — ПОСЛЕДНИМИ строками, чтобы его было видно без
                # прокрутки журнала на тысячу строк. Иначе «готово» одинаково
                # выглядит и когда всё отработало, и когда полролика собрано
                # запасными путями.
                lines = quality.report().splitlines()
                if not ok:
                    # На оборванном прогоне «Ролик собран без потерь» было бы
                    # прямой ложью: ролика ещё нет. Ничего не нашлось —
                    # молчим, о самом обрыве скажет тот, кто его поймал.
                    lines = (["[Итог] Прогон не дошёл до конца; вот на чём "
                              "ролик успел просесть:"] + lines[1:]
                             if quality.items() else [])
                for line in lines:
                    self._log_raw(line, "" if "без потерь" in line else "warn")
        return job

    def autopilot(self, p: dict):
        """Ночной прогон: по ролику на каждый канал, одной фоновой задачей.

        ЕДИНСТВЕННАЯ реализация ночи. Командная строка (autopilot.py) зовёт
        ровно этот метод и ждёт, а не повторяет цикл у себя: пока путей было
        два, они расходились молча. В ночь 2026-08-03 кнопка гнала все каналы
        одной задачей и потому НИ РАЗУ не сбрасывала между ними бюджет
        ожидания лимита Veo и флаги отмены — второй канал стартовал с уже
        исчерпанным бюджетом, тогда как из командной строки каждый канал
        получал свежий.

        Что изменилось по сравнению с прежним поведением:
          * каналы больше НЕ пропускаются по времени. Раньше оборванный ролик
            означал переделку с нуля, и «не начинать то, что не успею» было
            верно. Теперь переиспользуются сценарий, озвучка, темы, ИИ-кадры и
            секвенции оверлеев, и незаконченный ролик доделывается следующей
            ночью за минуты — значит пропуск канала стоит дороже обрыва.
            Старое поведение осталось под ключом fit_only;
          * незаконченный ролик ДОДЕЛЫВАЕТСЯ вместо заведения новой папки;
          * потолок на канал остался, но только против зависания и чтобы один
            канал не съел ночь.
        """
        if self._reject_if_busy("Автопилот"):
            return
        import night_plan as np
        chans = channels_mod.load()
        want = str(p.get("channel") or "").strip().lower()
        if want:
            chans = [c for c in chans
                     if want in (str(c.get("id", "")).lower(),
                                 str(c.get("name", "")).lower())]
        if not chans:
            self.log("[Автопилот] Нет ни одного канала — сначала заведи "
                     "профиль канала", "err")
            return
        # Каналы с одинаковым id — это ОДИН канал, попавший в файл дважды.
        # Без этой строки он получил бы за ночь два ролика, а пользователь
        # ждёт ровно один на канал.
        uniq, seen = [], set()
        for c in chans:
            if c.get("id") not in seen:
                seen.add(c.get("id"))
                uniq.append(c)
        chans = uniq

        per = max(1, int(p.get("videos", 1) or 1))
        base = dict(p)
        # Тема и сценарий у каждого канала СВОИ — берутся по его нише. Если
        # пустить сюда текст из поля сценария, ночь выдаст три копии одного
        # ролика под разными названиями. Чистим здесь, а не только в
        # интерфейсе: это свойство автопилота, а не поведение кнопки.
        base["script"] = ""
        base["topic"] = ""
        night_h = float(p.get("night_h") or np.NIGHT_H)
        fit_only = bool(p.get("fit_only"))
        # По умолчанию КАЖДЫЙ прогон — новый ролик. Докрутка брошенного
        # осталась, но стала отдельной просьбой: владелец каналов выбрал
        # предсказуемость («запустил — получил новое видео») вместо
        # разгребания старого. Брошенное при этом не пропадает: оно лежит
        # на диске, и его можно доделать ключом resume.
        force_new = not bool(p.get("resume"))

        def job():
            started = datetime.now()
            results = []
            # Остаток картинок спрашиваем ОДИН раз на всю ночь и отдаём в план.
            # Ночь — это несколько роликов подряд, и делить между ними надо то
            # число, что есть на старте: если картинок хватает на один ролик,
            # второй не должен начинаться и падать на обложках под утро.
            quota = np.image_quota()
            self.log(core.image_quota_line(quota))
            plan = np.dry_run(chans, night_h, per, fit_only,
                              force_new=force_new,
                              images_left=(None if quota.get("unlimited")
                                           else quota.get("remaining")))
            self.log(f"[Автопилот] Ночь началась: {len(chans)} канал(ов) x "
                     f"{per}, в ночи {night_h:.0f} ч. План:")
            for line in np.format_plan(plan).splitlines():
                self.log(line)
            deadline = time.time() + night_h * 3600 if night_h > 0 else 0.0
            by_id = {c.get("id"): c for c in chans}
            taken = set()
            # Счётчика «сколько каналов впереди» здесь больше нет: по нему
            # делился остаток ночи поровну, а деление убрано (см.
            # night_plan.budget_for). Ролику нужно своё время ЦЕЛИКОМ, иначе он
            # бесполезен, и очередь до последнего канала стоит дешевле, чем
            # три оборванных ролика.
            for step in plan:
                ch = by_id.get(step["id"])
                nm = step["channel"]
                if ch is None:
                    continue
                # Папку выбираем ЗАНОВО перед самым запуском, а не берём из
                # плана: пока шли предыдущие каналы, ролик мог доделаться
                # другим путём, а дата могла смениться — ночь переходит через
                # полночь, и план строился ещё вчерашним числом.
                pick = np.pick_project(ch, taken, quota=step.get("n", 0) + 1,
                                       force_new=force_new)
                d = pick["dir"]
                if pick["mode"] == "done":
                    self.log(f"[Автопилот] «{nm}» пропущен: {pick['why']}",
                             "warn")
                    # ch кладём в КАЖДУЮ строку итога: без профиля канала
                    # утренняя сводка не может отличить «работа сделана» от
                    # «работа сделана по сценарию, который цепочка выбросит»
                    # (night_plan.format_report -> stage_of).
                    results.append({"channel": nm, "mode": "done", "dir": d,
                                    "ch": ch,
                                    "file": None, "size": 0, "sec": 0.0,
                                    "why": pick["why"]})
                    continue
                taken.add(d)
                proj = d if pick["mode"] == "resume" else None
                left_s = max(0.0, deadline - time.time()) if deadline else 0.0
                if fit_only and left_s and not np.fits(ch, left_s, proj):
                    why = (f"--fit: нужно "
                           f"~{np.estimate_s(ch, proj) / 3600:.1f} ч, "
                           f"до утра {left_s / 3600:.1f} ч")
                    self.log(f"[Автопилот] «{nm}» пропущен: {why}", "warn")
                    results.append({"channel": nm, "mode": "skip", "dir": d,
                                    "ch": ch,
                                    "file": None, "size": 0, "sec": 0.0,
                                    "why": why})
                    continue
                # Остаток картинок перечитываем ПЕРЕД КАЖДЫМ каналом, а не
                # верим плану: план строился до первого ролика, а картинки с
                # тех пор потрачены — и не только этой ночью (лимит суточный и
                # общий на аккаунт). Ролик, которому не хватит на обложки, не
                # начинаем: доделать его следующей ночью стоит минут, а встать
                # на обложках в четыре утра — это ролик, который некуда
                # выложить. Видео этой проверки не касается: лимит только на
                # картинки, и раскадровка живым видео пойдёт при любом остатке.
                q_img = np.image_quota()
                need_img = np.images_per_video(ch)
                left_img = q_img.get("remaining")
                if (not q_img.get("unlimited") and left_img is not None
                        and need_img > int(left_img)):
                    why = (f"суточный лимит картинок: нужно ~{need_img}, "
                           f"осталось {left_img}"
                           + (f", обнуление через "
                              f"{q_img['resets_in_s'] / 3600:.1f} ч"
                              if q_img.get("resets_in_s") else ""))
                    self.log(f"[Автопилот] «{nm}» не начинаю — {why}", "warn")
                    results.append({"channel": nm, "mode": "skip", "dir": d,
                                    "ch": ch, "file": None, "size": 0,
                                    "sec": 0.0, "why": why})
                    continue
                budget = np.budget_for(ch, left_s, proj)
                t0 = time.time()
                try:
                    results.append(self._autopilot_one(
                        ch, nm, d, pick, budget, dict(base), np))
                except (Stopped, core.Cancelled):
                    # «Стоп» ЧЕЛОВЕКА гасит ночь целиком. Отличать от сторожа
                    # обязательно: ошибка в любую сторону либо делает кнопку
                    # неработающей, либо тихо кончает ночь после первого
                    # таймаута.
                    results.append({"channel": nm, "mode": pick["mode"],
                                    "dir": d, "ch": ch,
                                    "file": None, "size": 0,
                                    "sec": time.time() - t0,
                                    "why": "остановлено вручную"})
                    self._finish_night(results, started, np)
                    raise
                except BaseException as e:
                    # BaseException, а не Exception: один канал не должен
                    # уносить остальные, а из цепочки прилетает что угодно.
                    # Пишем через _log_raw: если сюда пришло исключение из уже
                    # отменённой цепочки, log() бросил бы Stopped повторно и
                    # оборвал бы ночь на первом же сбое.
                    if isinstance(e, (KeyboardInterrupt, SystemExit)):
                        raise      # Ctrl+C — это человек, а не сбой канала
                    # Остановку по потолку сторож делает тем же «Стопом», что и
                    # человек, поэтому сюда прилетает «Остановлено
                    # пользователем» — и утром в журнале читалось «abyss упал:
                    # Остановлено пользователем» про ночь, когда владелец спал.
                    # Отличаем по флагу: он взводится только настоящим нажатием.
                    by_timer = (isinstance(e, Stopped)
                                and not self._stop_by_user.is_set())
                    why = ("остановлен по потолку времени — работа на диске, "
                           "доделается ключом --resume" if by_timer else str(e))
                    self._log_raw(f"[Автопилот] «{nm}»: {why}",
                                  "warn" if by_timer else "err")
                    if not by_timer:
                        self._log_raw(traceback.format_exc().rstrip(), "dim")
                    results.append({"channel": nm, "mode": pick["mode"],
                                    "dir": d, "ch": ch,
                                    "file": None, "size": 0,
                                    "sec": time.time() - t0, "why": why})
                # Отдельная проверка после КАЖДОГО канала. Ловить «Стоп» только
                # по исключению мало: цепочка местами глушит сбои через
                # `except Exception`, и нажатие могло выйти наружу обычной
                # ошибкой — тогда ночь поехала бы дальше, хотя человек её
                # остановил.
                if self._stop_by_user.is_set():
                    self._log_raw("[Автопилот] Ночь остановлена вручную — "
                                  "остальные каналы не начинаю", "warn")
                    self._finish_night(results, started, np)
                    raise Stopped()

            self._finish_night(results, started, np)

        self._bg("Автопилот", job)

    def _autopilot_one(self, ch, nm, d, pick, budget, params, np) -> dict:
        """Один канал за ночь. Вынесено из цикла, чтобы цикл читался."""
        t0 = time.time()
        self._stop_check()
        self.channel_select(ch["id"])
        # set_project ПОСЛЕ channel_select, а не до: channel_select сам ставит
        # текущим самый свежий проект канала, и порядок наоборот увёл бы работу
        # не в ту папку, которую автопилот только что назвал в журнале.
        d.mkdir(parents=True, exist_ok=True)
        np.note_attempt(d, nm)
        self.set_project(str(d))
        self.log(f"[Автопилот] «{nm}» -> {d.name}: {pick['why']}; "
                 f"потолок {budget / 3600:.1f} ч")
        # Сброс на КАЖДЫЙ канал. _bg делает это на старте ЗАДАЧИ, а вся ночь —
        # одна задача: без этих строк второй канал начинал с исчерпанным
        # бюджетом ожидания лимита Veo (и уходил на сток с первого кадра) и с
        # флагами отмены, оставшимися от сторожа предыдущего канала.
        quality.reset()
        self._cancel.clear()
        render.CANCEL.clear()
        core.reset_cancel()
        core.reset_veo_limit()

        hit = threading.Event()        # сработал сторож, а не человек
        done = threading.Event()

        def guard():
            """Сторож: и общий потолок, и ТИШИНА.

            Тишина здесь главная. Прежний сторож был одним threading.Timer на
            весь бюджет, и зависший шаг висел ровно столько, сколько отведено
            каналу целиком. В app.log зависания выглядят как многочасовое
            молчание идущей задачи (8.5 ч после «План 262 -> OK», 11.3 ч сразу
            после «▶ запущено»), значит ловить их надо по пульсу журнала.

            И останавливаем ПО-НАСТОЯЩЕМУ. Прежний сторож взводил только
            self._cancel, который виден лишь из log(): часовой ffmpeg или
            висящий сетевой запрос его не замечали вовсе — сторож «срабатывал»,
            а канал продолжал занимать ночь. stop_render гасит ещё и ffmpeg,
            core и висящие задачи Veo.
            """
            while not done.wait(np.GUARD_POLL_S):
                stalled = time.time() - self._beat
                over = time.time() - t0
                if not hit.is_set():
                    if stalled > np.STALL_S:
                        self._log_raw(
                            f"[Автопилот] «{nm}»: ни строки в журнале "
                            f"{stalled / 60:.0f} мин — считаю шаг зависшим и "
                            "перехожу к следующему каналу", "warn")
                    elif over > budget:
                        self._log_raw(
                            f"[Автопилот] «{nm}»: не уложился в "
                            f"{budget / 3600:.1f} ч — перехожу к следующему "
                            "каналу. Сделанное НЕ пропадёт: следующая ночь "
                            "начнёт с него", "warn")
                    else:
                        continue
                    hit.set()
                # Пока цепочка не свернулась, давим «Стоп» ещё раз раз в
                # минуту: отмена ловится не на всякой стадии с первого раза, а
                # снаружи поток не убить.
                self.stop_render(by_user=False)
                done.wait(max(1.0, 60 - np.GUARD_POLL_S))

        threading.Thread(target=guard, daemon=True).start()
        try:
            self._generate_job(params)()
        except (Stopped, core.Cancelled):
            if self._stop_by_user.is_set() or not hit.is_set():
                raise                  # это человек — гасим ночь целиком
            # Снимаем СВОЙ флаг сразу: пока он взведён, любая запись в журнал
            # через log() бросит Stopped ПОВТОРНО — уже мимо этого except, и
            # ночь оборвётся на первом же таймауте. Ровно это и случилось на
            # проверке.
            self._cancel.clear()
        finally:
            done.set()
            if hit.is_set():
                # Сторож дёргал общий «Стоп», а он взводит ещё core.CANCEL и
                # render.CANCEL. Их сбрасывает только _bg на старте задачи, а
                # ночь — одна задача: не снять их здесь значит убить следующий
                # канал на первой же проверке отмены.
                self._cancel.clear()
                core.reset_cancel()
                render.CANCEL.clear()

        out = d / "output_final.mp4"
        size = out.stat().st_size if out.exists() else 0
        finished = np.is_finished(d)
        return {"channel": nm, "mode": pick["mode"], "dir": d, "ch": ch,
                "file": out if finished else None,
                "size": size, "sec": time.time() - t0,
                "why": ("" if finished else
                        ("прерван сторожем — доделается следующей ночью"
                         if hit.is_set() else
                         "рендер не дал файла — смотри app.log"))}

    def _finish_night(self, results, started, np):
        """Утренняя сводка: и в журнал, и файлом рядом с софтом.

        Файл нужен потому, что журнал к утру — сорок тысяч строк, и итог ночи
        в нём не найти. Раньше файл писала только командная строка, а кнопка
        обходилась строчкой «не вышло — ищи причину выше» на все неудачи
        разом: по ней нельзя было понять, канал упал, не начинался или уже был
        готов.
        """
        report = np.format_report(results, started)
        try:
            (BASE / "autopilot_report.txt").write_text(
                report + "\n", encoding="utf-8")
        except OSError:
            pass
        for line in report.splitlines():
            self._log_raw(line)

    # ---------- настройки ----------
    def settings_get(self):
        keys = ("aws_access_key", "aws_secret_key", "aws_region",
                "gemini_key", "agnes_key", "veo_key",
                "pexels_keys", "pixabay_keys", "music_library", "jamendo_key")
        return {k: self._settings.get(k, "") for k in keys}

    def _save_settings_file(self):
        SETTINGS_FILE.write_text(
            json.dumps(self._settings, ensure_ascii=False, indent=2),
            encoding="utf-8")

    def settings_save(self, data: dict):
        self._settings.update({k: str(v) for k, v in (data or {}).items()})
        self._save_settings_file()
        self._apply_env()
        self.log("[Настройки] Сохранено в settings.json")
        # Ключ сохранили — тут же и проверяем: иначе про опечатку в нём
        # узнаешь через полтора часа, посреди прогона (см. core.check_llm_keys).
        self._check_keys_bg()
        return True

    def check_keys(self):
        """Кнопка «Проверить ключи» в «Настройках API»."""
        self._check_keys_bg()
        return True

    def check_keys_startup(self):
        """Вызывается фронтендом один раз при загрузке интерфейса.

        Именно на СТАРТЕ, а не по кнопке, потому что беда, ради которой это
        сделано, тихая: пока Gemini отвечает, мёртвый Agnes ничем себя не
        выдаёт — и обнаруживается в тот момент, когда дневная квота Gemini
        кончилась на середине ролика и падать уже некуда. Проверять надо
        ДО того, как человек нажал «Генерировать видео» и ушёл."""
        self._check_keys_bg(startup=True)
        return True

    def _check_keys_bg(self, startup: bool = False):
        """Отдельным потоком, а не через _bg: проверка ключей не занимает
        приложение (иначе «Занято» блокировало бы генерацию из-за фоновой
        проверки) и не должна прерываться «Стопом» — она секундная."""
        def job():
            try:
                agnes = self._settings.get("agnes_key", "")
                fn = (core.check_llm_keys_once if startup else core.check_llm_keys)
                fn(lambda m, c="": self._log_raw(m, c), agnes)
            except Exception as e:
                self._log_raw(f"[Ключи] Проверка не удалась: {e}", "warn")
        threading.Thread(target=job, daemon=True).start()


def main():
    api = Api()
    win = webview.create_window(
        APP_TITLE, url=str(BASE / "ui" / "index.html"), js_api=api,
        width=1280, height=840, min_size=(1080, 700),
        background_color="#f5f5f7")
    api._win = win
    webview.start()


if __name__ == "__main__":
    main()
