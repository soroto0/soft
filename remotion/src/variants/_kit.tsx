import React from 'react';
import { AbsoluteFill, interpolate, Easing } from 'remotion';
import type { VariantProps } from '../types';
import { formSpec } from './_look';
import type { Look, Palette, FormSpec } from './_look';

// ОБЩИЕ КИРПИЧИ КАНАЛЬНЫХ ПЛАШЕК: место в кадре, подложка, появление, кегли.
//
// Вынесены из _forms.tsx отдельным файлом не ради красоты, а чтобы разорвать
// цикл импортов. Формы по типам (_typeforms.tsx) нуждаются ровно в этих
// кирпичах, а _forms.tsx нуждается в формах — если бы кирпичи остались в
// _forms.tsx, получилось бы кольцо _forms -> _typeforms -> _forms. Порядок
// теперь односторонний: _kit <- _typeforms <- _forms.
//
// Жёсткие правила рендера соблюдены по всему файлу, они не косметические:
//   * корневой AbsoluteFill БЕЗ фона — иначе плашка закрасит весь кадр;
//   * каждый interpolate с clamp — без него значение уезжает за диапазон и
//     плашка разрастается на весь экран и не уходит;
//   * p.enter и p.exit умножены в прозрачность — их считает ядро, чтобы все
//     плашки ролика появлялись и уходили синхронно;
//   * ничего случайного: кадры считаются параллельно и не по порядку.

export type Ctx = {
  p: VariantProps;
  L: Look;
  spec: FormSpec;
  frame: number;
  fps: number;
  u: number;              // масштаб от высоты кадра (1 при 1080p)
  ai: number;             // номер якоря в словаре канала (0..3)
  pi: number;             // номер подложки в словаре канала (0..3)
  k: number;              // сборка плашки 0..1
  op: number;             // общая прозрачность (enter * exit)
  filled: boolean;        // подложка непрозрачная -> текст на ней
  ink: string;
  accent: string;
  accent2: string;
};

export const hash = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
};

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

// Число на счётчике набирается от нуля к значению, и ОКРУГЛЯТЬ ЕГО ДО ЦЕЛОГО
// нельзя: замер по настоящим роликам — «Theorie:0.6,Praxis:0.0» показывалось
// как «1» и «0», «Soll-Anstieg:0.3 m/Tag» как «0». Столбик рисовался верной
// высоты, а подпись над ним врала — хуже, чем если бы врало и то и другое,
// потому что противоречие зритель замечает. Держим столько знаков после
// запятой, сколько их в исходном значении (не больше двух: третий знак на
// плашке в кадре всё равно не читается).
export const decimalsOf = (value: number): number => {
  const s = String(value);
  const dot = s.indexOf('.');
  return dot < 0 ? 0 : Math.min(2, s.length - dot - 1);
};

// dec приходит ОДИН на весь набор: «0.6» рядом с «0» в одной таблице
// читается как разная точность замера, хотя это одна и та же величина.
// Берём наибольшее число знаков по строке и держим его у всех.
export const countText = (value: number, t: number, dec: number): string =>
  (value * t).toFixed(dec);

// Пустой прозрачный кадр — то, что обязан вернуть тип, которому нечего
// показать. Не «плашка без текста», а именно ничего.
//
// Порядок здесь принципиальный: подложка (plateStyle) заливается непрозрачным
// L.plate ДО того, как кто-либо посмотрел на содержимое, и её размер задан
// не текстом, а minWidth — 780px у bars, 760px у timeline, 620px у redact.
// Поэтому список из нуля пунктов давал не «плашку поменьше», а тёмный
// прямоугольник в полкадра без единого знака внутри. Ворота в Overlay.tsx
// такие входы теперь отсекают, но проверка обязана быть и здесь: варианты
// открываются напрямую в remotion studio, и ворота — не единственный путь
// сюда.
export const NOTHING = <AbsoluteFill />;

