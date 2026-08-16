#!/usr/bin/env python3
"""ИИ пишет СЦЕНЫ под конкретный ролик — и они проходят приёмку.

Сцена, в отличие от оверлея, занимает кадр целиком и заменяет собой съёмку
там, где снимать нечего: «нагрузка перешла на три оставшиеся опоры», «под
фундаментом залегает торф», «за сорок лет просело на двенадцать сантиметров».

ПОЧЕМУ ЗДЕСЬ ТАКОЙ ЖЁСТКИЙ КОНТРОЛЬ. Полная ИИ-генерация кода в этом проекте
уже проваливалась: модель игнорировала тип и выдавала пустые кадры. Хуже —
первый «успешный» прогон дал синтаксически безупречную ЗАГЛУШКУ: непрозрачный
прямоугольник во весь кадр с комментарием Placeholder и без анимации. Она
прошла проверку, потому что проверкой было «компилируется и кадр не пустой».
В ролике такая заглушка закрашивает всё видео сплошной заливкой.

Поэтому приёмка тут в четыре ступени, и каждая отсекает свой класс брака:
  1. типизация ФЛАГАМИ ПРОЕКТА (strict, noUnusedLocals) — неиспользованные
     импорты interpolate/Easing выдают заглушку надёжнее всего;
  2. статический разбор: непрозрачный корень, отсутствие p.enter/p.exit,
     слова placeholder/TODO, слишком мало кода. Непрозрачный корень стоит
     тут не для красоты: фон сцены кладёт Scene.tsx (живая подложка
     Backdrop), и сцена, закрасившая кадр своим '#07090c', эту подложку
     молча отменяет — получается ровное тёмное пятно на семь секунд,
     которое посреди документального ролика читается как провал;
  3. НАСТОЯЩИЙ рендер двух кадров и разбор пикселей: не залито, нарисовано
     хоть что-то, достаточно цветов, между кадрами есть движение;
  4. ЗРЕНИЕ: отрисованный кадр показывают модели и спрашивают, изображает
     ли он то, что заявлено замыслом. Ступени 1-3 отвечают на вопрос «код
     рабочий?» и ни одна не отвечает на вопрос «на картинке видно то, что
     обещано названием?». Сцена thermal_gradient_map прошла их все и
     оказалась ровным розовым прямоугольником в рамке под заголовком
     «steam jacket cross-section»: ни градиента, ни разреза. Пиксели такое
     не ловят в принципе — заливка, меняющая цвет со временем, честно даёт
     и цвета, и движение;
  5. взгляд человека — сцены складываются в папку на просмотр.

Файл намеренно отдельный от gen_remotion_gemini.py: тот при запуске
перезаписывает живой Overlay.tsx.

    python gen_scenes.py --selftest              # негативный тест гейта
    python gen_scenes.py --audit --limit 5       # досмотреть библиотеку
    python gen_scenes.py --list                  # накопленные вердикты
"""
import argparse
import json
import re
import os
import subprocess
import sys
from pathlib import Path


# Окно консоли НЕ ДОЛЖНО выскакивать. Программа живёт в своём окне
# (pythonw), а каждый вызов ffmpeg, ffprobe и npx без этого флага открывает
# чёрный прямоугольник поверх всего — при рендере их сотни за ролик, и они
# перехватывают фокус, пока человек работает. Замер 2026-08-12: восемь мест
# в четырёх файлах запускали процессы без него.
CREATE_NO_WINDOW = getattr(subprocess, "CREATE_NO_WINDOW", 0)

BASE = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE))

REMOTION = BASE / "remotion"
SCENES_DIR = REMOTION / "src" / "scenes"
REGISTRY = REMOTION / "src" / "Scene.tsx"
LIBRARY = BASE / "scenes.json"
# Вердикты зрения по УЖЕ НАПИСАННЫМ сценам. Отдельный файл, а не поле в
# .tsx и не переименование файла: сцены лежат в remotion/src, и любая правка
# там пересобирает весь проект Remotion — пометка не стоит того, чтобы
# трогать исходники, которые в этот момент может рендерить ночной прогон.
AUDIT = BASE / "scenes_audit.json"

# Сцены, написанные РУКАМИ, а не моделью. Аудит их не трогает вовсе, и
# пометиться на перегенерацию они не могут: иначе grow() однажды перезаписал
# бы ручной компонент машинным, а взять его обратно было бы неоткуда.
BUILTIN_SCENES = ("globe", "layers", "forces", "chart", "backdrop")

# Сколько раз просить модель переписать сцену, если приёмка её отвергла.
ATTEMPTS = 3

# Доля длительности, на которой берём кадр для ЗРЕНИЯ. Не середина и не
# четверть: почти все сцены дорисовываются постепенно (strokeDashoffset,
# растущие столбцы), и на 25% схема ещё наполовину не появилась — модель
# честно ответит «пусто», хотя сцена нормальная. 0.72 — уже дорисовано, но
# ещё до затухания p.exit.
VISION_AT = 0.72

# Почерк СХЕМ у каждого канала свой — как у плашек и монтажа. Раньше сюда
# уходили только имя канала, жанр и язык, поэтому разбор аварии и разбор
# философа рисовались одинаково: те же линии, те же подписи, тот же ритм.
# Ключ — palette, тот же, по которому разведены склейки (render.PALETTES),
# плашки и обложки.
SCENE_LOOK = {
    "harsh": (
        "Draw like an ENGINEERING REPORT: orthogonal projections, section "
        "cuts, dimension lines with figures, load arrows, callout leaders "
        "with part names. Thin technical strokes, steel grey and slate, one "
        "signal-orange accent on the failure point only. No curves for "
        "decoration, no glow, no gradients. It must look measured, not "
        "designed."),
    "warm": (
        "Draw like a PRACTICAL GUIDE: before-and-after halves, a labelled "
        "cutaway of the everyday object, a cost figure counting down, simple "
        "step arrows. Rounded corners, honey and brick tones on cream, thick "
        "friendly strokes. It must look like something a person sketched to "
        "explain a fix, not like an instrument panel."),
    "contemplative": (
        "Draw like a MAP OF AN IDEA: a life laid along a slow line, "
        "concepts as circles that overlap, a quotation given room. Hairline "
        "strokes, dusty green and stone on faded indigo, wide empty space. "
        "No arrows shouting, no numbers unless a date. It must feel unhurried "
        "— the viewer is here for an hour."),
}


PROPOSE_PROMPT = """You are a documentary motion-graphics director.

Below is a narration script for a video on the channel "{channel}"
({tone}, {lang}).{look}

Find up to {count} moments where FOOTAGE CANNOT SHOW what is being said, but a
drawn animated diagram can. Good candidates:
  - forces, loads, stresses redistributing inside a structure
  - what lies underground / inside a wall / inside a mechanism (cross-section)
  - a quantity changing over years
  - a sequence of failures or stages
  - geography: where on Earth, a route between places
  - relative scale of two things

BAD candidates (skip them): anything you could simply film or photograph —
a person, a room, a tool lying on a bench, weather, a building exterior.

Reply with ONLY a JSON array, no markdown fences. Each element:
{{"quote": "the exact sentence from the script this illustrates",
  "kind": "short_snake_case_name_for_this_diagram",
  "title": "on-screen caption, max 5 words, in {lang}",
  "brief": "one sentence describing WHAT MOVES and WHY, for the animator"}}

If the script has no such moments, reply with [].

SCRIPT:
{script}
"""

