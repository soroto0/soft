#!/usr/bin/env python3
"""
Моушн-графика: оверлеи поверх видеоряда.

Типы: popup (картинка-вырезка с пружинкой), lower3 (плашка),
callout (выноска с изогнутой стрелкой), counter (счётчик),
bars (растущие бары), timeline (полоска с датами), compare (два блока
текста с пунктиром между ними), banner (широкая яркая плашка сверху).

Управление — overlays.txt в папке проекта, одна строка на оверлей:
    timecode | тип | контент | позиция | длительность
    00:01:23 | popup | images/suspect1.jpg | top-right | 5s
    00:02:10 | lower3 | Portland Airport, 1971 | bottom | 4s
    00:03:45 | callout | The rear stairs | point:70,60 | 3s
    00:05:00 | counter | $200,000 | center | 3s
    00:06:00 | bars | Found:30,Missing:70 | center | 4s
    00:07:00 | timeline | 1971:Hijacking,1980:Money found | bottom | 5s
    00:08:00 | compare | Hidden foundation gaps|Dry bait reaches deep crevices | center | 4s
    00:09:00 | banner | Dates matter: note the year and context | top | 4s

Кадры анимации считаются в Pillow (пружина/ease-out), пишутся
PNG-секвенциями и накладываются в финальном проходе ffmpeg через
overlay + enable='between(t,...)'. Упавший оверлей — warning и пропуск.
"""

import os
import re
import json
import math
import shutil
import subprocess
from pathlib import Path

from core import srt_to_seconds

ACCENT = (124, 92, 255, 255)        # фиолетовый бренд-акцент
PLATE = (12, 12, 18, 200)           # полупрозрачная тёмная подложка
WHITE = (255, 255, 255, 255)


# ---------- Утилиты ----------

SS = 2  # суперсэмплинг: рисуем в 2x и уменьшаем — гладкие края и текст


def _ease_out(k: float) -> float:
    k = min(max(k, 0.0), 1.0)
    return 1 - (1 - k) ** 3


def _ease_in(k: float) -> float:
    k = min(max(k, 0.0), 1.0)
    return k ** 3


def _ease_out_back(k: float, s: float = 1.70158) -> float:
    """Ease-out с перелётом (overshoot) — «живой» приход в точку."""
    k = min(max(k, 0.0), 1.0) - 1
    return k * k * ((s + 1) * k + s) + 1


def _spring(t: float) -> float:
    """Пружина появления: 0 -> 1.08 -> покачивание -> 1.0 (t в секундах)."""
    if t < 0.28:
        return 1.08 * _ease_out(t / 0.28)
    return 1 + 0.08 * math.cos((t - 0.28) * 8) * math.exp(-(t - 0.28) * 6)


def _hit(t: float, t0: float) -> float:
    """Затухающий «удар» масштаба после момента t0 (для счётчика)."""
    if t < t0:
        return 1.0
    dt = t - t0
    return 1 + 0.08 * math.exp(-6 * dt) * math.cos(10 * dt)


