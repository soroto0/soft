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

// Проба монтажа «как в AE», версия 2.
//
// Первая версия была вылизанной и мёртвой: замер движения дал 1.77 против
// 15.40 у образца, который принёс владелец, и даже против 2.77 у нашего
// обычного стока. То есть «улучшение» двигалось вдвое меньше того, что
// улучшало. Причина простая: я делал сдержанно — наезд на 6%, пружины с
// демпфированием 200 (без перелёта), пять склеек на пятнадцать секунд.
//
// Здесь всё наоборот: наезды в полтора раза, пружины с перелётом, смаз на
// быстром движении, одиннадцать склеек вместо пяти, текст прилетает с
// проскоком. Детерминированность соблюдена — всё считается от номера кадра.

const IMGS = ['aedemo/a.jpg', 'aedemo/b.jpg', 'aedemo/c.jpg'];

/** Пружина с перелётом: возвращает значение и скорость (для смаза). */
const overshoot = (frame: number, fps: number, damping = 13) => {
  const v = spring({frame, fps, config: {damping, mass: 0.9, stiffness: 130}});
  const prev = spring({
    frame: frame - 1,
    fps,
    config: {damping, mass: 0.9, stiffness: 130},
  });
  return {v, speed: Math.abs(v - prev)};
};

const Grain: React.FC<{opacity?: number}> = ({opacity = 0.06}) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        opacity,
        mixBlendMode: 'overlay',
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/></filter><rect width='120' height='120' filter='url(%23n)'/></svg>\")",
        backgroundSize: '340px 340px',
        backgroundPosition: `${(f * 29) % 340}px ${(f * 17) % 340}px`,
      }}
    />
  );
};

const Vignette: React.FC = () => (
  <AbsoluteFill
    style={{
      background:
        'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 34%, rgba(0,0,0,0.78) 100%)',
    }}
  />
);

/**
 * Кадр с настоящим движением камеры: крупный наезд/отъезд, снос по диагонали,
 * поворот, параллакс двумя слоями и СМАЗ, пропорциональный скорости.
 */