CODE_PROMPT = """Write ONE Remotion scene component in TypeScript.

It illustrates this narration: "{quote}"
What must move: {brief}
On-screen caption: "{title}"

STRICT CONTRACT — the file is rejected automatically if any of this is wrong:

1. Exactly this shape, nothing else exported:

import React from 'react';
import {{ AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing }} from 'remotion';
import type {{ SceneProps }} from '../types';

export const {component}: React.FC<SceneProps> = (p) => {{ ... }};

2. Import ONLY what you actually use, and declare NO variable you do not
   use. The project runs tsc with --strict and --noUnusedLocals, so a
   single leftover `const width = ...` or `const fps = ...` that you never
   reference REJECTS THE WHOLE FILE. If you destructure useVideoConfig(),
   take only the fields you actually need.
   (Measured 2026-08-04: this single mistake caused half of all rejections.)
3. Multiply your top-level opacity by `p.enter * p.exit`. Both must appear.
   THIS IS THE MOST COMMON REJECTION AFTER UNUSED VARIABLES. Measured
   2026-08-06: three attempts in a row rejected on this one rule, and half
   the planned scenes never reached the video because of it. Write it
   EXACTLY like this, as the first line of your component body:

       const opacity = p.enter * p.exit;

   and then put `style={{ opacity }}` on your root element. Do not compute
   it inside JSX, do not name it something else, do not use only one of
   the two. If your scene has its own fade you still multiply by this —
   `const opacity = p.enter * p.exit * myOwnFade;`. Without both names
   present in the file the scene is thrown away, however good it looks.
4. DO NOT PAINT THE FRAME BACKGROUND. The player already puts a living
   backdrop under your scene (soft moving light, dust motes, grain,
   vignette) — that is what makes a drawn shot sit inside a documentary
   instead of reading as a hole in the film. Your root element must
   therefore stay TRANSPARENT: no `background` and no `backgroundColor`
   on the root, and none on any <AbsoluteFill> — an <AbsoluteFill> covers
   the whole frame, so filling one hides the backdrop completely.
   Rejected automatically. (Opaque fills on a small inner <div> — a panel,
   a card, a label plate — are fine, that is not the frame background.)
   Do NOT import or render `Backdrop` yourself either: you would get two
   of them stacked, and the vignette would double.
   Assume a DARK backdrop underneath: draw with the light palette below,
   never dark-on-dark. Do NOT leave the frame empty. Keep every element
   inside the middle 80% of the frame — anything positioned outside is
   invisible and the render comes out empty, which is an automatic
   rejection.
5. Everything must be drawn with SVG or divs. No images, no fetch, no
   external files, no randomness, no Date/Math.random — the render must be
   deterministic and identical every time.
6. It must ANIMATE: derive values from useCurrentFrame() with at least three
   separate interpolate() calls, so the picture at second 1 differs clearly
   from the picture at second 4.
7. Use `useVideoConfig()` for width/height/fps — never hardcode 1920/1080.
8. Duration is p.dur seconds. Time your animation to fill it, not to finish
   in the first half second.
9. Caption: render p.title if present, near the bottom or top edge.
10. No placeholder, TODO or FIXME anywhere.
11. THE DRAWING MUST BE THE THING, NOT A LABEL FOR IT. A shape filled with
    one flat colour, with a caption above it, is the most common failure
    here and is rejected automatically: a real frame of your scene is
    rendered and shown to a vision model, which is asked whether the
    picture actually depicts "{title}". A caption saying "cross-section"
    is a claim; only the drawing counts. Concretely:
      - a GRADIENT is drawn as a gradient: an SVG <linearGradient> with 3+
        stops, or a row of 8+ bands stepping in colour, with BOTH ends
        labelled with their values (e.g. 18°C and 82°C). A single fill that
        merely changes colour over time is NOT a gradient.
      - a CROSS-SECTION shows what is inside: at least three distinct
        layers/materials with visible boundaries between them, different
        fills or hatching, each with a leader line and a name.
      - a COMPARISON shows BOTH quantities in the same picture at the same
        scale, each with its number — two bars, two columns, two circles.
        One bar is not a comparison.
      - a QUANTITY OVER TIME has a plotted polyline or path, a value axis
        with 3+ ticks and numbers, and a time axis.
      - a SEQUENCE OF STAGES shows the stages: numbered steps, or the same
        object drawn three times in different states, joined by arrows.
      - FORCES are arrows with a direction, a magnitude and a point of
        application, drawn ON the object they act upon.
      - a PATH or LEAK shows where it starts, what it passes through and
        where it ends — not a single line across empty space.
    Test yourself: cover the caption. A viewer who cannot read it must
    still be able to say what the picture is about. Aim for 8-20 drawn
    elements (use .map() over a small array of data — that is how you get
    layers, ticks and bands without writing them out one by one), not 2.

Style: documentary schematic — thin lines, restrained palette (off-white
#e9f2f6, amber accent #e0b44c, danger #d0523f), generous empty space. It must
look like a diagram in an archival report, not like a mobile app UI.

WORKING EXAMPLE — copy this structure exactly, change only the drawing.
Note how much is actually DRAWN: three named layers, a real gradient with
three stops, a labelled axis, a moving front. That is the minimum density.
It compiles under --strict --noUnusedLocals. Note the interpolate signature:
interpolate(frame, [inputStart, inputEnd], [outputStart, outputEnd], options)
— four arguments, the two ranges are ARRAYS OF THE SAME LENGTH, and the
options object is the ONLY place easing/extrapolate go. Passing a bare number
as the fourth argument is the single most common compile error.

import React from 'react';
import {{ AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing }} from 'remotion';
import type {{ SceneProps }} from '../types';

export const ExampleScene: React.FC<SceneProps> = (p) => {{
  const frame = useCurrentFrame();
  const {{ fps }} = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const draw = interpolate(frame, [0, span * 0.45], [0, 1], {{
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  }});
  const heat = interpolate(frame, [span * 0.2, span * 0.85], [0, 1], {{
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  }});
  const rise = interpolate(frame, [span * 0.3, span * 0.7], [18, 0], {{
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  }});

  const opacity = p.enter * p.exit;
  const layers = [
    {{ x: 60, w: 90, fill: '#c9d3d9', name: 'STEEL 25 mm' }},
    {{ x: 150, w: 60, fill: '#8a949b', name: 'SCALE 6 mm' }},
    {{ x: 210, w: 110, fill: '#5d6a73', name: 'LINING 40 mm' }},
  ];
  const ticks = [0, 1, 2, 3, 4];

  return (
    <AbsoluteFill style={{{{ opacity,
                          justifyContent: 'center', alignItems: 'center' }}}}>
      <svg width="62%" viewBox="0 0 420 250">
        <defs>
          <linearGradient id="heat" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#d0523f" />
            <stop offset="0.45" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#5b7f9c" />
          </linearGradient>
        </defs>
        {{layers.map((L) => (
          <g key={{L.name}}>
            <rect x={{L.x}} y={{190 - 120 * draw}} width={{L.w}}
                  height={{120 * draw}} fill={{L.fill}}
                  stroke="#e9f2f6" strokeWidth={{0.6}} />
            <text x={{L.x + L.w / 2}} y={{58}} fill="#e9f2f6" fontSize={{9}}
                  textAnchor="middle" opacity={{draw}}>{{L.name}}</text>
          </g>
        ))}}
        <rect x={{60}} y={{70}} width={{260}} height={{120}} fill="url(#heat)"
              opacity={{0.5 * heat}} />
        <line x1={{60 + 260 * heat}} y1={{62}} x2={{60 + 260 * heat}} y2={{198}}
              stroke="#e9f2f6" strokeWidth={{2}} strokeDasharray="4 3" />
        {{ticks.map((t) => (
          <g key={{t}}>
            <line x1={{60 + t * 65}} y1={{190}} x2={{60 + t * 65}} y2={{198}}
                  stroke="#e9f2f6" strokeWidth={{1}} />
            <text x={{60 + t * 65}} y={{212}} fill="#e9f2f6" fontSize={{9}}
                  textAnchor="middle">{{180 - t * 40}}°C</text>
          </g>
        ))}}
        <text x={{60}} y={{234}} fill="#d0523f" fontSize={{10}}>FIRE SIDE</text>
        <text x={{320}} y={{234}} fill="#5b7f9c" fontSize={{10}}
              textAnchor="end">SHELL</text>
      </svg>
      {{p.title ? (
        <div style={{{{ marginTop: 26, transform: `translateY(${{rise}}px)`,
                     fontFamily: "'Segoe UI', Arial, sans-serif",
                     fontSize: 34, color: '#e9f2f6' }}}}>{{p.title}}</div>
      ) : null}}
    </AbsoluteFill>
  );
}};

Reply with ONLY the TypeScript code. No markdown fences, no commentary.
"""


# Вопрос зрению про ОТРИСОВАННЫЙ кадр. Списан с PICK_PROMPT в core.py —
# тот же порядок «сначала опиши, что видишь, потом суди»: там замерено, что
# без описания модель охотно подтверждает всё подряд (из 40 планов ни разу
# не сказала «не подходит», хотя 19 были мимо). Здесь та же ловушка сильнее:
# в кадре крупными буквами написано ровно то, что мы спрашиваем, и модель
# читает подпись вместо картинки. Поэтому подпись объявлена НЕ ДОКАЗАТЕЛЬСТВОМ
# прямым текстом, а описание требуется раньше вердикта.
VISION_PROMPT = """This is one rendered frame of an animated SCHEMATIC
diagram from a documentary. It is supposed to depict:

  CAPTION SHOWN ON SCREEN: "__TITLE__"
  WHAT IT MUST DEPICT: __SUBJECT__

A schematic is not a photograph and not an illustration. Plain rectangles,
flat colours, thin lines, printed numbers and a lot of empty space are the
CORRECT style here. NEVER fail a picture for being abstract, for lacking
texture, realism, detail, shading, materials or surroundings, or for not
looking like the real object. Style is never a reason to fail.

Judge one thing only: does the DRAWING carry the information it promises,
or is the information only in the words printed on it? The caption is a
claim, not evidence — a plain box labelled "cross-section" is still a plain
box.

It PASSES when the drawing itself carries the substance. For example:
  - two quantities drawn to the same scale with their numbers, so you can
    SEE which is bigger — that is a comparison, even as two plain bars
  - a shape divided into distinct parts, layers or zones with boundaries
  - a colour ramp, or a row of steps/bands running across something
  - a plotted line or curve against an axis with ticks and numbers
  - arrows showing a direction, a flow, a force or a sequence of stages
  - a marked path with a start, something it passes through, and an end
  - dimension lines, callouts or leader lines that name the parts

It FAILS when the drawing carries nothing and the caption does all the work:
  - a gradient promised, but the area is ONE flat colour
  - a cross-section promised, but the shape is undivided: no layers, no
    boundary, no parts, nothing inside
  - a comparison promised, but only ONE quantity is drawn
  - a graph promised, but no plotted curve, or no axis at all
  - a process or sequence promised, but no stages and no arrows
  - forces promised, but no arrows on the object they act upon
  - a single shape with a caption, and nothing else

Do not fail a picture because the animation looks unfinished at the edges —
this is one frame out of many.

Work in this order and do not skip a step:
1. "shows" — say in a few words what is LITERALLY drawn: the shapes, lines,
   bars, layers, arrows and numbers you can see. Do not repeat the caption
   back and do not describe what it is supposed to mean.
2. "depicts" — true if what you just described already carries the KEY FACT
   of WHAT IT MUST DEPICT. Ask yourself: with the caption covered, could a
   viewer read that fact off this picture? Judge substance, not polish.
3. "why" — one short sentence; when false, name what is MISSING FROM THE
   DRAWING (never "it looks too simple" or "it is not realistic").

Reply with ONLY a JSON object, no markdown:
{"shows": "<what is literally drawn>", "depicts": true|false,
 "why": "<one sentence>"}"""


def _complain(what: str, why: str = "", hint: str = "",
              level: str = "заметно") -> None:
    """Сказать в сводку прогона, что с нарисованными сценами вышло хуже.

    Журнал (log) здесь есть не везде и виден только в момент прогона, а
    сводка деградаций печатается последними строками и отвечает на вопрос
    «чего в ролике не хватает». Сцена — это целый план на экране, поэтому её
    подмена обычным кадром или непроверенная схема в кадре зрителю видны.
    """
    try:
        import quality
        quality.degraded("Сцены", what, why=why, hint=hint, level=level)
    except Exception:
        pass


def _read_json_map(path: Path) -> tuple[dict, str]:
    """Разбор JSON-словаря на диске: (данные, причина отказа).

    Отдельная функция на два файла (scenes.json и scenes_audit.json), потому
    что беда у них одна и та же и очень дорогая. Раньше и «файла ещё нет», и
    «файл испорчен» давали пустой словарь, а оба файла в конце работы
    ПЕРЕЗАПИСЫВАЮТСЯ ЦЕЛИКОМ. То есть один битый байт:
      * в scenes_audit.json — стирал все вердикты зрения, и сцены, про
        которые модель уже сказала «нарисовано не то», молча возвращались в
        ролики (библиотека общая, такая сцена кочует из ролика в ролик);
      * в scenes.json — стирал замыслы («что сцена обязана изобразить»).
        Замысел больше нигде не хранится, в .tsx его нет, и без него
        досмотр судит сцену по одному только имени.
    """
    try:
        raw = path.read_text(encoding="utf-8")
    except FileNotFoundError:
        return {}, ""                  # ещё не заводили — норма
    except OSError as e:
        return {}, f"{path.name} не читается: {e}"
    try:
        data = json.loads(raw)
    except ValueError as e:
        return {}, f"{path.name} испорчен (не разбирается как JSON): {e}"
    if not isinstance(data, dict):
        return {}, (f"{path.name} испорчен: ожидался объект, "
                    f"а лежит {type(data).__name__}")
    return data, ""


