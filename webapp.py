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
import gen_remotion_gemini

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
        self._apply_env()   # ключи из settings.json -> os.environ (не только
                            # при явном сохранении в диалоге, но и при старте)

    def _apply_env(self):
        for k, env in (("aws_access_key", "AWS_ACCESS_KEY_ID"),
                       ("aws_secret_key", "AWS_SECRET_ACCESS_KEY"),
                       ("aws_region", "AWS_REGION"),
                       ("veo_key", "VEO_API_KEY")):
            if self._settings.get(k):
                os.environ[env] = self._settings[k]

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
            self._write_meta(tone=tone, topic=topic)
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
        lib = self._settings.get("music_library", "").strip()
        if not lib:
            return False
        tone = self._read_meta().get("tone", "документальный")
        mood = TONE_TO_MOOD.get(tone, "calm")
        try:
            track = core.pick_music_by_mood(Path(lib), mood)
        except FileNotFoundError:
            jkey = self._settings.get("jamendo_key", "").strip()
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

    def fill_music_library(self, per_mood: int):
        """Разово наполняет все 5 папок настроения треками с Jamendo — после
        этого auto_music работает вообще без интернета."""
        def job():
            lib = self._settings.get("music_library", "").strip()
            if not lib:
                raise RuntimeError("Сначала укажи «Библиотека музыки» в Настройках.")
            jkey = self._settings.get("jamendo_key", "").strip()
            if not jkey:
                raise RuntimeError("Сначала укажи Jamendo API Key в Настройках "
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
                   ai_ratio: float = 0.35):
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
        text = overlays.suggest_overlays_auto(core.parse_srt(srt), manifest,
                                              self._project, self.log)
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
        opts = self._render_opts(p)
        if (p.get("overlays") or "").strip():
            self.save_overlays(p["overlays"])
        beat = self._sync_beat_to_intensity(float(p.get("beat", 6)),
                                            opts.get("intensity", "средняя"))

        def job():
            self.log("[Цепочка] Шаг 1/4 — озвучка…")
            self._tts_step(p)
            self.log("[Цепочка] Шаг 2/4 — субтитры…")
            core.transcribe_whisper(self._project / "audio" / "voiceover.mp3",
                                    p.get("whisper", "tiny.en"),
                                    self._project, self.log, 42,
                                    p.get("lang", "английский"))
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
                float(p.get("ai_ratio", 0.35)))
            if not (p.get("overlays") or "").strip():
                self._auto_overlays()   # моушн-графика сама, если не задана
            self._regen_overlay_theme()   # своя палитра оверлеев под это видео
            if self._settings.get("music_library", "").strip():
                self.log("[Цепочка] Музыка — подбираю под жанр...")
                try:
                    self._do_auto_music(-14)
                except Exception as e:
                    self.log(f"[Цепочка] Музыка пропущена: {e}", "warn")
            self.log("[Цепочка] Шаг 4/4 — рендер…")
            render.render_project(self._project, self.log,
                                  self._progress, opts)
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
