# -*- coding: utf-8 -*-
"""Окно активации: то, что покупатель видит при первом запуске.

Почему tkinter, а не pywebview, на котором сделано само приложение. Pywebview
разрешает `webview.start()` один раз за процесс; если потратить его на окно
активации, главное окно уже не откроется. Tkinter лежит в стандартной
библиотеке, работает под `pythonw.exe` (то есть без чёрного окна консоли) и
с pywebview не пересекается вовсе.

Приложение зовёт отсюда одну функцию:

    import license_gate
    if not license_gate.ensure_licensed():
        return          # покупатель закрыл окно или не активировался
"""
from __future__ import annotations

import threading
import tkinter as tk
from tkinter import font as tkfont

import license_client

TITLE = "Контент-фабрика — активация"
SUPPORT = "Ключ присылает продавец после оплаты."


def ensure_licensed(parent_title: str = TITLE) -> bool:
    """Пустить дальше или показать окно активации.

    Возвращает True, если лицензия в порядке — сразу или после того, как
    покупатель ввёл рабочий ключ.
    """
    state = license_client.check()
    if state.ok:
        return True
    # Ключа нет вовсе либо он больше не годится — в обоих случаях спрашиваем.
    if _ask_key(state.reason, parent_title):
        return True

    # Окно закрыли, не активировавшись. Молча выйти нельзя: человек только
    # что ждал пятнадцать минут установки, и исчезнувшая без слова программа
    # читается как поломка, а не как «нет ключа».
    _say_goodbye()
    return False


def _say_goodbye() -> None:
    try:
        import ctypes
        ctypes.windll.user32.MessageBoxW(
            None,
            "Программа не запущена: не введён лицензионный ключ.\n\n"
            "Ключ присылает продавец после оплаты — вставьте его в окно "
            "активации при следующем запуске.\n\n"
            "Хотите сначала посмотреть, как всё работает? Попросите у "
            "продавца ДЕМО-версию: она открывается без ключа и делает "
            "три полноценных ролика.",
            "Контент-фабрика",
            0x40,  # значок «информация», а не «ошибка» — это не сбой
        )
    except Exception:
        pass


def _ask_key(reason: str, title: str) -> bool:
    result = {"ok": False}

    root = tk.Tk()
    root.title(title)
    root.resizable(False, False)
    root.configure(bg="#f5f5f7")

    # По центру экрана: окно маленькое, в углу его теряют.
    w, h = 520, 330
    x = (root.winfo_screenwidth() - w) // 2
    y = (root.winfo_screenheight() - h) // 3
    root.geometry(f"{w}x{h}+{x}+{y}")

    head_font = tkfont.Font(family="Segoe UI", size=15, weight="bold")
    body_font = tkfont.Font(family="Segoe UI", size=10)
    key_font = tkfont.Font(family="Consolas", size=14)

    tk.Label(root, text="Введите ключ", font=head_font, bg="#f5f5f7",
             fg="#1d1d1f").pack(pady=(26, 4))
    tk.Label(root, text=SUPPORT, font=body_font, bg="#f5f5f7",
             fg="#6e6e73").pack()

    entry = tk.Entry(root, font=key_font, justify="center", width=22,
                     relief="solid", borderwidth=1)
    entry.pack(pady=(20, 6), ipady=6)
    entry.insert(0, "KF-")
    entry.icursor(tk.END)
    entry.focus_set()

    status = tk.Label(root, text=reason, font=body_font, bg="#f5f5f7",
                      fg="#c0392b", wraplength=440, justify="center", height=3)
    status.pack(pady=(4, 0))

    btn = tk.Button(root, text="Активировать", font=body_font, width=18,
                    relief="flat", bg="#0071e3", fg="white",
                    activebackground="#0077ed", activeforeground="white",
                    cursor="hand2")
    btn.pack(pady=(4, 0))

    # Отпечаток — не украшение: при покупке «навсегда» покупатель обязан
    # прислать его продавцу, иначе ключ выписать не под что. Поэтому он
    # лежит в поле, откуда его можно выделить и скопировать, а не в подписи.
    small = tkfont.Font(family="Segoe UI", size=8)
    bottom = tk.Frame(root, bg="#f5f5f7")
    bottom.pack(side="bottom", pady=(0, 12))
    tk.Label(bottom, text="Код этого компьютера — отправьте его продавцу, "
                          "если покупаете лицензию «Навсегда»:",
             font=small, bg="#f5f5f7", fg="#8e8e93").pack()

    mid = tk.Entry(bottom, font=tkfont.Font(family="Consolas", size=9),
                   justify="center", width=20, relief="flat",
                   readonlybackground="#f5f5f7", fg="#3a3a3c", borderwidth=0)
    mid.insert(0, license_client.machine_id())
    mid.config(state="readonly")
    mid.pack(pady=(2, 0))

    def finish(ok: bool, message: str, colour: str) -> None:
        status.config(text=message, fg=colour)
        btn.config(state="normal", text="Активировать")
        entry.config(state="normal")
        if ok:
            result["ok"] = True
            root.after(900, root.destroy)

    def activate(_event=None) -> None:
        key = entry.get().strip().upper()
        if len(key) < 8:
            status.config(text="Ключ слишком короткий — проверьте, всё ли скопировалось.",
                          fg="#c0392b")
            return

        btn.config(state="disabled", text="Проверяю…")
        entry.config(state="disabled")
        status.config(text="Связываюсь с сервером…", fg="#6e6e73")

        def job() -> None:
            # Сеть в отдельном потоке, иначе окно замирает на время запроса.
            license_client.save_config(key)
            state = license_client.check()
            if state.ok:
                root.after(0, finish, True, f"Готово: {state.human()}", "#1d7a3e")
            else:
                root.after(0, finish, False, state.reason, "#c0392b")

        threading.Thread(target=job, daemon=True).start()

    btn.config(command=activate)
    entry.bind("<Return>", activate)
    root.bind("<Escape>", lambda _e: root.destroy())

    root.mainloop()
    return result["ok"]


if __name__ == "__main__":
    print("Пустили в приложение:", ensure_licensed())
