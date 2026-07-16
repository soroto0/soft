#!/usr/bin/env python3
"""
Контент-фабрика — GUI для пайплайна YouTube-видео.

Вкладки:
  1. Сценарий      — текст сценария (вставить или загрузить script.txt)
  2. Озвучка       — Edge TTS (бесплатно) или Amazon Polly
  3. Субтитры      — Whisper локально, .srt с таймкодами
  4. Видеоматериал — сцены -> стоки Pexels/Pixabay
  5. Сборка        — итоговая структура папки для Premiere Pro / DaVinci

Вся логика пайплайна — в core.py (общая с CLI pipeline.py).

Запуск:  python app.py
Зависимости:  pip install -r requirements.txt   (+ ffmpeg в PATH)
Ключи:  окно «Настройки API» или файл .env рядом с app.py (см. .env.example)
"""

import os
import json
import queue
import shutil
import tempfile
import threading
import subprocess
from datetime import datetime
from pathlib import Path

import tkinter as tk
from tkinter import ttk, filedialog, messagebox

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

import core
import render

APP_TITLE = "Контент-фабрика"
APP_VERSION = "2.0"
SETTINGS_FILE = Path(__file__).parent / "settings.json"

TTS_PROVIDERS = ["Edge TTS (бесплатно)", "Amazon Polly"]
EDGE_VOICES = ["en-US-GuyNeural", "en-US-ChristopherNeural", "en-US-EricNeural",
               "en-US-AndrewNeural", "en-US-BrianNeural", "en-US-JennyNeural",
               "en-US-AriaNeural", "en-US-MichelleNeural"]
POLLY_VOICES = ["Matthew", "Joanna", "Stephen", "Ruth", "Gregory", "Danielle"]
POLLY_ENGINES = ["neural", "generative", "standard"]
WHISPER_MODELS = ["tiny.en", "base.en", "small.en", "medium.en"]

SCENES_SAMPLE = ("dark city street at night, rain | type: video | count: 2\n"
                 "old newspaper archive | type: image\n")

# ---------- Палитра: почти чёрный фон + фиолетовый акцент ----------
C = {
    "bg":      "#0f0f15",   # фон окна
    "panel":   "#15151d",   # сайдбар, статус-бар, карточки
    "field":   "#1d1d27",   # поля ввода и текст-боксы
    "hover":   "#232330",   # кнопки и наведение
    "border":  "#2a2a38",   # рамки полей
    "text":    "#f2f2f7",
    "muted":   "#8b8b9e",
    "accent":  "#7c5cff",   # фиолетовый акцент
    "accent2": "#9d85ff",   # акцент при наведении
    "ok":      "#4ade80",
    "err":     "#f87171",
    "warn":    "#fbbf24",
}
FONT = ("Segoe UI", 10)
FONT_SMALL = ("Segoe UI", 9)
FONT_BOLD = ("Segoe UI Semibold", 10)
FONT_H1 = ("Segoe UI Semibold", 15)
FONT_MONO = ("Consolas", 10)


