# -*- coding: utf-8 -*-
"""Генерация кода оверлеев Remotion через Gemini (по промпту). Пишет
результат в изолированную тестовую копию (scratchpad/remotion_test),
НЕ трогает боевой remotion/src/Overlay.tsx, пока не подтверждено, что
код компилируется и рендерится."""
import os
import re
import sys
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

sys.path.insert(0, r"C:\Users\ali\Desktop\2")
import core

TEST_DIR = Path(r"C:\Users\ali\AppData\Local\Temp\claude\C--Users-ali-Desktop-2"
                r"\ee4d09da-f0a4-4612-ae9b-0d050f5e5504\scratchpad\remotion_test")

CONTRACT = """Write a complete TSX file for a Remotion overlay component.

STRICT REQUIREMENTS (this is a fixed contract, do not deviate):
- `export type OverlayProps = { type: string; content: string; pos: string; dur: number; fps?: number; width?: number; height?: number; img?: string; };`
- `export const Overlay: React.FC<OverlayProps>` — switches on `p.type`, rendering one of these cases (default: render nothing, `<AbsoluteFill />`):
  - "lower3": p.content is a short text label — could be a date, a name, a place, or ANY short phrase. Classic broadcast lower-third. Do NOT prepend an invented category kicker word above it (no "EVIDENCE", no "LOCATION", no "FACT" etc.) — you cannot know what the label represents, inventing a category is often wrong. A purely decorative kicker (small dot, thin accent line, no text) is fine.
  - "counter": p.content is like "$200,000" or "30,000" — animate counting up to that number, big and bold, center screen.
  - "bars": (alias "infographic") p.content is comma-separated "label:value" pairs, e.g. "Found:30,Missing:70" — animated bar chart.
  - "timeline": p.content is comma-separated "year:label" pairs — animated horizontal timeline with dots/markers.
  - "callout": p.content is short text; p.pos may be "point:X,Y" (percent of frame width/height) — draw a pointer line/circle from that point to a text box. Default point if not "point:" format: 70,55. Do NOT prepend an invented category kicker like "KEY DETAIL" — same reasoning as lower3.
  - "popup": show `<Img src={p.img} />` — a picture cutout with physical, tactile motion (float/sway/drop-shadow). content unused here.
  - "compare": p.content is "left text|right text" (split on the pipe `|` character) — two boxes side by side with a dashed connector line between them, for contrasting two facts/claims.
  - "banner": p.content is a short punchy sentence — a wide bright banner bar spanning most of the frame width, anchored to the top, bold dark text on a bright/light background (this is the ONE type that should use a light/bright background rather than a dark plate — everything else stays dark/translucent).
- Only import from 'react' and 'remotion' (AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig, Easing, random — whichever you need). NO other packages, NO external fonts/URLs/network calls, NO <video>/<audio> tags — this is a transparent alpha-channel PNG-sequence overlay composited on top of existing footage via ffmpeg, nothing else.
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
- Counter content parsing: `p.content` may be ANY of "$200,000", "30,000 people", "8 billion", "42%" — extract the leading non-digit prefix and trailing non-digit suffix with a regex like `/([^\d]*)([\d][\d,.\s]*)(.*)/`, animate-count only the numeric part, and re-attach the ORIGINAL prefix/suffix text exactly as given — do NOT assume currency, do NOT invent a "Total Value" caption, do NOT reformat non-monetary numbers with a currency symbol.
- Positions: honor `p.pos` where relevant: "top-right","top-left","top","bottom","center","point:X,Y".
- Visual quality bar: premium broadcast/Netflix-documentary title-card quality — layered depth (background glow + plate + accent line/border + icon/kicker + main text, at least 3 visual layers per element), gradients, soft shadows, smooth spring physics (not linear/robotic motion), tasteful glow accents. Must NOT look flat, cheap, or like a plain HTML form.

VISUAL THEME FOR THIS PROJECT:
{theme}

Output ONLY the raw .tsx file contents. No markdown code fences, no explanation before or after, no comments describing what you changed — just the file."""


