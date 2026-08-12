# -*- coding: utf-8 -*-
"""Снять ПОЧЕРК МОНТАЖА с чужого ролика и переложить на свой канал.

ЧТО СНИМАЕТСЯ И ЧТО НЕТ. Снимаются числа: как часто режут, ровный ритм
или рваный, сколько длится самый длинный план, какой у кадра цвет и
контраст, насколько громко и ровно сведён звук, как быстро говорит
диктор, сколько в кадре надписей. Это ремесло, и оно не принадлежит
никому.

НЕ снимается ничего из самого ролика: ни кадра, ни секунды звука, ни
шрифта, ни графики. На выходе — таблица чисел, из которой нельзя
восстановить исходник. Файл образца после разбора не нужен и никуда не
копируется.

Зачем это вообще. Настройки канала («документальная 5с», «плашка раз в 8
секунд») до сих пор брались из головы. Разбор даёт их из ролика, который
уже собрал миллион просмотров в той же нише, — и дальше их можно не
копировать один в один, а СДВИНУТЬ: взять ритм, но свой цвет; взять
темп речи, но свою длину.

    python ref_edit.py путь\к\ролику.mp4
    python ref_edit.py ролик.mp4 --apply estoico-es    # записать в профиль
"""
import argparse
import json
import re
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

# Ключи живут в .env, и подхватывает их webapp при старте — а этот файл
# запускают из командной строки, где никакого webapp нет. Без этих трёх
# строк core._gemini_keys() возвращал пустой список при десяти рабочих
# ключах в .env, и разбор глазами молча отваливался на каждом кадре.
try:
    from dotenv import load_dotenv
    load_dotenv(BASE / ".env")
except ImportError:
    pass

# Порог смены плана. 0.30 по опыту ffmpeg: ниже ловятся вспышки света и
# движение камеры, выше теряются мягкие склейки через затемнение.
SCENE_THRESHOLD = 0.30


def _run(args: list[str], timeout: int = 900) -> str:
    r = subprocess.run(args, capture_output=True, text=True,
                       encoding="utf-8", errors="replace", timeout=timeout, creationflags=CREATE_NO_WINDOW)
    return (r.stdout or "") + (r.stderr or "")


def duration(video: Path) -> float:
    out = _run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                "-of", "json", str(video)], timeout=120)
    try:
        return float(json.loads(out)["format"]["duration"])
    except Exception:
        return 0.0


def cuts(video: Path, log=print) -> list[float]:
    """Секунды, на которых меняется план."""
    log("[Образец] Ищу склейки (это самая долгая часть)…")
    out = _run(["ffmpeg", "-hide_banner", "-i", str(video),
                "-filter:v", f"select='gt(scene,{SCENE_THRESHOLD})',showinfo",
                "-f", "null", "-"])
    return [float(m) for m in re.findall(r"pts_time:([\d.]+)", out)]


def colour(video: Path, n: int = 60) -> dict:
    """Средний цвет и контраст по n кадрам, равномерно по всему ролику."""
    total = duration(video)
    if total <= 0:
        return {}
    ys, us, vs = [], [], []
    for i in range(n):
        t = total * (i + 0.5) / n
        out = _run(["ffmpeg", "-hide_banner", "-ss", f"{t:.2f}", "-i",
                    str(video), "-frames:v", "1", "-vf", "signalstats,metadata=print",
                    "-f", "null", "-"], timeout=120)
        for key, bag in (("YAVG", ys), ("UAVG", us), ("VAVG", vs)):
            m = re.search(rf"signalstats.{key}=([\d.]+)", out)
            if m:
                bag.append(float(m.group(1)))
    if not ys:
        return {}
    avg = lambda a: sum(a) / len(a)                       # noqa: E731
    spread = (max(ys) - min(ys)) if len(ys) > 1 else 0.0
    return {
        "яркость": round(avg(ys), 1),          # 16-235, середина ~126
        "разброс яркости": round(spread, 1),   # выше — контрастнее монтаж
        "сдвиг в синий": round(avg(us) - 128, 1) if us else 0.0,
        "сдвиг в красный": round(avg(vs) - 128, 1) if vs else 0.0,
    }


