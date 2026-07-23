# -*- coding: utf-8 -*-
"""Генерация кода оверлеев Remotion через Gemini — под тему/жанр конкретного
видео, чтобы разные проекты визуально не были близнецами. Проверяет через
tsc перед тем, как код попадёт в боевой remotion/src/Overlay.tsx — если
Gemini не смог написать рабочий код за несколько попыток, вызывающий обязан
остаться на текущей (рабочей) версии."""
import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

import core
import overlays as _ov

BASE = Path(__file__).resolve().parent
REMOTION_DIR = BASE / "remotion"
OVERLAY_PATH = REMOTION_DIR / "src" / "Overlay.tsx"

# По одному образцу на самый частый тип — рендерим по-настоящему (не только
# tsc), чтобы поймать код, который компилируется, но рисует пустой/битый
# кадр (typecheck такое не видит). popup/collage не нужны здесь — они не
# завязаны на цветовую тему, только на переданную картинку.
SMOKE_ITEMS = [
    {"type": "banner", "content": "Проверочная фраза для дымового теста",
     "pos": "top", "dur": 3},
    {"type": "titlecard", "content": "ЗАГОЛОВОК::подзаголовок теста",
     "pos": "center", "dur": 3},
    {"type": "compare", "content": "Слева::Справа", "pos": "center", "dur": 3},
    {"type": "lower3", "content": "Тестовая плашка", "pos": "bottom", "dur": 3},
    {"type": "callout", "content": "Проверочная выноска",
     "pos": "point:70,40", "dur": 3},
]


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
            dest = Path(tmp)
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
  - "collage": p.items is an array of up to 3 {{label, img}} — archival-photo-style polaroid/card grid, each with its label caption, staggered entrance.
- Only import from 'react' and 'remotion' (AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig, Easing, random — whichever you need). NO other packages, NO external fonts/URLs/network calls, NO <video>/<audio> tags — this is a transparent alpha-channel PNG-sequence overlay composited on top of existing footage via ffmpeg, nothing else.
- If you use `spring()`, its REAL signature (do not invent other fields — no `duration`, no `offset`, these do not exist and will fail to compile) is exactly:
  ```
  function spring(opts: {{
    frame: number; fps: number;
    config?: Partial<{{damping: number; mass: number; stiffness: number; overshootClamping: boolean}}>;
    from?: number; to?: number; durationInFrames?: number;
    durationRestThreshold?: number; delay?: number; reverse?: boolean;
  }}): number
  ```
  Prefer plain `interpolate()` with `Easing.out(Easing.back(...))`/`Easing.elastic(...)` over `spring()` if unsure — it is simpler and cannot hallucinate a bad config shape.
- CSS-in-JS typing: this is TSX, not plain CSS — properties like `textAlign`, `position`, `flexDirection`, `textTransform`, `whiteSpace` etc. need a value TypeScript accepts as that literal union, not a bare `string`. Either inline the style object literally in JSX (`style={{{{ textAlign: 'center' }}}}`) so TS infers the literal type, or if building a style object as a separate `const`, type it as `React.CSSProperties` explicitly — never declare it as `{{ [key: string]: string }}` or let it widen to `string`.
- Fonts: use only "Segoe UI Black", "Segoe UI", "Arial", sans-serif (system fonts only).
- Every element must fully animate in using useCurrentFrame()/useVideoConfig() (fps = p.fps ?? 30) and fade/scale out during the last ~0.3s of `p.dur` seconds — never appear as a static, unanimated element.
- CRITICAL — a common mistake to avoid: animation timing MUST be driven by the actual `p.dur` prop (seconds), NOT a hardcoded constant. `p.dur` can be as short as 2-3 seconds or as long as 15 — the fade-out must trigger near the END of THAT specific overlay's `p.dur`, every time, for every type. Use exactly this pattern (copy it verbatim as a shared hook, called with `p.dur`):
  ```
  const useExit = (dur: number) => {{
    const frame = useCurrentFrame();
    const {{fps}} = useVideoConfig();
    const t = frame / fps;
    return interpolate(t, [dur - 0.3, dur], [1, 0], {{extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}});
  }};
  ```
  Multiply this `exit` value into every layer's opacity (and optionally scale) in every component. Never invent your own fixed-duration timer.
- Positions: honor `p.pos` where relevant: "top-right","top-left","top","bottom","center","point:X,Y".
- Visual quality bar: premium broadcast/Netflix-documentary title-card quality — layered depth (background glow + plate + accent line/border + icon/kicker + main text, at least 3 visual layers per element), gradients, soft shadows, smooth spring physics (not linear/robotic motion), tasteful glow accents. Must NOT look flat, cheap, or like a plain HTML form.

VISUAL THEME FOR THIS PROJECT — invent a palette and mood SPECIFIC to this,
not a generic template; a different topic should look and feel different:
__VISUAL_THEME__

