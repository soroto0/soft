# -*- coding: utf-8 -*-
"""Рисует icon.ico для ярлыка на рабочем столе (кинохлопушка на тёмном фоне,
в цвет вебаппа: background_color='#130a0a' в webapp.py)."""
from PIL import Image, ImageDraw

SIZE = 256
BG = (19, 10, 10, 255)          # #130a0a — фон окна вебаппа
PANEL = (28, 18, 18, 255)
ACCENT = (232, 163, 61, 255)    # #e8a33d — акцент из Overlay.tsx
ACCENT_LIGHT = (255, 210, 122, 255)
WHITE = (245, 245, 245, 255)

img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

# фон — скруглённый квадрат
pad = 10
d.rounded_rectangle([pad, pad, SIZE - pad, SIZE - pad], radius=48, fill=BG)

# тело хлопушки
body_top = 118
d.rounded_rectangle([40, body_top, SIZE - 40, SIZE - 40], radius=16, fill=PANEL,
                    outline=ACCENT, width=4)

# диагональные полосы на "крышке"
clap_top = 46
clap_h = 62
d.polygon([(34, body_top + 4), (SIZE - 34, body_top + 4),
          (SIZE - 46, clap_top), (46, clap_top)], fill=PANEL,
         outline=ACCENT, width=4)
stripe_w = 22
x = 50
flip = False
while x < SIZE - 60:
    poly = [(x, clap_top), (x + stripe_w, clap_top),
           (x + stripe_w - 14, body_top), (x - 14, body_top)]
    d.polygon(poly, fill=(ACCENT if flip else WHITE))
    x += stripe_w
    flip = not flip

# нижняя "полоска записи" — акцентная линия + точка (REC)
d.ellipse([64, SIZE - 78, 84, SIZE - 58], fill=(220, 70, 60, 255))
d.rounded_rectangle([100, SIZE - 74, SIZE - 64, SIZE - 62], radius=6,
                    fill=ACCENT_LIGHT)

sizes = [(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)]
img.save("icon.ico", sizes=sizes)
print("OK: icon.ico")
