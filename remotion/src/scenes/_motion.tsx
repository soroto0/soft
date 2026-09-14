import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

/**
 * МОУШН-ГРАММАТИКА — семья абстрактных сцен, снятая с датасета шоурилов
 * (motion_ai_dataset: Ordinary Folk, Ordinary Reel, Buff Motion, Denis
 * Gimaev, Bohdan Martovskyi, Will Taylor + рекламные фильмы Apple).
 *
 * ЗАЧЕМ ОТДЕЛЬНАЯ СЕМЬЯ. Вся прежняя библиотека сцен — инженерные схемы
 * под немецкий канал: разрезы, эпюры, графики. Абстрактной графики не было
 * ни одной, и когда понадобился язык шоурила, брать было нечего — я гонял
 * его через генератор картинок, где он выходит дорого, медленно и с
 * потолком в четыре одновременные задачи.
 *
 * ЧТО ЗАМЕРЕНО НА ДАТАСЕТЕ (20.08, 16 роликов):
 *   темп        медиана плана 1.20 c, вилка p25-p75 0.73-1.75
 *   Ordinary Reel — распределение ТРЁХГОРБОЕ, а не одногорбое:
 *               вспышки  <=0.2 c   29%
 *               средние  0.2-1.5   54%
 *               выдержки >=1.5     17%
 *   переходы    на каждый жёсткий рез 2.5 мягких
 *   частота     24 кадра/с у всех шоурилов
 *
 * ЧТО ЗАМЕРЕНО ПО КАДРАМ:
 *   два-три цвета на кадр, не больше;
 *   предмет мелкий, две трети кадра — ровный незанятый фон;
 *   ни одного фотореалистичного кадра;
 *   каждый следующий план — другой мир: другая техника, палитра, предмет.
 *
 * Отсюда устройство файла: палитры парами, предмет по центру и мелкий,
 * фон плоский. Композиции здесь свои — с образцов снято устройство, а не
 * рисунки: чужие шоурилы это оплаченные работы студий.
 *
 * ДЕТЕРМИНИЗМ. Ни Math.random, ни Date.now: всё считается от номера кадра,
 * иначе рендер по кадрам даёт дрожь, а превью не совпадает с итогом.
 */

// ---------- палитры: ровно три цвета, фон + предмет + акцент ----------

export type Pal = { bg: string; ink: string; acc: string };

export const MOTION_PALETTES: Record<string, Pal> = {
  night: { bg: '#08090c', ink: '#f4f4f6', acc: '#7c5cff' },
  paper: { bg: '#f3efe7', ink: '#16181d', acc: '#e2622a' },
  mint: { bg: '#dfe9e3', ink: '#16302a', acc: '#e4573d' },
  cobalt: { bg: '#1436c8', ink: '#eef2ff', acc: '#ffd93d' },
  coral: { bg: '#ff7a5c', ink: '#2b1410', acc: '#fff3e8' },
  bone: { bg: '#efece4', ink: '#1b1b1b', acc: '#2f6f9f' },
  sand: { bg: '#c9b79c', ink: '#2a2118', acc: '#f7f3ec' },
  ink: { bg: '#101319', ink: '#e9edf5', acc: '#25d0a3' },
};

const PAL_ORDER = Object.keys(MOTION_PALETTES);

/** Палитра по имени, иначе по номеру — чтобы соседние сцены не совпали. */
export function palOf(name = '', i = 0): Pal {
  return MOTION_PALETTES[name] ?? MOTION_PALETTES[PAL_ORDER[i % PAL_ORDER.length]];
}

// ---------- общий вход и выход ----------

/**
 * Вход 0.18 c, выход 0.12 c. Числа не с потолка: у шоурилов четверть
 * планов короче 0.73 c, а на плане в полсекунды вход длиной 0.4 c просто
 * не успевает закончиться до склейки — кадр всю свою жизнь въезжает.
 */