def _strip_fences(s: str) -> str:
    s = s.strip()
    s = re.sub(r"^```[a-zA-Z]*\s*", "", s)
    s = re.sub(r"\s*```$", "", s)
    return s.strip()


def _component_name(kind: str) -> str:
    parts = [w for w in re.split(r"[^A-Za-z0-9]+", kind) if w]
    return "".join(w.capitalize() for w in parts) + "Scene"


# ---------- приёмка ----------

def _is_opaque(value: str) -> bool:
    """Закрасит ли этот цвет то, что лежит под ним.

    Прозрачные записи пропускаем: сквозь rgba(...,0.2) или '#07090c40'
    подложку видно, и такой слой — это тонировка, а не заливка кадра.
    Всё, что не удалось разобрать (градиент, url(), имя цвета), считаем
    непрозрачным: ошибиться в сторону отказа дешевле, чем выпустить
    в ролик сцену на плоской заливке.
    """
    v = value.strip().strip("'\"` ")
    if not v or v in ("transparent", "none", "inherit", "initial", "unset"):
        return False
    m = re.match(r"rgba?\(([^)]*)\)$", v)
    if m:
        parts = [x.strip() for x in m.group(1).split(",")]
        if len(parts) == 4:
            try:
                return float(parts[3]) > 0.9
            except ValueError:
                return True
        return True
    m = re.match(r"#([0-9a-fA-F]+)$", v)
    if m:
        h = m.group(1)
        if len(h) == 8:                       # #rrggbbaa
            return int(h[6:], 16) >= 230
        if len(h) == 4:                       # #rgba
            return int(h[3] * 2, 16) >= 230
        return True                           # #rgb / #rrggbb — альфы нет
    return True


def _balanced(src: str, start: int, open_ch: str, close_ch: str) -> str:
    """Кусок текста от start до парной закрывающей скобки включительно."""
    depth = 0
    for i in range(start, len(src)):
        if src[i] == open_ch:
            depth += 1
        elif src[i] == close_ch:
            depth -= 1
            if depth == 0:
                return src[start:i + 1]
    return src[start:]


def _bg_values(text: str) -> list[str]:
    """Значения background/backgroundColor из куска кода.

    Разбирать вручную приходится из-за запятых внутри самих значений:
    rgba(0,0,0,0.4) и градиенты режутся простым split пополам, и тогда
    'rgba(208' не разберётся как цвет и уедет в «непрозрачный».
    """
    out = []
    for m in re.finditer(r"background(?:Color)?\s*:\s*", text):
        depth, val, i = 0, [], m.end()
        while i < len(text):
            c = text[i]
            if c in "([":
                depth += 1
            elif c in ")]":
                depth -= 1
            elif depth == 0 and c in ",;}\n":
                break
            val.append(c)
            i += 1
        v = "".join(val).strip()
        if v:
            out.append(v)
    return out


def _balanced_tag(src: str, start: int) -> str:
    """Открывающий JSX-тег целиком: до '>' вне фигурных скобок."""
    depth = 0
    for i in range(start, len(src)):
        c = src[i]
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
        elif c == ">" and depth == 0:
            return src[start:i + 1]
    return src[start:start + 400]


def _fullframe_backgrounds(src: str) -> list[str]:
    """Все фоны, залитые НА ВЕСЬ КАДР.

    Полный кадр — это корневой элемент сцены и любой <AbsoluteFill>:
    последний по определению растянут inset:0, поэтому непрозрачный фон
    на нём закрывает подложку целиком. Заливки на обычных <div> не
    смотрим вовсе — панель или плашка внутри сцены имеет право быть
    непрозрачной, это часть рисунка, а не фон плана.
    """
    tags = []
    for m in re.finditer(r"<AbsoluteFill\b", src):
        tags.append(_balanced_tag(src, m.start()))
    m = re.search(r"return\s*\(?\s*(<[A-Za-z])", src)
    if m:
        tags.append(_balanced_tag(src, m.start(1)))

    out = []
    for tag in tags:
        out += _bg_values(tag)
        # style={containerStyle} — фон спрятан в переменной
        for var in re.findall(r"style=\{([A-Za-z_$][\w$]*)\}", tag):
            vm = re.search(r"\bconst\s+" + re.escape(var) + r"\b[^=]*=\s*\{", src)
            if vm:
                obj = _balanced(src, vm.end() - 1, "{", "}")
                out += _bg_values(obj)
    return out


def check_static(src: str) -> list[str]:
    """Ступень 2: то, что видно в коде без запуска."""
    bad = []
    # Заливка кадра — тот самый брак, из-за которого сцены посреди
    # документального ролика читались как провал в чёрное. Подложку кладёт
    # Scene.tsx под каждую сцену; непрозрачный корень её просто закрывает,
    # и вся защита пропадает молча — рендер при этом проходит.
    opaque = [v.strip() for v in _fullframe_backgrounds(src) if _is_opaque(v)]
    if opaque:
        bad.append(
            f"непрозрачная заливка на весь кадр ({opaque[0]}) — она закроет "
            "общую подложку Backdrop, и сцена станет плоским тёмным пятном; "
            "фон кадра кладёт Scene.tsx, корень сцены должен быть прозрачным")
    if re.search(r"\bBackdrop\b", src):
        bad.append("сцена сама подключает Backdrop — его уже подставляет "
                   "Scene.tsx, второй экземпляр удвоит виньетку и пылинки")
    if "p.enter" not in src or "p.exit" not in src:
        bad.append("не использует p.enter/p.exit — сцена моргнёт на склейке")
    if re.search(r"placeholder|TODO|FIXME", src, re.I):
        bad.append("следы недоделки (placeholder/TODO)")
    if src.count("interpolate(") < 3:
        bad.append(f"движения почти нет: interpolate вызван "
                   f"{src.count('interpolate(')} раз(а), нужно 3+")
    if "useCurrentFrame()" not in src:
        bad.append("не читает кадр — картинка статична")
    if re.search(r"Math\.random|new Date|Date\.now", src):
        bad.append("недетерминированный код (random/Date)")
    if re.search(r"<Img|fetch\(|staticFile\(", src):
        bad.append("тянет внешние файлы — в рендере их не будет")
    if len(src) < 900:
        bad.append(f"слишком короткий файл ({len(src)} символов) — это заготовка")
    return bad


def _still(kind: str, title: str, dur: float, at: float, dest: Path) -> str:
    """Отрисовать ОДИН кадр сцены в dest. Возвращает текст ошибки или ''.

    Вынесено из check_render, потому что кадр нужен теперь двум ступеням —
    пиксельной и зрительной, — и они обязаны смотреть на ОДНО И ТО ЖЕ:
    вторая копия вызова разъехалась бы по props (bare, items, lat/lon), и
    зрение судило бы не ту картинку, что прошла пиксели.

    bare=1 — БЕЗ общей подложки. Иначе проверка стала бы бессмысленной:
    живой фон сам даёт и десятки цветов, и движение между кадрами, и
    заглушка, не нарисовавшая ровно ничего, прошла бы её на чужой картинке.
    """
    props = {"kind": kind, "title": title, "dur": dur, "exit": 1, "enter": 1,
             "bare": True,
             "items": ["Опора A", "Опора B", "! Опора C"],
             "lat": 55, "lon": 37}
    fr = max(0, min(int(dur * 30) - 1, int(dur * 30 * at)))
    # БЕЗ shell=True и по ПОЛНОМУ ПУТИ. shell=True стоял здесь только ради
    # того, чтобы Windows нашла «npx» в PATH — а платой за это было окно
    # cmd.exe поверх всего на каждый вызов. Их здесь по три на каждую
    # схему, и владелец видел их десятками за ролик; CREATE_NO_WINDOW при
    # запуске через оболочку не спасает, потому что окно открывает уже
    # сам cmd, а не наш процесс.
    #
    # overlays._npx() возвращает полный путь к npx.cmd, и CreateProcess
    # запускает батник напрямую — оболочка не нужна.
    import overlays as _ov
    npx = _ov._npx()
    if not npx:
        return "Node.js/npx не найден — рисовать сцены нечем"
    r = subprocess.run(
        [npx, "remotion", "still", "Scene", str(dest), "--frame", str(fr),
         "--image-format", "png", "--props", json.dumps(props, ensure_ascii=False)],
        cwd=REMOTION, capture_output=True, text=True, encoding="utf-8",
        errors="replace", timeout=600, creationflags=CREATE_NO_WINDOW)
    if r.returncode != 0 or not dest.exists():
        return f"рендер упал: {(r.stderr or '')[-200:]}"
    return ""


def _for_vision(png: Path) -> bytes:
    """Кадр сцены -> картинка, которую есть смысл показывать модели.

    Две обязательные поправки, без них проверка врёт:
      1) при bare=1 фон кадра ПРОЗРАЧНЫЙ, и PNG раскладывается на белом.
         Палитра сцен светлая (#e9f2f6) — на белом от схемы остаются
         невидимые линии, и зрение честно отвечает «пустой кадр» про
         нормальную сцену. Подкладываем тёмное, как настоящий Backdrop.
      2) 1920x1080 модели не нужны и стоят токенов: ужимаем до 1024.
    """
    from PIL import Image
    im = Image.open(png).convert("RGBA")
    flat = Image.alpha_composite(
        Image.new("RGBA", im.size, (11, 13, 16, 255)), im).convert("RGB")
    flat.thumbnail((1024, 1024))
    import io
    buf = io.BytesIO()
    # PNG, а не JPEG: vision_chat в core.py отдаёт байты дальше с mime
    # image/png и своего параметра под другой формат не имеет
    flat.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


