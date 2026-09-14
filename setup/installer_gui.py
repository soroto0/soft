# -*- coding: utf-8 -*-
"""Установщик одним файлом: Установить-КонтентФабрику.exe

ЗАЧЕМ ОН ЕСТЬ. До него покупатель получал zip и должен был сам сообразить,
куда его распаковать, не запускать из папки «Загрузки» (там Windows режет
права и половина шагов падает), и найти внутри нужный .bat. Каждый из этих
шагов — место, где сделка срывается уже после оплаты, а разбираться придётся
владельцу по переписке.

ЧЕГО ОН НАМЕРЕННО НЕ ДЕЛАЕТ.

  Не просит прав администратора. Ставит в папку пользователя, а не в
  Program Files: администратор нужен только ради красивого пути, зато он
  отпугивает и упирается в корпоративные запреты.

  Не ставит зависимости Python. Их около двух гигабайт, и качаются они
  15 минут — держать всё это время окно установщика бессмысленно. Этим
  занимается первый запуск (setup.ps1), где уже есть полоса прогресса.
  Установщик отвечает ровно за одно: разложить файлы и дать ярлык.

  Не пишет в реестр и не заводит «Удаление программ». Удаление — это
  удалить папку, и так честнее: программа не оставляет следов в системе.

Собирается из setup/build_installer_exe.ps1.
"""
from __future__ import annotations

import os
import subprocess
import sys
import tempfile
import threading
import tkinter as tk
import zipfile
from pathlib import Path
from tkinter import filedialog, font as tkfont

APP_NAME = "Контент-фабрика"
ARCHIVE = "kontent-fabrika.zip"
INNER = "kontent-fabrika"      # папка внутри архива
BG = "#f5f5f7"
INK = "#1d1d1f"
DIM = "#8e8e93"
ACCENT = "#b8892c"


def resource(name: str) -> Path:
    """Файл, вшитый в exe. PyInstaller распаковывает их в _MEIPASS."""
    base = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent))
    return base / name


def default_target() -> Path:
    """Папка пользователя, а не Program Files — см. шапку файла."""
    return Path(os.path.expanduser("~")) / "КонтентФабрика"