def _font(size: int):
    from PIL import ImageFont
    cands = sorted((Path(__file__).parent / "assets" / "fonts").glob("*.ttf")) \
        if (Path(__file__).parent / "assets" / "fonts").exists() else []
    cands += [Path(r"C:\Windows\Fonts\arialbd.ttf"),
              Path(r"C:\Windows\Fonts\segoeuib.ttf"),
              Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")]
    for p in cands:
        if p.exists():
            try:
                return ImageFont.truetype(str(p), size)
            except OSError:
                continue
    return ImageFont.load_default()


def _save_frames(frames, dest_dir: Path):
    dest_dir.mkdir(parents=True, exist_ok=True)
    for i, im in enumerate(frames):
        im.save(dest_dir / f"{i:04d}.png")


def _fade(im, alpha: float):
    """Умножает альфа-канал кадра (0..1)."""
    if alpha >= 0.999:
        return im
    a = im.getchannel("A").point(lambda v: int(v * max(alpha, 0)))
    im.putalpha(a)
    return im


# ---------- Разбор overlays.txt ----------

def parse_overlays(text: str) -> list[dict]:
    """-> [{t, type, content, pos, dur}], битые строки пропускаются."""
    items = []
    for ln, line in enumerate(text.splitlines(), 1):
        line = line.strip()
        if not line or line.startswith("#") or "NEEDS_IMAGE" in line:
            continue
        parts = [p.strip() for p in line.split("|")]
        if len(parts) < 3:
            continue
        tc = parts[0]
        if not re.match(r"^\d{1,2}:\d{2}(:\d{2})?([.,]\d+)?$", tc):
            continue
        if tc.count(":") == 1:
            tc = "00:" + tc
        t = srt_to_seconds(tc.replace(".", ","))
        otype = parts[1].lower()
        if otype not in ("popup", "lower3", "callout", "counter",
                         "bars", "timeline", "infographic",
                         "compare", "banner"):
            continue
        pos = parts[3] if len(parts) > 3 and parts[3] else ""
        dur = 4.0
        if len(parts) > 4:
            m = re.search(r"([\d.]+)", parts[4])
            if m:
                dur = max(1.0, min(float(m.group(1)), 15.0))
        items.append({"t": t, "type": otype, "content": parts[2],
                      "pos": pos, "dur": dur, "line": ln})
    return items


# ---------- Рендереры (каждый пишет PNG-секвенцию, возвращает (w, h)) ----------

def render_popup(img_path: Path, dur: float, fps: int, W: int, H: int,
                 dest_dir: Path):
    """Картинка-«вырезка»: пружинка с motion blur на влёте, покачивание
    и лёгкое парение; уход — схлопывание или вылет за край (чередуется
    детерминированно по имени файла)."""
    from PIL import Image, ImageFilter, ImageDraw
    src = Image.open(img_path).convert("RGBA")
    max_w = int(W * 0.38)
    if src.width > max_w:
        src = src.resize((max_w, int(src.height * max_w / src.width)),
                         Image.LANCZOS)
    b = 12  # рамка-«полароид»
    card = Image.new("RGBA", (src.width + b * 2, src.height + b * 2), WHITE)
    card.paste(src, (b, b), src)
    sh = Image.new("RGBA", (card.width + 48, card.height + 48), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle(
        (24, 30, 24 + card.width, 30 + card.height), 6, fill=(0, 0, 0, 150))
    sh = sh.filter(ImageFilter.GaussianBlur(12))
    base = Image.new("RGBA", sh.size, (0, 0, 0, 0))
    base.alpha_composite(sh)
    base.alpha_composite(card, (24, 18))

    cw, ch = int(base.width * 1.35) // 2 * 2, int(base.height * 1.35) // 2 * 2
    exit_slide = (sum(img_path.name.encode()) % 2 == 0)   # вариант ухода
    t_exit = dur - 0.35
    n = max(int(dur * fps), 2)
    frames = []
    for i in range(n):
        t = i / fps
        s = _spring(t)
        dx = 0
        ang = 2.5 + 1.2 * math.sin(t * 0.9)      # наклон + качание
        dy = 4 * math.sin(t * 1.6)               # парение по вертикали
        if t > t_exit:
            k = (t - t_exit) / 0.35
            if exit_slide:                       # вылет вправо с разгоном
                dx = int(_ease_in(k) * cw * 1.2)
                ang += 10 * _ease_in(k)
            else:                                # схлопывание
                s *= _ease_out(1 - k)
        s = max(s, 0.001)
        img = base.resize((max(int(base.width * s), 1),
                           max(int(base.height * s), 1)), Image.LANCZOS)
        if t < 0.30:                             # motion blur на влёте
            img = img.filter(ImageFilter.GaussianBlur(4 * (1 - t / 0.30)))
        img = img.rotate(ang, resample=Image.BICUBIC, expand=True)
        fr = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
        fr.alpha_composite(img, ((cw - img.width) // 2 + dx,
                                 (ch - img.height) // 2 + int(dy)))
        frames.append(fr)
    _save_frames(frames, dest_dir)
    return cw, ch


def render_lower3(text: str, dur: float, fps: int, W: int, H: int,
                  dest_dir: Path):
    """Плашка в три фазы: акцентная полоска прорисовывается сверху вниз ->
    подложка раскрывается вправо с лёгким перелётом -> текст выезжает
    из-под маски. Уход — скольжение влево с растворением. Рисуется в 2x."""
    from PIL import Image, ImageDraw, ImageFilter
    f = _font(int(H * 0.042) * SS)
    pad, strip = 26 * SS, 8 * SS
    tmp = Image.new("RGBA", (10, 10))
    tw = int(ImageDraw.Draw(tmp).textlength(text, font=f))
    cw2 = min(tw + pad * 2 + strip + 20 * SS, int(W * 0.62) * SS) // 2 * 2
    ch2 = (int(H * 0.042) * SS + pad) // 2 * 2 + 14 * SS
    cw, ch = cw2 // SS // 2 * 2, ch2 // SS // 2 * 2

    # статичные слои готовим один раз
    text_layer = Image.new("RGBA", (cw2, ch2), (0, 0, 0, 0))
    dt_ = ImageDraw.Draw(text_layer)
    tx, ty = strip + pad, (ch2 - f.size) // 2 - 2 * SS
    dt_.text((tx + 2 * SS, ty + 3 * SS), text, font=f, fill=(0, 0, 0, 160))
    text_layer = text_layer.filter(ImageFilter.GaussianBlur(2 * SS))
    dt_ = ImageDraw.Draw(text_layer)
    dt_.text((tx, ty), text, font=f, fill=WHITE)

    mask = Image.new("L", (cw2, ch2), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, cw2 - 1, ch2 - 1),
                                           10 * SS, fill=255)
    n = max(int(dur * fps), 2)
    frames = []
    for i in range(n):
        t = i / fps
        fr = Image.new("RGBA", (cw2, ch2), (0, 0, 0, 0))
        d = ImageDraw.Draw(fr)
        # фаза 2: подложка раскрывается вправо (с лёгким перелётом)
        if t > 0.12:
            k2 = max(min(_ease_out_back((t - 0.12) / 0.4, 0.9), 1.04), 0)
            pw = strip + int((cw2 - strip) * k2)
            d.rounded_rectangle((0, 0, min(pw, cw2) - 1, ch2 - 1),
                                10 * SS, fill=PLATE)
        # фаза 1: акцентная полоска растёт сверху вниз (поверх подложки)
        k1 = _ease_out(t / 0.22)
        d.rounded_rectangle((0, 0, strip, max(int(ch2 * k1), 2)),
                            3 * SS, fill=ACCENT)
        # фаза 3: текст выезжает снизу, обрезаясь маской плашки
        if t > 0.32:
            from PIL import ImageChops
            k3 = _ease_out((t - 0.32) / 0.3)
            shifted = Image.new("RGBA", (cw2, ch2), (0, 0, 0, 0))
            shifted.alpha_composite(text_layer,
                                    (0, int((1 - k3) * ch2 * 0.5)))
            shifted.putalpha(ImageChops.multiply(shifted.getchannel("A"),
                                                 mask))
            fr.alpha_composite(shifted)
        # уход: скольжение влево + растворение
        if t > dur - 0.3:
            k = (dur - t) / 0.3
            sl = Image.new("RGBA", (cw2, ch2), (0, 0, 0, 0))
            sl.alpha_composite(fr, (-int((1 - k) * 60 * SS), 0))
            fr = _fade(sl, k)
        frames.append(fr.resize((cw, ch), Image.LANCZOS))
    _save_frames(frames, dest_dir)
    return cw, ch


def render_callout(text: str, point: tuple[float, float], dur: float,
                   fps: int, W: int, H: int, dest_dir: Path):
    """Выноска: круг у точки, линия прорисовывается 0.3 c, затем текст.
    Канва — весь кадр (позиция задаётся точкой point:x,y в процентах)."""
    from PIL import Image, ImageDraw
    f = _font(int(H * 0.038))
    px, py = int(W * point[0] / 100), int(H * point[1] / 100)
    # блок текста: справа от точки, если точка в левой половине, иначе слева
    tmp = Image.new("RGBA", (10, 10))
    tw = int(ImageDraw.Draw(tmp).textlength(text, font=f))
    bw, bh = tw + 44, int(H * 0.038) + 34
    right = point[0] < 55
    bx = min(px + int(W * 0.12), W - bw - 20) if right \
        else max(px - int(W * 0.12) - bw, 20)
    by = max(min(py - int(H * 0.14), H - bh - 20), 20)
    ex, ey = (bx if right else bx + bw), by + bh // 2   # конец линии

    # блок текста готовим один раз (2x), анимируем масштабом-пружиной
    blk = Image.new("RGBA", (bw * SS, bh * SS), (0, 0, 0, 0))
    f2 = _font(int(H * 0.038) * SS)
    db = ImageDraw.Draw(blk)
    db.rounded_rectangle((0, 0, bw * SS - 1, bh * SS - 1), 10 * SS,
                         fill=PLATE, outline=ACCENT, width=2 * SS)
    db.text((22 * SS, 15 * SS), text, font=f2, fill=WHITE)
    bcx, bcy = bx + bw // 2, by + bh // 2

    n = max(int(dur * fps), 2)
    frames = []
    for i in range(n):
        t = i / fps
        big = Image.new("RGBA", (W * SS, H * SS), (0, 0, 0, 0))
        d = ImageDraw.Draw(big)
        k = _ease_out(t / 0.3)
        # круг у точки прорисовывается по дуге
        d.arc(((px - 34) * SS, (py - 34) * SS,
               (px + 34) * SS, (py + 34) * SS), start=-90,
              end=-90 + 360 * k, fill=ACCENT, width=5 * SS)
        # пульсирующие кольца после прорисовки (двойной радар)
        for t0 in (0.45, 1.15):
            if t > t0:
                kp = min((t - t0) / 0.6, 1.0)
                r = int((34 + 52 * _ease_out(kp)) * SS)
                a = int(220 * (1 - kp))
                if a > 4:
                    d.arc(((px * SS - r), (py * SS - r),
                           (px * SS + r), (py * SS + r)),
                          0, 360, fill=ACCENT[:3] + (a,), width=3 * SS)
        # линия с бегущей точкой на конце
        lx, ly = px + (ex - px) * k, py + (ey - py) * k
        d.line((px * SS, py * SS, lx * SS, ly * SS),
               fill=ACCENT, width=4 * SS)
        if k < 1:
            d.ellipse((lx * SS - 7 * SS, ly * SS - 7 * SS,
                       lx * SS + 7 * SS, ly * SS + 7 * SS), fill=WHITE)
        # блок текста — приход мини-пружиной
        if t > 0.3:
            kb = _ease_out_back(min((t - 0.3) / 0.3, 1.0), 1.2)
            s = 0.72 + 0.28 * kb
            sw, sh_ = max(int(bw * SS * s), 1), max(int(bh * SS * s), 1)
            scaled = blk.resize((sw, sh_), Image.LANCZOS)
            scaled = _fade(scaled, _ease_out((t - 0.3) / 0.2))
            big.alpha_composite(scaled, (bcx * SS - sw // 2,
                                         bcy * SS - sh_ // 2))
        if t > dur - 0.3:
            _fade(big, (dur - t) / 0.3)
        frames.append(big.resize((W, H), Image.LANCZOS))
    _save_frames(frames, dest_dir)
    return W, H


def render_counter(content: str, dur: float, fps: int, W: int, H: int,
                   dest_dir: Path):
    """Счётчик: число накручивается от 0 до значения за 60% времени."""
    from PIL import Image, ImageDraw
    from PIL import ImageFilter
    m = re.search(r"([^\d]*)([\d][\d,. ]*)(.*)", content)
    if not m:
        raise ValueError(f"counter: нет числа в «{content}»")
    prefix, digits, suffix = m.group(1), m.group(2), m.group(3)
    value = int(re.sub(r"[^\d]", "", digits) or "0")
    grouped = "," in digits or value >= 10000
    f = _font(int(H * 0.12) * SS)
    cw, ch = int(W * 0.62) // 2 * 2, int(H * 0.22) // 2 * 2
    cw2, ch2 = cw * SS, ch * SS
    t_hit = max(dur * 0.6, 0.1)              # момент прихода к числу

    # мягкая тёмная подсветка позади цифр (читаемость на любом фоне)
    glow = Image.new("RGBA", (cw2, ch2), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse((cw2 * 0.08, ch2 * 0.10,
                                  cw2 * 0.92, ch2 * 0.95),
                                 fill=(0, 0, 0, 130))
    glow = glow.filter(ImageFilter.GaussianBlur(30 * SS))

    n = max(int(dur * fps), 2)
    frames = []
    for i in range(n):
        t = i / fps
        k = _ease_out(t / t_hit)
        cur = int(value * k)
        s = f"{prefix}{cur:,}{suffix}" if grouped else f"{prefix}{cur}{suffix}"
        layer = Image.new("RGBA", (cw2, ch2), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        twd = d.textlength(s, font=f)
        jitter = int(2 * SS * math.sin(t * 43)) if k < 1 else 0  # дрожь счёта
        d.text(((cw2 - twd) / 2, ch2 * 0.14 + jitter), s, font=f,
               fill=WHITE, stroke_width=7 * SS, stroke_fill=(0, 0, 0, 235))
        scale = _hit(t, t_hit)               # «удар» на финальном числе
        fr = Image.new("RGBA", (cw2, ch2), (0, 0, 0, 0))
        fr.alpha_composite(glow)
        if abs(scale - 1) > 0.002:
            sw, sh_ = max(int(cw2 * scale), 1), max(int(ch2 * scale), 1)
            layer = layer.resize((sw, sh_), Image.LANCZOS)
            fr.alpha_composite(layer, ((cw2 - layer.width) // 2,
                                       (ch2 - layer.height) // 2))
        else:
            fr.alpha_composite(layer)
        _fade(fr, min(_ease_out(t / 0.25), _ease_out((dur - t) / 0.3)))
        frames.append(fr.resize((cw, ch), Image.LANCZOS))
    _save_frames(frames, dest_dir)
    return cw, ch


def render_bars(content: str, dur: float, fps: int, W: int, H: int,
                dest_dir: Path):
    """Растущие бары: content = 'label:value,label:value,...'"""
    from PIL import Image, ImageDraw
    pairs = []
    for chunk in content.split(","):
        if ":" in chunk:
            lab, _, val = chunk.partition(":")
            try:
                pairs.append((lab.strip(), float(re.sub(r"[^\d.]", "",
                                                        val) or 0)))
            except ValueError:
                continue
    if not pairs:
        raise ValueError(f"bars: нет пар label:value в «{content}»")
    vmax = max(v for _, v in pairs) or 1
    f = _font(int(H * 0.032) * SS)
    row_h, gap = int(H * 0.06) * SS, 14 * SS
    cw = int(W * 0.5) // 2 * 2
    ch = ((len(pairs) * (row_h + gap) + 20 * SS) // SS) // 2 * 2
    cw2, ch2 = cw * SS, ch * SS
    bar_x = int(cw2 * 0.30)

    n = max(int(dur * fps), 2)
    frames = []
    for i in range(n):
        t = i / fps
        fr = Image.new("RGBA", (cw2, ch2), (0, 0, 0, 0))
        d = ImageDraw.Draw(fr)
        d.rounded_rectangle((0, 0, cw2 - 1, ch2 - 1), 12 * SS,
                            fill=(12, 12, 18, 160))
        for j, (lab, val) in enumerate(pairs):
            # каскад: каждый бар стартует на 0.15 c позже предыдущего
            kj = _ease_out_back((t - 0.15 * j) / 0.7, 1.0)
            kj = max(min(kj, 1.05), 0.0)
            y = 14 * SS + j * (row_h + gap)
            d.text((16 * SS, y + row_h // 4), lab, font=f, fill=WHITE)
            bw = int((cw2 - bar_x - 90 * SS) * (val / vmax) * kj)
            if bw > 2:
                # двухтоновая заливка — намёк на градиент
                d.rounded_rectangle((bar_x, y, bar_x + bw, y + row_h - 8 * SS),
                                    6 * SS, fill=ACCENT)
                d.rounded_rectangle((bar_x, y, bar_x + bw,
                                     y + (row_h - 8 * SS) // 2), 6 * SS,
                                    fill=(158, 133, 255, 255))
            d.text((bar_x + max(bw, 4) + 10 * SS, y + row_h // 4),
                   f"{val * min(kj, 1.0):.0f}", font=f, fill=WHITE)
        _fade(fr, min(_ease_out(t / 0.25), _ease_out((dur - t) / 0.3)))
        frames.append(fr.resize((cw, ch), Image.LANCZOS))
    _save_frames(frames, dest_dir)
    return cw, ch


def render_timeline(content: str, dur: float, fps: int, W: int, H: int,
                    dest_dir: Path):
    """Таймлайн: content = '1971:Hijacking,1980:Money found' — точки
    появляются по очереди."""
    from PIL import Image, ImageDraw
    pts = []
    for chunk in content.split(","):
        if ":" in chunk:
            yr, _, lab = chunk.partition(":")
            pts.append((yr.strip(), lab.strip()))
    if not pts:
        raise ValueError(f"timeline: нет пар год:событие в «{content}»")
    fy, fl = _font(int(H * 0.036) * SS), _font(int(H * 0.026) * SS)
    cw, ch = int(W * 0.82) // 2 * 2, int(H * 0.17) // 2 * 2
    cw2, ch2 = cw * SS, ch * SS
    line_y = int(ch2 * 0.55)
    margin = 80 * SS
    step = (cw2 - margin * 2) / max(len(pts) - 1, 1)

    n = max(int(dur * fps), 2)
    frames = []
    for i in range(n):
        t = i / fps
        fr = Image.new("RGBA", (cw2, ch2), (0, 0, 0, 0))
        d = ImageDraw.Draw(fr)
        d.rounded_rectangle((0, 0, cw2 - 1, ch2 - 1), 12 * SS,
                            fill=(12, 12, 18, 150))
        grow = _ease_out(t / 0.5)
        end_x = margin + (cw2 - margin * 2) * grow
        d.line((margin, line_y, end_x, line_y), fill=ACCENT, width=4 * SS)
        if grow < 1:                       # бегущий огонёк на конце линии
            d.ellipse((end_x - 6 * SS, line_y - 6 * SS,
                       end_x + 6 * SS, line_y + 6 * SS), fill=WHITE)
        for j, (yr, lab) in enumerate(pts):
            t_show = 0.45 + j * 0.35
            if t < t_show:
                continue
            a = min((t - t_show) / 0.3, 1.0)
            pop = _ease_out_back(a, 1.6)   # точка приходит пружинкой
            x = margin + step * j
            dot = Image.new("RGBA", (cw2, ch2), (0, 0, 0, 0))
            dd = ImageDraw.Draw(dot)
            r = max(int(10 * SS * pop), 2)
            dd.ellipse((x - r, line_y - r, x + r, line_y + r), fill=ACCENT)
            ring_k = min((t - t_show) / 0.5, 1.0)   # расходящееся кольцо
            rr = int(10 * SS + 26 * SS * _ease_out(ring_k))
            ra = int(200 * (1 - ring_k))
            if ra > 4:
                dd.arc((x - rr, line_y - rr, x + rr, line_y + rr), 0, 360,
                       fill=ACCENT[:3] + (ra,), width=2 * SS)
            wy = dd.textlength(yr, font=fy)
            dd.text((x - wy / 2, line_y - r - fy.size - 8 * SS), yr,
                    font=fy, fill=WHITE)
            wl = dd.textlength(lab, font=fl)
            dd.text((x - wl / 2, line_y + 18 * SS), lab, font=fl,
                    fill=(220, 220, 230, 255))
            fr.alpha_composite(_fade(dot, _ease_out(a)))
        _fade(fr, min(_ease_out(t / 0.25), _ease_out((dur - t) / 0.3)))
        frames.append(fr.resize((cw, ch), Image.LANCZOS))
    _save_frames(frames, dest_dir)
    return cw, ch


# ---------- Движок Remotion (кинокачество, если установлен Node) ----------

REMOTION_DIR = Path(__file__).parent / "remotion"


def _node_env() -> dict:
    env = {**os.environ}
    if Path(r"C:\nodejs\node.exe").exists() and r"C:\nodejs" not in env.get("PATH", ""):
        env["PATH"] = env.get("PATH", "") + os.pathsep + r"C:\nodejs"
    return env


def _npx() -> str | None:
    for cand in ("npx.cmd", "npx"):
        p = shutil.which(cand)
        if p:
            return p
    p = Path(r"C:\nodejs\npx.cmd")
    return str(p) if p.exists() else None


def remotion_available() -> bool:
    return _npx() is not None and (REMOTION_DIR / "node_modules").is_dir()


def overlay_engine() -> str:
    """Движок из settings.json (overlay_engine: auto|remotion|pillow).
    auto = Remotion, если установлен, иначе Pillow."""
    eng = "auto"
    try:
        st = json.loads((Path(__file__).parent / "settings.json")
                        .read_text(encoding="utf-8"))
        eng = st.get("overlay_engine", "auto")
    except Exception:
        pass
    if eng == "pillow":
        return "pillow"
    if eng == "remotion" and not remotion_available():
        return "pillow"
    return "remotion" if remotion_available() else "pillow"


def _remotion_bundle(log=print) -> Path:
    """Однократная сборка бандла (build/); пересборка — только если
    исходники в src/ новее готового бандла."""
    build = REMOTION_DIR / "build"
    marker = build / "index.html"
    newest = max((p.stat().st_mtime for p in (REMOTION_DIR / "src").glob("*")),
                 default=0)
    if marker.exists() and marker.stat().st_mtime >= newest:
        return build
    log("[Оверлеи] Remotion: собираю бандл (~30-60 c, один раз)...")
    r = subprocess.run([_npx(), "remotion", "bundle", "--log=error"],
                       cwd=REMOTION_DIR, env=_node_env(),
                       capture_output=True, text=True, timeout=600)
    if r.returncode != 0 or not marker.exists():
        raise RuntimeError(f"remotion bundle: {r.stderr[-300:]}")
    return build


def _render_remotion(item: dict, W: int, H: int, fps: int, dest_dir: Path,
                     out_dir: Path, log=print):
    """Один оверлей через Remotion -> PNG-секвенция %04d.png с альфой.
    Кадр всегда полноэкранный (позиция задаётся внутри React)."""
    props = {"type": item["type"], "content": item["content"],
             "pos": item["pos"], "dur": item["dur"], "fps": fps,
             "width": W, "height": H, "img": ""}
    if item["type"] == "popup":
        img = Path(out_dir) / item["content"]
        if not img.exists():
            img = Path(item["content"])
        if not img.exists():
            raise FileNotFoundError(f"нет картинки {item['content']}")
        # data URI, а не staticFile(): remotion bundle снимает "снимок" папки
        # public/ ОДИН РАЗ при сборке — картинки, добавленные позже (а они
        # всегда позже, генерируются/качаются во время самого рендера),
        # в собранном бандле не видны и дают 404. Base64 обходит это
        # полностью — картинка просто лежит прямо в props.
        import base64
        mime = {"jpg": "jpeg", "jpeg": "jpeg", "png": "png",
                "webp": "webp"}.get(img.suffix.lower().lstrip("."), "jpeg")
        b64 = base64.b64encode(img.read_bytes()).decode("ascii")
        props["img"] = f"data:image/{mime};base64,{b64}"
    dest_dir = Path(dest_dir)
    props_file = dest_dir.parent / (dest_dir.name + "_props.json")
    props_file.write_text(json.dumps(props, ensure_ascii=False),
                          encoding="utf-8")
    build = _remotion_bundle(log)
    r = subprocess.run(
        [_npx(), "remotion", "render", str(build), "Overlay", str(dest_dir),
         "--sequence", "--image-format=png", f"--props={props_file}",
         "--log=error"],
        cwd=REMOTION_DIR, env=_node_env(),
        capture_output=True, text=True, timeout=900)
    if r.returncode != 0:
        raise RuntimeError(f"remotion render: {r.stderr[-300:]}")
    frames = sorted(dest_dir.glob("*.png"),
                    key=lambda p: int(re.sub(r"[^\d]", "", p.stem) or 0))
    if not frames:
        raise RuntimeError("remotion render: нет кадров на выходе")
    for i, f in enumerate(frames):   # element-N.png -> %04d.png для ffmpeg
        f.rename(dest_dir / f"{i:04d}.png")
    return W, H


# ---------- Позиция и сборка ----------

def _position(pos: str, otype: str, cw: int, ch: int, W: int, H: int):
    p = (pos or "").lower()
    if otype == "callout":
        return 0, 0
    if p.startswith("point:"):
        try:
            x, y = p.split(":")[1].split(",")
            return int(W * float(x) / 100 - cw / 2), \
                int(H * float(y) / 100 - ch / 2)
        except (ValueError, IndexError):
            pass
    table = {
        "top-right": (W - cw - 60, 60),
        "top-left": (60, 60),
        "top": ((W - cw) // 2, 60),
        "center": ((W - cw) // 2, (H - ch) // 2),
        "bottom": (80, H - ch - int(H * 0.16)),
        "bottom-right": (W - cw - 60, H - ch - int(H * 0.16)),
    }
    default = {"popup": "top-right", "lower3": "bottom", "counter": "center",
               "bars": "center", "timeline": "bottom",
               "infographic": "center"}.get(otype, "center")
    return table.get(p, table[default])


GOLD = (222, 179, 92, 255)     # золото, как акцент инфографики Hidden Homestead
GOLD_DIM = (150, 120, 55, 255)


def render_infographic(content: str, dur: float, fps: int, W: int, H: int,
                       dest_dir: Path):
    """Полноэкранная инфографика в стиле документального канала: сетка на
    тёмном фоне + заголовок сверху + растущий вертикальный бар + крупное
    золотое число + источник внизу мелким. Формат content:
    «94% Заголовок :: Источник исследования» (после :: — подпись-источник)."""
    from PIL import Image, ImageDraw, ImageFilter

    head, _, source = content.partition("::")
    head, source = head.strip(), source.strip()
    m = re.search(r"([\d][\d,.]*)\s*(%|[a-zA-Zа-яА-Я$]*)", head)
    num = m.group(1) if m else "100"
    unit = (m.group(2) if m else "").strip()
    value = float(re.sub(r"[^\d.]", "", num) or "0")
    is_pct = unit == "%" or value <= 100
    title = re.sub(r"^\s*[\d][\d,.]*\s*%?\s*", "", head).strip() or "Data"

    Wp, Hp = W, H
    f_title = _font(int(H * 0.048) * SS)
    f_big = _font(int(H * 0.14) * SS)
    f_src = _font(int(H * 0.026) * SS)
    bx = int(Wp * 0.42)                       # бар слева от центра
    bw = int(Wp * 0.055)
    btop, bbot = int(Hp * 0.24), int(Hp * 0.80)
    bh = bbot - btop

    n = max(int(dur * fps), 2)
    frames = []
    for i in range(n):
        t = i / fps
        k = _ease_out(min(t / max(dur * 0.55, 0.1), 1.0))   # рост бара
        cur = value * k
        big = Image.new("RGBA", (Wp * SS, Hp * SS), (10, 9, 7, 235))
        d = ImageDraw.Draw(big)
        # сетка
        step = int(Wp * SS / 14)
        for gx in range(0, Wp * SS, step):
            d.line([(gx, 0), (gx, Hp * SS)], fill=(60, 55, 40, 90), width=1)
        for gy in range(0, Hp * SS, step):
            d.line([(0, gy), (Wp * SS, gy)], fill=(60, 55, 40, 90), width=1)
        # заголовок
        tw = d.textlength(title, font=f_title)
        d.text(((Wp * SS - tw) / 2, int(Hp * SS * 0.10)), title, font=f_title,
               fill=WHITE, stroke_width=2 * SS, stroke_fill=(0, 0, 0, 200))
        # рамка бара + заливка снизу вверх
        x0, x1 = bx * SS, (bx + bw) * SS
        d.rectangle([x0, btop * SS, x1, bbot * SS], outline=(120, 110, 80, 200),
                    width=2 * SS)
        frac = (cur / max(value, 1)) if is_pct else k
        fill_top = int((bbot - bh * max(min(frac, 1.0), 0.0)) * SS)
        y_bot = bbot * SS - 2 * SS
        if fill_top < y_bot:                  # рисуем только непустой бар
            d.rectangle([x0 + 2 * SS, fill_top, x1 - 2 * SS, y_bot], fill=GOLD)
        # крупное число справа от бара
        label = f"{cur:.0f}{unit}" if is_pct else f"{cur:,.0f}{unit}"
        d.text((x1 + int(Wp * SS * 0.03), int(Hp * SS * 0.45)), label,
               font=f_big, fill=GOLD, stroke_width=3 * SS,
               stroke_fill=(0, 0, 0, 220))
        # источник внизу
        if source:
            sw = d.textlength(source, font=f_src)
            d.text(((Wp * SS - sw) / 2, int(Hp * SS * 0.92)), source,
                   font=f_src, fill=(180, 175, 160, 220))
        _fade(big, min(_ease_out(t / 0.35), _ease_out((dur - t) / 0.4)))
        frames.append(big.resize((Wp, Hp), Image.LANCZOS))
    _save_frames(frames, dest_dir)
    return Wp, Hp


def build_overlays(out_dir: Path, W: int, H: int, fps: int, tmp: Path,
                   log=print) -> list[dict]:
    """Читает overlays.txt проекта, рендерит секвенции.
    -> [{pattern, t0, t1, x, y}]. Упавший оверлей — warning и пропуск."""
    src = Path(out_dir) / "overlays.txt"
    if not src.exists():
        return []
    items = parse_overlays(src.read_text(encoding="utf-8"))
    if not items:
        return []
    engine = overlay_engine()
    log(f"[Оверлеи] {len(items)} шт. — движок: "
        + ("Remotion (кинокачество)" if engine == "remotion"
           else "Pillow (быстрый)"))
    renderers = {"popup": None, "lower3": render_lower3,
                 "callout": None, "counter": render_counter,
                 "bars": render_bars, "timeline": render_timeline,
                 "infographic": render_infographic}

    def _pillow(it: dict, dest: Path):
        if it["type"] == "popup":
            img = Path(out_dir) / it["content"]
            if not img.exists():
                img = Path(it["content"])
            if not img.exists():
                raise FileNotFoundError(f"нет картинки {it['content']}")
            return render_popup(img, it["dur"], fps, W, H, dest)
        if it["type"] == "callout":
            point = (70.0, 55.0)
            m = re.search(r"point:([\d.]+),([\d.]+)", it["pos"])
            if m:
                point = (float(m.group(1)), float(m.group(2)))
            return render_callout(it["content"], point, it["dur"],
                                  fps, W, H, dest)
        return renderers[it["type"]](it["content"], it["dur"], fps, W, H, dest)

    out = []
    for k, it in enumerate(items):
        try:
            dest = Path(tmp) / f"ovl_{k:02d}"
            used_engine = engine
            if engine == "remotion":
                try:
                    cw, ch = _render_remotion(it, W, H, fps, dest,
                                              Path(out_dir), log)
                    x = y = 0          # Remotion рендерит полный кадр
                except Exception as e:
                    log(f"[Оверлеи] Remotion не справился ({e}) — "
                        "этот оверлей рисует Pillow.")
                    used_engine = "pillow"
                    for old in Path(dest).glob("*.png"):
                        old.unlink()
            if used_engine == "pillow":
                cw, ch = _pillow(it, dest)
                x, y = _position(it["pos"], it["type"], cw, ch, W, H)
            out.append({"pattern": str(dest / "%04d.png"),
                        "t0": it["t"], "t1": it["t"] + it["dur"],
                        "x": x, "y": y})
            mm, ss = divmod(int(it["t"]), 60)
            log(f"[Оверлеи] {mm:02d}:{ss:02d} {it['type']}: "
                f"{it['content'][:50]} -> OK ({used_engine})")
        except Exception as e:
            log(f"[Оверлеи] Строка {it.get('line', '?')} ({it['type']}): "
                f"пропущен — {e}")
    return out


# ---------- Умная авторасстановка по субтитрам ----------

MONTHS = ("january february march april may june july august september "
          "october november december").split()
PLACE_WORDS = {"airport", "river", "city", "county", "island", "mountain",
               "bridge", "station", "beach", "valley", "lake", "forest",
               "ocean", "state", "harbor", "bay"}
KNOWN_PLACES = {"seattle", "portland", "chicago", "washington", "oregon",
                "new york", "los angeles", "las vegas", "san francisco",
                "london", "paris", "moscow", "tokyo", "reno", "vancouver",
                "mexico", "canada", "texas", "florida", "california",
                "columbia river", "area 51", "pentagon", "fbi", "cia"}
STOP_CAPS = {"The", "But", "And", "Then", "When", "What", "Where", "Why",
             "How", "This", "That", "These", "Those", "After", "Before",
             "From", "With", "They", "There", "Their", "Some", "Every",
             "November", "December", "January", "February", "March", "April",
             "May", "June", "July", "August", "September", "October"}

RE_MONEY = re.compile(r"\$[\d,]+(?:\.\d+)?|\b\d{1,3}(?:,\d{3})+\b|"
                      r"\b(\d+(?:\.\d+)?)\s*(thousand|million|billion|"
                      r"dollars|bills)\b", re.I)
RE_YEAR = re.compile(r"\b(19|20)\d{2}\b")
RE_DATE = re.compile(r"\b(" + "|".join(m.capitalize() for m in MONTHS) +
                     r")\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+(19|20)\d{2})?\b")
RE_NAME = re.compile(r"\b([A-Z][a-z]{2,})\s+([A-Z][a-z]{2,})\b")


def _find_manifest_image(name: str, manifest: list) -> str | None:
    words = {w.lower() for w in name.split()}
    for sc in manifest or []:
        kw = str(sc.get("keywords", "")).lower()
        if any(w in kw for w in words):
            for f in sc.get("files", []):
                if f.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
                    sub = "images" if not f.startswith(("video/", "images/")) \
                        else ""
                    return f"{sub}/{f}" if sub else f
    return None


def _phrase_candidate(t: float, text: str, manifest: list):
    """Лучший кандидат фразы: (приоритет, строка overlays.txt) или None.
    Приоритет: 1 counter > 2 popup > 3 lower3 > 4 callout."""
    tc = f"{int(t // 3600):02d}:{int(t % 3600 // 60):02d}:{int(t % 60):02d}"

    # процент/статистика -> полноэкранная инфографика (визитка канала)
    mp = re.search(r"\b(\d{1,3}(?:\.\d+)?)\s*(?:%|percent|процент)", text, re.I)
    if mp:
        # заголовок — 3-5 значимых слов фразы для контекста
        words = re.findall(r"[A-Za-zА-Яа-я]{4,}", text)[:4]
        title = " ".join(words).title() if words else "Statistic"
        return 1, (f"{tc} | infographic | {mp.group(1)}% {title} :: "
                   f"по данным исследования | center | 5s")

    m = RE_MONEY.search(text)
    if m:
        return 1, f"{tc} | counter | {m.group(0)} | center | 3s"

    m = RE_NAME.search(text)
    if (m and m.group(1) not in STOP_CAPS and m.group(2) not in STOP_CAPS
            and m.group(2).lower() not in PLACE_WORDS
            and f"{m.group(1)} {m.group(2)}".lower() not in KNOWN_PLACES):
        name = f"{m.group(1)} {m.group(2)}"
        img = _find_manifest_image(name, manifest)
        if img:
            return 2, f"{tc} | popup | {img} | top-right | 5s"
        return 2, (f"# NEEDS_IMAGE: {name} — добавь картинку и строку:  "
                   f"{tc} | popup | images/ИМЯ.jpg | top-right | 5s")

    m = RE_DATE.search(text) or RE_YEAR.search(text)
    if m:
        return 3, f"{tc} | lower3 | {m.group(0)} | bottom | 4s"

    low = text.lower()
    place = next((p for p in KNOWN_PLACES if p in low), None)
    if place:
        # регистр из оригинала (FBI, а не Fbi)
        mo = re.search(re.escape(place), text, re.I)
        shown = mo.group(0) if mo else place.title()
        if shown.islower():
            shown = shown.title()
        return 3, f"{tc} | lower3 | {shown} | bottom | 4s"
    mw = re.search(r"\b([A-Z][a-z]+)\s+(" + "|".join(PLACE_WORDS) + r")\b",
                   text)
    if mw:
        return 3, f"{tc} | lower3 | {mw.group(0).title()} | bottom | 4s"

    if text.strip().endswith("?"):
        return 4, f"{tc} | callout | {text.strip()[:60]} | point:70,40 | 3s"
    return None


def suggest_overlays_auto(rows: list, manifest: list, out_dir,
                          log=print, min_gap: float = 13.0) -> str:
    """Полный автомат: авторасстановка + автоподбор картинок для popup.
    Реальных людей (два слова с заглавных — похоже на имя) ищем ТОЛЬКО в
    Wikimedia Commons: ИИ-генерация лиц реальных людей сознательно не
    используется — фейковое лицо в документалке вводит зрителя в
    заблуждение; если фото не нашлось, остаётся пометка NEEDS_IMAGE для
    ручного добавления. Для остального (места, понятия, абстрактные темы) —
    VeoNonStop (Banana) как ОСНОВНОЙ генератор иллюстрации, Wikimedia —
    фолбэк, если Veo недоступен/упал. Если жёсткие правила (деньги/даты/
    имена/вопросы) вообще ничего не нашли в тексте — просим Gemini выбрать
    моменты для баннеров по смыслу (suggest_overlays_llm), а не оставляем
    ролик совсем без оверлеев."""
    from pathlib import Path as _P
    from core import fetch_wiki_images, _load_used, _save_used, veo_image
    draft = suggest_overlays(rows, manifest, min_gap)
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
    if draft.startswith("#"):
        # Локальный вариант — основной здесь: гарантированно кладёт
        # НЕСКОЛЬКО типов оверлеев ОДНОВРЕМЕННО (слоями), детерминированно.
        # LLM пишет текст чуть живее, но всегда по одному оверлею за раз и
        # не всегда отвечает (safety-фильтр на тяжёлых темах) — поэтому он
        # только ДОБАВКА: подменяет текст первых N локальных, где сумел.
        draft = suggest_overlays_local(rows, min_gap)
        if gemini_key:
            llm_draft = suggest_overlays_llm(rows, gemini_key, log, min_gap)
            if llm_draft:
                llm_lines = {ln.split("|")[0].strip(): ln
                             for ln in llm_draft.splitlines()}
                draft = "\n".join(
                    llm_lines.get(ln.split("|")[0].strip(), ln)
                    for ln in draft.splitlines())
                log("[Оверлеи] Слоёная раскладка + текст от LLM там, где "
                    "совпали моменты")
            draft = suggest_overlays_local(rows, min_gap)
    idir = _P(out_dir) / "images"
    idir.mkdir(parents=True, exist_ok=True)
    used = _load_used()
    veo_key = os.getenv("VEO_API_KEY", "").strip()
    person_like = re.compile(r"^[A-ZА-Я][\w'\-]+\s+[A-ZА-Я][\w'\-]+$")
    out_lines = []
    for line in draft.splitlines():
        m = re.match(r"# NEEDS_IMAGE: (.+?) — .*?(\d{2}:\d{2}:\d{2}) \| popup",
                     line)
        if not m:
            out_lines.append(line)
            continue
        name, tc = m.group(1), m.group(2)
        safe = re.sub(r"[^\w\-]+", "_", name)[:30]
        is_person = bool(person_like.match(name.strip()))
        img_rel, via_ai = None, False
        if not is_person and veo_key:
            try:
                jpg = idir / f"ovl_{safe}_ai.jpg"
                veo_image(f"{name}, editorial illustration", jpg, veo_key, log)
                img_rel, via_ai = f"images/{jpg.name}", True
            except Exception as e:
                log(f"[Оверлеи] VeoNonStop для «{name}»: не вышло ({e}) — "
                    "пробую Wikimedia")
        if img_rel is None:
            try:
                got = fetch_wiki_images(name, 1, idir, f"ovl_{safe}", used, log)
                if got:
                    img_rel = f"images/{got[0].name}"
            except Exception as e:
                log(f"[Оверлеи] Wikimedia для «{name}»: не вышло ({e})")
        if img_rel:
            out_lines.append(f"{tc} | popup | {img_rel} | top-right | 5s")
            log(f"[Оверлеи] {tc} popup «{name}»: "
                + ("ИИ-иллюстрация (VeoNonStop)" if via_ai
                   else "фото найдено в Wikimedia"))
        else:
            out_lines.append(line)
    _save_used(used)
    return "\n".join(out_lines)


def suggest_overlays(rows: list, manifest: list, min_gap: float = 13.0,
                     dur: float = 0) -> str:
    """Анализ srt по правилам (не рандом): деньги -> counter,
    имена -> popup, даты/места -> lower3, вопросы -> callout.
    Плотность: не чаще 1 оверлея в min_gap секунд; при конфликте окон
    выигрывает более приоритетный тип (counter > popup > lower3 > callout).
    dur > 0 — принудительная длительность каждого оверлея (сек)."""
    cands = []
    for start_s, _end, text in rows:
        t = srt_to_seconds(start_s)
        c = _phrase_candidate(t, text, manifest)
        if c:
            cands.append((c[0], t, c[1]))
    accepted = []
    for prio, t, line in sorted(cands, key=lambda c: (c[0], c[1])):
        if all(abs(t - ta) >= min_gap for _, ta, _ in accepted):
            accepted.append((prio, t, line))
    if not accepted:
        return "# По субтитрам ничего не найдено — добавь оверлеи вручную."
    lines = [line for _, _, line in sorted(accepted, key=lambda c: c[1])]
    if dur and dur > 0:   # переопределяем длительность (последнее поле "| Ns")
        d = f"{dur:g}s"
        lines = [re.sub(r"\|\s*[\d.]+s\s*$", f"| {d}", ln) for ln in lines]
    return "\n".join(lines)


def suggest_overlays_llm(rows: list, api_key: str, log=print,
                         min_gap: float = 13.0, target: int = 6,
                         attempts: int = 3) -> str | None:
    """Фолбэк, когда suggest_overlays() по жёстким правилам (деньги/даты/
    имена/вопросы) ничего не нашла — многие сценарии просто не содержат
    таких формальных фактов. Вместо пустого ролика без единого оверлея
    просим LLM самому выбрать ~target моментов по смыслу текста И тип
    оверлея для каждого (микс banner/lower3/compare/callout — не всё
    подряд баннерами). До attempts попыток — модель не всегда с первого
    раза отдаёт валидный JSON. None, если так и не получилось — тогда
    ролик остаётся без оверлеев, как раньше."""
    from core import llm_chat
    total = srt_to_seconds(rows[-1][1]) if rows else 0
    if not total:
        return None
    numbered = "\n".join(
        f"{i}. [{int(srt_to_seconds(r[0]) // 60):02d}:"
        f"{int(srt_to_seconds(r[0]) % 60):02d}] {r[2]}"
        for i, r in enumerate(rows, 1))
    n = max(3, min(target, round(total / max(min_gap, 8))))
    picks = None
    for attempt in range(1, attempts + 1):
        try:
            out = llm_chat(
                [{"role": "system", "content":
                  "You are a motion-graphics editor choosing on-screen text "
                  "overlays for a documentary — varied types, not the same "
                  "one repeated."},
                 {"role": "user", "content":
                  f"Pick exactly {n} moments from this timestamped narration "
                  "worth an on-screen text overlay, and choose the best TYPE "
                  "for each — use a MIX, don't pick the same type every time:\n"
                  "  'banner' — a punchy quoted phrase or claim, under 9 words\n"
                  "  'lower3' — a short 2-5 word label (a place, term, or "
                  "short title mentioned right there)\n"
                  "  'compare' — two short CONTRASTING phrases from that "
                  "moment, as text formatted exactly as \"first | second\"\n"
                  "  'callout' — a short pointed remark or aside, under 8 words\n"
                  "Roughly aim for 2 banners, 2 lower3, 1 compare, 1 callout "
                  "(adjust to fit naturally). Reply with a JSON array of "
                  '{"line": <line number>, "type": "banner|lower3|compare|'
                  'callout", "text": "..."}, nothing else.\n\n' + numbered}],
                api_key, 0.6, 1500)
            m = re.search(r"\[.*\]", out, re.S)
            if not m:
                log(f"[Оверлеи] LLM-фолбэк (попытка {attempt}/{attempts}): "
                    f"ответ без JSON-массива: {out[:200]!r}")
                continue
            picks = json.loads(m.group(0))
            break
        except Exception as e:
            log(f"[Оверлеи] LLM-фолбэк (попытка {attempt}/{attempts}) "
                f"не сработал: {e}")
    if not picks:
        log("[Оверлеи] LLM-фолбэк: пустой список — вернулся ролик без оверлеев")
        return None
    # LLM отдаёт моменты НЕ по хронологии — без сортировки min_gap-фильтр
    # (сравнивает с последним ПРИНЯТЫМ t) отбраковывает случайные пункты
    POS = {"banner": "top", "lower3": "bottom", "compare": "center",
          "callout": "point:70,40"}
    dated = []
    for p in picks:
        idx = int(p.get("line", 0)) - 1
        text = str(p.get("text", "")).strip()
        otype = str(p.get("type", "banner")).strip().lower()
        if otype not in POS:
            otype = "banner"
        if otype == "compare" and "|" not in text:
            otype = "banner"          # без парного текста compare не соберётся
        if text and 0 <= idx < len(rows):
            dated.append((srt_to_seconds(rows[idx][0]), otype, text))
    dated.sort(key=lambda x: x[0])
    out_lines, last_t = [], -1e9
    for t, otype, text in dated:
        if t - last_t < min_gap:
            continue
        last_t = t
        tc = f"{int(t // 3600):02d}:{int(t % 3600 // 60):02d}:{int(t % 60):02d}"
        out_lines.append(f"{tc} | {otype} | {text} | {POS[otype]} | 4s")
    if not out_lines:
        log(f"[Оверлеи] LLM-фолбэк: {len(picks)} пунктов от LLM, но все "
            "отфильтрованы min_gap")
        return None
    kinds = ", ".join(sorted({o for _, o, _ in dated}))
    log(f"[Оверлеи] LLM-фолбэк: {len(out_lines)} оверлеев по смыслу текста "
        f"({kinds}) — в тексте не нашлось явных денег/дат/имён/вопросов")
    return "\n".join(out_lines)


def suggest_overlays_local(rows: list, min_gap: float = 13.0,
                           target: int = 6) -> str:
    """Последний фолбэк без единого обращения к LLM — на случай, если
    Gemini недоступен ИЛИ заблокировал тяжёлую тему фильтром безопасности
    (true crime, хоррор и т.п. иногда попадают под safety-фильтр даже на
    безобидный запрос вроде «выбери цитату»). Берёт ~target моментов
    равномерно по таймлайну; на КАЖДЫЙ момент — до 3 оверлеев РАЗНЫХ типов
    ОДНОВРЕМЕННО (разные зоны экрана: верх/низ/точка-выноска — физически не
    перекрываются), а не один и тот же баннер по кругу. Грубее, чем LLM
    (просто режет фразу по словам), зато работает всегда."""
    total = srt_to_seconds(rows[-1][1]) if rows else 0
    if not rows or not total:
        return "# По субтитрам ничего не найдено — добавь оверлеи вручную."
    n = max(3, min(target, round(total / max(min_gap, 8))))
    step = max(len(rows) // n, 1)
    POS = {"banner": "top", "lower3": "bottom", "compare": "center",
          "callout": "point:75,32"}
    # Комбинации на один момент — до 3 несовпадающих по месту типов сразу
    combos = [["banner"], ["lower3", "callout"], ["banner", "lower3"],
             ["compare"], ["banner", "lower3", "callout"]]
    out_lines, last_t, ci = [], -1e9, 0
    for i in range(0, len(rows), step):
        start_s, _end, text = rows[i]
        t = srt_to_seconds(start_s)
        if t - last_t < min_gap:
            continue
        words = text.split()
        if not words:
            continue
        types = combos[ci % len(combos)]
        ci += 1
        last_t = t
        tc = f"{int(t // 3600):02d}:{int(t % 3600 // 60):02d}:{int(t % 60):02d}"
        for otype in types:
            if otype == "lower3":
                content = " ".join(words[:4])
            elif otype == "compare":
                half = max(len(words) // 2, 1)
                left, right = " ".join(words[:half]), " ".join(words[half:half + 9])
                if not right:
                    continue
                content = f"{left} | {right}"
            elif otype == "callout":
                content = " ".join(words[-6:])   # хвост фразы — отличается от banner
            else:
                content = " ".join(words[:9])
            out_lines.append(f"{tc} | {otype} | {content} | {POS[otype]} | 4s")
    if not out_lines:
        return "# По субтитрам ничего не найдено — добавь оверлеи вручную."
    return "\n".join(out_lines)