def check_render(kind: str, title: str, dur: float, log=print) -> list[str]:
    """Ступень 3: настоящий рендер и разбор пикселей.

    Отвечает на вопрос «сцена вообще что-то нарисовала и это шевелится».
    На вопрос «нарисовано ли то, что заявлено» отвечает check_vision.
    """
    from PIL import Image
    import tempfile
    import shutil
    bad = []
    # Кадры ложатся во временную папку, и убрать её обязана эта же функция.
    # Раньше уборки не было вовсе, а выходов отсюда четыре (в том числе
    # ранний возврат по ошибке рендера) — каждая проверка сцены оставляла во
    # временной папке системы два кадра 1920x1080, и проверок этих сотни за
    # прогон. Замер 2026-08-12: во временной папке 6.86 ГБ.
    tmp = Path(tempfile.mkdtemp())
    try:
        shots = []
        for at in (0.25, 0.8):
            dest = tmp / f"f{at}.png"
            err = _still(kind, title, dur, at, dest)
            if err:
                return [err]
            shots.append(dest)

        stats = []
        for s in shots:
            im = Image.open(s).convert("RGB")
            px = list(im.getdata())
            colors = len(set(px))
            # самый частый цвет: если он занимает почти всё — это заливка
            top = max(px.count(c) for c in set(px[::5000])) if px else 0
            stats.append((colors, top / len(px)))
        if max(c for c, _ in stats) < 12:
            bad.append(f"почти одноцветный кадр "
                       f"({max(c for c, _ in stats)} цветов)")
        if min(t for _, t in stats) > 0.985:
            bad.append("кадр залит одним цветом — это заглушка, а не сцена")
        a = list(Image.open(shots[0]).convert("RGB").getdata())[::997]
        b = list(Image.open(shots[1]).convert("RGB").getdata())[::997]
        if a == b:
            bad.append("между началом и концом ничего не изменилось — "
                       "нет анимации")
        return bad
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


# Что вернула ступень зрения. Три исхода, а не два, — и это главное решение
# в этом файле, см. комментарий в check_vision.
VISION_OK = "ok"            # на кадре видно заявленное
VISION_BAD = "bad"          # кадр не про то, что обещано именем сцены
VISION_BLIND = "unverified"  # посмотреть не удалось (квота, сеть, отказ)


def check_vision(kind: str, title: str, subject: str, dur: float = 6.0,
                 api_key: str = "", log=print,
                 png: Path | None = None) -> tuple[str, str]:
    """Ступень 4: посмотреть на ОТРИСОВАННЫЙ кадр и спросить, то ли на нём.

    Зачем отдельная ступень. Все предыдущие отвечают на вопрос «код
    рабочий?»: компилируется, корень прозрачный, цветов больше одного,
    между кадрами есть движение. Сцена thermal_gradient_map прошла их все и
    оказалась РОВНЫМ РОЗОВЫМ ПРЯМОУГОЛЬНИКОМ в рамке под заголовком «steam
    jacket cross-section»: ни градиента, ни разреза. Пиксельная проверка
    такое не поймает никогда — прямоугольник, меняющий цвет со временем,
    честно даёт и цвета, и движение. Отличить схему от подписанной заливки
    может только тот, кто СМОТРИТ на картинку.

    Приём взят с _vision_pick в core.py (выбор стокового кадра зрением):
    тот же vision_chat с перебором ключей и моделей, тот же порядок вопросов
    «опиши -> оцени -> ответь», тот же max_tokens=1500 (у моделей с
    «размышлениями» меньший бюджет возвращает пустой ответ).

    ЧТО ДЕЛАЕМ, КОГДА ЗРЕНИЕ НЕДОСТУПНО. Суточная квота Gemini считается на
    пару «проект + модель» и выбирается регулярно — то есть отказ здесь не
    исключение, а обычный вечер. Обе крайности плохи:
      - считать невидимое браком значит останавливать конвейер ровно тогда,
        когда он работает: сцены перестанут писаться, и каждый нарисованный
        момент выродится в обычный кадр — та самая деградация «по лимиту»,
        которой мы избегаем везде;
      - считать невидимое годным молча значит вернуть ровно ту дыру, ради
        которой всё это писалось, только теперь с видимостью проверки.
    Поэтому третий исход: ПРИНИМАЕМ, но помечаем сцену как непроверенную —
    в журнал предупреждением, в scenes.json полем vision и в scenes_audit.json
    отдельной записью. Непроверенная сцена работает, но её видно в списке, и
    `--audit` на живой квоте досматривает её позже. Брак так задерживается
    максимум до следующего аудита, а ночь не встаёт.
    """
    import core
    import tempfile
    subject = (subject or "").strip()
    if not subject:
        # Не с чем сравнивать: без замысла («что должно быть нарисовано»)
        # вопрос модели вырождается в «красиво ли», а это не проверка.
        return VISION_BLIND, "нечего проверять: у сцены нет описания замысла"

    # Свой кадр — своя уборка. Когда png передали снаружи, файл чужой и
    # трогать его нельзя; когда сняли здесь — временная папка обязана уйти при
    # ЛЮБОМ из шести выходов ниже, включая отказ зрения по квоте (а он тут
    # обычное дело, см. док-строку).
    tmp = None
    if png is None:
        tmp = Path(tempfile.mkdtemp())
        png = tmp / f"{kind}.png"
        err = _still(kind, title, dur, VISION_AT, png)
        if err:
            _drop_tmp(tmp)
            return VISION_BLIND, err
    try:
        return _check_vision(kind, title, dur, subject, png, api_key)
    finally:
        _drop_tmp(tmp)


def _drop_tmp(tmp) -> None:
    """Убрать временную папку, если она наша."""
    if not tmp:
        return
    import shutil
    shutil.rmtree(tmp, ignore_errors=True)


def _check_vision(kind: str, title: str, dur: float, subject: str,
                  png, api_key: str) -> tuple[str, str]:
    """Разговор со зрением по готовому кадру. Уборку делает check_vision."""
    import core
    prompt = (VISION_PROMPT
              .replace("__TITLE__", str(title or "(нет подписи)")[:120])
              .replace("__SUBJECT__", subject[:400].replace("\n", " ")))
    try:
        out = core.vision_chat(
            prompt, _for_vision(png), api_key,
            system="You are a documentary fact-checker looking at a diagram.",
            max_tokens=1500)
    except Exception as e:
        return VISION_BLIND, core._redact(e) if hasattr(core, "_redact") else str(e)

    m = re.search(r"\{.*\}", out, re.S)
    if not m:
        return VISION_BLIND, f"ответ зрения не разобрался: {out[:160]}"
    try:
        ans = json.loads(m.group(0))
    except ValueError:
        return VISION_BLIND, f"ответ зрения не JSON: {out[:160]}"

    shows = str(ans.get("shows", "")).strip()
    why = str(ans.get("why", "")).strip()
    if ans.get("depicts") is True:
        return VISION_OK, shows
    # Ровно как в _vision_pick: вердикт весомее номера/описания. Отсутствие
    # "depicts": true считаем отказом, а не сбоем — модель ответила, просто
    # не подтвердила.
    return VISION_BAD, (f"на кадре видно «{shows}»; не хватает: {why}"
                        if shows else why or "модель не подтвердила замысел")


def register(kind: str, component: str) -> None:
    """Дописать сцену в диспетчер Scene.tsx.

    Правка идёт по двум якорям в чужом файле, и если якорь однажды
    переименуют, str.replace просто ничего не сделает — БЕЗ ЕДИНОГО СЛОВА.
    Последствие не в том, что сцена не появится: kind, которого нет в
    switch, попадает в ветку default, а она возвращает null. То есть рендер
    отдаст ПУСТОЙ кадр, приёмка забракует его как «залит одним цветом», и
    три попытки подряд модель будет переписывать совершенно нормальный код,
    а в журнале будет стоять неверная причина. Поэтому проверяем результат.
    """
    src = REGISTRY.read_text(encoding="utf-8")
    imp = f"import {{ {component} }} from './scenes/{kind}';"
    if imp not in src:
        src = src.replace("export type { SceneProps };",
                          f"{imp}\nexport type {{ SceneProps }};")
    case = f"    case '{kind}':\n      return <{component} {{...props}} />;"
    if f"case '{kind}':" not in src:
        src = src.replace("    default:", f"{case}\n    default:")
    if imp not in src or f"case '{kind}':" not in src:
        raise RuntimeError(
            f"{REGISTRY.name} не принял сцену «{kind}»: не нашлось места для "
            "вставки (якоря «export type { SceneProps };» и «    default:»). "
            "Без записи в диспетчер сцена рисовала бы пустой кадр, а приёмка "
            "винила бы в этом код сцены")
    REGISTRY.write_text(src, encoding="utf-8")


def unregister(kind: str, component: str) -> None:
    src = REGISTRY.read_text(encoding="utf-8")
    src = src.replace(f"import {{ {component} }} from './scenes/{kind}';\n", "")
    src = src.replace(f"    case '{kind}':\n      return <{component} {{...props}} />;\n", "")
    REGISTRY.write_text(src, encoding="utf-8")


def typecheck() -> tuple[bool, str]:
    # Локальный компилятор из node_modules, а НЕ «npx tsc». Здесь, в
    # основном чекауте, npx находит правильный tsc (проверено: код 0), но
    # это везение: в отдельном рабочем каталоге npx ставит посторонний
    # пакет tsc@2.0.4, тот отвечает «This is not the tsc command you are
    # looking for» — и приёмка схем читает это как ОШИБКИ ТИПОВ, браку́я
    # исправные сцены. Локальный путь такого не допускает.
    #
    # shell=True убран заодно: он открывал окно cmd.exe на каждый вызов.
    tsc = REMOTION / "node_modules" / ".bin" / (
        "tsc.cmd" if os.name == "nt" else "tsc")
    if not tsc.exists():
        import overlays as _ov
        npx = _ov._npx()
        if not npx:
            return False, "нет ни локального tsc, ни npx"
        cmd = [npx, "tsc", "--noEmit"]
    else:
        cmd = [str(tsc), "--noEmit"]
    r = subprocess.run(cmd, cwd=REMOTION,
                       capture_output=True, text=True, encoding="utf-8",
                       errors="replace", timeout=600,
                       creationflags=CREATE_NO_WINDOW)
    return r.returncode == 0, (r.stdout or r.stderr)[-900:]


# ---------- Журнал вердиктов зрения по библиотеке сцен ----------