def make_shortcut(target_exe: Path, work_dir: Path, where: Path, name: str) -> bool:
    """Ярлык через WScript.Shell.

    Именно PowerShell, а не pywin32: тянуть ради одного ярлыка целую
    библиотеку в exe — лишние мегабайты, а WScript.Shell есть в любой
    Windows с прошлого века.
    """
    lnk = where / f"{name}.lnk"
    ps = (
        "$s = (New-Object -ComObject WScript.Shell).CreateShortcut('%s');"
        "$s.TargetPath = '%s';"
        "$s.WorkingDirectory = '%s';"
        "$s.IconLocation = '%s';"
        "$s.Save()"
    ) % (lnk, target_exe, work_dir, target_exe)
    try:
        subprocess.run(["powershell", "-NoProfile", "-NonInteractive", "-Command", ps],
                       check=True, capture_output=True,
                       creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
        return lnk.exists()
    except Exception:
        return False


class Installer:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.busy = False
        root.title(f"{APP_NAME} — установка")
        root.configure(bg=BG)
        root.resizable(False, False)

        big = tkfont.Font(family="Segoe UI", size=16, weight="bold")
        mid = tkfont.Font(family="Segoe UI", size=10)
        small = tkfont.Font(family="Segoe UI", size=8)

        tk.Label(root, text=APP_NAME, font=big, bg=BG, fg=INK).pack(pady=(26, 2))
        tk.Label(root, text="сценарий → озвучка → монтаж → готовый ролик",
                 font=mid, bg=BG, fg=DIM).pack()

        box = tk.Frame(root, bg=BG)
        box.pack(padx=30, pady=(24, 6), fill="x")
        tk.Label(box, text="Куда установить:", font=small, bg=BG, fg=DIM).pack(anchor="w")

        row = tk.Frame(box, bg=BG)
        row.pack(fill="x", pady=(4, 0))
        self.path = tk.Entry(row, font=mid, relief="flat", bg="white", fg=INK,
                             borderwidth=6)
        self.path.insert(0, str(default_target()))
        self.path.pack(side="left", fill="x", expand=True)
        tk.Button(row, text="Обзор…", font=small, relief="flat", bg="#e8e8ed",
                  fg=INK, borderwidth=0, padx=12, pady=6,
                  command=self.browse).pack(side="left", padx=(8, 0))

        self.status = tk.Label(root, text="Займёт меньше минуты. Права "
                                          "администратора не нужны.",
                               font=small, bg=BG, fg=DIM, wraplength=430,
                               justify="left")
        self.status.pack(padx=30, pady=(14, 0), anchor="w")

        # Полоса рисуется вручную: ttk.Progressbar тянет тему, которая на
        # части систем выглядит чужеродно рядом с плоским окном.
        self.bar_bg = tk.Frame(root, bg="#e3e3e8", height=4)
        self.bar_bg.pack(padx=30, pady=(10, 0), fill="x")
        self.bar = tk.Frame(self.bar_bg, bg=ACCENT, height=4, width=0)
        self.bar.place(x=0, y=0)

        self.btn = tk.Button(root, text="Установить", font=mid, relief="flat",
                             bg=ACCENT, fg="white", borderwidth=0,
                             padx=28, pady=10, command=self.start)
        self.btn.pack(pady=(20, 26))

        root.update_idletasks()
        root.geometry(f"490x{root.winfo_reqheight()}")

    # ---------- интерфейс ----------

    def browse(self):
        if self.busy:
            return
        chosen = filedialog.askdirectory(title="Куда установить")
        if chosen:
            self.path.delete(0, "end")
            self.path.insert(0, str(Path(chosen) / "КонтентФабрика"))

    def say(self, text: str, colour: str = DIM):
        self.status.config(text=text, fg=colour)
        self.root.update_idletasks()

    def progress(self, done: int, total: int):
        width = self.bar_bg.winfo_width() or 430
        self.bar.config(width=int(width * (done / max(1, total))))
        self.root.update_idletasks()

    def start(self):
        if self.busy:
            return
        self.busy = True
        self.btn.config(state="disabled", text="Устанавливаю…")
        threading.Thread(target=self.run, daemon=True).start()

    # ---------- работа ----------

    def run(self):
        try:
            self.install(Path(self.path.get().strip()))
        except Exception as exc:                      # noqa: BLE001
            self.say(f"Не получилось: {exc}", "#c0392b")
            self.btn.config(state="normal", text="Попробовать снова")
            self.busy = False

    def install(self, target: Path):
        src = resource(ARCHIVE)
        if not src.exists():
            raise FileNotFoundError("архив не вшит в установщик")

        # Существующая папка с файлами — не повод молча всё перетереть:
        # там могут лежать чужие проекты и уже вписанные ключи.
        if target.exists() and any(target.iterdir()):
            marker = target / "webapp.py"
            if not marker.exists():
                raise RuntimeError(f"папка {target} не пуста и это не "
                                   f"{APP_NAME} — выбери другую")
            self.say("Обновляю уже установленную копию…")

        target.mkdir(parents=True, exist_ok=True)

        self.say("Распаковываю файлы…")
        with zipfile.ZipFile(src) as z:
            names = z.namelist()
            for i, name in enumerate(names, 1):
                # Архив собран с внутренней папкой; кладём её содержимое
                # прямо в выбранную папку, иначе получится вложенность
                # КонтентФабрика\kontent-fabrika\...
                rel = name[len(INNER) + 1:] if name.startswith(INNER + "/") else name
                if not rel:
                    continue
                dest = target / rel
                if name.endswith("/"):
                    dest.mkdir(parents=True, exist_ok=True)
                else:
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    with z.open(name) as fsrc, open(dest, "wb") as fdst:
                        fdst.write(fsrc.read())
                if i % 20 == 0 or i == len(names):
                    self.progress(i, len(names))

        exe = target / "КонтентФабрика.exe"
        if not exe.exists():
            exe = target / "Запустить.bat"

        self.say("Делаю ярлык на рабочем столе…")
        desktop = Path(os.path.expanduser("~")) / "Desktop"
        made = desktop.exists() and make_shortcut(exe, target, desktop, APP_NAME)

        self.progress(1, 1)
        tail = "" if made else " Ярлык сделать не удалось — запускай из папки."
        self.say(f"Готово. Установлено в {target}." + tail
                 + " При первом запуске программа доставит недостающее "
                   "(около 15 минут, один раз).", INK)
        self.btn.config(state="normal", text="Запустить",
                        command=lambda: self.launch(exe))
        self.busy = False

    def launch(self, exe: Path):
        try:
            os.startfile(str(exe))
        except Exception:
            pass
        self.root.after(400, self.root.destroy)


class Silent:
    """Установка без окна: Установить-КонтентФабрику.exe --silent <папка>

    Зачем. Во-первых, так проверяется РОВНО тот файл, который уедет
    покупателю, а не исходник рядом: окно кнопкой не нажать из скрипта, и
    без этого режима exe остаётся непроверенным. Во-вторых, тем, кто ставит
    софт на несколько машин, окно только мешает.

    Собрано с --windowed, консоли нет, поэтому итог пишется в файл
    install.log рядом с установленным и отдаётся кодом возврата.
    """

    def __init__(self, target: Path):
        self.target = target
        self.lines: list[str] = []

    def say(self, text: str, colour: str = ""):
        self.lines.append(text)

    def progress(self, done: int, total: int):
        pass

    class _Btn:
        def config(self, **kw):
            pass

    def run(self) -> int:
        self.btn = Silent._Btn()
        try:
            Installer.install(self, self.target)
            code = 0
        except Exception as exc:                     # noqa: BLE001
            self.lines.append(f"ОШИБКА: {exc}")
            code = 1
        # Саму целевую папку создать не вышло (недопустимое имя, нет прав) —
        # именно тогда лог нужнее всего, а он падал молча: вторая попытка
        # mkdir той же самой неисправной папки валилась той же ошибкой, и
        # except глотал её без следа. Проверено запуском на "C:\...\test?name"
        # и на пути под System32 без прав — install.log не появлялся вовсе,
        # хотя докстринг класса обещает, что итог всегда пишется в файл.
        # Чиним в два шага: сперва пробуем ближайшую папку-предка, которая
        # реально существует, — но и она бывает недоступна на запись (та же
        # System32\drivers без прав администратора, проверено запуском).
        # Поэтому конечный запасной вариант — системная temp-папка: туда
        # текущий пользователь пишет всегда, и код возврата не останется
        # единственным следом причины.
        candidates = [self.target, *self.target.parents,
                      Path(tempfile.gettempdir())]
        for log_dir in candidates:
            if not log_dir.exists():
                try:
                    log_dir.mkdir(parents=True, exist_ok=True)
                except OSError:
                    continue
            try:
                (log_dir / "install.log").write_text(
                    "\n".join(self.lines) + "\n", encoding="utf-8")
                break
            except OSError:
                continue
        return code


def main() -> int:
    if "--silent" in sys.argv:
        i = sys.argv.index("--silent")
        where = sys.argv[i + 1] if len(sys.argv) > i + 1 else str(default_target())
        return Silent(Path(where)).run()

    root = tk.Tk()
    try:
        root.iconbitmap(str(resource("icon.ico")))
    except Exception:
        pass                     # значок необязателен, окно важнее
    Installer(root)
    root.mainloop()
    return 0


if __name__ == "__main__":
    sys.exit(main())