// Ступенька 0..1 с задержкой — единственный способ сделать очередь
// (слова, строки, столбики) без таймеров и случайностей.
export const step = (frame: number, from: number, len: number) =>
  interpolate(frame, [from, from + Math.max(len, 1)], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

// ---------- место в кадре ----------

export const anchorBox = (anchor: string): React.CSSProperties => {
  switch (anchor) {
    case 'tl':
      return { justifyContent: 'flex-start', alignItems: 'flex-start', padding: '7% 7%' };
    case 'br':
      return { justifyContent: 'flex-end', alignItems: 'flex-end', padding: '9% 7%' };
    case 'bottomBar':
      return { justifyContent: 'flex-end', alignItems: 'stretch', padding: '0 0 9% 0' };
    case 'blCard':
      return { justifyContent: 'flex-end', alignItems: 'flex-start', padding: '10% 9%' };
    case 'bottomCard':
      return { justifyContent: 'flex-end', alignItems: 'center', padding: '0 0 11% 0' };
    case 'tr':
      return { justifyContent: 'flex-start', alignItems: 'flex-end', padding: '8% 7%' };
    case 'centerLow':
      return { justifyContent: 'flex-end', alignItems: 'center', padding: '0 0 26% 0' };
    case 'center':
      return { justifyContent: 'center', alignItems: 'center', padding: '0 12%' };
    case 'leftColumn':
      return { justifyContent: 'center', alignItems: 'flex-start', padding: '0 0 0 9%' };
    case 'bottomWide':
      return { justifyContent: 'flex-end', alignItems: 'center', padding: '0 10% 12% 10%' };
    case 'topQuiet':
      return { justifyContent: 'flex-start', alignItems: 'center', padding: '9% 12% 0 12%' };
    default:                       // 'bl'
      return { justifyContent: 'flex-end', alignItems: 'flex-start', padding: '8% 7%' };
  }
};

// ---------- как плашка появляется ----------

export const revealStyle = (reveal: string, k: number): React.CSSProperties => {
  switch (reveal) {
    case 'wipeL':
      return { clipPath: `inset(0 ${(1 - k) * 100}% 0 0)` };
    case 'drop':
      return { transform: `translateY(${(1 - k) * -26}px)` };
    case 'blink':
      // два коротких мигания и фиксация — сигнальная лампа, а не плавность
      return { opacity: k < 1 ? (Math.floor(k * 6) % 2 === 0 ? 0.25 : 1) : 1 };
    case 'rise':
      return { transform: `translateY(${(1 - k) * 34}px) scale(${0.96 + k * 0.04})` };
    case 'unfold':
      return { transform: `scaleY(${0.24 + k * 0.76})`, transformOrigin: 'bottom center' };
    case 'swing':
      return { transform: `rotate(${(1 - k) * -5}deg)`, transformOrigin: 'top left' };
    case 'fadeUp':
      return { transform: `translateY(${(1 - k) * 16}px)`, opacity: k };
    case 'breathe':
      return { transform: `scale(${1.05 - k * 0.05})`, opacity: k };
    case 'drawRule':
      return { clipPath: `inset(0 ${(1 - k) * 100}% 0 0)`, opacity: 0.35 + k * 0.65 };
    case 'driftUp':
      return { transform: `translateY(${(1 - k) * 18}px)`, opacity: k };
    case 'letterFade':
      return { filter: `blur(${(1 - k) * 7}px)`, opacity: k };
    default:                       // 'snap'
      return { transform: `scale(${1.07 - k * 0.07})`, opacity: k > 0.15 ? 1 : 0 };
  }
};

// Прозрачность приёма появления, вынутая отдельно. Половина приёмов
// возвращает СВОЮ opacity, и если положить их объект после «opacity: c.op»,
// уход плашки будет затёрт — она провисит до последнего кадра и пропадёт
// рывком (замер einsturzpunkt/2026-08-11_2: 59 секвенций из 80).
export const revealOpacity = (st: React.CSSProperties, op: number): number =>
  op * (typeof st.opacity === 'number' ? st.opacity : 1);

// ---------- чем плашка подложена ----------

const FILLED = ['slab', 'railed', 'strip', 'card', 'tape', 'note', 'ribbon', 'stone'];

export const isFilled = (plate: string) => FILLED.indexOf(plate) >= 0;

export const plateStyle = (c: Ctx): React.CSSProperties => {
  const { L, spec, u } = c;
  const pad = `${18 * u}px ${34 * u}px`;
  const base: React.CSSProperties = {
    position: 'relative',
    padding: pad,
    borderRadius: L.radius,
    boxSizing: 'border-box',
  };
  switch (spec.plate) {
    case 'slab':
      return { ...base, background: L.plate, boxShadow: L.shadow,
        borderTop: `${L.ruleW * u}px solid ${c.accent}` };
    case 'railed':
      return { ...base, background: L.plate, boxShadow: L.shadow,
        borderLeft: `${7 * u}px solid ${c.accent}` };
    case 'bracket':
      return { ...base, background: 'rgba(16,20,22,0.34)', padding: `${24 * u}px ${40 * u}px` };
    case 'strip':
      return { ...base, background: L.plate, padding: `${11 * u}px ${26 * u}px` };
    case 'card':
      return { ...base, background: L.plate, boxShadow: L.shadow,
        padding: `${22 * u}px ${38 * u}px` };
    case 'tape':
      return { ...base, background: L.plate, borderRadius: 3,
        transform: 'rotate(-1.4deg)', boxShadow: L.shadow,
        padding: `${20 * u}px ${44 * u}px` };
    case 'note':
      return { ...base, background: L.plate, boxShadow: L.shadow,
        borderRadius: L.radius,
        padding: `${24 * u}px ${44 * u}px ${24 * u}px ${34 * u}px` };
    case 'ribbon':
      return { ...base, background: L.plate, boxShadow: L.shadow, borderRadius: 0,
        clipPath: 'polygon(0 0, 100% 0, calc(100% - 26px) 50%, 100% 100%, 0 100%)',
        padding: `${20 * u}px ${64 * u}px ${20 * u}px ${34 * u}px` };
    case 'hairline':
      return { ...base, background: 'transparent',
        borderTop: `${L.ruleW * u}px solid ${c.accent}`,
        borderBottom: `${L.ruleW * u}px solid rgba(255,255,255,0.28)`,
        padding: `${20 * u}px ${10 * u}px` };
    case 'stone':
      return { ...base, background: L.plate, boxShadow: L.shadow,
        padding: `${26 * u}px ${40 * u}px` };
    case 'margin':
      return { ...base, background: 'transparent',
        borderLeft: `${2 * u}px solid ${c.accent}`,
        padding: `${8 * u}px ${10 * u}px ${8 * u}px ${34 * u}px` };
    default:                       // 'bare'
      return { ...base, background: 'transparent', padding: `${8 * u}px 0` };
  }
};

// Украшение подложки, которое нельзя выразить рамкой: уголки-скобки,
// загнутый угол листка, рваный край скотча. Рисуется внутри плашки.
export const plateDecor = (c: Ctx): React.ReactNode => {
  const { L, spec, u } = c;
  if (spec.plate === 'bracket') {
    const arm = 34 * u;
    const w = L.ruleW * u;
    const corner = (s: React.CSSProperties, key: string) => (
      <div key={key} style={{ position: 'absolute', width: arm, height: arm, ...s }} />
    );
    return (
      <>
        {corner({ top: 0, left: 0, borderTop: `${w}px solid ${c.accent}`,
          borderLeft: `${w}px solid ${c.accent}` }, 'tl')}
        {corner({ bottom: 0, right: 0, borderBottom: `${w}px solid ${c.accent}`,
          borderRight: `${w}px solid ${c.accent}` }, 'br')}
      </>
    );
  }
  if (spec.plate === 'note') {
    return (
      <div style={{
        position: 'absolute', top: 0, right: 0, width: 30 * u, height: 30 * u,
        background: 'rgba(0,0,0,0.16)',
        clipPath: 'polygon(0 0, 100% 0, 100% 100%)',
      }} />
    );
  }
  if (spec.plate === 'tape') {
    return (
      <>
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 5 * u,
          background: 'rgba(120,88,48,0.30)' }} />
        <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: 5 * u,
          background: 'rgba(120,88,48,0.30)' }} />
      </>
    );
  }
  if (spec.plate === 'strip') {
    return (
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 6 * u,
        background: c.accent }} />
    );
  }
  return null;
};