def audit_load(log=None) -> dict:
    """Накопленные вердикты зрения. Пусто — досмотра ещё не было (норма)."""
    data, err = _read_json_map(AUDIT)
    if err:
        # Молчать нельзя: без вердиктов quarantined() пуст, и сцена, про
        # которую зрение уже сказало «на кадре не то», снова уходит в ролик.
        _complain("вердикты зрения по сценам потеряны — забракованные схемы "
                  "снова считаются годными",
                  why=err,
                  hint=f"почини {AUDIT.name} или удали его и прогони "
                       "gen_scenes.py --audit заново",
                  level="критично")
        if log:
            log(f"[Сцены] ВНИМАНИЕ: {err}", "warn")
    return data


def audit_mark(kind: str, verdict: str, why: str = "", subject: str = "",
               title: str = "") -> None:
    """Записать вердикт по сцене. ТОЛЬКО в данные.

    Помечаем, а не удаляем и не переписываем .tsx: файлы сцен лежат в
    remotion/src, Remotion собирает весь проект целиком, и правка ради
    пометки может обрушить сборку идущего в этот момент рендера. К тому же
    удалённая сцена унесла бы с собой и замысел, по которому её надо
    переписать.
    """
    from datetime import datetime
    data, err = _read_json_map(AUDIT)
    if err:
        # НЕ ПИШЕМ поверх нечитаемого файла: запись сохранила бы один свежий
        # вердикт вместо всех накопленных, то есть потеря была бы
        # окончательной. Один несохранённый вердикт — потеря обратимая:
        # сцену досмотрят следующим --audit. Прогон при этом не роняем, иначе
        # битый файл вердиктов лишал бы ролик всех нарисованных сцен разом.
        _complain(f"вердикт зрения по сцене «{kind}» не сохранён",
                  why=err,
                  hint=f"почини {AUDIT.name} — пока он битый, досмотр "
                       "библиотеки не копится",
                  level="критично")
        return
    rec = data.get(kind) or {}
    rec.update({"verdict": verdict, "why": why[:400],
                "checked": datetime.now().strftime("%Y-%m-%d %H:%M")})
    if subject:
        rec["subject"] = subject[:300]
    if title:
        rec["title"] = title[:120]
    data[kind] = rec
    AUDIT.write_text(json.dumps(data, ensure_ascii=False, indent=2),
                     encoding="utf-8")


def quarantined() -> dict:
    """Сцены, про которые зрение сказало «нарисовано не то» — {kind: причина}.

    Их нельзя переиспользовать: библиотека сцен общая, и одна такая сцена
    кочует из ролика в ролик, пока её не перепишут.
    """
    return {k: v.get("why", "") for k, v in audit_load().items()
            if v.get("verdict") == VISION_BAD and k not in BUILTIN_SCENES}


def repair_fade(code: str, component: str) -> tuple[str, bool]:
    """Дописать забытое домножение на p.enter * p.exit.

    Правило про фейд в промпте расписано подробнее всех остальных, с готовой
    строкой для копирования, — и всё равно оно самое нарушаемое: замер прогона
    2026-08-14 дал 11 отказов из 22 именно по нему, то есть половину. Прогон
    отдал 2 сцены из 8 вместо ожидаемых шести.

    Это НЕ брак сцены: рисунок, движение и композиция могут быть отличными,
    а забыта одна строчка. Выбрасывать такую работу и жечь три вызова модели
    ради механической мелочи — расточительство. Чиним сами.

    Способ намеренно тупой и потому надёжный: тело модели переименовываем и
    оборачиваем в AbsoluteFill с нужной прозрачностью. Не правим её JSX
    изнутри — там можно сломать что угодно, а обёртка снаружи безопасна.
    """
    if "p.enter" in code and "p.exit" in code:
        return code, False
    marker = f"export const {component}: React.FC<SceneProps> = "
    if marker not in code:
        return code, False           # непривычная форма — пусть решает гейт
    body = f"{component}Body"
    out = code.replace(marker, f"const {body}: React.FC<SceneProps> = ", 1)
    # AbsoluteFill может быть не импортирован, если сцена рисует один <svg>
    # Импорт AbsoluteFill мог отсутствовать: сцена могла рисовать
    # только <svg>, а обёртке он нужен.
    if not re.search(r"import \{[^}]*AbsoluteFill", out):
        out = re.sub(r"(import \{)([^}]*)(\} from 'remotion';)",
                     lambda m: m.group(1) + m.group(2).rstrip() +
                     (", AbsoluteFill" if "AbsoluteFill" not in m.group(2)
                      else "") + " " + m.group(3),
                     out, count=1)
    out += f"""

// Обёртка дописана автоматически: модель забыла домножить прозрачность на
// p.enter * p.exit, и без этого сцена моргнула бы на склейке с соседними
// планами. Сам рисунок не тронут.
export const {component}: React.FC<SceneProps> = (p) => (
  <AbsoluteFill style={{{{ opacity: p.enter * p.exit }}}}>
    <{body} {{...p}} />
  </AbsoluteFill>
);
"""
    return out, True


# «Объявлено, но не используется» — это НЕ ошибка типов, это строгость
# tsconfig (noUnusedLocals). Сцена с лишней переменной рисуется ровно так же.
_МУСОРНЫЕ_КОДЫ = ("TS6133", "TS6192", "TS6196", "TS6198", "TS6205")
_МУСОР = re.compile(
    r"\((\d+),\d+\):\s*error\s+(TS6\d{3}):\s*'([^']+)'"
    r"|\((\d+),\d+\):\s*error\s+(TS6198):\s*All destructured")


def unused_names(out: str, kind: str) -> list[tuple[int, str]]:
    """(строка, имя) для жалоб «объявлено, но не читается» ПО ЭТОЙ сцене."""
    имена = []
    for line in (out or "").splitlines():
        if f"{kind}.tsx(" not in line or "error TS6" not in line:
            continue
        m = re.search(r"\((\d+),\d+\):\s*error\s+(TS6\d{3}):\s*'([^']+)'",
                      line)
        if m and m.group(2) in _МУСОРНЫЕ_КОДЫ:
            имена.append((int(m.group(1)), m.group(3)))
    return имена


def only_unused(out: str, kind: str) -> bool:
    """Все ли жалобы типизации — про неиспользуемые объявления.

    Если среди них есть хоть одна настоящая (незакрытый тег, оборванная
    строка, несуществующее свойство Easing) — чинить нечего, сцену отвергаем
    как и раньше. Замер по журналу: настоящих ошибок втрое больше мусорных
    (TS17008 178, TS1005 124 против TS6133 48), так что ворота нужны."""
    ошибки = [l for l in (out or "").splitlines() if ": error TS" in l]
    if not ошибки:
        return False
    for l in ошибки:
        m = re.search(r"error (TS\d+):", l)
        if not m or m.group(1) not in _МУСОРНЫЕ_КОДЫ:
            return False
    return True


def repair_unused(code: str, out: str, kind: str) -> tuple[str, bool]:
    """Убрать объявления, на которые ругается noUnusedLocals.

    Та же мысль, что и в repair_fade: механическую мелочь чиним, а не жжём на
    ней три вызова модели. Замер прогона 2026-08-14_2: из 14 отказов 9 —
    типизация, и по журналу за всю историю 48 из них про неиспользуемые
    объявления. При этом сцена с лишней переменной рисуется ровно так же:
    volumen_vergleich и geographische_ausbreitung отвергались ТРИЖДЫ каждая,
    то есть модель по такой подсказке не исправляется.

    Правится три формы, все однострочные и потому безопасные: строка импорта,
    простое `const X = ...;` и одно имя внутри деструктуризации. Всё
    остальное оставляем как есть — вызывающий всё равно перепроверяет
    типизацию и отвергает сцену, если починка не помогла."""
    имена = unused_names(out, kind)
    if not имена:
        return code, False
    строки = code.splitlines()
    менял = False
    # с конца, чтобы удаление строки не сдвигало номера остальных
    for n, имя in sorted(имена, reverse=True):
        if not 1 <= n <= len(строки):
            continue
        s = строки[n - 1]
        нов = None
        if re.match(r"\s*import\b", s):
            # один спецификатор из фигурных скобок; опустела — вон всю строку
            без = re.sub(rf"\b{re.escape(имя)}\b\s*,?\s*", "", s, count=1)
            без = re.sub(r",\s*\}", " }", без)
            нов = "" if re.search(r"\{\s*\}", без) else без
        elif re.match(rf"\s*(?:const|let|var)\s+{re.escape(имя)}\s*=", s):
            нов = ""
        elif re.search(r"\{[^{}]*\}", s) and re.search(
                rf"\b{re.escape(имя)}\b", s):
            без = re.sub(rf"\b{re.escape(имя)}\b\s*,?\s*", "", s, count=1)
            без = re.sub(r",\s*\}", " }", без)
            нов = "" if re.search(r"\{\s*\}\s*=", без) else без
        if нов is None:
            continue
        менял = True
        if нов.strip():
            строки[n - 1] = нов
        else:
            строки.pop(n - 1)
    return ("\n".join(строки) + "\n") if менял else code, менял


