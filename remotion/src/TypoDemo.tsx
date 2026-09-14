import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {DISPLAY, TEXT} from './fonts';

// Плакатная кинетическая типографика — разбор образца, принесённого
// владельцем («Darling, I»). Замер образца: смена композиции раз в 1.78 с,
// движение 28.29 (наш обычный сток — 2.77).
//
// Что взято: жёсткая палитра в три цвета, огромный шрифт, ОБРЕЗАННЫЙ краями
// кадра, толстая смещённая тень-выдавливание, фото в дуотоне внутри рамки,
// геометрические врезки, смена композиции на долю.
//
// Что НЕ взято: зелёный образца. Палитра здесь своя, канальная — тревожный
// оранжевый einsturzpunkt (#e2622a), чёрный и белый. Копировать чужой цвет
// значит копировать чужой канал.

// ПАЛИТРЫ. Первая проба была собрана на одной («тревога»), и владелец
// справедливо сказал, что цвет странный: кремовый фон + белый текст + жгучий
// оранжевый дают мутную середину, белое на светлом пропадает. Поэтому цвета
// вынесены наружу и их несколько — выбирать глазами, а не спорить словами.
//
// Правило у всех одно: ФОН и ТЕКСТ контрастны сильно, акцент используется
// пятном, а не текстом на светлом.
export type Palette = {ink: string; paper: string; accent: string; name: string};

export const PALETTES: Record<string, Palette> = {
  // строгая: газетная, ближе всего к документальному разбору
  alarm: {name: 'тревога', ink: '#0a0b0d', paper: '#efeae3', accent: '#c8431f'},
  // холодная инженерная: синька чертежа
  blueprint: {name: 'чертёж', ink: '#0d1b2a', paper: '#e8eef3', accent: '#2f6f9f'},
  // предупреждающая: строительная лента
  hazard: {name: 'лента', ink: '#141414', paper: '#f2e9d8', accent: '#e8a317'},
  // ночная: тёмный фон, свет только на акценте
  night: {name: 'ночь', ink: '#f0f2f4', paper: '#111417', accent: '#d94f2b'},
};

// Через CSS-переменные, а не через модульную переменную: композиция обязана
// зависеть ТОЛЬКО от props и номера кадра, иначе два рендера одного кадра
// дадут разное. Переменные ставятся на корне из props, а все места ниже
// продолжают быть обычными строками.
const ORANGE = 'var(--accent)';
const BLACK = 'var(--ink)';
const WHITE = 'var(--paper)';

const pop = (frame: number, fps: number, damping = 12) =>
  spring({frame, fps, config: {damping, mass: 0.7, stiffness: 150}});

/** Буква с выдавленной тенью — главный приём образца. */
const Extruded: React.FC<{
  children: string;
  size: number;
  color?: string;
  shadow?: string;
  depth?: number;
  italic?: boolean;
}> = ({children, size, color = WHITE, shadow = BLACK, depth = 14, italic}) => {
  const layers = Array.from({length: depth}, (_, i) => `${i + 1}px ${i + 1}px 0 ${shadow}`).join(',');
  return (
    <span
      style={{
        fontFamily: DISPLAY,
        fontWeight: 700,
        fontSize: size,
        color,
        lineHeight: 0.86,
        letterSpacing: -2,
        textShadow: layers,
        transform: italic ? 'skewX(-8deg)' : undefined,
        display: 'inline-block',
        whiteSpace: 'pre',
      }}
    >
      {children}
    </span>
  );
};

/** Звезда-вспышка из образца. */
const Burst: React.FC<{size: number; color?: string; spin?: number}> = ({
  size,
  color = BLACK,
  spin = 0,
}) => {
  const pts = Array.from({length: 24}, (_, i) => {
    const a = (i / 24) * Math.PI * 2;
    const r = i % 2 === 0 ? 50 : 33;
    return `${50 + Math.cos(a) * r}% ${50 + Math.sin(a) * r}%`;
  }).join(',');
  return (
    <div
      style={{
        width: size,
        height: size,
        background: color,
        clipPath: `polygon(${pts})`,
        transform: `rotate(${spin}deg)`,
      }}
    />
  );
};

