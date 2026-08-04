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
  4. взгляд человека — сцены складываются в папку на просмотр.

Файл намеренно отдельный от gen_remotion_gemini.py: тот при запуске
перезаписывает живой Overlay.tsx.

    python gen_scenes.py --channel abyss --project abyss --count 3
    python gen_scenes.py --selftest      # негативный тест гейта
"""
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE))

REMOTION = BASE / "remotion"
SCENES_DIR = REMOTION / "src" / "scenes"
REGISTRY = REMOTION / "src" / "Scene.tsx"
LIBRARY = BASE / "scenes.json"

# Сколько раз просить модель переписать сцену, если приёмка её отвергла.
ATTEMPTS = 3

PROPOSE_PROMPT = """You are a documentary motion-graphics director.

Below is a narration script for a video on the channel "{channel}"
({tone}, {lang}).

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

Style: documentary schematic — thin lines, restrained palette (off-white
#e9f2f6, amber accent #e0b44c, danger #d0523f), generous empty space. It must
look like a diagram in an archival report, not like a mobile app UI.

WORKING EXAMPLE — copy this structure exactly, change only the drawing.
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

  const draw = interpolate(frame, [0, span * 0.5], [0, 1], {{
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  }});
  const rise = interpolate(frame, [span * 0.2, span * 0.6], [24, 0], {{
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  }});
  const pulse = interpolate(frame, [0, span * 0.5, span], [0.6, 1, 0.6], {{
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  }});

  const opacity = p.enter * p.exit;
  const LEN = 2 * Math.PI * 120;

  return (
    <AbsoluteFill style={{{{ opacity,
                          justifyContent: 'center', alignItems: 'center' }}}}>
      <svg width="52%" viewBox="0 0 400 320">
        <circle cx={{200}} cy={{150}} r={{120}} fill="none" stroke="#e9f2f6"
                strokeWidth={{3}} strokeDasharray={{LEN}}
                strokeDashoffset={{LEN * (1 - draw)}} />
        <line x1={{200}} y1={{150}} x2={{320}} y2={{150}} stroke="#e0b44c"
              strokeWidth={{4}} opacity={{pulse}} />
      </svg>
      {{p.title ? (
        <div style={{{{ marginTop: 28, transform: `translateY(${{rise}}px)`,
                     fontFamily: "'Segoe UI', Arial, sans-serif",
                     fontSize: 34, color: '#e9f2f6' }}}}>{{p.title}}</div>
      ) : null}}
    </AbsoluteFill>
  );
}};

