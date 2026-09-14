# -*- coding: utf-8 -*-
"""Пусковой файл «Контент-фабрики» — то, что покупатель запускает мышью.

Зачем он вместо `Запустить.bat`. Ярлык на .bat открывает чёрное окно
консоли при КАЖДОМ запуске, даже когда ставить уже нечего: человек видит
мигающий терминал и решает, что что-то сломалось. Плюс .bat с ярлыка
некоторые антивирусы и корпоративные политики просто блокируют.

Логика простая и в этом весь смысл:

  первый запуск (нет .venv или изменился requirements.txt)
      -> показываем окно мастера setup.ps1: там идут проверки Python и
         FFmpeg, сборка окружения и вопросы про ключи, и всё это человек
         обязан видеть;

  дальше
      -> запускаем приложение напрямую через pythonw.exe и выходим.
         Ни одного окна консоли.

Собирается в .exe:
    python -m PyInstaller --noconsole --onefile ^
        --icon ui/icon/icon.ico --name "КонтентФабрика" launcher.py
"""
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path


def base_dir() -> Path:
    """Папка программы.

    В собранном .exe __file__ указывает во временную папку распаковки,
    поэтому корнем считаем место самого исполняемого файла — рядом с ним
    лежат webapp.py, setup\\ и .venv.
    """
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent


ROOT = base_dir()
VENV_PY = ROOT / ".venv" / "Scripts" / "pythonw.exe"
SETUP = ROOT / "setup" / "setup.ps1"
MARKER = ROOT / ".venv" / ".requirements-stamp"
REQ = ROOT / "requirements.txt"

CREATE_NO_WINDOW = 0x08000000


def fail(text: str) -> None:
    """Сообщение об ошибке окном, а не в консоль — консоли здесь нет."""
    try:
        import ctypes
        ctypes.windll.user32.MessageBoxW(None, text, "Контент-фабрика", 0x10)
    except Exception:
        print(text)
    sys.exit(1)


def needs_setup() -> bool:
    """Нужен ли мастер: нет окружения либо изменился список зависимостей.

    Отпечаток requirements.txt держим свой, а не полагаемся на маркер
    setup.ps1: пусковой файл должен уметь решить это сам, ничего не
    запуская, иначе теряется весь выигрыш по времени.
    """
    if not VENV_PY.exists():
        return True
    if not REQ.exists():
        return False
    try:
        current = str(REQ.stat().st_mtime_ns)
        return not (MARKER.exists() and MARKER.read_text(encoding="utf-8").strip() == current)
    except OSError:
        return True


def stamp_requirements() -> None:
    try:
        MARKER.write_text(str(REQ.stat().st_mtime_ns), encoding="utf-8")
    except OSError:
        pass


def run_setup() -> int:
    """Мастер первого запуска — с видимым окном, его вопросы важны."""
    if not SETUP.exists():
        fail(f"Не найден мастер установки:\n{SETUP}\n\n"
             "Похоже, папка программы повреждена — переустановите её.")
    return subprocess.call(
        ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass",
         "-File", str(SETUP), *sys.argv[1:]],
        cwd=str(ROOT),
    )


def launch_app() -> None:
    """Обычный запуск: окно приложения, никакой консоли."""
    app = ROOT / "webapp.py"
    if not app.exists():
        fail(f"Не найден файл приложения:\n{app}")
    subprocess.Popen([str(VENV_PY), str(app)], cwd=str(ROOT),
                     creationflags=CREATE_NO_WINDOW)


def main() -> None:
    os.chdir(ROOT)

    # Флаги пробрасываем мастеру как есть: -Reconfigure заново спрашивает
    # ключи, -SkipLaunch только собирает окружение.
    forced = any(a.lower() in ("-reconfigure", "-skiplaunch") for a in sys.argv[1:])

    if forced or needs_setup():
        code = run_setup()
        if code != 0:
            fail("Установка завершилась с ошибкой.\n\n"
                 "Подробности — в окне, которое только что закрылось. "
                 "Запустите ещё раз, чтобы прочитать сообщение.")
        stamp_requirements()
        # setup.ps1 сам открывает приложение в конце — второй раз не нужно.
        return

    launch_app()


if __name__ == "__main__":
    main()
