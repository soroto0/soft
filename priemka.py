# -*- coding: utf-8 -*-
"""ПРИЁМКА ГОТОВОГО РОЛИКА: что не так с ФАЙЛОМ, а не с прогоном.

Зачем отдельно от quality.py. Тот модуль собирает деградации, о которых
СООБЩИЛИ САМИ СТАДИИ: не ответила нейросеть, не нашлось фото, свернули на
запасной путь. Это ответ на вопрос «что пошло не так по дороге».

Но ровно те поломки, которые владелец видел глазами и на которые жаловался,
ни одна стадия не сообщала — потому что каждая отработала «успешно»:

  * замирания на 2-3 секунды, когда кончался ИИ-клип;
  * розовый цветовой сдвиг от наложения в режиме screen на цветовые
    плоскости;
  * чёрная плашка на весь кадр от потерянного заголовка;
  * обложка, нечитаемая в ленте;
  * тайм-коды в описании, не совпадающие с карточками в кадре.

Всё это находится ТОЛЬКО замером готового файла. Замер 11.08.2026: четырнадцать
таких поломок нашлись в уже ОПУБЛИКОВАННЫХ роликах — то есть порядок был
«машина собрала, человек выложил, дефект нашёлся через неделю». Этот модуль
разворачивает порядок: сначала замер, потом публикация.

Ничего не чинит и не перерисовывает. Задача — назвать числом, что не так,
и сказать, что с этим делать. Чинить дешевле на своей стадии, а не поверх
готового файла.

    python priemka.py einsturzpunkt/2026-08-10
"""
import json
import re
import subprocess
import sys
from pathlib import Path

# Порог замирания. 2 c выбраны не на глаз: жалоба владельца звучала как
# «замирает на 2-3 секунды, когда кончается ИИ-клип», а осмысленная статичная
# заставка короче двух секунд в этом конвейере не встречается.
FREEZE_S = 2.0
# Насколько цветовые плоскости могут отойти от серого (128), прежде чем это
# станет видно как оттенок. Замер на розовом ролике: screen(128,128) даёт 192,
# то есть +64. Порог 6 ловит сдвиг задолго до того, как он бросается в глаза.
CHROMA_DRIFT = 6.0
# Целевая громкость программы и потолок пика — те же, что держит микс.
LUFS_TARGET, LUFS_TOL, PEAK_MAX = -16.0, 2.0, -0.5


def _run(cmd: list[str], timeout: int = 3600) -> str:
    """ffmpeg пишет измерения в stderr — возвращаем оба потока одной строкой."""
    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8",
                       errors="replace", timeout=timeout)
    return (r.stdout or "") + (r.stderr or "")


def _dur(mp4: Path) -> float:
    try:
        out = _run(["ffprobe", "-v", "error", "-show_entries",
                    "format=duration", "-of", "json", str(mp4)], 120)
        return float(json.loads(out)["format"]["duration"])
    except Exception:
        return 0.0


def freezes(mp4: Path, log=print) -> list[dict]:
    """Замирания длиннее FREEZE_S. Один проход декодирования без записи."""
    out = _run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(mp4),
                "-vf", f"freezedetect=n=-60dB:d={FREEZE_S}",
                "-map", "0:v:0", "-f", "null", "-"])
    found = []
    start = None
    for m in re.finditer(r"freeze_(start|duration|end)\s*:\s*([\d.]+)", out):
        kind, val = m.group(1), float(m.group(2))
        if kind == "start":
            start = val
        elif kind == "duration" and start is not None:
            found.append({"at": start, "len": val})
            start = None
    return found


def blacks(mp4: Path) -> list[dict]:
    """Полностью чёрные куски — обычно провал между группами склейки."""
    out = _run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(mp4),
                "-vf", "blackdetect=d=0.8:pic_th=0.98",
                "-map", "0:v:0", "-f", "null", "-"])
    return [{"at": float(m.group(1)), "len": float(m.group(3))}
            for m in re.finditer(
                r"black_start:([\d.]+)\s+black_end:([\d.]+)\s+black_duration:([\d.]+)",
                out)]


def colour(mp4: Path) -> dict:
    """Средние по цветовым плоскостям. Оттенок кадра — это уход U и V от 128.

    Розовый/пурпурный, на который жаловался владелец, — этоU и V ВМЕСТЕ выше
    128: наложение в режиме screen применялось не только к яркости, но и к
    цветовым плоскостям, и screen(128,128) даёт 192.
    """
    out = _run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(mp4),
                "-vf", "signalstats,metadata=mode=print:file=-",
                "-map", "0:v:0", "-f", "null", "-"])
    u = [float(m.group(1)) for m in re.finditer(r"lavfi\.signalstats\.UAVG=([\d.]+)", out)]
    v = [float(m.group(1)) for m in re.finditer(r"lavfi\.signalstats\.VAVG=([\d.]+)", out)]
    if not u or not v:
        return {}
    return {"u": sum(u) / len(u), "v": sum(v) / len(v), "frames": len(u)}


def loudness(mp4: Path) -> dict:
    out = _run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(mp4),
                "-af", "ebur128=peak=true", "-f", "null", "-"])
    tail = out[-1800:]
    got = {}
    for key, rx in (("lufs", r"I:\s*(-?[\d.]+)\s*LUFS"),
                    ("peak", r"Peak:\s*(-?[\d.]+)\s*dBFS")):
        m = list(re.finditer(rx, tail))
        if m:
            got[key] = float(m[-1].group(1))
    return got