def load_settings() -> dict:
    if SETTINGS_FILE.exists():
        try:
            return json.loads(SETTINGS_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {}


def save_settings(data: dict):
    SETTINGS_FILE.write_text(
        json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title(APP_TITLE)
        self.geometry("1180x780")
        self.minsize(1000, 660)
        self.ui_queue = queue.Queue()  # строки лога и callables для UI-потока

        self.setup_style()
        self.settings = load_settings()
        self.apply_aws_env()

        # --- Каркас: сайдбар слева, рабочая область справа ---
        outer = ttk.Frame(self)
        outer.pack(fill="both", expand=True)
        self.sidebar = tk.Frame(outer, bg=C["panel"], width=232)
        self.sidebar.pack(side="left", fill="y")
        self.sidebar.pack_propagate(False)
        right = ttk.Frame(outer)
        right.pack(side="left", fill="both", expand=True)

        self.pages, self.nav_rows = {}, {}
        self.build_sidebar()
        self.build_project_row(right)
        self.build_statusbar(right)
        self.build_log(right)
        self.content = ttk.Frame(right)
        self.content.pack(fill="both", expand=True, padx=6)

        self.tab_script()
        self.tab_tts()
        self.tab_subs()
        self.tab_media()
        self.tab_render()
        self.tab_build()
        self.tab_console()
        self.show_page("Сценарий")

        # живой вывод ffmpeg/whisper из фоновых потоков -> страница «Консоль»
        render.CONSOLE = self.console
        core.CONSOLE = self.console

        self._fix_hotkeys_any_layout()
        self._loaded_script, self._loaded_scenes = "", ""
        self._project_after = None
        self.load_project_state(announce=True)
        self.project_var.trace_add("write", self._on_project_edit)
        self.greet_log()

        self.after(120, self.drain_ui)
        self.after(800, self.refresh_status)

    # ---------- Стиль ----------
    def setup_style(self):
        """Собственная тёмная тема на базе clam: почти чёрный фон,
        фиолетовый акцент, плоские элементы."""
        self.configure(bg=C["bg"])
        style = ttk.Style(self)
        style.theme_use("clam")

        style.configure(".", background=C["bg"], foreground=C["text"],
                        fieldbackground=C["field"], bordercolor=C["border"],
                        lightcolor=C["bg"], darkcolor=C["bg"],
                        troughcolor=C["field"], focuscolor=C["accent"],
                        selectbackground=C["accent"], selectforeground="#ffffff",
                        insertcolor=C["text"], font=FONT)

        style.configure("TLabel", background=C["bg"], foreground=C["text"])
        style.configure("H1.TLabel", font=("Segoe UI Semibold", 17))
        style.configure("Muted.TLabel", foreground=C["muted"], font=FONT_SMALL)
        style.configure("Panel.TFrame", background=C["panel"])
        style.configure("Panel.TLabel", background=C["panel"])
        style.configure("PanelMuted.TLabel", background=C["panel"],
                        foreground=C["muted"], font=FONT_SMALL)
        style.configure("Warn.TLabel", foreground=C["warn"], font=FONT_SMALL)

        style.configure("TButton", background=C["hover"], foreground=C["text"],
                        borderwidth=0, focusthickness=0, relief="flat",
                        padding=(12, 7))
        style.map("TButton",
                  background=[("pressed", C["border"]), ("active", "#2b2b3c")],
                  foreground=[("disabled", C["muted"])])
        style.configure("Accent.TButton", background=C["accent"],
                        foreground="#ffffff", font=FONT_BOLD)
        style.map("Accent.TButton",
                  background=[("pressed", "#6a4de6"), ("active", C["accent2"])])

        style.configure("TEntry", padding=6, insertcolor=C["text"])
        style.configure("TCombobox", padding=5, arrowcolor=C["muted"],
                        background=C["field"])
        style.map("TCombobox",
                  fieldbackground=[("readonly", C["field"])],
                  background=[("readonly", C["field"]),
                              ("active", C["hover"])],
                  foreground=[("readonly", C["text"])],
                  selectbackground=[("readonly", C["field"])],
                  selectforeground=[("readonly", C["text"])])

        style.configure("TCheckbutton", background=C["bg"],
                        foreground=C["text"], indicatorbackground=C["field"],
                        indicatorforeground=C["text"])
        style.map("TCheckbutton",
                  background=[("active", C["bg"])],
                  indicatorbackground=[("selected", C["accent"]),
                                       ("active", C["hover"])])
        style.configure("Switch.TCheckbutton", background=C["bg"])

        style.configure("Horizontal.TProgressbar", background=C["accent"],
                        troughcolor=C["field"], borderwidth=0, thickness=6)
        style.configure("TSeparator", background=C["border"])

        style.configure("Treeview", background=C["field"],
                        fieldbackground=C["field"], foreground=C["text"],
                        borderwidth=0, rowheight=26)
        style.configure("Treeview.Heading", background=C["panel"],
                        foreground=C["muted"], borderwidth=0, font=FONT_SMALL)
        style.map("Treeview",
                  background=[("selected", C["accent"])],
                  foreground=[("selected", "#ffffff")])
        style.map("Treeview.Heading", background=[("active", C["hover"])])

        for orient in ("Vertical", "Horizontal"):
            style.configure(f"{orient}.TScrollbar", background=C["hover"],
                            troughcolor=C["bg"], bordercolor=C["bg"],
                            arrowcolor=C["muted"], relief="flat")
            style.map(f"{orient}.TScrollbar",
                      background=[("active", C["border"])])

        self.option_add("*TCombobox*Listbox.background", C["field"])
        self.option_add("*TCombobox*Listbox.foreground", C["text"])
        self.option_add("*TCombobox*Listbox.selectBackground", C["accent"])
        self.option_add("*TCombobox*Listbox.selectForeground", "#ffffff")
        self._dark_titlebar(self)

    @staticmethod
    def _dark_titlebar(win):
        """Тёмный заголовок окна (Windows 10/11): атрибут 20, на старых
        сборках — 19. Окно должно быть создано, поэтому вызываем и отложенно."""
        def apply():
            try:
                import ctypes
                win.update_idletasks()
                hwnd = ctypes.windll.user32.GetParent(win.winfo_id())
                if not hwnd:
                    return
                value = ctypes.c_int(1)
                for attr in (20, 19):
                    if ctypes.windll.dwmapi.DwmSetWindowAttribute(
                            hwnd, attr, ctypes.byref(value),
                            ctypes.sizeof(value)) == 0:
                        break
                # перерисовать рамку (SWP_FRAMECHANGED), чтобы цвет применился
                ctypes.windll.user32.SetWindowPos(hwnd, 0, 0, 0, 0, 0, 0x0027)
            except Exception:
                pass
        apply()
        win.after(300, apply)

    def make_text(self, parent, mono=False, **kw) -> tk.Text:
        """tk.Text в цветах темы + контекстное меню правой кнопкой."""
        t = tk.Text(parent, bg=C["field"], fg=C["text"],
                    insertbackground=C["text"],
                    selectbackground=C["accent"], selectforeground="#ffffff",
                    relief="flat", highlightthickness=1,
                    highlightbackground=C["border"], highlightcolor=C["accent"],
                    font=FONT_MONO if mono else FONT, padx=10, pady=8, **kw)
        self._attach_context_menu(t)
        return t

    def _attach_context_menu(self, w: tk.Text):
        menu = tk.Menu(w, tearoff=0, bg=C["panel"], fg=C["text"],
                       activebackground=C["accent"], activeforeground="#1c1c1c")
        menu.add_command(label="Вырезать",
                         command=lambda: w.event_generate("<<Cut>>"))
        menu.add_command(label="Копировать",
                         command=lambda: w.event_generate("<<Copy>>"))
        menu.add_command(label="Вставить",
                         command=lambda: w.event_generate("<<Paste>>"))
        menu.add_separator()
        menu.add_command(label="Выделить всё",
                         command=lambda: w.tag_add("sel", "1.0", "end-1c"))

        def popup(e):
            state = "normal" if str(w.cget("state")) == "normal" else "disabled"
            menu.entryconfigure("Вырезать", state=state)
            menu.entryconfigure("Вставить", state=state)
            w.focus_set()
            menu.tk_popup(e.x_root, e.y_root)

        w.bind("<Button-3>", popup)

    def _fix_hotkeys_any_layout(self):
        """Ctrl+C/V/X/A в любой раскладке: Tk привязывает хоткеи к латинским
        буквам, и в русской раскладке они не срабатывают — дублируем по
        физическому коду клавиши (VK-код не зависит от раскладки)."""
        def select_all(w):
            try:
                if isinstance(w, tk.Text):
                    w.tag_add("sel", "1.0", "end-1c")
                else:
                    w.select_range(0, "end")
            except (AttributeError, tk.TclError):
                pass

        def on_ctrl_key(e):
            if e.keysym.lower() in ("c", "v", "x", "a"):
                return None  # латинская раскладка — штатные бинды уже сработали
            w = self.focus_get()
            if w is None:
                return None
            action = {67: "<<Copy>>", 86: "<<Paste>>", 88: "<<Cut>>"}.get(e.keycode)
            if action:
                w.event_generate(action)
                return "break"
            if e.keycode == 65:
                select_all(w)
                return "break"
            return None

        self.bind_all("<Control-KeyPress>", on_ctrl_key)
        # у tk.Text Ctrl+A по умолчанию — «в начало строки» (Emacs), а не выделение
        self.bind_class("Text", "<Control-a>",
                        lambda e: (select_all(e.widget), "break")[1])

    @staticmethod
    def with_scroll(parent, widget):
        """Кладёт widget + ttk-скроллбар в parent, возвращает frame."""
        frame = ttk.Frame(parent)
        sb = ttk.Scrollbar(frame, orient="vertical", command=widget.yview)
        widget.configure(yscrollcommand=sb.set)
        widget.pack(in_=frame, side="left", fill="both", expand=True)
        sb.pack(side="right", fill="y")
        return frame

    # ---------- Сайдбар и навигация ----------
    def build_sidebar(self):
        head = tk.Frame(self.sidebar, bg=C["panel"])
        head.pack(fill="x", padx=16, pady=(18, 16))
        tk.Label(head, text=" 🎬 ", bg=C["accent"], fg="#ffffff",
                 font=("Segoe UI Emoji", 15)).pack(side="left")
        tt = tk.Frame(head, bg=C["panel"])
        tt.pack(side="left", padx=10)
        tk.Label(tt, text=APP_TITLE, bg=C["panel"], fg=C["text"],
                 font=("Segoe UI Semibold", 12), anchor="w").pack(fill="x")
        tk.Label(tt, text="пайплайн YouTube-видео", bg=C["panel"],
                 fg=C["muted"], font=("Segoe UI", 8), anchor="w").pack(fill="x")
        self.nav_box = tk.Frame(self.sidebar, bg=C["panel"])
        self.nav_box.pack(fill="x")
        bottom = tk.Frame(self.sidebar, bg=C["panel"])
        bottom.pack(side="bottom", fill="x", padx=14, pady=14)
        ttk.Button(bottom, text="📥  Импорт проекта",
                   command=self.import_project).pack(fill="x", pady=(0, 6))
        ttk.Button(bottom, text="📤  Экспорт проекта",
                   command=self.export_project).pack(fill="x", pady=(0, 6))
        ttk.Button(bottom, text="⚙  Настройки API",
                   command=self.open_settings).pack(fill="x")

    def page(self, emoji: str, name: str) -> ttk.Frame:
        """Создаёт страницу (с крупным заголовком) и пункт навигации."""
        f = ttk.Frame(self.content, padding=(14, 10))
        self.pages[name] = f
        ttk.Label(f, text=name, style="H1.TLabel").pack(anchor="w", pady=(0, 6))
        row = tk.Frame(self.nav_box, bg=C["panel"], cursor="hand2")
        row.pack(fill="x", padx=10, pady=2)
        bar = tk.Frame(row, bg=C["panel"], width=3)
        bar.pack(side="left", fill="y")
        lbl = tk.Label(row, text=f"  {len(self.pages)}.  {emoji}  {name}", bg=C["panel"],
                       fg=C["muted"], font=("Segoe UI", 11), anchor="w")
        lbl.pack(side="left", fill="x", expand=True, ipady=8)
        for w in (row, bar, lbl):
            w.bind("<Button-1>", lambda e, n=name: self.show_page(n))
            w.bind("<Enter>", lambda e, n=name: self._nav_hover(n, True))
            w.bind("<Leave>", lambda e, n=name: self._nav_hover(n, False))
        self.nav_rows[name] = (row, bar, lbl)
        return f

    def _nav_hover(self, name: str, on: bool):
        if name == getattr(self, "_current_page", None):
            return
        row, bar, lbl = self.nav_rows[name]
        bg = C["hover"] if on else C["panel"]
        row.configure(bg=bg)
        bar.configure(bg=bg)
        lbl.configure(bg=bg)

    def show_page(self, name: str):
        self._current_page = name
        for f in self.pages.values():
            f.pack_forget()
        self.pages[name].pack(fill="both", expand=True)
        for n, (row, bar, lbl) in self.nav_rows.items():
            active = n == name
            bg = C["field"] if active else C["panel"]
            row.configure(bg=bg)
            bar.configure(bg=C["accent"] if active else bg)
            lbl.configure(bg=bg, fg=C["text"] if active else C["muted"])
        if name == "Сборка":
            self.do_check()  # свежая сводка при каждом открытии вкладки

    # ---------- Строка проекта ----------
    def build_project_row(self, parent):
        row = ttk.Frame(parent, padding=(16, 12, 16, 6))
        row.pack(fill="x")
        ttk.Label(row, text="Папка проекта:").pack(side="left")
        self.project_var = tk.StringVar(
            value=str(Path(__file__).resolve().parent / "project1"))
        ttk.Entry(row, textvariable=self.project_var).pack(
            side="left", fill="x", expand=True, padx=8)
        ttk.Button(row, text="Обзор…", command=self.pick_folder).pack(side="left")
        ttk.Button(row, text="🎬  Собрать видео", style="Accent.TButton",
                   command=lambda: self.show_page("Авторендер")).pack(
            side="left", padx=(10, 0))

    # ---------- Журнал ----------
    def build_log(self, parent):
        wrap = ttk.Frame(parent, padding=(12, 4, 12, 8))
        wrap.pack(fill="x", side="bottom")
        head = ttk.Frame(wrap)
        head.pack(fill="x")
        ttk.Label(head, text="КОНСОЛЬ", style="Muted.TLabel").pack(side="left")
        ttk.Button(head, text="Скопировать",
                   command=self.copy_log).pack(side="right")
        ttk.Button(head, text="Очистить",
                   command=self.clear_log).pack(side="right", padx=6)
        self.log_box = self.make_text(wrap, mono=True, height=8,
                                      state="disabled", wrap="word")
        self.with_scroll(wrap, self.log_box).pack(fill="x", pady=(4, 0))
        for tag, color in (("ok", C["ok"]), ("err", C["err"]),
                           ("warn", C["warn"]), ("muted", C["muted"])):
            self.log_box.tag_configure(tag, foreground=color)

    def clear_log(self):
        self.log_box.configure(state="normal")
        self.log_box.delete("1.0", "end")
        self.log_box.configure(state="disabled")

    def copy_log(self):
        self.clipboard_clear()
        self.clipboard_append(self.log_box.get("1.0", "end"))
        self.log("[Журнал] Скопирован в буфер обмена")

    # ---------- Страница «Консоль»: полный живой вывод процессов ----------
    def tab_console(self):
        f = self.page("🖥", "Консоль")
        bar = ttk.Frame(f)
        bar.pack(fill="x", pady=(0, 6))
        ttk.Button(bar, text="Очистить",
                   command=self.clear_console).pack(side="left")
        ttk.Button(bar, text="Скопировать",
                   command=self.copy_console).pack(side="left", padx=6)
        self.autoscroll_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(bar, text="Автопрокрутка",
                        variable=self.autoscroll_var).pack(side="left", padx=10)
        ttk.Label(bar, text="Всё, что происходит под капотом: команды, живой "
                            "прогресс ffmpeg (кадр/время/скорость), вывод "
                            "Whisper и полные тексты ошибок.",
                  style="Muted.TLabel").pack(side="left", padx=8)
        self.console_box = self.make_text(f, mono=True, state="disabled",
                                          wrap="none")
        self.with_scroll(f, self.console_box).pack(fill="both", expand=True)
        for tag, color in (("ok", C["ok"]), ("err", C["err"]),
                           ("warn", C["warn"]), ("muted", C["muted"])):
            self.console_box.tag_configure(tag, foreground=color)

    def console(self, msg: str):
        """Потокобезопасно: строка только в «Консоль» (журнал не засоряем)."""
        self.ui(lambda: self.append_console(msg, "muted"))

    def append_console(self, msg: str, tag: str = ""):
        if not hasattr(self, "console_box"):
            return
        box = self.console_box
        box.configure(state="normal")
        box.insert("end", datetime.now().strftime("%H:%M:%S  "), "muted")
        box.insert("end", msg + "\n", tag)
        # не даём консоли распухнуть: держим последние ~8000 строк
        if int(box.index("end-1c").split(".")[0]) > 8000:
            box.delete("1.0", "2000.0")
        if self.autoscroll_var.get():
            box.see("end")
        box.configure(state="disabled")

    def clear_console(self):
        self.console_box.configure(state="normal")
        self.console_box.delete("1.0", "end")
        self.console_box.configure(state="disabled")

    def copy_console(self):
        self.clipboard_clear()
        self.clipboard_append(self.console_box.get("1.0", "end"))
        self.log("[Консоль] Скопирована в буфер обмена")

    # ---------- Статус-бар ----------
    def build_statusbar(self, parent):
        bar = ttk.Frame(parent, style="Panel.TFrame", padding=(12, 6))
        bar.pack(fill="x", side="bottom")
        self.status_var = tk.StringVar(value="Готов")
        ttk.Label(bar, textvariable=self.status_var,
                  style="Panel.TLabel").pack(side="left")
        self.progress = ttk.Progressbar(bar, length=240, mode="determinate")
        self.progress.pack(side="left", padx=12)
        self.sysinfo_var = tk.StringVar(value=f"v{APP_VERSION}")
        ttk.Label(bar, textvariable=self.sysinfo_var,
                  style="PanelMuted.TLabel").pack(side="right")
        self.checklist_var = tk.StringVar(value="")
        ttk.Label(bar, textvariable=self.checklist_var,
                  style="PanelMuted.TLabel").pack(side="right", padx=(0, 16))

    @staticmethod
    def _sys_info() -> str:
        parts = []
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

            m = MemStatus()
            m.dwLength = ctypes.sizeof(m)
            if ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(m)):
                parts.append(f"RAM {m.dwMemoryLoad}%")
        except Exception:
            pass
        try:
            du = shutil.disk_usage(Path(__file__).anchor)
            parts.append(f"диск {du.free // (1 << 30)} ГБ свободно")
        except OSError:
            pass
        parts.append(f"v{APP_VERSION}")
        return "  ·  ".join(parts)

    def refresh_status(self):
        d = self.out_dir()

        def mark(ok):
            return "✓" if ok else "✗"

        def has_files(*names):
            return any((d / n).exists() and any((d / n).iterdir())
                       for n in names if (d / n).exists())
        try:
            self.checklist_var.set(
                f"сценарий {mark((d / 'script.txt').exists())}   "
                f"озвучка {mark((d / 'audio' / 'voiceover.mp3').exists())}   "
                f"субтитры {mark((d / 'subs' / 'voiceover.srt').exists())}   "
                f"стоки {mark(has_files('video', 'images', 'storyboard'))}   "
                f"рендер {mark((d / 'output_final.mp4').exists())}")
        except OSError:
            pass
        self.sysinfo_var.set(self._sys_info())
        self.after(3000, self.refresh_status)

    # ---------- Сервис ----------
    def apply_aws_env(self):
        """Прокидывает сохранённые ключи в окружение (boto3 и core-роутинг:
        тексты — Gemini, картинки — Agnes, с взаимным фолбэком)."""
        mapping = {"aws_access_key": "AWS_ACCESS_KEY_ID",
                   "aws_secret_key": "AWS_SECRET_ACCESS_KEY",
                   "aws_region": "AWS_REGION",
                   "gemini_key": "GEMINI_API_KEY",
                   "agnes_key": "AGNES_API_KEY"}
        for key, env in mapping.items():
            if self.settings.get(key):
                os.environ[env] = self.settings[key]

    def out_dir(self) -> Path:
        return Path(self.project_var.get())

    def ensure_project_dir(self) -> bool:
        """Создаёт папку проекта; при отказе в доступе — понятная ошибка."""
        try:
            self.out_dir().mkdir(parents=True, exist_ok=True)
            return True
        except OSError as e:
            messagebox.showerror(
                APP_TITLE, f"Не могу писать в папку проекта:\n{self.out_dir()}\n\n"
                           f"{e}\n\nВыбери другую папку вверху окна (Обзор…).")
            return False

    def pick_folder(self):
        d = filedialog.askdirectory()
        if d:
            self.project_var.set(d)

    def import_project(self):
        """Открыть существующую папку проекта — файлы подхватятся сами."""
        d = filedialog.askdirectory(title="Папка существующего проекта")
        if d:
            self.project_var.set(d)
            self.log(f"[Проект] Открыт: {d}")

    def export_project(self):
        """Упаковывает папку проекта в zip (переносить/архивировать)."""
        d = self.out_dir()
        if not d.exists():
            messagebox.showwarning(APP_TITLE, "Папка проекта ещё не создана.")
            return
        dest = filedialog.asksaveasfilename(
            defaultextension=".zip", initialfile=f"{d.name}.zip",
            filetypes=[("ZIP-архив", "*.zip")])
        if not dest:
            return

        def job():
            self.log(f"[Проект] Упаковываю {d} в архив...")
            shutil.make_archive(dest[:-4], "zip", d)
            self.log(f"[Проект] Готово: {dest}")
        self.run_bg(job, name="Экспорт проекта")

    def log(self, msg: str):
        self.ui_queue.put(msg)

    def ui(self, fn):
        """Выполнить fn в UI-потоке (виджеты нельзя трогать из фоновых потоков)."""
        self.ui_queue.put(fn)

    def drain_ui(self):
        try:
            while True:
                item = self.ui_queue.get_nowait()
                if callable(item):
                    item()
                else:
                    self.append_log(item)
        except queue.Empty:
            pass
        self.after(120, self.drain_ui)

    def append_log(self, msg: str):
        if "[ОШИБКА]" in msg or "ошибка" in msg:
            tag = "err"
        elif "Готово" in msg or "-> OK" in msg:
            tag = "ok"
        elif "НЕ НАЙДЕНО" in msg or "[Ключи]" in msg:
            tag = "warn"
        else:
            tag = ""
        self.log_box.configure(state="normal")
        self.log_box.insert("end", datetime.now().strftime("%H:%M:%S  "), "muted")
        self.log_box.insert("end", msg + "\n", tag)
        self.log_box.see("end")
        self.log_box.configure(state="disabled")
        self.append_console(msg, tag)  # в «Консоли» — полная история

    def greet_log(self):
        self.append_log("Готов к работе. Порядок: 1 Сценарий → 2 Озвучка → "
                        "3 Субтитры → 4 Видеоматериал → 5 Авторендер / 6 Сборка.")
        self.append_log("Сюда пишется ход каждой операции; ошибки — красным. "
                        "Ключи API — кнопка «Настройки API» слева внизу.")

    # ---------- Автозагрузка файлов проекта ----------
    def _on_project_edit(self, *_):
        if self._project_after:
            self.after_cancel(self._project_after)
        self._project_after = self.after(
            700, lambda: self.load_project_state(announce=True))

    def load_project_state(self, announce=False):
        """Подхватывает script.txt, scenes.txt и субтитры из папки проекта,
        не затирая несохранённые правки в полях."""
        d = self.out_dir()
        p = d / "script.txt"
        cur = self.script_text.get("1.0", "end").strip()
        if p.exists() and cur in ("", self._loaded_script):
            try:
                text = p.read_text(encoding="utf-8").strip()
            except OSError:
                text = ""
            if text and text != cur:
                self.script_text.delete("1.0", "end")
                self.script_text.insert("1.0", text)
                if announce:
                    self.append_log(f"[Проект] Сценарий загружен: {p}")
            if text:
                self._loaded_script = text
        p = d / "scenes.txt"
        cur = self.scenes_text.get("1.0", "end").strip()
        if p.exists() and cur in ("", self._loaded_scenes, SCENES_SAMPLE.strip()):
            try:
                text = p.read_text(encoding="utf-8").strip()
            except OSError:
                text = ""
            if text and text != cur:
                self.scenes_text.delete("1.0", "end")
                self.scenes_text.insert("1.0", text + "\n")
                if announce:
                    self.append_log(f"[Проект] Сцены загружены: {p}")
            if text:
                self._loaded_scenes = text
        p = d / "subs" / "voiceover.srt"
        if p.exists():
            try:
                rows = core.parse_srt(p)
                self.subs_tree.delete(*self.subs_tree.get_children())
                for r in rows:
                    self.subs_tree.insert("", "end", values=r)
                if announce and rows:
                    self.append_log(f"[Проект] Субтитры: {len(rows)} фраз "
                                    f"({p.name})")
            except Exception:
                pass
        self.update_script_stats()

    def run_bg(self, fn, *args, name="Задача"):
        def wrapper():
            self.ui(lambda: self.status_var.set(f"⏳ {name}…"))
            try:
                fn(*args)
            except Exception as e:
                self.log(f"[ОШИБКА] {e}")
            finally:
                def done():
                    self.status_var.set("Готов")
                    self.progress.configure(value=0)
                self.ui(done)
        threading.Thread(target=wrapper, daemon=True).start()

    # ---------- Настройки ----------
    def open_settings(self):
        win = tk.Toplevel(self)
        win.title("Настройки API")
        win.geometry("680x640")
        win.configure(bg=C["bg"])
        win.transient(self)
        self._dark_titlebar(win)

        frm = ttk.Frame(win, padding=14)
        frm.pack(fill="both", expand=True)

        entries = {}

        def add_row(label, key, hint=""):
            row = ttk.Frame(frm)
            row.pack(fill="x", pady=3)
            ttk.Label(row, text=label, width=26).pack(side="left")
            var = tk.StringVar(value=self.settings.get(key, ""))
            ttk.Entry(row, textvariable=var, show="•").pack(
                side="left", fill="x", expand=True)
            if hint:
                ttk.Label(row, text=hint, style="Muted.TLabel").pack(side="left", padx=6)
            entries[key] = var

        ttk.Label(frm, text="Amazon Polly (озвучка)", font=FONT_BOLD).pack(anchor="w")
        add_row("AWS Access Key:", "aws_access_key")
        add_row("AWS Secret Key:", "aws_secret_key")
        add_row("AWS Region:", "aws_region", "us-east-1")
        ttk.Label(frm, text="⚠ Ключи сохраняются в settings.json рядом с программой "
                            "в открытом виде — не передавай этот файл никому.",
                  style="Warn.TLabel", wraplength=620).pack(anchor="w", pady=(4, 0))

        ttk.Separator(frm).pack(fill="x", pady=10)
        ttk.Label(frm, text="Генерация и агенты", font=FONT_BOLD).pack(anchor="w")
        add_row("Gemini API Key:", "gemini_key", "тексты: сценарий, сцены, SEO")
        add_row("Agnes API Key:", "agnes_key", "картинки (type: gen); запасной для текстов")

        ttk.Separator(frm).pack(fill="x", pady=10)
        ttk.Label(frm, text="Pexels (сток) — несколько ключей, по одному на строку. "
                            "При упоре в лимит программа автоматически переключится "
                            "на следующий:", wraplength=620,
                  style="Muted.TLabel").pack(anchor="w")
        pexels_box = self.make_text(frm, mono=True, height=4)
        pexels_box.pack(fill="x", pady=4)
        pexels_box.insert("1.0", self.settings.get("pexels_keys", ""))

        ttk.Label(frm, text="Pixabay (сток) — несколько ключей, по одному на строку:",
                  style="Muted.TLabel").pack(anchor="w", pady=(8, 0))
        pixabay_box = self.make_text(frm, mono=True, height=4)
        pixabay_box.pack(fill="x", pady=4)
        pixabay_box.insert("1.0", self.settings.get("pixabay_keys", ""))

        def do_save():
            for key, var in entries.items():
                self.settings[key] = var.get().strip()
            self.settings["pexels_keys"] = pexels_box.get("1.0", "end").strip()
            self.settings["pixabay_keys"] = pixabay_box.get("1.0", "end").strip()
            save_settings(self.settings)
            self.apply_aws_env()
            self.log("[Настройки] Сохранено в settings.json")
            win.destroy()

        ttk.Button(frm, text="Сохранить", style="Accent.TButton",
                   command=do_save).pack(pady=12)

    # ---------- 1. Сценарий ----------
    def tab_script(self):
        f = self.page("📝", "Сценарий")

        genrow = ttk.Frame(f)
        genrow.pack(fill="x", pady=(0, 6))
        ttk.Label(genrow, text="Тема:").pack(side="left")
        self.topic_var = tk.StringVar()
        ttk.Entry(genrow, textvariable=self.topic_var).pack(
            side="left", fill="x", expand=True, padx=8)
        ttk.Label(genrow, text="Хронометраж:").pack(side="left")
        self.minutes_var = tk.StringVar(value="45 мин")
        ttk.Combobox(genrow, textvariable=self.minutes_var,
                     values=["15 мин", "30 мин", "45 мин", "60 мин", "90 мин"],
                     width=8, state="readonly").pack(side="left", padx=8)
        ttk.Button(genrow, text="🤖  Сгенерировать черновик", style="Accent.TButton",
                   command=self.do_gen_script).pack(side="left")

        bar = ttk.Frame(f)
        bar.pack(fill="x", pady=(0, 6))
        ttk.Button(bar, text="📋  Вставить из буфера",
                   command=self.paste_script).pack(side="left")
        ttk.Button(bar, text="Загрузить из файла…",
                   command=self.load_script).pack(side="left", padx=8)
        ttk.Button(bar, text="Сохранить в проект",
                   command=self.save_script).pack(side="left")
        ttk.Button(bar, text="Сцены по абзацам",
                   command=self.do_auto_scenes).pack(side="left", padx=8)
        ttk.Button(bar, text="🤖  Сцены через ИИ",
                   command=self.do_ai_scenes).pack(side="left")
        self.script_stats = tk.StringVar(value="0 слов")
        ttk.Label(bar, textvariable=self.script_stats,
                  style="Muted.TLabel").pack(side="right")

        ttk.Label(f, text="Вставь текст сценария прямо в поле ниже (Ctrl+V или "
                          "правой кнопкой мыши), сгенерируй черновик по теме или "
                          "загрузи script.txt. Сгенерированный текст — черновик: "
                          "вычитай и переработай перед озвучкой, иначе это "
                          "«inauthentic content».",
                  style="Muted.TLabel", wraplength=900).pack(anchor="w", pady=(0, 6))
        self.script_text = self.make_text(f, wrap="word")
        self.with_scroll(f, self.script_text).pack(fill="both", expand=True)
        self.script_text.bind("<<Modified>>", self._script_modified)

    def do_gen_script(self):
        topic = self.topic_var.get().strip()
        if not topic:
            messagebox.showwarning(APP_TITLE, "Напиши тему видео в поле «Тема».")
            return
        minutes = int(self.minutes_var.get().split()[0])

        def job():
            text = core.gen_script(topic, minutes,
                                   self.settings.get("agnes_key", ""), self.log)

            def show():
                self.script_text.delete("1.0", "end")
                self.script_text.insert("1.0", text)
            self.ui(show)
        self.run_bg(job, name="Генерация сценария")

    def load_script(self):
        p = filedialog.askopenfilename(filetypes=[("Text", "*.txt"), ("All", "*.*")])
        if p:
            self.script_text.delete("1.0", "end")
            self.script_text.insert("1.0", Path(p).read_text(encoding="utf-8"))
            self.log(f"[Сценарий] Загружен: {p}")

    def paste_script(self):
        try:
            text = self.clipboard_get()
        except tk.TclError:
            messagebox.showinfo(APP_TITLE, "Буфер обмена пуст — скопируй текст "
                                           "сценария и попробуй снова.")
            return
        if self.script_text.get("1.0", "end").strip():
            if not messagebox.askyesno(APP_TITLE, "Поле не пустое. Заменить его "
                                                  "содержимым буфера?"):
                return
        self.script_text.delete("1.0", "end")
        self.script_text.insert("1.0", text.strip())
        self.log(f"[Сценарий] Вставлено из буфера: {len(text.split())} слов")

    def _script_modified(self, _e=None):
        self.script_text.edit_modified(False)
        self.update_script_stats()

    def update_script_stats(self):
        words = len(self.script_text.get("1.0", "end").split())
        self.script_stats.set(
            f"{words} слов · ~{words // core.WORDS_PER_MINUTE} мин озвучки")

    def _script_for_actions(self) -> str:
        """Сценарий из вкладки 1; если она пуста — подхватывает script.txt
        из папки проекта. Пустая строка = сценария нет (предупреждение показано)."""
        text = self.script_text.get("1.0", "end").strip()
        if text:
            return text
        p = self.out_dir() / "script.txt"
        if p.exists():
            text = p.read_text(encoding="utf-8").strip()
            if text:
                self.script_text.insert("1.0", text)
                self._loaded_script = text
                self.log(f"[Сценарий] Подхвачен из {p}")
                return text
        messagebox.showwarning(APP_TITLE, "Нет сценария: вставь текст на вкладке "
                                          "«Сценарий» или сгенерируй черновик.")
        return ""

    def save_script(self) -> bool:
        if not self.ensure_project_dir():
            return False
        dest = self.out_dir() / "script.txt"
        dest.write_text(self.script_text.get("1.0", "end").strip(), encoding="utf-8")
        self.log(f"[Сценарий] Сохранён: {dest}")
        return True

    # ---------- 2. Озвучка ----------
    def tab_tts(self):
        f = self.page("🎙", "Озвучка")
        saved = self.settings.get("tts", {})

        ttk.Label(f, text="Шаг 2: текст с вкладки «Сценарий» превращается в "
                          "закадровый голос — audio/voiceover.mp3 в папке проекта. "
                          "Выбери голос, нажми «Прослушать» для примера звучания, "
                          "затем «Озвучить сценарий».",
                  style="Muted.TLabel", wraplength=900).pack(anchor="w", pady=(0, 8))

        row0 = ttk.Frame(f)
        row0.pack(fill="x", pady=4)
        ttk.Label(row0, text="Движок:").pack(side="left")
        self.provider_var = tk.StringVar(
            value=saved.get("provider", TTS_PROVIDERS[0]))
        cb = ttk.Combobox(row0, textvariable=self.provider_var,
                          values=TTS_PROVIDERS, width=24, state="readonly")
        cb.pack(side="left", padx=8)
        cb.bind("<<ComboboxSelected>>", lambda e: self.update_voices())
        self.tts_hint = tk.StringVar()
        ttk.Label(row0, textvariable=self.tts_hint,
                  style="Muted.TLabel").pack(side="left", padx=8)

        row = ttk.Frame(f)
        row.pack(fill="x", pady=4)
        ttk.Label(row, text="Голос:").pack(side="left")
        self.voice_var = tk.StringVar(value=EDGE_VOICES[0])
        self.voice_cb = ttk.Combobox(row, textvariable=self.voice_var,
                                     values=EDGE_VOICES, width=28)
        self.voice_cb.pack(side="left", padx=8)
        ttk.Button(row, text="▶  Прослушать голос",
                   command=self.do_preview_voice).pack(side="left", padx=4)
        ttk.Label(row, text="Темп:").pack(side="left", padx=(16, 0))
        self.rate_var = tk.StringVar(value=saved.get("rate", "0%"))
        ttk.Combobox(row, textvariable=self.rate_var,
                     values=["-10%", "-5%", "0%", "+5%", "+10%"],
                     width=7, state="readonly").pack(side="left", padx=8)

        # настройки только для Polly — показываются при выборе Polly
        self.polly_row = ttk.Frame(f)
        ttk.Label(self.polly_row, text="Движок Polly:").pack(side="left")
        self.engine_var = tk.StringVar(
            value=saved.get("engine", os.getenv("POLLY_ENGINE", "neural")))
        ttk.Combobox(self.polly_row, textvariable=self.engine_var,
                     values=POLLY_ENGINES,
                     width=12, state="readonly").pack(side="left", padx=8)
        self.pauses_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(self.polly_row, text="Паузы между абзацами (SSML)",
                        variable=self.pauses_var,
                        style="Switch.TCheckbutton").pack(side="left", padx=12)

        self.tts_btn_row = ttk.Frame(f)
        self.tts_btn_row.pack(fill="x")
        ttk.Button(self.tts_btn_row, text="🎙  Озвучить сценарий",
                   style="Accent.TButton",
                   command=self.do_tts).pack(side="left", pady=12)
        ttk.Label(f, text="Edge TTS — бесплатно, ключи не нужны. "
                          "Amazon Polly — ключи в «Настройки API» или .env. "
                          "Небольшое изменение темпа и паузы делают голос живее.",
                  style="Muted.TLabel").pack(anchor="w")

        # --- Фоновая музыка ---
        ttk.Separator(f).pack(fill="x", pady=12)
        ttk.Label(f, text="Фоновая музыка", font=FONT_BOLD).pack(anchor="w")
        mrow = ttk.Frame(f)
        mrow.pack(fill="x", pady=6)
        ttk.Label(mrow, text="Папка или файл:").pack(side="left")
        self.music_var = tk.StringVar(value=self.settings.get("music_dir", ""))
        ttk.Entry(mrow, textvariable=self.music_var).pack(
            side="left", fill="x", expand=True, padx=8)
        ttk.Button(mrow, text="Файл…",
                   command=self.pick_music_file).pack(side="left")
        ttk.Button(mrow, text="Папка…",
                   command=self.pick_music).pack(side="left", padx=4)
        ttk.Label(mrow, text="Громкость:").pack(side="left", padx=(12, 0))
        self.music_gain_var = tk.StringVar(value="-14 dB")
        ttk.Combobox(mrow, textvariable=self.music_gain_var,
                     values=["-10 dB", "-14 dB", "-18 dB", "-22 dB"],
                     width=8, state="readonly").pack(side="left", padx=8)
        ttk.Button(f, text="🎵  Подмешать музыку",
                   command=self.do_music).pack(anchor="w", pady=6)
        ttk.Label(f, text="Случайный трек из папки подкладывается под озвучку и "
                          "автоматически приглушается, когда звучит голос. "
                          "Результат — voiceover_music.mp3, чистый голос не трогается. "
                          "Музыка должна быть лицензионной (YouTube Audio Library и т.п.).",
                  style="Muted.TLabel", wraplength=860).pack(anchor="w")

        self.update_voices()
        if saved.get("voice"):
            self.voice_var.set(saved["voice"])

    def update_voices(self):
        if "Edge" in self.provider_var.get():
            self.voice_cb.configure(values=EDGE_VOICES)
            self.voice_var.set(EDGE_VOICES[0])
            self.polly_row.pack_forget()
            self.tts_hint.set("бесплатно, ключи не нужны — только интернет")
        else:
            self.voice_cb.configure(values=POLLY_VOICES)
            self.voice_var.set(os.getenv("POLLY_VOICE", "Matthew"))
            self.polly_row.pack(fill="x", pady=4, before=self.tts_btn_row)
            self.tts_hint.set("нужны AWS-ключи — «Настройки API» слева внизу")

    def do_preview_voice(self):
        edge = "Edge" in self.provider_var.get()
        voice, engine = self.voice_var.get(), self.engine_var.get()
        rate = int(self.rate_var.get().replace("%", "").replace("+", ""))

        def job():
            p = core.tts_preview(edge, voice, engine, rate,
                                 Path(tempfile.gettempdir()), self.log)
            self._open_path(p)
        self.run_bg(job, name="Пример голоса")

    def do_tts(self):
        text = self._script_for_actions()
        if not text:
            return
        if not self.save_script():
            return
        self.settings["tts"] = {"provider": self.provider_var.get(),
                                "voice": self.voice_var.get(),
                                "engine": self.engine_var.get(),
                                "rate": self.rate_var.get()}
        save_settings(self.settings)
        rate = int(self.rate_var.get().replace("%", "").replace("+", ""))
        if "Edge" in self.provider_var.get():
            self.run_bg(core.tts_edge, text, self.voice_var.get(),
                        self.out_dir(), self.log, rate, name="Озвучка")
        else:
            self.run_bg(core.tts_polly, text, self.voice_var.get(),
                        self.engine_var.get(), self.out_dir(), self.log,
                        rate, self.pauses_var.get(), name="Озвучка")

    def _show_scenes(self, scenes: str, how: str):
        def show():
            self.scenes_text.delete("1.0", "end")
            self.scenes_text.insert("1.0", scenes + "\n")
            self.show_page("Видеоматериал")
            self.append_log(f"[Сцены] {how}: {scenes.count(chr(10)) + 1} сцен — "
                            "проверь ключевые слова и жми «Скачать стоки»")
        self.ui(show)

    def do_auto_scenes(self):
        text = self._script_for_actions()
        if text:
            self._show_scenes(core.auto_scenes(text), "разметка по абзацам")

    def do_ai_scenes(self):
        text = self._script_for_actions()
        if not text:
            return
        key = self.settings.get("agnes_key", "") or os.getenv("AGNES_API_KEY", "")
        if not key and not os.getenv("GEMINI_API_KEY", ""):
            if messagebox.askyesno(
                    APP_TITLE, "Для сцен через ИИ нужен ключ Gemini или Agnes "
                               "(«Настройки API» или .env).\n\nРазметить "
                               "сцены локально по абзацам (без ИИ)?"):
                self.do_auto_scenes()
            return

        def job():
            try:
                self._show_scenes(core.gen_scenes_ai(text, key, self.log),
                                  "сцены от ИИ")
            except Exception as e:
                self.log(f"[Агент] Сцены через ИИ не получились ({e}) — "
                         "делаю локальную разметку по абзацам.")
                self._show_scenes(core.auto_scenes(text), "разметка по абзацам")
        self.run_bg(job, name="Сцены (ИИ)")

    def pick_music(self):
        d = filedialog.askdirectory(title="Папка с музыкой")
        if d:
            self.music_var.set(d)

    def pick_music_file(self):
        p = filedialog.askopenfilename(
            title="Файл музыки",
            filetypes=[("Аудио и видео",
                        "*.mp3 *.wav *.m4a *.ogg *.flac *.mp4 *.aac *.opus *.wma"),
                       ("Все файлы", "*.*")])
        if p:
            self.music_var.set(p)

    def do_music(self):
        music = self.music_var.get().strip()
        if not music or not Path(music).exists():
            messagebox.showwarning(APP_TITLE, "Укажи папку или файл с музыкой.")
            return
        voice = self.out_dir() / "audio" / "voiceover.mp3"
        if not voice.exists():
            messagebox.showwarning(APP_TITLE, "Сначала сделай озвучку.")
            return
        self.settings["music_dir"] = music
        save_settings(self.settings)
        gain = int(self.music_gain_var.get().split()[0])
        self.run_bg(core.add_music, voice, Path(music), self.log, gain,
                    name="Музыка")

    # ---------- 3. Субтитры ----------
    def tab_subs(self):
        f = self.page("💬", "Субтитры")
        ttk.Label(f, text="Шаг 3: Whisper слушает voiceover.mp3 и создаёт "
                          "subs/voiceover.srt с таймкодами — по ним привязывается "
                          "видеоматериал и монтаж. Первый запуск скачает модель "
                          "(~150 МБ для base.en). Чем крупнее модель, тем точнее, "
                          "но дольше; для длинной озвучки начни с base.en.",
                  style="Muted.TLabel", wraplength=900).pack(anchor="w", pady=(0, 6))
        row = ttk.Frame(f)
        row.pack(fill="x", pady=4)
        ttk.Label(row, text="Модель Whisper:").pack(side="left")
        self.whisper_var = tk.StringVar(
            value=self.settings.get("whisper_model",
                                    os.getenv("WHISPER_MODEL", "base.en")))
        ttk.Combobox(row, textvariable=self.whisper_var, values=WHISPER_MODELS,
                     width=12, state="readonly").pack(side="left", padx=8)
        ttk.Button(row, text="💬  Транскрибировать", style="Accent.TButton",
                   command=self.do_subs).pack(side="left", padx=12)

        cols = ("start", "end", "text")
        self.subs_tree = ttk.Treeview(f, columns=cols, show="headings")
        for c, w, t in (("start", 110, "Начало"), ("end", 110, "Конец"),
                        ("text", 640, "Текст")):
            self.subs_tree.heading(c, text=t)
            self.subs_tree.column(c, width=w, anchor="w")
        self.with_scroll(f, self.subs_tree).pack(fill="both", expand=True, pady=8)

    def do_subs(self):
        audio = self.out_dir() / "audio" / "voiceover.mp3"
        if not audio.exists():
            messagebox.showwarning(APP_TITLE, "Сначала сделай озвучку (вкладка 2).")
            return
        self.settings["whisper_model"] = self.whisper_var.get()
        save_settings(self.settings)

        def job():
            srt = core.transcribe_whisper(audio, self.whisper_var.get(),
                                          self.out_dir(), self.log)
            rows = core.parse_srt(srt)

            def show():
                self.subs_tree.delete(*self.subs_tree.get_children())
                for r in rows:
                    self.subs_tree.insert("", "end", values=r)
            self.ui(show)
            self.log(f"[Субтитры] Отрезков: {len(rows)}")
        self.run_bg(job, name="Субтитры (Whisper)")

    # ---------- 4. Видеоматериал ----------
    def tab_media(self):
        f = self.page("🎬", "Видеоматериал")
        ttk.Label(f, text="Сцены — одна на строку:   keywords | type: video | count: 2   "
                          "(count — сколько разных клипов скачать, до 5; "
                          "type: gen — сгенерировать картинку через Gemini). "
                          "Клипы выбираются случайно из топ-15 и не повторяют "
                          "использованные в прошлых видео.",
                  style="Muted.TLabel", wraplength=900).pack(anchor="w")
        bar = ttk.Frame(f)
        bar.pack(fill="x", pady=6)
        ttk.Button(bar, text="🤖  Сцены через ИИ",
                   command=self.do_ai_scenes).pack(side="left")
        ttk.Button(bar, text="Загрузить scenes.txt…",
                   command=self.load_scenes).pack(side="left", padx=8)
        ttk.Button(bar, text="🎬  Скачать стоки", style="Accent.TButton",
                   command=self.do_media).pack(side="left")
        self.kenburns_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(bar, text="Ken Burns: делать из картинок клипы "
                                  "с движением камеры (в video/)",
                        variable=self.kenburns_var,
                        style="Switch.TCheckbutton").pack(side="left", padx=12)
        self.scenes_text = self.make_text(f, mono=True, wrap="word", height=12)
        self.with_scroll(f, self.scenes_text).pack(fill="both", expand=True)
        self.scenes_text.insert("1.0", SCENES_SAMPLE)

        # --- Авто-раскадровка по таймлайну ---
        ttk.Separator(f).pack(fill="x", pady=10)
        ttk.Label(f, text="Авто-раскадровка по таймлайну озвучки",
                  font=FONT_BOLD).pack(anchor="w")
        srow = ttk.Frame(f)
        srow.pack(fill="x", pady=6)
        ttk.Label(srow, text="Длина плана:").pack(side="left")
        self.beat_var = tk.StringVar(value="6 c")
        ttk.Combobox(srow, textvariable=self.beat_var,
                     values=["4 c", "6 c", "8 c", "10 c"],
                     width=6, state="readonly").pack(side="left", padx=8)
        ttk.Button(srow, text="🪄  Собрать по субтитрам", style="Accent.TButton",
                   command=self.do_storyboard).pack(side="left", padx=8)
        ttk.Label(f, text="Вместо списка сцен: материал подбирается под то, о чём "
                          "говорится в каждый момент озвучки (по таймкодам субтитров). "
                          "Результат — storyboard/ с клипами и sequence.xml: "
                          "в Premiere Pro File > Import — готовый таймлайн с озвучкой. "
                          "Нужны озвучка (вкладка 2) и субтитры (вкладка 3).",
                  style="Muted.TLabel", wraplength=900).pack(anchor="w")

    def load_scenes(self):
        p = filedialog.askopenfilename(filetypes=[("Text", "*.txt"), ("All", "*.*")])
        if p:
            self.scenes_text.delete("1.0", "end")
            self.scenes_text.insert("1.0", Path(p).read_text(encoding="utf-8"))

    def _stock_keys_ok(self) -> bool:
        has_keys = (self.settings.get("pexels_keys", "").strip()
                    or self.settings.get("pixabay_keys", "").strip()
                    or os.getenv("PEXELS_API_KEY") or os.getenv("PIXABAY_API_KEY"))
        if has_keys:
            return True
        return messagebox.askyesno(
            APP_TITLE, "Ключи Pexels/Pixabay не найдены в «Настройки API» и .env — "
                       "стоки скачиваться не будут. Ключи бесплатные: "
                       "pexels.com/api и pixabay.com/api/docs.\n\n"
                       "Продолжить всё равно?")

    def do_media(self):
        scenes = self.scenes_text.get("1.0", "end").strip()
        if not scenes:
            messagebox.showwarning(APP_TITLE, "Заполни список сцен.")
            return
        if not self.ensure_project_dir() or not self._stock_keys_ok():
            return
        (self.out_dir() / "scenes.txt").write_text(scenes, encoding="utf-8")
        self.run_bg(core.fetch_media, scenes, self.out_dir(), self.log,
                    self.settings.get("pexels_keys", ""),
                    self.settings.get("pixabay_keys", ""),
                    self.kenburns_var.get(),
                    self.settings.get("gemini_key", ""), name="Стоки")

    def do_storyboard(self):
        d = self.out_dir()
        if not (d / "subs" / "voiceover.srt").exists():
            messagebox.showwarning(
                APP_TITLE, "Сначала субтитры (вкладка 3) — они дают таймкоды, "
                           "по которым материал привязывается к озвучке.")
            return
        if not self._stock_keys_ok():
            return
        beat = float(self.beat_var.get().split()[0])
        self.run_bg(core.auto_storyboard, d, self.log,
                    self.settings.get("pexels_keys", ""),
                    self.settings.get("pixabay_keys", ""), beat,
                    self.settings.get("gemini_key", ""),
                    self.settings.get("agnes_key", ""), name="Раскадровка")

    # ---------- 5. Авторендер ----------
    def tab_render(self):
        f = self.page("🎞", "Авторендер")
        ro = self.settings.get("render_opts", {})

        row = ttk.Frame(f)
        row.pack(fill="x", pady=4)
        ttk.Label(row, text="Разрешение:").pack(side="left")
        self.res_var = tk.StringVar(value=ro.get("resolution", "1080p"))
        ttk.Combobox(row, textvariable=self.res_var, values=["1080p", "4K"],
                     width=7, state="readonly").pack(side="left", padx=8)
        ttk.Label(row, text="FPS:").pack(side="left")
        self.fps_var = tk.StringVar(value=str(ro.get("fps", 30)))
        ttk.Combobox(row, textvariable=self.fps_var, values=["24", "30", "60"],
                     width=5, state="readonly").pack(side="left", padx=8)
        ttk.Label(row, text="Интенсивность монтажа:").pack(side="left")
        self.intensity_var = tk.StringVar(value=ro.get("intensity", "средняя"))
        ttk.Combobox(row, textvariable=self.intensity_var,
                     values=["слабая", "средняя", "сильная"],
                     width=9, state="readonly").pack(side="left", padx=8)

        row2 = ttk.Frame(f)
        row2.pack(fill="x", pady=6)
        self.rsubs_var = tk.BooleanVar(value=ro.get("subs", True))
        self.grain_var = tk.BooleanVar(value=ro.get("grain", False))
        self.vignette_var = tk.BooleanVar(value=ro.get("vignette", False))
        self.letterbox_var = tk.BooleanVar(value=ro.get("letterbox", False))
        self.vhs_var = tk.BooleanVar(value=ro.get("vhs", False))
        for text, var in (("Вшить субтитры", self.rsubs_var),
                          ("Зерно", self.grain_var),
                          ("Виньетка", self.vignette_var),
                          ("Letterbox 2.35:1", self.letterbox_var),
                          ("VHS", self.vhs_var)):
            ttk.Checkbutton(row2, text=text, variable=var,
                            style="Switch.TCheckbutton").pack(
                side="left", padx=(0, 14))

        ttk.Separator(f).pack(fill="x", pady=8)
        ttk.Label(f, text="Фоновая музыка (не обязательно — без неё рендер "
                          "просто возьмёт чистый голос)",
                  font=FONT_BOLD).pack(anchor="w")
        mrow = ttk.Frame(f)
        mrow.pack(fill="x", pady=6)
        self.nomusic_var = tk.BooleanVar(value=ro.get("no_music", False))
        ttk.Checkbutton(mrow, text="Без музыки (чистый голос)",
                        variable=self.nomusic_var,
                        style="Switch.TCheckbutton").pack(side="left", padx=(0, 14))
        ttk.Button(mrow, text="🎵 Выбрать свою музыку…",
                   command=self.do_render_music_file).pack(side="left")
        ttk.Label(mrow, text="или по настроению:").pack(side="left", padx=(16, 4))
        self.mood_var = tk.StringVar(value="dark")
        ttk.Combobox(mrow, textvariable=self.mood_var,
                     values=["dark", "tense", "neutral", "uplifting"],
                     width=9, state="readonly").pack(side="left", padx=4)
        ttk.Button(mrow, text="Подобрать из папки",
                   command=self.do_render_music_mood).pack(side="left", padx=8)
        ttk.Label(f, text="«По настроению» ищет в папке музыки (вкладка 2) "
                          "подпапку dark/ tense/ … или слово в имени файла. "
                          "Источник и напоминание о лицензии пишутся в журнал.",
                  style="Muted.TLabel", wraplength=900).pack(anchor="w")

        ttk.Separator(f).pack(fill="x", pady=8)
        ttk.Button(f, text="🎬  СОБРАТЬ ВИДЕО (черновик)", style="Accent.TButton",
                   command=self.do_render).pack(anchor="w", pady=10)
        ttk.Label(f, text="Вход: озвучка + субтитры (таймкоды) + материал из "
                          "video/, images/, storyboard/ (раскадровка сохраняет "
                          "смысловую привязку). Смены кадров — по границам фраз, "
                          "ритм и переходы — от фиксированного seed проекта. "
                          "Выход: output_final.mp4 в папке проекта.",
                  style="Muted.TLabel", wraplength=900).pack(anchor="w")

    def _render_opts(self) -> dict:
        return {"resolution": self.res_var.get(),
                "fps": int(self.fps_var.get()),
                "intensity": self.intensity_var.get(),
                "subs": self.rsubs_var.get(), "grain": self.grain_var.get(),
                "vignette": self.vignette_var.get(),
                "letterbox": self.letterbox_var.get(),
                "vhs": self.vhs_var.get(),
                "no_music": self.nomusic_var.get()}

    def do_render(self):
        d = self.out_dir()
        if not (d / "audio" / "voiceover.mp3").exists():
            messagebox.showwarning(APP_TITLE, "Сначала озвучка (вкладка 2).")
            return
        if not (d / "subs" / "voiceover.srt").exists():
            messagebox.showwarning(APP_TITLE, "Сначала субтитры (вкладка 3) — "
                                              "они дают таймкоды для монтажа.")
            return
        opts = self._render_opts()
        self.settings["render_opts"] = opts
        save_settings(self.settings)

        def prog(done, total):
            def upd():
                self.progress.configure(maximum=total, value=done)
            self.ui(upd)
        self.run_bg(render.render_project, d, self.log, prog, opts,
                    name="Рендер")

    def do_render_music_file(self):
        p = filedialog.askopenfilename(
            filetypes=[("Аудио и видео",
                        "*.mp3 *.wav *.m4a *.ogg *.flac *.mp4 *.aac *.opus *.wma"),
                       ("Все файлы", "*.*")])
        if not p:
            return
        voice = self.out_dir() / "audio" / "voiceover.mp3"
        if not voice.exists():
            messagebox.showwarning(APP_TITLE, "Сначала сделай озвучку.")
            return
        gain = int(self.music_gain_var.get().split()[0])
        self.run_bg(core.add_music, voice, Path(p), self.log, gain,
                    name="Музыка")

    def do_render_music_mood(self):
        music_dir = self.music_var.get().strip() or self.settings.get("music_dir", "")
        if not music_dir or not Path(music_dir).exists():
            messagebox.showwarning(APP_TITLE, "Сначала укажи папку музыки "
                                              "на вкладке 2 (Озвучка).")
            return
        voice = self.out_dir() / "audio" / "voiceover.mp3"
        if not voice.exists():
            messagebox.showwarning(APP_TITLE, "Сначала сделай озвучку.")
            return
        gain = int(self.music_gain_var.get().split()[0])

        def job():
            track = core.pick_music_by_mood(Path(music_dir), self.mood_var.get())
            self.log(f"[Музыка] Настроение «{self.mood_var.get()}» -> {track}")
            core.add_music(voice, track, self.log, gain)
        self.run_bg(job, name="Музыка")

    # ---------- 6. Сборка ----------
    def tab_build(self):
        f = self.page("📦", "Сборка")
        ttk.Label(f, text="Проверка готовности проекта и открытие папки "
                          "для импорта в Premiere Pro / DaVinci Resolve.",
                  style="Muted.TLabel").pack(anchor="w")
        bar = ttk.Frame(f)
        bar.pack(fill="x", pady=8)
        ttk.Button(bar, text="✔  Проверить проект", style="Accent.TButton",
                   command=self.do_check).pack(side="left")
        ttk.Button(bar, text="📂  Открыть папку проекта",
                   command=self.open_folder).pack(side="left", padx=8)
        ttk.Button(bar, text="📝  SEO: названия и описание",
                   command=self.do_seo).pack(side="left")
        self.check_box = self.make_text(f, mono=True, height=14, state="disabled")
        self.check_box.pack(fill="both", expand=True, pady=6)
        self.check_box.tag_configure("ok", foreground=C["ok"])
        self.check_box.tag_configure("err", foreground=C["err"])
        self.check_box.tag_configure("warn", foreground=C["warn"])
        self.check_box.tag_configure("muted", foreground=C["muted"])

    def do_check(self):
        d = self.out_dir()
        voice = d / "audio" / "voiceover.mp3"
        music = d / "audio" / "voiceover_music.mp3"
        items = [
            ("Сценарий", d / "script.txt"),
            ("Озвучка", voice),
            ("Субтитры", d / "subs" / "voiceover.srt"),
            ("Сцены", d / "scenes.txt"),
            ("Манифест стоков", d / "manifest.json"),
            ("Таймлайн для Premiere", d / "sequence.xml"),
        ]
        box = self.check_box
        box.configure(state="normal")
        box.delete("1.0", "end")
        for name, p in items:
            box.insert("end", "  [OK] " if p.exists() else " [НЕТ] ",
                       "ok" if p.exists() else "err")
            box.insert("end", f"{name}: {p}\n")

        vids = list((d / "video").glob("*.mp4")) if (d / "video").exists() else []
        imgs = list((d / "images").glob("*.jpg")) if (d / "images").exists() else []
        box.insert("end", f"\n  {len(vids)} видеоклипов, {len(imgs)} картинок\n")

        # --- Чеклист оригинальности ---
        box.insert("end", "\n  Чеклист оригинальности:\n", "muted")
        dur = core.audio_duration(voice) if voice.exists() else None
        if dur and vids:
            per_clip = dur / len(vids)
            box.insert("end", f"  • Озвучка {dur:.0f} с на {len(vids)} клипов "
                              f"= {per_clip:.0f} с/клип")
            if per_clip > 15:
                box.insert("end", "  — редкие смены плана, добавь сцен "
                                  "или count: 2-3\n", "warn")
            else:
                box.insert("end", "  — норм\n", "ok")
        elif voice.exists() and dur is None:
            box.insert("end", "  • Не смог измерить длительность озвучки "
                              "(нет ffprobe?)\n", "warn")
        if music.exists():
            box.insert("end", "  • Фоновая музыка подмешана (voiceover_music.mp3)\n", "ok")
        else:
            box.insert("end", "  • Нет фоновой музыки — подмешай на вкладке 2\n", "warn")
        n_used = core.used_media_count()
        box.insert("end", f"  • История стоков: {n_used} клипов "
                          "не будут повторяться в следующих видео\n", "muted")
        box.insert("end", "  • Главное — оригинальный сценарий и свой монтаж: "
                          "это инструментом не проверяется\n", "muted")

        box.insert(
            "end", "\n  Импорт в Premiere: перетащи папку проекта в Project panel,\n"
                   "  субтитры — File > Import > voiceover.srt.\n", "muted")
        box.configure(state="disabled")

    def do_seo(self):
        text = self.script_text.get("1.0", "end").strip()
        if not text and (self.out_dir() / "script.txt").exists():
            text = (self.out_dir() / "script.txt").read_text(encoding="utf-8")
        if not text:
            messagebox.showwarning(APP_TITLE, "Нет сценария — вкладка 1 пуста "
                                              "и script.txt в проекте не найден.")
            return
        if not self.ensure_project_dir():
            return

        def job():
            out = core.gen_seo(text, self.settings.get("agnes_key", ""), self.log)
            (self.out_dir() / "seo.txt").write_text(out, encoding="utf-8")

            def show():
                self.check_box.configure(state="normal")
                self.check_box.delete("1.0", "end")
                self.check_box.insert("1.0", out)
                self.check_box.configure(state="disabled")
            self.ui(show)
            self.log(f"[Агент] Сохранено: {self.out_dir() / 'seo.txt'}")
        self.run_bg(job, name="SEO")

    def open_folder(self):
        if not self.ensure_project_dir():
            return
        self._open_path(self.out_dir())

    @staticmethod
    def _open_path(p):
        """Открывает файл/папку системным приложением по умолчанию."""
        if os.name == "nt":
            os.startfile(p)  # noqa
        elif shutil.which("open"):
            subprocess.run(["open", str(p)])
        else:
            subprocess.run(["xdg-open", str(p)])


if __name__ == "__main__":
    App().mainloop()
