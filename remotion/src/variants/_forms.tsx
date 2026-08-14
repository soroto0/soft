import React from 'react';
import { AbsoluteFill, Img, interpolate, useCurrentFrame, Easing } from 'remotion';
import type { VariantProps } from '../types';
import { LOOKS, formSpec, isFixedLayout } from './_look';
import { numPairs, textPairs, redactLines, parseAmount, formatAmount } from '../payload';
import type { Look, Palette, FormSpec } from './_look';

// ОБЩЕЕ ТЕЛО ВСЕХ КАНАЛЬНЫХ ПЛАШЕК.
//
// Один компонент на все 18 типов и на все каналы — потому что различие между
// каналами живёт не в коде типа, а в словаре приёмов канала (_look.ts): где
// плашка стоит, чем подложена, как появляется, каким шрифтом набрана. Тип
// отвечает только за то, ЧТО нарисовано (строка, пара значений, фотография),
// канал — за то, КАК это выглядит.
//
// Почему не 18 отдельных файлов на канал: они были бы копиями друг друга с
// заменёнными константами, и любая правка разъезжалась бы по сотне мест.
// Здесь же новый вид канала — это одна строка в ch_*.tsx с другим номером,
// а номер раскладывается в непохожее сочетание приёмов (см. formSpec).
//
// Жёсткие правила рендера соблюдены по всему файлу, они не косметические:
//   * корневой AbsoluteFill БЕЗ фона — иначе плашка закрасит весь кадр;
//   * каждый interpolate с clamp — без него значение уезжает за диапазон и
//     плашка разрастается на весь экран и не уходит;
//   * p.enter и p.exit умножены в прозрачность — их считает ядро, чтобы все
//     плашки ролика появлялись и уходили синхронно;
//   * ничего случайного: кадры считаются параллельно и не по порядку;
//   * подложка рисуется ТОЛЬКО когда есть что положить внутрь — см. NOTHING.