/** Фото в дуотоне — как вырезка из журнала. */
const Duotone: React.FC<{src: string; w: number; h: number; tint?: string}> = ({
  src,
  w,
  h,
  tint = ORANGE,
}) => (
  <div style={{width: w, height: h, position: 'relative', overflow: 'hidden', background: BLACK}}>
    <Img
      src={src}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        filter: 'grayscale(1) contrast(1.9) brightness(0.95)',
      }}
    />
    <AbsoluteFill style={{background: tint, mixBlendMode: 'multiply', opacity: 0.72}} />
    <AbsoluteFill style={{background: WHITE, mixBlendMode: 'screen', opacity: 0.16}} />
  </div>
);

/** Въезд элемента с края кадра со своей скоростью. */
const Slide: React.FC<{
  from: 'left' | 'right' | 'top' | 'bottom';
  start?: number;
  dist?: number;
  damping?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({from, start = 0, dist = 900, damping = 12, children, style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = pop(f - start, fps, damping);
  const off = (1 - p) * dist;
  const t =
    from === 'left'
      ? `translateX(${-off}px)`
      : from === 'right'
      ? `translateX(${off}px)`
      : from === 'top'
      ? `translateY(${-off}px)`
      : `translateY(${off}px)`;
  return <div style={{...style, transform: t}}>{children}</div>;
};

// ---------------- композиции, по одной на долю ----------------

const C1: React.FC = () => (
  <AbsoluteFill style={{background: ORANGE, justifyContent: 'center', overflow: 'hidden'}}>
    <Slide from="left" dist={1600} damping={14}>
      {/* обрезка краем кадра — намеренная, как в образце */}
      <div style={{marginLeft: -90}}>
        <Extruded size={330} depth={20}>TETON</Extruded>
      </div>
    </Slide>
    <Slide from="right" start={5} dist={1200} style={{marginTop: -10, marginLeft: 420}}>
      <Extruded size={200} color={BLACK} shadow={WHITE} depth={14}>1976</Extruded>
    </Slide>
    <div style={{position: 'absolute', right: 110, top: 90}}>
      <Slide from="top" start={9} dist={500}>
        <Burst size={190} spin={12} />
      </Slide>
    </div>
  </AbsoluteFill>
);

const C2: React.FC = () => (
  <AbsoluteFill style={{background: BLACK, alignItems: 'center', justifyContent: 'center'}}>
    <Slide from="bottom" dist={1100} damping={11}>
      <div style={{border: `10px solid ${WHITE}`, transform: 'rotate(-2.5deg)'}}>
        <Duotone src={staticFile('aedemo/a.jpg')} w={1120} h={630} />
      </div>
    </Slide>
    <div style={{position: 'absolute', left: -40, bottom: 90}}>
      <Slide from="left" start={7} dist={900}>
        <Extruded size={190} color={ORANGE} shadow={WHITE} depth={12} italic>
          {' 06:00 UHR '}
        </Extruded>
      </Slide>
    </div>
  </AbsoluteFill>
);

const C3: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = pop(f, fps, 10);
  const val = Math.round(400 * Math.min(1, f / 14));
  return (
    <AbsoluteFill style={{background: WHITE, justifyContent: 'center', alignItems: 'center'}}>
      <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center'}}>
        <div style={{width: '100%', height: 220, background: ORANGE, transform: `scaleX(${p})`, transformOrigin: 'left'}} />
      </div>
      <div style={{position: 'relative', display: 'flex', alignItems: 'baseline', gap: 16}}>
        <Extruded size={300} color={WHITE} shadow={BLACK} depth={18}>{String(val)}</Extruded>
        <Extruded size={120} color={BLACK} shadow={WHITE} depth={10}>MIO $</Extruded>
      </div>
    </AbsoluteFill>
  );
};

const C4: React.FC = () => (
  <AbsoluteFill style={{background: ORANGE, overflow: 'hidden'}}>
    {/* три строки одного слова, уезжающие за края — приём образца */}
    {[0, 1, 2].map((i) => (
      <Slide key={i} from={i % 2 ? 'right' : 'left'} start={i * 3} dist={1500} damping={13}>
        <div style={{marginLeft: i % 2 ? 260 : -240, marginTop: i === 0 ? 60 : -30}}>
          <Extruded size={300} color={i === 1 ? BLACK : WHITE} shadow={i === 1 ? WHITE : BLACK} depth={18}>
            PIPING
          </Extruded>
        </div>
      </Slide>
    ))}
  </AbsoluteFill>
);

// ВЪЕЗД СНИЗУ РАНЬШЕ РЕЗАЛСЯ КРАЕМ. Slide сдвигает сам элемент, а он лежал
// в потоке центрирующего контейнера: пока пружина не доехала, буквы висели
// на 900 px ниже кадра, и на замерах видна была одна их верхушка. Теперь
// въезжающее завёрнуто в абсолютный слой во всю высоту — сдвиг происходит
// ВНУТРИ кадра, а не выносит содержимое за него.
const C5: React.FC = () => (
  <AbsoluteFill style={{background: BLACK, justifyContent: 'center', alignItems: 'center'}}>
    <div style={{position: 'absolute', left: 90, top: 70}}>
      <Slide from="top" dist={520}>
        <Burst size={240} color={ORANGE} spin={-14} />
      </Slide>
    </div>
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
      <Slide from="bottom" start={4} dist={420} damping={10}>
        <Extruded size={280} color={WHITE} shadow={ORANGE} depth={22}>11 TOTE</Extruded>
      </Slide>
    </AbsoluteFill>
    <div style={{position: 'absolute', right: 70, bottom: 120}}>
      <Slide from="right" start={10} dist={620}>
        <Duotone src={staticFile('aedemo/b.jpg')} w={520} h={300} tint={ORANGE} />
      </Slide>
    </div>
  </AbsoluteFill>
);

const C6: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = pop(f, fps, 12);
  return (
    <AbsoluteFill style={{background: WHITE, justifyContent: 'center', alignItems: 'center'}}>
      <div
        style={{
          position: 'absolute',
          width: 1500,
          height: 620,
          background: BLACK,
          transform: `rotate(-3deg) scale(${p})`,
        }}
      />
      <div style={{position: 'relative', textAlign: 'center'}}>
        <Extruded size={148} color={ORANGE} shadow={WHITE} depth={12}>ZWEI STUNDEN</Extruded>
        <div style={{height: 14}} />
        <div
          style={{
            fontFamily: TEXT,
            fontSize: 40,
            color: WHITE,
            opacity: interpolate(f, [12, 26], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
          }}
        >
          von der ersten Pfütze bis zum Bruch
        </div>
      </div>
    </AbsoluteFill>
  );
};

const C7: React.FC = () => (
  <AbsoluteFill style={{background: ORANGE, justifyContent: 'center', alignItems: 'center'}}>
    <Slide from="top" dist={1300} damping={11}>
      <div style={{border: `12px solid ${BLACK}`, transform: 'rotate(2deg)'}}>
        <Duotone src={staticFile('aedemo/c.jpg')} w={980} h={560} tint={BLACK} />
      </div>
    </Slide>
    <div style={{position: 'absolute', bottom: 60, right: -30}}>
      <Slide from="right" start={6} dist={900}>
        <Extruded size={210} color={WHITE} shadow={BLACK} depth={16} italic>{' NEUBAU '}</Extruded>
      </Slide>
    </div>
  </AbsoluteFill>
);

const C8: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = pop(f, fps, 9);
  return (
    <AbsoluteFill style={{background: BLACK, justifyContent: 'center', alignItems: 'center'}}>
      <div style={{transform: `scale(${0.7 + p * 0.3})`, textAlign: 'center'}}>
        <Extruded size={210} color={WHITE} shadow={ORANGE} depth={20}>WARUM?</Extruded>
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 96,
          fontFamily: TEXT,
          fontSize: 38,
          color: '#9aa3ad',
          opacity: interpolate(f, [14, 30], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
        }}
      >
        Die Prüfung war bestanden. Zwei Wochen vorher.
      </div>
    </AbsoluteFill>
  );
};

export const TypoDemo: React.FC<{palette?: string}> = ({palette = 'alarm'}) => {
  // Доля образца — 1.78 с. Берём 1.7 с (51 кадр при 30 fps): восемь с
  // половиной композиций на пятнадцать секунд.
  const D = 51;
  const shots = [C1, C2, C3, C4, C5, C6, C7, C8];
  const p = PALETTES[palette] ?? PALETTES.alarm;
  return (
    <AbsoluteFill
      style={
        {
          background: BLACK,
          '--ink': p.ink,
          '--paper': p.paper,
          '--accent': p.accent,
        } as React.CSSProperties
      }
    >
      {shots.map((S, i) => (
        <Sequence key={i} from={i * D} durationInFrames={D + 2}>
          <S />
        </Sequence>
      ))}
      <Sequence from={shots.length * D} durationInFrames={450 - shots.length * D}>
        <C1 />
      </Sequence>
    </AbsoluteFill>
  );
};