def chapters_vs_cards(d: Path) -> dict:
    """Совпадают ли тайм-коды в описании с карточками глав В КАДРЕ.

    Это ровно та поломка, из-за которой зритель жал «09:30» и попадал в
    середину чужой мысли: две системы жили порознь. Замер einsturzpunkt
    10.08 — совпадал 1 тайм-код из 7.
    """
    seo, over = d / "seo.txt", d / "overlays.txt"
    if not seo.exists() or not over.exists():
        return {}
    txt = seo.read_text("utf-8", errors="ignore")
    i = txt.upper().find("CHAPTERS")
    if i < 0:
        return {"chapters": 0, "cards": 0, "matched": 0}
    secs = []
    for ln in txt[i:].splitlines()[1:]:
        m = re.match(r"\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s+\S", ln)
        if not m:
            if secs:
                break
            continue
        a, b, c = m.group(1), m.group(2), m.group(3)
        secs.append(int(a) * 3600 + int(b) * 60 + int(c) if c
                    else int(a) * 60 + int(b))
    cards = []
    for ln in over.read_text("utf-8", errors="ignore").splitlines():
        p = [x.strip() for x in ln.split("|")]
        if len(p) > 2 and p[1].lower() == "titlecard":
            m = re.match(r"^(\d{1,2}):(\d{2})(?::(\d{2}))?$", p[0])
            if m:
                a, b, c = m.group(1), m.group(2), m.group(3)
                cards.append(int(a) * 3600 + int(b) * 60 + int(c) if c
                             else int(a) * 60 + int(b))
    matched = sum(1 for s in secs if any(abs(s - c) <= 5 for c in cards))
    return {"chapters": len(secs), "cards": len(cards), "matched": matched}


def check(project: Path, log=print) -> list[dict]:
    """Все проверки по папке проекта. Возвращает список замечаний."""
    d = Path(project)
    mp4 = d / "output_final.mp4"
    bad: list[dict] = []
    if not mp4.exists():
        return [{"уровень": "критично", "что": "готового файла нет",
                 "где": str(mp4), "делать": "ролик не собран"}]

    total = _dur(mp4)
    log(f"[Приёмка] {d.name}: {total/60:.1f} мин, смотрю файл…")

    fz = freezes(mp4, log)
    if fz:
        worst = max(fz, key=lambda x: x["len"])
        bad.append({
            "уровень": "заметно",
            "что": f"замираний {len(fz)}, самое долгое {worst['len']:.1f} с",
            "где": f"на {int(worst['at']//60)}:{int(worst['at']%60):02d}",
            "делать": "кончился ИИ-клип, а план длиннее — проверь "
                      "tpad/boomerang в render.py"})

    bl = blacks(mp4)
    if bl:
        bad.append({
            "уровень": "критично",
            "что": f"чёрных провалов {len(bl)}",
            "где": f"на {int(bl[0]['at']//60)}:{int(bl[0]['at']%60):02d}",
            "делать": "провал между группами склейки — смотри concat в render.py"})

    c = colour(mp4)
    if c:
        du, dv = c["u"] - 128, c["v"] - 128
        if abs(du) > CHROMA_DRIFT or abs(dv) > CHROMA_DRIFT:
            tint = ("розовый/пурпурный" if du > 0 and dv > 0 else
                    "зелёный" if du < 0 and dv < 0 else "смещённый")
            bad.append({
                "уровень": "критично",
                "что": f"цветовой сдвиг {tint}: U {c['u']:.1f}, V {c['v']:.1f} "
                       f"при норме 128",
                "где": "весь ролик",
                "делать": "наложение в режиме screen ушло на цветовые "
                          "плоскости — только по яркости"})

    ld = loudness(mp4)
    if ld.get("lufs") is not None and abs(ld["lufs"] - LUFS_TARGET) > LUFS_TOL:
        bad.append({
            "уровень": "заметно",
            "что": f"громкость {ld['lufs']:.1f} LUFS при цели {LUFS_TARGET}",
            "где": "весь ролик",
            "делать": "YouTube всё равно приведёт к своей норме, но тихий "
                      "ролик проиграет соседям до нормализации"})
    if ld.get("peak") is not None and ld["peak"] > PEAK_MAX:
        bad.append({
            "уровень": "заметно",
            "что": f"пик {ld['peak']:.1f} dBFS — близко к перегрузу",
            "где": "весь ролик", "делать": "убавь громкость музыки или атмосферы"})

    ch = chapters_vs_cards(d)
    if ch and ch.get("chapters"):
        if ch["matched"] < ch["chapters"]:
            bad.append({
                "уровень": "заметно",
                "что": f"из {ch['chapters']} глав в описании подтверждены "
                       f"карточкой в кадре только {ch['matched']}",
                "где": "описание против overlays.txt",
                "делать": "зритель жмёт тайм-код и не видит подтверждения — "
                          "core.apply_chapters должен отработать до рендера"})
    return bad


def report(bad: list[dict]) -> str:
    if not bad:
        return "[Приёмка] Замечаний нет — ролик можно выкладывать."
    order = {"критично": 0, "заметно": 1, "мелочь": 2}
    bad = sorted(bad, key=lambda x: order.get(x["уровень"], 9))
    out = [f"[Приёмка] Замечаний: {len(bad)}"]
    for b in bad:
        out.append(f"  • {b['уровень'].upper()}: {b['что']}")
        out.append(f"      где: {b['где']}")
        out.append(f"      что делать: {b['делать']}")
    return "\n".join(out)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        raise SystemExit(2)
    print(report(check(Path(sys.argv[1]))))