type Ctx = {
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

const hash = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

// Число на счётчике набирается от нуля к значению, и ОКРУГЛЯТЬ ЕГО ДО ЦЕЛОГО
// нельзя: замер по настоящим роликам — «Theorie:0.6,Praxis:0.0» показывалось
// как «1» и «0», «Soll-Anstieg:0.3 m/Tag» как «0». Столбик рисовался верной
// высоты, а подпись над ним врала — хуже, чем если бы врало и то и другое,
// потому что противоречие зритель замечает. Держим столько знаков после
// запятой, сколько их в исходном значении (не больше двух: третий знак на
// плашке в кадре всё равно не читается).
const decimalsOf = (value: number): number => {
  const s = String(value);
  const dot = s.indexOf('.');
  return dot < 0 ? 0 : Math.min(2, s.length - dot - 1);
};

// dec приходит ОДИН на весь набор: «0.6» рядом с «0» в одной таблице
// читается как разная точность замера, хотя это одна и та же величина.
// Берём наибольшее число знаков по строке и держим его у всех.
const countText = (value: number, t: number, dec: number): string =>
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
const NOTHING = <AbsoluteFill />;

// Ступенька 0..1 с задержкой — единственный способ сделать очередь
// (слова, строки, столбики) без таймеров и случайностей.
const step = (frame: number, from: number, len: number) =>
  interpolate(frame, [from, from + Math.max(len, 1)], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

// ---------- место в кадре ----------

const anchorBox = (anchor: string): React.CSSProperties => {
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

const revealStyle = (reveal: string, k: number): React.CSSProperties => {
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

// ---------- чем плашка подложена ----------

const FILLED = ['slab', 'railed', 'strip', 'card', 'tape', 'note', 'ribbon', 'stone'];

const isFilled = (plate: string) => FILLED.indexOf(plate) >= 0;

const plateStyle = (c: Ctx): React.CSSProperties => {
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
const plateDecor = (c: Ctx): React.ReactNode => {
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
const inkShadow = (c: Ctx): string =>
  c.filled ? 'none' : '0 2px 10px rgba(0,0,0,0.75), 0 0 2px rgba(0,0,0,0.9)';

// Общая обёртка: место в кадре + появление + подложка.
const Framed: React.FC<{ c: Ctx; children: React.ReactNode; grow?: boolean }> =
  ({ c, children, grow }) => {
    // ПРОЗРАЧНОСТЬ ПЕРЕМНОЖАЕТСЯ, А НЕ ПЕРЕЗАПИСЫВАЕТСЯ. c.op — это
    // p.enter * p.exit, то есть въезд и уход плашки. Половина приёмов
    // появления возвращает СВОЮ opacity (snap, blink, fadeUp, breathe,
    // drawRule, driftUp, letterFade), и раскрытие их объекта стояло ПОСЛЕ
    // «opacity: c.op» — то есть просто затирало уход. Плашка держалась до
    // последнего кадра и пропадала рывком.
    //
    // Замер на живом рендере einsturzpunkt/2026-08-11_2: 59 готовых
    // секвенций из 80 имели последний кадр ровно той же средней альфы, что и
    // середина. Въезд при этом был цел у всех 82 — потому что у приёмов
    // opacity растёт от k и на въезде совпадает с c.op по направлению.
    // Своего затухания ffmpeg не добавляет (render.py кладёт голый overlay с
    // enable=between), так что альфа в PNG и есть единственный уход.
    //
    // У harsh это било по всем номерам сразу: reveal = floor(n/16) % 4, то
    // есть у вариантов 1..15 приём один и тот же — snap.
    const rev = revealStyle(c.spec.reveal, c.k);
    return (
      <AbsoluteFill style={anchorBox(c.spec.anchor)}>
        <div style={{
          maxWidth: grow ? '100%' : '74%',
          width: c.spec.anchor === 'bottomBar' ? '100%' : undefined,
          ...rev,
          // строго ПОСЛЕ раскрытия rev, иначе снова затрут
          opacity: c.op * (typeof rev.opacity === 'number' ? rev.opacity : 1),
        }}>
          <div style={plateStyle(c)}>
            {plateDecor(c)}
            {children}
          </div>
        </div>
      </AbsoluteFill>
    );
  };

// ---------- содержимое по типам ----------

const titleStyle = (c: Ctx, size: number): React.CSSProperties => ({
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

const smallStyle = (c: Ctx, size: number): React.CSSProperties => ({
  fontFamily: c.L.body,
  fontSize: size * c.u,
  letterSpacing: c.L.upper ? '0.18em' : '0.05em',
  textTransform: c.L.upper ? 'uppercase' : 'none',
  color: c.filled ? c.ink : c.L.inkDim,
  opacity: c.filled ? 0.75 : 1,
  textShadow: inkShadow(c),
  margin: 0,
});

const splitPair = (s: string): [string, string] => {
  const parts = (s || '').split('::');
  return [(parts[0] || '').trim(), (parts[1] || '').trim()];
};

const pointOf = (pos: string): [number, number] => {
  const m = /point:([\d.]+),([\d.]+)/.exec(pos || '');
  if (!m) return [66, 50];
  return [parseFloat(m[1]), parseFloat(m[2])];
};

const bodyLine = (c: Ctx, size: number) => (
  <div style={titleStyle(c, size)}>{c.p.content}</div>
);

// lower3 / banner: одна строка. Различие между ними — кегль и ширина, всё
// остальное задаёт канал.
const renderLine = (c: Ctx, size: number) => {
  if (!(c.p.content || '').trim()) return NOTHING;
  return (
    <Framed c={c} grow={c.spec.anchor === 'bottomBar'}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 * c.u }}>
        <div style={{
          width: 10 * c.u, height: 10 * c.u, borderRadius: c.L.radius > 4 ? '50%' : 0,
          background: c.accent2, flexShrink: 0,
          transform: `scale(${clamp01(c.k * 1.4)})`,
        }} />
        {bodyLine(c, size)}
      </div>
    </Framed>
  );
};

// Композиция полнокадровых типов. Якорь канала как «место» тут не годится
// (титр всегда крупный и по центру кадра), поэтому его номер переключает
// ВЫКЛЮЧКУ и высоту блока — силуэт получается разный, а тип остаётся собой.
const fullLayout = (c: Ctx): { box: React.CSSProperties; align: React.CSSProperties } => {
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
const wordShift = (c: Ctx, t: number): string => {
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

const renderTitleCard = (c: Ctx) => {
  const [head, sub] = splitPair(c.p.content);
  const words = head.split(/\s+/).filter((w) => w.length > 0);
  // Без заголовка от титра остаётся подложка, черта и номер главы — ровно
  // то, что владелец увидел в ролике как пустую плашку («::01», название
  // главы потерялось при генерации).
  if (!words.length) return NOTHING;
  const lay = fullLayout(c);
  const justify = c.ai === 1 ? 'flex-start' : (c.ai === 3 ? 'flex-end' : 'center');

  // КЕГЕЛЬ СЧИТАЕТСЯ ПО САМОМУ ДЛИННОМУ СЛОВУ, а не берётся константой.
  //
  // Слова разложены по flex-контейнеру с переносом, а он рвёт строку только
  // по пробелам. Немецкое составное существительное пробелов не содержит:
  // «Rechtsschutzversicherungsgesellschaften» — 39 знаков одним куском. На
  // фиксированных 92px оно уезжало за правый край КАДРА, унося с собой конец
  // заголовка: замер p13 — в кадре читалось 28 знаков из 39, дальше срез
  // рамкой. Карточки глав как раз такие («Der verhängnisvolle
  // Nachspannvorgang»), и приходят они из генерации, где длину никто не
  // ограничивает.
  //
  // Ширина знака снята с отрендеренных кадров, а не взята на глаз:
  // «NACHSPANNVORGANG» (16 знаков) занял 991px при кегле 92 у harsh
  // (991/16/92 = 0.67 em) и 828px у warm (0.56 em) — капс с разрядкой 0.13em
  // шире антиквы строчными. Берём с запасом: 0.70 и 0.58.
  //
  // Ширина коробки — из самой вёрстки, а не число из воздуха: lay.box даёт
  // padding 0 10% (остаётся 80% кадра), блок ниже ограничен maxWidth 86%,
  // из них уходят поля подложки 34px с каждой стороны.
  const box = (c.p.width ?? 1920) * 0.8 * 0.86 - 68 * c.u;   // реальные px
  const em = c.L.upper ? 0.70 : 0.58;
  const longest = words.reduce((a, w) => Math.max(a, w.length), 0);
  // titleStyle сам умножает кегль на c.u, поэтому приводим к масштабу 1080p.
  // Нижний предел 34 — ниже титр перестаёт быть титром; до него дело дойдёт
  // только на слове длиннее 60 знаков, а там уже сработает overflowWrap.
  const size = Math.max(34, Math.min(c.ai === 2 ? 74 : 92,
    box / Math.max(longest, 1) / em / c.u));

  const body = (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: justify,
        gap: `${10 * c.u}px ${18 * c.u}px` }}>
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
              opacity: c.spec.reveal === 'letterFade' ? t : Math.min(1, t * 1.4),
              filter: c.spec.reveal === 'letterFade' ? `blur(${(1 - t) * 8}px)` : undefined,
              transform: wordShift(c, t),
            }}>{w}</span>
          );
        })}
      </div>
      <div style={{
        height: c.L.ruleW * c.u, background: c.accent,
        margin: `${26 * c.u}px ${c.ai === 0 || c.ai === 2 ? 'auto' : '0'} 0`,
        width: `${clamp01(c.k) * 46}%`,
      }} />
      {sub ? (
        <div style={{ ...smallStyle(c, 30), marginTop: 20 * c.u, opacity: clamp01(c.k) }}>
          {sub}
        </div>
      ) : null}
    </>
  );
  return (
    <AbsoluteFill style={lay.box}>
      <div style={{ opacity: c.op, maxWidth: '86%', ...lay.align }}>
        {/* На залитой подложке титр читается как карточка, без неё — как
            надпись прямо по кадру. Это тоже приём канала, а не украшение. */}
        {c.filled ? (
          <div style={plateStyle(c)}>{plateDecor(c)}{body}</div>
        ) : body}
      </div>
    </AbsoluteFill>
  );
};