def accept(kind: str, code: str, title: str, dur: float, log=print,
           subject: str = "", api_key: str = "",
           report: dict | None = None) -> list[str]:
    """Прогнать сцену через все ступени. Пустой список = принята.

    subject — что сцена ОБЯЗАНА изобразить (brief замысла). Без него ступень
    зрения пропускается: сравнивать картинку не с чем.
    report — сюда кладётся исход зрения (ok/bad/unverified) для вызывающего;
    новый необязательный аргумент, чтобы не менять сигнатуру для старых
    вызовов (селф-тест зовёт accept без него).
    """
    component = _component_name(kind)
    # Механическую мелочь чиним, а не отвергаем. Забытое домножение на
    # p.enter/p.exit — половина всех отказов (замер 2026-08-14: 11 из 22), и
    # при этом сам рисунок сцены к нему отношения не имеет. Отказ здесь стоил
    # трёх вызовов модели и потерянной сцены на ровном месте.
    code, fixed = repair_fade(code, component)
    if fixed:
        log(f"[Сцены] {kind}: дописал фейд (p.enter/p.exit) — модель забыла")
    path = SCENES_DIR / f"{kind}.tsx"
    SCENES_DIR.mkdir(parents=True, exist_ok=True)
    path.write_text(code, encoding="utf-8")
    register(kind, component)

    bad = check_static(code)
    if not bad:
        ok, out = typecheck()
        # Мусорную строгость чиним сами и перепроверяем. Если починка не
        # помогла — возвращаем исходный файл и жалуемся ИСХОДНЫМ текстом:
        # он и уйдёт в подсказку следующей попытке.
        if not ok and only_unused(out, kind):
            лечёный, менял = repair_unused(code, out, kind)
            if менял:
                path.write_text(лечёный, encoding="utf-8")
                ok2, out2 = typecheck()
                if ok2:
                    code, ok = лечёный, True
                    log(f"[Сцены] {kind}: убрал неиспользуемые объявления — "
                        "модель оставила лишнее, рисунку это не мешает")
                else:
                    path.write_text(code, encoding="utf-8")
        if not ok:
            bad.append(f"не проходит типизацию проекта: {out.strip()[:300]}")
    if not bad:
        bad = check_render(kind, title, dur, log)
    if not bad and subject:
        verdict, why = check_vision(kind, title, subject, dur, api_key, log)
        if report is not None:
            report["vision"], report["vision_why"] = verdict, why
        if verdict == VISION_BAD:
            # Формулируем ПРЕТЕНЗИЮ СЛОВАМИ МОДЕЛИ: этот текст уходит в
            # следующую попытку (write_scene подставляет why в промпт), и
            # «модель видит у тебя один плоский прямоугольник» правит код
            # куда лучше, чем «сцена не принята».
            bad.append(f"на отрисованном кадре не видно заявленного "
                       f"({subject[:120]}): {why}")
        elif verdict == VISION_BLIND:
            log(f"[Сцены] {kind}: зрение недоступно ({why[:120]}) — принимаю "
                "НЕПРОВЕРЕННОЙ, пометил в scenes_audit.json", "warn")
            audit_mark(kind, VISION_BLIND, why, subject, title)
            # В ролик уходит схема, на которую никто не смотрел. Именно так и
            # доехал до готового ролика розовый прямоугольник под подписью
            # «steam jacket cross-section»: ступени 1-3 говорят лишь «код
            # рабочий». Пропуск ступени — это пропуск ШАГА ПРИЁМКИ, и он
            # обязан быть в итоге прогона, а не только строкой в журнале.
            _complain("в ролике есть нарисованная схема, которую зрение не "
                      "проверило",
                      why=f"«{kind}»: {why[:140]}",
                      hint="досмотри позже: python gen_scenes.py --audit "
                           "--limit 5 — забракованные сцены будут переписаны "
                           "при следующем ролике",
                      level="заметно")
        else:
            audit_mark(kind, VISION_OK, why, subject, title)

    if bad:
        unregister(kind, component)
        path.unlink(missing_ok=True)
    return bad


# ---------- Рендер сцены в клип раскадровки ----------

def _no_scene(kind: str, why: str) -> None:
    """Сцена не доехала до кадра — план заменён обычной съёмкой."""
    _complain("нарисованная схема заменена обычным кадром",
              why=f"«{kind}» не отрисовалась: {why}",
              hint="это самый заметный вид потери: вместо схемы в кадре "
                   "стоковое видео не по теме — проверь, что Remotion "
                   "собирается (npx remotion render в папке remotion)",
              level="критично")


def render_scene(kind: str, dest: Path, seconds: float, *, title: str = "",
                 items: list | None = None, lat=None, lon=None,
                 width: int = 1920, height: int = 1080, fps: int = 30,
                 log=print, look: str = "", accent: str = "") -> Path:
    """Отрисовать сцену в mp4 РОВНО нужной длительности.

    Клип встаёт в раскадровку как обычный beat_NNN.mp4 — рендеру ролика
    знать про сцены не нужно, для него это просто ещё один файл.
    """
    import overlays as ov
    props = {"kind": kind, "dur": round(float(seconds), 3),
             "exit": 1, "enter": 1}
    if title:
        props["title"] = title
    if items:
        props["items"] = list(items)
    if lat is not None and lon is not None:
        props["lat"], props["lon"] = float(lat), float(lon)
    # Почерк и акцент канала: по ним подложка сцены выбирает свой тон дна
    # (Backdrop.BASES). Пустые не шлём — у Backdrop свои умолчания.
    if look:
        props["look"] = look
    if accent:
        props["accent"] = accent

    npx = ov._npx()
    if not npx:
        _no_scene(kind, "Node.js/npx не найден — рисовать сцены нечем")
        raise RuntimeError("нет npx — Node.js не установлен")
    dest.parent.mkdir(parents=True, exist_ok=True)
    cmd = [npx, "remotion", "render", "Scene", str(dest),
           "--props", json.dumps(props, ensure_ascii=False),
           "--codec", "h264", "--log", "error"]
    r = subprocess.run(cmd, cwd=REMOTION, capture_output=True, text=True,
                       encoding="utf-8", errors="replace", timeout=900,
                       env=ov._node_env(), creationflags=CREATE_NO_WINDOW)
    if r.returncode != 0 or not dest.exists():
        # Жалуемся ЗДЕСЬ, хотя ошибку ловит вызывающий (core: «сцена не
        # отрисовалась — беру обычный кадр»). Там она превращается в строку
        # журнала, и подмена уезжает в ролик молча: вместо схемы «нагрузка
        # перешла на три опоры» зритель видит стоковую стройку. Место
        # подмены знает только этот файл, поэтому и говорит он.
        _no_scene(kind, (r.stderr or "")[-200:])
        raise RuntimeError(f"сцена {kind} не отрисовалась: {r.stderr[-300:]}")
    log(f"[Сцена] {kind} -> {dest.name} ({seconds:.1f} c)")
    return dest


def available_scenes() -> list[str]:
    """Какие сцены сейчас есть в диспетчере Scene.tsx.

    Пустой список раньше означал сразу две противоположные вещи: «сцен ещё
    не писали» и «диспетчер не прочитался». Во втором случае grow() считает
    НОВОЙ каждую сцену и переписывает существующие поверх, а audit() бодро
    сообщает «сцен в диспетчере: 0; годных 0» — то есть библиотека выглядит
    проверенной, ни разу её не открыв.
    """
    try:
        src = REGISTRY.read_text(encoding="utf-8")
    except OSError as e:
        raise RuntimeError(
            f"не читается диспетчер сцен {REGISTRY}: {e}. Пока он недоступен, "
            "нельзя ни понять, какие сцены уже есть, ни добавить новую") from e
    return re.findall(r"case '([a-z0-9_]+)':", src)


# ---------- Оркестровка: от сценария до принятых сцен ----------

def propose(script_text: str, channel: dict, count: int = 8,
            api_key: str = "", log=print) -> list[dict]:
    """Спросить у модели, ГДЕ в сценарии нужна нарисованная сцена.

    Возвращает список замыслов, а не готовый код: сначала решаем «что и
    зачем», потом отдельным запросом «как это нарисовать». Слитый в один
    запрос, он даёт код под выдуманный повод — проверено на оверлеях.
    """
    import core
    look = SCENE_LOOK.get((channel.get("palette") or "").strip().lower(), "")
    prompt = PROPOSE_PROMPT.format(
        channel=channel.get("name") or channel.get("id", ""),
        tone=channel.get("tone", "документальный"),
        lang=channel.get("lang", "английский"),
        look=("\n\nHOUSE STYLE OF THIS CHANNEL — follow it exactly:\n"
              + look) if look else "",
        count=count,
        script=script_text[:14000])
    out = core.llm_chat([{"role": "user", "content": prompt}],
                        api_key, 0.7, 6000)
    try:
        ideas = json.loads(_strip_fences(out))
    except ValueError:
        log("[Сцены] Модель ответила не JSON — сцен в этом ролике не будет",
            "warn")
        # Молчаливый возврат [] означал бы «в сценарии не нашлось моментов под
        # схему» — а это совсем другое дело. Здесь моменты, возможно, есть, но
        # ни один не будет нарисован, и весь ролик пойдёт одной съёмкой.
        _complain("нарисованных схем в ролике не будет совсем",
                  why=f"модель ответила не JSON: {str(out)[:120]}",
                  hint="обычно лечится повтором; если повторяется — кончилась "
                       "квота модели, попробуй позже",
                  level="заметно")
        return []
    if not isinstance(ideas, list):
        _complain("нарисованных схем в ролике не будет совсем",
                  why=f"модель вернула {type(ideas).__name__} вместо списка "
                      "замыслов",
                  hint="обычно лечится повтором",
                  level="заметно")
        return []
    good = []
    for it in ideas:
        if not isinstance(it, dict):
            continue
        kind = re.sub(r"[^a-z0-9_]+", "_", str(it.get("kind", "")).lower()).strip("_")
        if not kind or not it.get("quote"):
            continue
        it["kind"] = kind
        good.append(it)
    log(f"[Сцены] Модель нашла мест под сцены: {len(good)}")
    return good[:count]


def write_scene(idea: dict, api_key: str = "", log=print,
                rejected: str = "", why: list | None = None) -> str:
    """Попросить модель написать КОД одной сцены.

    rejected/why — прошлая отвергнутая попытка и причины отказа. БЕЗ НИХ
    повтор был буквально тем же запросом: тот же промпт — тот же ответ.
    Замер ночи 2026-08-04: из шести сцен три отвергнуты, и у каждой все
    три попытки провалились по одной и той же причине (неиспользуемая
    переменная, залитый кадр) — модель не знала, что именно не так.
    Ровно та же ошибка уже ловилась на главах сценария.
    """
    import core
    kind = idea["kind"]
    prompt = CODE_PROMPT.format(
        quote=idea.get("quote", ""), brief=idea.get("brief", ""),
        title=idea.get("title", ""), component=_component_name(kind))
    if rejected and why:
        prompt += (
            "\n\nYOUR PREVIOUS ATTEMPT WAS REJECTED. Fix exactly these "
            "problems and keep everything else:\n"
            + "\n".join(f"  - {w}" for w in why)
            + "\n\nCommon causes, in case they apply:\n"
              "  - a variable you computed but never used (TypeScript is run "
              "with --noUnusedLocals: DELETE it or actually use it)\n"
              "  - everything you drew is the same colour as the background, "
              "or positioned outside the frame, so the render is a flat fill\n"
              "  - the animation finishes in the first frames, so the picture "
              "at 25% and at 80% of the duration is identical\n"
              "  - the picture is one shape filled with a single flat colour "
              "with a caption over it. The caption is not the drawing. Draw "
              "the gradient stops, the layers and their boundaries, the "
              "second bar of the comparison, the axis with its numbers — "
              "a rendered frame is shown to a vision model and it is asked "
              "whether the promised thing is actually visible\n"
              "\nPREVIOUS ATTEMPT:\n" + rejected[:3000])
    # Температура для КОДА низкая. 0.85 хороша для замыслов, но на коде
    # даёт синтаксический мусор: замер 2026-08-04 — 26 отказов из 54 были
    # не «скучно нарисовано», а «'}' expected» и «No overload matches».
    # Разнообразие сцен обеспечивает propose(), а не дрожь в генераторе кода.
    return _strip_fences(core.llm_chat(
        [{"role": "user", "content": prompt}], api_key, 0.3, 8000))