const CamShot: React.FC<{
  src: string;
  len: number;
  dir?: 1 | -1;
  zoom?: [number, number];
  pan?: [number, number];
  rot?: number;
  blurGain?: number;
}> = ({src, len, dir = 1, zoom = [1.0, 1.55], pan = [0, 0], rot = 0, blurGain = 26}) => {
  const f = useCurrentFrame();
  const t = Math.min(1, f / Math.max(1, len));
  // скорость движения падает к концу — камера «доезжает», а не рубится
  const e = 1 - Math.pow(1 - t, 2.6);
  const speed = Math.max(0, 2.6 * Math.pow(1 - t, 1.6)) / Math.max(1, len);
  const z = interpolate(e, [0, 1], zoom);
  const dx = interpolate(e, [0, 1], [0, pan[0]]) * dir;
  const dy = interpolate(e, [0, 1], [0, pan[1]]);
  const r = interpolate(e, [0, 1], [0, rot]) * dir;
  const blur = speed * blurGain * 60;
  return (
    <AbsoluteFill style={{backgroundColor: '#000', overflow: 'hidden'}}>
      {/* дальний слой: медленнее и мягче — это и есть параллакс */}
      <Img
        src={src}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${z * 0.94}) translate(${dx * 0.45}px, ${dy * 0.45}px) rotate(${r * 0.5}deg)`,
          filter: `blur(${5 + blur * 0.5}px) brightness(0.66)`,
        }}
      />
      {/* ближний слой: быстрее, резче */}
      <AbsoluteFill
        style={{clipPath: 'polygon(0% 40%, 100% 27%, 100% 100%, 0% 100%)'}}
      >
        <Img
          src={src}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: `scale(${z}) translate(${dx}px, ${dy}px) rotate(${r}deg)`,
            filter: `blur(${blur}px)`,
          }}
        />
      </AbsoluteFill>
      <Vignette />
      <Grain />
    </AbsoluteFill>
  );
};

/** Текст, прилетающий с проскоком и смазом. */
const Slam: React.FC<{
  text: string;
  size: number;
  start?: number;
  color?: string;
  stagger?: number;
}> = ({text, size, start = 0, color = '#fff', stagger = 1.1}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <div style={{display: 'flex', overflow: 'visible'}}>
      {text.split('').map((ch, i) => {
        const {v, speed} = overshoot(frame - start - i * stagger, fps, 11);
        return (
          <span
            key={i}
            style={{
              fontFamily: DISPLAY,
              fontWeight: 700,
              fontSize: size,
              color,
              lineHeight: 1,
              letterSpacing: 3,
              whiteSpace: 'pre',
              display: 'inline-block',
              opacity: Math.min(1, v * 1.6),
              filter: `blur(${speed * 90}px)`,
              transform: `translateY(${(1 - v) * 120}px) scale(${0.6 + v * 0.4})`,
            }}
          >
            {ch}
          </span>
        );
      })}
    </div>
  );
};

/** Число, набегающее рывком. */
const Counter: React.FC<{to: number; start: number; dur: number; size: number}> = ({
  to,
  start,
  dur,
  size,
}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = interpolate(f - start, [0, dur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const {v, speed} = overshoot(f - start, fps, 14);
  const val = Math.round(to * (1 - Math.pow(1 - p, 3)));
  return (
    <span
      style={{
        fontFamily: DISPLAY,
        fontWeight: 700,
        fontSize: size,
        color: '#e2622a',
        lineHeight: 1,
        fontVariantNumeric: 'tabular-nums',
        display: 'inline-block',
        transform: `scale(${0.7 + v * 0.3})`,
        filter: `blur(${speed * 60}px)`,
      }}
    >
      {val.toLocaleString('de-DE')}
    </span>
  );
};

/** Схема, которая выстреливает линиями, а не вырисовывается. */
const Schema: React.FC<{len: number; variant: 0 | 1}> = ({len, variant}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {v} = overshoot(f, fps, 16);
  const body = 1 - Math.min(1, f / 9);
  const flow = 1 - Math.min(1, Math.max(0, f - 7) / 16);
  const d0 = 'M 360 780 L 900 320 L 1120 320 L 1580 780 Z';
  const d1 = 'M 300 620 L 1620 620 M 640 620 L 640 300 M 1280 620 L 1280 300';
  return (
    <AbsoluteFill style={{backgroundColor: '#0b0d10'}}>
      <svg width="1920" height="1080" style={{position: 'absolute', inset: 0}}>
        <g transform={`scale(${0.9 + v * 0.1}) translate(${(1 - v) * 60}, 0)`}>
          <path
            d={variant === 0 ? d0 : d1}
            stroke="#8a929c"
            strokeWidth={6}
            fill="none"
            strokeDasharray={2600}
            strokeDashoffset={body * 2600}
          />
          <path
            d="M 1520 720 C 1240 700, 1060 630, 880 545 C 760 490, 610 490, 440 615"
            stroke="#e2622a"
            strokeWidth={9}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={1500}
            strokeDashoffset={flow * 1500}
          />
        </g>
      </svg>
      <Grain opacity={0.045} />
    </AbsoluteFill>
  );
};

/** Вспышка на склейке — короткий кадр белого/чёрного. */
const Flash: React.FC<{color?: string}> = ({color = '#fff'}) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        backgroundColor: color,
        opacity: interpolate(f, [0, 1, 4], [0.9, 0.55, 0], {
          extrapolateRight: 'clamp',
        }),
      }}
    />
  );
};

export const AeDemo: React.FC = () => {
  // Одиннадцать долей на 15 секунд вместо прежних пяти. Границы совпадают с
  // ударами в звуковой дорожке.
  const B = [0, 40, 78, 108, 140, 175, 208, 246, 282, 316, 356, 450];
  const img = (i: number) => staticFile(IMGS[i % IMGS.length]);
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      <Sequence from={B[0]} durationInFrames={B[1] - B[0]}>
        <CamShot src={img(0)} len={B[1] - B[0]} zoom={[1.62, 1.02]} pan={[-120, 30]} rot={-2.2} />
        <AbsoluteFill style={{justifyContent: 'flex-end', padding: 90}}>
          <Slam text="5. JUNI 1976" size={72} start={6} />
        </AbsoluteFill>
      </Sequence>

      <Sequence from={B[1]} durationInFrames={B[2] - B[1]}>
        <Flash />
        <CamShot src={img(1)} len={B[2] - B[1]} dir={-1} zoom={[1.05, 1.62]} pan={[150, -40]} rot={2.6} />
      </Sequence>

      <Sequence from={B[2]} durationInFrames={B[3] - B[2]}>
        <Schema len={B[3] - B[2]} variant={0} />
      </Sequence>

      <Sequence from={B[3]} durationInFrames={B[4] - B[3]}>
        <Flash color="#e2622a" />
        <CamShot src={img(2)} len={B[4] - B[3]} zoom={[1.7, 1.1]} pan={[90, 50]} rot={-3} />
      </Sequence>

      <Sequence from={B[4]} durationInFrames={B[5] - B[4]}>
        <AbsoluteFill
          style={{backgroundColor: '#0b0d10', justifyContent: 'center', alignItems: 'center'}}
        >
          <div style={{display: 'flex', alignItems: 'baseline', gap: 20}}>
            <Counter to={400} start={2} dur={20} size={230} />
            <Slam text="MIO $" size={92} start={14} />
          </div>
          <Grain opacity={0.05} />
        </AbsoluteFill>
      </Sequence>

      <Sequence from={B[5]} durationInFrames={B[6] - B[5]}>
        <CamShot src={img(0)} len={B[6] - B[5]} dir={-1} zoom={[1.1, 1.68]} pan={[-160, -20]} rot={2} />
      </Sequence>

      <Sequence from={B[6]} durationInFrames={B[7] - B[6]}>
        <Schema len={B[7] - B[6]} variant={1} />
        <AbsoluteFill style={{padding: 90}}>
          <Slam text="PIPING" size={64} start={4} />
        </AbsoluteFill>
      </Sequence>

      <Sequence from={B[7]} durationInFrames={B[8] - B[7]}>
        <Flash />
        <CamShot src={img(1)} len={B[8] - B[7]} zoom={[1.66, 1.06]} pan={[110, -60]} rot={-2.4} />
      </Sequence>

      <Sequence from={B[8]} durationInFrames={B[9] - B[8]}>
        <AbsoluteFill
          style={{backgroundColor: '#0b0d10', justifyContent: 'center', alignItems: 'center'}}
        >
          <Slam text="11 TOTE" size={128} start={2} color="#fff" />
          <Grain opacity={0.05} />
        </AbsoluteFill>
      </Sequence>

      <Sequence from={B[9]} durationInFrames={B[10] - B[9]}>
        <CamShot src={img(2)} len={B[10] - B[9]} dir={-1} zoom={[1.15, 1.75]} pan={[-130, 40]} rot={3.2} />
      </Sequence>

      <Sequence from={B[10]} durationInFrames={B[11] - B[10]}>
        <Flash color="#e2622a" />
        <CamShot src={img(0)} len={B[11] - B[10]} zoom={[1.5, 1.12]} pan={[60, -30]} rot={-1.4} blurGain={14} />
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
          <AbsoluteFill style={{background: 'rgba(6,8,10,0.55)'}} />
          <div style={{position: 'relative', textAlign: 'center'}}>
            <Slam text="TETON 1976" size={132} start={4} />
            <div
              style={{
                fontFamily: TEXT,
                fontSize: 36,
                color: '#c8ced5',
                marginTop: 20,
                opacity: interpolate(useCurrentFrame(), [26, 44], [0, 1], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                }),
              }}
            >
              Warum hielt der neue Damm keine zwei Stunden?
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