// Тень под текстом нужна ровно там, где подложки нет: белая строка на светлом
// кадре иначе исчезает. На залитой подложке она только грязнит буквы.
export const inkShadow = (c: Ctx): string =>
  c.filled ? 'none' : '0 2px 10px rgba(0,0,0,0.75), 0 0 2px rgba(0,0,0,0.9)';

// Общая обёртка: место в кадре + появление + подложка.
export const Framed: React.FC<{ c: Ctx; children: React.ReactNode; grow?: boolean }> =
  ({ c, children, grow }) => {
    // ПРОЗРАЧНОСТЬ ПЕРЕМНОЖАЕТСЯ, А НЕ ПЕРЕЗАПИСЫВАЕТСЯ — см. revealOpacity.
    const rev = revealStyle(c.spec.reveal, c.k);
    return (
      <AbsoluteFill style={anchorBox(c.spec.anchor)}>
        <div style={{
          maxWidth: grow ? '100%' : '74%',
          width: c.spec.anchor === 'bottomBar' ? '100%' : undefined,
          ...rev,
          // строго ПОСЛЕ раскрытия rev, иначе снова затрут
          opacity: revealOpacity(rev, c.op),
        }}>
          <div style={plateStyle(c)}>
            {plateDecor(c)}
            {children}
          </div>
        </div>
      </AbsoluteFill>
    );
  };