function useLife(dur: number) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const total = Math.max(2, Math.round(dur * fps));
  const inF = Math.max(1, Math.round(fps * 0.18));
  const outF = Math.max(1, Math.round(fps * 0.12));
  const enter = interpolate(frame, [0, inF], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const exit = interpolate(frame, [total - outF, total], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // t — доля прожитого плана, по ней идут все собственные движения сцены
  const t = interpolate(frame, [0, total], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return { frame, fps, total, t, opacity: enter * exit };
}

/**
 * Ровное дно + предмет по центру, МАСШТАБИРОВАННЫЙ ПОД КАДР.
 *
 * ЗДЕСЬ БЫЛА ГЛАВНАЯ ОШИБКА СЕМЬИ. Сцены рисуют содержимое фиксированными
 * пикселями (svg 420x420, форма 240x190) — я писал их как для маленького
 * холста. На кадре 1920x1080 это точка: замер 21.08 по готовым мирам —
 * созвездие занимало 0.1% пикселей и 3.8% площади кадра, тоннель 0.7% и
 * 3.2%, форма 1.7% и 2.2%. В ролике из-за этого было видно только подпись,
 * и владелец справедливо сказал: «ты просто поставил субтитры».
 *
 * Правило датасета «предмет мелкий, вокруг воздух» я перестарался: там
 * предмет занимает ЗАМЕТНУЮ часть кадра, просто не упирается в края.
 *
 * nominal — под какую высоту нарисована сцена, fill — какую долю высоты
 * кадра она должна занять. Масштаб считается от настоящего кадра, поэтому
 * одна и та же сцена одинаково выглядит и в 1080p, и в вертикали.
 */
const Stage: React.FC<{
  pal: Pal; opacity: number; w?: number; h?: number;
  children: React.ReactNode;
}> = ({ pal, opacity, w = 420, h = 420, children }) => {
  const { width, height } = useVideoConfig();
  // w/h - ФАКТИЧЕСКИЙ размер рисунка, а не поля svg: у созвездия радиус 150
  // внутри поля 420, то есть пятно вдвое меньше коробки. Считали от коробки -
  // получали 4-22% кадра вместо 40-70%.
  // Ограничение по обеим сторонам обязательно: волны шириной 700 при одном
  // только вертикальном расчёте давали 2250 px на кадре 1920 и обрезались.
  const k = Math.min((width * 0.96) / w, (height * 0.88) / h);
  return (
    <AbsoluteFill style={{ background: pal.bg, opacity, overflow: 'hidden' }}>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ transform: `scale(${k.toFixed(3)})` }}>{children}</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Псевдослучайное от целого — вместо Math.random, чтобы рендер совпадал. */
const rnd = (n: number) => {
  const s = Math.sin(n * 12.9898) * 43758.5453;
  return s - Math.floor(s);
};

// ---------- сцены ----------

/** Созвездие: точки, соединённые тонкими нитями, медленно поворачивается. */
export const MotionConstellation: React.FC<SceneProps> = (p) => {
  const { t, opacity } = useLife(p.dur);
  const pal = palOf(p.look, 0);
  const N = 26;
  const spin = t * Math.PI * 0.5;
  const pts = Array.from({ length: N }, (_, i) => {
    const la = (rnd(i) - 0.5) * Math.PI;
    const lo = rnd(i + 100) * Math.PI * 2 + spin;
    return {
      x: Math.cos(la) * Math.sin(lo),
      y: -Math.sin(la),
      z: Math.cos(la) * Math.cos(lo),
    };
  });
  const R = 150;
  return (
    <Stage pal={pal} opacity={opacity} w={300} h={300}>
      <svg width={420} height={420} viewBox="-210 -210 420 420">
        {pts.map((a, i) =>
          pts.slice(i + 1).map((b, j) => {
            const d = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
            if (d > 0.9 || a.z < 0 || b.z < 0) return null;
            return (
              <line
                key={`${i}-${j}`}
                x1={a.x * R} y1={a.y * R} x2={b.x * R} y2={b.y * R}
                stroke={pal.ink} strokeWidth={1.8} opacity={0.7}
              />
            );
          }),
        )}
        {pts.map((a, i) =>
          a.z < 0 ? null : (
            <circle key={i} cx={a.x * R} cy={a.y * R} r={5.5}
                    fill={i % 7 === 0 ? pal.acc : pal.ink} />
          ),
        )}
      </svg>
    </Stage>
  );
};

/** Концентрический узор: тонкие кольца расходятся, в центре плотная форма. */
export const MotionConcentric: React.FC<SceneProps> = (p) => {
  const { t, opacity } = useLife(p.dur);
  const pal = palOf(p.look, 1);
  const rings = 9;
  return (
    <Stage pal={pal} opacity={opacity} w={330} h={330}>
      <svg width={460} height={460} viewBox="-230 -230 460 460">
        {Array.from({ length: rings }, (_, i) => {
          const phase = (t + i / rings) % 1;
          return (
            <circle key={i} cx={0} cy={0} r={20 + phase * 200}
                    fill="none" stroke={pal.ink} strokeWidth={0.9}
                    opacity={0.55 * (1 - phase)} />
          );
        })}
        <rect x={-34} y={-34} width={68} height={68} rx={14} fill={pal.acc} />
      </svg>
    </Stage>
  );
};

/** Мягкая форма: дышит и слегка кренится. */
export const MotionBlob: React.FC<SceneProps> = (p) => {
  const { t, opacity } = useLife(p.dur);
  const pal = palOf(p.look, 2);
  const s = 1 + Math.sin(t * Math.PI * 2) * 0.06;
  const rot = Math.sin(t * Math.PI) * 8;
  return (
    <Stage pal={pal} opacity={opacity} w={240} h={190}>
      <div
        style={{
          width: 240, height: 190, background: pal.acc,
          borderRadius: '58% 42% 46% 54% / 52% 58% 42% 48%',
          transform: `scale(${s}) rotate(${rot}deg)`,
          boxShadow: `0 40px 80px ${pal.ink}22`,
        }}
      />
    </Stage>
  );
};

/** Обрывки бумаги разлетаются от центра. */
export const MotionFragments: React.FC<SceneProps> = (p) => {
  const { t, opacity } = useLife(p.dur);
  const pal = palOf(p.look, 3);
  const N = 18;
  return (
    <Stage pal={pal} opacity={opacity} w={480} h={460}>
      <svg width={560} height={420} viewBox="-280 -210 560 420">
        {Array.from({ length: N }, (_, i) => {
          const a = rnd(i) * Math.PI * 2;
          const d = (150 + rnd(i + 50) * 110) * Math.min(1, t / 0.5);
          const w = 40 + rnd(i + 9) * 60;
          const h = 30 + rnd(i + 77) * 46;
          const rot = (rnd(i + 5) - 0.5) * 80 * (0.4 + t);
          return (
            <rect key={i}
                  x={Math.cos(a) * d - w / 2} y={Math.sin(a) * d - h / 2}
                  width={w} height={h}
                  fill={i % 4 === 0 ? pal.acc : pal.ink}
                  opacity={i % 4 === 0 ? 0.9 : 0.75}
                  transform={`rotate(${rot} ${Math.cos(a) * d} ${Math.sin(a) * d})`} />
          );
        })}
      </svg>
    </Stage>
  );
};

/** Геометрическое тело поворачивается, по грани идёт блик. */
export const MotionSolid: React.FC<SceneProps> = (p) => {
  const { t, opacity } = useLife(p.dur);
  const pal = palOf(p.look, 4);
  const rot = t * 90;
  return (
    <Stage pal={pal} opacity={opacity} w={250} h={250}>
      <div style={{ perspective: 900 }}>
        <div
          style={{
            width: 180, height: 180,
            transformStyle: 'preserve-3d',
            transform: `rotateX(-22deg) rotateY(${rot}deg)`,
          }}
        >
          {[
            'translateZ(90px)', 'rotateY(180deg) translateZ(90px)',
            'rotateY(90deg) translateZ(90px)', 'rotateY(-90deg) translateZ(90px)',
            'rotateX(90deg) translateZ(90px)', 'rotateX(-90deg) translateZ(90px)',
          ].map((tr, i) => (
            <div key={i}
                 style={{
                   position: 'absolute', inset: 0, transform: tr,
                   background: i === 0 ? pal.acc : pal.ink,
                   opacity: i === 0 ? 0.95 : 0.18,
                   border: `1px solid ${pal.ink}55`,
                 }} />
          ))}
        </div>
      </div>
    </Stage>
  );
};

/** Тонкие кривые пульсируют — как звуковая волна. */
export const MotionWaves: React.FC<SceneProps> = (p) => {
  const { t, opacity } = useLife(p.dur);
  const pal = palOf(p.look, 5);
  const W = 700;
  const line = (amp: number, k: number, col: string, o: number) => {
    const pts: string[] = [];
    for (let x = -W / 2; x <= W / 2; x += 6) {
      const y = Math.sin((x / 70) + t * Math.PI * 2 * k) * amp
        * Math.cos((x / W) * Math.PI);
      pts.push(`${x.toFixed(0)},${y.toFixed(1)}`);
    }
    return <polyline points={pts.join(' ')} fill="none" stroke={col}
                     strokeWidth={1.6} opacity={o} />;
  };
  return (
    <Stage pal={pal} opacity={opacity} w={700} h={200}>
      <svg width={W} height={280} viewBox={`${-W / 2} -140 ${W} 280`}>
        {line(70, 1, pal.ink, 0.85)}
        {line(46, 1.6, pal.acc, 0.9)}
        {line(96, 0.7, pal.ink, 0.35)}
      </svg>
    </Stage>
  );
};

/** Сетка клеток, одна поднята и светится. */
export const MotionGrid: React.FC<SceneProps> = (p) => {
  const { t, opacity } = useLife(p.dur);
  const pal = palOf(p.look, 6);
  const C = 7, R = 5, cell = 44, gap = 14;
  const pick = Math.floor(rnd(3) * C * R);
  return (
    <Stage pal={pal} opacity={opacity} w={392} h={276}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${C}, ${cell}px)`,
        gap,
      }}>
        {Array.from({ length: C * R }, (_, i) => {
          const on = i === pick;
          const lift = on ? interpolate(t, [0, 1], [0, -16]) : 0;
          return (
            <div key={i}
                 style={{
                   width: cell, height: cell, borderRadius: 6,
                   background: on ? pal.acc : pal.ink,
                   opacity: on ? 1 : 0.16,
                   transform: `translateY(${lift}px)`,
                 }} />
          );
        })}
      </div>
    </Stage>
  );
};

/** Спираль рисует себя одной тонкой линией. */
export const MotionSpiral: React.FC<SceneProps> = (p) => {
  const { t, opacity } = useLife(p.dur);
  const pal = palOf(p.look, 7);
  const turns = 4.5;
  const steps = 380;
  // Дорисовать к первой трети: на плане в 1.2 c спираль, растущая
  // весь план, показывает полный размер уже после склейки.
  const grow = Math.min(1, t / 0.35);
  const upto = Math.max(2, Math.floor(steps * grow));
  const pts: string[] = [];
  for (let i = 0; i < upto; i++) {
    const a = (i / steps) * Math.PI * 2 * turns;
    const r = (i / steps) * 175;
    pts.push(`${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`);
  }
  return (
    <Stage pal={pal} opacity={opacity} w={320} h={320}>
      <svg width={420} height={420} viewBox="-210 -210 420 420">
        <g transform={`rotate(${(t * 40).toFixed(1)})`}>
          <polyline points={pts.join(' ')} fill="none" stroke={pal.acc}
                    strokeWidth={3.2} strokeLinecap="round" />
        </g>
      </svg>
    </Stage>
  );
};

/** Конфетти висит в воздухе и медленно оседает. */
export const MotionConfetti: React.FC<SceneProps> = (p) => {
  const { t, opacity } = useLife(p.dur);
  const pal = palOf(p.look, 2);
  const N = 34;
  return (
    <Stage pal={pal} opacity={opacity} w={480} h={320}>
      <svg width={620} height={420} viewBox="-310 -210 620 420">
        {Array.from({ length: N }, (_, i) => {
          const x = (rnd(i) - 0.5) * 460;
          const y0 = (rnd(i + 31) - 0.5) * 300;
          const y = y0 + t * (18 + rnd(i + 7) * 26);
          const s = 7 + rnd(i + 3) * 9;
          const rot = rnd(i + 11) * 360 + t * 90;
          return (
            <rect key={i} x={x} y={y} width={s} height={s} rx={1.5}
                  fill={i % 3 === 0 ? pal.acc : pal.ink}
                  opacity={i % 3 === 0 ? 0.95 : 0.5}
                  transform={`rotate(${rot} ${x + s / 2} ${y + s / 2})`} />
          );
        })}
      </svg>
    </Stage>
  );
};

/** Поле вертикальных линий, несколько отогнуты в сторону. */
export const MotionLines: React.FC<SceneProps> = (p) => {
  const { t, opacity } = useLife(p.dur);
  const pal = palOf(p.look, 5);
  const N = 30, W = 520, H = 300;
  const bent = [10, 14, 19];
  return (
    <Stage pal={pal} opacity={opacity} w={520} h={300}>
      <svg width={W} height={H} viewBox={`${-W / 2} ${-H / 2} ${W} ${H}`}>
        {Array.from({ length: N }, (_, i) => {
          const x = -W / 2 + 16 + (i * (W - 32)) / (N - 1);
          const b = bent.includes(i);
          const off = b ? Math.sin(t * Math.PI) * 26 : 0;
          const col = b ? pal.acc : pal.ink;
          return (
            <path key={i}
                  d={`M ${x} ${-H / 2 + 20} Q ${x + off} 0 ${x} ${H / 2 - 20}`}
                  fill="none" stroke={col} strokeWidth={b ? 2.4 : 1.2}
                  opacity={b ? 1 : 0.42} />
          );
        })}
      </svg>
    </Stage>
  );
};

/** Все виды семьи — по этим ключам их зовёт Scene.tsx. */
export const MOTION_SCENES: Record<string, React.FC<SceneProps>> = {
  motion_constellation: MotionConstellation,
  motion_concentric: MotionConcentric,
  motion_blob: MotionBlob,
  motion_fragments: MotionFragments,
  motion_solid: MotionSolid,
  motion_waves: MotionWaves,
  motion_grid: MotionGrid,
  motion_spiral: MotionSpiral,
  motion_confetti: MotionConfetti,
  motion_lines: MotionLines,
};

// ---------- 3D: настоящая перспектива на CSS-трансформациях ----------
//
// Без three.js намеренно. Софт продаётся, и каждая новая зависимость — это
// вес поставки и чужая лицензия в придачу. CSS-перспектива даёт поворот по
// трём осям, глубину и параллакс; для моушн-графики этого хватает, а
// рендерится оно детерминированно, как и всё остальное здесь.
//
// perspective задаётся на родителе, transform-style: preserve-3d — на
// вращаемом узле. Без второго дети схлопываются в плоскость, и «3D»
// превращается в наклонённый прямоугольник.

/** Сетка кубов в перспективе: волна поднимает их по очереди. */
export const MotionCubeGrid: React.FC<SceneProps> = (p) => {
  const { t, opacity } = useLife(p.dur);
  const pal = palOf(p.look, 4);
  const C = 5, R = 5, S = 54, GAP = 26;
  return (
    <Stage pal={pal} opacity={opacity} w={456} h={296}>
      <div style={{ perspective: 1200 }}>
        <div
          style={{
            transformStyle: 'preserve-3d',
            transform: `rotateX(58deg) rotateZ(${-24 + t * 22}deg)`,
          }}
        >
          {Array.from({ length: C * R }, (_, i) => {
            const cx = i % C, cy = Math.floor(i / C);
            // Волна идёт по диагонали — так читается направление движения
            const wave = Math.sin((t * 2 - (cx + cy) / (C + R)) * Math.PI * 2);
            const lift = Math.max(0, wave) * 46;
            const on = wave > 0.72;
            return (
              <div key={i}
                   style={{
                     position: 'absolute',
                     left: (cx - C / 2) * (S + GAP),
                     top: (cy - R / 2) * (S + GAP),
                     width: S, height: S,
                     background: on ? pal.acc : pal.ink,
                     opacity: on ? 1 : 0.22,
                     transform: `translateZ(${lift}px)`,
                     borderRadius: 4,
                   }} />
            );
          })}
        </div>
      </div>
    </Stage>
  );
};

/** Тоннель: кольца уходят вглубь и летят на зрителя. */
export const MotionTunnel: React.FC<SceneProps> = (p) => {
  const { t, opacity } = useLife(p.dur);
  const pal = palOf(p.look, 0);
  const N = 12;
  return (
    <Stage pal={pal} opacity={opacity} w={264} h={264}>
      <div style={{ perspective: 700 }}>
        <div style={{ transformStyle: 'preserve-3d', width: 1, height: 1 }}>
          {Array.from({ length: N }, (_, i) => {
            // Кольцо проходит путь от дальнего края к зрителю за цикл
            const phase = ((i / N) + t) % 1;
            const z = -1400 + phase * 1400;
            const size = 300;
            return (
              <div key={i}
                   style={{
                     position: 'absolute',
                     left: -size / 2, top: -size / 2,
                     width: size, height: size, borderRadius: '50%',
                     border: `3px solid ${i % 4 === 0 ? pal.acc : pal.ink}`,
                     opacity: 0.25 + phase * 0.65,
                     transform: `translateZ(${z}px) rotate(${i * 9}deg)`,
                   }} />
            );
          })}
        </div>
      </div>
    </Stage>
  );
};

/** Слоёные пластины: расходятся по глубине, показывая толщину. */
export const MotionSlabs: React.FC<SceneProps> = (p) => {
  const { t, opacity } = useLife(p.dur);
  const pal = palOf(p.look, 1);
  const N = 6;
  return (
    <Stage pal={pal} opacity={opacity} w={352} h={244}>
      <div style={{ perspective: 1000 }}>
        <div
          style={{
            transformStyle: 'preserve-3d',
            transform: `rotateX(-24deg) rotateY(${-30 + t * 60}deg)`,
          }}
        >
          {Array.from({ length: N }, (_, i) => {
            const spread = interpolate(t, [0, 1], [8, 34]);
            return (
              <div key={i}
                   style={{
                     position: 'absolute',
                     left: -130, top: -90, width: 260, height: 180,
                     background: i === N - 1 ? pal.acc : pal.ink,
                     opacity: i === N - 1 ? 0.95 : 0.14 + i * 0.04,
                     border: `1px solid ${pal.ink}44`,
                     borderRadius: 8,
                     transform: `translateZ(${(i - N / 2) * spread}px)`,
                   }} />
            );
          })}
        </div>
      </div>
    </Stage>
  );
};

/** Спираль точек в объёме: витки уходят вглубь и поворачиваются. */
export const MotionHelix: React.FC<SceneProps> = (p) => {
  const { t, opacity } = useLife(p.dur);
  const pal = palOf(p.look, 7);
  const N = 60, turns = 3;
  return (
    <Stage pal={pal} opacity={opacity} w={200} h={250}>
      <div style={{ perspective: 900 }}>
        <div
          style={{
            transformStyle: 'preserve-3d', width: 1, height: 1,
            transform: `rotateY(${t * 180}deg)`,
          }}
        >
          {Array.from({ length: N }, (_, i) => {
            const a = (i / N) * Math.PI * 2 * turns;
            const r = 120;
            const x = Math.cos(a) * r;
            const z = Math.sin(a) * r;
            const y = (i / N - 0.5) * 300;
            const d = 9 + (i % 5);
            return (
              <div key={i}
                   style={{
                     position: 'absolute',
                     left: x - d / 2, top: y - d / 2,
                     width: d, height: d, borderRadius: '50%',
                     background: i % 9 === 0 ? pal.acc : pal.ink,
                     opacity: i % 9 === 0 ? 1 : 0.6,
                     transform: `translateZ(${z}px)`,
                   }} />
            );
          })}
        </div>
      </div>
    </Stage>
  );
};

/** Призма: шесть граней, одна светится, вращение по двум осям. */
export const MotionPrism: React.FC<SceneProps> = (p) => {
  const { t, opacity } = useLife(p.dur);
  const pal = palOf(p.look, 3);
  const R = 110, N = 6, H = 200;
  return (
    <Stage pal={pal} opacity={opacity} w={240} h={220}>
      <div style={{ perspective: 1100 }}>
        <div
          style={{
            transformStyle: 'preserve-3d', width: 1, height: 1,
            transform: `rotateX(-16deg) rotateY(${t * 200}deg)`,
          }}
        >
          {Array.from({ length: N }, (_, i) => {
            const a = (360 / N) * i;
            const w = 2 * R * Math.sin(Math.PI / N);
            return (
              <div key={i}
                   style={{
                     position: 'absolute',
                     left: -w / 2, top: -H / 2, width: w, height: H,
                     background: i === 0 ? pal.acc : pal.ink,
                     opacity: i === 0 ? 0.9 : 0.2,
                     border: `1px solid ${pal.ink}55`,
                     transform: `rotateY(${a}deg) translateZ(${R * Math.cos(Math.PI / N)}px)`,
                   }} />
            );
          })}
        </div>
      </div>
    </Stage>
  );
};

Object.assign(MOTION_SCENES, {
  motion_cube_grid: MotionCubeGrid,
  motion_tunnel: MotionTunnel,
  motion_slabs: MotionSlabs,
  motion_helix: MotionHelix,
  motion_prism: MotionPrism,
});