Output ONLY the raw .tsx file contents. No markdown code fences, no explanation before or after, no comments describing what you changed — just the file."""


def gen_overlay_code(theme: str, api_key: str = "", log=print) -> str:
    log("[Remotion/Gemini] Прошу Gemini написать анимацию оверлеев под тему проекта...")
    out = core.llm_chat(
        [{"role": "system", "content":
          "You are a senior motion graphics developer who writes production "
          "Remotion (React) code for premium documentary YouTube overlays."},
         {"role": "user", "content": CONTRACT.replace("__VISUAL_THEME__", theme)}],
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
        cwd=REMOTION_DIR, capture_output=True, text=True, shell=True, timeout=60)
    return (r.stdout + r.stderr).strip()


def _tsc_check(code: str) -> str:
    """tsc во ВРЕМЕННОЙ копии (не боевой Overlay.tsx) — быстрый фильтр
    явно битого кода перед тем, как тратить 30-60с на реальную сборку.
    Папка обязана быть ВНУТРИ REMOTION_DIR — иначе tsc не найдёт типы
    react/remotion: node_modules ищется вверх по родительским папкам, а
    remotion/node_modules не предок для temp-папки рядом в soft/."""
    with tempfile.TemporaryDirectory(dir=REMOTION_DIR) as tmp:
        tmp_src = Path(tmp) / "src"
        tmp_src.mkdir()
        for p in (REMOTION_DIR / "src").iterdir():
            if p.name != "Overlay.tsx" and p.is_file():
                shutil.copy(p, tmp_src / p.name)
        dest = tmp_src / "Overlay.tsx"
        dest.write_text(code, encoding="utf-8")
        return typecheck(dest)


def _ask_fix(code: str, problem: str, api_key: str) -> str:
    fix = core.llm_chat(
        [{"role": "system", "content":
          "You are a senior TypeScript/React/Remotion developer fixing "
          "bugs in your own code."},
         {"role": "user", "content":
          "This TSX file has a problem. Fix ONLY what's needed — keep the "
          "same visual design and the OverlayProps contract. Output ONLY "
          "the corrected raw .tsx file contents, no markdown fences, no "
          f"explanation.\n\n--- problem ---\n{problem}\n\n"
          f"--- current file ---\n{code}"}],
        api_key, 0.3, 8000)
    code = re.sub(r"^```(?:tsx|typescript|ts)?\n?", "", fix.strip())
    return re.sub(r"\n?```$", "", code).strip() + "\n"


def apply_theme(theme: str, api_key: str, log=print,
                max_attempts: int = 6) -> bool:
    """Генерирует Overlay.tsx под тему проекта, проверяет tsc, затем реально
    рендерит образцы (_smoke_test) — типы компилируются, но код может рисовать
    пустой/битый кадр, а tsc такое не ловит. При проблеме на любом из двух
    уровней шлёт описание обратно в Gemini на исправление (до max_attempts).
    Если так и не получилось — возвращает боевой файл на место (без изменений)
    и возвращает False; вызывающий остаётся на текущей рабочей версии."""
    backup = OVERLAY_PATH.read_text(encoding="utf-8")
    code = gen_overlay_code(theme, api_key, log)
    for attempt in range(1, max_attempts + 1):
        errors = _tsc_check(code)
        if errors:
            log(f"[Remotion/Gemini] tsc нашёл ошибки (попытка {attempt}/"
               f"{max_attempts}):\n{errors[:500]}")
            if attempt == max_attempts:
                break
            code = _ask_fix(code, f"tsc --noEmit errors:\n{errors}", api_key)
            continue
        contract_problem = _contract_check(code)
        if contract_problem:
            log(f"[Remotion/Gemini] Код скомпилировался, но нарушает контракт "
               f"(попытка {attempt}/{max_attempts}): {contract_problem}")
            if attempt == max_attempts:
                break
            code = _ask_fix(code, contract_problem, api_key)
            continue
        OVERLAY_PATH.write_text(code, encoding="utf-8")
        problem = _smoke_test(log)
        if not problem:
            log(f"[Remotion/Gemini] Готово: tsc чист, образцы отрендерились "
                f"— применено (попытка {attempt}/{max_attempts})")
            return True
        log(f"[Remotion/Gemini] Реальный рендер нашёл проблему (попытка "
           f"{attempt}/{max_attempts}): {problem}")
        if attempt == max_attempts:
            break
        code = _ask_fix(code, f"Rendered output problem: {problem}", api_key)
    OVERLAY_PATH.write_text(backup, encoding="utf-8")   # откат на рабочую версию
    log("[Remotion/Gemini] НЕ ПОЛУЧИЛОСЬ — остаёмся на текущей версии Overlay.tsx")
    return False


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