def gen_overlay_code(theme: str, api_key: str = "", log=print) -> str:
    log("[Remotion/Gemini] Прошу Gemini написать анимацию оверлеев...")
    out = core.llm_chat(
        [{"role": "system", "content":
          "You are a senior motion graphics developer who writes production "
          "Remotion (React) code for premium documentary YouTube overlays."},
         {"role": "user", "content": CONTRACT.replace("{theme}", theme)}],
        api_key, 0.6, 8000)
    code = out.strip()
    code = re.sub(r"^```(?:tsx|typescript|ts)?\n?", "", code)
    code = re.sub(r"\n?```$", "", code)
    return code.strip() + "\n"


def typecheck(code_path: Path, log=print) -> str:
    """Пусто, если ок; иначе текст ошибок tsc."""
    import subprocess
    r = subprocess.run(
        ["npx", "tsc", "--noEmit", str(code_path), "--jsx", "react-jsx",
         "--esModuleInterop", "--skipLibCheck", "--moduleResolution",
         "bundler", "--module", "esnext", "--target", "es2020"],
        cwd=TEST_DIR, capture_output=True, text=True, shell=True, timeout=60)
    return (r.stdout + r.stderr).strip()


def gen_overlay_code_verified(theme: str, api_key: str = "", log=print,
                              max_attempts: int = 4) -> str | None:
    """Генерирует и проверяет tsc, при ошибке шлёт её обратно в Gemini на
    исправление. None, если за max_attempts не удалось получить рабочий код —
    тогда вызывающий обязан остаться на текущей (рабочей) версии."""
    dest = TEST_DIR / "src" / "OverlayGemini.tsx"
    code = gen_overlay_code(theme, api_key, log)
    for attempt in range(1, max_attempts + 1):
        dest.write_text(code, encoding="utf-8")
        errors = typecheck(dest, log)
        if not errors:
            log(f"[Remotion/Gemini] tsc чист — попытка {attempt}/{max_attempts}")
            return code
        log(f"[Remotion/Gemini] tsc нашёл ошибки (попытка {attempt}/"
           f"{max_attempts}), прошу Gemini исправить:\n{errors[:500]}")
        if attempt == max_attempts:
            break
        fix = core.llm_chat(
            [{"role": "system", "content":
              "You are a senior TypeScript/React/Remotion developer fixing "
              "compile errors in your own code."},
             {"role": "user", "content":
              "This TSX file fails to compile. Fix ONLY what's needed to "
              "make `tsc --noEmit` pass — keep the same visual design and "
              "the OverlayProps contract. Output ONLY the corrected raw "
              ".tsx file contents, no markdown fences, no explanation.\n\n"
              f"--- tsc errors ---\n{errors}\n\n--- current file ---\n{code}"}],
            api_key, 0.3, 8000)
        code = re.sub(r"^```(?:tsx|typescript|ts)?\n?", "", fix.strip())
        code = re.sub(r"\n?```$", "", code).strip() + "\n"
    return None


if __name__ == "__main__":
    theme = ("Dark, cinematic true-crime documentary aesthetic: deep "
             "charcoal/near-black backgrounds, warm amber/gold accent glow "
             "(#e8a33d / #ffd27a), sharp bold typography, layered depth "
             "(soft glow blob + dark plate + thin accent line/border + small "
             "kicker icon + main text), subtle vignette, inspired by "
             "Netflix true-crime title cards. Should also work fine for "
             "other serious documentary topics (science, history, nature).")
    gemini_key = os.getenv("GEMINI_API_KEY", "")
    code = gen_overlay_code_verified(theme, gemini_key, print)
    if code is None:
        print("[Remotion/Gemini] НЕ ПОЛУЧИЛОСЬ — остаёмся на текущей "
             "версии Overlay.tsx")
        raise SystemExit(1)
    print(f"[Remotion/Gemini] Готово: {len(code)} симв., tsc проходит")