const renderKinetic = (c: Ctx) => {
  const words = (c.p.content || '').split(/\s+/).filter((w) => w.length > 0);
  if (!words.length) return NOTHING;
  const gap = Math.max(2, Math.round(c.L.build / 2));
  const lay = fullLayout(c);
  const justify = c.ai === 1 ? 'flex-start' : (c.ai === 3 ? 'flex-end' : 'center');
  return (
    <AbsoluteFill style={lay.box}>
      <div style={{ opacity: c.op, display: 'flex', flexWrap: 'wrap',
        justifyContent: justify, maxWidth: '86%', gap: `${8 * c.u}px ${16 * c.u}px` }}>
        {words.map((w, i) => {
          const t = step(c.frame, i * gap, Math.max(4, c.L.build));
          return (
            <span key={`${w}-${i}`} style={{
              ...titleStyle(c, c.ai === 2 ? 54 : 64),
              display: 'inline-block',
              // каждое n-е слово акцентом; шаг зависит от подложки канала,
              // поэтому ритм подсветки у восьми видов разный
              color: i % (2 + c.pi) === 1 ? c.accent : c.ink,
              opacity: t,
              transform: wordShift(c, t),
            }}>{w}</span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const renderMarker = (c: Ctx) => {
  const words = (c.p.content || '').split(/\s+/).filter((w) => w.length > 0);
  if (!words.length) return NOTHING;
  const gap = Math.max(3, Math.round(c.L.build / 2));
  const lay = fullLayout(c);
  const justify = c.ai === 1 ? 'flex-start' : (c.ai === 3 ? 'flex-end' : 'center');
  // Толщина и посадка полосы — от подложки канала: сплошная заливка во всю
  // строку, широкий росчерк по нижней трети, тонкое подчёркивание, наклонный
  // мазок. Одна и та же техника, четыре разных следа маркера.
  const barTop = ['12%', '46%', '72%', '18%'][c.pi];
  const barBot = ['6%', '4%', '8%', '10%'][c.pi];
  const tilt = c.pi === 3 ? 'rotate(-1.6deg)' : 'none';
  return (
    <AbsoluteFill style={lay.box}>
      <div style={{ opacity: c.op, display: 'flex', flexWrap: 'wrap', maxWidth: '86%',
        justifyContent: justify, gap: `${6 * c.u}px ${14 * c.u}px` }}>
          {words.map((w, i) => {
            const t = step(c.frame, i * gap, gap * 2);
            // слово перекрашивается ПОД проходящей полосой, иначе светлое по
            // светлому пропадает — это главный способ испортить этот тип
            const covered = t > 0.55 && c.pi < 2;
            return (
              <span key={`${w}-${i}`} style={{ position: 'relative', display: 'inline-block' }}>
                <span style={{
                  position: 'absolute', left: -4 * c.u, right: -4 * c.u,
                  top: barTop, bottom: barBot,
                  background: c.accent, opacity: c.pi === 2 ? 1 : 0.82,
                  transformOrigin: 'left center',
                  transform: `scaleX(${t}) ${tilt}`,
                }} />
                <span style={{
                  ...titleStyle(c, 52),
                  position: 'relative',
                  color: covered ? (c.L.upper ? '#12161a' : '#1d1409') : c.ink,
                }}>{w}</span>
              </span>
            );
          })}
      </div>
    </AbsoluteFill>
  );
};

const renderQuote = (c: Ctx) => {
  const [text, who] = splitPair(c.p.content);
  // Автор без цитаты — это кавычка, черта и фамилия на подложке.
  if (!text) return NOTHING;
  const lay = fullLayout(c);
  const inner = (
    <>
        <div style={{
          fontFamily: c.L.quote, fontSize: 120 * c.u, lineHeight: 0.5,
          color: c.accent, opacity: 0.85, marginBottom: 18 * c.u,
        }}>&ldquo;</div>
        <div style={{
          fontFamily: c.L.quote, fontStyle: 'italic', fontWeight: 400,
          fontSize: 54 * c.u, lineHeight: 1.34, color: c.ink,
          textShadow: inkShadow(c),
        }}>{text}</div>
        <div style={{
          height: c.L.ruleW * c.u, background: c.accent,
          width: `${clamp01(c.k) * 34}%`, margin: `${24 * c.u}px 0 ${14 * c.u}px`,
        }} />
        {who ? (
          <div style={{ ...smallStyle(c, 28), color: c.L.inkDim, opacity: clamp01(c.k) }}>
            {who}
          </div>
        ) : null}
    </>
  );
  return (
    <AbsoluteFill style={lay.box}>
      <div style={{ opacity: c.op, maxWidth: '80%', ...lay.align,
        ...revealStyle(c.spec.reveal, c.k) }}>
        {c.filled ? (
          <div style={plateStyle(c)}>{plateDecor(c)}{inner}</div>
        ) : inner}
      </div>
    </AbsoluteFill>
  );
};

const renderStamp = (c: Ctx) => {
  const [main, sub] = splitPair(c.p.content);
  if (!main) return NOTHING;
  return (
    <Framed c={c}>
      <div style={titleStyle(c, 40)}>{main}</div>
      {sub ? (
        <div style={{ ...smallStyle(c, 24), marginTop: 10 * c.u }}>{sub}</div>
      ) : null}
      <div style={{
        height: c.L.ruleW * c.u, background: c.accent2, marginTop: 12 * c.u,
        width: `${clamp01(c.k) * 100}%`,
      }} />
    </Framed>
  );
};

const renderCounter = (c: Ctx) => {
  const m = /([^\d]*)([\d][\d,.\s]*)(.*)/.exec(c.p.content || '') ;
  // Без единой цифры счётчик показывал «0» — число, которого никто не
  // называл. Ложная цифра в кадре хуже отсутствующей плашки.
  if (!m) return NOTHING;
  const pre = m[1];
  const raw = m[2];
  const post = m[3];
  // Разряды и десятичные разбирает parseAmount: раньше здесь стояло
  // «есть точка — значит дробное», и немецкое «30.000 Zuschauer» уходило в
  // кадр как «30.0». См. замер в payload.ts.
  const { value: target, decimals, group } = parseAmount(raw);
  const grow = interpolate(c.frame, [0, Math.max(c.L.build * 2, 18)], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const cur = target * grow;
  const shown = formatAmount(cur, decimals, group);
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ opacity: c.op, ...revealStyle(c.spec.reveal, c.k) }}>
        <div style={plateStyle(c)}>
          {plateDecor(c)}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center' }}>
            <span style={{ ...titleStyle(c, 64), color: c.accent }}>{pre}</span>
            <span style={{ ...titleStyle(c, 132) }}>{shown}</span>
            <span style={{ ...titleStyle(c, 64), color: c.accent }}>{post}</span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Разбор пар переехал в src/payload.ts: им же проверяют содержимое ворота в
// Overlay.tsx. Пока разбор был здесь, а проверка там — они читали строку
// по-разному, и «Kein Datensatz vorhanden» проходило ворота, а сюда
// приходило нулём пар.

const renderBars = (c: Ctx) => {
  const data = numPairs(c.p.content);
  // Ноль пар — подложка растянута на minWidth 780px и пуста внутри. Замер:
  // тёмная полоса 848x36 в верхней трети кадра, ни одного знака.
  if (!data.length) return NOTHING;
  const max = data.reduce((a, d) => Math.max(a, d.value), 0) || 1;
  const dec = data.reduce((a, d) => Math.max(a, decimalsOf(d.value)), 0);
  return (
    <Framed c={c} grow>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 * c.u,
        minWidth: 780 * c.u }}>
        {data.map((d, i) => {
          const t = step(c.frame, i * Math.max(2, Math.round(c.L.build / 2)), c.L.build * 2);
          return (
            <div key={`${d.label}-${i}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between',
                marginBottom: 6 * c.u }}>
                <span style={smallStyle(c, 28)}>{d.label}</span>
                <span style={{ ...smallStyle(c, 28), color: c.accent, opacity: 1 }}>
                  {countText(d.value, t, dec)}
                </span>
              </div>
              <div style={{ height: 16 * c.u, background: 'rgba(128,128,128,0.28)',
                borderRadius: c.L.radius > 4 ? 6 * c.u : 0 }}>
                <div style={{
                  height: '100%', width: `${(d.value / max) * 100 * t}%`,
                  background: i % 2 === 0 ? c.accent : c.accent2,
                  borderRadius: c.L.radius > 4 ? 6 * c.u : 0,
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </Framed>
  );
};

const renderInfographic = (c: Ctx) => {
  const data = numPairs(c.p.content).slice(0, 4);
  if (!data.length) return NOTHING;
  const max = data.reduce((a, d) => Math.max(a, d.value), 0) || 1;
  const dec = data.reduce((a, d) => Math.max(a, decimalsOf(d.value)), 0);
  const R = 62 * c.u;
  const C = 2 * Math.PI * R;
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ opacity: c.op, ...revealStyle(c.spec.reveal, c.k) }}>
        <div style={{ ...plateStyle(c), display: 'flex', gap: 34 * c.u }}>
          {plateDecor(c)}
          {data.map((d, i) => {
            const t = step(c.frame, i * Math.max(3, Math.round(c.L.build / 2)), c.L.build * 2);
            const frac = (d.value / max) * t;
            return (
              <div key={`${d.label}-${i}`} style={{ textAlign: 'center' }}>
                <svg width={R * 2 + 20 * c.u} height={R * 2 + 20 * c.u}>
                  <circle cx={R + 10 * c.u} cy={R + 10 * c.u} r={R} fill="none"
                    stroke="rgba(128,128,128,0.30)" strokeWidth={10 * c.u} />
                  <circle cx={R + 10 * c.u} cy={R + 10 * c.u} r={R} fill="none"
                    stroke={i % 2 === 0 ? c.accent : c.accent2} strokeWidth={10 * c.u}
                    strokeDasharray={C} strokeDashoffset={C * (1 - frac)}
                    strokeLinecap={c.L.radius > 4 ? 'round' : 'butt'}
                    transform={`rotate(-90 ${R + 10 * c.u} ${R + 10 * c.u})`} />
                  <text x={R + 10 * c.u} y={R + 18 * c.u} textAnchor="middle"
                    fill={c.ink} fontFamily={c.L.display} fontSize={38 * c.u}>
                    {countText(d.value, t, dec)}
                  </text>
                </svg>
                <div style={smallStyle(c, 22)}>{d.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const renderTimeline = (c: Ctx) => {
  // Через общий разбор: свой не проверял indexOf(':') на -1, и строка БЕЗ
  // двоеточия давала год «Nur eine Zeile Tex» — всю строку без последнего
  // знака (slice с отрицательным индексом отсчитывает от конца). В кадр
  // уходил обрубок, и ни одной ошибки в журнале.
  const items = textPairs(c.p.content);
  if (!items.length) return NOTHING;
  return (
    <Framed c={c} grow>
      <div style={{ position: 'relative', minWidth: 760 * c.u, paddingTop: 10 * c.u }}>
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 40 * c.u,
          height: c.L.ruleW * c.u, background: c.L.edge, opacity: 0.7,
        }} />
        <div style={{
          position: 'absolute', left: 0, top: 40 * c.u, height: c.L.ruleW * c.u,
          width: `${clamp01(c.k) * 100}%`, background: c.accent,
        }} />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {items.map((it, i) => {
            const t = step(c.frame, i * Math.max(3, Math.round(c.L.build / 2)), c.L.build * 2);
            return (
              <div key={`${it.year}-${i}`} style={{ textAlign: 'center', opacity: t,
                transform: `translateY(${(1 - t) * 12}px)` }}>
                <div style={{ ...titleStyle(c, 30), marginBottom: 8 * c.u }}>{it.year}</div>
                <div style={{
                  width: 14 * c.u, height: 14 * c.u, background: c.accent,
                  borderRadius: c.L.radius > 4 ? '50%' : 0, margin: '0 auto',
                }} />
                <div style={{ ...smallStyle(c, 22), marginTop: 10 * c.u, maxWidth: 190 * c.u }}>
                  {it.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Framed>
  );
};

const renderCompare = (c: Ctx) => {
  const [left, right] = splitPair(c.p.content);
  // Рамки одинаковы по размеру и рисуются парой: половина без текста даёт не
  // «полплашки», а пустой прямоугольник рядом с заполненным.
  if (!left || !right) return NOTHING;
  const side = (txt: string, i: number) => {
    const t = step(c.frame, i * Math.max(3, c.L.build), c.L.build * 2);
    return (
      <div style={{
        flex: 1, textAlign: 'center', opacity: t,
        transform: `translateX(${(1 - t) * (i === 0 ? -40 : 40)}px)`,
      }}>
        <div style={{ ...plateStyle(c) }}>
          {plateDecor(c)}
          <div style={titleStyle(c, 44)}>{txt}</div>
        </div>
      </div>
    );
  };
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', padding: '0 8%' }}>
      <div style={{ opacity: c.op, display: 'flex', alignItems: 'center',
        gap: 26 * c.u, width: '100%' }}>
        {side(left, 0)}
        <div style={{
          width: c.L.ruleW * 2 * c.u, height: `${clamp01(c.k) * 120 * c.u}px`,
          background: c.accent, flexShrink: 0,
        }} />
        {side(right, 1)}
      </div>
    </AbsoluteFill>
  );
};

const renderRedact = (c: Ctx) => {
  // Пустые строки выкидываются: лист документа непрозрачен и растянут на
  // minWidth 620px, а split('::') на «Bericht::» даёт вторую строку-пустышку,
  // под которую всё равно отводится место.
  const lines = redactLines(c.p.content);
  if (!lines.length) return NOTHING;
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ opacity: c.op, ...revealStyle(c.spec.reveal, c.k) }}>
        <div style={{ ...plateStyle(c), minWidth: 620 * c.u }}>
          {plateDecor(c)}
          {lines.map((ln, i) => {
            const hidden = ln.hidden;
            const txt = ln.text;
            const t = step(c.frame, 6 + i * Math.max(3, Math.round(c.L.build / 2)), c.L.build);
            return (
              <div key={`${txt}-${i}`} style={{ position: 'relative', margin: `${8 * c.u}px 0` }}>
                <div style={{
                  fontFamily: c.L.body, fontSize: 32 * c.u, color: c.ink,
                  letterSpacing: '0.03em', textShadow: inkShadow(c),
                }}>{txt}</div>
                {hidden ? (
                  <div style={{
                    position: 'absolute', left: -6 * c.u, top: 0, bottom: 0,
                    width: `calc(100% + ${12 * c.u}px)`, background: '#0b0d0e',
                    transformOrigin: 'left center', transform: `scaleX(${t})`,
                  }} />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const renderCallout = (c: Ctx) => {
  // Без подписи от выноски остаётся кружок, линия и пустая подложка на её
  // конце — указатель в никуда.
  if (!(c.p.content || '').trim()) return NOTHING;
  const [px, py] = pointOf(c.p.pos);
  const toRight = px < 55;
  const len = 190 * c.u * clamp01(c.k);
  return (
    <AbsoluteFill style={{ opacity: c.op }}>
      <div style={{
        position: 'absolute', left: `${px}%`, top: `${py}%`,
        width: 26 * c.u, height: 26 * c.u, marginLeft: -13 * c.u, marginTop: -13 * c.u,
        border: `${c.L.ruleW * c.u}px solid ${c.accent}`,
        borderRadius: '50%',
        transform: `scale(${0.4 + clamp01(c.k) * 0.6})`,
      }} />
      <div style={{
        position: 'absolute', left: `${px}%`, top: `${py}%`,
        width: len, height: c.L.ruleW * c.u, background: c.accent,
        transformOrigin: 'left center',
        transform: `rotate(${toRight ? -22 : 158}deg)`,
      }} />
      <div style={{
        position: 'absolute',
        left: toRight ? `calc(${px}% + ${175 * c.u}px)` : undefined,
        right: toRight ? undefined : `calc(${100 - px}% + ${175 * c.u}px)`,
        top: `calc(${py}% - ${100 * c.u}px)`,
        maxWidth: 460 * c.u,
        ...revealStyle(c.spec.reveal, c.k),
      }}>
        <div style={plateStyle(c)}>
          {plateDecor(c)}
          <div style={titleStyle(c, 34)}>{c.p.content}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const renderHighlight = (c: Ctx) => {
  if (!(c.p.content || '').trim()) return NOTHING;
  const [px, py] = pointOf(c.p.pos);
  const R = 92 * c.u;
  const C = 2 * Math.PI * R;
  return (
    <AbsoluteFill style={{ opacity: c.op }}>
      <svg style={{
        position: 'absolute', left: `${px}%`, top: `${py}%`,
        width: R * 2 + 16 * c.u, height: R * 2 + 16 * c.u,
        marginLeft: -(R + 8 * c.u), marginTop: -(R + 8 * c.u),
      }}>
        <circle cx={R + 8 * c.u} cy={R + 8 * c.u} r={R} fill="none"
          stroke={c.accent} strokeWidth={c.L.ruleW * 1.6 * c.u}
          strokeDasharray={C} strokeDashoffset={C * (1 - clamp01(c.k))}
          transform={`rotate(-90 ${R + 8 * c.u} ${R + 8 * c.u})`} />
      </svg>
      <div style={{
        position: 'absolute', left: `calc(${px}% + ${R + 26 * c.u}px)`,
        top: `calc(${py}% - ${24 * c.u}px)`, maxWidth: 420 * c.u,
        opacity: clamp01((c.k - 0.5) * 2),
      }}>
        <div style={plateStyle(c)}>
          {plateDecor(c)}
          <div style={titleStyle(c, 30)}>{c.p.content}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const renderPopup = (c: Ctx) => {
  // Без картинки остаётся рамка/подложка вокруг ничего: <Img src=""> ничего
  // не займёт, а padding и фон подложки нарисуются.
  if (!(c.p.img || '').trim()) return NOTHING;
  const drift = Math.sin(c.frame / 24) * 6 * c.u;
  return (
    <AbsoluteFill style={anchorBox(c.spec.anchor === 'bottomBar' ? 'tr' : c.spec.anchor)}>
      <div style={{
        opacity: c.op, ...revealStyle(c.spec.reveal, c.k),
      }}>
        <div style={{
          padding: c.filled ? 12 * c.u : 0,
          background: c.filled ? c.L.plate : 'transparent',
          borderRadius: c.L.radius,
          boxShadow: c.L.shadow,
          border: c.filled ? 'none' : `${c.L.ruleW * c.u}px solid ${c.accent}`,
          transform: `translateY(${drift}px)`,
        }}>
          <Img src={c.p.img ?? ''} style={{
            display: 'block', width: 520 * c.u, height: 'auto',
            borderRadius: Math.max(0, c.L.radius - 6),
          }} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

const renderCollage = (c: Ctx) => {
  const items = (c.p.items ?? []).filter((it) => it && it.img).slice(0, 3);
  if (!items.length) return NOTHING;
  // Раскладка карточек — четвёртый приём канала по счёту якоря: ровный ряд,
  // ряд «лесенкой», веер внахлёст, ряд со смещением вниз у краёв.
  const offsetY = (i: number) => [0, i * 26, (i - 1) * 18, Math.abs(i - 1) * 30][c.ai] * c.u;
  const overlap = c.ai === 2 ? -60 * c.u : 26 * c.u;
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ opacity: c.op, display: 'flex', gap: overlap, alignItems: 'center' }}>
        {items.map((it, i) => {
          const t = step(c.frame, i * Math.max(4, c.L.build), c.L.build * 2);
          const tilt = ((hash(it.label || String(i)) % 7) - 3) * (c.L.radius > 4 ? 1.2 : 0.4);
          return (
            <div key={`${it.label}-${i}`} style={{
              opacity: t,
              transform: `translateY(${(1 - t) * 46 + offsetY(i)}px) rotate(${tilt}deg)`,
              zIndex: 10 - i,
              background: c.filled ? c.L.plate : 'rgba(12,14,16,0.55)',
              padding: 12 * c.u,
              border: c.filled ? 'none' : `${c.L.ruleW * c.u}px solid ${c.accent}`,
              borderRadius: c.L.radius, boxShadow: c.L.shadow,
            }}>
              <Img src={it.img} style={{ display: 'block', width: 340 * c.u, height: 'auto' }} />
              <div style={{ ...smallStyle(c, 22), marginTop: 10 * c.u,
                color: c.filled ? c.L.onPlate : c.ink, textAlign: 'center' }}>
                {it.label}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const renderGallery = (c: Ctx) => {
  // Карточка галереи рисует непрозрачную подложку L.plate вокруг <Img>:
  // пункт без картинки — тёмный прямоугольник, уезжающий вглубь кадра.
  const items = (c.p.items ?? []).filter((it) => it && it.img).slice(0, 4);
  if (!items.length) return NOTHING;
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center',
      perspective: `${1400 * c.u}px` }}>
      <div style={{ opacity: c.op, position: 'relative', width: 900 * c.u, height: 520 * c.u,
        transformStyle: 'preserve-3d' }}>
        {items.map((it, i) => {
          // ШАГ СЧИТАЕТСЯ ОТ ДЛИТЕЛЬНОСТИ ПЛАШКИ, А НЕ ОТ ТЕМПА КАНАЛА.
          // Было Math.max(20, c.L.build * 3) — у harsh это 21 кадр на
          // карточку, четыре карточки заканчивались к 97-му кадру, а плашка
          // живёт 120. Замер: кадры 5..75 давали 16.4%..3% закрашенного,
          // кадры 85, 100 и 119 — ровно 0.00%. Последние 35 кадров из 120
          // зритель смотрел на пустое место, и чем короче был текст, тем
          // раньше галерея гасла.
          //
          // Раскладываем карточки так, чтобы последняя доезжала к концу:
          // при n карточках последняя стартует на (n-1)*span и идёт span*1.6,
          // значит span = всего / (n + 0.6). Пол в 20 кадров оставлен для
          // совсем коротких плашек — там лучше обрезать хвост, чем мелькать.
          const total = Math.max(1, Math.round((c.p.dur || 4) * c.fps));
          const span = Math.max(20, total / (items.length + 0.6));
          const t = interpolate(c.frame, [i * span, i * span + span * 1.6], [0, 1], {
            extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
          });
          // Направление движения по Z — от якоря канала: карточки идут на
          // зрителя, уходят от него, всплывают сбоку. Это единственное, что
          // в этом типе можно менять, не разрушая сам приём («глубина»).
          const zFrom = [-700, 260, -520, -700][c.ai] * c.u;
          const zTo = [260, -700, 200, 200][c.ai] * c.u;
          const z = interpolate(t, [0, 1], [zFrom, zTo], {
            extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
          });
          // Последняя карточка НЕ гаснет сама: её убирает уход всей плашки
          // (c.op = p.enter * p.exit). Иначе галерея заканчивалась пустым
          // кадром даже при верно посчитанном шаге — предыдущие карточки уже
          // ушли, а последняя гасла по собственному расписанию.
          const last = i === items.length - 1;
          const vis = interpolate(
            t,
            last ? [0, 0.2, 1, 1.0001] : [0, 0.2, 0.78, 1],
            [0, 1, 1, last ? 1 : 0],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          return (
            <div key={`${it.label}-${i}`} style={{
              position: 'absolute', left: '50%', top: '50%',
              transform: `translate(-50%,-50%) translateZ(${z}px)`,
              opacity: vis,
              background: c.L.plate, padding: 12 * c.u,
              borderRadius: c.L.radius, boxShadow: c.L.shadow,
            }}>
              <Img src={it.img} style={{ display: 'block', width: 460 * c.u, height: 'auto' }} />
              <div style={{ ...smallStyle(c, 22), marginTop: 8 * c.u,
                color: c.filled ? c.L.onPlate : c.ink, textAlign: 'center' }}>
                {it.label}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ---------- сборка ----------

export const Formed: React.FC<{ p: VariantProps; palette: Palette; n: number }> =
  ({ p, palette, n }) => {
    const frame = useCurrentFrame();
    const L = LOOKS[palette];
    const spec = formSpec(palette, n, p.type);
    const u = (p.height ?? 1080) / 1080;
    const k = interpolate(frame, [0, L.build], [0, 1], {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    const filled = isFilled(spec.plate);
    const c: Ctx = {
      p, L, spec, frame, fps: p.fps ?? 30, u, k,
      // Номера приёмов в словаре канала. Нужны типам, у которых место в кадре
      // задано смыслом (титр, цитата, кинетика): якорь им не применить, но
      // РАЗНЫМИ они быть обязаны, иначе все восемь видов такого типа у канала
      // отличались бы только оттенком — ровно та жалоба, с которой всё
      // началось. Номер якоря у них переключает композицию, номер подложки —
      // способ подачи.
      ai: Math.max(0, L.anchors.indexOf(spec.anchor)),
      pi: Math.max(0, L.plates.indexOf(spec.plate)),
      op: p.enter * p.exit,
      filled,
      // На светлой подложке (тёплый канал) белый текст нечитаем — чернила
      // выбираются по подложке, а не по каналу. Ровно на этом ломались
      // варианты с bannerFrom/bannerTo во встроенном виде.
      ink: filled ? L.onPlate : L.ink,
      accent: spec.accentSwap ? L.accent2 : L.accent,
      accent2: spec.accentSwap ? L.accent : L.accent2,
    };
    // У типов с заданным смыслом местом якорь канала не спрашиваем.
    if (isFixedLayout(p.type)) {
      switch (p.type) {
        case 'titlecard': return renderTitleCard(c);
        case 'kinetic': return renderKinetic(c);
        case 'marker': return renderMarker(c);
        case 'quote': return renderQuote(c);
        case 'counter': return renderCounter(c);
        case 'infographic': return renderInfographic(c);
        case 'compare': return renderCompare(c);
        case 'redact': return renderRedact(c);
        case 'callout': return renderCallout(c);
        case 'highlight': return renderHighlight(c);
        case 'popup': return renderPopup(c);
        case 'collage': return renderCollage(c);
        case 'gallery': return renderGallery(c);
        default: break;
      }
    }
    switch (p.type) {
      case 'banner': return renderLine(c, 46);
      case 'stamp': return renderStamp(c);
      case 'bars': return renderBars(c);
      case 'timeline': return renderTimeline(c);
      default: return renderLine(c, 38);
    }
  };
