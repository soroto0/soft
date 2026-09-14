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
import subprocess
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
import disk

APP_TITLE = "Контент-фабрика"
APP_VERSION = "3.0"
BASE = Path(__file__).resolve().parent
SETTINGS_FILE = BASE / "settings.json"
LOG_FILE = BASE / "app.log"
# Отметка «прямо сейчас идёт работа». Живёт ровно столько, сколько идёт
# задача (см. _bg), и потому переживает задачу ТОЛЬКО в одном случае — если
# процесс умер вместе с ней.
#
# Зачем понадобилась. 2026-08-11 ночной прогон home-vault оборвался на
# 39-м куске озвучки из 60: последняя строка в app.log — «кусок 30/60» в
# 16:03:24, следующая — уже про другой канал в 21:58. Ни ошибки, ни итога,
# ни утренней сводки: ночь не дошла до _finish_night. Сторож тишины помочь
# не мог по построению — он живёт в этом же процессе и умер вместе с ним
# (night_plan.keep_awake, тот же вывод про сон машины). В папке остались
# сценарий, 38 кусков озвучки и нулевой part_039.mp3, и до сих пор об этом
# прогоне не сказано НИГДЕ — канал просто перестал давать ролики.
#
# Сказать в момент смерти нельзя. Но можно сказать при следующем запуске:
# отметка на диске переживает и «Стоп» питона, и закрытие окна, и сон
# машины, а закрытая отметка (её снимает finally) означает, что задача
# закончилась по-человечески.
RUN_MARK = BASE / ".run_in_progress.json"

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


