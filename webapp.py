#!/usr/bin/env python3
"""
Контент-фабрика — новый интерфейс (HTML/CSS в окне pywebview).

Вся логика пайплайна остаётся в core.py / render.py / overlays.py —
этот файл только мост между веб-страницей ui/ и питоном.

Запуск:  python webapp.py        (старый tkinter-интерфейс: python app.py)
"""

import os
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

APP_TITLE = "Контент-фабрика"
APP_VERSION = "3.0"
BASE = Path(__file__).resolve().parent
SETTINGS_FILE = BASE / "settings.json"
LOG_FILE = BASE / "app.log"

STAGE_NAMES = ["Сценарий", "Озвучка", "Субтитры", "Раскадровка",
               "Оверлеи", "Рендер", "Premiere"]


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
        self._win = None
        core.CONSOLE = lambda m: self.log(m, "dim")
        render.CONSOLE = lambda m: self.log(m, "dim")

    # ---------- связь с JS ----------
    def _js(self, code: str):
        if self._win:
            try:
                self._win.evaluate_js(code)
            except Exception:
                pass

    def log(self, msg: str, cls: str = ""):
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

        def wrap():
            t0 = datetime.now()
            self._js(f"setStatus({json.dumps('⏳ ' + name + '…')})")
            self.log(f"▶ {name}: запущено")
            ok = True
            try:
                fn()
            except Exception as e:
                ok = False
                self.log(traceback.format_exc().rstrip(), "dim")
                self.log(f"[ОШИБКА] {e}")
            finally:
                self._busy = None
                sec = (datetime.now() - t0).total_seconds()
                self.log(f"{'✔' if ok else '✖'} {name}: "
                         f"{'завершено' if ok else 'прервано'} за {sec:.0f} c",
                         "ok" if ok else "err")
                self._js("taskDone()")
        threading.Thread(target=wrap, daemon=True).start()

    # ---------- состояние ----------
    def _read(self, name: str) -> str:
        p = self._project / name
        try:
            return p.read_text(encoding="utf-8") if p.exists() else ""
        except OSError:
            return ""

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
            "script": self._read("script.txt"),
            "scenes": self._read("scenes.txt"),
            "overlays": self._read("overlays.txt"),
            "subs": subs,
        }

    def noop(self):
        return True

    # ---------- проект ----------
    def set_project(self, path: str):
        if path:
            self._project = Path(path)
            self._settings["last_project"] = str(self._project)
            self._save_settings_file()

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

        def job():
            text = core.gen_script(topic, int(minutes), key, self.log,
                                   tone=tone, lang=lang)
            self.save_script(text)
            self._js(f"$('scriptText').value = {json.dumps(text)}; updateStats()")
        self._bg("Генерация сценария", job)

    # ---------- озвучка / музыка ----------
    def _tts_step(self, p: dict):
        text = (p.get("script") or "").strip() or self._read("script.txt")
        if not text:
            raise RuntimeError("Нет сценария — заполни страницу «Сценарий».")
        self.save_script(text)
        voice = p.get("voice")
        rate = int(str(p.get("rate", "0%")).replace("%", "").replace("+", ""))
        if p.get("randomize"):
            st = core.project_style(self._project)
            voice, rate = st["voice"], st["rate"]
            self.log(f"[Разнообразие] Голос {voice}, темп {rate:+d}% "
                     "(случайно под этот проект)")
        enh = bool(p.get("enhance"))
        if "Edge" in p.get("engine", "Edge"):
            core.tts_edge(text, voice, self._project, self.log, rate, enh)
        else:
            core.tts_polly(text, voice, "neural", self._project,
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

    def storyboard(self, beat: float, genvideo: bool):
        def job():
            core.auto_storyboard(
                self._project, self.log,
                self._settings.get("pexels_keys", ""),
                self._settings.get("pixabay_keys", ""),
                float(beat),
                self._settings.get("gemini_key", ""),
                self._settings.get("agnes_key", ""),
                bool(genvideo),
                int(self._settings.get("max_unique", 200)))
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
        opts = {"resolution": p.get("resolution", "1080p"),
                "fps": int(p.get("fps", 30)),
                "intensity": p.get("intensity", "средняя"),
                "quality": p.get("quality", "обычное"),
                "sub_size": p.get("sub_size", "средние"),
                "sub_style": p.get("sub_style", "bold_box"),
                "look": p.get("look", "нет"),
                "subs": bool(p.get("subs", True)),
                "grain": bool(p.get("grain")),
                "vignette": bool(p.get("vignette")),
                "letterbox": bool(p.get("letterbox")),
                "vhs": bool(p.get("vhs")),
                "chromab": bool(p.get("chromab")),
                "chapters": bool(p.get("chapters")),
                "bloom": bool(p.get("bloom")),
                "light_leak": bool(p.get("light_leak")),
                "dust": bool(p.get("dust")),
                "flicker": bool(p.get("flicker")),
                "draft": bool(p.get("draft"))}
        if p.get("randomize"):   # свой «почерк» на каждый проект
            st = core.project_style(self._project)
            opts.update(intensity=st["intensity"], sub_style=st["sub_style"],
                        sub_size=st["sub_size"], look=st["look"],
                        bloom=st["bloom"], light_leak=st["light_leak"],
                        dust=st["dust"], flicker=st["flicker"])
            fx = [n for n, k in (("bloom", "bloom"), ("засветка", "light_leak"),
                                 ("пыль", "dust"), ("мерцание", "flicker"))
                  if st[k]]
            self.log(f"[Разнообразие] Субтитры «{st['sub_style']}», монтаж "
                     f"«{st['intensity']}», цветокор случайный, эффекты: "
                     f"{', '.join(fx) or 'нет'} (под этот проект)")
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
        text = overlays.suggest_overlays(core.parse_srt(srt), manifest)
        if text.strip():
            ov.write_text(text.strip() + "\n", encoding="utf-8")
            n = len([l for l in text.splitlines()
                     if l.strip() and not l.startswith("#")])
            self.log(f"[Оверлеи] Авто-расстановка: {n} моушн-элементов "
                     "(popup/счётчики/плашки) добавлены в ролик")

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
        render.CANCEL.set()
        self.log("[Рендер] ⛔ Остановка — текущий ffmpeg будет убит", "warn")

    def seo(self):
        text = self._read("script.txt")
        if not text:
            self.log("Нет сценария для SEO", "warn")
            return None
        key = self._settings.get("gemini_key", "") or self._settings.get("agnes_key", "")
        out = core.gen_seo(text, key, self.log)
        (self._project / "seo.txt").write_text(out, encoding="utf-8")
        self.log("[SEO] Сохранено: seo.txt")
        return out

    # ---------- одна кнопка ----------
    def generate_all(self, p: dict):
        opts = self._render_opts(p)
        if (p.get("overlays") or "").strip():
            self.save_overlays(p["overlays"])

        def job():
            self.log("[Цепочка] Шаг 1/4 — озвучка…")
            self._tts_step(p)
            self.log("[Цепочка] Шаг 2/4 — субтитры…")
            core.transcribe_whisper(self._project / "audio" / "voiceover.mp3",
                                    p.get("whisper", "base.en"),
                                    self._project, self.log, 42,
                                    p.get("lang", "английский"))
            self.log("[Цепочка] Шаг 3/4 — стоки по таймлайну…")
            core.auto_storyboard(
                self._project, self.log,
                self._settings.get("pexels_keys", ""),
                self._settings.get("pixabay_keys", ""),
                float(p.get("beat", 6)),
                self._settings.get("gemini_key", ""),
                self._settings.get("agnes_key", ""), False,
                int(self._settings.get("max_unique", 200)))
            if not (p.get("overlays") or "").strip():
                self._auto_overlays()   # моушн-графика сама, если не задана
            self.log("[Цепочка] Шаг 4/4 — рендер…")
            render.render_project(self._project, self.log,
                                  self._progress, opts)
        self._bg("Генерация видео", job)

    # ---------- настройки ----------
    def settings_get(self):
        keys = ("aws_access_key", "aws_secret_key", "aws_region",
                "gemini_key", "agnes_key", "pexels_keys", "pixabay_keys")
        return {k: self._settings.get(k, "") for k in keys}

    def _save_settings_file(self):
        SETTINGS_FILE.write_text(
            json.dumps(self._settings, ensure_ascii=False, indent=2),
            encoding="utf-8")

    def settings_save(self, data: dict):
        self._settings.update({k: str(v) for k, v in (data or {}).items()})
        self._save_settings_file()
        for k, env in (("aws_access_key", "AWS_ACCESS_KEY_ID"),
                       ("aws_secret_key", "AWS_SECRET_ACCESS_KEY"),
                       ("aws_region", "AWS_REGION")):
            if self._settings.get(k):
                os.environ[env] = self._settings[k]
        self.log("[Настройки] Сохранено в settings.json")
        return True


def main():
    api = Api()
    win = webview.create_window(
        APP_TITLE, url=str(BASE / "ui" / "index.html"), js_api=api,
        width=1280, height=840, min_size=(1080, 700),
        background_color="#130a0a")
    api._win = win
    webview.start()


if __name__ == "__main__":
    main()