Reply with ONLY the TypeScript code. No markdown fences, no commentary.
"""


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


def check_render(kind: str, title: str, dur: float, log=print) -> list[str]:
    """Ступень 3: настоящий рендер и разбор пикселей.

    Рендерим с bare=1, то есть БЕЗ общей подложки. Иначе проверка стала бы
    бессмысленной: живой фон сам даёт и десятки цветов, и движение между
    кадрами, и заглушка, не нарисовавшая ровно ничего, прошла бы её на
    чужой картинке. С bare в кадре остаётся только то, что нарисовала сама
    сцена, — а именно это мы и хотим измерить.
    """
    from PIL import Image
    import tempfile
    bad = []
    tmp = Path(tempfile.mkdtemp())
    props = {"kind": kind, "title": title, "dur": dur, "exit": 1, "enter": 1,
             "bare": True,
             "items": ["Опора A", "Опора B", "! Опора C"],
             "lat": 55, "lon": 37}
    shots = []
    for fr in (int(dur * 30 * 0.25), int(dur * 30 * 0.8)):
        dest = tmp / f"f{fr}.png"
        r = subprocess.run(
            ["npx", "remotion", "still", "Scene", str(dest), "--frame", str(fr),
             "--image-format", "png", "--props", json.dumps(props, ensure_ascii=False)],
            cwd=REMOTION, capture_output=True, text=True, encoding="utf-8",
            errors="replace", timeout=600, shell=True)
        if r.returncode != 0 or not dest.exists():
            return [f"рендер упал: {r.stderr[-200:]}"]
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
        bad.append(f"почти одноцветный кадр ({max(c for c, _ in stats)} цветов)")
    if min(t for _, t in stats) > 0.985:
        bad.append("кадр залит одним цветом — это заглушка, а не сцена")
    a = list(Image.open(shots[0]).convert("RGB").getdata())[::997]
    b = list(Image.open(shots[1]).convert("RGB").getdata())[::997]
    if a == b:
        bad.append("между началом и концом ничего не изменилось — нет анимации")
    return bad


def register(kind: str, component: str) -> None:
    """Дописать сцену в диспетчер Scene.tsx."""
    src = REGISTRY.read_text(encoding="utf-8")
    imp = f"import {{ {component} }} from './scenes/{kind}';"
    if imp not in src:
        src = src.replace("export type { SceneProps };",
                          f"{imp}\nexport type {{ SceneProps }};")
    case = f"    case '{kind}':\n      return <{component} {{...props}} />;"
    if f"case '{kind}':" not in src:
        src = src.replace("    default:", f"{case}\n    default:")
    REGISTRY.write_text(src, encoding="utf-8")


def unregister(kind: str, component: str) -> None:
    src = REGISTRY.read_text(encoding="utf-8")
    src = src.replace(f"import {{ {component} }} from './scenes/{kind}';\n", "")
    src = src.replace(f"    case '{kind}':\n      return <{component} {{...props}} />;\n", "")
    REGISTRY.write_text(src, encoding="utf-8")


def typecheck() -> tuple[bool, str]:
    r = subprocess.run(["npx", "tsc", "--noEmit"], cwd=REMOTION,
                       capture_output=True, text=True, encoding="utf-8",
                       errors="replace", timeout=600, shell=True)
    return r.returncode == 0, (r.stdout or r.stderr)[-900:]


def accept(kind: str, code: str, title: str, dur: float, log=print) -> list[str]:
    """Прогнать сцену через все ступени. Пустой список = принята."""
    component = _component_name(kind)
    path = SCENES_DIR / f"{kind}.tsx"
    SCENES_DIR.mkdir(parents=True, exist_ok=True)
    path.write_text(code, encoding="utf-8")
    register(kind, component)

    bad = check_static(code)
    if not bad:
        ok, out = typecheck()
        if not ok:
            bad.append(f"не проходит типизацию проекта: {out.strip()[:300]}")
    if not bad:
        bad = check_render(kind, title, dur, log)

    if bad:
        unregister(kind, component)
        path.unlink(missing_ok=True)
    return bad


# ---------- Рендер сцены в клип раскадровки ----------

def render_scene(kind: str, dest: Path, seconds: float, *, title: str = "",
                 items: list | None = None, lat=None, lon=None,
                 width: int = 1920, height: int = 1080, fps: int = 30,
                 log=print) -> Path:
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

    npx = ov._npx()
    if not npx:
        raise RuntimeError("нет npx — Node.js не установлен")
    dest.parent.mkdir(parents=True, exist_ok=True)
    cmd = [npx, "remotion", "render", "Scene", str(dest),
           "--props", json.dumps(props, ensure_ascii=False),
           "--codec", "h264", "--log", "error"]
    r = subprocess.run(cmd, cwd=REMOTION, capture_output=True, text=True,
                       encoding="utf-8", errors="replace", timeout=900,
                       env=ov._node_env())
    if r.returncode != 0 or not dest.exists():
        raise RuntimeError(f"сцена {kind} не отрисовалась: {r.stderr[-300:]}")
    log(f"[Сцена] {kind} -> {dest.name} ({seconds:.1f} c)")
    return dest


def available_scenes() -> list[str]:
    """Какие сцены сейчас есть в диспетчере Scene.tsx."""
    try:
        src = REGISTRY.read_text(encoding="utf-8")
    except OSError:
        return []
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
    prompt = PROPOSE_PROMPT.format(
        channel=channel.get("name") or channel.get("id", ""),
        tone=channel.get("tone", "документальный"),
        lang=channel.get("lang", "английский"),
        count=count,
        script=script_text[:14000])
    out = core.llm_chat([{"role": "user", "content": prompt}],
                        api_key, 0.7, 6000)
    try:
        ideas = json.loads(_strip_fences(out))
    except ValueError:
        log("[Сцены] Модель ответила не JSON — сцен в этом ролике не будет",
            "warn")
        return []
    if not isinstance(ideas, list):
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
    lib = {}
    try:
        lib = json.loads(LIBRARY.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        pass

    accepted = []
    have = set(available_scenes())
    for idea in ideas:
        kind = idea["kind"]
        if kind in have:
            # Такая сцена уже есть — не переписываем, просто используем.
            # Так библиотека канала копится между роликами, а не
            # переделывается заново каждую ночь.
            accepted.append(idea)
            log(f"[Сцены] {kind}: уже в библиотеке — беру готовую")
            continue
        prev_code, prev_why = "", []
        for attempt in range(1, ATTEMPTS + 1):
            try:
                code = write_scene(idea, api_key, log,
                                   rejected=prev_code, why=prev_why)
            except Exception as e:
                log(f"[Сцены] {kind}: модель не ответила ({e})", "warn")
                break
            bad = accept(kind, code, idea.get("title", ""), dur, log)
            prev_code, prev_why = code, bad
            if not bad:
                log(f"[Сцены] {kind}: ПРИНЯТА (попытка {attempt})")
                lib[f"{channel.get('id','')}/{kind}"] = {
                    "kind": kind, "channel": channel.get("id", ""),
                    "title": idea.get("title", ""),
                    "quote": idea.get("quote", "")[:200],
                    "brief": idea.get("brief", "")[:300],
                }
                accepted.append(idea)
                have.add(kind)
                break
            log(f"[Сцены] {kind}: отклонена (попытка {attempt}/{ATTEMPTS}) — "
                + "; ".join(bad)[:200], "warn")
        else:
            log(f"[Сцены] {kind}: не прошла приёмку за {ATTEMPTS} попытки — "
                "этот момент останется обычным кадром", "warn")

    LIBRARY.write_text(json.dumps(lib, ensure_ascii=False, indent=2),
                       encoding="utf-8")
    log(f"[Сцены] Принято {len(accepted)} из {len(ideas)}")
    return accepted


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

    log("\n" + "=" * 58)
    if fails:
        log("ПРОВАЛ: " + "; ".join(fails))
        return 1
    log("гейт ловит и заглушку, и пустой кадр")
    return 0