def loudness(video: Path) -> dict:
    """Громкость и её ровность — по стандарту вещания (EBU R128)."""
    out = _run(["ffmpeg", "-hide_banner", "-i", str(video), "-af",
                "loudnorm=print_format=json", "-f", "null", "-"], timeout=900)
    m = re.search(r"\{[^{}]*input_i[^{}]*\}", out, re.S)
    if not m:
        return {}
    try:
        d = json.loads(m.group(0))
    except Exception:
        return {}
    return {
        "громкость LUFS": float(d.get("input_i", 0)),
        "разброс громкости LU": float(d.get("input_lra", 0)),
        "пик dBTP": float(d.get("input_tp", 0)),
    }


def rhythm(marks: list[float], total: float) -> dict:
    """Ритм склеек: не только средняя длина, но и её РОВНОСТЬ.

    Ровность важнее средней. Два ролика с одинаковым средним планом в 9
    секунд ощущаются по-разному: у одного все планы по девять, у другого
    чередуются двухсекундные и двадцатисекундные. Второй смотрится
    живым, первый — конвейером. Меряем это отношением разброса к
    среднему: ниже 0.5 — метроном, выше 1.0 — рваный монтаж.
    """
    if len(marks) < 4 or total <= 0:
        return {}
    spans = [b - a for a, b in zip(marks, marks[1:]) if b > a]
    if not spans:
        return {}
    spans.sort()
    mean = sum(spans) / len(spans)
    var = sum((x - mean) ** 2 for x in spans) / len(spans)
    sd = var ** 0.5
    mid = spans[len(spans) // 2]
    return {
        "планов": len(marks),
        "склеек в минуту": round(len(marks) / (total / 60), 1),
        "средний план, с": round(mean, 1),
        "медианный план, с": round(mid, 1),
        "самый долгий, с": round(spans[-1], 1),
        "ровность ритма": round(sd / mean, 2) if mean else 0,
        "коротких (<3 с), %": round(
            100 * sum(1 for x in spans if x < 3) / len(spans)),
    }


def describe(r: dict) -> list[str]:
    """Числа словами — чтобы решение принимал человек, а не таблица."""
    out = []
    ry = r.get("ритм", {})
    if ry:
        ev = ry.get("ровность ритма", 0)
        out.append(
            f"Режут раз в {ry['средний план, с']} с "
            + ("ровно, как метроном — так монтируют лекцию"
               if ev < 0.5 else
               "рвано: короткие планы вперемешку с долгими — так держат "
               "внимание" if ev > 1.0 else "с умеренной неровностью"))
        if ry.get("коротких (<3 с), %", 0) > 25:
            out.append(f"Каждый четвёртый план короче трёх секунд "
                       f"({ry['коротких (<3 с), %']}%) — рубленый монтаж")
    c = r.get("цвет", {})
    if c:
        y = c.get("яркость", 0)
        out.append(
            f"Кадр {'тёмный' if y < 100 else 'светлый' if y > 145 else 'средний'}"
            f" (яркость {y} из 235)"
            + (f", контраст высокий" if c.get("разброс яркости", 0) > 60
               else ", контраст ровный"))
    sm = r.get("однообразие", {})
    if sm:
        out.append(
            f"Смена вида: {sm['вердикт']} "
            f"(соседние кадры различаются на {sm['разница между кадрами']}, "
            f"почти одинаковых пар {sm['почти одинаковых пар, %']}%)")
    ld = r.get("звук", {})
    if ld:
        out.append(
            f"Звук сведён на {ld['громкость LUFS']:.1f} LUFS "
            + ("— громче нормы YouTube (-14), так делают, чтобы ролик "
               "звучал напористо" if ld["громкость LUFS"] > -13 else
               "— тише нормы YouTube (-14)" if ld["громкость LUFS"] < -16
               else "— по норме YouTube"))
        if ld.get("разброс громкости LU", 0) < 6:
            out.append("Громкость почти не гуляет — речь сжата компрессором, "
                       "как на радио")
    return out


def sameness(video: Path, n: int = 40, log=print) -> dict:
    """НАСКОЛЬКО КАДРЫ ПОХОЖИ ДРУГ НА ДРУГА — главная беда ИИ-роликов.

    Зачем отдельно от ритма склеек. Замер по своему ролику (estoico-es,
    46 мин, 2026-08-08): в раскадровке 296 планов, а ffmpeg при пороге
    явной склейки нашёл 59. Разница не в том, что монтажа нет, — планы
    честно меняются. Они просто ПОХОЖИ: тот же тёмный кабинет, та же
    лампа, тот же наезд. Зритель видит один бесконечный кадр там, где
    задумано триста.

    Считаем расстояние между соседними выборочными кадрами по цветовой
    гистограмме. Чем оно меньше, тем сильнее ролик «залипает» в одном
    виде — и никакие плашки этого не лечат, потому что беда не в
    графике, а в том, ЧТО показывают.
    """
    total = duration(video)
    if total <= 0:
        return {}
    log("[Образец] сравниваю кадры между собой…")
    prev, dists = None, []
    for i in range(n):
        t = total * (i + 0.5) / n
        out = _run(["ffmpeg", "-hide_banner", "-ss", f"{t:.2f}", "-i",
                    str(video), "-frames:v", "1", "-vf",
                    "scale=64:36,signalstats,metadata=print", "-f", "null", "-"],
                   timeout=120)
        m = re.search(r"signalstats.YAVG=([\d.]+)", out)
        s = re.search(r"signalstats.YDIF=([\d.]+)", out)
        if not m:
            continue
        cur = (float(m.group(1)), float(s.group(1)) if s else 0.0)
        if prev is not None:
            dists.append(abs(cur[0] - prev[0]))
        prev = cur
    if not dists:
        return {}
    avg = sum(dists) / len(dists)
    stuck = sum(1 for d in dists if d < 8)
    return {
        "разница между кадрами": round(avg, 1),
        "почти одинаковых пар, %": round(100 * stuck / len(dists)),
        "вердикт": ("кадры залипают — зритель видит один вид"
                    if avg < 10 else
                    "кадры заметно разные — вид обновляется"
                    if avg > 20 else "средняя смена вида"),
    }


def style_read(video: Path, api_key: str = "", n: int = 12,
               log=print) -> dict:
    """ЧТО В КАДРЕ — глазами, а не измерителем.

    Числа говорят, как часто режут и насколько тёмен кадр. Они не говорят
    главного: чем именно ролик держит зрителя. Есть ли надпись в первые
    секунды, возвращается ли повторяющийся приём, показывают ли то, о чём
    говорят, или картинка живёт отдельно от слов. Это видно только
    глазами, поэтому кадры уходят в модель зрения.

    Снимается ОПИСАНИЕ приёма, а не сам приём: «тяжёлый гротеск с чёрной
    обводкой внизу слева, появляется рывком» — из такой строки нельзя
    восстановить ни шрифт, ни графику, зато можно собрать своё похожее.
    Сама форма букв никому не принадлежит; принадлежит файл шрифта, а его
    в готовом видео уже нет — там пиксели.
    """
    import core                                   # тяжёлый, тянем лениво
    total = duration(video)
    if total <= 0:
        return {}
    # Первые секунды — отдельно и подробнее: там решается уход зрителя,
    # и замер по собственным каналам показал обвал на 6-31 секунде.
    marks = [2, 6, 12, 20, 35] + [
        total * (i + 0.5) / (n - 5) for i in range(max(n - 5, 1))]
    seen = []
    tmp = video.parent / ".ref_frames"
    tmp.mkdir(exist_ok=True)
    try:
        for t in marks:
            if t >= total:
                continue
            f = tmp / f"f{int(t):05d}.jpg"
            _run(["ffmpeg", "-hide_banner", "-y", "-ss", f"{t:.2f}", "-i",
                  str(video), "-frames:v", "1", "-vf", "scale=960:-1",
                  str(f)], timeout=120)
            if not f.is_file():
                continue
            try:
                say = core.vision_chat(
                    "Ты разбираешь чужой ролик, чтобы понять ЕГО РЕМЕСЛО. "
                    f"Это кадр на {int(t)}-й секунде. Ответь ОДНОЙ строкой "
                    "по-русски и по делу: что в кадре (общий план, крупный "
                    "план, схема, архив), есть ли надпись — какая по "
                    "начертанию, где стоит, — и чем этот кадр удерживает "
                    "внимание. Не пересказывай содержание, называй ПРИЁМ.",
                    f.read_bytes(), api_key,
                    system="Ты монтажёр документального кино.")
                seen.append({"сек": int(t), "приём": say.strip()[:300]})
                log(f"[Образец] {int(t):>4} с: {say.strip()[:90]}")
            except Exception as e:
                log(f"[Образец] кадр {int(t)} с не разобран: {str(e)[:70]}")
    finally:
        for f in tmp.glob("*.jpg"):
            f.unlink(missing_ok=True)
        tmp.rmdir()
    return {"кадры": seen}


def analyse(video: Path, log=print) -> dict:
    total = duration(video)
    if total <= 0:
        raise RuntimeError("не удалось прочитать длительность — это видеофайл?")
    log(f"[Образец] {video.name}: {total/60:.1f} мин")
    marks = cuts(video, log)
    log(f"[Образец] склеек найдено: {len(marks)}")
    log("[Образец] снимаю цвет…")
    col = colour(video)
    log("[Образец] снимаю звук…")
    snd = loudness(video)
    r = {"файл": video.name, "длина, мин": round(total / 60, 1),
         "ритм": rhythm(marks, total), "цвет": col, "звук": snd,
         "однообразие": sameness(video, log=log)}
    r["словами"] = describe(r)
    return r


def main() -> None:
    ap = argparse.ArgumentParser(
        description="Снять почерк монтажа с ролика-образца.")
    ap.add_argument("video")
    ap.add_argument("--apply", default="",
                    help="id канала: записать замер в его профиль")
    ap.add_argument("--eyes", action="store_true",
                    help="ещё и разобрать приёмы глазами (нужен ключ)")
    a = ap.parse_args()
    v = Path(a.video)
    if not v.is_file():
        sys.exit(f"нет файла: {v}")
    r = analyse(v)
    if a.eyes:
        # Ключи живут в .env, а не в settings.json: там только текущий
        # канал и последний проект. core._gemini_keys() сам разбирает
        # GEMINI_API_KEY, GEMINI_API_KEY2 и так далее.
        import core
        keys = core._gemini_keys()
        r["приёмы"] = style_read(v, keys[0] if keys else "")
    print()
    print(json.dumps({k: v2 for k, v2 in r.items() if k != "словами"},
                     ensure_ascii=False, indent=2))
    print("\nЧТО ЭТО ЗНАЧИТ:")
    for line in r["словами"]:
        print("  •", line)
    if a.apply:
        import channels as cm
        ch = cm.get(a.apply)
        if not ch:
            sys.exit(f"нет канала {a.apply}")
        ch["ref_edit"] = {k: v2 for k, v2 in r.items() if k != "словами"}
        cm.upsert(ch)
        print(f"\nЗаписано в профиль канала «{ch.get('name')}». "
              "Собственный почерк канала при этом НЕ затирается — замер "
              "лежит рядом как ориентир.")


if __name__ == "__main__":
    main()