def _speech_rate(ch: dict | None, p: dict) -> int:
    """Темп речи канала числом процентов. 0 — обычная скорость.

    Здесь стояло `int((ch or {}).get("rate") or p.get("rate") or 0)`, и оно
    падало ровно на КАНАЛЕ С ОБЫЧНЫМ ТЕМПОМ. Ноль в Python «пустой», цепочка
    `or` проскакивала его насквозь и добиралась до p["rate"], а туда
    channels.apply_to_params кладёт УЖЕ ОТФОРМАТИРОВАННУЮ строку «+0%» — её
    int() принять не может.

    Замер 2026-08-14: прогон падал через 7 секунд с «invalid literal for
    int() with base 10: '+0%'», не дойдя даже до сценария. Каналы с ненулевым
    темпом (-5, -8, -15) работали, потому что до второй ветки не доходили, —
    поэтому ошибка и дожила до канала, где темп решили не трогать.

    Правило простое: у канала темп либо ЕСТЬ (в том числе ноль), либо его
    нет вовсе. И строку вида «+0%» разбираем, а не скармливаем int().
    """
    if ch is not None and ch.get("rate") is not None:
        сырое = ch["rate"]
    else:
        сырое = p.get("rate", 0)
    if isinstance(сырое, (int, float)):
        return int(сырое)
    txt = str(сырое).strip().replace("%", "").replace("+", "")
    try:
        return int(float(txt or 0))
    except ValueError:
        return 0


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
        """Настройки из окна -> переменные окружения.

        Раньше сюда попадали только ключи AWS и Veo, а Gemini, Pexels и прочие
        разъезжались по конвейеру ПАРАМЕТРАМИ каждого вызова. Работало, пока
        очередной новый путь не забывал их передать — и тогда вписанный в окне
        ключ молча не действовал, что для покупателя выглядит сломанной
        программой. Теперь окно — источник правды для всего реестра.
        """
        for k, env in (("aws_access_key", "AWS_ACCESS_KEY_ID"),
                       ("aws_secret_key", "AWS_SECRET_ACCESS_KEY"),
                       ("aws_region", "AWS_REGION")):
            if self._settings.get(k):
                os.environ[env] = self._settings[k]
        for s in core.KEY_SPECS:
            raw = str(self._settings.get(s["id"], "") or "").strip()
            if not raw:
                continue
            # Поля Pexels и Pixabay многострочные (несколько ключей на
            # перебор), а в окружении может жить только один — берём первый.
            # Полный список всё так же уходит в KeyRotator параметром.
            os.environ[s["env"]] = core._first_key(raw)

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
            self._mark_running(name, t0)
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
                # Отметку снимаем ИМЕННО ЗДЕСЬ, в finally: сюда задача
                # приходит в любом исходе — успех, «Стоп», ошибка. Всё, что
                # мимо этого места, — смерть процесса, и она должна оставить
                # отметку лежать.
                self._clear_running()
                self._js("taskDone()")
        threading.Thread(target=wrap, daemon=True).start()

    # ---------- оборванные прогоны ----------
    def _mark_running(self, name: str, t0: datetime) -> None:
        try:
            RUN_MARK.write_text(json.dumps({
                "task": name, "project": str(self._project),
                "since": t0.isoformat(timespec="seconds"),
                "pid": os.getpid()}, ensure_ascii=False, indent=1),
                encoding="utf-8")
        except OSError:
            pass       # отметка полезная, но ронять из-за неё задачу нельзя

    def _clear_running(self) -> None:
        try:
            RUN_MARK.unlink(missing_ok=True)
        except OSError:
            pass

    @staticmethod
    def _pid_alive(pid: int) -> bool:
        """Жив ли процесс с таким номером ПРЯМО СЕЙЧАС.

        Без этой проверки «оборванным» объявлялся любой запуск, чья отметка
        лежит на диске с чужим pid — в том числе идущий в соседнем окне или
        в ночном автопилоте, запущенном из командной строки. Замер по
        журналу: в 18:11:07 покойником объявлен запуск, начатый в 18:10:51,
        то есть шестнадцатью секундами раньше и явно живой.

        os.kill(pid, 0) на Windows НЕ годится: там сигналы не поддержаны, и
        os.kill зовёт TerminateProcess — то есть проверка «жив ли» убила бы
        проверяемого. Поэтому на Windows спрашиваем ядро напрямую.
        """
        try:
            pid = int(pid)
        except (TypeError, ValueError):
            return False
        if pid <= 0:
            return False
        if os.name == "nt":
            import ctypes
            k = ctypes.WinDLL("kernel32", use_last_error=True)
            k.OpenProcess.restype = ctypes.c_void_p
            k.OpenProcess.argtypes = [ctypes.c_ulong, ctypes.c_int,
                                      ctypes.c_ulong]
            k.CloseHandle.argtypes = [ctypes.c_void_p]
            k.GetExitCodeProcess.argtypes = [ctypes.c_void_p,
                                             ctypes.POINTER(ctypes.c_ulong)]
            h = k.OpenProcess(0x1000, False, pid)   # QUERY_LIMITED_INFORMATION
            if not h:
                # 5 = «доступ запрещён»: процесс ЕСТЬ, просто чужой (админский
                # или другого пользователя). Мёртвым его считать нельзя.
                return ctypes.get_last_error() == 5
            code = ctypes.c_ulong()
            ok = k.GetExitCodeProcess(h, ctypes.byref(code))
            k.CloseHandle(h)
            return (not ok) or code.value == 259    # STILL_ACTIVE
        try:
            os.kill(pid, 0)
        except ProcessLookupError:
            return False
        except PermissionError:
            return True                             # чужой, но живой
        except OSError:
            return False
        return True

    def _report_dead_run(self) -> bool:
        """Сказать про прогон, который умер вместе с процессом.

        Зовётся при старте — и из интерфейса, и из командной строки перед
        ночью. Отметку после доклада снимаем: она своё отработала, а
        повторять один и тот же некролог каждый запуск незачем.

        Своим же pid отметку не считаем чужой смертью: два экземпляра
        приложения запускать никто не мешает, и вторая копия не должна
        объявлять первую покойной.
        """
        try:
            mark = json.loads(RUN_MARK.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return False
        pid = mark.get("pid") or 0
        if int(pid or 0) == os.getpid():
            return False
        # ЖИВОЙ ПРОЦЕСС — НЕ ПОКОЙНИК. Проверялось только наличие отметки, а
        # отметка лежит всё время, пока задача идёт: вторая копия приложения
        # (или окно, открытое поверх ночного автопилота) объявляла соседа
        # оборванным через секунды после его старта — и тут же СНИМАЛА
        # отметку, так что настоящий обрыв этого же запуска потом уже никто
        # бы не заметил.
        if self._pid_alive(pid):
            self._log_raw(
                f"[Запуск] Задача «{mark.get('task', '?')}» идёт прямо "
                f"сейчас в другом процессе (pid {pid}, начата "
                f"{str(mark.get('since') or '?').replace('T', ' ')}). "
                "Оборванной она не считается; не запускай то же самое "
                "вторым окном — оба будут писать в одну папку.", "warn")
            return False
        d = Path(mark.get("project") or self._project)
        since = str(mark.get("since") or "")
        try:
            прошло = (datetime.now()
                      - datetime.fromisoformat(since)).total_seconds() / 3600
            когда = f"{since.replace('T', ' ')} ({прошло:.0f} ч назад)"
        except ValueError:
            когда = since or "неизвестно когда"
        # На чём именно остановился ролик — теми же словами, что и утренняя
        # сводка: разница между «умер на сценарии» и «стоял перед рендером»
        # решает, что человеку делать дальше.
        try:
            import night_plan as np
            где = np.stage_of(d)
        except Exception:                                   # noqa: BLE001
            где = "смотри содержимое папки"
        self._log_raw(
            f"[Оборван] Прошлый запуск «{mark.get('task', '?')}» начался "
            f"{когда} и НЕ ЗАКОНЧИЛСЯ: приложение выключилось вместе с ним, "
            "поэтому ни ошибки, ни итога в журнале нет.", "err")
        self._log_raw(f"[Оборван] Папка {d}: {где}", "warn")
        self._log_raw(
            "[Оборван] Сделанное на диске цело и будет переиспользовано — "
            "запусти автопилот (или «Генерировать видео» на этой папке), и "
            "ролик доделается с этого места. Частые причины: закрыли окно "
            "приложения, машина ушла в сон (крышка/«Сон» в меню перебивают "
            "запрет сна), выключение по питанию.", "warn")
        self._clear_running()
        return True

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

    def _reject_if_busy(self, name: str, cid=None) -> bool:
        """Проверка «занято» ДО побочных действий.

        _bg проверяет то же самое, но «Рендер» и «Генерировать видео» успевают
        до него переписать overlays.txt и settings.json — то есть входные
        файлы УЖЕ ИДУЩЕЙ задачи. Второе нажатие не должно менять ничего."""
        if self._busy:
            self.log(f"[Занято] Уже идёт «{self._busy}» — «{name}» не "
                     "запущена. Дождись завершения или останови (⛔ Стоп).",
                     "warn")
            return True
        # ЧУЖИЕ ПРОЦЕССЫ ЭТА ПРОВЕРКА РАНЬШЕ НЕ ВИДЕЛА. self._busy знает
        # только про задачи ЭТОГО окна, а параллельная сборка живёт
        # отдельными процессами и переживает перезапуск окна. Нажать
        # «Генерировать видео» на канале, который прямо сейчас собирается
        # снаружи, значило пустить два процесса в одну папку — и оба
        # переписывали бы друг другу сценарий, кадры и субтитры.
        # СПРАШИВАЕМ ПРО СВОЙ КАНАЛ, А НЕ ПРО ВЫБРАННЫЙ В ОКНЕ. Раньше здесь
        # всегда стоял self._channel() — канал, отмеченный в настройках. Для
        # кнопок это верно, а для сборки с ключом --channel — нет: 31.08
        # первый процесс поднял bauwissen, и два других, которым назвали
        # einsturzpunkt и estoico-es, увидели «bauwissen занят» и вышли с
        # кодом 2. Параллельная сборка так и давала один канал вместо трёх.
        # cid="" означает «канал не при чём, внешние процессы не проверяем».
        if cid is None:
            try:
                cid = str((self._channel() or {}).get("id") or "")
            except Exception:
                cid = ""
        cid = str(cid or "")
        if cid and cid in self._channels_building_outside():
            self.log(f"[Занято] Канал «{cid}» прямо сейчас собирается "
                     f"отдельным процессом — «{name}» не запущена. Иначе оба "
                     "полезли бы в одну папку. Дождись или останови сборку.",
                     "warn")
            return True
        return False

    @staticmethod
    def _channels_building_outside() -> set:
        """Какие каналы собираются ВНЕШНИМИ процессами прямо сейчас."""
        import subprocess as _sp
        # ИСКЛЮЧАЕМ СЕБЯ И СВОИХ РОДИТЕЛЕЙ. Без этого проверка ловила
        # собственный процесс: параллельная сборка поднимает
        # «autopilot.py --channel X», тот при старте спрашивал «не идёт ли X
        # снаружи?», видел САМ СЕБЯ и отказывался работать. 31.08 все три
        # канала так и вышли за 0.3 минуты, не сделав ничего.
        свои = {str(os.getpid())}
        try:
            ppid = _sp.run(
                ["powershell", "-NoProfile", "-Command",
                 f"(Get-CimInstance Win32_Process -Filter "
                 f"\"ProcessId={os.getpid()}\").ParentProcessId"],
                capture_output=True, text=True, timeout=20,
                creationflags=core.CREATE_NO_WINDOW).stdout.strip()
            if ppid.isdigit():
                свои.add(ppid)
        except Exception:
            pass
        ps = (
            "Get-CimInstance Win32_Process | Where-Object { "
            "($_.Name -eq 'python.exe' -or $_.Name -eq 'pythonw.exe') -and "
            "$_.CommandLine -like '*autopilot.py --channel*' } | "
            "ForEach-Object { \"$($_.ProcessId)|$($_.CommandLine)\" }"
        )
        got = set()
        try:
            raw = _sp.run(["powershell", "-NoProfile", "-Command", ps],
                          capture_output=True, text=True, timeout=25,
                          creationflags=core.CREATE_NO_WINDOW).stdout
            for line in raw.splitlines():
                if "|" not in line or "--channel" not in line:
                    continue
                pid, cmd = line.split("|", 1)
                if pid.strip() in свои:
                    continue          # это мы сами
                part = cmd.split("--channel", 1)[1].strip().split()
                if part:
                    got.add(part[0])
        except Exception:
            pass          # не смогли спросить — не мешаем работать
        return got

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

    def projects_list(self, limit: int = 60):
        """Полный список проектов канала — для панели «Проекты».

        Почему отдельный метод, а не расширение get_state. Тот зовётся на
        каждый тик опроса и обязан оставаться дешёвым; он и отдаёт всего
        восемь строк для боковой мини-ленты. Здесь же читается meta.json
        каждого проекта и профиль канала — на полусотне папок это заметно,
        и делать это несколько раз в секунду незачем.
        """
        out = []
        try:
            root = self._projects_root()
            cand = channels_mod.channel_projects(root)
            if channels_mod.is_project_dir(root) and root not in cand:
                cand.insert(0, root)
        except OSError:
            return out

        # Профили каналов читаем один раз на весь список, а не на проект.
        try:
            profiles = {c.get("id"): c for c in channels_mod.load()}
        except Exception:
            profiles = {}

        for p in cand[:limit]:
            meta = {}
            try:
                mp = p / "meta.json"
                if mp.exists():
                    meta = json.loads(mp.read_text(encoding="utf-8"))
            except (OSError, ValueError):
                pass
            # Битый meta.json ловится выше, но валидный НЕ-словарь (список,
            # строка, null) прошёл бы дальше и уронил весь список на .get —
            # из-за одной испорченной папки экран «Проекты» остался бы пустым.
            if not isinstance(meta, dict):
                meta = {}

            prof = profiles.get(meta.get("channel")) or {}
            checks = self._checks(p)
            final = p / "output_final.mp4"

            size_mb = 0
            try:
                if final.exists():
                    size_mb = round(final.stat().st_size / 1048576)
            except OSError:
                pass

            out.append({
                "name": p.name,
                "path": str(p),
                # Тема — это и есть человеческое имя проекта. Пока её нет,
                # честнее показать «Нет темы», чем имя папки с датой.
                "topic": (meta.get("topic") or "").strip(),
                "channel": meta.get("channel", ""),
                "channel_name": prof.get("name", ""),
                "lang": prof.get("lang", ""),
                "voice": prof.get("voice", ""),
                "minutes": prof.get("minutes", ""),
                "done": sum(checks.values()),
                "total": len(checks),
                "ready": bool(checks.get("Рендер")),
                "size_mb": size_mb,
                "current": p == self._project,
            })
        return out

    def system_stats(self):
        """Строка состояния: память и очередь.

        Память берём через ctypes, а не psutil: лишняя зависимость ради
        двух чисел в подвале окна покупателю не нужна, а на Windows этот
        вызов есть всегда.
        """
        used = total = 0.0
        try:
            import ctypes

            class MemStatus(ctypes.Structure):
                _fields_ = [("dwLength", ctypes.c_ulong),
                            ("dwMemoryLoad", ctypes.c_ulong),
                            ("ullTotalPhys", ctypes.c_ulonglong),
                            ("ullAvailPhys", ctypes.c_ulonglong),
                            ("ullTotalPageFile", ctypes.c_ulonglong),
                            ("ullAvailPageFile", ctypes.c_ulonglong),
                            ("ullTotalVirtual", ctypes.c_ulonglong),
                            ("ullAvailVirtual", ctypes.c_ulonglong),
                            ("ullAvailExtendedVirtual", ctypes.c_ulonglong)]

            st = MemStatus()
            st.dwLength = ctypes.sizeof(MemStatus)
            ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(st))
            gb = 1073741824
            total = round(st.ullTotalPhys / gb, 1)
            used = round((st.ullTotalPhys - st.ullAvailPhys) / gb, 1)
        except Exception:
            pass

        queue = 0
        try:
            import veo_client
            veo_client.configure_task_store(self._project)
            queue = len(veo_client.pending_tasks())
        except Exception:
            pass

        return {"mem_used": used, "mem_total": total, "queue": queue,
                "busy": bool(getattr(self, "_busy", False))}

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
        name = str(ch.get("name", "")).strip()
        # БЕЗ ИМЕНИ НЕ СОХРАНЯЕМ. Раньше пустое имя молча превращалось в id
        # "channel": в channels.json заводился безымянный канал с пустой
        # нишей и флагом active — то есть он попадал в ночной автопилот и
        # делал ролики неизвестно о чём. Ровно так и вышло, когда владелец
        # заводил канал про кулинарию: запись создалась, имя потерялось,
        # тема бралась не оттуда.
        if not name and not cid:
            self.log("[Каналы] Не сохранил: у канала должно быть имя "
                     "(или явный id латиницей)", "err")
            return self.channels_get()
        if not cid:
            cid = re.sub(r"[^\w\-]+", "_", name.lower()).strip("_")
            if not cid:
                self.log("[Каналы] Не сохранил: из имени не вышло id — "
                         "впиши id латиницей, он же станет именем папки",
                         "err")
                return self.channels_get()
            ch["id"] = cid
        channels_mod.upsert(ch)
        self.log(f"[Каналы] Сохранён профиль «{name or cid}»")
        # НИША — ВСЛУХ. Пустая topic_formula означает, что тему софт
        # подобрать не сможет и попросит её руками на каждый ролик. Молчать
        # об этом нельзя: канал выглядит заведённым, а работать не будет.
        if not str(ch.get("topic_formula", "")).strip():
            self.log(f"[Каналы] У «{name or cid}» пустое поле topic_formula "
                     "— софт не знает, О ЧЁМ этот канал, и тему для каждого "
                     "ролика придётся вписывать вручную. Опиши нишу в "
                     "настройках канала.", "warn")
        return self.channels_get()

    def channel_delete(self, channel_id: str):
        """Убрать канал из софта. ПАПКУ С РОЛИКАМИ НЕ ТРОГАЕТ.

        Раньше убрать канал можно было только правкой channels.json руками —
        владелец попробовал и не смог. Папку сознательно оставляем: там
        сценарии, озвучка и оплаченные кадры, а профиль заводится заново за
        минуту. Что папка осталась — говорим вслух и называем путь, иначе
        «удалил, а место не освободилось» превращается в загадку.
        """
        ch = channels_mod.get(channel_id)
        if not ch:
            self.log(f"[Каналы] Нет профиля «{channel_id}»", "warn")
            return self.channels_get()
        root = channels_mod.projects_dir(ch)
        if not root.is_absolute():
            root = BASE / root
        name = ch.get("name", channel_id)
        try:
            channels_mod.remove(channel_id)
        except Exception as e:
            self.log(f"[Каналы] Не удалось убрать «{name}»: {e}", "err")
            return self.channels_get()
        # Текущий канал не должен остаться указывающим в пустоту.
        if self._settings.get("current_channel", "") == channel_id:
            self._settings["current_channel"] = ""
            self._save_settings_file()
            self.log("[Каналы] Это был текущий канал — выбор сброшен")
        self.log(f"[Каналы] Профиль «{name}» убран из софта")
        if root.exists():
            self.log(f"[Каналы] Папка с роликами ОСТАЛАСЬ на месте: {root}. "
                     "Удали её сам, если она больше не нужна — из софта "
                     "ролики не стираются намеренно.")
        return self.channels_get()

    def channel_autopilot(self, channel_id: str, on: bool):
        """Включить или выключить канал в ночном автопилоте.

        Тот же флаг active, по которому автопилот и night_plan отбирают
        каналы. Отдельной кнопкой, а не через форму профиля: включать и
        выключать канал в ночи хочется одним нажатием.
        """
        try:
            channels_mod.set_active(channel_id, bool(on))
        except Exception as e:
            self.log(f"[Каналы] Не удалось изменить участие в ночи: {e}",
                     "err")
            return self.channels_get()
        ch = channels_mod.get(channel_id) or {}
        name = ch.get("name", channel_id)
        on_all = [c["name"] for c in channels_mod.active()]
        self.log(f"[Каналы] «{name}» {'входит в' if on else 'исключён из'} "
                 f"ночного автопилота. Сейчас в ночи: "
                 f"{', '.join(on_all) if on_all else 'никого'}")
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
        # cur заводится ДО try: внутри try она могла не появиться вовсе
        # (OSError на resolve), а ниже по ней сравнивают пути.
        cur = None
        try:
            cur = self._project.resolve()
            # САМ КОРЕНЬ КАНАЛА рабочей папкой быть не должен. Раньше он
            # проходил проверку как «всё на месте», и это опасно: в корне
            # лежат script.txt, seo.txt, overlays.txt и timeline.json от
            # прошлых роликов — они там копятся и никем не убираются.
            # Стоит рабочей папке оказаться корнем, и цепочка возьмёт ЧУЖОЙ
            # сценарий, чужие плашки и чужое SEO, причём молча: файлы на
            # месте, шаги считаются выполненными. Ровно так уже выходил
            # трёхминутный ролик на 20-минутном канале (см. ХЕНДОВЕР.md), и
            # владелец сегодня снова наткнулся на seo.txt от прошлой темы.
            if cur == root.resolve():
                pass                       # ниже уедем в папку с датой
            elif root.resolve() in cur.parents:
                return False               # всё на месте
        except OSError:
            pass
        root.mkdir(parents=True, exist_ok=True)
        # Не в корень канала, а в его самый свежий проект: корень пустой, и
        # починка расхождения сама по себе означала бы «начать ролик заново».
        dst = channels_mod.latest_project(root)
        # ПЕРЕКЛЮЧАТЬ НЕКУДА. У канала может не быть ни одной папки-проекта с
        # датой - тогда latest_project возвращает САМ КОРЕНЬ, тот самый, из
        # которого мы собирались уехать. Выходило: «Рабочая папка X не
        # принадлежит каналу — переключаю на X», возврат True («починил») и
        # повтор при каждом вызове. В журнале живого прогона 21.08 эта строка
        # печаталась семь раз за две минуты.
        #
        # Опасность корня как рабочей папки настоящая (в нём копятся
        # script.txt и seo.txt прошлых роликов), но говорить о ней надо ОДИН
        # раз и по делу, а не выдавать за починку.
        try:
            same = cur is not None and dst.resolve() == cur
        except OSError:
            same = False
        if same:
            if getattr(self, "_root_as_project_warned", None) != str(dst):
                self._root_as_project_warned = str(dst)
                (log or getattr(self, "_log_raw", print))(
                    f"[Канал] У «{ch['name']}» нет ни одной папки-проекта с "
                    f"датой — ролик собирается прямо в корне «{dst}». Там "
                    "копятся script.txt, seo.txt и overlays.txt прошлых "
                    "роликов, и шаг может молча взять чужой файл.", "warn")
            return False
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


    # ---------- монтажный набор: каждый пункт отдельно ----------
    # Владелец режет сам в Premiere, и ему нужен не «готовый ролик», а
    # РАЗЛОЖЕННЫЙ ПО ПОЛКАМ материал: отдельно таймлайн, отдельно подписи,
    # отдельно клипы, отдельно озвучка. Раньше вкладка «Экспорт» показывала
    # три кнопки и абзац текста — по нему нельзя понять, что уже есть на
    # диске, а чего нет.
    #
    # Пути НЕ приходят из окна: страница называет ключ, а папку выбирает
    # Python. Иначе окно могло бы попросить открыть что угодно на диске.
    EXPORT_ITEMS = (
        # ключ, название, путь, что это
        ("timeline", "Таймлайн для Premiere", "sequence.xml",
         "File → Import → этот файл. Клипы встанут по таймкодам, "
         "озвучка ляжет под ними."),
        ("subs", "Субтитры", "subs/voiceover.srt",
         "File → Import, затем перетащи на таймлайн — получится дорожка "
         "подписей."),
        ("voice", "Озвучка без музыки", "audio/voiceover.mp3",
         "Чистый голос — если хочешь свою музыку."),
        ("voicemus", "Озвучка с музыкой", "audio/voiceover_music.mp3",
         "Голос и подложка уже сведены."),
        ("clips", "Клипы для монтажа", "storyboard",
         "Каждый план отдельным файлом, имена по порядку."),
        ("images", "Кадры и картинки", "images",
         "Картинки для плашек и врезок."),
        ("thumbs", "Обложки", "thumbs",
         "Три варианта на выбор."),
        ("seo", "Названия, описание, теги", "seo.txt",
         "Готово к вставке на YouTube."),
        ("script", "Сценарий", "script.txt",
         "Текст, по которому всё собрано."),
        ("chapters", "Главы", "chapters.json",
         "Таймкоды глав для описания."),
        ("final", "Собранный ролик", "output_final.mp4",
         "Если нужен готовый, а не исходники."),
    )

    @staticmethod
    def _human(n: int) -> str:
        for u in ("Б", "КБ", "МБ", "ГБ"):
            if n < 1024 or u == "ГБ":
                return f"{n:.0f} {u}" if u == "Б" else f"{n:.1f} {u}"
            n /= 1024.0
        return f"{n:.1f} ГБ"

    def export_kit(self) -> list:
        """Что из монтажного набора уже лежит на диске. Факты, не обещания."""
        d = self._project
        out = []
        for key, title, rel, hint in self.EXPORT_ITEMS:
            p = d / rel
            row = {"key": key, "title": title, "rel": rel, "hint": hint,
                   "ready": False, "info": "нет"}
            try:
                if p.is_dir():
                    files = [f for f in p.rglob("*") if f.is_file()]
                    if files:
                        size = sum(f.stat().st_size for f in files)
                        row["ready"] = True
                        row["info"] = f"{len(files)} файл(ов), {self._human(size)}"
                elif p.is_file():
                    row["ready"] = True
                    row["info"] = self._human(p.stat().st_size)
            except OSError as e:
                row["info"] = f"ошибка чтения: {e}"
            out.append(row)
        return out

    def export_open(self, key: str = "") -> None:
        """Показать пункт набора в проводнике. Только по нашему же ключу."""
        rel = dict((k, r) for k, _t, r, _h in self.EXPORT_ITEMS).get(
            (key or "").strip())
        if not rel:
            self.log("[Экспорт] Неизвестный пункт", "warn")
            return
        p = self._project / rel
        if not p.exists():
            self.log(f"[Экспорт] «{rel}» ещё нет — этот шаг не сделан", "warn")
            return
        # Папку открываем саму, файл — показываем в папке выделенным.
        if p.is_dir():
            os.startfile(str(p))
        else:
            subprocess.Popen(["explorer", "/select,", str(p)])

    def export_pack(self) -> None:
        """Сложить всё нужное для монтажа в ОДНУ папку рядом с проектом.

        Зачем копия, а не «открой проект»: в папке проекта лежат ещё и
        render_tmp, служебные json и черновики, и в них тонет то, что
        реально нужно в Premiere.
        """
        def job():
            import shutil, time as _t
            src = self._project
            dest = src / f"ДЛЯ_МОНТАЖА_{_t.strftime('%Y-%m-%d_%H%M')}"
            dest.mkdir(parents=True, exist_ok=True)
            n_files = 0
            total = 0
            for key, title, rel, _hint in self.EXPORT_ITEMS:
                if key == "final":
                    continue          # готовый ролик монтажёру не нужен
                p = src / rel
                if not p.exists():
                    self.log(f"[Экспорт] пропуск «{title}» — нет на диске")
                    continue
                try:
                    if p.is_dir():
                        tgt = dest / p.name
                        shutil.copytree(p, tgt, dirs_exist_ok=True)
                        got = [f for f in tgt.rglob("*") if f.is_file()]
                        n_files += len(got)
                        total += sum(f.stat().st_size for f in got)
                    else:
                        tgt = dest / p.name
                        shutil.copy2(p, tgt)
                        n_files += 1
                        total += tgt.stat().st_size
                    self.log(f"[Экспорт] {title} → {tgt.name}")
                except OSError as e:
                    self.log(f"[Экспорт] {title}: {e}", "err")
            # ВАЖНО про sequence.xml: внутри него лежат АБСОЛЮТНЫЕ пути к
            # клипам в storyboard проекта. После копирования они указывают
            # на старое место — это правильно, файлы там и лежат; но если
            # папку переносить на другой диск, Premiere попросит указать
            # материал заново. Пишем это прямо в памятку, чтобы человек не
            # выяснял это в момент сдачи.
            # Памятку собираем СПИСКОМ СТРОК, а не одним литералом:
            # при генерации файла экранирование переводов строки
            # съезжает, и в готовой памятке вместо переносов
            # оставались их буквальные обозначения (поймано 31.08).
            memo = [
                "МАТЕРИАЛ ДЛЯ РУЧНОГО МОНТАЖА",
                "============================",
                "",
                "sequence.xml   — таймлайн: File > Import в Premiere Pro",
                "voiceover.srt  — подписи: File > Import, потом на таймлайн",
                "voiceover.mp3  — голос без музыки",
                "storyboard/    — клипы по одному на план, имена по порядку",
                "images/        — картинки для врезок",
                "thumbs/        — обложки",
                "seo.txt        — название, описание, теги",
                "script.txt     — сценарий",
                "",
                "ЕСЛИ ПЕРЕНОСИШЬ ПАПКУ НА ДРУГОЙ ДИСК: в sequence.xml пути к",
                "клипам записаны полностью, и Premiere попросит указать",
                "материал заново — покажи ему папку storyboard отсюда.",
            ]
            (dest / "ЧТО_ЗДЕСЬ.txt").write_text(
                chr(10).join(memo) + chr(10), encoding="utf-8")
            self.log(f"[Экспорт] Готово: {n_files} файл(ов), "
                     f"{self._human(total)} → {dest}", "ok")
            self._js("app.exportPacked(%s)" % json.dumps(str(dest)))

        self._bg("Экспорт для монтажа", job)


    def active_channels_count(self) -> int:
        """Сколько каналов включено. Нужно полю «Каналов одновременно»:
        зашитая в разметку двойка возвращалась при каждом перезапуске окна,
        и просьба «три канала» трижды превращалась в два."""
        try:
            return len(channels_mod.active())
        except Exception:
            return 2

    def montage_sources(self) -> dict:
        """Каналы и их папки-проекты для выбора на вкладке «Монтаж».

        Один вызов вместо двух: список каналов и список папок нужны
        странице одновременно, а чтение meta.json по всем каналам — вещь
        не бесплатная, и делать её дважды незачем.
        """
        out = {"channels": [], "current": str(self._project)}
        try:
            chans = channels_mod.load()
        except Exception as e:
            self.log(f"[Монтаж] Не прочитал список каналов: {e}", "warn")
            return out
        for c in chans:
            cid = str(c.get("id") or "")
            if not cid:
                continue
            row = {"id": cid, "name": c.get("name") or cid, "projects": []}
            try:
                root = channels_mod.projects_dir(c)
                root = Path(root)
                if not root.is_absolute():
                    root = BASE / root
                cand = []
                if root.is_dir():
                    cand = channels_mod.channel_projects(root)
                    if channels_mod.is_project_dir(root) and root not in cand:
                        cand.insert(0, root)
                for p in cand[:40]:
                    # Показываем только то, из чего есть что монтировать:
                    # пустая папка в списке — это ложное обещание.
                    has = any((p / n).exists() for n in
                              ("script.txt", "subs", "storyboard",
                               "audio", "sequence.xml"))
                    if has:
                        row["projects"].append(
                            {"path": str(p), "name": p.name})
            except Exception as e:
                self.log(f"[Монтаж] {cid}: {e}", "warn")
            out["channels"].append(row)
        return out


    def build_material(self, p: dict | None = None) -> None:
        """Собрать материал по сценарию и остановиться перед рендером.

        Это ТА ЖЕ цепочка, что и «Генерировать видео», с одним флагом.
        Отдельной реализации нет намеренно: две копии пайплайна в этом
        проекте уже расходились молча, и стоило это ночей работы.
        """
        p = dict(p or {})
        p["no_render"] = True
        self.log("[Материал] Собираю по сценарию: озвучка, субтитры, "
                 "клипы под каждый план. Рендера не будет.")
        self.generate_all(p)



    @staticmethod
    def _running_autopilots() -> str:
        """Что из ночных запусков уже крутится. Пусто — значит свободно.

        Смотрим НА САМОМ ДЕЛЕ, а не по своей переменной: ночь живёт
        отдельными процессами и переживает перезапуск окна, поэтому любой
        внутренний флаг тут врёт.

        Ищем ТОЧНЫЕ имена файлов, а не слово «autopilot»: первая версия
        искала подстроку и ловила сама себя — проверочный скрипт с вызовом
        _running_autopilots попадал под фильтр, и защита срабатывала на
        пустом месте (31.08).
        """
        import subprocess as _sp
        # Фильтр по ИМЕНИ процесса обязателен: без него под условие
        # попадает сам powershell — в его командной строке лежат те же
        # подстроки, что мы ищем, и защита срабатывает на пустом месте.
        ps = (
            "Get-CimInstance Win32_Process | Where-Object { "
            "($_.Name -eq 'python.exe' -or $_.Name -eq 'pythonw.exe') -and ("
            "$_.CommandLine -like '*autopilot_parallel.py*' -or "
            "$_.CommandLine -like '*autopilot.py --channel*') } | "
            "ForEach-Object { $_.ProcessId }"
        )
        try:
            out = _sp.run(["powershell", "-NoProfile", "-Command", ps],
                          capture_output=True, text=True, timeout=25,
                          creationflags=core.CREATE_NO_WINDOW).stdout
        except Exception:
            return ""        # не смогли спросить — не мешаем работать
        pids = [x.strip() for x in out.splitlines() if x.strip().isdigit()]
        # себя в этот список попасть не должно, но подстрахуемся
        pids = [p for p in pids if p != str(os.getpid())]
        return (f"{len(pids)} процесс(ов), pid {', '.join(pids[:6])}"
                if pids else "")

    def autopilot_parallel(self, p: dict | None = None) -> None:
        """Ночь параллельно: ОТДЕЛЬНЫЙ ПРОЦЕСС на канал.

        Почему не потоками внутри себя — замер по коду 31.08. На весь
        процесс общие: core.VIDEO_ASPECT (формат кадра — у одного канала
        9:16, у другого 16:9, перезапишут друг друга и закажут не те
        картинки), render.CANCEL и core.reset_cancel (флаг «Стоп» один на
        всех), quality.reset (список замечаний приёмки), а также
        core._МЁРТВЫЕ_КАРТИНОЧНЫЕ и core._VEO_ABSENT_SAID.

        Поэтому запускаем autopilot_parallel.py — он поднимает по процессу
        на канал, и у каждого своё состояние. Само окно при этом остаётся
        свободным: ночь идёт снаружи, а не внутри задачи приложения.
        """
        import sys as _sys          # в webapp sys не импортирован
        p = p or {}
        script = BASE / "autopilot_parallel.py"
        if not script.exists():
            self.log("[Сборка] Нет autopilot_parallel.py рядом с программой",
                     "err")
            return
        # 0 или пусто — значит ВСЕ включённые каналы. Решает питон, а не
        # разметка: зашитая в HTML двойка возвращалась при каждом
        # перезапуске окна, и просьба «три канала» трижды давала два.
        try:
            asked = int(p.get("max") or 0)
        except (TypeError, ValueError):
            asked = 0
        n = asked if asked > 0 else self.active_channels_count()
        n = max(1, min(8, n))
        try:
            vids = max(1, min(5, int(p.get("videos") or 1)))
        except (TypeError, ValueError):
            vids = 1
        # ОДИН ЗАПУСК ЗА РАЗ. Без этой проверки каждое нажатие поднимало
        # ещё один набор процессов: 31.08 в списке оказалось 4 копии
        # autopilot_parallel, 4 копии канала einsturzpunkt и 3 копии
        # estoico-es — и все писали в одни и те же папки. Журнал об этом
        # предупреждал, но не мешал.
        busy = self._running_autopilots()
        if busy:
            self.log(f"[Сборка] Уже идёт: {busy}. Второй раз запускать нельзя "
                     "— процессы полезут в одни папки. Останови текущую "
                     "ночь, если хочешь начать заново.", "warn")
            return
        logs = BASE / "autopilot_logs"
        logs.mkdir(exist_ok=True)
        cmd = [_sys.executable, "-X", "utf8", str(script),
               "--max", str(n), "--videos", str(vids)]
        only = str(p.get("channels") or "").strip()
        if only:
            cmd += ["--channels", only]
        try:
            out = (logs / "parallel.log").open("w", encoding="utf-8",
                                               errors="replace")
            subprocess.Popen(cmd, cwd=str(BASE), stdout=out,
                             stderr=subprocess.STDOUT,
                             creationflags=core.CREATE_NO_WINDOW)
        except OSError as e:
            self.log(f"[Сборка] Не запустилось: {e}", "err")
            return
        self.log(f"[Сборка] Запускаю {n} канал(ов) разом. Идёт ОТДЕЛЬНО от "
                 f"окна — программу не закрывай, ноутбук не усыпляй. "
                 f"Ход виден на Дашборде.", "ok")
        self.log("[Сборка] Журналы по каналам: autopilot_logs/<id>.log")


    def parallel_status(self) -> dict:
        """Кто сейчас работает, сколько уже идёт и молчит ли.

        Главный ответ, который здесь нужен человеку: ЗАВИС ИЛИ РАБОТАЕТ.
        Отличить их можно только по пульсу журнала — по общему времени
        нельзя, сборка ролика честно занимает часы. Поэтому на каждый канал
        считаем, сколько минут назад в его файл падала последняя строка.
        """
        import time as _t
        out = {"running": [], "silent_limit_min": 45}
        logs = BASE / "autopilot_logs"
        # какие каналы реально крутятся
        alive = {}
        try:
            import subprocess as _sp
            ps = (
                "Get-CimInstance Win32_Process | Where-Object { "
                "($_.Name -eq 'python.exe' -or $_.Name -eq 'pythonw.exe') -and "
                "$_.CommandLine -like '*autopilot.py --channel*' } | "
                "ForEach-Object { \"$($_.ProcessId)|$($_.CommandLine)\" }"
            )
            raw = _sp.run(["powershell", "-NoProfile", "-Command", ps],
                          capture_output=True, text=True, timeout=25,
                          creationflags=core.CREATE_NO_WINDOW).stdout
            for line in raw.splitlines():
                if "|" not in line:
                    continue
                pid, cmd = line.split("|", 1)
                if "--channel" not in cmd:
                    continue
                part = cmd.split("--channel", 1)[1].strip().split()
                if part:
                    alive[part[0]] = pid.strip()
        except Exception as e:
            out["error"] = str(e)[:120]
        for cid, pid in alive.items():
            row = {"id": cid, "pid": pid, "silent_min": None, "last": ""}
            f = logs / f"{cid}.log"
            try:
                if f.exists():
                    row["silent_min"] = round(
                        (_t.time() - f.stat().st_mtime) / 60, 1)
                    tail = f.read_text(encoding="utf-8",
                                       errors="replace").strip().splitlines()
                    row["last"] = tail[-1][:120] if tail else ""
            except OSError:
                pass
            out["running"].append(row)
        # общий журнал: он один на всех и обновляется чаще, по нему видно,
        # что машина вообще шевелится
        try:
            lf = BASE / "app.log"
            out["log_silent_min"] = round(
                (_t.time() - lf.stat().st_mtime) / 60, 1)
        except OSError:
            out["log_silent_min"] = None
        return out

    def open_folder(self):
        self._project.mkdir(parents=True, exist_ok=True)
        os.startfile(self._project)

    # ---------- набор материала под ручной монтаж ----------
    # Отдельная от конвейера ветка: она НИЧЕГО не собирает и не рендерит, а
    # только добывает материал и раскладывает по полкам. Нужна тем, кто режет
    # сам в Premiere и кому готовый ролик не нужен вовсе.
    _last_kit: str = ""

    def mediakit_build(self, opts: dict) -> None:
        opts = opts or {}
        query = str(opts.get("query") or "").strip()
        if not query:
            self.log("[Набор] Не сказано, про что искать", "warn")
            return
        import mediakit

        def job():
            import time as _t
            name = mediakit._slug(query, 30) or "kit"
            root = Path(__file__).resolve().parent / "Наборы"
            out = root / f"{_t.strftime('%Y-%m-%d_%H%M')}_{name}"
            res = mediakit.build_kit(
                query, out,
                shots=max(1, min(30, int(opts.get("shots") or 8))),
                stock_video=bool(opts.get("stock_video", True)),
                stock_photo=bool(opts.get("stock_photo", True)),
                ai_frames=max(0, min(30, int(opts.get("ai_frames") or 0))),
                ai_clips=max(0, min(30, int(opts.get("ai_clips") or 0))),
                music=bool(opts.get("music", True)),
                script=str(opts.get("script") or ""),
                music_dir=str(self._settings.get("music_library") or ""),
                log=self.log)
            self._last_kit = res["dir"]
            self._js("app.kitDone(%s)" % json.dumps(res["dir"]))
            self.log(f"[Набор] Папка готова: {res['dir']}")

        self._bg("Набор материала", job)

    def mediakit_open(self, path: str = "") -> None:
        """Открыть собранную папку в проводнике.

        Путь принимаем ТОЛЬКО тот, что сами же и отдали: открывать по строке
        из окна значило бы дать странице открыть любую папку на диске.
        """
        target = (path or "").strip() or self._last_kit
        if target and target == self._last_kit and Path(target).exists():
            os.startfile(target)
        else:
            self.log("[Набор] Папки ещё нет — сначала собери набор", "warn")

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
                                   extra=(ch or {}).get("script_extra", ""),
                                   rate=int((ch or {}).get("rate") or 0))
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
        pitch = int(p.get("pitch") or 0)
        if p.get("randomize"):
            # Голос — постоянный признак канала: если профиль его задал, он
            # в channel_locked, и «Разнообразие» перебирает всё остальное,
            # но не голос. Раньше ради этого целиком гасили randomize — и
            # заодно теряли разнообразие монтажа и цветокора.
            if "voice" in (p.get("channel_locked") or ()):
                self.log(f"[Канал] Голос {voice} и темп {rate:+d}% из "
                         "профиля — «Разнообразие» их не трогает")
            else:
                # Голос передаём внутрь: разнообразие обязано остаться в
                # языке ролика. Без этого испанский голос молча менялся на
                # английский - список жребия был en-US-* целиком.
                was = voice
                st = core.project_style(self._project, voice=voice,
                                        lang=p.get("lang", ""))
                voice, rate = st["voice"], st["rate"]
                if was and voice.split("-")[0] != was.split("-")[0]:
                    # Язык всё-таки уехал - значит в списке его нет.
                    # Возвращаем выбранный: чужой язык хуже однообразия.
                    voice = was
                    self.log(f"[Разнообразие] Голос {voice} оставлен: "
                             "другого голоса этого языка в списке нет", "warn")
                else:
                    self.log(f"[Разнообразие] Голос {voice}, темп {rate:+d}% "
                             "(случайно под этот проект, язык сохранён)")
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
        # Целевая громкость — из палитры канала (core.LOUDNESS_LUFS): у
        # образца тёплого канала звук сведён на -13.9 LUFS, у образца
        # созерцательного на -16.8, и одно число на всех делает один из двух
        # каналов заведомо неправильным.
        palette = (ch or {}).get("palette", "")
        mp3 = self._project / "audio" / "voiceover.mp3"
        stamp_file = self._project / "audio" / ".voice_stamp"
        # palette В ОТПЕЧАТКЕ. Иначе смена палитры канала (а с ней и целевой
        # громкости) не переозвучила бы ролик: готовый файл считался бы «тем
        # же самым», и канал так и остался бы на прежних -16 LUFS молча —
        # ровно та же беда, из-за которой в отпечаток когда-то добавили голос.
        stamp = hashlib.sha1(
            f"{text}|{voice}|{rate}|{pitch}|{enh}|{p.get('pauses', True)}|"
            f"{p.get('engine', '')}|{p.get('polly_engine', '')}|"
            f"{core.loudness_of(palette):g}"
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
        if core.loudness_of(palette) != core.LOUDNESS_LUFS_DEFAULT:
            self.log(f"[Озвучка] Громкость канала «{palette}»: "
                     f"{core.loudness_of(palette):g} LUFS вместо общих "
                     f"{core.LOUDNESS_LUFS_DEFAULT:g} — из замера образца "
                     "этой ниши")
        if "edge" in str(p.get("engine") or "Edge").lower():
            core.tts_edge(text, voice, self._project, self.log, rate, enh,
                          bool(p.get("pauses", True)), pitch, palette)
        else:
            # Движок Polly выбирает ПОЛЬЗОВАТЕЛЬ: цены различаются в 25 раз
            # ($4/млн у standard против $100/млн у long-form — на ролике в
            # 32 тыс. символов это $0.13 против $3.23). Прошивать такой
            # выбор в код нельзя, это чужие деньги. По умолчанию neural.
            eng = str(p.get("polly_engine", "neural")).strip() or "neural"
            core.tts_polly(text, voice, eng, self._project,
                           self.log, rate, bool(p.get("pauses", True)), enh,
                           palette)
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

    # ---------- ИИ-видео: прямой доступ ко всем режимам Veo ----------
    #
    # Зачем отдельно от конвейера. Конвейер собирает РОЛИК: сценарий,
    # озвучка, раскадровка, оверлеи Remotion, рендер. Здесь ничего этого
    # нет — только генератор и его пять режимов, как в самой панели
    # VeoNonStop. Нужно, когда ролик делается «ИИ плюс эффекты», без
    # Remotion, и когда надо просто посмотреть, что генератор отдаёт.
    #
    # Всё сгенерированное копится в одной папке и показывается списком:
    # раньше результаты расползались по папкам проектов, и найти вчерашний
    # клип было нечем.
    AI_DIR = BASE / "ai_studio"

    def ai_pick_images(self):
        """Выбрать картинки для режимов, которым нужен вход."""
        res = self._win.create_file_dialog(
            webview.OPEN_DIALOG, allow_multiple=True,
            file_types=("Картинки (*.jpg;*.jpeg;*.png;*.webp)",
                        "Все файлы (*.*)"))
        return " | ".join(res) if res else None

    def ai_list(self):
        """Что уже сгенерировано — новое сверху."""
        d = self.AI_DIR
        if not d.is_dir():
            return []
        out = []
        for f in d.iterdir():
            if f.suffix.lower() not in (".mp4", ".jpg", ".png", ".webp"):
                continue
            try:
                st = f.stat()
            except OSError:
                continue
            note = f.with_suffix(".txt")
            out.append({
                "name": f.name,
                "path": str(f),
                "kind": "video" if f.suffix.lower() == ".mp4" else "image",
                "size_mb": round(st.st_size / 1e6, 1),
                "at": int(st.st_mtime),
                "prompt": (note.read_text(encoding="utf-8", errors="replace")
                           if note.exists() else ""),
            })
        out.sort(key=lambda x: -x["at"])
        return out

    def ai_open_folder(self):
        self.AI_DIR.mkdir(parents=True, exist_ok=True)
        os.startfile(str(self.AI_DIR))
        return True

    def ai_generate(self, kind: str, prompt: str, ratio: str,
                    count: int = 1, images: str = ""):
        """Один запуск генератора. kind — как в панели VeoNonStop:
        text | image | batch | component | banana."""
        # Панель «ИИ-видео» — прямой доступ к генератору, мимо цепочки. Без
        # этой строки демоверсия гнала через неё сколько угодно кадров и
        # клипов после исчерпания лимита: демо-потолок стоял только в цепочке.
        if self._demo_stop():
            return False
        kind = (kind or "text").strip()
        prompt = (prompt or "").strip()
        ratio = (ratio or "9:16").strip()
        paths = [Path(x.strip()) for x in (images or "").split("|")
                 if x.strip()]

        def job():
            import veo_client as veo
            key = (self._settings.get("veo_key", "")
                   or os.getenv("VEO_API_KEY", "")).strip()
            if not key:
                raise RuntimeError("Нет ключа VeoNonStop: впиши VEO_API_KEY "
                                   "в .env или ключ в Настройках.")
            if not prompt and kind != "banana":
                raise RuntimeError("Опиши, что генерировать.")
            # Сколько картинок нужен каждому режиму — проверяем ДО запроса,
            # иначе задача уходит на сервер и падает там, потратив слот.
            need = {"text": 0, "banana": 0, "image": 1, "batch": 2,
                    "component": 2}.get(kind)
            if need is None:
                raise RuntimeError(f"Неизвестный режим «{kind}»")
            if len(paths) < need:
                raise RuntimeError(
                    f"Режиму «{kind}» нужно картинок: {need}, "
                    f"а выбрано {len(paths)}")
            for q in paths[:max(need, 1)]:
                if not q.exists():
                    raise RuntimeError(f"Нет файла {q}")

            self.AI_DIR.mkdir(parents=True, exist_ok=True)
            stamp = time.strftime("%Y%m%d-%H%M%S")
            self.log(f"[ИИ-видео] Режим «{kind}», кадр {ratio}, "
                     f"штук {count}...")

            # ИНГРЕДИЕНТЫ прикладываются САМИ, без галочек: в этом весь
            # смысл набора — герой должен попасть в каждый кадр, а не в те,
            # где человек не забыл его выбрать. Прошлая сборка ролика
            # потеряла героиню ровно там, где ссылку не приложили.
            ings = [{"name": i["label"], "path": Path(i["path"]),
                     "mime_type": "image/jpeg"}
                    for i in self.ai_ingredients()]
            if ings:
                self.log(f"[ИИ-видео] Ингредиентов приложено: {len(ings)} "
                         f"({', '.join(sorted({i['name'] for i in ings}))})")

            if kind == "banana":
                import urllib.request
                r = veo.banana_generate(prompt, num_images=int(count),
                                        aspect_ratio=ratio, api_key=key,
                                        reference_images=ings or None,
                                        use_all_ref_images=bool(ings))
                media = (r or {}).get("media") or []
                if not media:
                    raise RuntimeError("Генератор не вернул картинок")
                for n, m in enumerate(media):
                    u = m.get("fifeUrl")
                    if not u:
                        continue
                    dst = self.AI_DIR / f"{stamp}_banana_{n}.jpg"
                    urllib.request.urlretrieve(u, dst)
                    dst.with_suffix(".txt").write_text(prompt,
                                                       encoding="utf-8")
                    self.log(f"[ИИ-видео] Картинка: {dst.name}")
                return

            if kind == "text":
                tid = veo.text_to_video(prompt, aspect_ratio=ratio,
                                        count=int(count), api_key=key)
            elif kind == "image":
                tid = veo.image_to_video(prompt, paths[0],
                                         aspect_ratio=ratio,
                                         count=int(count), api_key=key)
            elif kind == "batch":
                tid = veo.batch_frame_to_video(prompt, paths[0], paths[1],
                                               aspect_ratio=ratio,
                                               count=int(count), api_key=key)
            else:   # component: несколько названных картинок в одном кадре
                imgs = [{"name": q.stem, "path": q} for q in paths]
                tid = veo.multi_image_to_video(prompt, imgs,
                                               aspect_ratio=ratio,
                                               count=int(count), api_key=key)
            self.log(f"[ИИ-видео] Задача {tid[:16]}, жду (1-3 мин)...")
            veo.wait_for_completion(tid, key, log=self.log)
            for n in range(int(count)):
                dst = self.AI_DIR / f"{stamp}_{kind}_{n}.mp4"
                try:
                    veo.download_video(tid, dst, video_index=n, api_key=key)
                except Exception as e:
                    if n == 0:
                        raise
                    self.log(f"[ИИ-видео] Видео {n} не забралось: "
                             f"{str(e)[:80]}", "warn")
                    break
                dst.with_suffix(".txt").write_text(
                    f"{kind} | {ratio}\n{prompt}", encoding="utf-8")
                self.log(f"[ИИ-видео] Готово: {dst.name}")

        self._bg("ИИ-видео", job)
        return True

    # ---------- ПОЛНЫЙ РЕНДЕР БЕЗ REMOTION ----------
    #
    # Тот же путь, что у основной кнопки «Генерировать видео», но визуал
    # целиком из генератора, а не из оверлеев Remotion и стока:
    #   тема -> сценарий -> озвучка -> тайминг слов -> опорные кадры ->
    #   оживление -> подписи по словам -> музыка -> сборка.
    #
    # Зачем отдельно. Основной конвейер строит документальный ролик:
    # раскадровка под фразы, плашки, схемы, приёмка из тринадцати проверок.
    # Здесь нужен другой продукт — ролик, который целиком нарисован ИИ, и
    # ни одного оверлея в нём нет по замыслу.
    #
    # ПОСТОЯНСТВО ГЕРОЯ держится тремя привязками разом, потому что по
    # отдельности каждая протекает (замер 20.08 на двухминутном ролике):
    #   1. портрет героя ссылкой в КАЖДЫЙ опорный кадр;
    #   2. описание места дословно одинаковое во всех кадрах;
    #   3. соседние кадры сшиты batch-frame — конец одного клипа и есть
    #      начало следующего.
    def ai_frames(self, topic: str, lang: str = "русский",
                  ratio: str = "9:16", count: int = 8, style: str = ""):
        """ШАГ ПЕРВЫЙ: только КАДРЫ, без сборки.

        Так устроен Flow, и владелец просил именно это: генератор отдаёт
        кадры, человек смотрит их и выбирает нужные, и уже из выбранных
        собирается ролик. Однокнопочная сборка «тема -> готовое видео»
        отнимает у человека тот единственный шаг, где он и решает, каким
        ролик будет.

        Сценарий пишется здесь же — по нему кадры получают РАЗНЫЕ описания.
        Одно описание на все кадры даёт одинаковые картинки: ровно та
        однотипность, из-за которой прежние ролики выглядели набором одного
        и того же плана.
        """
        if self._demo_stop():
            return False
        topic = (topic or "").strip()
        count = max(2, min(int(count or 8), 40))
        ratio = (ratio or "9:16").strip()

        def job():
            import urllib.request
            import veo_client as veo
            key = (self._settings.get("veo_key", "")
                   or os.getenv("VEO_API_KEY", "")).strip()
            if not key:
                raise RuntimeError("Нет ключа VeoNonStop")
            if not topic:
                raise RuntimeError("Напиши тему")
            llm = (self._settings.get("gemini_key", "")
                   or self._settings.get("agnes_key", ""))

            self.AI_DIR.mkdir(parents=True, exist_ok=True)
            stamp = time.strftime("%Y%m%d-%H%M%S")
            aspect = "9:16" if ratio == "9:16" else "16:9"
            look = (style or "").strip() or (
                "Stylized 3D animated film still, Pixar-like rendering, warm "
                "cinematic light, rich colour. NEVER photoreal.")

            # Описания планов по смыслу текста, а не одно на всех.
            beats = []
            if llm:
                self.log(f"[Кадры] Сценарий по теме «{topic}»…")
                try:
                    text = core.gen_script(topic, max(1, count // 8) or 1,
                                           llm, self.log, lang=lang)
                    (self.AI_DIR / f"{stamp}_script.txt").write_text(
                        text, encoding="utf-8")
                    words = text.split()
                    step = max(1, len(words) // count)
                    chunks = [" ".join(words[k * step:(k + 1) * step])
                              for k in range(count)]
                    beats = core.ai_scene_prompts(
                        [{"text": c} for c in chunks if c.strip()],
                        llm, self.log) or []
                except Exception as e:
                    self.log(f"[Кадры] Сценарий не вышел ({str(e)[:80]}) — "
                             "описываю кадры по теме", "warn")
            if len(beats) < count:
                beats += [f"a distinct visual moment of: {topic}"] * (
                    count - len(beats))

            refs = None
            got = 0
            for i2 in range(count):
                p = self.AI_DIR / f"{stamp}_f{i2:02d}.jpg"
                ok = False
                for m in ("GEM_PIX", "HARBOR_SEAL", "GEM_PIX_2", "NARWHAL"):
                    try:
                        r = veo.banana_generate(
                            look + chr(10) + "SHOT: " + beats[i2],
                            num_images=1, aspect_ratio=aspect, model_key=m,
                            reference_images=refs,
                            use_all_ref_images=bool(refs), api_key=key)
                        u = ((r or {}).get("media") or [{}])[0].get("fifeUrl")
                        if u:
                            urllib.request.urlretrieve(u, p)
                            ok = True
                            break
                    except Exception as e:
                        if "EXHAUSTED" not in str(e):
                            self.log(f"[Кадры] {m}: {str(e)[:70]}", "warn")
                if ok:
                    got += 1
                    p.with_suffix(".txt").write_text(beats[i2],
                                                     encoding="utf-8")
                    if refs is None:
                        # Первый кадр — образец для остальных, иначе герой и
                        # место меняются от кадра к кадру.
                        refs = [{"name": "hero", "path": p,
                                 "mime_type": "image/jpeg"}]
                self.log(f"[Кадры] {i2 + 1}/{count}"
                         + ("" if ok else " — не вышел"))
            self.log(f"[Кадры] Готово: {got} из {count}. Выбери нужные "
                     "галочками и нажми «Собрать из выбранных».")

        self._bg("Кадры", job)
        return True

    def ai_build_from(self, paths: str, lang: str = "русский",
                      ratio: str = "9:16", topic: str = "",
                      narrate: bool = True):
        """ШАГ ВТОРОЙ: ролик из ВЫБРАННЫХ кадров.

        Кадры сшиваются цепочкой batch-frame: конец одного клипа и есть
        начало следующего, поэтому на стыке ничего не переодевается. Где
        batch-frame откажет (замер: 5 пар из 15 падают на
        PUBLIC_ERROR_AUDIO_FILTERED — фильтр рубит звук, который Veo
        дорисовывает сам), берётся image_to_video по первому кадру пары.
        """
        if self._demo_stop():
            return False
        picked = [Path(x.strip()) for x in (paths or "").split("|")
                  if x.strip()]
        ratio = (ratio or "9:16").strip()
        topic = (topic or "").strip()

        def job():
            import veo_client as veo
            key = (self._settings.get("veo_key", "")
                   or os.getenv("VEO_API_KEY", "")).strip()
            if not key:
                raise RuntimeError("Нет ключа VeoNonStop")
            if len(picked) < 2:
                raise RuntimeError("Выбери хотя бы два кадра")
            for q in picked:
                if not q.exists():
                    raise RuntimeError(f"Нет файла {q.name}")

            W, H = (1080, 1920) if ratio == "9:16" else (1920, 1080)
            FPS = 30
            aspect = "9:16" if ratio == "9:16" else "16:9"
            d = self.AI_DIR / ("reel_" + time.strftime("%Y%m%d-%H%M%S"))
            d.mkdir(parents=True, exist_ok=True)
            self.log(f"[Сборка] Кадров выбрано: {len(picked)} — "
                     f"будет {len(picked) - 1} клипов по 8 c "
                     f"(~{(len(picked) - 1) * 8} c ролика)")

            MOVE = ("continuous shot, steady camera, no cut, no new "
                    "character, no change of place")
            for i2 in range(len(picked) - 1):
                out = d / f"v{i2:02d}.mp4"
                if out.exists():
                    continue
                try:
                    tid = veo.batch_frame_to_video(
                        MOVE, picked[i2], picked[i2 + 1],
                        aspect_ratio=aspect, api_key=key)
                    veo.wait_for_completion(tid, key, timeout_s=1200)
                    veo.download_video(tid, out, api_key=key)
                except Exception as e:
                    self.log(f"[Сборка] Клип {i2}: {str(e)[-40:]} — "
                             "запасной путь", "warn")
                    try:
                        tid = veo.image_to_video(MOVE, picked[i2],
                                                 aspect_ratio=aspect,
                                                 api_key=key)
                        veo.wait_for_completion(tid, key, timeout_s=1200)
                        veo.download_video(tid, out, api_key=key)
                    except Exception as e2:
                        self.log(f"[Сборка] Клип {i2} не вышел: "
                                 f"{str(e2)[:60]}", "warn")
                self.log(f"[Сборка] Клип {i2 + 1}/{len(picked) - 1}")

            clips = sorted(d.glob("v??.mp4"))
            if not clips:
                raise RuntimeError("Ни одного клипа не собралось")

            # Озвучка по теме — только если попросили и есть ключ модели.
            voice_mp3, vdur, js = None, 0.0, []
            llm = (self._settings.get("gemini_key", "")
                   or self._settings.get("agnes_key", ""))
            if narrate and topic and llm:
                secs = len(clips) * 8
                text = core.gen_script(topic, max(1, round(secs / 60)),
                                       llm, self.log, lang=lang)
                vo = {"русский": "ru-RU-SvetlanaNeural",
                      "испанский": "es-ES-ElviraNeural",
                      "немецкий": "de-DE-KatjaNeural"}.get(
                          lang, "en-US-AriaNeural")
                core.tts_edge(text, vo, d, self.log)
                cands = sorted((d / "audio").glob("*.mp3")) \
                    if (d / "audio").is_dir() else sorted(d.glob("*.mp3"))
                voice_mp3 = cands[0] if cands else None
                if voice_mp3:
                    vdur = float(subprocess.run(
                        ["ffprobe", "-v", "error", "-show_entries",
                         "format=duration", "-of", "csv=p=0",
                         str(voice_mp3)], capture_output=True,
                        text=True).stdout.strip() or 0)
                    asr = d / "asr"
                    asr.mkdir(exist_ok=True)
                    core.transcribe_whisper(voice_mp3, "small", asr,
                                            lambda *a, **k: None, lang=lang)
                    js = sorted((asr / "subs").glob("*.json"))

            lst = d / "list.txt"
            lst.write_text("".join(f"file '{c.as_posix()}'" + chr(10)
                                   for c in clips), encoding="utf-8")
            joined = d / "joined.mp4"
            core.run_tree(
                ["ffmpeg", "-y", "-loglevel", "error", "-f", "concat",
                 "-safe", "0", "-i", str(lst), "-an",
                 "-vf", (f"scale={W}:{H}:force_original_aspect_ratio="
                         f"increase,crop={W}:{H},fps={FPS},setsar=1"),
                 "-c:v", "libx264", "-preset", "veryfast", "-crf", "21",
                 "-pix_fmt", "yuv420p", str(joined)], 1800)

            # Цвет и moov: без этого файл не открывается частью плееров —
            # замер 21.08 на готовой сборке дал pix_fmt yuvj420p и moov в
            # хвосте, и владелец не смог открыть файл вовсе.
            vf = "scale=in_range=full:out_range=tv,format=yuv420p"
            if js:
                ass = d / "words.ass"
                render.build_word_ass(js[0], ass, W, H,
                                      render.SUB_SIZES["средние"], "")
                if ass.exists():
                    ap = str(ass).replace(chr(92), "/").replace(
                        ":", chr(92) + ":")
                    vf = f"ass='{ap}'," + vf

            out = self.AI_DIR / f"{d.name}.mp4"
            cmd = ["ffmpeg", "-y", "-loglevel", "error", "-i", str(joined)]
            maps = ["-map", "0:v"]
            if voice_mp3:
                mus = next((q for q in sorted(
                    (BASE / "music_library").rglob("*.mp3"))
                    if core.music_license_ok(q)), None)
                cmd += ["-i", str(voice_mp3)]
                fc = "[1:a]volume=1.0[v1]"
                mix, n = "[v1]", 1
                if mus:
                    cmd += ["-i", str(mus)]
                    fc += (f";[2:a]atrim=0:{vdur:.2f},volume=0.24,"
                           f"afade=t=out:st={max(0, vdur - 2):.2f}:d=2[m]")
                    mix += "[m]"
                    n = 2
                fc += (f";{mix}amix=inputs={n}:normalize=0:duration=longest,"
                       f"loudnorm=I=-14:TP=-1.5[a]")
                cmd += ["-filter_complex", fc]
                maps += ["-map", "[a]", "-c:a", "aac", "-b:a", "192k",
                         "-ar", "48000"]
            cmd += ["-vf", vf, *maps,
                    "-c:v", "libx264", "-preset", "medium", "-crf", "20",
                    "-pix_fmt", "yuv420p", "-color_range", "tv",
                    "-colorspace", "bt709", "-color_primaries", "bt709",
                    "-color_trc", "bt709", "-movflags", "+faststart",
                    str(out)]
            r = core.run_tree(cmd, 1800)
            if r.returncode or not out.exists():
                raise RuntimeError(f"сборка: {(r.stderr or '')[-200:]}")
            self.log(f"[Сборка] ГОТОВО: {out.name} — {len(clips)} клипов "
                     f"из {len(picked)} кадров")

        self._bg("Сборка из кадров", job)
        return True

    # ---------- Ингредиенты: постоянство героя между клипами ----------
    #
    # Устройство снято с Google Flow: там это называется Ingredients —
    # набор опорных картинок (герой, место, стиль), который прикладывается
    # к КАЖДОЙ генерации. Именно так держится один и тот же персонаж во
    # всей сцене; без этого каждый клип рождается сам по себе, и лицо с
    # обстановкой плывут от плана к плану.
    #
    # Картинки КОПИРУЮТСЯ к себе, а не запоминаются путями: исходник
    # человек может переложить или удалить, и тогда набор молча
    # рассыпался бы посреди сборки.
    ING_KINDS = {"hero": "герой", "place": "место", "style": "стиль"}

    def _ing_dir(self):
        d = self.AI_DIR / "ingredients"
        d.mkdir(parents=True, exist_ok=True)
        return d

    def ai_ingredients(self):
        out = []
        for f in sorted(self._ing_dir().iterdir()) if self._ing_dir().is_dir() else []:
            if f.suffix.lower() not in (".jpg", ".jpeg", ".png", ".webp"):
                continue
            kind = f.stem.split("_", 1)[0]
            out.append({"name": f.name, "path": str(f),
                        "kind": kind if kind in self.ING_KINDS else "hero",
                        "label": self.ING_KINDS.get(kind, "герой")})
        return out

    def ai_ingredient_add(self, kind: str = "hero"):
        kind = kind if kind in self.ING_KINDS else "hero"
        res = self._win.create_file_dialog(
            webview.OPEN_DIALOG, allow_multiple=True,
            file_types=("Картинки (*.jpg;*.jpeg;*.png;*.webp)",
                        "Все файлы (*.*)"))
        if not res:
            return self.ai_ingredients()
        import shutil
        for q in res:
            src = Path(q)
            dst = self._ing_dir() / f"{kind}_{int(time.time())}_{src.name}"
            shutil.copy2(src, dst)
            self.log(f"[Ингредиенты] Добавлен «{self.ING_KINDS[kind]}»: "
                     f"{dst.name}")
        return self.ai_ingredients()

    def ai_ingredient_remove(self, name: str):
        f = self._ing_dir() / Path(str(name)).name
        # Это НАША копия, оригинал человека лежит там, где лежал, — поэтому
        # удаляем без вопросов, терять нечего.
        if f.exists() and f.parent == self._ing_dir():
            f.unlink()
            self.log(f"[Ингредиенты] Убран {f.name}")
        return self.ai_ingredients()

    # ---------- Сцены: цепочка клипов с общим стыком ----------
    #
    # Устройство снято с Flow (там это SceneBuilder + Scene Extension).
    # Смысл: ролик длиннее восьми секунд нельзя получить одной задачей, но
    # можно набрать цепочкой, где КАЖДЫЙ следующий клип начинается с
    # последнего кадра предыдущего. Стык тогда не виден — там физически
    # один и тот же кадр, а не два похожих.
    #
    # Сцена = папка с клипами, пронумерованными по порядку. Порядок держит
    # имя файла, а не список в памяти: софт закрывают посреди работы, и
    # сцена должна пережить это без потерь.
    def _scenes_dir(self):
        d = self.AI_DIR / "scenes"
        d.mkdir(parents=True, exist_ok=True)
        return d

    def ai_scenes(self):
        out = []
        for d in sorted(self._scenes_dir().iterdir()):
            if not d.is_dir():
                continue
            clips = sorted(d.glob("*.mp4"))
            secs = 0.0
            for c in clips:
                try:
                    secs += float(subprocess.run(
                        ["ffprobe", "-v", "error", "-show_entries",
                         "format=duration", "-of", "csv=p=0", str(c)],
                        capture_output=True, text=True).stdout.strip() or 0)
                except Exception:
                    pass
            out.append({"name": d.name, "path": str(d),
                        "clips": len(clips), "secs": round(secs, 1),
                        "last": str(clips[-1]) if clips else ""})
        return out

    def ai_scene_new(self, name: str):
        safe = re.sub(r"[^\w\- ]+", "", str(name or "").strip())[:60]
        if not safe:
            self.log("[Сцена] Нужно имя", "warn")
            return self.ai_scenes()
        (self._scenes_dir() / safe).mkdir(parents=True, exist_ok=True)
        self.log(f"[Сцена] Заведена «{safe}»")
        return self.ai_scenes()

    def ai_scene_add(self, scene: str, video: str):
        """Положить готовый клип в сцену — он встаёт последним."""
        import shutil
        d = self._scenes_dir() / Path(str(scene)).name
        src = Path(str(video))
        if not d.is_dir() or not src.exists():
            self.log("[Сцена] Нет сцены или файла", "warn")
            return self.ai_scenes()
        n = len(list(d.glob("*.mp4")))
        shutil.copy2(src, d / f"{n:03d}_{src.name}")
        self.log(f"[Сцена] «{d.name}»: добавлен {src.name}, "
                 f"теперь клипов {n + 1}")
        return self.ai_scenes()

    def ai_scene_extend(self, scene: str, prompt: str, ratio: str = "9:16"):
        """Продолжить сцену с последнего кадра её последнего клипа."""
        d = self._scenes_dir() / Path(str(scene)).name
        clips = sorted(d.glob("*.mp4")) if d.is_dir() else []
        if not clips:
            self.log("[Сцена] Пустая сцена — сначала положи в неё клип",
                     "warn")
            return False
        return self.ai_extend(str(clips[-1]), prompt, ratio,
                              scene=d.name)

    def ai_scene_assemble(self, scene: str):
        """Склеить сцену в один файл — по порядку номеров."""
        d = self._scenes_dir() / Path(str(scene)).name
        clips = sorted(d.glob("*.mp4")) if d.is_dir() else []
        if len(clips) < 1:
            self.log("[Сцена] Нечего склеивать", "warn")
            return False

        def job():
            lst = d / "list.txt"
            lst.write_text("".join(f"file {chr(39)}{c.as_posix()}{chr(39)}"
                                   + chr(10) for c in clips),
                           encoding="utf-8")
            out = self.AI_DIR / f"scene_{d.name}.mp4"
            # Перекодируем, а не -c copy: клипы приходят из разных режимов
            # (batch-frame, image-to-video, продолжение) и у них расходятся
            # частота кадров и параметры потока — простая склейка давала
            # рассинхрон и обрыв на первом же стыке.
            r = core.run_tree(
                ["ffmpeg", "-y", "-loglevel", "error", "-f", "concat",
                 "-safe", "0", "-i", str(lst),
                 "-vf", "fps=30,setsar=1", "-c:v", "libx264",
                 "-preset", "veryfast", "-crf", "21",
                 "-pix_fmt", "yuv420p", str(out)], 900)
            if r.returncode:
                raise RuntimeError(f"склейка: {(r.stderr or '')[-200:]}")
            self.log(f"[Сцена] «{d.name}» склеена: {out.name}")

        self._bg(f"Сцена «{d.name}»", job)
        return True

    def ai_extend(self, video: str, prompt: str, ratio: str = "9:16",
                  scene: str = ""):
        """Продолжить готовый клип с его ПОСЛЕДНЕГО кадра.

        Так в Flow устроено Scene Extension, и именно это снимает потолок
        в восемь секунд: следующий клип начинается не с новой картинки, а
        с того самого кадра, которым кончился предыдущий. Стык поэтому не
        виден вовсе — там физически один и тот же кадр.
        """
        if self._demo_stop():
            return False
        src = Path(str(video))
        prompt = (prompt or "").strip()

        def job():
            import veo_client as veo
            key = (self._settings.get("veo_key", "")
                   or os.getenv("VEO_API_KEY", "")).strip()
            if not key:
                raise RuntimeError("Нет ключа VeoNonStop")
            if not src.exists():
                raise RuntimeError(f"Нет файла {src}")
            if not prompt:
                raise RuntimeError("Опиши, что происходит дальше")
            self.AI_DIR.mkdir(parents=True, exist_ok=True)
            tail = self.AI_DIR / f"{src.stem}_tail.jpg"
            # Последний кадр берём точным поиском от конца: -sseof надёжнее
            # вычитания из длительности, где ошибка в один кадр даёт чёрное.
            r = core.run_tree(
                ["ffmpeg", "-y", "-loglevel", "error", "-sseof", "-0.2",
                 "-i", str(src), "-frames:v", "1", "-q:v", "2", str(tail)],
                120)
            if not tail.exists() or tail.stat().st_size < 2000:
                raise RuntimeError(
                    f"Не вышло взять последний кадр из {src.name}: "
                    f"{(r.stderr or '')[-160:]}")
            self.log(f"[Продолжение] Последний кадр снят: {tail.name}")
            tid = veo.image_to_video(prompt, tail, aspect_ratio=ratio,
                                     api_key=key)
            self.log(f"[Продолжение] Задача {tid[:16]}, жду...")
            veo.wait_for_completion(tid, key, log=self.log)
            stamp = time.strftime("%Y%m%d-%H%M%S")
            if scene:
                sd = self._scenes_dir() / scene
                sd.mkdir(parents=True, exist_ok=True)
                n = len(list(sd.glob("*.mp4")))
                dst = sd / f"{n:03d}_{stamp}_extend.mp4"
            else:
                dst = self.AI_DIR / f"{stamp}_extend.mp4"
            veo.download_video(tid, dst, api_key=key)
            dst.with_suffix(".txt").write_text(
                f"продолжение {src.name} | {ratio}" + chr(10) + prompt,
                encoding="utf-8")
            self.log(f"[Продолжение] Готово: {dst.name}")

        self._bg("Продолжение клипа", job)
        return True

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
        # Настроение — В МЕТА-ФАЙЛ, а не только в лог. Его спрашивает фоновая
        # атмосфера (_do_ambience), и спрашивать заново нельзя: guess_music_mood
        # — это вызов модели, то есть лишние деньги и лишний шанс получить
        # ДРУГОЙ ответ. Разъедься эти два ответа, и ролик получил бы светлую
        # подложку с осыпающимся бетоном в фоне.
        self._write_meta(mood=mood)
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

    def _do_ambience(self, path: str = "", every: float = 22.0) -> bool:
        """Фоновая атмосфера в дорожку, которую возьмёт рендер.

        ОДНО место на кнопку и на автоцепочку — по той же причине, по какой
        одно место у музыки (_do_auto_music). Пока шаг жил только на кнопке,
        его не было НИ В ОДНОМ ночном ролике: автопилот кнопок не нажимает.

        Возвращает True, если дорожка действительно изменилась. False — это
        «сделать не вышло, но и не сломалось»: add_ambience глушит сбой ffmpeg
        внутри себя и отдаёт исходный файл, поэтому по исключению эту беду не
        поймать, а по размеру файла — можно.
        """
        # Через core.voice_track — тем же правилом, что раскадровка и рендер:
        # микс, оставшийся от прошлого ролика, здесь получил бы поверх чужой
        # начитки ещё и звуки быта.
        base = core.voice_track(self._project, self.log)
        if not base.exists():
            raise RuntimeError("Сначала озвучка (и по желанию музыка).")
        pal = (self._channel() or {}).get("palette", "")
        before = base.stat()
        # ОТПЕЧАТОК, как у озвучки (.voice_stamp). Атмосфера пишется ПОВЕРХ
        # той же дорожки, поэтому второй проход по тому же файлу кладёт второй
        # слой: вдвое больше звуков и +3 dB. Это не выдумка про запас — ночь
        # умеет возвращаться к брошенному ролику (night_plan.MAX_RESUME = 3
        # попытки), а когда музыка падает (пустая библиотека, нет ключа
        # Jamendo — падает детерминированно), базой обоих проходов остаётся
        # один и тот же voiceover.mp3.
        stamp_file = self._project / "audio" / ".ambience_stamp"

        def _fp(p: Path) -> str:
            st = p.stat()
            return f"{p.name}|{st.st_size}|{int(st.st_mtime)}"

        try:
            was = stamp_file.read_text(encoding="utf-8").strip()
        except OSError:
            was = ""
        # Вторая проверка — про МАСТЕР-НАЧИТКУ, и без неё дыра остаётся
        # открытой в самом вероятном сценарии: в первую ночь музыка не
        # собралась, слой лёг прямо в voiceover.mp3; во вторую сеть ожила,
        # add_music собрал микс ИЗ ЭТОГО ЖЕ файла — и слой в миксе уже есть,
        # хотя сам микс новый. Отпечаток мастера не изменился, значит и
        # доливать нечего.
        master = self._project / "audio" / "voiceover.mp3"
        if was and (was == _fp(base)
                    or (was.startswith("voiceover.mp3|") and master.exists()
                        and was == _fp(master))):
            self.log(f"[ASMR] В {base.name} атмосфера уже вплетена — "
                     "второго слоя не кладу")
            return True
        src = (path or "").strip()
        if src:
            pool = src                      # человек указал свою папку
        else:
            # Набор звуков — ПОД КАНАЛ И ПОД СОДЕРЖАНИЕ. Настроение берём то
            # же, что выбрала музыка (оно лежит в meta.json), а не считаем
            # своё: два независимых настроения означали бы ролик, у которого
            # подложка и фон спорят друг с другом.
            mood = self._read_meta().get("mood", "")
            pool = core.ambience_pool(pal, mood, seed_text=self._read("script.txt"))
            if not pool:
                raise RuntimeError(
                    "Библиотека звуков пуста (assets/sfx/ready). Наполни её: "
                    "python sfx_library.py --fetch, потом обработай — или "
                    "укажи свою папку со звуками быта в поле рядом с кнопкой.")
            from collections import Counter
            roles = Counter(p.name.split("_", 1)[0] for p in pool)
            self.log(f"[ASMR] Набор канала «{pal or 'нет'}» под настроение "
                     f"«{mood or 'не задано'}»: {len(pool)} звук(ов) — "
                     + ", ".join(f"{r}×{n}" for r, n in roles.most_common()))
        # Палитра канала — та же, что у монтажа: плотность и громкость быта
        # это такой же признак канала, как переходы.
        core.add_ambience(base, pool, self.log, every=float(every), palette=pal)
        after = base.stat()
        if (after.st_size, after.st_mtime) == (before.st_size, before.st_mtime):
            return False                    # ffmpeg не отработал, файл прежний
        try:
            stamp_file.write_text(_fp(base), encoding="utf-8")
        except OSError:
            pass      # отпечаток не записался — в худшем случае пропустим шаг
        return True

    def add_asmr(self, path: str, every: float):
        # Пустое поле больше не отказ: без папки берём библиотеку канала (ту
        # же, что и ночная цепочка), а вписанный путь по-прежнему главнее.
        self._bg("ASMR-звуки", lambda: self._do_ambience(path, float(every)))

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
                # Акцентный цвет канала — не только для обложек: им же
                # подсвечивается слово в караоке-субтитрах. До сих пор
                # render.py искал ключ, которого никто не писал, и брал
                # золотое умолчание на всех каналах разом.
                "accent_color": (ch or {}).get("accent", ""),
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
                #
                # Умолчания ниже теперь ПОВТОРЕНЫ галочками в index.html
                # (rBloom, rLeak, rSand стоят checked), а интерфейс шлёт эти
                # ключи обеими кнопками — см. app.fxParams(). Расходиться им
                # больше негде: «Рендер» слал явные false из снятых галочек и
                # гасил то, что «Собрать всё» включало умолчанием отсюда.
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
            # Отпечаток совпал — но это ещё не всё. Отпечаток пишется в
            # meta.json, а meta.json тоже переживает свой ролик в общей
            # папке канала. Вторая, независимая проверка — по ХВОСТУ:
            # расстановка обязана доходить примерно до конца речи. Чужой
            # файл выдаёт себя сразу: замер 2026-08-08 показал в
            # 46-минутном испанском ролике расстановку, кончающуюся на
            # 00:14:14 — ровно длина того ролика abyss, откуда она приехала.
            # Последние полчаса шли без единой плашки.
            rows = core.parse_srt(srt)
            конец = core.srt_to_seconds(rows[-1][1]) if rows else 0.0
            хвост = 0.0
            for line in old.splitlines():
                m = re.match(r"\s*(\d{2}):(\d{2}):(\d{2})\s*\|", line)
                if m:
                    h, mi, s = (int(x) for x in m.groups())
                    хвост = max(хвост, h * 3600 + mi * 60 + s)
            if конец > 60 and хвост < конец * 0.6:
                self.log(
                    f"[Оверлеи] Расстановка обрывается на {хвост/60:.1f} мин "
                    f"при речи до {конец/60:.1f} мин — это файл ОТ ДРУГОГО "
                    "ролика. Переставляю заново.", "warn")
            else:
                self.log("[Оверлеи] Расстановка в overlays.txt сделана под "
                         "эти же субтитры — оставляю как есть (ручные "
                         "правки целы)")
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
        # ЯЗЫК ПЛАШЕК — язык ролика, а не английский по умолчанию. Указания
        # языка у планировщика не было вовсе, и модель отвечала по-английски
        # на любой канал. Замер по выпущенному испанскому ролику 26.08:
        # 110 подписей из 136 английские при испанской озвучке и испанском
        # SEO, причём язык скакал внутри одного ролика.
        lang = ((ch or {}).get("lang")
                or self._read_meta().get("lang", "")).strip()
        text = overlays.suggest_overlays_auto(
            core.parse_srt(srt), manifest, self._project, self.log,
            min_gap=float(gap) if gap else 5.0,
            watermark=(ch or {}).get("watermark", ""),
            palette=palette, lang=lang)
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
        else:
            # Пустой ответ расстановки был ТИХИМ выходом: `if text.strip()`
            # без else, ни строки в журнале, ни записи в quality. И хуже
            # молчания — последствие: overlays.txt остаётся на диске
            # НЕТРОНУТЫМ, то есть с расстановкой прошлого ролика, которую
            # десятью строками выше сам же этот метод и опознал как чужую.
            # Рендер брал бы её как ни в чём не бывало: чужие тайм-коды,
            # чужой текст поверх этого видео.
            #
            # Поэтому чужой файл убираем: копия его уже лежит в
            # overlays_prev.txt (строкой выше), терять нечего, а ролик без
            # плашек честнее ролика с чужими.
            if old:
                try:
                    ov.unlink(missing_ok=True)
                except OSError:
                    pass
            self.log("[Оверлеи] Авто-расстановка вернула пусто — плашек в "
                     "ролике не будет"
                     + (". Чужую расстановку прошлого ролика убрал, копия "
                        "в overlays_prev.txt" if old else ""), "warn")
            quality.degraded(
                "Оверлеи", "в ролике нет ни одной плашки — ни заголовков "
                "сцен, ни счётчиков, ни всплывающих карточек",
                why="авто-расстановка не дала ни одной строки",
                hint="нажми «Оверлеи» на странице ролика или впиши их "
                     "руками в overlays.txt; чаще всего причина — квота "
                     "LLM, тогда достаточно перезапустить шаг",
                level="заметно")

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
        # Два выхода ниже молчали ПОЛНОСТЬЮ: строка «прошу Agnes подобрать»
        # стоит ниже них, поэтому при пустом ключе или пустой теме шаг не
        # оставлял в журнале ни следа. А последствие у него ровно то же, что
        # у неудачи самого Agnes (её gen_remotion_gemini уже пишет в
        # quality): Overlay.tsx — файл ОДИН на все каналы, и «остаюсь на
        # текущей палитре» означает плашки в цветах прошлого ролика, часто
        # чужого канала.
        agnes_key = self._settings.get("agnes_key", "") or os.getenv("AGNES_API_KEY", "")
        meta = self._read_meta()
        topic, tone = meta.get("topic", ""), meta.get("tone", "документальный")
        нечем = ("не задан ключ Agnes" if not agnes_key
                 else "в meta.json нет темы ролика" if not topic else "")
        if нечем:
            self.log(f"[Оверлеи] Палитру под тему не подбираю: {нечем} — "
                     "плашки останутся в цветах прошлого ролика", "warn")
            quality.degraded(
                "Оверлеи", "плашки в цветах прошлого ролика, а не под эту тему",
                why=нечем,
                hint=("впиши ключ Agnes в «Настройки API» — палитра оверлеев "
                      "подбирается только через него"
                      if not agnes_key else
                      "тема пишется в meta.json на шаге сценария; запусти "
                      "цепочку с начала или впиши тему на странице «Сценарий»"),
                level="заметно")
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
            # В quality пишет сама apply_theme_palette — но ТОЛЬКО когда
            # честно вернула «палитры нет». Вылет исключением (упал запрос,
            # не разобрался Overlay.tsx, нет самого модуля) шёл мимо неё и
            # оставался одной строкой warn: ролик выходил в цветах прошлого,
            # а итог прогона докладывал «собран без потерь качества».
            quality.degraded(
                "Оверлеи", "плашки в цветах прошлого ролика, а не под эту тему",
                why=f"подбор палитры сорвался: {e}",
                hint="проверь ключ Agnes в «Настройках API» и остаток квоты; "
                     "цвет — первое, по чему канал узнают",
                level="заметно")

    # ---------- демо-ограничения: ОДНО место на все пути ----------
    # Все три ограничения демо (потолок в три ролика, надпись на кадре,
    # счётчик) стояли ТОЛЬКО в цепочке _generate_job. Кнопка «Рендер» зовёт
    # render.render_project напрямую, а панель «ИИ-видео» — генератор Veo:
    # обе шли мимо demo целиком, и демоверсией можно было собирать сколько
    # угодно роликов без надписи. Для софта, который готовят к продаже, это
    # означало отсутствие демо-ограничения как такового.
    #
    # ЛОВИМ Exception, А НЕ ImportError. Раньше стояло `except ImportError`,
    # и это покрывало ровно один случай — «demo.py нет» (купленная копия).
    # Битый demo.json ("videos": [] вместо числа -> TypeError в int()) или
    # watermark не-строкой (AttributeError на .strip()) роняли рендер ровно
    # там, где комментарий обещал защиту, — то есть после часа уже сделанной
    # работы. Цена ошибки здесь измерена: прогон 2026-08-08 выбросил на
    # соседней строке готовые сценарий, озвучку, субтитры и раскадровку.
    def _demo_broken(self, шаг: str, e: BaseException) -> None:
        if isinstance(e, ImportError):
            return                    # купленной копии demo.py не положен
        self.log(f"[Демо] {шаг}: {e.__class__.__name__}: {e} — "
                 "ограничение не применено, сборка продолжается", "warn")

    def _demo_mod(self):
        """Модуль demo, если он есть и демо-режим включён. Иначе None."""
        try:
            import demo
            return demo if demo.включён() else None
        except Exception as e:                                # noqa: BLE001
            self._demo_broken("проверка режима", e)
            return None

    def _demo_stop(self) -> bool:
        """True — демо-лимит исчерпан, начинать сборку нельзя.

        Проверяется ДО работы, а не после: ролик считается часами, и
        сообщить об исчерпании в конце — значит потратить чужой вечер.
        """
        demo = self._demo_mod()
        if demo is None:
            return False
        try:
            можно, почему = demo.можно_ещё()
        except Exception as e:                                # noqa: BLE001
            self._demo_broken("проверка лимита", e)
            return False
        if not можно:
            self.log(f"[Демо] {почему}", "err")
            return True
        if почему:
            self.log(f"[Демо] {почему}")
        return False

    def _demo_opts(self, opts: dict) -> dict:
        """Надпись «ДЕМО» на кадр. Без неё ролик демоверсии публикуем."""
        demo = self._demo_mod()
        if demo is None:
            return opts
        try:
            return demo.применить(opts, self.log)
        except Exception as e:                                # noqa: BLE001
            self._demo_broken("надпись на кадре", e)
            return opts

    def _demo_done(self) -> None:
        """Засчитать СОБРАННЫЙ ролик: оборвавшийся прогон лимит не ест."""
        demo = self._demo_mod()
        if demo is None:
            return
        try:
            demo.засчитать(self.log)
        except Exception as e:                                # noqa: BLE001
            self._demo_broken("счётчик роликов", e)

    def render(self, p: dict):
        if self._reject_if_busy("Рендер"):
            return
        # Потолок демо — до сборки, ровно как в цепочке.
        if self._demo_stop():
            return
        opts = self._render_opts(p)
        opts["out_name"] = p.get("out_name", "")
        # Метаданные файла: заголовок и описание берём из уже готового SEO,
        # канал — из профиля. Без этого в папке лежат десятки одинаковых
        # output_final.mp4, различимых только путём.
        try:
            seo = self._read("seo.txt") or ""
            if seo.strip():
                # Служебные шапки пропускаем. seo.txt НАЧИНАЕТСЯ со строки
                # «TITLES:» (проверено в estoico-es и fisura-critica), и
                # прежнее lines[0] клало в заголовок файла ровно слово
                # «TITLES:», а в описание — список запасных заголовков
                # вместо описания. Тихо и в каждом ролике, собранном
                # кнопкой «Рендер».
                lines = [t for t in (x.strip() for x in seo.splitlines())
                         if t and not (t.endswith(":") and len(t) < 24)]
                if lines:
                    opts["meta_title"] = lines[0].lstrip("0123456789. )-–—•"
                                                        ).strip()[:200]
                    opts["meta_desc"] = "\n".join(lines[1:6])[:900]
            ch_now = self._channel()
            if ch_now:
                opts["meta_channel"] = ch_now.get("name") or ch_now.get("id", "")
        except Exception:
            # метаданные — украшение файла, ронять из-за них рендер нельзя
            pass
        self._settings["render_opts"] = opts
        self._save_settings_file()
        if (p.get("overlays") or "").strip():
            self.save_overlays(p["overlays"])
        # Список деградаций — про ЭТОТ рендер, а не про прошлую цепочку.
        # Без сброса записи копятся: quality.reset() стоял ТОЛЬКО в цепочке
        # и в автопилоте, поэтому ручной рендер печатал бы чужие беды.
        import quality
        quality.reset()

        def _render_then_check():
            # Надпись «ДЕМО» кладём НА ПАРАМЕТРЫ РЕНДЕРА, но не в
            # settings["render_opts"] выше: иначе она осела бы в настройках
            # и всплыла бы в купленной копии, где демо уже нет.
            render.render_project(self._project, self.log, self._progress,
                                  self._demo_opts(opts))
            # Засчитываем ТОЛЬКО дошедший до конца рендер: упавший не должен
            # съедать демо-лимит. И ТОЛЬКО ОДИН РАЗ НА ПРОЕКТ: демо считает
            # ролики, а не нажатия. Без отметки три пересборки одного и того
            # же ролика (обычное дело: поправил подписи — пересобрал)
            # исчерпывали бы всю демо-раздачу, хотя ролик человек получил
            # один. Отметка лежит рядом с роликом и переживает перезапуск.
            mark = self._project / ".demo_counted"
            if not mark.exists():
                self._demo_done()
                try:
                    mark.write_text("1", encoding="utf-8")
                except OSError:
                    pass       # не смогли отметить — хуже пересчёт, чем сбой
            self._warn_missing_publish()
            # Сводку печатаем и здесь. Раньше quality.report() звался только
            # внутри цепочки, и всё, что записали render.py (14 мест, среди
            # них «на диске кончилось место» уровня «критично») и проверка
            # публикации выше, оставалось лежать непрочитанным: ролик,
            # доделанный кнопками после обрыва цепочки, отчёта не получал
            # вовсе.
            # Пустой отчёт — это НЕ повод молчать: тишину не отличить от
            # того, что проверка не сработала (так же рассуждает quality).
            lines = quality.report().splitlines()
            if not lines:
                self.log("[Итог] Рендер прошёл без потерь", "ok")
            else:
                for ln in lines:
                    self.log("[Итог] " + ln, "warn")

        self._bg("Рендер", _render_then_check)

    def _warn_missing_publish(self) -> None:
        """После рендера сказать вслух, чего не хватает для публикации.

        Заголовок, описание, теги, главы и обложки делает ТОЛЬКО цепочка. При
        ручной работе по кнопкам этих шагов нет, и ролик выходит готовым на
        вид: файл на месте, рендер зелёный. Разбор живого прогона 21.08:
        цепочка оборвалась вместе с перезапуском приложения, владелец доделал
        ролик кнопками, и у канала не оказалось seo.txt - ни заголовка, ни
        описания, ни глав. В журнале об этом не было ни строки.
        """
        import quality
        seo = (self._project / "seo.txt")
        thumbs = self._project / "thumbs"
        has_seo = seo.is_file() and seo.stat().st_size > 20
        has_thumb = thumbs.is_dir() and any(thumbs.glob("thumb*.jpg"))
        if has_seo and has_thumb:
            return
        missing = ([] if has_seo else ["заголовка, описания, тегов и глав"])             + ([] if has_thumb else ["обложек"])
        what = ", ".join(missing)
        self.log("[Публикация] Ролик готов, но не хватает " + what
                 + ". Это делает цепочка «Генерация видео»; при работе по "
                   "кнопкам шаги надо нажать отдельно.", "warn")
        quality.degraded(
            "Публикация", "не хватает " + what,
            why="ролик собран без цепочки — эти шаги в неё входят, а в "
                "отдельные кнопки рендера нет",
            hint="нажми «Заголовок и описание» и «Обложки» на странице "
                 "ролика ДО загрузки на YouTube",
            level="критично" if not has_thumb else "заметно")

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
        # КЛЮЧ БЕРЁМ ИЗ РОТАЦИИ, А НЕ ИЗ .env НАПРЯМУЮ. Здесь стояло
        # os.getenv("VEO_API_KEY") — то есть всегда ПЕРВЫЙ ключ, мимо
        # veo_key_now(). При двух ключах в .env (VEO_API_KEY2 — штатная
        # возможность) задача, поставленная вторым, отменялась первым: сервер
        # отвечал 4xx, и veo_client стирал запись из журнала как «задачи всё
        # равно нет». Задача при этом жива, держит слот и деньги, а отменить
        # её больше нечем. Теперь каждая задача гасится ключом, которым
        # поставлена (её отпечаток лежит в veo_tasks.json), а этот ключ —
        # запасной вариант для записей без отпечатка.
        veo_key = (core.veo_key_now()
                   or os.getenv("VEO_API_KEY", "")).strip()
        if veo_key:
            try:
                import veo_client
                veo_client.configure_task_store(self._project)
                n = veo_client.cancel_pending_tasks(api_key=veo_key)
                if n:
                    self.log(f"[Рендер] VeoNonStop: отменено {n} задач "
                             "только этого проекта (освобождены слоты)", "warn")
            except Exception as e:                            # noqa: BLE001
                # Молчать здесь нельзя: несостоявшаяся отмена означает, что
                # задачи Veo продолжают считаться и жечь оплаченные слоты, а
                # человек видит «остановлено».
                self.log(f"[Стоп] Отмена задач VeoNonStop не удалась "
                         f"({e.__class__.__name__}) — записи оставлены в "
                         "veo_tasks.json, повтори «Стоп» через минуту", "warn")

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
        # ПОВТОРЫ МЕЖДУ СОСЕДЯМИ — отдельная проверка, и она не заменяется
        # той, что выше. Та судит каждый план по СВОЕЙ фразе и оба
        # одинаковых пергамента пропускает как уместные. Владелец увидел
        # это в готовом ролике первым же взглядом: «одно изображение
        # повторяется».
        #
        # Стоит она столько же, сколько замена одного плана, поэтому
        # найденное сразу и переснимаем — иначе отчёт останется отчётом.
        twins = core.find_twin_shots(self._project, key, self.log)
        if twins:
            fixed += core.refix_storyboard(
                self._project,
                [{"i": t["i"],
                  # Подсказка генератору, чего НЕ надо: он ушёл от запроса
                  # именно сюда, и без запрета уйдёт туда же снова.
                  "better": (t["query"] or "")[:60]} for t in twins],
                self.log,
                self._settings.get("pexels_keys", ""),
                self._settings.get("pixabay_keys", ""),
                visual_style=style, prefer_ai=True)
        return fixed

    def check_shots(self):
        self._bg("Проверка кадров", lambda: self._check_and_fix_shots())

    def _do_thumbnails(self, count: int = 3) -> list[str]:
        """Обложки по сценарию: концепции -> AI-фон -> рендер -> проверка
        зрением на читаемость. Возвращает список путей к готовым JPG.

        Ничего не роняет — но и не молчит. Раньше «не роняет» означало
        `return []` на каждом отказе, и шаг заканчивался ничем БЕЗ единой
        записи в quality: цепочка ловит только исключение, а его не было.
        Замер по app.log: 2026-08-09 12:11:38 после «Не удалось придумать
        концепции» следующей строкой шёл «Шаг 4/4 — рендер…», в конце
        печаталось «Ролик собран без потерь качества», и в estoico-es/
        2026-08-09 лежит готовый ролик, у которого папки thumbs нет вовсе.
        Ролик без обложки выложить НЕЧЕМ — это не «меньше вариантов».

        Поэтому все отказы сходятся в одну точку внизу: сначала пробуем
        собрать простую обложку из кадра самого ролика (_cover_from_frame),
        и только если и это не вышло — говорим «критично»."""
        key = (self._settings.get("gemini_key", "")
               or self._settings.get("agnes_key", ""))
        # Канал целиком, а не «ещё один параметр»: язык обложки, формула
        # ниши, запреты и палитра решают, что на ней будет написано и как
        # это будет выглядеть. До сих пор сюда не доезжало НИЧЕГО из этого,
        # и три канала получали обложки одной формы (см. core.THUMB_STYLES).
        ch = self._channel() or {}
        out_dir = self._project / "thumbs"
        out_dir.mkdir(parents=True, exist_ok=True)
        # meta.json ролика заполняет мастер, и visual_style там есть не
        # всегда: в готовых папках всех трёх каналов лежит meta.json из двух
        # полей (channel, topic). Без отката к профилю канала фон обложки
        # генерировался общим «кинематографичным» стилем даже там, где у
        # канала прописан свой.
        style = (self._read_meta().get("visual_style")
                 or ch.get("visual_style", ""))
        made: list = []
        # Почему обложек не вышло — словами, для журнала и для quality.
        # Пустая строка в конце означает «всё в порядке».
        беда = ""
        text = self._read("script.txt")
        ideas: list = []
        if not text:
            беда = "в папке нет сценария, по которому их придумывают"
            self.log("[Обложка] Нет сценария — придумать концепции не по "
                     "чему", "warn")
        else:
            ideas = core.gen_thumbnail_ideas(text, key, self.log, count,
                                             channel=ch)
            if not ideas:
                беда = "ИИ не отдал ни одной концепции обложки"
                self.log("[Обложка] Не удалось придумать концепции", "warn")
        # Сказать ЗАРАНЕЕ, что фонов не будет, а не выяснять это тремя
        # отказами подряд. Обложки при этом всё равно делаются — на тёмной
        # подложке: текст на плашке лучше, чем отсутствие обложки вовсе.
        if ideas:
            core.image_budget_check(len(ideas), "cover", self.log)
        оценок_нет = 0        # сколько обложек модель зрения не посмотрела
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
            # ВЫРЕЗАННЫЙ ПРЕДМЕТ поверх фона — вторая картинка на ту же
            # обложку. В образце владельца товар стоит именно так, отдельным
            # объектом с читаемой этикеткой.
            #
            # Три условия, и каждое стоит своих денег. Первое: предмет
            # положен только каналу, у которого он в parts (сейчас
            # home-vault) — см. core.THUMB_STYLES. Второе: фон уже есть,
            # ставить вырезку на тёмную подложку незачем, получится тот
            # самый «бюст на чёрной пустоте». Третье и главное: обложка с
            # предметом стоит ДВЕ картинки вместо одной, а их 500 в сутки,
            # поэтому спрашиваем бюджет с purpose="polish" — это единственная
            # ступень, которая отключается ПЕРВОЙ и не трогает резерв под
            # сами обложки (core.VEO_IMAGE_COVER_RESERVE). Не хватило —
            # обложка выходит как раньше, без предмета.
            obj = None
            if bg and idea.get("object_prompt"):
                ok, why = core.image_budget_check(1, "polish", self.log,
                                                  quiet=True)
                if not ok:
                    self.log(f"[Обложка] Предмет не заказываю: {why}")
                else:
                    try:
                        raw = core.gen_image(
                            core.cutout_prompt(idea["object_prompt"]),
                            out_dir / f".obj{i}.jpg", key, self.log,
                            # style канала здесь НЕ применяем: визуальный
                            # стиль канала — это про свет и плёнку сцены, а
                            # предмету нужен ровный хромакей, иначе вырезать
                            # будет нечего.
                            "", wait_on_limit=False, purpose="polish")
                        obj = core.chroma_cutout(
                            raw, out_dir / f".obj{i}.png", self.log)
                    except Exception as e:
                        self.log(f"[Обложка] Предмет не вышел ({e}) — "
                                 "обложка будет без него", "warn")
                        obj = None
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
                                          extra=idea, cutout=obj)
            except Exception as e:
                self.log(f"[Обложка] Рендер {i} не вышел: {e}", "warn")
                continue
            # ОЦЕНКА ПО УМЕНЬШЕННОЙ КОПИИ, а не по файлу 1280x720.
            #
            # Проверка тут стояла и раньше, но судила не то изображение. Она
            # ПРОСИЛА модель «представить 210 пикселей», отдавая ей полный
            # файл, — и представлять модель отказывалась: у испанского
            # ролика вердикт был 82/100, а живой замер в YouTube Studio по
            # тому же ролику — 1 100 показов, CTR 1.4 %, 15 просмотров при
            # рабочем удержании 6:50 из 22:39. Оценка, расходящаяся с
            # замером на порядок, ничего не измеряет.
            #
            # Тот же вывод замерен и раньше, на этом же канале: у estoico-es
            # (Кантор, 2026-08-08) YouTube дал 318 показов, кликнули 1.9 %,
            # а кликнувшие смотрели 10:19 из 45:55. Ролик держит, обложка не
            # зовёт — и оба раза герой на ней был мелким и в тени.
            #
            # Теперь картинка ДЕЙСТВИТЕЛЬНО уменьшается до ширины ленты, и
            # смотрит модель именно на неё. Мелкий текст там уже не «мелкий
            # текст», а серая полоса — то же, что видит зритель.
            #
            # Про свет НЕ спрашиваем. Тёмный кадр у harsh и contemplative —
            # не оплошность, а вывод из разбора каналов-образцов (см.
            # core.THUMB_STYLES), и переписывать его по одному замеру CTR
            # значило бы принять шум за правило. Спрашиваем про то, что от
            # стиля не зависит: РАЗЛИЧИМО ли главное при ширине 210px.
            # Имя временное и с точкой: после оценки обложки ПЕРЕСТАВЛЯЮТСЯ
            # (_rank_thumbnails), и файл «thumb2 в ленте», сделанный до
            # перестановки, показывал бы уже другую обложку. Копии для
            # человека собираются заново, из окончательного порядка.
            feed = None
            try:
                feed = core.feed_preview(dest, out_dir / f".feed{i}.png")
            except Exception as e:
                self.log(f"[Обложка] Не смог уменьшить до ленты ({e}) — "
                         "сужу по полному размеру", "warn")
            score = 0
            try:
                verdict = core.vision_chat(
                    "This image is a YouTube thumbnail AT ITS REAL FEED "
                    f"SIZE — {core.FEED_W} pixels wide. It has not been "
                    "shrunk for your convenience: this is exactly the number "
                    "of pixels a viewer gets, scrolling past on a phone. "
                    "Judge what is actually legible HERE, not what you can "
                    "infer. Reply with ONLY "
                    'JSON: {"score":0-100,"headline_readable":true|false,'
                    '"subject_readable":true|false,'
                    '"problem":"<one short sentence>"}. '
                    "score is how likely a stranger scrolling past is to "
                    "stop on it. Set headline_readable=false if you cannot "
                    "read the words at this size without guessing. Set "
                    "subject_readable=false if the main subject — the "
                    "object, structure or place the cover is about — cannot "
                    "be made out here because it is too small, too far "
                    "away, or swallowed by shadow. A human figure you cannot "
                    "identify does NOT count as a readable subject: the "
                    "viewer does not know who it is. Do NOT penalise a dark "
                    "or moody image as such: judge only whether the thing "
                    "it is about comes across.",
                    (feed or dest).read_bytes(), key,
                    system="You are a YouTube thumbnail reviewer.")
                m = re.search(r"\{.*\}", verdict, re.S)
                if m:
                    data = json.loads(m.group(0))
                    score = int(data.get("score") or 0)
                    flaws = []
                    if not data.get("headline_readable", True):
                        flaws.append("не читается заголовок")
                    if not data.get("subject_readable", True):
                        flaws.append("не разглядеть объект")
                    if flaws or score < 50:
                        self.log(
                            f"[Обложка] {dest.name}: {score}/100 в ленте"
                            + (" — " + ", ".join(flaws) if flaws else "")
                            + (f"; {data.get('problem', '')}"
                               if data.get("problem") else ""), "warn")
                    else:
                        self.log(f"[Обложка] {dest.name}: {score}/100 в ленте")
            except Exception as e:
                # ОТКАЗ ЗРЕНИЯ — НЕ НОЛЬ БАЛЛОВ, а отсутствие оценки. Здесь
                # стоял голый `pass`: кончился ключ или квота — у ВСЕХ
                # обложек score=0, перестановка (_rank_thumbnails) теряет
                # смысл, а порядок выглядит отобранным. Считаем отказы и
                # говорим о них вслух — одной записью на весь шаг.
                оценок_нет += 1
                self.log(f"[Обложка] {dest.name}: оценить зрением не вышло "
                         f"({core._redact(e)}) — без оценки", "warn")
            # ЗАМЕР МАКЕТА ВАЖНЕЕ МНЕНИЯ. Модель зрения отвечает числом, и
            # число это она придумывает; высота букв в ленте — величина, а
            # не мнение. Если арифметика макета говорит, что строка выходит
            # мельче порога, обложка уезжает вниз списка независимо от того,
            # что о ней сказала модель.
            rep = (idea.get("feed") or {})
            if rep and not rep.get("ok", True):
                score = min(score, 40)
                self.log(f"[Обложка] {dest.name}: замер макета — "
                         + "; ".join(rep.get("problems", []))
                         + ". Оценка снижена до " + str(score), "warn")
            elif rep:
                self.log(f"[Обложка] {dest.name}: самое крупное слово в "
                         f"ленте {rep.get('biggest', 0):.0f} px "
                         f"(порог {core.FEED_MIN_FONT:.0f})")
            made.append((score, str(dest)))
        # Один раз на весь шаг, а не по разу на обложку: отказ зрения обычно
        # общий (кончился ключ, квота, сеть), и трёх одинаковых записей в
        # сводке качества не нужно.
        слепой = bool(made) and оценок_нет >= len(made)
        if оценок_нет:
            quality.degraded(
                "Обложка",
                ("ни одна обложка не проверена зрением — первой на YouTube "
                 "уходит просто первая по очереди генерации"
                 if слепой else
                 f"часть обложек ({оценок_нет} из {len(made)}) не проверена "
                 "зрением, и в сравнение они идут с нулём"),
                why="модель зрения не ответила: кончился ключ или его "
                    "суточная квота, либо не было сети",
                hint="проверь остаток квоты gemini_key/agnes_key и "
                     "пересобери обложки кнопкой «Обложки» — сам ролик "
                     "переделывать не нужно",
                level="заметно")
        if made:
            # ЗАПАСНОЙ ПУТЬ ВКЛЮЧАЕТСЯ ПО ГОДНОСТИ, а не по факту наличия
            # файла. Здесь стояла проверка только на пустой список, и чёрная
            # подложка с двумя словами считалась успехом: файл ведь есть.
            #
            # Замер по журналу 22.08: восемь обложек подряд — 15, 15, 20, 20,
            # 30, 35, 35, 35 из ста, у всех один диагноз «не разглядеть
            # объект». Фон не сгенерировался в 26 случаях из 153, и вместо
            # него бралась тёмная подложка. Софт сам ставил оценку и сам же
            # отправлял брак на канал.
            #
            # Кадр ролика заведомо лучше пустоты: в нём есть предмет, он уже
            # лежит в storyboard, и стоит один вызов ffmpeg.
            best = max((s for s, _ in made), default=0)
            made = self._rank_thumbnails(made, out_dir)
            if слепой:
                # НОЛЬ ОТ НЕПРОВЕРЕННОЙ ОБЛОЖКИ — НЕ ОЦЕНКА, а её отсутствие,
                # и подменять по нему нарисованную обложку кадром из ролика
                # нельзя: заменяли бы не брак, а неведение.
                self.log("[Обложка] Оценок нет ни у одной — порядок оставлен "
                         "как есть, кадром из ролика НЕ подменяю. Посмотри "
                         "обложки глазами перед выкладкой.", "warn")
            elif best < 50:
                self.log(f"[Обложка] Лучшая набрала {best}/100 — этого мало "
                         "для ленты. Беру кадр из самого ролика.", "warn")
                # пишет в thumb1.jpg, то есть в тот слот, что уходит на
                # YouTube; остальные остаются для сравнения
                self._cover_from_frame(
                    out_dir, ch, style,
                    f"лучшая нарисованная обложка набрала {best}/100")
            self._ab_pack(made, out_dir)
            self.log(f"[Обложка] Готово: {len(made)} шт. в {out_dir.name}\\")
        else:
            # Ни одной обложки. Дальше — единственная точка, где об этом
            # говорится вслух; раньше её не было вообще.
            if not беда:
                беда = (f"ни одна из {len(ideas)} концепций не дорисовалась"
                        if ideas else "рисовать было не из чего")
            made = self._cover_from_frame(out_dir, ch, style, беда)
        # Черновики за собой убираем. .bg*.jpg — сгенерированный фон, .obj*.jpg
        # и .obj*.png — предмет до и после вырезки; всё это уже запечено в
        # готовую обложку и больше никем не читается. Файлы скрытые (с точки),
        # поэтому в папке их не видно, и лежали они там с первого дня: у
        # каждого ролика по три-шесть штук. Ошибка на этом шаге ничего не
        # меняет — обложки уже сделаны.
        #
        # .feed*.png сюда же: их убирает _ab_pack, но только когда обложки
        # получились И раскладка втроём не упала раньше времени. Здесь уборка
        # стоит на выходе из шага, то есть срабатывает и когда обложек не
        # вышло вовсе.
        try:
            for f in out_dir.iterdir():
                if f.is_file() and f.name.startswith((".bg", ".obj", ".feed")):
                    f.unlink(missing_ok=True)
        except OSError:
            pass
        return made

    # Откуда брать фон запасной обложке. Порядок не случайный: в storyboard
    # лежат планы ЭТОГО ролика (то есть картинка будет про то же, о чём
    # ролик), в images — картинки для плашек, они тоже свои, но случайнее.
    _COVER_SRC = ("storyboard", "images")

    def _cover_from_frame(self, out_dir: Path, ch: dict, style: str,
                          беда: str) -> list:
        """Простая обложка из кадра самого ролика — когда придумать не вышло.

        ЗАЧЕМ ЧИНИТЬ, А НЕ ПРОСТО СООБЩИТЬ. Ролик без обложки выложить
        нечем: YouTube поставит случайный кадр из середины, а он в ленте не
        читается совсем. При этом всё нужное уже лежит на диске — кадры
        ролика в storyboard/ и заголовок в seo.txt, — и собрать из них
        обложку стоит одного вызова ffmpeg и нисколько денег. Замер по
        estoico-es/2026-08-09: 169 файлов в storyboard, готовый seo.txt,
        папки thumbs нет.

        Она заведомо хуже задуманной: заголовок ролика — это предложение,
        а на карточке шириной 210 px читаются 2-4 слова, и кадр выбран не
        под неё. Поэтому даже удачный запасной путь остаётся деградацией,
        просто «заметно», а не «критично».

        Возвращает список путей (пустой — не вышло ничего).
        """
        head = self._cover_headline(ch)
        bg = None
        for под in self._COVER_SRC:
            d = self._project / под
            if not d.is_dir():
                continue
            # По имени: планы называются beat_001…, и первый — открывающий
            # кадр ролика. Он и по смыслу ближе всего к теме.
            for f in sorted(d.iterdir()):
                if f.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp"):
                    bg = f
                    break
                if f.suffix.lower() in (".mp4", ".mov", ".webm", ".mkv"):
                    bg = core.still_frame(f, out_dir / ".bgfallback.jpg")
                    if bg:
                        break
            if bg:
                break
        dest = out_dir / "thumb1.jpg"
        try:
            if not head:
                raise RuntimeError("не нашёл ни заголовка, ни темы ролика")
            overlays.render_thumbnail(
                head, dest, bg, "left", ch.get("accent") or "#f5c451",
                log=self.log, style=ch.get("palette", ""),
                extra={"focusX": 0.5, "focusY": 0.45})
        except Exception as e:
            self.log(f"[Обложка] Обложек нет вовсе: {беда}; запасную из "
                     f"кадра тоже не собрал ({e})", "err")
            quality.degraded(
                "Публикация", "обложек для YouTube нет ни одной",
                why=f"{беда}; запасная обложка из кадра тоже не собралась: {e}",
                hint="ролик в таком виде выложить нечем — YouTube подставит "
                     "случайный кадр. Нажми «Обложки» на странице ролика "
                     "или положи в thumbs/ картинку 1280x720 руками",
                level="критично")
            return []
        self.log(f"[Обложка] {беда} — собрал запасную из кадра ролика "
                 f"({Path(bg).name if bg else 'без фона, на тёмной подложке'})"
                 f": {dest.name}", "warn")
        quality.degraded(
            "Публикация", "обложка собрана запасным путём — из кадра ролика, "
            "а не придумана под тему",
            why=беда,
            hint="выложить уже можно, но такая обложка не зовёт: заголовок "
                 "на ней — из seo.txt, а он длиннее, чем читается в ленте. "
                 "Прогони «Обложки» отдельной кнопкой, когда вернётся ИИ",
            level="заметно")
        return [str(dest)]

    def _cover_headline(self, ch: dict) -> str:
        """Текст на запасную обложку: из seo.txt, иначе из темы ролика.

        seo.txt начинается со списка вариантов под шапкой «TITLES:» —
        берём первый НЕ служебный: шапка сама по себе («TITLES:») уехала бы
        на обложку словом TITLES, и это выглядело бы как поломка, а не как
        запасной путь.
        """
        head = ""
        for line in (self._read("seo.txt") or "").splitlines():
            s = line.strip()
            # служебная шапка: короткая строка, кончающаяся двоеточием
            if not s or (s.endswith(":") and len(s) < 24):
                continue
            head = s.lstrip("-–—•").strip()
            break
        head = head or (self._read_meta().get("topic") or "").strip()
        if not head:
            return ""
        # Переразбить по ширине колонки канала — та же функция, что и у
        # обычных обложек; без неё строка ушла бы за край кадра.
        try:
            return core.fit_headline(head, ch.get("palette", ""), "left")
        except Exception:                                   # noqa: BLE001
            return head[:40]

    def _ab_pack(self, paths: list[str], out_dir: Path) -> None:
        """Сложить ВСЕ обложки для загрузки втроём и показать их в ленте.

        Конвейер делал три концепции и оставлял одну «лучшую» по своей
        оценке — то есть выбрасывал две трети работы по суждению, которое на
        живом замере ошиблось на порядок (82/100 при CTR 1.4 %). В YouTube
        Studio есть встроенное сравнение трёх обложек, и оно меряет CTR на
        НАСТОЯЩИХ показах. Спорить с ним внутренней оценкой не за чем:
        оценка нужна, чтобы выбрать, что вообще загружать, а решает замер.

        Ничего не роняет: не вышло сложить — обложки всё равно лежат в
        thumbs/, просто без подсказки."""
        try:
            ab = out_dir / "для_сравнения"
            ab.mkdir(parents=True, exist_ok=True)
            # Убираем ТОЛЬКО то, что кладёт сюда эта же функция, и только
            # лишнее: в прошлый раз обложек могло быть три, а в этот две, и
            # оставшаяся C.jpg — обложка ЧУЖОГО ролика, загруженная в
            # сравнение вместе с нашими. Именно эта беда уже описана в
            # _warn_stale. Чужие файлы, если человек что-то сюда положил,
            # не трогаем: удалять в папке канала не наше дело.
            for n in range(len(paths), 26):
                for name in (f"{chr(65 + n)}.jpg", f"{chr(65 + n)}_в_ленте.png"):
                    (ab / name).unlink(missing_ok=True)
            names = []
            for n, src in enumerate(paths):
                dst = ab / f"{chr(65 + n)}.jpg"
                shutil.copyfile(src, dst)
                names.append(dst.name)
                try:
                    core.feed_preview(dst, ab / f"{chr(65 + n)}_в_ленте.png")
                except Exception:
                    pass    # полоса ниже показывает то же самое
            for tmp in out_dir.glob(".feed*.png"):
                tmp.unlink(missing_ok=True)   # черновики оценки, см. выше
            strip = ""
            try:
                strip = str(core.feed_strip(
                    [Path(p) for p in paths], ab / "как_в_ленте.png").name)
            except Exception as e:
                self.log(f"[Обложка] Полоса «как в ленте» не вышла ({e})")
            (ab / "ЧТО_С_ЭТИМ_ДЕЛАТЬ.txt").write_text(
                "Загрузить в YouTube Studio ВСЕ ТРИ, а не одну.\n\n"
                "Ролик -> Сведения -> Значок -> «Тест и сравнение»\n"
                "(Test & compare). Туда кладутся " + str(len(names))
                + " файла: " + ", ".join(names) + ".\n\n"
                "Зачем: YouTube сам покажет их живой аудитории и померит\n"
                "CTR каждой. Это единственная честная оценка обложки.\n"
                "Внутренняя оценка софта на прошлом ролике поставила\n"
                "82 из 100 обложке, которая собрала 1,4 % CTR на 1 100\n"
                "показах — выбирать одну по ней нельзя.\n\n"
                + ("Файл «" + strip + "» — все три рядом в том размере,\n"
                   "в каком их видно в ленте (210 px). Смотреть надо\n"
                   "именно его, а не картинки в полный рост.\n"
                   if strip else ""),
                encoding="utf-8")
            self.log(f"[Обложка] Для сравнения в YouTube Studio: "
                     f"{out_dir.name}\\{ab.name}\\ — загрузи ВСЕ "
                     f"{len(names)} ({', '.join(names)}) через «Тест и "
                     "сравнение». Живой CTR честнее внутренней оценки.")
        except Exception as e:
            self.log(f"[Обложка] Пачку для сравнения не собрал ({e}) — "
                     "обложки лежат в thumbs/ как обычно", "warn")

    def _rank_thumbnails(self, scored: list[tuple[int, str]],
                         out_dir: Path) -> list[str]:
        """Переставить обложки так, чтобы лучшая стала thumb1.jpg.

        На YouTube автозагрузка ставит первую, а порядок до сих пор задавала
        очередь генерации — то есть случайность. Оценка зрением при этом уже
        считалась и выбрасывалась. Здесь она наконец решает.

        Порядок — это ВСЁ, что решает оценка. Остальные две обложки не
        выбрасываются: они уходят в thumbs/для_сравнения/ (см. _ab_pack),
        потому что настоящий выбор делает встроенное сравнение YouTube
        Studio на живых показах, а не эта оценка.

        Если оценок нет вовсе (модель зрения недоступна, ключ кончился),
        порядок остаётся прежним: тасовать вслепую хуже, чем не тасовать.
        """
        paths = [p for _, p in scored]
        if not any(s for s, _ in scored):
            return paths
        best = sorted(scored, key=lambda x: -x[0])
        if [p for _, p in best] == paths:
            self.log("[Обложка] Лучшая и так первая — порядок не меняю")
            return paths
        # Через временные имена: прямое переименование затирает соседа.
        tmp = []
        for n, (_, src) in enumerate(best, 1):
            t = out_dir / f".rank{n}.jpg"
            Path(src).replace(t)
            tmp.append(t)
        out = []
        for n, t in enumerate(tmp, 1):
            final = out_dir / f"thumb{n}.jpg"
            t.replace(final)
            out.append(str(final))
        self.log(f"[Обложка] Лучшая ({best[0][0]}/100) поставлена первой — "
                 "с неё ролик уходит на YouTube; остальные не выбрасываются, "
                 "их надо загрузить в «Тест и сравнение»")
        return out

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
    def _sync_beat_to_intensity(self, beat: float, intensity: str,
                                palette: str = "",
                                resolution: str = "") -> float:
        """Раскадровка качает по одному материалу на `beat` секунд, а рендер
        режет кадры по своей интенсивности (напр. «документальная 5с» —
        смена каждые ~5с) — если интенсивность режет чаще, чем раскадровка
        качает, несколько сцен подряд достаются одному и тому же файлу, и он
        неизбежно повторяется по всему ролику (в 5-минутном тесте: 127 смен
        кадра на 51 уникальный кадр из-за такого рассинхрона). Подгоняем
        beat под среднюю длительность плана интенсивности, если он крупнее —
        собственный (меньший) выбор пользователя не трогаем.

        ПАЛИТРА КАНАЛА ВАЖНЕЕ И ЧИСЛА ИЗ ОКНА, И ВЫПАДАЮЩЕГО СПИСКА. Длина
        плана — такой же постоянный признак канала, как палитра переходов,
        звук и плотность плашек, и заводится она там же (core.BEAT_SECS).
        Здесь НЕ берётся min() с пользовательским числом, и это осознанно:
        у созерцательного канала план ДЛИННЕЕ умолчательных шести секунд
        (9 c из замера), и min() тихо вернул бы шесть — то есть настройка
        канала не доехала бы ни разу, ровно как это уже было с шириной
        строки субтитров.
        """
        # У ВЕРТИКАЛИ темп задаёт формат, а не палитра: шорт с палитрой
        # «warm» наследовал 4 c на план и выходил нарезанным как
        # документалка (замер shorts_proba 14.08 — план 3.8 c при полутора
        # у образцов). Поэтому вертикаль отвечает первой и безусловно.
        pal_beat, _ = core.beat_of(palette, resolution)
        import render as _r
        if resolution and _r.is_vertical(resolution):
            return pal_beat
        if (palette or "").strip().lower() in core.BEAT_SECS:
            return pal_beat
        cfg = render.cuts_of(palette, intensity)
        if not cfg:
            return beat
        avg = (cfg["short_prob"] * sum(cfg["short"]) / 2
              + (1 - cfg["short_prob"]) * sum(cfg["long"]) / 2)
        return min(beat, avg)

    def _own_brief(self, ch: dict) -> str:
        """Как зашли СВОИ ролики — из YouTube Analytics.

        Разбор ниши (_niche_brief) смотрит на ЧУЖИЕ каналы: он говорит,
        что работает в нише вообще. О том, что работает у ЭТОГО канала,
        софт не знал ничего — и подбирал темы, ни разу не взглянув на
        собственные результаты.

        Замерено на abyss: «The Chilling Mystery of This Reddit Account» —
        126 просмотров и досмотр 32.3%, а соседний «Cannibal Stories» — 7
        просмотров и 2.3%. Разница в восемнадцать раз на одном канале, и
        до сих пор она никак не влияла на выбор следующей темы.

        Тихо возвращает пустое, если доступа нет или роликов ещё нет: без
        своей статистики ролик сделать можно, а падать на этом нельзя.
        """
        try:
            import yt_stats
            cid = ch.get("id") or ""
            ok, _ = yt_stats.ready(cid)
            if not ok:
                return ""
            rows = yt_stats.overview(log=lambda *a: None, channel=cid)
            # Ролики до смены ниши отсекаем ДО сравнения. Иначе лучший из
            # них становится «образцом успеха» и тянет канал обратно —
            # ровно это и происходило на abyss: страшилка про сетевой
            # аккаунт с досмотром 32% подсовывалась каналу про техногенные
            # катастрофы как то, что надо повторить.
            vids = yt_stats.since_filter(
                yt_stats.my_videos(limit=50, log=lambda *a: None,
                                   channel=cid),
                ch.get("stats_from", ""))
            names = {v["id"]: v["title"] for v in vids}
            rows = [r for r in rows if r.get("video") in names]
            if len(rows) < 2:
                return ""          # на одном ролике сравнивать не с чем
        except Exception as e:
            self.log(f"[Своя статистика] Не вышло ({e}) — тема подбирается "
                     "только по чужой нише", "warn")
            return ""
        # Порог просмотров, а не просто «просмотры есть». Досмотр ролика,
        # который посмотрели один раз, — это поведение ОДНОГО человека, и
        # ставить его рядом с роликом на два десятка зрителей как «лучший»
        # против «худшего» значит учить сценариста случайности. Живой
        # случай (abyss, 2026-08-08): после отсечения старой ниши остались
        # три ролика по 1-3 просмотра, и модель получала «лучший досмотр
        # 8%, худший 3%» как урок. Разница между 8% и 3% при одном зрителе
        # не значит ничего.
        MIN_VIEWS = 10
        rows = [r for r in rows if (r.get("views") or 0) >= MIN_VIEWS]
        if len(rows) < 2:
            self.log("[Своя статистика] Роликов, набравших хотя бы "
                     f"{MIN_VIEWS} просмотров, меньше двух — тема "
                     "подбирается по нише, свои цифры пока шум")
            return ""
        rows.sort(key=lambda r: -(r.get("averageViewPercentage") or 0))
        def _line(r):
            return (f"  {names.get(r.get('video',''), '?')[:70]} — "
                    f"{r.get('views',0)} views, "
                    f"{r.get('averageViewPercentage',0):.0f}% watched")
        # Списки не должны пересекаться: при двух роликах «лучшие» и
        # «худшие» брали ОДИН И ТОТ ЖЕ, и модель получала его как пример и
        # успеха, и провала разом. Делим ровно пополам, а на совсем малом
        # числе оставляем один сверху и один снизу.
        half = max(1, min(3, len(rows) // 2))
        best, worst = rows[:half], rows[len(rows) - half:]
        self.log(f"[Своя статистика] {len(rows)} роликов с цифрами; лучший "
                 f"досмотр {rows[0].get('averageViewPercentage',0):.0f}%, "
                 f"худший {rows[-1].get('averageViewPercentage',0):.0f}% — "
                 "тема учитывает и их")
        return ("\n\nTHIS CHANNEL'S OWN RESULTS — these are YOUR videos, not "
                "the reference channel's. They outrank niche averages "
                "wherever the two disagree.\n"
                "WATCHED LONGEST:\n" + "\n".join(_line(r) for r in best) +
                "\nABANDONED FASTEST:\n" + "\n".join(_line(r) for r in worst) +
                "\nWork out what the top ones promised that the bottom ones "
                "did not, and carry that difference into the new topic. Never "
                "repeat a subject already listed above.")

    def _retention_brief(self, ch: dict) -> str:
        """Указание сценаристу, построенное на ИЗМЕРЕННОМ обвале удержания.

        ЧЕМ ЭТО ОТЛИЧАЕТСЯ ОТ _own_brief. Тот берёт средний досмотр и
        правит ВЫБОР ТЕМЫ. Но средний досмотр — одно число, и оно не
        различает «ушли на шестой секунде» и «досмотрели треть и устали».
        Замер 2026-08-07 показал первое: на всех трёх роликах, у которых
        хватило просмотров на кривую, обвал пришёлся на первые 6-31
        секунду и уносил 25-31% зрителей разом; к 37-й секунде оставалась
        половина. Значит тема выбрана не так уж плохо — её просто не
        успевают услышать. Менять надо ПЕРВЫЕ ФРАЗЫ, а темой тут не
        поможешь, и _own_brief в это место не бьёт.

        Пустая строка, когда мерить не на чем. Указание, выведенное из
        трёх зрителей, вреднее отсутствия указания: сценарист примет шум
        за правило и будет переписывать открытие под случайность.
        """
        try:
            import yt_stats
            ok, why = yt_stats.ready(ch.get("id") or "")
            if not ok:
                # Тихо, но НЕ молча: без этой строки владелец не узнает,
                # почему у нового канала нет замера удержания.
                self.log(f"[Удержание] Пропускаю: {why}")
                return ""
            prof = yt_stats.drop_profile(log=lambda *a: None,
                                         channel=ch.get("id") or "",
                                         since=ch.get("stats_from", ""))
        except Exception as e:
            self.log(f"[Удержание] Не вышло ({e}) — открытие пишется по "
                     "общим правилам жанра", "warn")
            return ""
        if not prof or not prof.get("drop_sec"):
            return ""
        sec, size = prof["drop_sec"], prof["drop_size"]
        half = prof.get("half_sec")
        self.log(f"[Удержание] Замер по {prof['videos']} ролик(ам): обвал на "
                 f"{sec}-й секунде, минус {size}% зрителей"
                 + (f"; половина уходит к {half}-й" if half else "")
                 + " — открытие пишется под это")
        # Замер СОХРАНЯЕМ. До этого он жил одной строкой в журнале и
        # исчезал: на каждую сборку тратился настоящий запрос к YouTube
        # (кривая на каждый ролик), а сравнить сегодняшний обвал со
        # вчерашним было нечем — analytics/history.json стоял с 16
        # августа, потому что yt_history не звался из конвейера ни разу.
        # Именно по этим точкам и видно, помогают ли правки открытия.
        #
        # Сбой записи сборку не роняет: ролик собирается и без истории, а
        # вот молча падать на бухгалтерии нельзя. Причина уходит в
        # журнал — иначе через неделю история снова окажется пустой, и
        # никто не будет знать, почему.
        try:
            cid = (ch.get("id") or "").strip()
            if cid:
                import yt_history
                yt_history.record_retention(cid, prof, source="build",
                                            log=self.log)
            else:
                self.log("[Удержание] Замер есть, но у канала нет id — "
                         "в историю не кладу", "warn")
        except Exception as e:
            self.log(f"[Удержание] Замер сделан, но в историю не лёг ({e}) — "
                     "сборка идёт дальше, сравнить с прошлым разом будет "
                     "нечем", "warn")
        return (
            "\n\nMEASURED RETENTION ON THIS CHANNEL — not a guideline, a "
            f"measurement from {prof['videos']} of your own published "
            f"video(s).\n"
            f"Viewers leave in a cliff at second {sec}: {size}% of the "
            "audience is gone in that single moment."
            + (f" Half the audience is gone by second {half}." if half else "")
            + "\nThey are not leaving because the topic is wrong — they leave "
            "before the topic is even established. They leave because of what "
            f"the first {max(sec + 5, 20)} seconds sound like.\n"
            "Therefore:\n"
            # Потолок 8 секунд, а не «за пару секунд до обвала». При обвале
            # на 26-й секунде формула давала «успей до 24-й» — то есть
            # разрешала двадцать секунд раскачки, ровно ту раскачку, из-за
            # которой обвал и случается. Момент обвала говорит, ГДЕ рвётся,
            # но не даёт права тянуть до него.
            f"- The opening line must land BEFORE second "
            f"{min(max(sec - 2, 3), 8)}. No channel intro, no 'in this "
            "video', no throat-clearing, no restating the title.\n"
            "- Open on the most concrete, most specific thing in the whole "
            "story: a date, a number, a name, a physical detail. Not context, "
            "not a question to the viewer.\n"
            f"- At second {sec} something must CHANGE — a turn, a "
            "contradiction, a second voice, a jump in time. That is exactly "
            "where they are deciding to leave.\n"
            "- Do not summarise what is coming. A promise is a reason to "
            "leave and come back never.")

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
        свежий = False
        try:
            if cache.exists() and _t.time() - cache.stat().st_mtime < 86400:
                data = json.loads(cache.read_text(encoding="utf-8"))
            else:
                import yt_research
                data = yt_research.research(ref, log=lambda *_: None)
                свежий = True
        except Exception as e:
            self.log(f"[Ниша] Свежий разбор не вышел ({e}) — иду на "
                     "формуле из профиля", "warn")
            # Тема — САМЫЙ сильный рычаг ролика: на канале-образце разброс
            # между лучшим и худшим в тысячу раз. Без свежего разбора тема
            # берётся из формулы, вписанной в профиль когда-то руками, —
            # ровно то состояние «канал живёт по снимку ниши неизвестной
            # давности», ради выхода из которого этот шаг и заводили.
            # Молча возвращать пустое можно (падать тут нельзя), молчать —
            # нет: в журнале это одна строка среди тысячи.
            quality.degraded(
                "Тема", "тема выбрана по формуле из профиля канала, а не по "
                "свежему разбору ниши",
                why=f"разбор канала-образца не вышел: {e}",
                hint="проверь ключ YOUTUBE_API_KEY и остаток его квоты; "
                     "разбор кэшируется на сутки, так что достаточно одного "
                     "удачного захода",
                level="заметно")
            return ""
        med = data.get("median_views") or 0
        top = data.get("top") or []
        flop = data.get("flop") or []
        if not top or not flop:
            # МЯГКИЙ ОТКАЗ ГРОМЧЕ ЖЁСТКОГО. Разбор прошёл без исключения, но
            # сравнивать не с чем: у канала-образца слишком мало зрелых
            # роликов, чтобы отделить удачные от провальных. Раньше здесь
            # стоял голый `return ""` — ни строки в журнале, ни деградации,
            # и ролик собирался по формуле из профиля так, будто свежий
            # разбор состоялся.
            зрелых = data.get("mature")
            сколько = (f"зрелых роликов {зрелых}" if зрелых is not None
                       else f"роликов {data.get('videos', 0)}")
            self.log(f"[Ниша] Разбор {ref} пуст: топов {len(top)}, "
                     f"провалов {len(flop)} ({сколько}) — сравнивать не с "
                     "чем, иду на формуле из профиля", "warn")
            quality.degraded(
                "Тема", "тема выбрана по формуле из профиля канала, а не по "
                "свежему разбору ниши",
                why=f"разбор канала-образца {ref} вышел пустым: {сколько}, "
                    f"топов {len(top)}, провалов {len(flop)}",
                hint="укажи в профиле канала («reference») образец с "
                     "историей хотя бы в пару десятков роликов старше "
                     "месяца — на одном-двух сравнивать удачу с провалом "
                     "нечем",
                level="заметно")
            # И НЕ КЭШИРУЕМ. Пустой разбор, положенный в .niche_cache, жил
            # там сутки и все сутки молча отменял этот шаг; следующий заход
            # должен пробовать заново.
            return ""
        if свежий:
            # В кэш кладём только ГОДНЫЙ разбор — см. ветку выше.
            try:
                cache.parent.mkdir(parents=True, exist_ok=True)
                cache.write_text(json.dumps(data, ensure_ascii=False),
                                 encoding="utf-8")
            except OSError as e:
                self.log(f"[Ниша] Разбор не сохранился в кэш ({e}) — "
                         "следующий ролик пересчитает его заново", "warn")
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
            # И СВОИ результаты — они важнее чужой ниши там, где расходятся.
            own = self._own_brief(ch)
            if own:
                p["topic_formula"] = (p.get("topic_formula") or "") + own
            # Удержание правит НЕ тему, а первые фразы, поэтому кладётся в
            # script_extra, а не в topic_formula. И кладётся в p, а не в
            # ch: ch уходит в upsert после выбора темы, и указание,
            # дописанное в профиль, осело бы в channels.json навсегда и
            # росло бы с каждым роликом.
            hold = self._retention_brief(ch)
            if hold:
                p["script_extra"] = ((ch.get("script_extra") or "") + hold)
        # Демо-лимит проверяем ДО сборки, а не после: ролик считается
        # часами, и сообщить об исчерпании в конце — значит потратить
        # чужой вечер впустую. У купленной копии demo.json нет, и вся
        # ветка молчит.
        if self._demo_stop():
            return

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
        # ...И ЭТОГО БЫЛО МАЛО. Сравнение шло с файлом ТЕКУЩЕГО проекта, а
        # когда цепочка заводит НОВЫЙ (автопилот делает это каждую ночь),
        # файла там ещё нет: сравнение с пустотой давало «не равно», и текст
        # из окна — оставшийся от ПРОШЛОГО ролика, часто вообще другого
        # канала — ложился в свежую папку как «ручная правка». Дальше
        # авто-расстановка видела непустой файл и уже не трогала его.
        #
        # Цена измерена 2026-08-08: во всех восьми готовых проектах трёх
        # каналов лежал один и тот же overlays.txt (совпадение по md5) —
        # разбор аварии на заводе в Луизиане из abyss/2026-08-04. Испанский
        # ролик про Георга Кантора 46 минут показывал английские подписи
        # «DONALDSONVILLE :: DECEMBER 13 1994», «Vessel 83-D», «Louisiana
        # Plant»; ролик про герметик в ванной — их же. Файл кончался на
        # 00:14:14 (длина того, abyss'ного, ролика), поэтому последние
        # полчаса шли вообще без плашек. В папке estoico-es/2026-08-07
        # overlays.txt записан в 01:55:27, а script.txt — в 01:59:36: файл
        # появился РАНЬШЕ, чем у проекта был сценарий.
        #
        # Признак «текст из окна не про этот ролик» простой и надёжный: у
        # проекта ещё нет сценария. Не бывает ручной правки плашек к
        # ненаписанному ролику.
        if manual_ov and not (self._project / "script.txt").exists():
            self.log("[Оверлеи] В окне лежит расстановка от ПРОШЛОГО ролика, "
                     "а у этого ещё нет сценария — не переношу её в новую "
                     "папку. Плашки будут расставлены по своим субтитрам.",
                     "warn")
            manual_ov = False
        if manual_ov:
            self.save_overlays(ov_in)
        beat = self._sync_beat_to_intensity(float(p.get("beat", 6)),
                                            opts.get("intensity", "средняя"),
                                            opts.get("palette", ""),
                                            opts.get("resolution", ""))
        import render as _rr
        if _rr.is_vertical(opts.get("resolution", "")):
            self.log(f"[Раскадровка] Вертикаль: план {beat:g} c — темп задаёт "
                     "ФОРМАТ, а не палитра канала. У образцов Shorts план "
                     "1.1-1.5 c; при палитре «warm» шорт наследовал 4 c и "
                     "нарезался как документалка.")
        elif (opts.get("palette", "") or "").strip().lower() in core.BEAT_SECS:
            self.log(f"[Раскадровка] Длина плана {beat:g} c — из почерка "
                     f"канала «{opts.get('palette')}» (core.BEAT_SECS), а не "
                     f"из поля «{float(p.get('beat', 6)):g} c»: как часто "
                     "канал меняет картинку — его постоянный признак")

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
                # ОЧЕРЕДЬ ЗАГОТОВЛЕННЫХ ТЕМ идёт ПЕРЕД генерацией. Тема,
                # выбранная человеком заранее, всегда лучше выдуманной на
                # ходу: под неё уже нарисована обложка и проверено, что она
                # из ниши. Плюс это страховка от ночи 31.08, когда запрос
                # темы к модели завис и съел восемь часов.
                if not topic and ch:
                    queue = [t for t in (ch.get("topic_queue") or [])
                             if str(t).strip()]
                    if queue:
                        topic = str(queue[0]).strip()
                        ch["topic_queue"] = queue[1:]
                        self.log(f"[Тема] Из очереди канала: «{topic}» "
                                 f"(осталось в очереди: {len(queue) - 1})")
                        used = list(ch.get("used_topics") or [])
                        used.append(topic)
                        ch["used_topics"] = used[-60:]
                        channels_mod.upsert(ch)
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
                marks: list = []
                text = core.gen_script(
                    topic, mins, key, self.log, marks_out=marks,
                    tone=p.get("tone", "документальный"),
                    lang=p.get("lang", "английский"),
                    # p, а не ch: сюда уже подмешан замер удержания. Через
                    # ch читать нельзя — там только то, что вписал человек.
                    extra=(p.get("script_extra")
                           or (ch or {}).get("script_extra", "")),
                    # Темп речи канала — иначе заказ на 35 минут при
                    # темпе -15% давал ролик на 46: слова считались для
                    # начитки на нулевом темпе, а читал голос медленнее.
                    rate=_speech_rate(ch, p))
                self.save_script(text)
                # Границы глав в словах — единственный момент, когда они
                # вообще известны. В секунды их переведёт apply_chapters
                # после субтитров, по замеру.
                if marks:
                    (self._project / "chapters.json").write_text(
                        json.dumps(marks, ensure_ascii=False, indent=1),
                        encoding="utf-8")
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
                                    p.get("lang", "английский"),
                                    # Пунктуация: у документального канала с
                                    # длинными фразами без неё строка не
                                    # читается — предложения слипаются.
                                    keep_punct=bool(
                                        (ch or {}).get("sub_punct", True)))
            self._stop_check()
            # ФОРМАТ КАДРА — ДО раскадровки, а не после. Кадры заказываются
            # здесь, и вертикальный ролик обязан получить вертикальные
            # исходники: обрезать 16:9 до 9:16 нельзя — Veo ставит предмет
            # в середину широкого кадра, и от него остаётся полоса.
            core.VIDEO_ASPECT = render.aspect_of(
                opts.get("resolution", "1080p"))
            if core.VIDEO_ASPECT != "16:9":
                self.log(f"[Раскадровка] Формат кадра {core.VIDEO_ASPECT} — "
                         "кадры заказываются вертикальными")
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
                # Сцены — планы, нарисованные целиком вместо съёмки. Их
                # придумывает и пишет модель под ЭТОТ сценарий.
                # СХЕМ НА РОЛИК. Было 12, и до кадра доживало 4: приёмка
                # бракует две трети (замер 01.09 — 24 отказа из 32, причины
                # «движения почти нет», «кадр залит одним цветом»). При 141
                # плане в ролике четыре схемы — это 3%, и ролик выглядит
                # сплошным стоком.
                #
                # Образец @Extremwelt держит зрителя ровно этим: под каждую
                # мысль, которую съёмкой не показать, у него нарисованная
                # картинка — разрез, выноска, шкала. В проекте таких заготовок
                # 679 штук, и они простаивают.
                #
                # 30 заказанных при той же приёмке дадут около 10 принятых.
                # Плата — время: каждая схема это код от модели плюс рендер
                # плюс досмотр зрением, примерно полторы минуты.
                scenes=int(p.get("scenes", int(
                    os.getenv("SCENES_PER_VIDEO", "30")))))
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
            # ПЛАШКИ НЕ НУЖНЫ ТОМУ, КТО РЕЖЕТ САМ. Владелец: «перед рендером
            # не надо, потому что там будет и Remotion, а он мне не нужен —
            # мне нужны видео-стоки, ИИ-видео, субтитры, озвучка и сценарий».
            # Расстановка плашек и генерация их палитры — это 13.5% времени
            # сборки (20.0 мин из 148.7, замер 30.08), и всё это выброшено,
            # если монтаж идёт руками в Premiere.
            if p.get("no_render"):
                self.log("[Оверлеи] Пропускаю: собираю материал под ручной "
                         "монтаж, плашки в него не входят")
            else:
                if not manual_ov:
                    # моушн-графика сама; _auto_overlays сам решит, годится ли
                    # лежащий в папке файл для ЭТИХ субтитров
                    self._auto_overlays()
                self._regen_overlay_theme()   # палитра оверлеев под это видео
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
            # СРАЗУ ЗА МУЗЫКОЙ, и именно здесь по двум причинам. Первая:
            # настроение ролика определено шагом выше и лежит в meta.json —
            # спрашивать модель второй раз значит платить дважды и рисковать
            # другим ответом. Вторая: атмосфера пишется поверх той дорожки,
            # которую возьмёт рендер (core.voice_track), а музыка эту дорожку
            # как раз и создаёт — встань шаг раньше, и свежий микс затёр бы
            # его работу целиком.
            #
            # Шаг НЕ ФАТАЛЬНЫЙ, как соседние: без фона ролик собирается.
            if p.get("ambience", True):
                self.log("[Цепочка] Атмосфера — звуки быта под голос…")
                try:
                    if not self._do_ambience():
                        # add_ambience гасит сбой ffmpeg внутри себя и отдаёт
                        # исходный файл, поэтому «не получилось» приходит сюда
                        # не исключением, а неизменившейся дорожкой.
                        raise RuntimeError("ffmpeg не свёл слой (см. [ASMR] выше)")
                except Exception as e:
                    self.log(f"[Цепочка] Атмосфера пропущена: {e}", "warn")
                    # Не «критично» и не «заметно»: голос и музыка на месте,
                    # ролик слушается. Пропажу слышно только рядом с образцом
                    # ниши — но молчать всё равно нельзя, иначе разница «наш
                    # ролик звучит пустее» так и останется необъяснимой.
                    quality.degraded(
                        "Звук", "ролик идёт без фоновой атмосферы "
                        "(звуков быта под голосом)",
                        why=f"шаг атмосферы не отработал: {e}",
                        hint="проверь библиотеку assets/sfx/ready — она "
                             "наполняется через python sfx_library.py --fetch",
                        level="мелочь")
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
                    # ПОСЛЕ seo и ДО рендера: правит и тайм-коды в описании,
                    # и плашки в overlays.txt, а плашки должен успеть увидеть
                    # рендер. Времена, которые придумала модель, здесь
                    # заменяются на посчитанные по субтитрам.
                    core.apply_chapters(self._project, self.log)
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
                    # «Критично», а не «заметно»: без обложки ролик НЕ
                    # ВЫЛОЖИТЬ — YouTube подставит случайный кадр из
                    # середины. Уровень тут выбирается по тому, можно ли
                    # результатом пользоваться, а не по тому, насколько
                    # шумно упал шаг. Тем более что шаг сам себя чинит
                    # (_cover_from_frame), и раз уж он вылетел исключением —
                    # не сработала и починка.
                    quality.degraded(
                        "Публикация", "обложек для YouTube нет",
                        why=f"шаг обложек не отработал: {e}",
                        hint="нарисуй обложки кнопкой на странице ролика; в "
                             "папке thumbs/ сейчас лежат картинки прошлого "
                             "ролика — публиковать по ним нельзя",
                        level="критично")
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
            # ОСТАНОВКА ПЕРЕД РЕНДЕРОМ. Материал уже весь на диске: озвучка,
            # субтитры, клип под каждый план, таймлайн. Тому, кто режет сам,
            # финальная сборка не нужна — а стоит она дороже всего
            # остального (замер 30.08: финальный проход 38.8 мин из 148.7,
            # то есть 26%, плюс запекание плашек 20.0 мин).
            if p.get("no_render"):
                self.log("[Цепочка] Материал собран, рендер пропущен по "
                         "заказу — открой вкладку «Монтаж»", "ok")
                self._js("app.materialDone()")
                return
            self.log("[Цепочка] Шаг 4/4 — рендер…")
            # ОТДЕЛЬНОЕ ИМЯ, а не `opts = ...`. Присваивание внутри
            # вложенной функции делает переменную ЛОКАЛЬНОЙ для неё целиком
            # — Python решает это при компиляции, ещё до запуска, — и
            # чтение opts справа падало с UnboundLocalError. Причём падало
            # ВСЕГДА, даже когда демо-режим выключен и строка ничего бы не
            # изменила: местность переменной от исполнения не зависит.
            #
            # Цена ошибки измерена: прогон 2026-08-08 19:09 дошёл до шага
            # «рендер» — сценарий, озвучка, субтитры и раскадровка были
            # готовы, полчаса работы, — и всё выброшено на этой строке.
            render_opts = self._demo_opts(opts)
            render.render_project(self._project, self.log,
                                  self._progress, render_opts)
            # Засчитываем ТОЛЬКО собранный ролик: оборвавшийся прогон не
            # должен съедать демо-лимит.
            self._demo_done()
            # КОРОТКАЯ ВЕРСИЯ ДЛЯ ЛЕНТЫ SHORTS — сразу после ролика, без
            # отдельной кнопки. Владелец: «рядом с видео сделать отдельно
            # шортс, чтобы поднять актив в ютубе». Берётся начало готового
            # ролика: там крючок, там названа тема, там самая частая
            # нарезка (см. core.COLD_OPEN) — единственный кусок, который и
            # так писался как приманка.
            #
            # Шаг НЕ ФАТАЛЬНЫЙ: ролик уже собран, и падать на довеске
            # нельзя. Сбой пишем в журнал и идём дальше.
            if (ch or {}).get("make_short"):
                try:
                    import shorts
                    src = self._project / "output_final.mp4"
                    srt = self._project / "subs" / "voiceover.srt"
                    if src.exists():
                        shorts.make_short(
                            src, self._project / "short.mp4",
                            srt=srt if srt.exists() else None, log=self.log)
                    else:
                        self.log("[Шортс] Пропускаю: готового ролика нет",
                                 "warn")
                except Exception as e:
                    self.log(f"[Шортс] Не вышло ({e.__class__.__name__}: "
                             f"{str(e)[:120]}) — ролик это не портит", "warn")
            # ПРИЁМКА ГОТОВОГО ФАЙЛА. quality.py собирает то, о чём сообщили
            # сами стадии, — а поломки, на которые жаловался владелец
            # (замирания, розовый сдвиг, чёрная плашка, тайм-коды мимо
            # карточек), ни одна стадия не сообщала: каждая отработала
            # «успешно». Их видно только замером собранного mp4.
            #
            # Замер 11.08: четырнадцать таких поломок нашлись в уже
            # ОПУБЛИКОВАННЫХ роликах. Порядок был «машина собрала, человек
            # выложил, дефект нашёлся через неделю» — здесь он разворачивается.
            #
            # Шаг НЕ ФАТАЛЬНЫЙ и ничего не перерисовывает: ролик уже собран,
            # и правильное место чинить — своя стадия, а не поверх готового
            # файла. Задача приёмки — назвать числом, что не так.
            try:
                import priemka
                bad = priemka.check(self._project, self.log)
                for line in priemka.report(bad).splitlines():
                    self.log(line, "warn" if bad else "info")
                for b in bad:
                    quality.degraded("Приёмка", b["что"], why=b["где"],
                                     hint=b["делать"], level=b["уровень"])
            except Exception as e:
                self.log(f"[Приёмка] Проверить готовый файл не вышло: {e}", "warn")
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
        # Свой канал, а не выбранный в окне. Пустая строка при сборке ВСЕХ
        # каналов: там отказывать целиком нельзя — занятые отсеем ниже
        # поимённо, остальные должны пойти в работу.
        if self._reject_if_busy("Автопилот", str(p.get("channel") or "")):
            return
        # Ночь из командной строки интерфейс не открывает, значит
        # check_keys_startup не зовётся, и без этой строки некролог
        # прошлому оборванному прогону не прозвучал бы вовсе — ровно в том
        # сценарии, в котором прогоны и обрываются.
        self._report_dead_run()
        import night_plan as np
        # Выключенные каналы ночь не берёт; названный явно — берёт даже
        # выключенным, просьба человека весомее галочки в профиле.
        chans = channels_mod.active()
        want = str(p.get("channel") or "").strip().lower()
        if want:
            chans = [c for c in channels_mod.load()
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

        # Занятые снаружи каналы ВЫБРАСЫВАЕМ ИЗ СПИСКА, а не роняем весь
        # прогон: если einsturzpunkt уже собирается отдельным процессом, это
        # причина пропустить einsturzpunkt, а не повод не трогать остальные.
        занятые = self._channels_building_outside()
        if занятые:
            было = len(chans)
            chans = [c for c in chans if c.get("id") not in занятые]
            if len(chans) < было:
                self.log(f"[Автопилот] Пропускаю каналы, которые уже "
                         f"собираются отдельно: {', '.join(sorted(занятые))}",
                         "warn")
            if not chans:
                self.log("[Автопилот] Все каналы уже собираются — новых "
                         "запускать нечего", "warn")
                return

        per = max(1, int(p.get("videos", 1) or 1))
        base = dict(p)
        # Тема и сценарий у каждого канала СВОИ — берутся по его нише. Если
        # пустить сюда текст из поля сценария, ночь выдаст три копии одного
        # ролика под разными названиями. Чистим здесь, а не только в
        # интерфейсе: это свойство автопилота, а не поведение кнопки.
        base["script"] = ""
        base["topic"] = ""
        # СУБТИТРЫ НОЧЬЮ РЕШАЕТ ПРОФИЛЬ КАНАЛА, а не галочка на странице.
        # Ключ выбрасываем, и channels.apply_to_params видит «выбора не
        # делали» -> берёт subs_on канала (у всех сейчас true).
        #
        # Замер, из-за которого это появилось: с 07.08 по 12.08 галочка
        # «Вшить субтитры» стояла снятой в разметке (ui/index.html, правка
        # «временно, пока не нравится вид»), genParams() шлёт её состояние
        # в КАЖДЫЙ вызов — включая ночной. В app.log 20 прогонов подряд с
        # «Субтитры в кадр НЕ вжигаются (галочка снята)», и ни один готовый
        # ролик субтитров не получил, хотя в channels.json у всех каналов
        # subs_on: true. Ночь не должна зависеть от того, в каком положении
        # оставили переключатель днём: её никто не смотрит, а ошибку видно
        # только через сутки в собранном mp4.
        #
        # Ручной «Рендер» и ручная «Генерация» по-прежнему могут выключить
        # субтитры — там человек снимает галочку прямо сейчас и видит
        # результат сразу. Выключить их каналу насовсем — subs_on: false в
        # профиле, он и здесь сработает.
        base.pop("subs", None)
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
            # УБОРКА ПЕРЕД НОЧЬЮ — самая первая строка работы, до планов и
            # квот. Ночь на 2026-08-12 дала ноль роликов на четырёх каналах:
            # из 511 ГБ оставалось 11, потому что 55.5 ГБ занимали render_tmp
            # от прошлых ОБОРВАННЫХ сборок (уборка тогда шла только при
            # успехе). Здесь убирается ровно то, что софт пересчитает
            # бесплатно; кадры и готовые ролики уборка не трогает — если
            # места мало и после неё, она скажет об этом словами и предложит
            # команду, но решать будет человек.
            try:
                disk.before_night(self.log)
            except Exception as e:
                self.log(f"[Диск] Уборка перед ночью не отработала "
                         f"({e.__class__.__name__}: {e}) — иду дальше", "warn")
            quota = np.image_quota()
            self.log(core.image_quota_line(quota))
            plan = np.dry_run(chans, night_h, per, fit_only,
                              force_new=force_new,
                              images_left=(None if quota.get("unlimited")
                                           else quota.get("remaining")))
            # Запрет сна ставим ДО первого канала и снимаем в finally ниже.
            # Ночь 2026-08-09 умерла не от ошибки: журнал оборвался на 68-м
            # кадре из 134, а через три секунды Windows усыпил машину. Сторож
            # тишины спасти не мог — он живёт в этом же процессе и уснул
            # вместе с ним.
            np.keep_awake(self.log)
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
                # Ноль = без потолка (см. сторож в _autopilot_one).
                budget = (np.budget_for(ch, left_s, proj)
                          if core._env_switch("AUTOPILOT_BUDGET", False)
                          else 0.0)
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
                 + (f"потолок {budget / 3600:.1f} ч" if budget > 0
                    else "без потолка по времени — обрываю только по тишине "
                         f"в журнале ({np.STALL_S / 60:.0f} мин)"))
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
        # Сколько раз подряд сторож давит «Стоп», прежде чем замолчать.
        # Пять минут: если за это время шаг не свернулся, он и не свернётся,
        # а журнал не должен превращаться в 506 одинаковых строк (ночь 31.08).
        STOP_TRIES = 5
        nonlocal_tries = [0]

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
                    elif budget > 0 and over > budget:
                        # ПОТОЛОК ПО ВРЕМЕНИ ВЫКЛЮЧЕН ПО УМОЛЧАНИЮ (budget=0).
                        # Владелец: «если не успевает — убери». Ролик, который
                        # идёт дольше отведённого, обрывался на середине, и
                        # ночь тратилась впустую: сделанное сохранялось, но
                        # готового ролика не было. Замер 29.08: генерация сцен
                        # 61 мин, кадры 20 мин, проход по планам 37 мин — почти
                        # два часа на ролик, и это без Veo.
                        #
                        # Сторож ТИШИНЫ (STALL_S) остаётся и делает главное:
                        # ловит настоящие зависания. Долгая работа и зависание
                        # различаются пульсом журнала, а не общим временем.
                        # Вернуть потолок: AUTOPILOT_BUDGET=1 в .env.
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
                #
                # НО НЕ БЕСКОНЕЧНО. Замер ночи 31.08: шаг завис на канале
                # «Tiefenzeit» в 02:23, сторож сработал в 03:08 и дальше
                # 506 РАЗ ПОДРЯД, раз в минуту до 11:33, писал одну и ту же
                # строку «Останавливаю Автопилот». Восемь с половиной часов
                # журнала, забитого повтором, и ни одного ролика. Настоящая
                # причина была в llm_chat (см. core.LLM_TOTAL_DEADLINE), но
                # сторож обязан быть громким ровно один раз, а потом молчать:
                # иначе в журнале не найти ту единственную строку, которая
                # объясняет ночь.
                nonlocal_tries[0] += 1
                if nonlocal_tries[0] <= STOP_TRIES:
                    self.stop_render(by_user=False)
                elif nonlocal_tries[0] == STOP_TRIES + 1:
                    self._log_raw(
                        f"[Автопилот] «{nm}»: шаг не сворачивается уже "
                        f"{STOP_TRIES} мин после команды «Стоп» — жду его "
                        "завершения молча, дальше журнал по нему не пишу. "
                        "Причину смотри в строках выше этой.", "warn")
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
        # Снимаем запрет сна ОБЯЗАТЕЛЬНО и здесь, в единственном месте, куда
        # ночь приходит в любом исходе. Флаг ES_CONTINUOUS живёт до явной
        # отмены: не снять его — и ноутбук перестанет засыпать вообще, до
        # перезагрузки. Владелец бы не понял, почему машина не спит.
        np.allow_sleep(self._log_raw)
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

    # ---------- ключи: реестр, проверка, мастер первого запуска ----------

    @staticmethod
    def _key_hint(raw: str) -> str:
        """Подсказка «что тут вписано» БЕЗ выдачи самого ключа наружу.

        Отдавать значение целиком в интерфейс незачем: окно и так у хозяина
        ключа, а вот скриншот окна он пришлёт в поддержку не задумываясь.
        """
        raw = (raw or "").strip()
        if not raw:
            return ""
        first = raw.splitlines()[0].strip()
        extra = len([x for x in raw.splitlines() if x.strip()]) - 1
        tail = f" (+ ещё {extra})" if extra > 0 else ""
        if len(first) <= 8:
            return "•" * len(first) + tail
        return f"{first[:4]}…{first[-4:]}{tail}"

    def _key_value(self, key_id: str) -> str:
        """Значение ключа так, как его увидит конвейер: сперва то, что человек
        вписал в окне, потом .env. Порядок именно такой — вписанное руками
        должно побеждать, иначе правка в окне не даёт эффекта и выглядит
        сломанной кнопкой."""
        spec = next((s for s in core.KEY_SPECS if s["id"] == key_id), None)
        return (str(self._settings.get(key_id, "") or "").strip()
                or (os.getenv(spec["env"], "").strip() if spec else ""))

    # Ссылки открываем ТОЛЬКО из реестра, а не любой присланный адрес:
    # метод доступен странице, и «открой что дали» — это дыра, через которую
    # запускается что угодно. Список закрытый, проверяем по точному совпадению.
    def open_url(self, url: str):
        allowed = {s["where"] for s in core.KEY_SPECS}
        url = (url or "").strip()
        if url not in allowed:
            self._log_raw(f"[Ключи] Ссылка не из списка, не открываю: {url}", "warn")
            return False
        try:
            import webbrowser
            webbrowser.open(url)
            return True
        except Exception as e:
            self._log_raw(f"[Ключи] Не удалось открыть браузер: {e}", "warn")
            return False

    def keys_report(self):
        """Реестр ключей для мастера и «Настроек API»: что за ключ, обязателен
        ли, платный ли, где взять и вписан ли уже."""
        keys = []
        for s in core.KEY_SPECS:
            raw = self._key_value(s["id"])
            keys.append({**s, "filled": bool(raw), "hint": self._key_hint(raw)})
        missing = [s["title"] for s in core.KEY_SPECS
                   if s["role"] == "обязательный" and not self._key_value(s["id"])]
        return {"keys": keys, "missing": missing, "ready": not missing}

    def needs_setup(self) -> bool:
        """Показывать ли мастер первого запуска.

        Условие — отсутствие ОБЯЗАТЕЛЬНОГО ключа, а не «первый ли это запуск».
        Метка «уже показывали» врала бы дважды: после переустановки мастер не
        появился бы там, где он нужен, а человеку, который вписал ключи, — не
        мешал бы и без метки.
        """
        return any(not self._key_value(s["id"])
                   for s in core.KEY_SPECS if s["role"] == "обязательный")

    def key_probe(self, key_id: str, value: str = ""):
        """Живая проверка ОДНОГО ключа — по кнопке рядом с полем.

        Проверяем то, что человек видит в поле ПРЯМО СЕЙЧАС, ещё до сохранения:
        иначе «Проверить» отвечало бы про старый ключ, и опечатку в новом
        нашли бы только после «Сохранить».
        """
        val = (value or "").strip() or self._key_value(key_id)
        spec = next((s for s in core.KEY_SPECS if s["id"] == key_id), None)
        title = spec["title"] if spec else key_id
        state, why = core.probe_key(key_id, val)
        words = {
            "ok": ("ok", "ключ работает"),
            "пусто": ("dim", "не вписан"),
            "лимит": ("warn", "ключ живой, но дневная квота исчерпана"),
            "мёртв": ("err", "ключ не принят"),
            "не спросил": ("warn", "не удалось спросить (сеть или сервис)"),
        }
        cls, human = words.get(state, ("warn", state))
        self._log_raw(f"[Ключи] {title}: {human}" + (f" — {why}" if why else ""), cls)
        return {"state": state, "text": human, "why": why, "title": title}

    def keys_probe_all(self):
        """Проверить все вписанные ключи разом — кнопка в мастере и в
        настройках. Отдельным потоком: проб семь, каждая до 30 секунд, и
        держать на них окно нельзя."""
        def job():
            for s in core.KEY_SPECS:
                val = self._key_value(s["id"])
                if not val and s["role"] != "обязательный":
                    continue        # пустой необязательный — не повод для строки
                try:
                    self.key_probe(s["id"], val)
                except Exception as e:
                    self._log_raw(f"[Ключи] {s['title']}: проверка сорвалась — {e}",
                                  "warn")
        threading.Thread(target=job, daemon=True).start()
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
        # Заодно единственное место, где интерфейс сообщает о себе после
        # запуска, — сюда же вешаем некролог оборванному прогону, иначе он
        # ушёл бы в app.log мимо человека.
        self._report_dead_run()
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


def _sync_library_background():
    """Подтянуть свежие плашки и сцены, пока покупатель открывает окно.

    Молча: не обновилась библиотека — работаем на той, что есть. Ронять
    запуск из-за необязательного обновления нельзя.
    """
    def job():
        try:
            import license_client
            _changed, msg = license_client.sync_library()
            print(f"[Библиотека] {msg}", flush=True)
        except Exception as e:
            print(f"[Библиотека] обновление пропущено: {e}", flush=True)
    threading.Thread(target=job, daemon=True).start()


def main():
    # Демоверсия открывается БЕЗ ключа — иначе она бессмысленна: человек
    # должен увидеть работу до того, как заплатит. Ограничения демо стоят
    # в другом месте (demo.py: надпись на кадре и потолок в три ролика),
    # и этого достаточно, чтобы ею не пользовались вместо покупки.
    demo_mode = False
    try:
        import demo
        demo_mode = demo.включён()
    except Exception:
        pass

    if not demo_mode:
        import license_gate
        if not license_gate.ensure_licensed(f"{APP_TITLE} — активация"):
            return
        _sync_library_background()

    api = Api()

    # СВОЙ ЗНАЧОК В ПАНЕЛИ ЗАДАЧ, А НЕ ЗМЕЙКА PYTHON.
    #
    # Windows группирует окна по идентификатору приложения, и по умолчанию
    # им становится сам python.exe — поэтому в панели задач висел значок
    # интерпретатора, а рядом с ним встали бы все прочие питоновские окна.
    # Собственный идентификатор делает окно отдельным приложением, и тогда
    # система берёт значок отсюда, а не у интерпретатора.
    #
    # Обёрнуто в try: на не-Windows функции нет, и падать из-за косметики
    # запуск не должен.
    icon = BASE / "ui" / "icon" / "icon.ico"
    try:
        import ctypes
        ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID(
            "kontent.fabrika.app")
    except Exception:
        pass

    win = webview.create_window(
        APP_TITLE, url=str(BASE / "ui" / "index.html"), js_api=api,
        width=1280, height=840, min_size=(1080, 700),
        background_color="#f5f5f7")
    api._win = win
    # icon появился не во всех сборках pywebview — если параметра нет,
    # запускаемся как раньше, без значка, но запускаемся.
    try:
        webview.start(icon=str(icon)) if icon.exists() else webview.start()
    except TypeError:
        webview.start()


if __name__ == "__main__":
    main()