def grow(script_text: str, channel: dict, count: int = 6, dur: float = 6.0,
         api_key: str = "", log=print) -> list[dict]:
    """Полный цикл: замыслы -> код -> приёмка -> библиотека канала.

    Возвращает список ПРИНЯТЫХ сцен: [{kind, title, quote, items}].
    Отвергнутые не возвращаются вовсе — в ролик попадает только то, что
    прошло все ступени.
    """
    ideas = propose(script_text, channel, count, api_key, log)
    if not ideas:
        return []
    lib, lib_err = _read_json_map(LIBRARY)
    if lib_err:
        # Читать не вышло — значит и ПИСАТЬ нельзя (см. конец функции):
        # запись положила бы в scenes.json только сцены этого ролика, стерев
        # замыслы всех остальных. Замысел живёт только здесь, и без него
        # досмотр сцены вырождается в «судим по имени файла».
        _complain("библиотека замыслов сцен не прочитана — новые сцены в неё "
                  "не запишутся",
                  why=lib_err,
                  hint=f"почини {LIBRARY.name}; пока он битый, досмотр "
                       "старых сцен идёт по одному их названию",
                  level="критично")
        log(f"[Сцены] ВНИМАНИЕ: {lib_err} — библиотеку не переписываю, "
            "чтобы не потерять замыслы остальных сцен", "warn")

    accepted = []
    have = set(available_scenes())
    # Сцены, которые аудит уже признал не изображающими своё название.
    # Библиотека ОБЩАЯ и переиспользуемая, поэтому один розовый прямоугольник
    # без такой проверки кочует из ролика в ролик неограниченно долго.
    quar = quarantined()
    seen_verdicts = audit_load()
    for idea in ideas:
        kind = idea["kind"]
        redo = ""
        if kind in have:
            redo = quar.get(kind, "")
            if not redo:
                # Такая сцена уже есть — не переписываем, просто используем.
                # Так библиотека канала копится между роликами, а не
                # переделывается заново каждую ночь.
                accepted.append(idea)
                was = (seen_verdicts.get(kind) or {}).get("verdict")
                log(f"[Сцены] {kind}: уже в библиотеке — беру готовую"
                    + ("" if was == VISION_OK else " (зрением НЕ проверена)"))
                if was != VISION_OK:
                    # Готовая сцена берётся В КАДР как есть, и никакая ступень
                    # приёмки её больше не смотрит: приёмка работает только
                    # над свежим кодом. Одной строкой со счётчиком — сколько
                    # схем в этом ролике никто не видел глазами.
                    _complain("готовые схемы взяты из библиотеки без досмотра "
                              "зрением",
                              why="вердикта в scenes_audit.json по ним нет — "
                                  "проверялось только то, что код рабочий",
                              hint="python gen_scenes.py --audit --limit 5 "
                                   "(квота зрения мала, поэтому понемногу)",
                              level="мелочь")
                continue
            log(f"[Сцены] {kind}: помечена на перегенерацию ({redo[:120]}) — "
                "пишу заново вместо того, чтобы брать готовую", "warn")
        # Старый код сцены на случай, если переписать не выйдет. accept()
        # при отказе СТИРАЕТ файл и вычищает его из Scene.tsx — для новой
        # сцены это правильно, а для существующей означало бы, что неудачная
        # ночь молча уносит сцену, на которую ссылаются другие ролики.
        # Лучше вернуть прежнюю (пусть и плохую) версию: она хотя бы
        # собирается, а пометка на перегенерацию остаётся висеть.
        old_code = ""
        if redo:
            try:
                old_code = (SCENES_DIR / f"{kind}.tsx").read_text(encoding="utf-8")
            except OSError:
                pass
        # Что сцена ОБЯЗАНА изобразить — это и есть вопрос к зрению.
        subject = (idea.get("brief") or idea.get("quote") or "").strip()
        prev_code, prev_why = "", []
        done = False
        for attempt in range(1, ATTEMPTS + 1):
            try:
                code = write_scene(idea, api_key, log,
                                   rejected=prev_code, why=prev_why)
            except Exception as e:
                log(f"[Сцены] {kind}: модель не ответила ({e})", "warn")
                break
            report: dict = {}
            bad = accept(kind, code, idea.get("title", ""), dur, log,
                         subject=subject, api_key=api_key, report=report)
            prev_code, prev_why = code, bad
            if not bad:
                seen = report.get("vision", VISION_BLIND)
                log(f"[Сцены] {kind}: ПРИНЯТА (попытка {attempt})"
                    + ("" if seen == VISION_OK else
                       " — но кадр зрением НЕ ПРОВЕРЕН, помечена в "
                       "scenes_audit.json"))
                lib[f"{channel.get('id','')}/{kind}"] = {
                    "kind": kind, "channel": channel.get("id", ""),
                    "title": idea.get("title", ""),
                    "quote": idea.get("quote", "")[:200],
                    "brief": idea.get("brief", "")[:300],
                    # Видел ли кто-нибудь эту сцену глазами. Поле нужно
                    # именно в библиотеке: по нему `--audit --unverified`
                    # потом досматривает то, что прошло на выбранной квоте.
                    "vision": seen,
                }
                accepted.append(idea)
                have.add(kind)
                done = True
                break
            log(f"[Сцены] {kind}: отклонена (попытка {attempt}/{ATTEMPTS}) — "
                + "; ".join(bad)[:200], "warn")
        if not done:
            log(f"[Сцены] {kind}: не прошла приёмку — этот момент останется "
                "обычным кадром", "warn")
            # Восстанавливаем ИМЕННО ЗДЕСЬ, а не в ветке «кончились попытки»:
            # цикл выходит ещё и по break, когда модель не ответила, и тогда
            # файл уже мог быть стёрт предыдущей попыткой.
            if old_code:
                (SCENES_DIR / f"{kind}.tsx").write_text(old_code,
                                                        encoding="utf-8")
                register(kind, _component_name(kind))
                log(f"[Сцены] {kind}: вернул прежнюю версию файла — она "
                    "остаётся помеченной на перегенерацию, но сборка "
                    "Remotion не разваливается", "warn")

    if not lib_err:
        LIBRARY.write_text(json.dumps(lib, ensure_ascii=False, indent=2),
                           encoding="utf-8")
    log(f"[Сцены] Принято {len(accepted)} из {len(ideas)}")
    if len(accepted) < len(ideas):
        # Каждая непринятая сцена — это план, который зритель увидит обычной
        # съёмкой вместо схемы: «нагрузка перешла на три опоры» под стоковым
        # кадром стройки. Раньше про это говорила строка в середине журнала,
        # а итог прогона был таким же, как у ролика со всеми сценами.
        _complain(f"нарисованных схем в ролике меньше задуманного: "
                  f"{len(accepted)} из {len(ideas)}",
                  why="остальные не прошли приёмку — причины по каждой выше "
                      "в журнале, строки «[Сцены] … отклонена»",
                  hint="эти моменты остались обычными кадрами; чаще всего "
                       "помогает перезапуск — модель пишет сцену заново",
                  level="заметно")
    return accepted


# ---------- Досмотр УЖЕ НАПИСАННОЙ библиотеки ----------

def library_subjects() -> dict:
    """kind -> {title, subject} по scenes.json.

    Замысел («что сцена обязана изобразить») хранится только там: в самом
    .tsx его нет, а без него зрению не с чем сравнивать картинку. Ключ в
    библиотеке — «канал/kind», а файл сцены общий на все каналы, поэтому
    сводим к kind; если один kind заводили два канала, берём первый
    попавшийся замысел — они по определению про одно и то же.
    """
    out = {}
    lib, err = _read_json_map(LIBRARY)
    if err:
        # Замыслов нет — досмотр будет судить сцены по названию (_claim_of).
        # Это заметно слабее, и говорим об этом прямо, иначе аудит выглядел бы
        # полноценным.
        print(f"[Аудит] ВНИМАНИЕ: {err} — сцены будут проверяться по одному "
              "лишь названию, без замысла")
        return out
    for rec in lib.values():
        if not isinstance(rec, dict):
            continue
        kind = rec.get("kind")
        if not kind or kind in out:
            continue
        out[kind] = {"title": rec.get("title", ""),
                     "subject": (rec.get("brief") or rec.get("quote") or "")}
    return out


def _claim_of(kind: str, subjects: dict) -> tuple[str, str]:
    """Что сцена ОБЕЩАЕТ показать: (подпись, замысел).

    Замысел берём из scenes.json, но у части сцен его нет — их завели до
    того, как библиотека стала записывать brief. Для них судим ПО ИМЕНИ:
    имя сцены и есть заявка на содержание, и вопрос «видно ли на картинке
    thermal gradient cross section» — ровно тот, ради которого всё это
    писалось. Иначе шесть самых старых сцен остались бы непроверяемыми
    навсегда.
    """
    rec = subjects.get(kind) or {}
    subject = (rec.get("subject") or "").strip()
    if not subject:
        subject = (f'the diagram is named "{kind.replace("_", " ")}" — the '
                   "drawing must show exactly that")
    return rec.get("title", ""), subject


def _is_quota(why: str) -> bool:
    """Упёрлись ли в квоту модели — по тем же признакам, что и весь проект.

    Проверка была `"429" in why`, и этого мало: у Gemini суточная квота
    приходит и словами (RESOURCE_EXHAUSTED, «quota exceeded»), а до сюда
    текст доезжает уже склеенным из двух провайдеров. Не опознав квоту,
    досмотр не останавливался, а продолжал рендерить кадр за кадром и
    складывать «не удалось посмотреть» — по виду работа, по сути перевод
    времени. Одно место истины — core._is_rate_limit.
    """
    try:
        import core
        return core._is_rate_limit(str(why))
    except Exception:
        w = str(why).lower()
        return ("429" in w or "quota" in w or "rate limit" in w
                or "resource_exhausted" in w)