// ---------- кегли и разбор содержимого ----------

export const titleStyle = (c: Ctx, size: number): React.CSSProperties => ({
  fontFamily: c.L.display,
  fontWeight: c.L.weightHi,
  fontSize: size * c.u,
  letterSpacing: c.L.track,
  textTransform: c.L.upper ? 'uppercase' : 'none',
  color: c.ink,
  lineHeight: 1.16,
  textShadow: inkShadow(c),
  margin: 0,
});

export const smallStyle = (c: Ctx, size: number): React.CSSProperties => ({
  fontFamily: c.L.body,
  fontSize: size * c.u,
  letterSpacing: c.L.upper ? '0.18em' : '0.05em',
  textTransform: c.L.upper ? 'uppercase' : 'none',
  color: c.filled ? c.ink : c.L.inkDim,
  opacity: c.filled ? 0.75 : 1,
  textShadow: inkShadow(c),
  margin: 0,
});

export const splitPair = (s: string): [string, string] => {
  const parts = (s || '').split('::');
  return [(parts[0] || '').trim(), (parts[1] || '').trim()];
};

export const pointOf = (pos: string): [number, number] => {
  const m = /point:([\d.]+),([\d.]+)/.exec(pos || '');
  if (!m) return [66, 50];
  return [parseFloat(m[1]), parseFloat(m[2])];
};

// КЕГЕЛЬ СЧИТАЕТСЯ ПО САМОМУ ДЛИННОМУ СЛОВУ, а не берётся константой.
//
// Слова разложены по flex-контейнеру с переносом, а он рвёт строку только по
// пробелам. Немецкое составное существительное пробелов не содержит:
// «Rechtsschutzversicherungsgesellschaften» — 39 знаков одним куском. На
// фиксированных 92px оно уезжало за правый край КАДРА, унося с собой конец
// заголовка: замер p13 — в кадре читалось 28 знаков из 39, дальше срез рамкой.
//
// Ширина знака снята с отрендеренных кадров, а не взята на глаз:
// «NACHSPANNVORGANG» (16 знаков) занял 991px при кегле 92 у harsh
// (991/16/92 = 0.67 em) и 828px у warm (0.56 em) — капс с разрядкой 0.13em
// шире антиквы строчными. Берём с запасом: 0.70 и 0.58.
//
// widthFrac — какая доля ширины КАДРА реально отведена под строку у этой
// формы: у полосы во всю ширину это почти единица, у левой колонки —半.
// Значение приходит из самой вёрстки формы, а не из воздуха.
export const fitSize = (c: Ctx, words: string[], maxSize: number,
                        widthFrac: number, minSize = 30): number => {
  const box = (c.p.width ?? 1920) * widthFrac;
  const em = c.L.upper ? 0.70 : 0.58;
  const longest = words.reduce((a, w) => Math.max(a, w.length), 0);
  // titleStyle сам умножает кегль на c.u, поэтому приводим к масштабу 1080p.
  return Math.max(minSize, Math.min(maxSize,
    box / Math.max(longest, 1) / em / c.u));
};

