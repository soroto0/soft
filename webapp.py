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
TONE_TO_MOOD = {
    "документальный": "calm",
    "истории/крайм": "dark",
    "образовательный": "calm",
    "топ-лист": "upbeat",
    "мотивация": "epic",
    "мистика/хоррор": "horror",
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
        self._worker = None      # поток текущей задачи, см. _stop_check
        self._win = None
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

    def _checks(self, d: Path) -> dict:
        def nonempty(p):
            return p.exists() and any(p.iterdir())
        return {
            "Сценарий": (d / "script.txt").exists(),
            "Озвучка": (d / "audio" / "voiceover.mp3").exists(),
            "Субтитры": (d / "subs" / "voiceover.srt").exists(),
            "Раскадровка": (d / "timeline.json").exists()
                           or nonempty(d / "video") or nonempty(d / "storyboard"),
            "Оверлеи": (d / "overlays.txt").exists(),
            "Рендер": (d / "output_final.mp4").exists(),
            "Premiere": (d / "sequence.xml").exists(),
        }

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
            for p in sorted(d.parent.iterdir()):
                if p.is_dir() and ((p / "script.txt").exists()
                                   or (p / "audio").exists()):
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
        d = channels_mod.projects_dir(ch)
        d.mkdir(parents=True, exist_ok=True)
        # внутри канала работаем в его папке; конкретный проект пользователь
        # выберет как обычно, но список уже не смешивает три канала
        self._project = d
        self._settings["last_project"] = str(d)
        self._save_settings_file()
        self._configure_veo_store()
        self.log(f"[Каналы] Канал «{ch['name']}» — язык {ch['lang']}, "
                 f"жанр «{ch['tone']}», стиль «{ch['visual_style']}»"
                 + (f", голос {ch['voice']}" if ch.get("voice") else ""))
        return self.get_state()

    def _channel(self) -> dict | None:
        return channels_mod.get(self._settings.get("current_channel", ""))

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
        d = self._project.parent / safe
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
        (self._project / "script.txt").write_text(text.strip(), encoding="utf-8")
        self.log(f"[Сценарий] Сохранён: {self._project / 'script.txt'}")

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
        if cues:
            (self._project / "cues.txt").write_text(
                "\n".join(cues), encoding="utf-8")
            self.log(f"[Озвучка] Вырезал {len(cues)} режиссёрских ремарок "
                     "— сохранил в cues.txt, вслух они не пойдут")
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
        if "Edge" in p.get("engine", "Edge"):
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
        mood = core.guess_music_mood(
            self._read("script.txt"), by_tone,
            self._settings.get("gemini_key", "") or self._settings.get("agnes_key", ""),
            self.log)
        if mood != by_tone:
            self.log(f"[Музыка] По сценарию настроение «{mood}» "
                     f"(по жанру было бы «{by_tone}»)")
        try:
            track = core.pick_music_by_mood(Path(lib), mood)
        except FileNotFoundError:
            jkey = self._jamendo_key()
            if not jkey:
                raise RuntimeError(
                    f"Нет треков настроения «{mood}» в библиотеке, и не "
                    "указан Jamendo API Key в Настройках, чтобы скачать "
                    "автоматически. Либо положи mp3 в "
                    f"{Path(lib) / mood} сам, либо укажи ключ.")
            self.log(f"[Музыка] Локально нет «{mood}» — качаю с Jamendo...")
            found = core.jamendo_search(mood, jkey, count=1)
            if not found:
                raise RuntimeError(
                    f"Jamendo не нашёл трек под «{mood}» с коммерческой "
                    "лицензией — попробуй позже или положи трек вручную.")
            track = core.jamendo_download(found[0], Path(lib) / mood, self.log)
        self.log(f"[Музыка] Жанр «{tone}» -> настроение «{mood}» -> "
                 f"{track.name}")
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
            base = self._project / "audio" / "voiceover_music.mp3"
            if not base.exists():
                base = self._project / "audio" / "voiceover.mp3"
            if not base.exists():
                raise RuntimeError("Сначала озвучка (и по желанию музыка).")
            if not (path or "").strip():
                raise RuntimeError("Укажи папку со звуками быта.")
            core.add_ambience(base, path.strip(), self.log, every=float(every))
        self._bg("ASMR-звуки", job)

    # ---------- субтитры / стоки / раскадровка ----------
    def subs(self, model: str, line_width: int = 42, lang: str = "английский"):
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
                "subs": bool(p.get("subs", True)),
                "sfx": bool(p.get("sfx", True)),
                "grain": bool(p.get("grain")),
                "vignette": bool(p.get("vignette")),
                "letterbox": bool(p.get("letterbox")),
                "vhs": bool(p.get("vhs")),
                "chromab": bool(p.get("chromab")),
                "chapters_grade": bool(p.get("chapters")),  # render.py читает chapters_grade
                "bloom": bool(p.get("bloom")),
                "light_leak": bool(p.get("light_leak")),
                "dust": bool(p.get("dust")),
                "sand": bool(p.get("sand")),
                "stars": bool(p.get("stars")),
                "embers": bool(p.get("embers")),
                "flicker": bool(p.get("flicker")),
                "draft": bool(p.get("draft"))}
        if p.get("randomize"):   # свой «почерк» на каждый проект
            st = core.project_style(self._project)
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
            self.log(f"[Разнообразие] Субтитры {subs_note}, монтаж "
                     f"«{opts['intensity']}», цветокор случайный, эффекты: "
                     f"{', '.join(fx) or 'нет'} (под этот проект)"
                     + (f"; из профиля канала не менялось: "
                        f"{', '.join(locked)}" if locked else ""))
        return opts

    def _auto_overlays(self):
        """Если overlays.txt пуст — авто-предложить моушн-графику по субтитрам,
        чтобы popup/счётчики/плашки появились в ролике сами."""
        ov = self._project / "overlays.txt"
        if ov.exists() and ov.read_text(encoding="utf-8").strip():
            return
        srt = self._project / "subs" / "voiceover.srt"
        if not srt.exists():
            return
        manifest = []
        mf = self._project / "manifest.json"
        if mf.exists():
            try:
                manifest = json.loads(mf.read_text(encoding="utf-8"))
            except Exception:
                pass
        # Постоянный бейдж канала на весь ролик. Функция это умела давно, но
        # параметр никто не передавал — код был мёртвым. Берём из профиля
        # канала, чтобы у каждого был свой знак присутствия автора.
        ch = self._channel()
        text = overlays.suggest_overlays_auto(
            core.parse_srt(srt), manifest, self._project, self.log,
            watermark=(ch or {}).get("watermark", ""))
        if text.strip():
            ov.write_text(text.strip() + "\n", encoding="utf-8")
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
        theme = (f"Documentary video about: {topic}. Tone/genre: {tone}. "
                "Invent a distinctive color palette that fits THIS specific "
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
        opts = self._render_opts(p)
        opts["out_name"] = p.get("out_name", "")
        self._settings["render_opts"] = opts
        self._save_settings_file()
        if (p.get("overlays") or "").strip():
            self.save_overlays(p["overlays"])
        self._bg("Рендер", lambda: render.render_project(
            self._project, self.log, self._progress, opts))

    def stop_render(self):
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
        """Один НОВЫЙ вариант оверлея под тему этого ролика — так библиотека
        растёт сама, от видео к видео, а не только когда её пополняют руками.

        Тип берём тот, у которого вариантов МЕНЬШЕ всего: иначе ИИ будет
        снова и снова обогащать banner, а popup/collage так и останутся с
        одним видом. Движки чередуем по чётности размера библиотеки.
        Любой провал молча пропускается — ролик от этого не зависит."""
        key = (self._settings.get("gemini_key", "")
               or self._settings.get("agnes_key", ""))
        if not key:
            return None
        meta = gen_remotion_gemini.load_variants_meta()
        kinds = list(gen_remotion_gemini.TYPE_BRIEF)
        ch0 = self._channel()
        # считаем покрытие ПО ЭТОМУ КАНАЛУ: у соседнего канала может быть
        # десяток вариантов popup, но этому от них ни холодно ни жарко —
        # он их не увидит, значит и добирать надо свои
        counts = {k: len(overlays.BASE_VARIANTS.get(k, ("classic",)))
                  + len(overlays._library_variants(k, None,
                                                   ch0["id"] if ch0 else ""))
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
        order = sorted(kinds, key=lambda k: (counts[k], k))
        kind = next(
            (k for k in order
             if not gen_remotion_gemini._fail_cooldown(k, engine_id,
                                                       lambda *_: None)),
            order[0])
        theme = core.gen_variant_theme(topic, kind, key, self.log)
        if not theme:
            return None
        ch = self._channel()
        cid = ch["id"] if ch else ""
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
        ideas = core.gen_thumbnail_ideas(text, key, self.log, count)
        if not ideas:
            self.log("[Обложка] Не удалось придумать концепции", "warn")
            return []
        out_dir = self._project / "thumbs"
        out_dir.mkdir(parents=True, exist_ok=True)
        style = self._read_meta().get("visual_style", "")
        made = []
        for i, idea in enumerate(ideas, 1):
            head = idea["headline"]
            self.log(f"[Обложка] {i}/{len(ideas)}: «{head.replace(chr(10), ' / ')}»")
            bg = None
            if idea.get("bg_prompt"):
                try:
                    bg = core.gen_image(idea["bg_prompt"],
                                        out_dir / f".bg{i}.jpg", key,
                                        self.log, style)
                except Exception as e:
                    self.log(f"[Обложка] Фон не сгенерировался ({e}) — "
                             "делаю на тёмной подложке", "warn")
            dest = out_dir / f"thumb{i}.jpg"
            try:
                overlays.render_thumbnail(head, dest, bg,
                                          idea.get("layout", "left"),
                                          log=self.log)
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
            formula=(ch or {}).get("topic_formula", ""))
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

    def generate_all(self, p: dict):
        # Профиль канала ЗАДАЁТ язык, жанр, голос и стиль — иначе достаточно
        # один раз забыть переключить выпадающий список, и ролик выйдет
        # чужим голосом на чужом языке. Проект запоминает свой канал, чтобы
        # библиотека оверлеев потом отфильтровалась по нему.
        ch = self._channel()
        if ch:
            p = channels_mod.apply_to_params(ch, p)
            self._write_meta(channel=ch["id"])
            if ch.get("watermark") and not (p.get("overlays") or "").strip():
                p["watermark"] = ch["watermark"]
            self.log(f"[Канал] «{ch['name']}»: {p.get('lang')}, "
                     f"«{p.get('tone')}»"
                     + (f", голос {p.get('voice')}" if ch.get("voice") else ""))
        opts = self._render_opts(p)
        if (p.get("overlays") or "").strip():
            self.save_overlays(p["overlays"])
        beat = self._sync_beat_to_intensity(float(p.get("beat", 6)),
                                            opts.get("intensity", "средняя"))

        def job():
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
            if not (p.get("script") or "").strip() and not self._read("script.txt"):
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
            core.transcribe_whisper(self._project / "audio" / "voiceover.mp3",
                                    p.get("whisper", "tiny.en"),
                                    self._project, self.log, 42,
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
                float(p.get("ai_ratio", 0.85)))
            self._stop_check()
            if p.get("check_shots", True):
                # ГЛАВНАЯ проверка качества: кадр не про то, что говорит
                # диктор — самый заметный признак сборки «на автомате».
                # Ловим ЗДЕСЬ, где замена стоит одну закачку, а не после
                # рендера, когда пересобирать часами.
                try:
                    self._check_and_fix_shots()
                except Exception as e:
                    self.log(f"[Цепочка] Проверка кадров пропущена: {e}", "warn")
            if not (p.get("overlays") or "").strip():
                self._auto_overlays()   # моушн-графика сама, если не задана
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
            if p.get("thumbs", True):
                self.log("[Цепочка] Обложки для YouTube…")
                try:
                    self._do_thumbnails(3)
                except Exception as e:
                    # обложки не должны рушить готовый ролик
                    self.log(f"[Цепочка] Обложки пропущены: {e}", "warn")
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
        self._bg("Генерация видео", job)

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
        return True


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
