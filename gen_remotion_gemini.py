# -*- coding: utf-8 -*-
"""Генерация кода оверлеев Remotion через Gemini — под тему/жанр конкретного
видео, чтобы разные проекты визуально не были близнецами. Проверяет через
tsc перед тем, как код попадёт в боевой remotion/src/Overlay.tsx — если
Gemini не смог написать рабочий код за несколько попыток, вызывающий обязан
остаться на текущей (рабочей) версии."""
import os
import re
import json
import shutil
import subprocess
import tempfile
from datetime import datetime, timedelta
from pathlib import Path

import core
import overlays as _ov

BASE = Path(__file__).resolve().parent
REMOTION_DIR = BASE / "remotion"
OVERLAY_PATH = REMOTION_DIR / "src" / "Overlay.tsx"

# Ключи THEME-объекта в Overlay.tsx (см. константу THEME там же). Только
# ПАЛИТРА — Gemini подбирает hex-цвета под тему видео, не пишет код заново.
# Полная генерация кода (gen_overlay_code_verified/apply_theme ниже)
# оказалась ненадёжной: логика компонентов то ломалась, то игнорировалась,
# и даже с реальным дым-рендером и фидбэком не всегда чинилась за разумное
# число попыток. Палитра сломать логику не может в принципе — это просто
# строки с цветом, поэтому это основной путь.
THEME_KEYS = ("accent", "accentLight", "bannerFrom", "bannerTo",
             "bannerText", "kickerFrom", "kickerTo")


def gen_theme_palette(theme_desc: str, agnes_key: str, log=print,
                      max_attempts: int = 3) -> dict | None:
    """Просит Agnes придумать ТОЛЬКО палитру (JSON из 7 hex-цветов) под тему
    видео. Намеренно Agnes, а не Gemini через core.llm_chat: Gemini уже
    занят сценарием/расстановкой оверлеев и первым упирается в 429 — эта
    задача не зависит от той же квоты. None, если за max_attempts не
    получили валидный JSON с валидными hex-значениями по всем ключам —
    тогда вызывающий остаётся на текущей палитре (это не крах, просто
    конкретное видео не подкрасилось)."""
    prompt = (
        "Invent a distinctive color palette for on-screen documentary overlay "
        "graphics (lower-thirds, banners, title cards, progress bars) for "
        f"this video:\n{theme_desc}\n\n"
        "Reply with ONLY a JSON object, no markdown fences, no explanation, "
        "with EXACTLY these 7 keys, each value a 6-digit hex color string "
        'like "#1a2b3c":\n'
        '  "accent": main glow/accent color — lines, dots, progress bars, connectors\n'
        '  "accentLight": a lighter/secondary tone paired with accent in gradients\n'
        '  "bannerFrom", "bannerTo": a BRIGHT/PALE gradient (top to bottom) for '
        "a banner bar that has DARK text on top — these two must stay light, "
        "this is the one deliberately bright element in an otherwise dark theme\n"
        '  "bannerText": a dark color readable on that light banner\n'
        '  "kickerFrom", "kickerTo": a dark gradient for a small caption chip '
        "background (accentLight text sits on top of it)\n"
        "Make it distinctly different from a default warm amber/gold theme — "
        "choose hues that specifically fit the topic above, not a generic safe default.")
    hexre = re.compile(r"^#[0-9a-fA-F]{6}$")
    for attempt in range(1, max_attempts + 1):
        try:
            out = core.agnes_chat(
                [{"role": "system", "content":
                  "You are a colour designer for broadcast documentary graphics."},
                 {"role": "user", "content": prompt}],
                # 400 не хватало НИКОГДА. Модель рассуждающая: весь лимит
                # уходил на «размышления», и наружу приходил пустой ответ —
                # три попытки подряд, каждый ролик, месяцами. В журнале это
                # выглядело как «Не удалось получить палитру — остаюсь на
                # текущей», а на экране как плашки в цветах ПРОШЛОГО ролика
                # (записано в отчёте о качестве 2026-08-05 01:03). Сам ответ
                # крошечный — восемь hex-цветов, — но запас нужен на
                # рассуждения, иначе до ответа дело не доходит.
                agnes_key, 0.9, 2000)
            m = re.search(r"\{.*\}", out, re.S)
            if not m:
                log(f"[Remotion/Тема] попытка {attempt}/{max_attempts}: "
                   f"нет JSON в ответе: {out[:150]!r}")
                continue
            data = json.loads(m.group(0))
            if all(k in data and hexre.match(str(data[k])) for k in THEME_KEYS):
                return {k: str(data[k]) for k in THEME_KEYS}
            log(f"[Remotion/Тема] попытка {attempt}/{max_attempts}: "
               f"не все ключи — валидные hex-цвета: {data}")
        except Exception as e:
            log(f"[Remotion/Тема] попытка {attempt}/{max_attempts} не сработала: {e}")
    return None


def apply_palette(palette: dict, log=print) -> bool:
    """Подставляет цвета из palette в THEME-объект боевого Overlay.tsx —
    только значения строк-цветов, логика компонентов не трогается вообще,
    поэтому сломать анимацию/типы этим невозможно. True, если хоть один
    цвет реально заменился."""
    code = OVERLAY_PATH.read_text(encoding="utf-8")
    new_code = code
    changed = 0
    for key in THEME_KEYS:
        hexval = palette.get(key)
        if not hexval:
            continue
        pattern = rf"({key}:\s*)'#[0-9a-fA-F]{{6}}'"
        new_code, n = re.subn(pattern, rf"\1'{hexval}'", new_code)
        if n:
            changed += 1
        else:
            log(f"[Remotion/Тема] ключ {key} не найден в THEME — пропускаю")
    accent_hex = (palette.get("accent") or "").lstrip("#")
    if len(accent_hex) == 6:
        r, g, b = (int(accent_hex[i:i + 2], 16) for i in (0, 2, 4))
        new_code = re.sub(r"(accentRgb:\s*)'[\d, ]+'", rf"\1'{r},{g},{b}'", new_code)
    if not changed:
        log("[Remotion/Тема] ни один цвет не заменился — оставляю как было")
        return False
    OVERLAY_PATH.write_text(new_code, encoding="utf-8")
    log(f"[Remotion/Тема] Применена новая палитра ({changed}/{len(THEME_KEYS)} цветов): "
        + ", ".join(f"{k}={palette[k]}" for k in THEME_KEYS if k in palette))
    return True


def apply_theme_palette(theme_desc: str, agnes_key: str, log=print) -> bool:
    """Полный путь: придумать палитру (через Agnes) + применить. Единственный
    вызов, который нужен снаружи для темизации по цвету (безопасный, основной)."""
    palette = gen_theme_palette(theme_desc, agnes_key, log)
    if palette is None:
        log("[Remotion/Тема] Не удалось получить палитру — остаюсь на текущей")
        import quality
        quality.degraded(
            "Оверлеи", "плашки в цветах прошлого ролика, а не под эту тему",
            why="ИИ не отдал палитру за отведённые попытки",
            hint="проверь ключ Agnes в настройках и остаток квоты",
            level="заметно")
        return False
    return apply_palette(palette, log)


# ---------------------------------------------------------------------------
# Библиотека вариантов: ИИ пишет ОДИН новый компонент в variants/, ядро
# (Overlay.tsx) при этом не трогается вообще. Провал генерации не может
# сломать рендер — в худшем случае в библиотеке просто не прибавилось.
# ---------------------------------------------------------------------------
# Реестр и метаданные библиотеки живут в overlays.py — там же, где рендер,
# который обязан уметь чинить устаревший реестр сам. Здесь только псевдонимы,
# чтобы не держать вторую копию той же логики (разъедется — сборка упадёт).
VARIANTS_DIR = _ov.VARIANTS_DIR
VARIANTS_META = _ov.VARIANTS_META
load_variants_meta = _ov.load_variants_meta
save_variants_meta = _ov.save_variants_meta
rebuild_registry = _ov.rebuild_registry

# Журнал систематических провалов. Одна неудачная попытка пополнить
# библиотеку — это 8 генераций плюс столько же починок, ~16 платных вызовов
# ИИ. Тип, который не получается в принципе (движок не умеет, контракт
# неисполним), пополнялка выбирает СНОВА на каждом ролике: она берёт тип с
# наименьшим покрытием, а у провального оно и не растёт — и так бесконечно.
# Поэтому провалы запоминаем и выдерживаем паузу, удваивая её с каждым
# новым провалом. Отдельный файл, а не variants.json: там каждая запись —
# это вариант, и посторонний ключ сбил бы и сборку реестра, и проверку его
# устаревания.
FAIL_LOG = BASE / "variant_failures.json"
FAIL_FREE_TRIES = 2      # столько полных провалов прощаем без паузы
FAIL_MAX_DAYS = 30       # потолок паузы: тип не должен пропасть навсегда