def audit(only: list | None = None, limit: int = 0, recheck: bool = False,
          dur: float = 6.0, api_key: str = "", log=print) -> dict:
    """Прогнать УЖЕ ЛЕЖАЩИЕ в библиотеке сцены через ступень зрения.

    Зачем отдельной командой, а не при каждом ролике. Сцены
    переиспользуются («уже в библиотеке — беру готовую»), поэтому брак,
    написанный один раз, кочует из ролика в ролик. Но досматривать все
    шесть десятков на каждом прогоне нельзя: это шесть десятков рендеров и
    шесть десятков запросов к зрению, а суточная квота — двадцать на пару
    «проект + модель». Поэтому досмотр — ручная команда с --limit, а ролик
    просто читает готовые вердикты из scenes_audit.json.

    Ничего не удаляет и не переписывает: только пишет вердикты в данные.
    Отвергнутые сцены попадут на перегенерацию в следующий раз, когда
    очередной ролик их закажет (см. quarantined() в grow).
    """
    subjects = library_subjects()
    known = audit_load(log)
    kinds = [k for k in available_scenes() if k not in BUILTIN_SCENES]
    skipped = len(available_scenes()) - len(kinds)
    if only:
        kinds = [k for k in kinds if k in set(only)]

    todo = []
    for k in kinds:
        was = (known.get(k) or {}).get("verdict")
        if was in (VISION_OK, VISION_BAD) and not recheck:
            continue
        todo.append(k)
    if limit:
        todo = todo[:limit]

    log(f"[Аудит] Сцен в диспетчере: {len(kinds)}; написаны руками "
        f"(не трогаю): {skipped}; к досмотру сейчас: {len(todo)}")
    stat = {VISION_OK: 0, VISION_BAD: 0, VISION_BLIND: 0}
    for i, k in enumerate(todo, 1):
        title, subject = _claim_of(k, subjects)
        verdict, why = check_vision(k, title, subject, dur, api_key, log)
        audit_mark(k, verdict, why, subject, title)
        stat[verdict] = stat.get(verdict, 0) + 1
        mark = {VISION_OK: "годится", VISION_BAD: "НА ПЕРЕГЕНЕРАЦИЮ",
                VISION_BLIND: "не удалось посмотреть"}[verdict]
        log(f"[Аудит] {i}/{len(todo)} {k}: {mark} — {why[:200]}")
        if verdict == VISION_BLIND and _is_quota(why):
            # Квота выбрана: остальные пойдут тем же путём, а каждый из них
            # стоит ещё и рендера кадра. Останавливаемся и говорим об этом
            # вслух, чтобы досмотр продолжили завтра, а не считали, что
            # библиотека проверена.
            log("[Аудит] Зрение упёрлось в суточную квоту — останавливаю "
                "досмотр. Непроверенные сцены остались непроверенными, "
                "запустите --audit ещё раз позже", "warn")
            break
    log(f"[Аудит] Годных {stat[VISION_OK]}, на перегенерацию "
        f"{stat[VISION_BAD]}, непроверенных {stat[VISION_BLIND]}. "
        f"Вердикты в {AUDIT.name}")
    return stat


# ---------- Негативный тест приёмки ----------

STUB = """import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const SelftestStubScene: React.FC<SceneProps> = (p) => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#07090c' }}>
      {/* Placeholder */}
    </AbsoluteFill>
  );
};
"""

BLANK = """import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const SelftestBlankScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const a = interpolate(frame, [0, 30], [0, 1]);
  const b = interpolate(frame, [0, 30], [0, 1]);
  const c = interpolate(frame, [0, 30], [0, 1]);
  const o = p.enter * p.exit * a * b * c;
  return <AbsoluteFill style={{ opacity: o }} />;
};
"""

# Формально безупречная сцена, которая закрашивает кадр. Именно этот брак
# доехал до готового ролика: код компилируется, движение есть, кадр не пустой —
# и всё равно зритель видит семь секунд ровной темноты вместо подложки.
OPAQUE = """import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const SelftestOpaqueScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const draw = interpolate(frame, [0, span * 0.5], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const rise = interpolate(frame, [0, span], [24, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const pulse = interpolate(frame, [0, span * 0.5, span], [0.6, 1, 0.6], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const opacity = p.enter * p.exit;
  return (
    <AbsoluteFill style={{ background: '#07090c', opacity,
                           justifyContent: 'center', alignItems: 'center' }}>
      <svg width="52%" viewBox="0 0 400 320">
        <line x1={40} y1={160 + rise} x2={40 + 320 * draw} y2={160 + rise}
              stroke="#e9f2f6" strokeWidth={3} opacity={pulse} />
      </svg>
      {p.title ? <div style={{ color: '#e9f2f6' }}>{p.title}</div> : null}
    </AbsoluteFill>
  );
};
"""

# Та же сцена, но с прозрачным корнем — её приёмка обязана пропустить,
# иначе новая проверка просто запретила бы писать сцены.
GOOD = OPAQUE.replace("background: '#07090c', opacity,", "opacity,") \
             .replace("SelftestOpaqueScene", "SelftestGoodScene")


def selftest(log=print) -> int:
    """Скормить приёмке заведомый брак и убедиться, что она его ловит.

    Зелёному прогону без этого верить нельзя: прошлый раз ИИ-генерация
    оверлеев «работала» ровно до того дня, когда выяснилось, что она
    пропускает заглушки.
    """
    fails = []

    bad = check_static(STUB)
    log(f"заглушка с Placeholder -> {len(bad)} претензий:")
    for b in bad:
        log(f"    {b}")
    if not bad:
        fails.append("заглушка прошла статическую проверку")

    bad_op = check_static(OPAQUE)
    log(f"\nсцена с непрозрачным корнем -> {len(bad_op)} претензий:")
    for b in bad_op:
        log(f"    {b}")
    if not any("непрозрачн" in b for b in bad_op):
        fails.append("заливка кадра прошла статическую проверку — "
                     "подложку Backdrop снова закроют")

    # Обратная сторона: проверка не должна отвергать нормальную сцену,
    # иначе гейт «работает», просто ничего не пропуская.
    bad_ok = check_static(GOOD)
    log(f"\nта же сцена с прозрачным корнем -> {len(bad_ok)} претензий:")
    for b in bad_ok:
        log(f"    {b}")
    if bad_ok:
        fails.append("правильная сцена отвергнута: " + "; ".join(bad_ok))

    bad2 = check_static(BLANK)
    log(f"\nпустой кадр (три пустых interpolate) -> {len(bad2)} претензий:")
    for b in bad2:
        log(f"    {b}")
    # этот проходит статику намеренно — его должен поймать рендер
    log("\nпроверяю рендером (кадр без содержимого)...")
    try:
        r = accept("selftest_blank", BLANK, "", 4.0, log)
        log(f"рендерная проверка -> {len(r)} претензий:")
        for b in r:
            log(f"    {b}")
        if not r:
            fails.append("ПУСТОЙ КАДР ПРИНЯТ — гейт дырявый")
    except Exception as e:
        log(f"проверка не отработала: {e}")
        fails.append(str(e))

    # Ступень зрения проверяем ОТДЕЛЬНОЙ командой (--audit --only ...), а не
    # здесь: она стоит запроса к модели, а суточная квота Gemini мала —
    # селф-тест должен оставаться бесплатным и запускаемым сколько угодно.
    log("\n" + "=" * 58)
    if fails:
        log("ПРОВАЛ: " + "; ".join(fails))
        return 1
    log("гейт ловит и заглушку, и пустой кадр")
    return 0


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--selftest", action="store_true",
                    help="негативный тест приёмки, без обращений к модели")
    ap.add_argument("--audit", action="store_true",
                    help="досмотреть зрением уже написанные сцены")
    ap.add_argument("--only", default="",
                    help="только эти сцены, через запятую")
    ap.add_argument("--limit", type=int, default=0,
                    help="сколько сцен досмотреть за раз (квота зрения мала)")
    ap.add_argument("--recheck", action="store_true",
                    help="пересмотреть и те, по которым вердикт уже есть")
    ap.add_argument("--list", action="store_true",
                    help="показать накопленные вердикты")
    a = ap.parse_args(argv)

    # Ключи лежат в .env, а читает его app.py — отдельная команда
    # запускается без приложения, и без этой строки зрение молча ушло бы в
    # «недоступно» на пустом ключе, пометив всю библиотеку непроверенной.
    try:
        from dotenv import load_dotenv
        load_dotenv(BASE / ".env")
    except Exception as e:
        # Раньше здесь стояло молчаливое pass — ровно та дыра, от которой
        # соседний комментарий и предостерегает: без ключей зрение отвечает
        # «недоступно» на КАЖДУЮ сцену, и досмотр честно проставляет всей
        # библиотеке «непроверено», выглядя при этом отработавшим.
        print(f"[Аудит] ВНИМАНИЕ: .env не прочитан ({type(e).__name__}: {e}) — "
              "если ключей нет и в окружении, зрение будет недоступно, и все "
              "сцены получат вердикт «не удалось посмотреть»")

    if a.selftest:
        return selftest()
    if a.list:
        data, err = _read_json_map(AUDIT)
        if err:
            # «Пусто» и «испорчено» отвечают на разные вопросы: в первом
            # случае досмотра не было, во втором — он был, а его результат
            # больше не читается, и сцены с вердиктом «на перегенерацию»
            # прямо сейчас снова считаются годными.
            print(f"вердикты не читаются: {err}")
            return 2
        if not data:
            print(f"{AUDIT.name}: пока пусто — запустите --audit")
            return 0
        for k, v in sorted(data.items(),
                           key=lambda kv: kv[1].get("verdict", "")):
            print(f"{v.get('verdict','?'):11} {k:38} {v.get('why','')[:90]}")
        bad = [k for k, v in data.items() if v.get("verdict") == VISION_BAD]
        print(f"\nна перегенерацию помечено: {len(bad)} из {len(data)}")
        return 0
    if a.audit:
        only = [s.strip() for s in a.only.split(",") if s.strip()]
        stat = audit(only=only or None, limit=a.limit, recheck=a.recheck)
        return 0 if stat.get(VISION_BAD, 0) == 0 else 2
    ap.print_help()
    return 0


if __name__ == "__main__":
    sys.exit(main())
