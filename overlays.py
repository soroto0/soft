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
    00:08:00 | compare | Hidden foundation gaps::Dry bait reaches deep crevices | center | 4s
    00:09:00 | banner | Dates matter: note the year and context | top | 4s

Кадры анимации считаются в Pillow (пружина/ease-out), пишутся
PNG-секвенциями и накладываются в финальном проходе ffmpeg через
overlay + enable='between(t,...)'. Упавший оверлей — warning и пропуск.
"""

import os
import re
import json
import math
import base64
import shutil
import subprocess
from pathlib import Path

from core import srt_to_seconds, CREATE_NO_WINDOW, run_tree

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
                         "compare", "banner", "collage", "titlecard",
                         "watermark",
                         # техники движения, а не «ещё одна плашка»:
                         # kinetic — слова влетают по одному (стаггер),
                         # highlight — обводка рисуется по контуру,
                         # quote — врезка-цитата, stamp — оттиск в углу,
                         # redact — строки замазываются одна за другой,
                         # marker — фразу закрашивают маркером слово за словом,
                         # gallery — карточки с фото уходят вглубь кадра
                         "kinetic", "highlight", "quote", "stamp", "redact",
                         "marker", "gallery"):
            continue
        pos = parts[3] if len(parts) > 3 and parts[3] else ""
        dur = 4.0
        if len(parts) > 4:
            m = re.search(r"([\d.]+)", parts[4])
            if m:
                # watermark держится весь ролик — без потолка в 15с,
                # остальные типы — короткие всплески, капаем на 15с
                dur = max(1.0, float(m.group(1)) if otype == "watermark"
                         else min(float(m.group(1)), 15.0))
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
    # Дробную часть держим отдельно: «$3.5» после выбрасывания всего
    # нецифрового превращалось в 35 — зритель видел число в десять раз
    # больше того, что произносит диктор. Запятые (разряды) и пробелы
    # выбрасываем, точка остаётся разделителем дробной части.
    mv = re.match(r"(\d+)(?:\.(\d+))?", re.sub(r"[,\s]", "", digits))
    frac = (mv.group(2) or "") if mv else ""
    value = float(f"{mv.group(1)}.{frac or 0}") if mv else 0.0
    dec = len(frac)                          # столько знаков и рисуем
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
        cur = value * k
        s = (f"{prefix}{cur:,.{dec}f}{suffix}" if grouped
             else f"{prefix}{cur:.{dec}f}{suffix}")
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
HYPERFRAMES_DIR = Path(__file__).parent / "hyperframes"


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


def _npm() -> str | None:
    for cand in ("npm.cmd", "npm"):
        p = shutil.which(cand)
        if p:
            return p
    p = Path(r"C:\nodejs\npm.cmd")
    return str(p) if p.exists() else None


def remotion_available() -> bool:
    return _npx() is not None and (REMOTION_DIR / "node_modules").is_dir()


def hyperframes_available() -> bool:
    """В отличие от Remotion, у HyperFrames нет локального node_modules —
    package.json дёргает npx --yes hyperframes@<pin> напрямую (кэш npx),
    поэтому проверяем сам проект (index.html), а не node_modules."""
    return (_npm() is not None and _npx() is not None
            and (HYPERFRAMES_DIR / "index.html").exists())


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
    r = run_tree([_npx(), "remotion", "bundle", "--log=error"], 600,
                 cwd=REMOTION_DIR, env=_node_env())
    if r.returncode != 0 or not marker.exists():
        raise RuntimeError(f"remotion bundle: {r.stderr[-300:]}")
    return build


def _render_remotion(item: dict, W: int, H: int, fps: int, dest_dir: Path,
                     out_dir: Path, log=print, variant: str | None = None,
                     frame_range: str | None = None):
    """Один оверлей через Remotion -> PNG-секвенция %04d.png с альфой.
    Кадр всегда полноэкранный (позиция задаётся внутри React). variant —
    для типов с несколькими непохожими дизайнами (пока только banner:
    None/"classic" -> Banner, "ribbon" -> BannerRibbon, см. Overlay.tsx).

    frame_range («0-20») — отрисовать не весь оверлей, а только его начало.
    Длина композиции считается из props.dur (calculateMetadata в Root.tsx),
    и dur мы НЕ трогаем: анимация должна считаться по настоящей длине,
    иначе поедут и въезд, и уход. Нужно ровно оборвать рендер — этим и
    занят --frames (см. _render_watermark)."""
    props = {"type": item["type"], "content": item["content"],
             "pos": item["pos"], "dur": item["dur"], "fps": fps,
             "width": W, "height": H, "img": ""}
    if variant:
        props["variant"] = variant

    def _data_uri(rel: str) -> str:
        # data URI, а не staticFile(): remotion bundle снимает "снимок" папки
        # public/ ОДИН РАЗ при сборке — картинки, добавленные позже (а они
        # всегда позже, генерируются/качаются во время самого рендера),
        # в собранном бандле не видны и дают 404. Base64 обходит это
        # полностью — картинка просто лежит прямо в props.
        import base64
        img = Path(out_dir) / rel
        if not img.exists():
            img = Path(rel)
        if not img.exists():
            raise FileNotFoundError(f"нет картинки {rel}")
        mime = {"jpg": "jpeg", "jpeg": "jpeg", "png": "png",
                "webp": "webp"}.get(img.suffix.lower().lstrip("."), "jpeg")
        return f"data:image/{mime};base64," + \
            base64.b64encode(img.read_bytes()).decode("ascii")

    if item["type"] == "popup":
        props["img"] = _data_uri(item["content"])
    elif item["type"] in ("collage", "gallery"):
        # content: "label1::путь1;;label2::путь2;;label3::путь3"
        # collage — до 3 фото, gallery — до 4 (карточки уходят вглубь, там
        # четвёртая ещё читается, а пятая уже вне кадра)
        entries = []
        for chunk in item["content"].split(";;"):
            label, _, rel = chunk.partition("::")
            if rel.strip():
                entries.append((label.strip(), rel.strip()))
        if not entries:
            raise ValueError(f"{item['type']}: нет пар label::путь в content")
        limit = 4 if item["type"] == "gallery" else 3
        props["items"] = [{"label": lab, "img": _data_uri(rel)}
                          for lab, rel in entries[:limit]]
    dest_dir = Path(dest_dir)
    build = _remotion_bundle(log)
    # props лежит ВНУТРИ папки вывода и удаляется в finally. Раньше он падал
    # рядом с ней (dest_dir.parent) и не убирался вообще: в корне репозитория
    # скопились десятки осиротевших tmp*_props.json, причём у popup/collage
    # внутри картинки в base64 — то есть файлы жирные. Внутри папки вывода он
    # к тому же исчезает вместе с временной папкой, даже если процесс убили.
    # Путь при этом НЕ удлинился ни на символ: «<имя>/props.json» ровно той же
    # длины, что «<имя>_props.json». Это важно — props уходит в командную
    # строку remotion/ffmpeg, а она здесь уже упиралась в лимит Windows
    # 32767 символов и рушила рендер после трёх часов работы.
    dest_dir.mkdir(parents=True, exist_ok=True)
    props_file = dest_dir / "props.json"
    props_file.write_text(json.dumps(props, ensure_ascii=False),
                          encoding="utf-8")
    cmd = [_npx(), "remotion", "render", str(build), "Overlay", str(dest_dir),
           "--sequence", "--image-format=png", f"--props={props_file}",
           "--log=error"]
    if frame_range:
        cmd.append(f"--frames={frame_range}")
    try:
        r = run_tree(cmd, 900, cwd=REMOTION_DIR, env=_node_env())
    finally:
        props_file.unlink(missing_ok=True)
    if r.returncode != 0:
        raise RuntimeError(f"remotion render: {r.stderr[-300:]}")
    frames = sorted(dest_dir.glob("*.png"),
                    key=lambda p: int(re.sub(r"[^\d]", "", p.stem) or 0))
    if not frames:
        raise RuntimeError("remotion render: нет кадров на выходе")
    for i, f in enumerate(frames):   # element-N.png -> %04d.png для ffmpeg
        f.rename(dest_dir / f"{i:04d}.png")
    return W, H


WM_INTRO = 0.7      # сек: за это время бейдж въезжает и окончательно замирает


def _even_span(a: int, b: int, limit: int) -> tuple[int, int]:
    """Границы среза с чётной длиной: на нечётной ширине или высоте оверлея
    ffmpeg спотыкается о цветовую подвыборку yuv420."""
    if (b - a) % 2:
        if b < limit:
            b += 1
        elif a > 0:
            a -= 1
    return a, b


def _render_watermark(item: dict, W: int, H: int, fps: int, dest_dir: Path,
                      out_dir: Path, log=print, variant: str | None = None):
    """Водяной знак — единственный оверлей длиной во ВЕСЬ ролик, и покадрово
    рендерить его нельзя: 12 минут при 30 fps — это 21600 полноэкранных PNG,
    десятки гигабайт временных файлов и упёртый таймаут Remotion задолго до
    конца (то есть ролик не выходит вовсе, стоит задать каналу watermark).

    Но бейдж по смыслу статичен: он один раз въезжает и дальше не меняется
    ни на пиксель (Watermark в Overlay.tsx). Поэтому движком считаем только
    въезд, а весь остаток секвенции — копии последнего кадра. props.dur при
    этом остаётся полным, так что кривая появления ровно та же, что и была.

    Кадры ещё и обрезаются по общей непрозрачной области: бейдж занимает
    ~200x40 пикселей в углу, а ffmpeg иначе на КАЖДОМ кадре всего ролика
    накладывал бы полноэкранную RGBA-картинку ради этого уголка.

    Выкладывать остаток пофайлово всё равно приходится: render.py отдаёт
    секвенцию ffmpeg как image2 (-framerate/-start_number), а туда ни видео,
    ни одиночную картинку не подставить — эти ключи есть только у image2, и
    на любом другом демуксере ffmpeg просто отказывается открывать вход.
    Зато файлы теперь крохотные и физически одинаковые.
    -> (cw, ch, x, y)"""
    from PIL import Image
    dest = Path(dest_dir)
    n_intro = max(int(round(min(item["dur"], WM_INTRO) * fps)), 2)
    _render_remotion(item, W, H, fps, dest, out_dir, log, variant=variant,
                     frame_range=f"0-{n_intro - 1}")
    made = sorted(dest.glob("*.png"))
    box = None                       # объединённая рамка по всем кадрам въезда
    for f in made:
        with Image.open(f) as im:
            b = im.convert("RGBA").getchannel("A").getbbox()
        if b:
            box = b if box is None else (min(box[0], b[0]), min(box[1], b[1]),
                                         max(box[2], b[2]), max(box[3], b[3]))
    if box is None:
        raise RuntimeError("бейдж вышел полностью прозрачным — нечего "
                           "накладывать")
    x0, x1 = _even_span(box[0], box[2], W)
    y0, y1 = _even_span(box[1], box[3], H)
    for f in made:
        with Image.open(f) as im:
            crop = im.convert("RGBA").crop((x0, y0, x1, y1))
        crop.save(f)
    total = max(int(round(item["dur"] * fps)), len(made))
    still = made[-1].read_bytes()
    for i in range(len(made), total):
        (dest / f"{i:04d}.png").write_bytes(still)
    log(f"[Оверлеи] Водяной знак {x1 - x0}x{y1 - y0} в углу: движком "
        f"{len(made)} кадр(ов) въезда, дальше {total - len(made)} копий "
        "замершего кадра (полноэкранная секвенция на весь ролик — это "
        "часы рендера и гигабайты)")
    return x1 - x0, y1 - y0, x0, y0


def render_thumbnail(headline: str, dest: Path, bg: Path | None = None,
                     layout: str = "left", accent: str = "#f5c451",
                     log=print) -> Path:
    """Обложка для YouTube (1280x720 JPG) композицией Thumbnail.

    Отдельная функция, а не тип оверлея: у обложки противоположные
    требования — непрозрачный фон на весь кадр и кегль, читаемый в ленте
    шириной ~210px. Картинка фона уходит в props как data-URI, как и у
    popup/collage: у Remotion своя рабочая папка, относительный путь оттуда
    не разрешится."""
    dest = Path(dest)
    dest.parent.mkdir(parents=True, exist_ok=True)
    props = {"headline": headline, "layout": layout, "accent": accent, "bg": ""}
    if bg and Path(bg).exists():
        # Фон ужимаем до размера обложки ПЕРЕД вставкой: генератор отдаёт
        # апскейл до 2K (6+ МБ), а в base64 это раздувало props.json до
        # 8.5 МБ — Remotion парсил его целиком ради картинки, которую всё
        # равно масштабирует в 1280x720. При сбое Pillow берём файл как есть.
        raw = Path(bg).read_bytes()
        mime = "jpeg"
        try:
            from PIL import Image
            import io as _io
            im = Image.open(Path(bg)).convert("RGB")
            if im.width > 1280:
                im = im.resize((1280, round(im.height * 1280 / im.width)),
                               Image.LANCZOS)
            buf = _io.BytesIO()
            im.save(buf, format="JPEG", quality=88)
            raw = buf.getvalue()
        except Exception as e:
            log(f"[Обложка] Не смог ужать фон ({e}) — вставляю как есть")
            mime = {"jpg": "jpeg", "jpeg": "jpeg", "png": "png",
                    "webp": "webp"}.get(Path(bg).suffix.lower().lstrip("."),
                                        "jpeg")
        props["bg"] = (f"data:image/{mime};base64,"
                       + base64.b64encode(raw).decode("ascii"))
    props_file = dest.parent / f".{dest.stem}_props.json"
    props_file.write_text(json.dumps(props, ensure_ascii=False), encoding="utf-8")
    build = _remotion_bundle(log)
    try:
        r = run_tree(
            [_npx(), "remotion", "still", str(build), "Thumbnail", str(dest),
             f"--props={props_file}", "--log=error"], 300,
            cwd=REMOTION_DIR, env=_node_env())
    finally:
        props_file.unlink(missing_ok=True)
    if r.returncode != 0 or not dest.exists():
        raise RuntimeError(f"remotion still: {r.stderr[-300:]}")
    return dest


def _render_hyperframes(item: dict, W: int, H: int, fps: int, dest_dir: Path,
                        log=print, composition: str | None = None):
    """Один оверлей через HyperFrames -> PNG-секвенция %04d.png с альфой.
    composition — путь относительно hyperframes/ (например
    "compositions/lower3_chyron.html"); None рендерит index.html по
    умолчанию (banner). Кадр всегда полноэкранный, как и у Remotion
    (позиция — внутри HTML).

    Вызов идёт через `npm run render --` (скрипт из package.json), а не
    голый `npx hyperframes` — у HyperFrames нет локального node_modules,
    и «сырой» npx без --yes/пина версии молча отказывается ставить пакет
    в неинтерактивном режиме (subprocess, без TTY): падает с «could not
    determine executable to run». package.json уже пинит нужную версию
    с --yes — npm run переиспользует именно её."""
    variables = json.dumps({"content": item["content"], "dur": item["dur"]},
                           ensure_ascii=False)
    dest_dir = Path(dest_dir)
    dest_dir.mkdir(parents=True, exist_ok=True)
    # Композиция design-размера 1920x1080 (data-width/height фиксированы —
    # нельзя переопределить переменными, это не как dur). --resolution тут
    # не годится: сам CLI отказывает его сочетать с альфа-форматами
    # (png-sequence/webm/mov) — «alpha screenshot path does not yet apply
    # deviceScaleFactor». Поэтому рендерим на нативном 1920x1080 и, если
    # нужен другой размер, отдельно апскейлим кадры через ffmpeg с
    # сохранением альфы — без этого на 4K оверлей окажется мелким в углу,
    # а на меньшем холсте центрированный текст уедет за кадр (обрезка).
    cmd = [_npm(), "run", "render", "--"]
    if composition:
        cmd += ["-c", composition]
    cmd += ["--format", "png-sequence", "-o", str(dest_dir),
           "--variables", variables, "--quiet"]
    r = run_tree(cmd, 300, cwd=HYPERFRAMES_DIR, env=_node_env())
    if r.returncode != 0:
        raise RuntimeError(f"hyperframes render: {r.stderr[-300:]}")
    frames = sorted(dest_dir.glob("*.png"),
                    key=lambda p: int(re.sub(r"[^\d]", "", p.stem) or 0))
    if not frames:
        raise RuntimeError("hyperframes render: нет кадров на выходе")
    for i, f in enumerate(frames):   # frame_NNNNNN.png -> %04d.png для ffmpeg
        f.rename(dest_dir / f"{i:04d}.png")
    if (W, H) != (1920, 1080):
        scaled = dest_dir / "_scaled"
        scaled.mkdir(exist_ok=True)
        r = subprocess.run(
            ["ffmpeg", "-y", "-framerate", str(fps), "-start_number", "0",
             "-i", str(dest_dir / "%04d.png"),
             "-vf", f"scale={W}:{H}:flags=lanczos",
             "-pix_fmt", "rgba", str(scaled / "%04d.png")],
            capture_output=True, text=True, timeout=300,
            creationflags=CREATE_NO_WINDOW)
        if r.returncode != 0:
            raise RuntimeError(f"hyperframes upscale: {r.stderr[-300:]}")
        for f in dest_dir.glob("*.png"):
            f.unlink()
        for f in scaled.glob("*.png"):
            f.rename(dest_dir / f.name)
        scaled.rmdir()
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


def _project_variant(out_dir, kind: str, options: tuple[str, ...]) -> str:
    """Какой из нескольких непохожих дизайнов типа `kind` достанется этому
    проекту — детерминированно от его пути (тот же приём, что и в
    core.project_style() для голоса/темпа/цветокора): один проект — один
    стабильный вид на всё видео, разные проекты — разные, не рандом на
    каждый отдельный оверлей. `kind` солится в seed отдельно от пути,
    чтобы выбор для banner и для lower3 в одном и том же проекте не
    коррелировал (не оба всегда попадали на один и тот же индекс)."""
    import zlib
    import random as _random
    return _random.Random(_project_seed(out_dir, kind)).choice(options)


def _project_seed(out_dir, kind: str) -> int:
    """Зерно выбора: путь проекта ПЛЮС отпечаток сценария.

    Одного пути было мало. Проект канала — это одна и та же папка для всех
    его роликов подряд (webapp.channel_select делает рабочей папкой саму
    папку канала), поэтому crc32(путь|тип) — величина постоянная, и канал
    получал один и тот же дизайн навсегда. Отпечаток сценария меняется от
    ролика к ролику и при этом одинаков при повторном рендере того же
    ролика — то есть вид остаётся воспроизводимым, но перестаёт быть вечным.
    """
    import zlib
    salt = ""
    try:
        salt = (Path(out_dir) / "script.txt").read_text(
            encoding="utf-8", errors="replace")[:4000]
    except OSError:
        pass                # сценария ещё нет — падаем на прежнее поведение
    return zlib.crc32(f"{Path(out_dir).resolve()}|{kind}|{salt}".encode())


# 3 визуально непохожих дизайна banner (форма/позиция/анимация, не только
# цвет) — жалоба была именно на то, что один и тот же шаблон кочует между
# видео перекрашенным. remotion_classic: Banner (плашка сверху, слайд
# вниз). remotion_ribbon: BannerRibbon (угловая лента слева, въезд со
# скосом). hyperframes_wipe: hyperframes/index.html (бар снизу, wipe
# слева направо). См. remotion/src/Overlay.tsx.
BANNER_VARIANTS = ("remotion_classic", "remotion_ribbon", "hyperframes_wipe")

# 3 варианта lower3: remotion_classic (LowerThird — светящаяся плашка,
# слайд слева), remotion_underline (LowerThirdUnderline — без фона,
# дорисовывается акцентная черта), hyperframes_chyron (сплошной
# broadcast-блок, wipe). См. remotion/src/Overlay.tsx и
# hyperframes/compositions/lower3_chyron.html.
LOWER3_VARIANTS = ("remotion_classic", "remotion_underline", "hyperframes_chyron")

# 2 варианта counter: remotion_classic (Counter — крупное число по центру),
# remotion_tag (CounterTag — бирка «состаренная бумага» с рваными/
# скошенными краями, угол экрана и наклон детерминированы от текста —
# референс: документальные каналы с бумажными вставками-фактами).
COUNTER_VARIANTS = ("remotion_classic", "remotion_tag")

# Типы, у которых есть РУЧНЫЕ варианты. Остальные начинают с одного
# классического вида и обрастают только тем, что нагенерирует ИИ.
BASE_VARIANTS = {
    "banner": BANNER_VARIANTS,
    "lower3": LOWER3_VARIANTS,
    "counter": COUNTER_VARIANTS,
}

VARIANTS_META = Path(__file__).parent / "variants.json"
VARIANTS_DIR = Path(__file__).parent / "remotion" / "src" / "variants"


def load_variants_meta() -> dict:
    """Библиотека накопленных ИИ-вариантов. Живёт здесь, а не в
    gen_remotion_gemini: тот импортирует overlays, обратная связь дала бы
    циклический импорт — а реестр нужен именно на рендере."""
    try:
        return json.loads(VARIANTS_META.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}      # библиотеки ещё нет — это норма, не ошибка


def save_variants_meta(meta: dict) -> None:
    VARIANTS_META.write_text(json.dumps(meta, ensure_ascii=False, indent=2),
                             encoding="utf-8")


def rebuild_registry(log=print, meta: dict | None = None) -> int:
    """Пересобирает variants/_registry.ts. Механически, без ИИ: Remotion
    собирает бандл статически, динамический import() в него не попадёт.

    Запись пропускается, если файла нет на диске или она выключена
    (enabled=false). Это критично: ссылка на удалённый файл роняет СБОРКУ
    ЦЕЛИКОМ, то есть все оверлеи ролика, а не только свой вариант."""
    meta = load_variants_meta() if meta is None else meta
    live = {}
    for key, rec in sorted(meta.items()):
        if not rec.get("enabled", True):
            continue
        # в реестр Remotion попадают ТОЛЬКО его варианты: у HyperFrames
        # свои файлы .html, они подключаются флагом -c при рендере и в
        # статический бандл React не входят
        if rec.get("engine", "remotion") != "remotion":
            continue
        fname = rec.get("file", "")
        if not fname or not (VARIANTS_DIR / fname).exists():
            log(f"[Варианты] {key}: файла {fname or '?'} нет — пропускаю")
            continue
        live[key] = rec
    imports = "".join(
        f"import {{ {rec['component']} }} from './{Path(rec['file']).stem}';\n"
        for rec in live.values())
    entries = "".join(f"  '{key}': {rec['component']},\n"
                      for key, rec in live.items())
    VARIANTS_DIR.mkdir(parents=True, exist_ok=True)
    (VARIANTS_DIR / "_registry.ts").write_text(
        "// АВТОГЕНЕРИРУЕМЫЙ ФАЙЛ — не редактировать руками.\n"
        "// Пересоздаётся из overlays.rebuild_registry() по variants.json.\n"
        "// Нужен потому, что Remotion собирает бандл статически:\n"
        "// динамический import() в бандл не попадёт.\n"
        "import React from 'react';\n"
        "import type { VariantProps } from '../types';\n"
        f"{imports}\n"
        "export const VARIANTS: Record<string, React.FC<VariantProps>> = {\n"
        f"{entries}}};\n",
        encoding="utf-8")
    return len(live)


def _registry_is_stale() -> bool:
    """Реестр ссылается на файл, которого больше нет (вариант удалили руками)?
    Такой импорт уронит сборку всех оверлеев, поэтому перед рендером сверяем."""
    reg = VARIANTS_DIR / "_registry.ts"
    if not reg.exists():
        return True
    try:
        text = reg.read_text(encoding="utf-8")
    except OSError:
        return True
    for stem in re.findall(r"from '\./([^']+)'", text):
        if stem != "../types" and not (VARIANTS_DIR / f"{stem}.tsx").exists():
            return True
    expected = sum(1 for rec in load_variants_meta().values()
                   if rec.get("enabled", True)
                   and rec.get("engine", "remotion") == "remotion"
                   and (VARIANTS_DIR / rec.get("file", "")).exists())
    return text.count("':") != expected


def _variant_file(rec: dict) -> Path:
    """Где лежит файл варианта — зависит от движка: у Remotion это .tsx в
    remotion/src/variants/, у HyperFrames — .html в hyperframes/."""
    if rec.get("engine", "remotion") == "hyperframes":
        return HYPERFRAMES_DIR / rec.get("file", "")
    return VARIANTS_DIR / rec.get("file", "")


def _library_variants(kind: str, engine: str | None = None,
                      channel: str = "") -> tuple[str, ...]:
    """Накопленные ИИ-варианты для типа `kind` — те, что прошли проверку в
    прошлых роликах и остались в библиотеке навсегда. Запись без файла на
    диске игнорируем. engine=None — оба движка.

    channel — берутся ТОЛЬКО варианты этого канала плюс общие (без метки
    канала). Иначе оверлей, придуманный для канала про сантехнику, всплыл бы
    на канале про полярные экспедиции, и каналы стали бы неотличимы — ровно
    то, ради чего профили и заводятся.

    Пустой channel — это НЕ «бери любые»: у проекта, заведённого мимо
    каналов (например «Новый проект» с вручную вставленным сценарием),
    канала в meta.json нет, и раньше ему подходили варианты сразу всех
    каналов — то есть утечка шла именно там, где о ней некому догадаться.
    Теперь такому проекту достаются только общие варианты. Пока каналы не
    заведены вовсе, метки channel нет ни у одной записи, и общими остаются
    все — библиотека работает как раньше."""
    return tuple(
        rec["variant"] for rec in load_variants_meta().values()
        if rec.get("type") == kind and rec.get("enabled", True)
        and rec.get("variant")
        and (engine is None or rec.get("engine", "remotion") == engine)
        and rec.get("channel", "") in ("", channel)
        and _variant_file(rec).exists())


def _project_channel(out_dir) -> str:
    """К какому каналу относится проект — из его meta.json. Пусто, если
    проект заведён мимо каналов: тогда доступны только общие варианты
    (см. _library_variants), а не библиотека чужих каналов."""
    try:
        meta = json.loads((Path(out_dir) / "meta.json").read_text(encoding="utf-8"))
        return str(meta.get("channel", "")).strip()
    except (OSError, ValueError):
        return ""


def _pick_variant(out_dir, kind: str) -> str:
    """Вариант для типа на это видео: ручные + накопленные ИИ ОБОИХ движков
    в одном жребии, но только те, что принадлежат каналу этого проекта.
    Чем больше библиотека, тем реже повторяется вид между роликами.
    Префикс имени говорит, чем рендерить."""
    return _project_variant(out_dir, kind, _variant_options(out_dir, kind))


def _variant_options(out_dir, kind: str) -> tuple[str, ...]:
    """Все виды, доступные этому проекту для типа `kind`: ручные + принятые
    ИИ обоих движков, отфильтрованные по каналу проекта. Вынесено отдельно,
    потому что нужно в двух местах — для выбора одного вида и для колеса
    чередования внутри ролика; расхождение этих двух наборов означало бы,
    что в логе написан один вариант, а рисуется другой."""
    ch = _project_channel(out_dir)
    base = BASE_VARIANTS.get(kind, ("remotion_classic",))
    lib = tuple(f"remotion_{v}"
                for v in _library_variants(kind, "remotion", ch))
    if hyperframes_available():
        lib += tuple(f"hyperframes_{v}"
                     for v in _library_variants(kind, "hyperframes", ch))
    return base + lib


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
    # Реестр мог устареть: вариант удалили руками, а импорт на него остался —
    # это уронило бы сборку ВСЕХ оверлеев, не только своего. Чиним молча.
    if _registry_is_stale():
        n = rebuild_registry(log)
        log(f"[Оверлеи] Реестр вариантов был неактуален — пересобран ({n})")
    # по варианту на КАЖДЫЙ встреченный тип: у banner/lower3/counter в жребии
    # участвуют и ручные виды, у остальных — только накопленные ИИ (если есть)
    picked = {kind: _pick_variant(out_dir, kind)
              for kind in {it["type"] for it in items}}
    # Одного варианта на тип на весь ролик мало: в 20-минутном ролике
    # набирается под полтора десятка lower3, и все они выходили одним
    # дизайном — зритель видит шаблон. Держим ВЕСЬ доступный набор на тип и
    # прокручиваем его по ходу ролика (порядок перемешан зерном ролика,
    # так что и последовательность у каждого видео своя).
    import random as _rnd
    wheel, wheel_pos = {}, {}
    for kind in {it["type"] for it in items}:
        opts = list(_variant_options(out_dir, kind))
        _rnd.Random(_project_seed(out_dir, kind)).shuffle(opts)
        wheel[kind] = opts
        wheel_pos[kind] = 0
    banner_variant = picked.get("banner", "remotion_classic")
    lower3_variant = picked.get("lower3", "remotion_classic")
    counter_variant = picked.get("counter", "remotion_classic")
    hf_note = " + HyperFrames для banner/lower3" if hyperframes_available() else ""
    log(f"[Оверлеи] {len(items)} шт. — движок: "
        + ("Remotion (кинокачество)" if engine == "remotion"
           else "Pillow (быстрый)") + hf_note)
    ai_picked = {k: v for k, v in picked.items()
                 if v.startswith(("remotion_ai_", "hyperframes_ai_"))}
    log("[Оверлеи] Варианты на это видео: "
        + ", ".join(f"{k}={v}" for k, v in sorted(picked.items())))
    if ai_picked:
        log(f"[Оверлеи] Из библиотеки ИИ: {len(ai_picked)} шт. "
            + ", ".join(sorted(ai_picked)))
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
        if it["type"] not in renderers:
            # compare/banner/collage/titlecard — только Remotion (banner
            # ещё и HyperFrames, см. build_overlays), у Pillow для них нет
            # аналога; явная причина вместо голого KeyError
            raise RuntimeError(
                f"тип «{it['type']}» недоступен ни через один установленный "
                "движок — нет питоновского запасного рендерера")
        return renderers[it["type"]](it["content"], it["dur"], fps, W, H, dest)

    def _note_fallback(it: dict, design: str, err) -> None:
        """Выбранный дизайн не отрисовался, оверлей нарисован встроенным
        видом. Зритель видит плашку — но не ту, что задумана, и одинаковую
        с соседними. Отдельной строкой в журнале это терялось."""
        import quality
        quality.degraded(
            "Оверлеи",
            f"оверлей «{it['type']}» нарисован встроенным видом вместо "
            "задуманного дизайна",
            why=f"{design} не отрисовался: {str(err)[:100]}",
            level="заметно")

    out = []
    for k, it in enumerate(items):
        try:
            dest = Path(tmp) / f"ovl_{k:02d}"
            used_engine = engine
            variant_done = False
            # Следующий вид по колесу: повторы одного типа внутри ролика
            # идут разными дизайнами. Водяной знак — исключение, он один на
            # весь ролик и обязан выглядеть одинаково от начала до конца.
            opts = wheel.get(it["type"]) or []
            if opts and it["type"] != "watermark":
                lib_pick = opts[wheel_pos[it["type"]] % len(opts)]
                wheel_pos[it["type"]] += 1
            else:
                lib_pick = picked.get(it["type"], "")
            # Водяной знак идёт мимо всех общих веток: у него длительность
            # всего ролика, и покадровый рендер такой длины невозможен в
            # принципе — почему именно, см. _render_watermark. Вариант из
            # библиотеки он при этом уважает, просто рисует его иначе.
            if it["type"] == "watermark" and engine == "remotion":
                # Водяной знак умеет только Remotion-варианты: у HyperFrames
                # нет позиционирования в углу, которое тут нужно. Раньше
                # выбранный hyperframes-вариант просто обнулялся молча, и было
                # непонятно, почему знак выглядит стандартно.
                if lib_pick.startswith("hyperframes_ai_"):
                    log(f"[Оверлеи] Водяной знак: вариант {lib_pick} "
                        f"(HyperFrames) тут не применим — рисую встроенным.")
                cw, ch, x, y = _render_watermark(
                    it, W, H, fps, dest, Path(out_dir), log,
                    variant=(lib_pick[len("remotion_"):]
                             if lib_pick.startswith("remotion_ai_") else None))
                used_engine = "remotion"
                variant_done = True
            # Вариант из библиотеки ИИ — один общий путь для ЛЮБОГО типа:
            # все они рендерятся Remotion'ом, отличается только имя варианта,
            # по которому Overlay.tsx находит компонент в реестре. Не прошёл —
            # молча падаем в ручные ветки ниже, ролик не страдает.
            elif lib_pick.startswith("remotion_ai_") and engine == "remotion":
                try:
                    cw, ch = _render_remotion(
                        it, W, H, fps, dest, Path(out_dir), log,
                        variant=lib_pick[len("remotion_"):])
                    x = y = 0
                    used_engine = "remotion"
                    variant_done = True
                except Exception as e:
                    log(f"[Оверлеи] Вариант из библиотеки {lib_pick} не "
                        f"справился ({e}) — откат на встроенный вид.")
                    _note_fallback(it, f"вариант из библиотеки {lib_pick}", e)
                    for old in Path(dest).glob("*.png"):
                        old.unlink()
            elif lib_pick.startswith("hyperframes_ai_") and not hyperframes_available():
                log(f"[Оверлеи] Вариант {lib_pick} требует HyperFrames, а он "
                    f"не установлен — рисую встроенным видом.")
                import quality
                quality.degraded(
                    "Оверлеи",
                    f"оверлей «{it['type']}» нарисован встроенным видом: "
                    "вариант из библиотеки требует HyperFrames",
                    why="HyperFrames на этой машине не установлен",
                    hint="поставь Node.js/npm — без них варианты HyperFrames "
                         "из библиотеки не рисуются вообще",
                    level="мелочь")
            elif lib_pick.startswith("hyperframes_ai_"):
                # у HyperFrames вариант — это отдельный .html, путь к нему
                # лежит в библиотеке; движок ролика тут не важен, он умеет
                # рендерить альфу независимо от Remotion
                rec = next((r for r in load_variants_meta().values()
                            if r.get("variant") == lib_pick[len("hyperframes_"):]
                            and r.get("engine") == "hyperframes"), None)
                try:
                    if not rec:
                        raise RuntimeError("нет записи в библиотеке")
                    cw, ch = _render_hyperframes(it, W, H, fps, dest, log,
                                                 composition=rec["file"])
                    x = y = 0
                    used_engine = "hyperframes"
                    variant_done = True
                except Exception as e:
                    log(f"[Оверлеи] Вариант из библиотеки {lib_pick} не "
                        f"справился ({e}) — откат на встроенный вид.")
                    _note_fallback(it, f"вариант из библиотеки {lib_pick}", e)
                    for old in Path(dest).glob("*.png"):
                        old.unlink()
            if variant_done:
                pass          # уже отрисовано библиотечным вариантом
            elif it["type"] == "banner":
                if banner_variant == "hyperframes_wipe" and hyperframes_available():
                    try:
                        cw, ch = _render_hyperframes(it, W, H, fps, dest, log)
                        x = y = 0      # HyperFrames тоже рендерит полный кадр
                        used_engine = "hyperframes"
                        variant_done = True
                    except Exception as e:
                        log(f"[Оверлеи] HyperFrames не справился ({e}) — "
                            "откат на классический banner.")
                        _note_fallback(it, "вид hyperframes_wipe", e)
                        for old in Path(dest).glob("*.png"):
                            old.unlink()
                elif banner_variant == "remotion_ribbon" and engine == "remotion":
                    try:
                        cw, ch = _render_remotion(it, W, H, fps, dest,
                                                  Path(out_dir), log,
                                                  variant="ribbon")
                        x = y = 0
                        used_engine = "remotion"
                        variant_done = True
                    except Exception as e:
                        log(f"[Оверлеи] Remotion (ribbon) не справился ({e}) — "
                            "откат на классический banner.")
                        _note_fallback(it, "вид remotion_ribbon", e)
                        for old in Path(dest).glob("*.png"):
                            old.unlink()
            elif it["type"] == "lower3":
                if lower3_variant == "hyperframes_chyron" and hyperframes_available():
                    try:
                        cw, ch = _render_hyperframes(
                            it, W, H, fps, dest, log,
                            composition="compositions/lower3_chyron.html")
                        x = y = 0
                        used_engine = "hyperframes"
                        variant_done = True
                    except Exception as e:
                        log(f"[Оверлеи] HyperFrames не справился ({e}) — "
                            "откат на классический lower3.")
                        _note_fallback(it, "вид hyperframes_chyron", e)
                        for old in Path(dest).glob("*.png"):
                            old.unlink()
                elif lower3_variant == "remotion_underline" and engine == "remotion":
                    try:
                        cw, ch = _render_remotion(it, W, H, fps, dest,
                                                  Path(out_dir), log,
                                                  variant="underline")
                        x = y = 0
                        used_engine = "remotion"
                        variant_done = True
                    except Exception as e:
                        log(f"[Оверлеи] Remotion (underline) не справился "
                            f"({e}) — откат на классический lower3.")
                        _note_fallback(it, "вид remotion_underline", e)
                        for old in Path(dest).glob("*.png"):
                            old.unlink()
            elif it["type"] == "counter" and counter_variant == "remotion_tag" \
                    and engine == "remotion":
                try:
                    cw, ch = _render_remotion(it, W, H, fps, dest,
                                              Path(out_dir), log, variant="tag")
                    x = y = 0
                    used_engine = "remotion"
                    variant_done = True
                except Exception as e:
                    log(f"[Оверлеи] Remotion (tag) не справился ({e}) — "
                        "откат на классический counter.")
                    _note_fallback(it, "вид remotion_tag", e)
                    for old in Path(dest).glob("*.png"):
                        old.unlink()
            if not variant_done and engine == "remotion":
                try:
                    cw, ch = _render_remotion(it, W, H, fps, dest,
                                              Path(out_dir), log)
                    x = y = 0          # Remotion рендерит полный кадр
                except Exception as e:
                    log(f"[Оверлеи] Remotion не справился ({e}) — "
                        "этот оверлей рисует Pillow.")
                    # Сюда же приходит и упавшая сборка бандла: она бьёт по
                    # КАЖДОМУ оверлею, и весь ролик уезжает на Pillow. Одна
                    # строка «×N» в итоге и покажет масштаб.
                    import quality
                    quality.degraded(
                        "Оверлеи",
                        "плашки нарисованы простым видом (Pillow) вместо "
                        "кинематографической анимации",
                        why=f"Remotion не отработал: {str(e)[:120]}",
                        hint="проверь Node.js и папку remotion/node_modules "
                             "(npm install), там же — причина в журнале",
                        level="заметно")
                    used_engine = "pillow"
                    for old in Path(dest).glob("*.png"):
                        old.unlink()
            if used_engine == "pillow":
                cw, ch = _pillow(it, dest)
                x, y = _position(it["pos"], it["type"], cw, ch, W, H)
            out.append({"pattern": str(dest / "%04d.png"),
                        "t0": it["t"], "t1": it["t"] + it["dur"],
                        "x": x, "y": y, "type": it["type"]})
            mm, ss = divmod(int(it["t"]), 60)
            log(f"[Оверлеи] {mm:02d}:{ss:02d} {it['type']}: "
                f"{it['content'][:50]} -> OK ({used_engine})")
        except Exception as e:
            log(f"[Оверлеи] Строка {it.get('line', '?')} ({it['type']}): "
                f"пропущен — {e}")
            # В кадре на этом месте не появится НИЧЕГО, а «оверлеи собраны»
            # всё равно напишется. Именно это и не отличалось на глаз от
            # нормального ролика без просмотра целиком.
            import quality
            no_engine = "запасного рендерера" in str(e)
            quality.degraded(
                "Оверлеи",
                f"оверлей «{it['type']}» не появился в кадре"
                + (": такой вид умеет рисовать только Remotion"
                   if no_engine else ""),
                why=str(e)[:120],
                hint=("поставь Node.js и зависимости в папке remotion/ "
                      "(npm install) — без них типы compare/banner/collage/"
                      "titlecard пропадают целиком") if no_engine else "",
                level="критично")
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
                          log=print, min_gap: float = 5.0,
                          watermark: str = "") -> str:
    """Полный автомат: авторасстановка + автоподбор картинок для popup.
    Реальных людей (два слова с заглавных — похоже на имя) ищем ТОЛЬКО в
    Wikimedia Commons: ИИ-генерация лиц реальных людей сознательно не
    используется — фейковое лицо в документалке вводит зрителя в
    заблуждение; если фото не нашлось, остаётся пометка NEEDS_IMAGE для
    ручного добавления. Для остального (места, понятия, абстрактные темы) —
    VeoNonStop (Banana) как ОСНОВНОЙ генератор иллюстрации, Wikimedia —
    фолбэк, если Veo недоступен/упал.

    Плотность и разнообразие типов — через Gemini (suggest_overlays_llm),
    ОСНОВНОЙ путь: он видит смысл текста целиком и расставляет оверлеи по
    всему ролику (включая titlecard на хуки/смену темы), а не только там,
    где regex находит явные деньги/даты/имена/вопросы. Regex-путь
    (suggest_overlays) — запасной, если ключа нет или LLM не ответил.

    watermark — если задано, на весь ролик добавляется постоянный
    неисчезающий бейдж (не мигает как остальные оверлеи) — против флага
    «inauthentic content» нужен постоянный, не эпизодический признак
    присутствия автора."""
    from pathlib import Path as _P
    from core import fetch_wiki_images, _load_used, _save_used, veo_image
    # Спрашиваем core про ВСЕ ключи, а не только про первый: llm_chat давно
    # умеет перебирать GEMINI_API_KEY2, 3, 4… при 429, но вход в ИИ-путь был
    # заперт на первый ключ — кончилась квота на нём, и остальные ключи уже
    # не спасали, потому что до llm_chat дело не доходило.
    from core import _gemini_keys
    gemini_key = (_gemini_keys() or [""])[0]
    draft = None
    if gemini_key:
        draft = suggest_overlays_llm(rows, gemini_key, log, min_gap)
    if not draft:
        if gemini_key:
            # Громко и с причиной. Раньше эта подмена проходила рядовой
            # строкой журнала, и «оверлеи расставлены» выглядело успехом —
            # хотя вместо смысла текста работала нарезка по словам. Различить
            # хороший ролик и деградировавший было нельзя, пока не откроешь
            # видео. Именно так и терялись длинные ролики.
            msg = ("[Оверлеи] ВНИМАНИЕ: расстановка по смыслу текста НЕ "
                   "удалась — ролик получит моменты, нарезанные по правилам "
                   "(regex), это заметно хуже. Причина выше в журнале: "
                   "обычно это лимит квоты Gemini (добавь ещё ключ "
                   "GEMINI_API_KEY4 в .env) или фильтр безопасности.")
            # уровень «warn» понимает журнал приложения, но сюда передают и
            # обычный print, и однопараметрные лямбды — падать из-за подписи
            # логгера стадия не должна
            try:
                log(msg, "warn")
            except TypeError:
                log(msg)
            import quality
            quality.degraded(
                "Оверлеи", "плашки расставлены нарезкой по словам, а не по "
                "смыслу текста",
                why="основной путь (Gemini) не ответил — причина выше в журнале",
                hint="добавь ещё ключ GEMINI_API_KEY4 в .env; если тема "
                     "тяжёлая, мог сработать фильтр безопасности",
                level="критично")
        draft = suggest_overlays(rows, manifest, min_gap)
        if draft.startswith("#"):
            draft = suggest_overlays_local(rows, min_gap)
    idir = _P(out_dir) / "images"
    idir.mkdir(parents=True, exist_ok=True)
    used = _load_used()
    veo_key = os.getenv("VEO_API_KEY", "").strip()
    person_like = re.compile(r"^[A-ZА-Я][\w'\-]+\s+[A-ZА-Я][\w'\-]+$")

    def _fetch_one(name: str, tag: str):
        """Картинка под одну тему: VeoNonStop для не-людей, иначе/фолбэк —
        Wikimedia (реальных людей ИИ не рисует — см. докстринг функции).
        -> (img_rel, via_ai) или (None, False)."""
        safe = re.sub(r"[^\w\-]+", "_", name)[:30]
        is_person = bool(person_like.match(name.strip()))
        if not is_person and veo_key:
            try:
                jpg = idir / f"ovl_{tag}_{safe}_ai.jpg"
                veo_image(f"{name}, editorial illustration", jpg, veo_key, log)
                return f"images/{jpg.name}", True
            except Exception as e:
                log(f"[Оверлеи] VeoNonStop для «{name}»: не вышло ({e}) — "
                    "пробую Wikimedia")
        try:
            got = fetch_wiki_images(name, 1, idir, f"ovl_{tag}_{safe}", used, log)
            if got:
                return f"images/{got[0].name}", False
        except Exception as e:
            log(f"[Оверлеи] Wikimedia для «{name}»: не вышло ({e})")
        return None, False

    out_lines = []
    for line in draft.splitlines():
        m = re.match(r"# NEEDS_IMAGE: (.+?) — .*?(\d{2}:\d{2}:\d{2}) \| popup",
                     line)
        mc = None if m else re.match(
            r"# NEEDS_COLLAGE: (.+?) — .*?(\d{2}:\d{2}:\d{2}) \| "
            r"(collage|gallery) \| (\S+) \| (\S+)", line)
        if not m and not mc:
            out_lines.append(line)
            continue
        if m:
            name, tc = m.group(1), m.group(2)
            img_rel, via_ai = _fetch_one(name, "p")
            if img_rel:
                out_lines.append(f"{tc} | popup | {img_rel} | top-right | 5s")
                log(f"[Оверлеи] {tc} popup «{name}»: "
                    + ("ИИ-иллюстрация (VeoNonStop)" if via_ai
                       else "фото найдено в Wikimedia"))
            else:
                out_lines.append(line)
            continue
        text, tc, kind, pos, dur = mc.groups()
        entries = []
        for i, chunk in enumerate(text.split(";;")):
            label, _, topic = chunk.partition("::")
            label, topic = label.strip(), topic.strip()
            if not label or not topic:
                continue
            img_rel, _ = _fetch_one(topic, f"c{i}")
            if img_rel:
                entries.append((label, img_rel))
        if len(entries) >= 2:
            keep = 4 if kind == "gallery" else 3
            content = ";;".join(f"{lab}::{rel}" for lab, rel in entries[:keep])
            out_lines.append(f"{tc} | {kind} | {content} | {pos} | {dur}")
            log(f"[Оверлеи] {tc} {kind}: {len(entries)} фото найдено "
                f"({', '.join(lab for lab, _ in entries)})")
        else:
            log(f"[Оверлеи] {tc} {kind}: фото нашлось меньше 2 — пропускаю")
    _save_used(used)
    # Пол плотности — ЗДЕСЬ, а не внутри ИИ-пути: черновик мог прийти и от
    # LLM, и от regex, и от локального запасного, а требование «оверлей
    # хотя бы раз в 15 секунд» одно на всех. Пока пол стоял только в
    # suggest_overlays_llm, отказ LLM тихо ронял плотность в пятнадцать раз.
    total = srt_to_seconds(rows[-1][1]) if rows else 0
    if total > 0:
        out_lines = _topup_overlays(out_lines, rows, min_gap,
                                    density_floor(total), log)
        out_lines.sort(key=lambda l: (not re.match(r"\s*\d{2}:\d{2}:\d{2}", l),
                                      l[:8]))
    if watermark.strip() and rows:
        if total > 0:
            out_lines.insert(0, f"00:00:00 | watermark | {watermark.strip()} "
                                f"| bottom-right | {total:.1f}s")
            log(f"[Оверлеи] Постоянный бейдж на весь ролик: {watermark!r}")
    return "\n".join(out_lines)


def suggest_overlays(rows: list, manifest: list, min_gap: float = 8.0,
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


# ---------- Типы оверлеев: где стоят, из чего собираются ----------

# Позиция по умолчанию. Тип, которого В ЭТОМ СЛОВАРЕ НЕТ, молча становился
# banner — так и потерялись counter, bars, timeline, popup: _type_budget их
# честно просил у модели, а здесь их не было, и каждый такой выбор превращался
# в ещё один баннер. Отсюда 20% баннеров и ноль инфографики в abyss.
# Добавляешь новый вид оверлея — впиши его СЮДА, иначе он не появится в
# роликах никогда, сколько ни описывай его в промпте.
OVL_POS = {"titlecard": "center", "banner": "top", "lower3": "bottom",
           "compare": "center", "callout": "point:70,40", "collage": "center",
           "kinetic": "center", "quote": "center", "stamp": "top",
           "redact": "center", "highlight": "point:62,45", "marker": "center",
           "gallery": "center", "counter": "center", "bars": "center",
           "timeline": "center", "popup": "top-right"}

# Сколько слов влезает в тип, не превращаясь в кашу. Заодно это и список
# типов, которые собираются из ЛЮБОГО текста: ими можно добивать плотность
# и разгружать перекошенное распределение.
OVL_WORDS = {"banner": 9, "lower3": 4, "callout": 7, "kinetic": 6,
             "marker": 8, "highlight": 5, "titlecard": 5, "quote": 12}
PLAIN_TYPES = tuple(OVL_WORDS)

# Ни один тип не имеет права занимать больше этой доли ролика — иначе это
# уже не «расстановка», а один и тот же элемент по кругу.
TYPE_CAP_SHARE = 0.25


def _pairs(text: str) -> list[tuple[str, str]]:
    """'Found:30,Missing:70' -> [('Found','30'),('Missing','70')].
    Ровно так же, как читают content рендереры bars и timeline."""
    out = []
    for chunk in text.split(","):
        if ":" in chunk:
            a, _, b = chunk.partition(":")
            if a.strip() and b.strip():
                out.append((a.strip(), b.strip()))
    return out


def _fits_type(otype: str, text: str) -> tuple[bool, str]:
    """Соберётся ли этот тип из такого текста. -> (годен, текст).

    Проверка ровно та, что делает рендерер: bars ищет пары label:число,
    timeline — пары год:событие, counter — число. Не сойдётся формат —
    рендерер бросит исключение, и оверлей пропадёт из ролика уже на сборке."""
    if otype == "compare":
        return ("::" in text), text
    if otype in ("quote", "stamp", "titlecard"):
        # вторая часть (автор, дата, подзаголовок) может быть пустой, но сам
        # разделитель нужен — иначе компонент нарисует строку одним куском
        return True, (text if "::" in text else text + "::")
    if otype == "redact":
        return ("*" in text and "::" in text), text
    if otype in ("collage", "gallery"):
        return (text.count(";;") >= 1 and "::" in text), text
    if otype == "counter":
        return bool(re.search(r"\d", text)), text
    if otype == "bars":
        ps = _pairs(text)
        ok = len(ps) >= 2 and all(re.search(r"\d", v) for _, v in ps)
        return ok, text
    if otype == "timeline":
        ps = _pairs(text)
        return (len(ps) >= 2 and all(re.search(r"\d", y) for y, _ in ps)), text
    if otype == "popup":
        return bool(text.strip()) and len(text.split()) <= 6, text
    return bool(text.strip()), text


def _as_plain(text: str, otype: str) -> str:
    """Текст структурного типа — в обычную плашку: разделители в человеческие
    знаки, длина под тип."""
    t = text.replace("::", " — ").replace(";;", ", ").replace("*", "")
    t = " ".join(t.split()).strip(" —,")
    t = " ".join(t.split()[:OVL_WORDS.get(otype, 8)])
    return (t + "::") if otype in ("quote", "titlecard") else t


def _spare_type(counts: dict, pool: tuple = PLAIN_TYPES) -> str:
    """Самый недоиспользованный из обычных типов. Именно это раньше делалось
    словом «banner»: любая неудача — ещё один баннер, отсюда и перекос."""
    return min(pool, key=lambda k: (counts.get(k, 0), pool.index(k)))


def _auto_moment(text: str, counts: dict) -> tuple[str, str]:
    """Тип и содержимое для ДОБОРНОГО оверлея по одной строке субтитров.

    Добор — не мелочь: на длинном ролике им ставится больше половины плашек,
    и пока он крутил по кругу три типа (banner/lower3/callout), он один и
    делал те самые 83% однообразия. Теперь сначала смотрим, какой материал в
    строке ЕСТЬ (два года -> timeline, число -> counter, место и год ->
    stamp, вопрос -> callout), и только потом берём самый редкий обычный тип.
    Ничего не выдумываем: если в строке нет пар для bars — bars и не будет,
    рисовать несуществующие цифры хуже, чем поставить обычную плашку."""
    words = text.split()
    years = [(m.start(), m.group(0)) for m in re.finditer(r"\b(19|20)\d{2}\b",
                                                          text)]
    if len(years) >= 2 and counts.get("timeline", 0) <= counts.get("banner", 0):
        pts = []
        for pos, yr in years[:3]:
            tail = " ".join(text[pos + len(yr):].split()[:2]).strip(" ,.;:")
            tail = tail.replace(":", " ").replace("|", " ")
            if tail:
                pts.append(f"{yr}:{tail}")
        if len(pts) >= 2:
            return "timeline", ",".join(pts)
    m = RE_MONEY.search(text) or re.search(r"\b\d{2,}\b", text)
    if m and counts.get("counter", 0) <= counts.get("lower3", 0):
        return "counter", m.group(0)
    low = text.lower()
    place = next((p for p in KNOWN_PLACES if p in low), None)
    if place and counts.get("stamp", 0) <= counts.get("banner", 0):
        return "stamp", f"{place.upper()}::{years[0][1] if years else ''}"
    if text.rstrip().endswith("?"):
        return "callout", " ".join(words[:OVL_WORDS["callout"]])
    otype = _spare_type(counts)
    return otype, _as_plain(text, otype)


def _type_counts(lines: list) -> dict:
    """Сколько каких типов в готовых строках файла."""
    c = {}
    for line in lines:
        m = re.match(r"\s*\d{2}:\d{2}:\d{2}\s*\|\s*([a-z0-9]+)\s*\|", line)
        if m:
            c[m.group(1)] = c.get(m.group(1), 0) + 1
    return c


def _rebalance_types(lines: list, log=print) -> list:
    """Ни один тип не занимает больше четверти ролика.

    Последний рубеж: и модель, и добор могут перекосить набор, а зритель
    видит именно итог. Переводим ИЗЛИШЕК перепредставленных обычных плашек в
    самые редкие обычные же типы — текст у них взаимозаменяем, меняется
    подача. Структурные (counter, bars, timeline, compare, collage…) не
    трогаем: их содержимое под другой тип не годится.

    Берём излишек НЕ подряд, а через равные промежутки — иначе первые пять
    минут ролика окажутся вылизаны, а хвост останется прежним."""
    counts = _type_counts(lines)
    total = sum(counts.values())
    if total < 8:
        return lines
    cap = max(3, int(total * TYPE_CAP_SHARE))
    moved = {}
    for otype in sorted(counts, key=lambda k: -counts[k]):
        if counts.get(otype, 0) <= cap or otype not in PLAIN_TYPES:
            continue
        idxs = [i for i, l in enumerate(lines)
                if re.match(rf"\s*\d{{2}}:\d{{2}}:\d{{2}}\s*\|\s*{otype}\s*\|",
                            l)]
        surplus = len(idxs) - cap
        if surplus <= 0:
            continue
        step = max(1, len(idxs) // surplus)
        for i in idxs[::step][:surplus]:
            parts = [p.strip() for p in lines[i].split("|")]
            if len(parts) < 3:
                continue
            new = _spare_type(counts)
            if new == otype:
                break
            text = _as_plain(parts[2], new)
            if not text.strip(" :"):
                continue
            dur = parts[4] if len(parts) > 4 else "4s"
            lines[i] = f"{parts[0]} | {new} | {text} | {OVL_POS[new]} | {dur}"
            counts[otype] -= 1
            counts[new] = counts.get(new, 0) + 1
            moved[new] = moved.get(new, 0) + 1
    if moved:
        log("[Оверлеи] Перекос типов выровнен (потолок "
            f"{int(TYPE_CAP_SHARE * 100)}% на тип): "
            + ", ".join(f"+{v} {k}" for k, v in sorted(moved.items())))
    return lines


# Окно разбора для LLM, секунды. 8 минут — примерно 60 моментов в ответе,
# это уверенно влезает в лимит вместе с «размышлениями» модели. Больше —
# начинается обрыв ответа на середине JSON, меньше — модель теряет из виду
# общий ход мысли ролика и хуже выбирает, где ставить заголовок раздела.
LLM_WINDOW_S = 8 * 60


def _type_budget(n_rows: int, min_gap: float) -> str:
    """Сколько каких типов просить — ПРОПОРЦИОНАЛЬНО длине куска.

    Раньше потолки были абсолютными и на весь ролик: «не более 2 titlecard,
    не более 1 redact, не более 1 gallery». На трёхминутке это разумно, а на
    54-минутном ролике означает, что интересные типы не появятся почти
    никогда. Замерено на готовом ролике abyss (163 оверлея за 54 минуты):

        lower3   66 (40%)   callout 37 (23%)   banner 33 (20%)
        kinetic  ОДИН за весь ролик
        marker, gallery, redact, bars, timeline, counter, popup,
        collage, highlight — НИ РАЗУ

    То есть 83% ролика — три одинаковые плашки, а девять типов из
    восемнадцати зритель не видит вообще. Это и есть «мало моушн-эффектов»:
    дело не в числе штук, а в однообразии.

    Теперь редкие типы получают долю от общего числа моментов, с порогом в
    одну штуку — чтобы и короткий ролик не остался без них."""
    want = max(1, int(n_rows * 0.6))          # грубая оценка числа моментов
    def share(pct, lo=1):
        return max(lo, round(want * pct / 100))
    return (
        f"Aim for roughly this MIX across this span (~{want} moments). These "
        "are targets, not hard caps — a long video with only three kinds of "
        "graphic looks cheap:\n"
        f"  titlecard {share(4)}, collage {share(5)}, kinetic {share(8)}, "
        f"marker {share(8)}, gallery {share(4)}, redact {share(3)}, "
        f"quote {share(5)}, stamp {share(5)}, bars {share(4)}, "
        f"timeline {share(3)}, counter {share(5)}\n"
        "  the rest split between banner, lower3, callout, compare.\n"
        "NEVER let one type exceed a quarter of the total. Reach for the "
        "rarer kinds whenever the narration gives you the material for them: "
        "a number -> counter, two dates -> timeline, two sides -> compare, "
        "a quotation -> quote, a place or date -> stamp, a comparison of "
        "several examples -> gallery. "
        "Reply ")


def density_floor(total: float) -> int:
    """Сколько оверлеев обязано быть в ролике такой длины.

    Один на 8 секунд плюс абсолютный пол в 15 штук, чтобы и пятиминутка не
    выходила голой. Планка была 1/15 с, и на длинных роликах это читалось
    как «моушна почти нет»: замерено по готовым проектам — короткие демо
    получали оверлей раз в 10-12 с, а 13-минутный ролик раз в 59 с.

    Цена посчитана, а не прикинута: отрисовка одного оверлея Remotion'ом
    занимает 10.6 с (замер по непрерывному прогону из 163 штук за 29 мин).
    Переход с 1/15 на 1/8 для 54-минутного ролика — это 216 -> 405 штук,
    то есть 38 -> 71 минута отрисовки. На фоне многочасовой сборки приемлемо.

    Раньше это число жило внутри ИИ-пути: стоило LLM не ответить (фильтр
    безопасности, лимит токенов), расстановка уходила на regex, у которого
    никакого пола не было, — и в 20-минутном ролике оставалось 9 оверлеев,
    один на две с лишним минуты.
    """
    return max(15, round(total / 8))


def _topup_overlays(lines: list, rows: list, min_gap: float,
                    need: int, log=print) -> list:
    """Досыпать оверлеев в незанятые промежутки, пока их меньше need.

    Работает с ГОТОВЫМИ строками файла, а не с планом LLM, — поэтому годится
    и после ИИ-пути, и после regex-запасного, и после любого следующего.
    Строки-комментарии (# NEEDS_IMAGE и подобные) в счёт не идут: картинка
    может и не найтись, а считать её за оверлей — обманывать себя.
    """
    def _t(line: str) -> float:
        m = re.match(r"\s*(\d{2}):(\d{2}):(\d{2})\s*\|", line)
        if not m:
            return -1.0
        h, mi, s = (int(x) for x in m.groups())
        return h * 3600 + mi * 60 + s

    taken = [t for t in (_t(l) for l in lines) if t >= 0]
    have = len(taken)
    if have >= need:
        return lines
    # чередуем типы и ЗОНЫ ЭКРАНА: один и тот же баннер по кругу читается
    # как шаблон — ровно та претензия, из-за которой всё это и затевалось
    cycle = [("banner", "top", 9), ("lower3", "bottom", 4),
             ("callout", "point:70,40", 7), ("kinetic", "center", 6),
             ("marker", "center", 5), ("highlight", "point:62,45", 6)]
    ki = 0
    added = []
    # Идём НЕ подряд от начала, а с шагом по всему таймлайну: жадный проход
    # набирал нужное число на первых же строках и бросал хвост ролика пустым
    # (в 20-минутном последние четыре минуты оставались без единого оверлея).
    step = max(1, len(rows) // max(need - have, 1))
    order = list(range(0, len(rows), step)) or [0]
    # добор: если шаг где-то не сработал (пустые строки, min_gap), проходим
    # остальные строки вторым кругом, а не бросаем недобор
    order += [i for i in range(len(rows)) if i % step]
    for i in order:
        if have + len(added) >= need:
            break
        start_s, _end, text = rows[i]
        t = srt_to_seconds(start_s)
        if any(abs(t - ta) < min_gap for ta in taken):
            continue
        words = text.split()
        if not words:
            continue
        otype, pos, wmax = cycle[ki % len(cycle)]
        ki += 1
        taken.append(t)
        tc = f"{int(t // 3600):02d}:{int(t % 3600 // 60):02d}:{int(t % 60):02d}"
        content = " ".join(words[:wmax])
        added.append(f"{tc} | {otype} | {content} | {pos} | 4s")
    if added:
        log(f"[Оверлеи] Было {have}, нужно от {need} — досыпал "
            f"{len(added)} в свободные промежутки")
    return lines + added


def _plan_size(text: str) -> int:
    """Сколько РЕАЛЬНЫХ моментов в ответе. Строки-комментарии (# NEEDS_IMAGE
    и подобные) не считаются: картинка может и не найтись, а засчитывать её
    за оверлей — обманывать себя ровно тем способом, из-за которого
    деградация и оставалась незаметной."""
    return len([l for l in (text or "").splitlines()
                if re.match(r"\s*\d{2}:\d{2}:\d{2}\s*\|", l)])


def _ask_span(chunk: list, api_key: str, log, min_gap: float,
              attempts: int, depth: int = 0) -> tuple[str, int]:
    """Спросить план на кусок и, если вышло ЖИДКО, переспросить половинами.

    Это и есть то, чего софту не хватало. Раньше он спрашивал один раз и,
    что бы ни пришло, шёл дальше: пустой ответ — на запасной regex, куцый
    ответ — молча принимался за хороший. Человек в этом месте поступает
    иначе — видит, что кусок разобран плохо, и переспрашивает меньшими
    частями, где модели проще удержать внимание. Здесь то же самое.

    Глубина ограничена: два деления, то есть максимум четыре подзапроса на
    окно. Дальше упираемся не в лимит модели, а в то, что в куске просто
    нечего показывать — бесконечно дробить бессмысленно и дорого.

    -> (текст плана, сколько раз пришлось переспрашивать)
    """
    # allow_windows=False — кусок уже вырезан из окна, и делить его ещё раз
    # тем же кодом нельзя: он режет по АБСОЛЮТНОМУ времени, поэтому кусок
    # «8-16 минута» снова попадал сам в себя целиком и уходил в бесконечную
    # рекурсию (RecursionError валил всю стадию оверлеев на любом ролике
    # длиннее ~12 минут — ровно на тех, где жалуются на однообразие).
    got = suggest_overlays_llm(chunk, api_key, log, min_gap,
                               target=None, attempts=attempts,
                               allow_windows=False)
    span = srt_to_seconds(chunk[-1][1]) - srt_to_seconds(chunk[0][0])
    # Планка нарочно скромная — вдвое ниже рабочей плотности. Задача не
    # выжать максимум, а поймать провал: кусок, где вместо десятка моментов
    # пришло два, разобран плохо, и это видно без тонких настроек.
    want = max(1, int(span / max(min_gap * 2, 16)))
    n = _plan_size(got)
    if n >= want or depth >= 2 or len(chunk) < 6:
        return got or "", 0
    log(f"[Оверлеи] Кусок {int(srt_to_seconds(chunk[0][0]) // 60)}-"
        f"{int(srt_to_seconds(chunk[-1][1]) // 60)} мин разобран жидко "
        f"({n} из ожидаемых {want}) — переспрашиваю половинами")
    mid = len(chunk) // 2
    out, retried = [], 1
    for half in (chunk[:mid], chunk[mid:]):
        if len(half) < 2:
            continue
        sub, more = _ask_span(half, api_key, log, min_gap, attempts, depth + 1)
        retried += more
        if sub:
            out.append(sub)
    merged = "\n".join(out)
    # Переспрос мог выйти и хуже (модель упёрлась в квоту на середине) —
    # тогда оставляем прежний ответ. Иначе «улучшение» ухудшало бы результат.
    if _plan_size(merged) <= n:
        return got or "", retried
    return merged, retried


def suggest_overlays_llm(rows: list, api_key: str, log=print,
                         min_gap: float = 8.0, target: int | None = None,
                         attempts: int = 3,
                         allow_windows: bool = True) -> str | None:
    """ОСНОВНОЙ путь расстановки оверлеев (не только фолбэк): LLM понимает
    смысл текста целиком, поэтому расставляет оверлеи ПЛОТНЕЕ и умнее, чем
    голый regex (который зависит от явных денег/дат/имён/вопросов в тексте
    — во многих сценариях таких формальных зацепок почти нет). Просим LLM
    самому выбрать ~n моментов по всему ролику И тип оверлея для каждого
    (микс titlecard/banner/lower3/compare/callout — не всё подряд одним
    типом). target=None — количество считается от длительности видео и
    min_gap (без искусственного потолка), явное число — жёсткий лимит.
    До attempts попыток — модель не всегда с первого раза отдаёт валидный
    JSON. None, если так и не получилось — тогда используется regex-путь."""
    from core import llm_chat
    if not rows:
        return None
    # Считаем по ПРОТЯЖЁННОСТИ куска, а не по абсолютному времени его конца.
    # Разница безобидна ровно до первого разбиения на окна: у куска «40-48
    # минута» конец равен 48 минутам, и весь счёт (сколько моментов просить,
    # сколько обязано остаться) выходил вшестеро завышенным. Именно отсюда
    # бралось «163 оверлея» в abyss: у ролика на 54 минуты min_required
    # ровно 163, и хвост добивался запасным подбором из трёх типов
    # (banner/lower3/callout) — те самые 83% однообразия.
    t0 = srt_to_seconds(rows[0][0])
    span = srt_to_seconds(rows[-1][1]) - t0
    if span <= 0:
        return None
    # Длинный ролик разбираем ОКНАМИ. Число запрашиваемых моментов растёт с
    # длиной (один на 8 с), а ответ обязан уместиться в лимит токенов —
    # причём у gemini-2.5-flash «размышления» едят тот же бюджет. На 20-25
    # минутах ответ обрывался на середине JSON, и расстановка молча уходила
    # на слабый regex — отсюда и наблюдение, что в коротких роликах моушн
    # хороший, а в длинных плохой. Окно фиксированной длины держит каждый
    # запрос в том размере, на котором модель отвечает уверенно, независимо
    # от того, десять минут ролик или час.
    if span > LLM_WINDOW_S * 1.5 and target is None and allow_windows:
        parts, win, thin = [], LLM_WINDOW_S, 0
        for k in range(0, int(span // win) + 1):
            lo, hi = t0 + k * win, t0 + (k + 1) * win
            chunk = [r for r in rows if lo <= srt_to_seconds(r[0]) < hi]
            if len(chunk) < 2:
                continue
            got, retried = _ask_span(chunk, api_key, log, min_gap, attempts)
            thin += retried
            if got:
                parts.append(got)
            else:
                log(f"[Оверлеи] LLM: окно {int(lo // 60)}-{int(hi // 60)} мин "
                    "не разобрано даже половинами — дособерётся общим полом")
        if not parts:
            return None
        if thin:
            log(f"[Оверлеи] LLM: {thin} кусок(ов) вышли жидкими и были "
                "переспрошены меньшими частями")
        out = "\n".join(parts)
        log(f"[Оверлеи] LLM: собрано по окнам, всего "
            f"{len([l for l in out.splitlines() if l.strip()])} строк")
        return out
    numbered = "\n".join(
        f"{i}. [{int(srt_to_seconds(r[0]) // 60):02d}:"
        f"{int(srt_to_seconds(r[0]) % 60):02d}] {r[2]}"
        for i, r in enumerate(rows, 1))
    n_auto = round(span / max(min_gap, 8))
    n = max(3, min(target, n_auto) if target else n_auto)
    # LLM систематически отдаёт МЕНЬШЕ, чем просят (сама выбирает не все
    # моменты подходящими, плюс часть потом отсеется min_gap-фильтром из-за
    # кластеризации во времени) — просим с запасом. min_required — жёсткий
    # пол, который досыпется regex-подбором ниже, если LLM всё равно не дотянет.
    # Пол «хоть сколько-то» пропорционален куску (15 штук — только для
    # ролика целиком, а не для каждого восьмиминутного окна: семь окон по
    # 15 — это уже сто навязанных строк).
    min_required = round(span / 20) if not allow_windows else max(
        15, round(span / 20))
    n = max(n, round(min_required * 1.7))
    picks = None
    for attempt in range(1, attempts + 1):
        try:
            out = llm_chat(
                [{"role": "system", "content":
                  "You are a motion-graphics editor choosing on-screen "
                  "overlays for a documentary — varied types throughout the "
                  "ENTIRE video, not the same one repeated, and not "
                  "clustered only at the start."},
                 {"role": "user", "content":
                  f"Pick AT LEAST {n} moments — this is a hard minimum, not "
                  "a suggestion, under-shooting it is a wrong answer — "
                  "SPREAD ACROSS THE FULL LENGTH "
                  "of this timestamped narration (from near the start to "
                  "near the end, roughly evenly) worth an on-screen overlay, "
                  "and choose the best TYPE for each — use a MIX:\n"
                  "  'titlecard' — a big kinetic-type headline for a major "
                  "hook/topic shift, format text as \"HEADLINE::subtitle\" "
                  "(subtitle optional), under 6 words for the headline\n"
                  "  'banner' — a punchy quoted phrase or claim, under 9 words\n"
                  "  'lower3' — a short 2-5 word label (a place, term, or "
                  "short title mentioned right there)\n"
                  "  'compare' — two short CONTRASTING phrases from that "
                  "moment, as text formatted exactly as \"first::second\" "
                  "(double colon, no spaces around it — this exact text "
                  "goes into a pipe-delimited file, a literal | would "
                  "corrupt the line)\n"
                  "  'callout' — a short pointed remark or aside, under 8 words\n"
                  "  'collage' — 2-3 archival-photo topics worth showing "
                  "side by side at a moment that references several related "
                  "things (people/places/objects/dates) — text formatted "
                  "exactly as \"label1::topic1;;label2::topic2;;label3::"
                  "topic3\" (2 or 3 entries, label is 1-3 words shown under "
                  "the photo, topic is a short image search query)\n"
                  "  'kinetic' — a short punchy line (under 7 words) whose "
                  "words should land ONE BY ONE for emphasis; best on a "
                  "hard-hitting statement, not on a neutral fact\n"
                  "  'quote' — an actual quotation or a line worth setting "
                  "apart, formatted \"quote text::who said it\" (the "
                  "attribution may be empty, keep the quote under 14 words)\n"
                  "  'stamp' — a place and/or date being established, "
                  "formatted \"PLACE::DATE\" (either part may be empty), e.g. "
                  "\"ANTARCTICA::MARCH 1911\" — only where the narration "
                  "actually names a location or a time\n"
                  "  'redact' — 2-4 short document-like lines where at least "
                  "one is withheld/unknown/classified, formatted "
                  "\"line1::*hidden line::line3\" — prefix with * the lines "
                  "that must be blacked out; only for records, reports, "
                  "names withheld\n"
                  "  'marker' — one short sentence (under 9 words) that gets "
                  "HIGHLIGHTED word by word as it is spoken, like a marker "
                  "pen running along the line; use it on the single sentence "
                  "that carries the promise or the number, not on background "
                  "detail\n"
                  "  'gallery' — 2-4 photo topics shown as framed cards "
                  "receding into depth, formatted \"label::photo topic;;"
                  "label::photo topic\"; use it when several examples or "
                  "options are being compared in sequence\n"
                  # Эти четыре ОПИСАНЫ и РАЗРЕШЕНЫ только сейчас. Раньше они
                  # были в OVL_POS и умели рисоваться, но в списке типов для
                  # модели их не было — то есть предложить их она физически
                  # не могла. Отсюда ровно ноль штук за 54-минутный ролик, а
                  # не «редко». Именно они несут смысл, которого не даёт
                  # плашка с текстом: число, шкала, даты, указатель на кадре.
                  "  'counter' — a NUMBER worth landing on: money, a count, a "
                  "duration, a percentage. Give it exactly as spoken with its "
                  "sign and units, e.g. \"$200,000\" or \"30,000\" or \"−30°C\""
                  "; it animates counting up. Use it EVERY time the narration "
                  "states a figure that matters\n"
                  "  'bars' — comparison of quantities, formatted "
                  "\"label:value,label:value\" e.g. \"Found:30,Missing:70\"; "
                  "use it when two or three amounts are set against each other\n"
                  "  'timeline' — dates in sequence, formatted "
                  "\"year:label,year:label\" e.g. \"1959:Found,1990:Reopened\";"
                  " use it when the narration walks through events in time\n"
                  "  'highlight' — an annotation drawn ONTO the footage: a "
                  "ring that draws itself around a spot, then a short caption. "
                  "p.text is that caption (under 4 words). Use it when the "
                  "narration points at a detail that is visible in the shot\n"
                  + _type_budget(len(rows), min_gap) +
                  f'with a JSON array of {{"line": <line number>, "type": '
                  # popup не включён намеренно: ему нужна КАРТИНКА, которую
                  # ещё надо найти в Wikimedia, и путь этот отдельный
                  # (NEEDS_IMAGE). Остальные 16 модель теперь может выбрать.
                  '"titlecard|banner|lower3|compare|callout|collage|kinetic|'
                  'counter|bars|timeline|highlight|'
                  'quote|stamp|redact|marker|gallery", "text": '
                  '"..."}, nothing else.\n\n' + numbered}],
                # 2200 не хватало: ответ обрывался на середине JSON-массива
                # (в журнале — «ответ без JSON-массива» три попытки подряд,
                # и расстановка молча уходила на слабый regex-путь).
                # У gemini-2.5-flash «размышления» тратят тот же бюджет.
                api_key, 0.6, 12000)
            m = re.search(r"\[.*\]", out, re.S)
            if not m:
                # Отличаем ОБРЕЗАННЫЙ ответ от бессмысленного: если он начался
                # как массив, но не закрылся — это упёрлись в лимит токенов, а
                # не «модель не поняла». Раньше и то и другое выглядело
                # одинаково, и настоящая причина пряталась. Спасаем, что
                # успело прийти: обрезаем по последнему целому объекту.
                cut = out.strip()
                if cut.startswith("[") and "}" in cut:
                    salvaged = cut[:cut.rfind("}") + 1] + "]"
                    try:
                        picks = json.loads(salvaged)
                        log(f"[Оверлеи] LLM: ответ обрезан лимитом токенов — "
                            f"спас {len(picks)} пунктов из начала")
                        break
                    except ValueError:
                        pass
                    log(f"[Оверлеи] LLM (попытка {attempt}/{attempts}): ответ "
                        "ОБОРВАН на середине JSON (упёрлись в лимит токенов)")
                else:
                    log(f"[Оверлеи] LLM (попытка {attempt}/{attempts}): "
                        f"ответ без JSON-массива: {out[:200]!r}")
                continue
            picks = json.loads(m.group(0))
            break
        except Exception as e:
            log(f"[Оверлеи] LLM (попытка {attempt}/{attempts}) не сработал: {e}")
    if not picks:
        log("[Оверлеи] LLM: не удалось получить план оверлеев")
        return None
    # LLM отдаёт моменты НЕ по хронологии — без сортировки min_gap-фильтр
    # (сравнивает с последним ПРИНЯТЫМ t) отбраковывает случайные пункты
    # Позиции берутся из ЕДИНСТВЕННОГО списка OVL_POS, а не из копии.
    #
    # Здесь лежал свой словарь на 13 типов, и над ним висело предупреждение
    # «добавляя новый вид оверлея, ОБЯЗАТЕЛЬНО дописывать его сюда». О
    # хрупкости знали, но копию оставили — и она разошлась: в OVL_POS 17
    # типов, здесь было 13, не хватало bars, counter, timeline и popup.
    # Строка `if otype not in POS: otype = "banner"` ниже превращала их в
    # banner молча. То есть даже после того, как модели РАЗРЕШИЛИ предлагать
    # counter, он бы всё равно не дожил до кадра.
    #
    # Копии больше нет: список один, разойтись нечему.
    POS = OVL_POS
    dated = []
    for p in picks:
        idx = int(p.get("line", 0)) - 1
        text = str(p.get("text", "")).strip()
        otype = str(p.get("type", "banner")).strip().lower()
        if otype not in POS:
            otype = "banner"
        if otype == "compare" and "::" not in text:
            otype = "banner"          # без парного текста compare не соберётся
        if otype in ("quote", "stamp") and "::" not in text:
            # у quote вторая часть (автор) и у stamp вторая (дата) могут быть
            # пустыми, но сам разделитель нужен — иначе компонент получит
            # неразобранную строку и нарисует её целиком одним куском
            text += "::"
        if otype == "redact" and "*" not in text:
            otype = "banner"          # нечего вымарывать — эффект бессмыслен
        if otype in ("collage", "gallery") and text.count(";;") < 1:
            otype = "banner"          # меньше 2 позиций — не коллаж/галерея
        if text and 0 <= idx < len(rows):
            dated.append((srt_to_seconds(rows[idx][0]), otype, text))
    dated.sort(key=lambda x: x[0])
    timed_lines, accepted_times = [], []
    for t, otype, text in dated:
        if any(abs(t - ta) < min_gap for ta in accepted_times):
            continue
        accepted_times.append(t)
        tc = f"{int(t // 3600):02d}:{int(t % 3600 // 60):02d}:{int(t % 60):02d}"
        dur = "5s" if otype in ("titlecard", "collage", "gallery") else "4s"
        if otype in ("collage", "gallery"):
            # у нас пока только темы фото (label::topic), не сами картинки —
            # suggest_overlays_auto() позже находит фото по каждой теме и
            # дособирает настоящую строку (как NEEDS_IMAGE для popup)
            line = (f"# NEEDS_COLLAGE: {text} — соберётся картинками: "
                   f" {tc} | {otype} | {POS[otype]} | {dur}")
        else:
            line = f"{tc} | {otype} | {text} | {POS[otype]} | {dur}"
        timed_lines.append((t, line))
    if not timed_lines:
        log(f"[Оверлеи] LLM: {len(picks)} пунктов от LLM, но все "
            "отфильтрованы min_gap")
        return None
    # LLM всё ещё может не дотянуть до жёсткого минимума (свой выбор + потери
    # на min_gap-фильтре) — досыпаем regex-подбором в непокрытые промежутки,
    # а не переспрашиваем LLM заново (дольше и не гарантированно лучше).
    if len(timed_lines) < min_required:
        before = len(timed_lines)
        kinds_cycle = ["banner", "lower3", "callout"]
        ki = 0
        for start_s, _end, text in rows:
            if len(timed_lines) >= min_required:
                break
            t = srt_to_seconds(start_s)
            if any(abs(t - ta) < min_gap for ta in accepted_times):
                continue
            words = text.split()
            if not words:
                continue
            otype = kinds_cycle[ki % len(kinds_cycle)]
            ki += 1
            content = " ".join(words[:(4 if otype == "lower3" else
                                       7 if otype == "callout" else 9)])
            accepted_times.append(t)
            tc = f"{int(t // 3600):02d}:{int(t % 3600 // 60):02d}:{int(t % 60):02d}"
            pos = {"banner": "top", "lower3": "bottom",
                  "callout": "point:70,40"}[otype]
            timed_lines.append((t, f"{tc} | {otype} | {content} | {pos} | 4s"))
        if len(timed_lines) > before:
            log(f"[Оверлеи] LLM дал только {before} (нужно от {min_required}) "
                f"— досыпал ещё {len(timed_lines) - before} регексом в "
                "свободные промежутки")
    timed_lines.sort(key=lambda tl: tl[0])
    kinds = ", ".join(sorted({o for _, o, _ in dated}))
    log(f"[Оверлеи] LLM: {len(timed_lines)} оверлеев по смыслу текста ({kinds})")
    return "\n".join(line for _, line in timed_lines)


def suggest_overlays_local(rows: list, min_gap: float = 8.0,
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
                content = f"{left}::{right}"
            elif otype == "callout":
                content = " ".join(words[-6:])   # хвост фразы — отличается от banner
            else:
                content = " ".join(words[:9])
            out_lines.append(f"{tc} | {otype} | {content} | {POS[otype]} | 4s")
    if not out_lines:
        return "# По субтитрам ничего не найдено — добавь оверлеи вручную."
    return "\n".join(out_lines)