def _load_fails() -> dict:
    try:
        return json.loads(FAIL_LOG.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def _save_fails(data: dict) -> None:
    # Журнал — вспомогательный: если его не удалось записать, это не повод
    # ронять генерацию, максимум мы лишний раз попробуем провальный тип.
    try:
        FAIL_LOG.write_text(json.dumps(data, ensure_ascii=False, indent=2),
                            encoding="utf-8")
    except OSError:
        pass


def _fail_cooldown(kind: str, engine: str, log=print) -> bool:
    """True = этот тип на этом движке проваливается систематически, пауза
    ещё не вышла, и пробовать его сейчас — впустую сжечь ~16 вызовов ИИ."""
    rec = _load_fails().get(f"{engine}/{kind}")
    if not rec:
        return False
    fails = int(rec.get("fails", 0))
    if fails < FAIL_FREE_TRIES:
        return False
    try:
        last = datetime.fromisoformat(str(rec.get("last", "")))
    except ValueError:
        return False      # битая запись — не повод блокировать тип
    days = min(2 ** (fails - FAIL_FREE_TRIES), FAIL_MAX_DAYS)
    left = last + timedelta(days=days) - datetime.now()
    if left.total_seconds() <= 0:
        return False
    log(f"[Варианты] «{kind}» ({engine}) провалился {fails} раз(а) подряд — "
        f"пропускаю ещё ~{left.days + 1} дн., чтобы не жечь вызовы ИИ на "
        f"каждом ролике. Прошлая причина: {str(rec.get('problem', ''))[:160]}")
    return True


def _note_fail(kind: str, engine: str, problem: str = "") -> None:
    data = _load_fails()
    key = f"{engine}/{kind}"
    rec = dict(data.get(key) or {})
    rec["fails"] = int(rec.get("fails", 0)) + 1
    rec["last"] = datetime.now().isoformat(timespec="seconds")
    rec["problem"] = (problem or "")[:300]
    data[key] = rec
    _save_fails(data)


def _note_success(kind: str, engine: str) -> None:
    """Получилось — счётчик обнуляем: значит тип рабочий, а мешало что-то
    временное (лимит API, неудачная тема), и штрафовать его больше не за что."""
    data = _load_fails()
    if data.pop(f"{engine}/{kind}", None) is not None:
        _save_fails(data)


# Компонент варианта обязан экспортироваться ровно так — по этой строке
# реестр находит его имя, а проверка контракта убеждается, что он вообще есть.
_EXPORT_RE = re.compile(
    r"export\s+const\s+([A-Z][A-Za-z0-9_]*)\s*:\s*React\.FC<VariantProps>")


REQUIRED_TYPES = ("lower3", "counter", "bars", "banner", "callout", "popup",
                  "compare", "titlecard", "collage")


def _contract_check(code: str) -> str:
    """Дешёвая проверка ДО рендера: однажды сгенерированный код скомпилировался
    (tsc чист), но целиком игнорировал `type` — рисовал одну и ту же общую
    карточку для всех типов, ни разу не сославшись на 'titlecard'/'banner'/
    etc. как на строку. tsc такое не ловит (это не синтаксическая ошибка),
    а полноценный рендер-тест — дорогой; сначала быстро смотрим на сам код."""
    missing = [t for t in REQUIRED_TYPES
              if not re.search(rf"""['"]{t}['"]""", code)]
    if missing:
        return ("код не упоминает эти типы оверлея как строки вообще (похоже, "
                f"`type` игнорируется, один общий вид на всё): {', '.join(missing)}")
    if not re.search(r"split\s*\(\s*['\"]::['\"]", code):
        return ("нет разбора 'HEADLINE::subtitle' / 'left::right' по '::' — "
                "titlecard/compare покажут сырой текст с двоеточиями вместо "
                "заголовка+подзаголовка")
    return ""


# Образцы для дым-теста ядра. Только типы, которым для рендера хватает
# СТРОКИ: popup/collage/gallery требуют настоящих картинок на диске (см.
# _render_remotion в overlays.py), и класть их сюда значило бы тащить
# генерацию файлов в проверку ядра — их вид проверяется в
# _variant_smoke_test. Типы намеренно РАЗНЫЕ по силуэту: _smoke_test
# сравнивает соседние кадры и ловит «один общий вид на всё».
SMOKE_ITEMS = (
    {"type": "lower3", "content": "12 марта 1974", "pos": "bottom", "dur": 3},
    {"type": "counter", "content": "$200,000", "pos": "center", "dur": 3},
    {"type": "bars", "content": "Found:30,Missing:70", "pos": "center", "dur": 3},
    {"type": "banner", "content": "Проверочная строка баннера", "pos": "top", "dur": 3},
    {"type": "compare", "content": "Слева::Справа", "pos": "center", "dur": 3},
    {"type": "titlecard", "content": "ЗАГОЛОВОК::подзаголовок", "pos": "center", "dur": 3},
)


def _smoke_test(log=print) -> str:
    """Реально рендерит по кадру для нескольких типов на уже подставленном
    кандидате Overlay.tsx — проверяет и что кадр не пустой, и что разные
    типы дают РАЗНЫЙ результат (иначе это тот же общий фолбэк, который
    _contract_check пропустил бы, если типы упомянуты, но не влияют на вид).
    Пустая строка = всё ок, иначе описание первой проблемы."""
    from PIL import Image, ImageChops
    prev_img, prev_type = None, None
    for item in SMOKE_ITEMS:
        with tempfile.TemporaryDirectory(dir=BASE) as tmp:
            # кадры в ПОДПАПКУ: props-файл _render_remotion кладёт рядом с
            # папкой вывода (dest_dir.parent), и с dest=самим tmp он оседал
            # в корне репозитория — там уже десятки осиротевших
            # tmp*_props.json. Внутри tmp он удаляется вместе с ним.
            dest = Path(tmp) / "frames"
            dest.mkdir()
            try:
                _ov._render_remotion(item, 1280, 720, 30, dest, dest, log)
            except Exception as e:
                return f"рендер типа «{item['type']}» упал: {e}"
            frames = sorted(dest.glob("*.png"))
            if not frames:
                return f"рендер типа «{item['type']}»: нет кадров на выходе"
            img = Image.open(frames[len(frames) // 2]).convert("RGBA")
            if img.getchannel("A").getextrema()[1] == 0:
                return f"кадр типа «{item['type']}» полностью прозрачный (пустой)"
            if prev_img is not None:
                diff = ImageChops.difference(img.convert("RGB"),
                                             prev_img.convert("RGB"))
                if diff.getbbox() is None:
                    return (f"кадры «{prev_type}» и «{item['type']}» пиксель-в-"
                           "пиксель одинаковые — вид не зависит от типа")
            prev_img, prev_type = img, item["type"]
    return ""

# Жёсткие факты о реальном API Remotion. Вынесены отдельно, потому что
# нужны ОБОИМ контрактам (весь файл и один вариант) — дублировать их
# нельзя: разъедутся, и половина генераций снова начнёт выдумывать
# несуществующие Easing.cubicBezier / {clamp: true}.
API_RULES = """- If you use `spring()`, its REAL signature (do not invent other fields — no `duration`, no `offset`, these do not exist and will fail to compile) is exactly:
  ```
  function spring(opts: {
    frame: number; fps: number;
    config?: Partial<{damping: number; mass: number; stiffness: number; overshootClamping: boolean}>;
    from?: number; to?: number; durationInFrames?: number;
    durationRestThreshold?: number; delay?: number; reverse?: boolean;
  }): number
  ```
  Prefer plain `interpolate()` with `Easing.out(Easing.back(...))`/`Easing.elastic(...)` over `spring()` if unsure — it is simpler and cannot hallucinate a bad config shape.
- `interpolate()`'s REAL signature — its 4th argument accepts ONLY these keys, nothing else:
  ```
  function interpolate(input: number, inputRange: number[], outputRange: number[], options?: {
    easing?: (input: number) => number;
    extrapolateLeft?: 'extend' | 'clamp' | 'identity' | 'wrap';
    extrapolateRight?: 'extend' | 'clamp' | 'identity' | 'wrap';
  }): number
  ```
  There is NO `clamp` key, no `duration`, no `delay`, no `from`/`to` — `clamp` is a VALUE of `extrapolateLeft`/`extrapolateRight`, never a key of its own. Writing `{clamp: true}` is a compile error.
- `Easing` has EXACTLY these members and NO others — do not use a name from CSS, framer-motion, GSAP or anywhere else:
  ```
  Easing.step0(n) Easing.step1(n) Easing.linear(t) Easing.ease(t) Easing.quad(t)
  Easing.cubic(t) Easing.poly(n) Easing.sin(t) Easing.circle(t) Easing.exp(t)
  Easing.elastic(bounciness?) Easing.back(s?) Easing.bounce(t)
  Easing.bezier(x1, y1, x2, y2)      // cubic-bezier lives HERE, under this name
  Easing.spring({damping?, mass?, stiffness?, overshootClamping?, allowTail?, durationRestThreshold?})
  Easing.in(fn) Easing.out(fn) Easing.inOut(fn)
  ```
  The `(t)` above is only the shape of the curve — you NEVER write that `t` yourself.
  A curve is passed BY NAME, uncalled: `easing: Easing.cubic`, `easing: Easing.out(Easing.cubic)`.
  The ONLY ones you write parentheses on are the factories that take a tuning
  number or another curve: `Easing.poly(3)`, `Easing.elastic(1.2)`, `Easing.back(1.5)`,
  `Easing.bezier(.2,0,.1,1)`, `Easing.in/out/inOut(<a curve>)`.
  RIGHT: `{easing: Easing.out(Easing.cubic), extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}`
  WRONG: `Easing.out(Easing.cubic(t))` and `Easing.out(Easing.cubic(1))` — you passed a
  number where a curve was wanted. WRONG: `Easing.quad(t => t*t)` — you passed a curve
  where a tuning number was wanted. Both are compile errors we see constantly.
  In particular `Easing.cubicBezier` does NOT exist (that is the CSS name) — the Remotion name is `Easing.bezier`. There is also no `Easing.easeIn`/`easeOut`/`easeInOut` — use `Easing.in(Easing.ease)` / `Easing.out(Easing.cubic)` etc."""


CONTRACT = """Write a complete TSX file for a Remotion overlay component.

STRICT REQUIREMENTS (this is a fixed contract, do not deviate):
- `export type OverlayProps = { type: string; content: string; pos: string; dur: number; fps?: number; width?: number; height?: number; img?: string; items?: { label: string; img: string }[]; };`
- `export const Overlay: React.FC<OverlayProps>` — switches on `p.type`, rendering one of these cases (default: render nothing, `<AbsoluteFill />`):
  - "lower3": p.content is a short text label — could be a date, a name, a place, or ANY short phrase. Classic broadcast lower-third. Do NOT prepend an invented category kicker word above it (no "EVIDENCE", no "LOCATION", no "FACT" etc.) — you cannot know what the label represents, inventing a category is often wrong. A purely decorative kicker (small dot, thin accent line, no text) is fine.
  - "counter": p.content is like "$200,000" or "30,000" — animate counting up to that number, big and bold, center screen. Extract the leading non-digit prefix and trailing non-digit suffix with a regex like `/([^\\d]*)([\\d][\\d,.\\s]*)(.*)/`, animate-count only the numeric part, re-attach the ORIGINAL prefix/suffix exactly as given.
  - "bars": (alias "infographic") p.content is comma-separated "label:value" pairs, e.g. "Found:30,Missing:70" — animated bar chart.
  - "timeline": p.content is comma-separated "year:label" pairs — animated horizontal timeline with dots/markers.
  - "callout": p.content is short text; p.pos may be "point:X,Y" (percent of frame width/height) — draw a pointer line/circle from that point to a text box. Default point if not "point:" format: 70,55. Do NOT prepend an invented category kicker like "KEY DETAIL".
  - "popup": show `<Img src={p.img} />` — a picture cutout with physical, tactile motion (float/sway/drop-shadow). content unused here.
  - "compare": p.content is "left text::right text" (split on DOUBLE COLON "::", never on "|") — two boxes side by side with a connector between them, for contrasting two facts/claims.
  - "banner": p.content is a short punchy sentence — a wide bright banner bar spanning most of the frame width, anchored to the top, bold dark text on a bright/light background (this is the ONE type that should use a light/bright background rather than a dark plate — everything else stays dark/translucent).
  - "titlecard": p.content is "HEADLINE::subtitle" (subtitle may be empty) — a big kinetic-type full-screen headline for a major hook/topic shift, words animate in with impact (not just a fade), subtitle smaller beneath.
  - "collage": p.items is an array of up to 3 {label, img} — archival-photo-style polaroid/card grid, each with its label caption, staggered entrance.
- Only import from 'react' and 'remotion' (AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig, Easing, random — whichever you need). NO other packages, NO external fonts/URLs/network calls, NO <video>/<audio> tags — this is a transparent alpha-channel PNG-sequence overlay composited on top of existing footage via ffmpeg, nothing else.
__API_RULES__
- CSS-in-JS typing: this is TSX, not plain CSS — properties like `textAlign`, `position`, `flexDirection`, `textTransform`, `whiteSpace` etc. need a value TypeScript accepts as that literal union, not a bare `string`. Either inline the style object literally in JSX (`style={{ textAlign: 'center' }}`) so TS infers the literal type, or if building a style object as a separate `const`, type it as `React.CSSProperties` explicitly — never declare it as `{ [key: string]: string }` or let it widen to `string`.
- Fonts: use only "Segoe UI Black", "Segoe UI", "Arial", sans-serif (system fonts only).
- Every element must fully animate in using useCurrentFrame()/useVideoConfig() (fps = p.fps ?? 30) and fade/scale out during the last ~0.3s of `p.dur` seconds — never appear as a static, unanimated element.
- CRITICAL — a common mistake to avoid: animation timing MUST be driven by the actual `p.dur` prop (seconds), NOT a hardcoded constant. `p.dur` can be as short as 2-3 seconds or as long as 15 — the fade-out must trigger near the END of THAT specific overlay's `p.dur`, every time, for every type. Use exactly this pattern (copy it verbatim as a shared hook, called with `p.dur`):
  ```
  const useExit = (dur: number) => {
    const frame = useCurrentFrame();
    const {fps} = useVideoConfig();
    const t = frame / fps;
    return interpolate(t, [dur - 0.3, dur], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  };
  ```
  Multiply this `exit` value into every layer's opacity (and optionally scale) in every component. Never invent your own fixed-duration timer.
- Positions: honor `p.pos` where relevant: "top-right","top-left","top","bottom","center","point:X,Y".
- Visual quality bar: premium broadcast/Netflix-documentary title-card quality — layered depth (background glow + plate + accent line/border + icon/kicker + main text, at least 3 visual layers per element), gradients, soft shadows, smooth spring physics (not linear/robotic motion), tasteful glow accents. Must NOT look flat, cheap, or like a plain HTML form.

VISUAL THEME FOR THIS PROJECT — invent a palette and mood SPECIFIC to this,
not a generic template; a different topic should look and feel different:
__VISUAL_THEME__

Output ONLY the raw .tsx file contents. No markdown code fences, no explanation before or after, no comments describing what you changed — just the file."""


# Формат p.content для каждого типа — тот же, что в CONTRACT, но по одному
# типу за раз: варианту незачем знать про остальные девять.
TYPE_BRIEF = {
    "lower3": "p.content is a short text label — a date, a name, a place, or ANY short phrase. A classic broadcast lower-third. Do NOT prepend an invented category kicker word (no \"EVIDENCE\", no \"LOCATION\") — you cannot know what the label means. A purely decorative kicker (dot, thin line, no text) is fine.",
    "counter": "p.content is like \"$200,000\" or \"30,000\" — animate counting up to that number, big and bold. Extract the leading non-digit prefix and trailing non-digit suffix with a regex like /([^\\d]*)([\\d][\\d,.\\s]*)(.*)/, animate-count only the numeric part, re-attach the ORIGINAL prefix/suffix exactly as given.",
    "bars": "p.content is comma-separated \"label:value\" pairs, e.g. \"Found:30,Missing:70\" — an animated bar chart.",
    "timeline": "p.content is comma-separated \"year:label\" pairs — an animated horizontal timeline with dots/markers.",
    "callout": "p.content is short text; p.pos may be \"point:X,Y\" (percent of frame width/height) — draw a pointer line/circle from that point to a text box. Default point if p.pos is not in \"point:\" format: 70,55. Do NOT prepend an invented category kicker.",
    "popup": "show `<Img src={p.img} />` — a picture cutout with physical, tactile motion (float/sway/drop-shadow). p.content is unused for this type.",
    "compare": "p.content is \"left text::right text\" (split on DOUBLE COLON \"::\", never on \"|\") — two sides contrasted, with some connector/divider between them.",
    "banner": "p.content is a short punchy sentence — a wide banner spanning most of the frame width. This is the ONE type that may use a light/bright background with dark text.",
    "titlecard": "p.content is \"HEADLINE::subtitle\" (subtitle may be empty) — a big kinetic-type full-screen headline for a major hook/topic shift; words animate in with impact (not just a fade), subtitle smaller beneath.",
    "collage": "p.items is an array of up to 3 {label, img} — an archival-photo-style polaroid/card grid, each with its label caption, staggered entrance.",
    "kinetic": "p.content is a short punchy sentence — KINETIC TYPOGRAPHY: split it on whitespace and bring the words in ONE BY ONE with a per-word time offset derived from useCurrentFrame(). The staggered rhythm IS the effect; do not fade the whole block in at once.",
    "highlight": "p.content is a short label; p.pos may be \"point:X,Y\" (percent of frame width/height, default 62,45) — an ANNOTATION drawn onto the footage: a ring/arrow that DRAWS ITSELF along its path (animate strokeDashoffset on an SVG shape), then a leader line to a small caption. It marks a spot in the picture, so leave the middle see-through.",
    "quote": "p.content is \"quote text::attribution\" (attribution may be empty) — a PULL QUOTE: oversized typographic quotation mark, large serif italic text, a rule that draws out under it, attribution in small caps.",
    "stamp": "p.content is \"MAIN::sub\" (sub may be empty), e.g. \"ANTARCTICA::MARCH 1911\" — a corner LOCATION/DATE STAMP that punches down like an ink impression: a fast scale overshoot settling to rest, slight rotation, boxed rule. Small, cornered, never centred.",
    "redact": "p.content is lines separated by \"::\"; a line starting with \"*\" must get BLACKED OUT — a REDACTED DOCUMENT: monospaced lines on paper, and the marked lines are covered by black bars that sweep across them one after another (animate scaleX from a left origin, staggered).",
    "marker": "p.content is a short sentence — a HIGHLIGHTER SWEEP: split on whitespace and draw a coloured bar BEHIND each word in turn (animate its width from 0), as if running a marker pen along the line. The words are all present from the start and do not move; only the bar travels. Text on the bar must stay readable — a light word on a light bar is the failure mode here, so change the word's colour as its own bar passes under it.",
    "gallery": "p.items is an array of up to 4 {label, img} — framed photo cards RECEDING INTO DEPTH and drifting past the camera. Use real CSS perspective on the container and translateZ on the cards; plain scale() reads as \"pictures of different sizes\", not as space. Fade each card in on approach and out as it passes, or it pops into existence at the lens.",
}

VARIANT_CONTRACT = """Write ONE self-contained Remotion overlay component in TSX.

This is a NEW VISUAL VARIANT of the "__TYPE__" overlay for a documentary video.
It will live alongside other variants of the same type and be picked at random
per project, so it MUST look clearly different from a generic default — a
different silhouette, layout, entrance technique and composition, not the same
plate in another colour.

STRICT REQUIREMENTS (fixed contract, do not deviate):
- The file must start with exactly these imports (add remotion names you use):
  ```
  import React from 'react';
  import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
  import type { VariantProps } from '../types';
  ```
  (add `Img` to the remotion import if you render an image, `spring`/`random` if you use them)
- Export EXACTLY ONE component, with EXACTLY this signature and name:
  `export const __COMPONENT__: React.FC<VariantProps> = (p) => { ... }`
  No default export. No other exported symbols. Helper consts/functions are fine but must NOT be exported.
- `VariantProps` gives you: `p.type, p.content, p.pos, p.dur, p.img, p.items, p.enter, p.exit` (and optional p.fps/p.width/p.height).
- CRITICAL — `p.enter` and `p.exit` are ALREADY CALCULATED for you by the core:
  `p.enter` goes 0→1 over the first 0.4s, `p.exit` goes 1→0 over the last 0.3s of `p.dur`.
  Multiply BOTH into the opacity of every layer you draw. Do NOT write your own
  fade-in/fade-out timer and do NOT re-derive them from p.dur — the whole point
  is that every overlay in the video appears and leaves in sync.
- You MAY use useCurrentFrame()/useVideoConfig() for your own INTERNAL motion
  (slides, counts, staggers, draws) — that is encouraged. fps = p.fps ?? 30.
- Content for this type: __TYPE_BRIEF__
- Root element should be `<AbsoluteFill>` and MUST keep a transparent background.
  NEVER put a backgroundColor on the root `<AbsoluteFill>` — this is composited
  over real footage as an alpha PNG sequence, so a full-frame fill would paint
  over the entire video. Backgrounds belong on inner, sized elements only, and
  should leave most of the frame see-through.
- Write the COMPLETE, FINISHED design. No placeholder comments, no TODO, no
  empty container "to be filled in" — every element must actually be drawn.
  A file that compiles but renders an empty box is a failure, not a draft.
- Do not import anything you do not use — unused imports fail the build
  (noUnusedLocals). If you import `interpolate`/`Easing`/`spring`, actually
  animate with them.
- EVERY `interpolate()` MUST carry `extrapolateLeft: 'clamp'` and
  `extrapolateRight: 'clamp'`. Outside its input range interpolate() keeps
  extrapolating: a scale written as [0,30] -> [0.8,1] grows past 1 forever,
  the overlay swallows the whole screen and never leaves. This is the single
  most common way a variant looks fine in review and is broken in the video.
- Only import from 'react' and 'remotion' and '../types'. NO other packages, NO
  external fonts/URLs/network calls, NO <video>/<audio> tags.
- Deterministic only: NO Math.random(), NO Date.now(). Frames render in
  parallel and out of order — anything time-dependent must derive from
  useCurrentFrame(). If you want per-content variation, hash `p.content` with a
  small local helper instead.
- Fonts: these ARE installed on the render machine (verified). Anything else
  silently falls back to a default and wrecks the layout, so use only these —
  but DO use them: typography is one of the strongest ways to make this
  variant unmistakably different from the others.
    heavy display / impact : "Impact", "Arial Black", "Segoe UI Black",
                             "Franklin Gothic Medium"
    condensed / technical  : "Bahnschrift"
    transitional serif     : "Cambria", "Constantia", "Georgia",
                             "Times New Roman"
    old-style / bookish    : "Garamond", "Palatino Linotype",
                             "Bookman Old Style", "Sitka Text"
    geometric sans         : "Century Gothic"
    humanist sans          : "Corbel", "Candara", "Trebuchet MS", "Verdana",
                             "Tahoma", "Segoe UI"
    monospace / typewriter : "Consolas", "Courier New", "Lucida Console"
    hand / calligraphic    : "Gabriola", "Segoe Script", "Segoe Print",
                             "Ink Free"
  Pick a family that genuinely fits the theme below — a vintage/archival brief
  wants Garamond, Palatino or Gabriola, an investigative one wants Courier New
  or Bahnschrift, not a default bold sans every time.
- CSS-in-JS typing: this is TSX. Properties like `textAlign`, `position`,
  `flexDirection`, `textTransform`, `whiteSpace` need values TypeScript accepts
  as their literal union. Inline style objects directly in JSX so TS infers
  literal types, or type a separate const as `React.CSSProperties`.
__API_RULES__
- Visual quality bar: premium broadcast/Netflix-documentary quality — layered
  depth (at least 3 visual layers: e.g. soft glow/shadow + plate/shape + accent
  line/border + text), tasteful motion with easing, never flat or default-HTML
  looking.
- REAL TEXTURE is available and encouraged — you are not limited to flat fills.
  Inline SVG filters render fully in this engine and are deterministic, so use
  them for paper grain, fibre, ink bleed, rough torn edges, soft smoke:
  ```
  <svg width="0" height="0"><defs>
    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4"
        stitchTiles="stitch" result="noise"/>
      <feColorMatrix in="noise" type="saturate" values="0" result="mono"/>
      <feComponentTransfer in="mono" result="grain">
        <feFuncA type="linear" slope="0.08"/></feComponentTransfer>
      <feComposite in="grain" in2="SourceGraphic" operator="in" result="m"/>
      <feBlend in="SourceGraphic" in2="m" mode="multiply"/>
    </filter>
    <filter id="rough"><feTurbulence type="fractalNoise" baseFrequency="0.02"
      numOctaves="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n"
      scale="12"/></filter>
  </defs></svg>
  ```
  CRITICAL — `feTurbulence` GENERATES noise, it does not take the element as
  input. A filter that ends on the turbulence chain REPLACES your element
  with noise and the element disappears. You MUST bring `SourceGraphic` back
  in at the end (`feComposite`/`feBlend`, as above). This exact mistake made
  a cream panel vanish, leaving dark text on a dark box — unreadable.
  Then `filter: 'url(#rough)'` on an element gives genuinely irregular, torn
  or deckled edges; a `#grain` layer at low opacity over a panel gives real
  paper tooth instead of a flat rectangle. `baseFrequency` MUST be a fixed
  literal — never derived from the frame number, or the texture would boil.
- Also available for depth: `backdropFilter: 'blur(Npx)'` (frosted glass over
  the footage), `mixBlendMode` ('multiply' for ink on paper, 'screen' for
  light), `boxShadow` with `inset`, `clipPath: 'polygon(...)'` for non-
  rectangular silhouettes (torn tags, angled ribbons, notched cards) — a fixed
  polygon is deterministic and safe.
- Pick your own colours that fit the theme below and hardcode them in this file
  (this variant carries its own look — it does not read a shared palette).

__ALREADY_HAVE__
VISUAL THEME FOR THIS VARIANT — make it specific and memorable, not a generic
template:
__VISUAL_THEME__

Output ONLY the raw .tsx file contents. No markdown code fences, no explanation."""


def _already_have(kind: str) -> str:
    """Что для этого типа уже лежит в библиотеке — чтобы ИИ не выдал пятую
    вариацию того же самого. Без этого блока модель не знает о прошлых
    роликах вообще и «разнообразие» вырождается в похожие плашки."""
    made = [rec for rec in load_variants_meta().values()
            if rec.get("type") == kind and rec.get("enabled", True)]
    if not made:
        return ""
    lines = "\n".join(f"  - {rec.get('theme', '')[:180]}" for rec in made)
    return (f"""ALREADY IN THE LIBRARY for "{kind}" — your new variant must be
STRUCTURALLY different from all of these, not a re-colour or a re-arrangement.
Change the silhouette, the anchor position on screen, the entrance technique
and the composition:
{lines}

""")


HF_CONTRACT = """Write ONE self-contained HyperFrames composition as a single
HTML file. HyperFrames renders HTML+GSAP to frames in a headless browser.

This is a NEW VISUAL VARIANT of the "__TYPE__" overlay for a documentary video.
It will be picked at random per project alongside other variants of the same
type, so it MUST look clearly different from a generic default — a different
silhouette, layout, entrance technique and composition.

STRICT REQUIREMENTS (the renderer enforces these — breaking them fails the build):
- Declare variables on the <html> tag EXACTLY like this:
  ```
  <html lang="en" data-composition-variables='[
      {"id":"content","type":"string","label":"Text","default":"Sample"},
      {"id":"dur","type":"number","label":"Duration (seconds)","default":4}
    ]'>
  ```
- Load GSAP from this exact CDN tag in <head> (it is fetched at build time):
  `<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>`
- html, body MUST be `width: 1920px; height: 1080px; overflow: hidden;
  background: transparent;` — the frame is composited over real footage as an
  RGBA PNG sequence, so a solid page background would cover the whole video.
- The root element must be:
  `<div id="root" data-composition-id="__COMPID__" data-start="0" data-width="1920" data-height="1080">`
  Do NOT put data-duration on the root — it is then inferred from the clips.
- EVERY timed element needs `class="clip"` plus `data-start`, `data-duration`
  and `data-track-index`. Elements without class="clip" are never made visible.
- The timeline MUST be paused and registered under the composition id:
  ```
  window.__timelines = window.__timelines || {};
  const vars = window.__hyperframes.getVariables();
  const dur = Number(vars.dur) || 4;
  document.getElementById('<your clip id>').setAttribute('data-duration', String(dur));
  const tl = gsap.timeline({ paused: true });
  ... tl.fromTo(...) / tl.to(...) ...
  window.__timelines['__COMPID__'] = tl;
  ```
  A CLIP's data-duration can be set from JS like that; the ROOT's width/height
  and the composition id cannot — they are fixed at build time.
- Bind text declaratively with `data-var-text="content"` on the element that
  shows the text. Do not write the text into innerHTML from JS.
- DETERMINISTIC ONLY: no Date.now(), no Math.random(), no fetch/XHR, no
  external images or fonts, no <video>/<audio>. Frames are rendered
  out-of-order and in parallel — anything time-dependent must come from the
  GSAP timeline position, nothing else.
- Animate ONLY these properties (others are not captured reliably):
  opacity, x, y, scale, scaleX, scaleY, rotation, color, backgroundColor,
  borderRadius, and transforms. A STATIC (non-animated) clip-path, box-shadow,
  filter or gradient is fine — only animation of them is restricted.
- The animation must both ENTER at the start and LEAVE before the end:
  finish with something like
  `tl.to('#el', { opacity: 0, duration: 0.3 }, Math.max(dur - 0.3, 0));`
- Fonts: only these are installed on the render machine —
  "Segoe UI Black", "Segoe UI", "Arial Black", "Arial", "Georgia",
  "Times New Roman", "Courier New", "Consolas", "Impact", "Bahnschrift",
  "Cambria", "Constantia", "Garamond", "Palatino Linotype", "Century Gothic",
  "Trebuchet MS", "Verdana", "Tahoma", "Corbel", "Candara", "Gabriola",
  or a generic family. Anything else silently falls back and wrecks the layout.
- Content for this type: __TYPE_BRIEF__
  (the whole string arrives in the `content` variable; if the brief mentions a
  separator like "::" you may split it in JS and bind the parts to separate
  elements with textContent inside your script — that is the one exception to
  the data-var-text rule.)
- Leave most of the frame transparent. This is an overlay, not a full screen.
- Write the COMPLETE, FINISHED design. No placeholder comments, no TODO.
- Quality bar: premium broadcast documentary — layered depth (shadow/glow +
  shape + accent rule + text), tasteful easing, never a plain HTML box.

HERE IS A COMPLETE, WORKING COMPOSITION OF THIS EXACT FORMAT. It renders
correctly today. START FROM IT: keep every structural line (the html tag with
its variables, the root div attributes, class="clip", data-start /
data-duration / data-track-index, the whole <script> wiring) EXACTLY as it is
apart from the composition id, and replace ONLY the CSS, the markup inside the
clip, and the GSAP tweens with your own design:

```
__SKELETON__
```

__ALREADY_HAVE__
VISUAL THEME FOR THIS VARIANT — make it specific and memorable:
__VISUAL_THEME__

Output ONLY the raw .html file contents. No markdown code fences, no explanation."""


def _hf_skeleton(comp_id: str) -> str:
    """Живой рабочий пример вместо списка абстрактных правил. Семь
    структурных требований по отдельности модель не удерживала: чинила
    названное и роняла соседнее (8 попыток, 5 разных ошибок). Готовый файл,
    который заведомо рендерится, — куда надёжнее описания.

    Берём РЕАЛЬНЫЙ index.html проекта, а не выдуманный: если контракт
    HyperFrames однажды изменится, пример поедет вместе с ним сам."""
    src = _ov.HYPERFRAMES_DIR / "index.html"
    try:
        html = src.read_text(encoding="utf-8")
    except OSError:
        return ""
    return (html.replace('data-composition-id="banner"',
                         f'data-composition-id="{comp_id}"')
                .replace("__timelines['banner']", f"__timelines['{comp_id}']"))


def _hf_check(html: str, comp_id: str) -> str:
    """Дешёвые проверки ДО рендера — те же грабли, что у Remotion-варианта:
    файл может быть валидным HTML и при этом не быть композицией."""
    need = [
        ("data-composition-variables", "the <html> tag must carry data-composition-variables"),
        (f'data-composition-id="{comp_id}"', f'root div must have data-composition-id="{comp_id}"'),
        ("window.__timelines", "the timeline must be registered on window.__timelines"),
        ("gsap.timeline", "you must build a gsap.timeline({ paused: true })"),
        ("paused: true", "the gsap timeline must be created with { paused: true }"),
        ("data-track-index", "timed elements need data-track-index"),
    ]
    # ВСЕ нарушения разом, а не первое попавшееся. Сообщая по одному, мы
    # получали «прибей крота»: модель чинила названную ошибку и роняла
    # соседнее требование — 8 попыток, 5 разных ошибок, ни одного успеха.
    bad = [msg for token, msg in need if token not in html]
    # clip как ОДИН ИЗ классов, а не единственный: `class="clip strip"` —
    # совершенно корректно, а буквальный поиск 'class="clip"' его заворачивал.
    # Кавычки — любые: модель охотно пишет class='clip strip', и требование
    # при этом выполнено, а мы заворачивали такую композицию все 8 попыток.
    if not re.search(r"""class\s*=\s*(["'])[^"']*\bclip\b[^"']*\1""", html):
        bad.append('at least one element must have "clip" among its classes')
    if bad:
        return ("ALL of these are broken — fix EVERY one of them in a single "
                "pass and keep the others intact:\n- " + "\n- ".join(bad))
    if f"window.__timelines['{comp_id}']" not in html and \
       f'window.__timelines["{comp_id}"]' not in html:
        return (f"the timeline must be registered exactly as "
                f"window.__timelines['{comp_id}']")
    for bad, msg in (("Math.random", "Math.random() is forbidden — renders are parallel"),
                     ("Date.now", "Date.now() is forbidden — renders are parallel"),
                     ("fetch(", "network calls are forbidden"),
                     ("<video", "<video> is not allowed"),
                     ("<audio", "<audio> is not allowed")):
        if bad in html:
            return msg
    if re.search(r"placeholder|your content here|TODO|FIXME", html, re.I):
        return ("the file contains a placeholder/TODO instead of a finished "
                "design — draw every element out")
    m = re.search(r"<html[^>]*>", html)
    if m and "data-composition-variables" not in m.group(0):
        return "data-composition-variables must be on the <html> tag itself"
    return ""


def _variant_names(kind: str, theme: str) -> tuple[str, str, str]:
    """Имя варианта/компонента/файла. Хеш от темы+типа+времени — чтобы две
    генерации подряд не подрались за одно имя файла."""
    import hashlib
    import time as _time
    h = hashlib.sha1(f"{kind}|{theme}|{_time.time()}".encode()).hexdigest()[:4]
    variant = f"ai_{h}"
    component = "".join(w.capitalize() for w in kind.split("_")) + f"Ai{h.upper()}"
    return variant, component, f"{kind}_{variant}.tsx"


def _tsc_check_variant(code: str, fname: str) -> str:
    """tsc для одного варианта во временной копии src/ — сам вариант ещё не
    лежит в боевой папке, поэтому копируем дерево и подкладываем кандидата.

    Флаги специально совпадают с remotion/tsconfig.json (strict +
    noUnusedLocals): без noUnusedLocals проходил мусор вроде «импортировал
    interpolate/Easing/spring и не использовал» — верный признак того, что
    модель написала заглушку вместо анимации."""
    with tempfile.TemporaryDirectory(dir=REMOTION_DIR) as tmp:
        tmp_src = Path(tmp) / "src"
        shutil.copytree(REMOTION_DIR / "src", tmp_src)
        dest = tmp_src / "variants" / fname
        dest.write_text(code, encoding="utf-8")
        r = subprocess.run(
            ["npx", "tsc", "--noEmit", str(dest), "--jsx", "react-jsx",
             "--esModuleInterop", "--skipLibCheck", "--strict",
             "--noUnusedLocals", "--moduleResolution", "bundler",
             "--module", "esnext", "--target", "es2020"],
            cwd=REMOTION_DIR, capture_output=True, text=True, shell=True,
            timeout=60, creationflags=core.CREATE_NO_WINDOW)
        return (r.stdout + r.stderr).strip()


def _contract_check_variant(code: str, component: str) -> str:
    """Проверки, которые tsc сделать не может: что компонент реально
    анимирован и реально прозрачен. Появились после первого же боевого
    прогона — модель отдала синтаксически идеальную ЗАГЛУШКУ (сплошная
    заливка на весь кадр + комментарий «placeholder»), и она прошла всё."""
    m = _EXPORT_RE.search(code)
    if not m:
        return (f"file must export exactly `export const {component}: "
                "React.FC<VariantProps> = ...` — that line is missing. "
                f"RENAME your existing component to `{component}` and export "
                "it there; do NOT add a second declaration of that name at the "
                "end of the file (that is `TS2451: Cannot redeclare`, and it "
                "is how the previous attempts failed).")
    if m.group(1) != component:
        return f"component must be named `{component}`, found `{m.group(1)}`"
    # Одно имя — одно объявление. Получив требование «экспортируй ровно так»,
    # модель охотно дописывала второй `const` в конец, сохраняя первый, и
    # сжигала оставшиеся попытки на TS2451.
    if len(re.findall(rf"\b(?:const|let|var|function|class)\s+{component}\b",
                      code)) > 1:
        return (f"`{component}` is declared more than once — keep exactly ONE "
                "declaration (the exported one) and delete or rename the other")
    # Ищем в ТЕЛЕ компонента, после стрелки: props можно и деструктурировать
    # (`({ content, enter, exit }) => ...`) — это совершенно правильный код,
    # а буквальный поиск "p.enter" его заворачивал. Проверка ложно валила
    # нормальные варианты по 8 попыток подряд, пока не поймал на compare/callout.
    body = code.split("=>", 1)[1] if "=>" in code else code
    for name in ("enter", "exit"):
        if not re.search(rf"\b(?:p\.)?{name}\b", body):
            return (f"`{name}` is never used. Both enter and exit MUST be "
                    "multiplied into the opacity of what you draw, otherwise "
                    "the overlay pops in and out without a fade.")
    if re.search(r"placeholder|your content here|TODO|FIXME", code, re.I):
        return ("the file contains a placeholder/TODO instead of a finished "
                "design — write the COMPLETE visual, every element drawn out")
    # Вариант обязан ЧИТАТЬ то, ради чего его зовут. Проверка появилась после
    # живого ролика: banner/ai_f3e5 брал содержимое из `props.children`,
    # которых оверлею никто не передаёт (ядро рисует его как
    # <Generated {...p} />). Компилировался, был анимирован, корень прозрачный,
    # кадр не пустой — все прочие проверки прошёл. А в ролике одиннадцать раз
    # появлялся большой тёмный экран без единой буквы.
    if not re.search(r"\b(?:p\.)?(?:content|items|img)\b", body):
        return ("the component never reads its payload — none of `p.content`, "
                "`p.items`, `p.img` appears in the body. There are no "
                "`children`: the core renders you as `<Generated {...p} />`, "
                "so anything you draw around `props.children` comes out EMPTY. "
                "Read the text from `p.content` and put it in the frame.")
    # Незажатый interpolate ПРОДОЛЖАЕТ экстраполировать за краем диапазона:
    # scale, заданный как [0,30] -> [0.8,1], после 30-го кадра растёт без
    # предела. Оверлей раздувается на весь экран и не уходит. Компилируется,
    # рисуется, анимировано, не пусто — все прочие проверки проходит.
    # Поймано на живом ролике: так ошиблись ВСЕ ЧЕТЫРЕ первых варианта.
    n_interp = len(re.findall(r"\binterpolate\s*\(", code))
    n_clamp = len(re.findall(r"extrapolateRight", code))
    if n_interp > n_clamp:
        return (f"{n_interp - n_clamp} of your {n_interp} interpolate() calls "
                "have no extrapolateRight. Outside its input range "
                "interpolate() KEEPS EXTRAPOLATING — a scale animation grows "
                "without limit and the overlay swallows the screen and never "
                "leaves. EVERY interpolate() must carry "
                "`extrapolateLeft: 'clamp', extrapolateRight: 'clamp'`.")
    # <AbsoluteFill> с непрозрачным фоном закрасил бы ВСЁ видео целиком
    if re.search(r"<AbsoluteFill[^>]*backgroundColor:\s*['\"]#[0-9a-fA-F]{3,8}['\"]",
                 code):
        return ("the root <AbsoluteFill> has an opaque backgroundColor — that "
                "would paint over the entire video frame. The root must stay "
                "transparent; put backgrounds on inner, sized elements only.")
    # Шрифт не из списка отрендерится ПОДСТАНОВКОЙ и вид уедет — на машине
    # рендера нет ничего, кроме системных. Поймано на живом прогоне: модель
    # взяла Georgia, которой в списке не было.
    bad_fonts = {f for f in re.findall(r"fontFamily:\s*['\"`]([^'\"`]+)", code)
                 for f in [f]}
    # Список сверен с реально установленными на машине рендера (167 шт.),
    # а не выписан по памяти — отсутствующий шрифт молча заменяется системой
    # и вёрстка уезжает, причём tsc и рендер об этом ничего не скажут.
    allowed = {
        "impact", "arial black", "segoe ui black", "franklin gothic medium",
        "bahnschrift", "cambria", "constantia", "georgia", "times new roman",
        "garamond", "palatino linotype", "bookman old style", "sitka text",
        "century gothic", "corbel", "candara", "trebuchet ms", "verdana",
        "tahoma", "segoe ui", "arial", "consolas", "courier new",
        "lucida console", "gabriola", "segoe script", "segoe print",
        "ink free",
        "serif", "sans-serif", "monospace", "cursive", "fantasy", "inherit",
    }
    for decl in bad_fonts:
        for name in decl.split(","):
            name = name.strip().strip("'\"").lower()
            if name and name not in allowed:
                return (f"font \"{name}\" is not installed on the render "
                        "machine — it would silently fall back to a default "
                        "and wreck the layout. Use only: Segoe UI Black, "
                        "Segoe UI, Arial Black, Arial, Georgia, Times New "
                        "Roman, Courier New, Consolas, or a generic family.")
    return ""


def _judge_frames(frames: list[Path], keep_frame: Path | None = None) -> str:
    """Единые пороги «кадр годный» для ОБОИХ движков. Были скопированы в двух
    местах — а копия неизбежно разъедется, и один движок начнёт пропускать
    то, что другой отклоняет. Пустая строка = кадр принят."""
    from PIL import Image, ImageChops
    if not frames:
        return "нет кадров на выходе"
    img = Image.open(frames[len(frames) // 2]).convert("RGBA")
    if keep_frame is not None:
        shutil.copy(frames[len(frames) // 2], keep_frame)
    alpha = img.getchannel("A")
    if alpha.getextrema()[1] == 0:
        return "кадр полностью прозрачный (вариант ничего не рисует)"
    # Оверлей — НАКЛАДКА: видео под ней должно оставаться видимым. 100%
    # заливки = заглушка с фоном на весь кадр (реально случалось).
    px = alpha.width * alpha.height
    opaque = sum(n for v, n in enumerate(alpha.histogram()) if v > 250)
    if opaque / px > 0.92:
        return (f"вариант закрашивает {opaque / px:.0%} кадра непрозрачно — "
                "это накладка, видео под ней должно быть видно")
    vis = img.convert("RGB").getcolors(maxcolors=1 << 22) or []
    if len(vis) < 8:
        return (f"в кадре всего {len(vis)} цветов — похоже, нарисован пустой "
                "прямоугольник без текста и деталей")
    if len(frames) > 2:
        a = Image.open(frames[0]).convert("RGBA")
        b = Image.open(frames[-1]).convert("RGBA")
        if ImageChops.difference(a, b).getbbox() is None:
            return "первый и последний кадр идентичны — анимации нет"
    return ""


TEXT_SAMPLES = {
    "counter": "30,000", "bars": "Found:30,Missing:70",
    "timeline": "1911:Начало,1945:Конец",
    "compare": "Слева::Справа",
    "titlecard": "ЗАГОЛОВОК::подзаголовок",
}


def _test_photo(path: Path, seed: int) -> Path:
    """Правдоподобная тестовая «фотография» для типов, которым нужна
    картинка. Именно картинка, а не однотонный квадрат: вариант может
    масштабировать/кадрировать её, и на заливке одним цветом не видно ни
    рамки, ни того, что фото вообще нарисовано."""
    from PIL import Image, ImageDraw
    w, h = 480, 360
    tint = ((58, 74, 96), (120, 84, 60), (72, 96, 72), (96, 72, 110))[seed % 4]
    img = Image.new("RGB", (w, h))
    d = ImageDraw.Draw(img)
    for y in range(h):                       # вертикальный градиент
        k = 0.45 + 0.9 * (y / h)
        d.line([(0, y), (w, y)], fill=tuple(min(255, int(c * k)) for c in tint))
    d.ellipse([w * 0.18, h * 0.20, w * 0.62, h * 0.72],
              fill=tuple(min(255, c + 70) for c in tint))
    d.rectangle([0, h * 0.78, w, h], fill=tuple(int(c * 0.45) for c in tint))
    d.line([(0, h * 0.78), (w, h * 0.78)], fill=(230, 226, 218), width=3)
    img.save(path)
    return path


def _sample_content(kind: str, media_dir: Path) -> str:
    """content для дым-теста. popup/collage/gallery раньше получали сюда
    обычную строку — а _render_remotion ждёт от них ПУТЬ к картинке (popup)
    и пары "подпись::путь" через ";;" (collage до 3, gallery до 4). Итог:
    FileNotFoundError/ValueError на всех восьми попытках, то есть эти три
    типа не могли пополниться в принципе, сколько бы ни просили ИИ."""
    if kind == "popup":
        return str(_test_photo(media_dir / "smoke_0.png", 0))
    if kind in ("collage", "gallery"):
        n = 4 if kind == "gallery" else 3
        return ";;".join(
            f"Снимок {i + 1}::{_test_photo(media_dir / f'smoke_{i}.png', i)}"
            for i in range(n))
    return TEXT_SAMPLES.get(kind, "Проверочная строка варианта")


def _variant_smoke_test(kind: str, variant: str, log=print,
                        keep_frame: Path | None = None) -> str:
    """Реально рендерит кадр этого варианта. Пустая строка = ок.
    keep_frame — куда сохранить средний кадр, чтобы потом показать его
    Gemini на визуальную оценку (второй раз рендерить незачем)."""
    with tempfile.TemporaryDirectory(dir=BASE) as tmp:
        # Кадры и тестовые картинки — в РАЗНЫХ подпапках: после рендера
        # _render_remotion переименовывает ВСЕ *.png из папки вывода в
        # 0000.png, и лежи исходники popup/collage там же, они уехали бы в
        # секвенцию, а «средним кадром» оказалась бы тестовая фотография.
        # Заодно props-файл (dest_dir.parent) остаётся внутри tmp, а не
        # оседает в корне репозитория.
        frames = Path(tmp) / "frames"
        media = Path(tmp) / "media"
        frames.mkdir()
        media.mkdir()
        try:
            content = _sample_content(kind, media)
        except Exception as e:
            return f"не удалось подготовить тестовые данные: {e}"
        sample = {"type": kind, "variant": variant, "pos": "center", "dur": 3,
                  "content": content}
        try:
            _ov._render_remotion(sample, 1280, 720, 30, frames, media, log,
                                 variant=variant)
        except Exception as e:
            return f"рендер варианта упал: {e}"
        return _judge_frames(sorted(frames.glob("*.png")), keep_frame)


VISION_PROMPT = """You are art-directing overlay graphics for a premium
documentary YouTube channel. The image is ONE frame of a "__TYPE__" overlay,
composited over a flat grey stand-in for real footage (the grey is NOT part of
the design — ignore it, judge only the graphic).

Intended design brief was:
__VISUAL_THEME__

Judge it as a demanding art director. REJECT it if any of these are true:
- any text is cut off, clipped by its container, overflowing, or running off-frame
- text is unreadable: too small, or too low contrast against what is behind it
- elements overlap in a way that is clearly accidental
- it looks like a plain default HTML box: one flat rectangle, no depth, no
  considered typography
- it is basically empty, or the design is barely visible
- the composition is badly unbalanced or awkwardly placed

ACCEPT it if it reads as deliberate, legible, professional documentary
graphics — even if you personally would have styled it differently. Do not
reject for taste alone, only for the concrete faults listed above.

Reply with ONLY a JSON object, no markdown fences:
{"ok": true|false, "problem": "<if not ok: one concrete sentence naming the
single worst fault and what to change; empty string if ok>"}"""


def _vision_check(kind: str, theme: str, frame_png: Path, api_key: str,
                  log=print) -> str:
    """Показать отрендеренный кадр Gemini и спросить как у арт-директора.
    Пустая строка = принято. Это единственная проверка, которая смотрит на
    ВИД, а не на код: остальные шесть пропустят валидный, но уродливый кадр.

    Сбой самой проверки (нет ключа, лимит, кривой ответ) НЕ валит вариант —
    иначе временная проблема с API стирала бы нормальную работу."""
    from PIL import Image
    import io
    try:
        img = Image.open(frame_png).convert("RGBA")
        # кладём на серую подложку: без неё модель видит альфу как чёрное
        # и стабильно жалуется на «тёмный фон», которого в ролике не будет
        flat = Image.alpha_composite(
            Image.new("RGBA", img.size, (96, 100, 104, 255)), img).convert("RGB")
        buf = io.BytesIO()
        flat.save(buf, format="PNG")
        out = core.vision_chat(
            VISION_PROMPT.replace("__TYPE__", kind)
                         .replace("__VISUAL_THEME__", theme),
            buf.getvalue(), api_key,
            system="You are a meticulous broadcast motion-graphics art director.")
        m = re.search(r"\{.*\}", out, re.S)
        if not m:
            log(f"[Варианты] зрение: непонятный ответ, пропускаю проверку")
            return ""
        data = json.loads(m.group(0))
        if data.get("ok"):
            return ""
        problem = str(data.get("problem", ""))
        # «Мне не прислали картинку» — это поломка САМОЙ проверки, а не
        # приговор дизайну. Ответ приходит корректным JSON с ok:false, поэтому
        # проскакивал мимо обработки сбоев: вариант заворачивался, а генератору
        # уходило требование починить несуществующую беду — и он жёг попытку
        # за попыткой, правя то, чего нет. Наблюдалось вживую: Agnes отдаёт
        # запрос модели, которая картинку молча игнорирует.
        blind = ("no image", "was provided", "please upload", "cannot see",
                 "unable to see", "don't see any image", "не вижу изображен",
                 "изображение не предоставлено")
        if any(s in problem.lower() for s in blind):
            log("[Варианты] зрение: модель не получила кадр (ответила, что "
                "картинки нет) — это сбой проверки, а не брак дизайна; "
                "вариант принимаю без неё")
            return ""
        return f"art director rejected the rendered frame: {problem}"
    except Exception as e:
        log(f"[Варианты] зрение недоступно ({e}) — пропускаю эту проверку")
        return ""


def _hf_lint(rel_path: str, log=print) -> str:
    """Собственный линтер HyperFrames (npm run check) — ловит нарушения
    контракта data-*/timeline, о которых мои регулярки не знают. Вызывается
    через npm run, а не голый npx: у проекта нет локального node_modules, и
    неинтерактивный npx без --yes/пина отказывается ставить пакет."""
    npm = _ov._npm()
    if not npm:
        return ""      # npm нет — пропускаем эту ступень, не валим вариант

    # Проверяем кандидата В ИЗОЛЯЦИИ, а не весь проект.
    #
    # Раньше запускался `npm run check` по всей папке hyperframes/, и одна
    # сломанная композиция валила КАЖДЫЙ новый вариант — включая те, что с
    # ней никак не связаны. Замерено: при одной битой композиции в проекте
    # check отдаёт ok=false и код 1, то есть новые варианты не пройдут
    # никогда, пока её не починят руками.
    #
    # Фильтровать вывод по sourceFile нельзя, это проверялось: у битой
    # композиции ошибка missing_local_asset приписывается index.html, а не
    # файлу-виновнику. По такому фильтру мы бы пропускали ошибки САМОГО
    # кандидата.
    #
    # Кандидат обязан лежать именно как index.html: проект из одной
    # compositions/x.html без index.html падает с «Command failed» — проверка
    # не запускается вовсе.
    src = Path(_ov.HYPERFRAMES_DIR) / rel_path
    try:
        with tempfile.TemporaryDirectory() as tmp:
            box = Path(tmp)
            for name in ("package.json", "hyperframes.json"):
                s = Path(_ov.HYPERFRAMES_DIR) / name
                if s.exists():
                    shutil.copy(s, box / name)
            shutil.copy(src, box / "index.html")
            r = subprocess.run([npm, "run", "check"],
                               cwd=box, env=_ov._node_env(),
                               capture_output=True, text=True, timeout=300,
                               creationflags=core.CREATE_NO_WINDOW)
    except Exception as e:
        log(f"[Варианты] HyperFrames check не запустился ({e}) — пропускаю")
        return ""
    if r.returncode == 0:
        return ""
    out = (r.stdout + r.stderr).strip()
    # оставляем только строки с ошибками — вывод у check очень многословный
    lines = [ln for ln in out.splitlines()
             if re.search(r"error|Error|ERROR|✖|✗", ln)]
    return "\n".join(lines[:12]) or out[-600:]


def _hf_smoke_test(kind: str, rel_path: str, log=print,
                   keep_frame: Path | None = None) -> str:
    """Реальный рендер варианта HyperFrames в альфа-PNG. Проверки те же, что
    у Remotion-варианта: не пусто, не залито на весь кадр, не одноцветно,
    есть движение."""
    # HyperFrames получает только content+dur — картинок ему передать нечем,
    # поэтому здесь общий текстовый образец, без веток popup/collage.
    sample = {"type": kind, "pos": "center", "dur": 3,
              "content": TEXT_SAMPLES.get(kind, "Проверочная строка варианта")}
    with tempfile.TemporaryDirectory(dir=BASE) as tmp:
        dest = Path(tmp)
        try:
            _ov._render_hyperframes(sample, 1280, 720, 30, dest, log,
                                    composition=rel_path)
        except Exception as e:
            return f"рендер варианта упал: {e}"
        return _judge_frames(sorted(dest.glob("*.png")), keep_frame)


def gen_variant_hyperframes(kind: str, theme: str, api_key: str, log=print,
                            max_attempts: int = 8, channel: str = "") -> str | None:
    """То же, что gen_variant, но для второго движка: ИИ пишет композицию
    HyperFrames (HTML+GSAP), она проходит его собственный линтер, реальный
    альфа-рендер и проверку зрением, и попадает в ту же библиотеку.

    Сохраняется в hyperframes/compositions/ — ядро Remotion не затрагивается
    вообще, как и в случае с .tsx-вариантами."""
    if kind not in TYPE_BRIEF:
        log(f"[Варианты] Неизвестный тип «{kind}» — пропускаю")
        return None
    if not _ov.hyperframes_available():
        log("[Варианты] HyperFrames недоступен (нет npm/npx или index.html)")
        return None
    # Проверка ДО первого запроса к ИИ — иначе смысл паузы теряется
    if _fail_cooldown(kind, "hyperframes", log):
        return None
    import hashlib
    import time as _time
    h = hashlib.sha1(f"hf|{kind}|{theme}|{_time.time()}".encode()).hexdigest()[:4]
    variant = f"ai_{h}"
    comp_id = f"{kind}_{variant}"
    fname = f"{comp_id}.html"
    rel = f"compositions/{fname}"
    dest = _ov.HYPERFRAMES_DIR / "compositions" / fname
    log(f"[Варианты] Прошу ИИ придумать вариант «{kind}» для HyperFrames "
        f"({variant})...")
    prompt = (HF_CONTRACT.replace("__TYPE_BRIEF__", TYPE_BRIEF[kind])
              .replace("__TYPE__", kind)
              .replace("__COMPID__", comp_id)
              .replace("__SKELETON__", _hf_skeleton(comp_id))
              .replace("__ALREADY_HAVE__", _already_have(kind))
              .replace("__VISUAL_THEME__", theme))
    out = core.llm_chat(
        [{"role": "system", "content":
          "You are a senior motion graphics developer who writes HyperFrames "
          "(HTML + GSAP) compositions for premium documentary overlays."},
         {"role": "user", "content": prompt}], api_key, 0.9, 6000)
    code = re.sub(r"^```(?:html)?\n?", "", out.strip())
    code = re.sub(r"\n?```$", "", code).strip() + "\n"

    last_sig, stuck, problem = "", 0, ""
    dest.parent.mkdir(parents=True, exist_ok=True)
    for attempt in range(1, max_attempts + 1):
        problem = _hf_check(code, comp_id)
        if problem:
            log(f"[Варианты] контракт нарушен (попытка {attempt}/"
                f"{max_attempts}): {problem[:150]}")
        else:
            # Кандидат ложится в ЖИВУЮ папку композиций, поэтому любой выход
            # отсюда — включая «Стоп», который теперь бросает исключение прямо
            # из log() внутри дым-теста, — обязан его убрать: иначе в
            # hyperframes/ остаётся непроверенная композиция, которой нет в
            # variants.json, и она ломает проверку следующих вариантов.
            accepted = False
            shot = dest.parent / f".preview_{variant}.png"
            try:
                dest.write_text(code, encoding="utf-8")
                problem = _hf_lint(rel, log)
                if problem:
                    log(f"[Варианты] HyperFrames check не принял (попытка "
                        f"{attempt}/{max_attempts}):\n{problem[:400]}")
                else:
                    problem = _hf_smoke_test(kind, rel, log, shot)
                    if not problem and shot.exists():
                        problem = _vision_check(kind, theme, shot, api_key, log)
                        if problem:
                            log(f"[Варианты] арт-директор завернул: {problem[:150]}")
                    if not problem:
                        meta = load_variants_meta()
                        meta[f"{kind}/{variant}"] = {
                            "file": rel, "component": comp_id, "type": kind,
                            "variant": variant, "engine": "hyperframes",
                            "enabled": True, "channel": channel,
                            "created": datetime.now().isoformat(timespec="seconds"),
                            "theme": theme[:200]}
                        save_variants_meta(meta)
                        _note_success(kind, "hyperframes")
                        accepted = True
                        log(f"[Варианты] ✔ Новый вариант «{kind}/{variant}» "
                            f"(HyperFrames) прошёл проверку и добавлен "
                            f"(попытка {attempt})")
                        return variant
                    log(f"[Варианты] рендер не принял (попытка {attempt}/"
                        f"{max_attempts}): {problem}")
            finally:
                shot.unlink(missing_ok=True)
                if not accepted:
                    dest.unlink(missing_ok=True)
        if attempt == max_attempts:
            break
        sig = _err_signature(problem)
        stuck = stuck + 1 if sig == last_sig else 0
        last_sig = sig
        if stuck:
            log(f"[Варианты] та же ошибка {stuck + 1}-й раз — требую упростить")
        code = _ask_fix(code, problem, api_key, insist=stuck)

    dest.unlink(missing_ok=True)
    _note_fail(kind, "hyperframes", problem)
    log(f"[Варианты] HyperFrames: не получилось за {max_attempts} попыток — "
        "библиотека осталась как была")
    # Ролик от этого не пострадал, но ~16 платных вызовов ИИ ушли впустую,
    # а разнообразие плашек не выросло — это стоит видеть в итоге.
    import quality
    quality.degraded(
        "Варианты оверлеев",
        f"новый вид «{kind}» не появился — библиотека не пополнилась",
        why=f"{max_attempts} попыток подряд не прошли проверки "
            f"(HyperFrames): {str(problem)[:100]}",
        level="мелочь")
    return None


def gen_variant(kind: str, theme: str, api_key: str, log=print,
                max_attempts: int = 8, channel: str = "") -> str | None:
    """Просит ИИ написать ОДИН новый вариант оверлея типа kind и, если тот
    проходит tsc + реальный рендер, кладёт его в библиотеку навсегда.

    Ядро (Overlay.tsx) не трогается ни при каком исходе — вариант это отдельный
    файл. Провал = библиотека просто не пополнилась, рендер роликов продолжает
    работать на том, что уже есть. Возвращает имя варианта или None."""
    if kind not in TYPE_BRIEF:
        log(f"[Варианты] Неизвестный тип «{kind}» — пропускаю")
        return None
    # Проверка ДО первого запроса к ИИ — иначе смысл паузы теряется
    if _fail_cooldown(kind, "remotion", log):
        return None
    variant, component, fname = _variant_names(kind, theme)
    log(f"[Варианты] Прошу ИИ придумать новый вариант «{kind}» ({variant})...")
    prompt = (VARIANT_CONTRACT.replace("__TYPE_BRIEF__", TYPE_BRIEF[kind])
              .replace("__TYPE__", kind)
              .replace("__COMPONENT__", component)
              .replace("__API_RULES__", API_RULES)
              .replace("__ALREADY_HAVE__", _already_have(kind))
              .replace("__VISUAL_THEME__", theme))
    out = core.llm_chat(
        [{"role": "system", "content":
          "You are a senior motion graphics developer who writes production "
          "Remotion (React) code for premium documentary YouTube overlays."},
         {"role": "user", "content": prompt}], api_key, 0.9, 6000)
    code = re.sub(r"^```(?:tsx|typescript|ts)?\n?", "", out.strip())
    code = re.sub(r"\n?```$", "", code).strip() + "\n"

    last_sig, stuck, problem = "", 0, ""
    dest = VARIANTS_DIR / fname
    for attempt in range(1, max_attempts + 1):
        problem = ""
        errors = _tsc_check_variant(code, fname)
        if errors:
            problem = f"tsc --noEmit errors:\n{errors}"
            log(f"[Варианты] tsc ошибки (попытка {attempt}/{max_attempts}):\n"
                f"{errors[:400]}")
        else:
            problem = _contract_check_variant(code, component)
            if problem:
                log(f"[Варианты] контракт нарушен (попытка {attempt}/"
                    f"{max_attempts}): {problem[:160]}")
            else:
                # кандидат временно попадает в реестр — иначе его нечем
                # отрендерить; в variants.json он ещё НЕ записан
                VARIANTS_DIR.mkdir(parents=True, exist_ok=True)
                dest.write_text(code, encoding="utf-8")
                meta = load_variants_meta()
                trial = dict(meta)
                trial[f"{kind}/{variant}"] = {
                    "file": fname, "component": component, "type": kind,
                    "variant": variant, "enabled": True, "channel": channel,
                    "created": datetime.now().isoformat(timespec="seconds"),
                    "theme": theme[:200]}
                rebuild_registry(lambda *_: None, trial)
                # Кандидат уже лежит в живой папке вариантов и подключён в
                # реестр. Любой выход отсюда — включая «Стоп», который теперь
                # бросает исключение прямо из log() внутри дым-теста, — обязан
                # его убрать: иначе на диске остаётся непроверенный .tsx и
                # запись в реестре, которой нет в variants.json.
                accepted = False
                shot = VARIANTS_DIR / f".preview_{variant}.png"
                try:
                    problem = _variant_smoke_test(kind, variant, log, shot)
                    if not problem and shot.exists():
                        # кадр валиден технически — теперь смотрим глазами
                        problem = _vision_check(kind, theme, shot, api_key, log)
                        if problem:
                            log(f"[Варианты] арт-директор завернул: {problem[:150]}")
                    if not problem:
                        save_variants_meta(trial)
                        _note_success(kind, "remotion")
                        rebuild_registry(log)
                        accepted = True
                        log(f"[Варианты] ✔ Новый вариант «{kind}/{variant}» прошёл "
                            f"проверку и добавлен в библиотеку (попытка {attempt})")
                        return variant
                    log(f"[Варианты] рендер не принял (попытка {attempt}/"
                        f"{max_attempts}): {problem}")
                finally:
                    shot.unlink(missing_ok=True)
                    if not accepted:
                        dest.unlink(missing_ok=True)
                        rebuild_registry(lambda *_: None)
        if attempt == max_attempts:
            break
        sig = _err_signature(problem)
        stuck = stuck + 1 if sig == last_sig else 0
        last_sig = sig
        if stuck:
            log(f"[Варианты] та же ошибка {stuck + 1}-й раз — требую упростить")
        code = _ask_fix(code, problem, api_key, insist=stuck)

    dest.unlink(missing_ok=True)
    rebuild_registry(lambda *_: None)
    _note_fail(kind, "remotion", problem)
    log(f"[Варианты] Не получилось за {max_attempts} попыток — библиотека "
        "осталась как была (на рендер это не влияет)")
    # См. gen_variant_hyperframes: ролик тот же, но время и платные вызовы
    # ИИ потрачены, а новых видов плашек не прибавилось.
    import quality
    quality.degraded(
        "Варианты оверлеев",
        f"новый вид «{kind}» не появился — библиотека не пополнилась",
        why=f"{max_attempts} попыток подряд не прошли проверки "
            f"(Remotion): {str(problem)[:100]}",
        level="мелочь")
    return None


def gen_overlay_code(theme: str, api_key: str = "", log=print) -> str:
    log("[Remotion/Gemini] Прошу Gemini написать анимацию оверлеев под тему проекта...")
    out = core.llm_chat(
        [{"role": "system", "content":
          "You are a senior motion graphics developer who writes production "
          "Remotion (React) code for premium documentary YouTube overlays."},
         {"role": "user", "content": CONTRACT.replace("__API_RULES__", API_RULES)
                                             .replace("__VISUAL_THEME__", theme)}],
        api_key, 0.8, 8000)
    code = out.strip()
    code = re.sub(r"^```(?:tsx|typescript|ts)?\n?", "", code)
    code = re.sub(r"\n?```$", "", code)
    return code.strip() + "\n"


def typecheck(code_path: Path, log=print) -> str:
    """Пусто, если ок; иначе текст ошибок tsc."""
    r = subprocess.run(
        ["npx", "tsc", "--noEmit", str(code_path), "--jsx", "react-jsx",
         "--esModuleInterop", "--skipLibCheck", "--moduleResolution",
         "bundler", "--module", "esnext", "--target", "es2020"],
        cwd=REMOTION_DIR, capture_output=True, text=True, shell=True, timeout=60,
        creationflags=core.CREATE_NO_WINDOW)
    return (r.stdout + r.stderr).strip()


def _tsc_check(code: str) -> str:
    """tsc во ВРЕМЕННОЙ копии (не боевой Overlay.tsx) — быстрый фильтр
    явно битого кода перед тем, как тратить 30-60с на реальную сборку.
    Папка обязана быть ВНУТРИ REMOTION_DIR — иначе tsc не найдёт типы
    react/remotion: node_modules ищется вверх по родительским папкам, а
    remotion/node_modules не предок для temp-папки рядом в soft/."""
    with tempfile.TemporaryDirectory(dir=REMOTION_DIR) as tmp:
        tmp_src = Path(tmp) / "src"
        # копируем дерево ЦЕЛИКОМ, включая подпапки: Overlay.tsx импортирует
        # ./variants/_registry и ./types — при копировании только файлов
        # верхнего уровня tsc падал бы на ненайденном модуле, а не на коде
        shutil.copytree(REMOTION_DIR / "src", tmp_src)
        dest = tmp_src / "Overlay.tsx"
        dest.write_text(code, encoding="utf-8")
        return typecheck(dest)


def _err_signature(problem: str) -> str:
    """Отпечаток проблемы без «шума», который меняется сам по себе: каждая
    проверка идёт в своей temp-папке (tmpXXXX/src/Overlay.tsx), поэтому один
    и тот же баг выглядит текстуально разным. Нужен, чтобы отличить
    «модель топчется на месте» от «ошибка сменилась — прогресс есть»."""
    s = re.sub(r"tmp[0-9a-z_]+[/\\]", "", problem)
    return re.sub(r"\s+", " ", s).strip()[:400]


def _ask_fix(code: str, problem: str, api_key: str, insist: int = 0) -> str:
    """insist — сколько раз ПОДРЯД уже приходила ровно эта же ошибка. При
    insist>0 обычной вежливой просьбы «почини» очевидно мало: замеры показали
    цикл, где модель 5 попыток подряд возвращала байт-в-байт ту же ошибку
    (Easing.cubicBezier), не сдвинувшись ни на строку. Тогда давим прямо и
    поднимаем температуру — иначе все попытки уходят в одну галлюцинацию."""
    extra = ""
    if insist:
        head = (f"\n\n!!! CRITICAL: this is attempt #{insist + 1} at fixing "
                "THIS EXACT SAME error. Your previous fixes did NOT change it "
                "at all. Do NOT repeat that approach again.\n")
        # Совет должен соответствовать КЛАССУ ошибки. Одного текста мало:
        # на живом прогоне «удали несуществующий символ» ушло в 5 повторов
        # против ошибки «забыл использовать p.enter» — там удалять нечего.
        if "is never used" in problem or "p.enter" in problem or "p.exit" in problem:
            extra = head + (
                "You are NOT applying the required opacity. Fix it MECHANICALLY: "
                "find EVERY element you render and multiply p.enter * p.exit "
                "into its opacity, exactly like this:\n"
                "    const fade = p.enter * p.exit;\n"
                "    <div style={{ opacity: fade * myOwnAnim, ... }}>\n"
                "Every single visible <div>/<svg>/<h1> must carry `fade` in its "
                "opacity. Do not rename it, do not compute your own fade from "
                "p.dur, do not skip the inner layers.")
        elif "TS6133" in problem or "declared but its value is never read" in problem:
            extra = head + (
                "These are UNUSED declarations. Fix it MECHANICALLY: delete the "
                "unused import names from the import statement and delete the "
                "unused const lines entirely. Do NOT invent a use for them. If "
                "you imported `useVideoConfig` but never call it, remove it "
                "from the import list.")
        elif "not installed" in problem or "font" in problem.lower():
            extra = head + (
                "Replace EVERY fontFamily value with one of the installed "
                "families verbatim: '\"Segoe UI Black\", Arial, sans-serif' or "
                "'Georgia, serif' or '\"Courier New\", monospace'. Do not keep "
                "any other family name anywhere in the file.")
        elif "opaque" in problem or "AbsoluteFill" in problem:
            extra = head + (
                "Remove the backgroundColor from the ROOT <AbsoluteFill> "
                "entirely — write `<AbsoluteFill>` with no style, or "
                "`style={{ backgroundColor: 'transparent' }}`. Move that colour "
                "onto an inner <div> that has an explicit width/height smaller "
                "than the frame.")
        else:
            extra = head + (
                "The symbol/property/option you are using DOES NOT EXIST in "
                "this library, no matter how standard it looks elsewhere. "
                "Delete that construct entirely and rewrite that line with a "
                "plainer one that is certain to compile (e.g. a bare "
                "`interpolate()` with no easing at all, or `Easing.linear`). "
                "Losing a little visual polish is REQUIRED and acceptable here.")
    fix = core.llm_chat(
        [{"role": "system", "content":
          "You are a senior TypeScript/React/Remotion developer fixing "
          "bugs in your own code."},
         {"role": "user", "content":
          "This TSX file has a problem. Fix ONLY what's needed — keep the "
          "same visual design and the OverlayProps contract. Output ONLY "
          "the corrected raw .tsx file contents, no markdown fences, no "
          f"explanation.\n\n--- problem ---\n{problem}{extra}\n\n"
          f"--- current file ---\n{code}"}],
        api_key, 0.3 + min(insist, 3) * 0.2, 8000)
    code = re.sub(r"^```(?:tsx|typescript|ts)?\n?", "", fix.strip())
    return re.sub(r"\n?```$", "", code).strip() + "\n"


def apply_theme(theme: str, api_key: str, log=print,
                max_attempts: int = 15) -> bool:
    """Генерирует Overlay.tsx под тему проекта, проверяет tsc, затем реально
    рендерит образцы (_smoke_test) — типы компилируются, но код может рисовать
    пустой/битый кадр, а tsc такое не ловит. При проблеме на любом из двух
    уровней шлёт описание обратно в Gemini на исправление (до max_attempts).
    Если так и не получилось — возвращает боевой файл на место (без изменений)
    и возвращает False; вызывающий остаётся на текущей рабочей версии.

    Откат сделан через try/finally СОЗНАТЕЛЬНО: между записью кандидата в
    боевой Overlay.tsx и вердиктом дым-теста может вылететь что угодно —
    сеть, лимит API, опечатка в имени переменной (ровно так и терялся файл:
    NameError после записи кандидата, до строки отката). Возврат рабочей
    версии не имеет права зависеть от того, предусмотрели ли мы конкретное
    исключение: потерять единственный рабочий Overlay.tsx нельзя."""
    backup = OVERLAY_PATH.read_text(encoding="utf-8")
    applied = False    # кандидат принят и должен остаться в боевом файле
    last_sig = ""      # отпечаток прошлой проблемы
    stuck = 0          # сколько раз подряд она повторилась байт-в-байт
    code = gen_overlay_code(theme, api_key, log)

    def _fix(problem: str) -> str:
        """Общий путь для всех трёх уровней проверки: считает, топчемся ли мы
        на месте, и давит на модель тем сильнее, чем дольше это длится."""
        nonlocal last_sig, stuck
        sig = _err_signature(problem)
        stuck = stuck + 1 if sig == last_sig else 0
        last_sig = sig
        if stuck:
            log(f"[Remotion/Gemini] Та же ошибка {stuck + 1}-й раз подряд — "
                "требую переписать проблемное место проще")
        return _ask_fix(code, problem, api_key, insist=stuck)

    try:
        for attempt in range(1, max_attempts + 1):
            errors = _tsc_check(code)
            if errors:
                log(f"[Remotion/Gemini] tsc нашёл ошибки (попытка {attempt}/"
                   f"{max_attempts}):\n{errors[:500]}")
                if attempt == max_attempts:
                    break
                code = _fix(f"tsc --noEmit errors:\n{errors}")
                continue
            contract_problem = _contract_check(code)
            if contract_problem:
                log(f"[Remotion/Gemini] Код скомпилировался, но нарушает контракт "
                   f"(попытка {attempt}/{max_attempts}): {contract_problem}")
                if attempt == max_attempts:
                    break
                code = _fix(contract_problem)
                continue
            OVERLAY_PATH.write_text(code, encoding="utf-8")
            problem = _smoke_test(log)
            if not problem:
                log(f"[Remotion/Gemini] Готово: tsc чист, образцы отрендерились "
                    f"— применено (попытка {attempt}/{max_attempts})")
                applied = True
                return True
            log(f"[Remotion/Gemini] Реальный рендер нашёл проблему (попытка "
               f"{attempt}/{max_attempts}): {problem}")
            if attempt == max_attempts:
                break
            code = _fix(f"Rendered output problem: {problem}")
        return False
    finally:
        # Единственная точка отката — срабатывает и при исчерпании попыток,
        # и при ЛЮБОМ исключении по дороге. Пишем безусловно, не сверяясь с
        # текущим содержимым: лишняя запись того же текста безвредна, а
        # любая проверка — это ещё одна операция, которая может упасть
        # прямо здесь и оставить в боевом файле кандидата.
        if not applied:
            OVERLAY_PATH.write_text(backup, encoding="utf-8")
            log("[Remotion/Gemini] НЕ ПОЛУЧИЛОСЬ — остаёмся на текущей "
                "(рабочей) версии Overlay.tsx")


if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    theme = ("Dark, cinematic true-crime documentary aesthetic: deep "
             "charcoal/near-black backgrounds, warm amber/gold accent glow "
             "(#e8a33d / #ffd27a), sharp bold typography, layered depth "
             "(soft glow blob + dark plate + thin accent line/border + small "
             "kicker icon + main text), subtle vignette, inspired by "
             "Netflix true-crime title cards. Should also work fine for "
             "other serious documentary topics (science, history, nature).")
    gemini_key = os.getenv("GEMINI_API_KEY", "")
    ok = apply_theme(theme, gemini_key, print)
    raise SystemExit(0 if ok else 1)