// Композиция полнокадровых типов. Якорь канала как «место» тут не годится
// (титр всегда крупный и по центру кадра), поэтому его номер переключает
// ВЫКЛЮЧКУ и высоту блока — силуэт получается разный, а тип остаётся собой.
export const fullLayout = (c: Ctx): { box: React.CSSProperties; align: React.CSSProperties } => {
  switch (c.ai) {
    case 1:
      return { box: { justifyContent: 'center', alignItems: 'flex-start', padding: '0 10%' },
        align: { textAlign: 'left' } };
    case 2:
      return { box: { justifyContent: 'flex-end', alignItems: 'center', padding: '0 10% 14%' },
        align: { textAlign: 'center' } };
    case 3:
      return { box: { justifyContent: 'flex-start', alignItems: 'flex-end', padding: '12% 10% 0' },
        align: { textAlign: 'right' } };
    default:
      return { box: { justifyContent: 'center', alignItems: 'center', padding: '0 10%' },
        align: { textAlign: 'center' } };
  }
};

// Откуда прилетает слово/строка. Тоже от канала: у harsh это короткий рывок
// сбоку, у warm подъём снизу, у contemplative почти неподвижное проявление.
export const wordShift = (c: Ctx, t: number): string => {
  switch (c.spec.reveal) {
    case 'wipeL': return `translateX(${(1 - t) * -40}px)`;
    case 'drop': return `translateY(${(1 - t) * -34}px)`;
    case 'blink': return `scale(${0.86 + t * 0.14})`;
    case 'unfold': return `scaleY(${0.4 + t * 0.6})`;
    case 'swing': return `rotate(${(1 - t) * -6}deg)`;
    case 'breathe': return `scale(${1.06 - t * 0.06})`;
    case 'drawRule': return `translateX(${(1 - t) * 26}px)`;
    case 'letterFade': return 'none';
    default: return `translateY(${(1 - t) * 30}px)`;
  }
};

// Слова заголовка, выложенные по очереди. Общее у всех форм титра и
// кинетики: слово появляется своим шагом и прилетает по почерку канала.
export const Words: React.FC<{ c: Ctx; words: string[]; size: number;
  justify: string; gapY?: number; accentEvery?: number }> =
  ({ c, words, size, justify, gapY, accentEvery }) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: justify,
      gap: `${(gapY ?? 10) * c.u}px ${18 * c.u}px` }}>
      {words.map((w, i) => {
        const t = step(c.frame, i * Math.max(2, Math.round(c.L.build / 3)), c.L.build);
        return (
          <span key={`${w}-${i}`} style={{
            ...titleStyle(c, size),
            display: 'inline-block',
            // Последний рубеж: если замер по знакам всё-таки промахнулся
            // (нестандартная гарнитура, кегль упёрся в нижний предел), слово
            // рвётся посередине. Некрасиво, но в кадре, а не за ним.
            maxWidth: '100%',
            overflowWrap: 'anywhere',
            color: accentEvery && i % accentEvery === accentEvery - 1
              ? c.accent : c.ink,
            opacity: c.spec.reveal === 'letterFade' ? t : Math.min(1, t * 1.4),
            filter: c.spec.reveal === 'letterFade' ? `blur(${(1 - t) * 8}px)` : undefined,
            transform: wordShift(c, t),
          }}>{w}</span>
        );
      })}
    </div>
  );

// ---------- сборка контекста ----------

// Один разбор «палитра + номер + тип -> всё, что нужно рисующей функции».
// Живёт здесь, а не в _forms.tsx, потому что нужен и формам по типам.
export const makeCtx = (p: VariantProps, L: Look, palette: Palette,
                        n: number, frame: number): Ctx => {
  const spec = formSpec(palette, n, p.type);
  const u = (p.height ?? 1080) / 1080;
  const k = interpolate(frame, [0, L.build], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const filled = isFilled(spec.plate);
  return {
    p, L, spec, frame, fps: p.fps ?? 30, u, k,
    // Номера приёмов в словаре канала. Нужны типам, у которых место в кадре
    // задано смыслом (титр, цитата, кинетика): якорь им не применить, но
    // РАЗНЫМИ они быть обязаны, иначе все восемь видов такого типа у канала
    // отличались бы только оттенком.
    ai: Math.max(0, L.anchors.indexOf(spec.anchor)),
    pi: Math.max(0, L.plates.indexOf(spec.plate)),
    op: p.enter * p.exit,
    filled,
    // На светлой подложке (тёплый канал) белый текст нечитаем — чернила
    // выбираются по подложке, а не по каналу.
    ink: filled ? L.onPlate : L.ink,
    accent: spec.accentSwap ? L.accent2 : L.accent,
    accent2: spec.accentSwap ? L.accent : L.accent2,
  };
};
