import {
  AbsoluteFill, Img, Sequence, interpolate, spring, staticFile,
  useCurrentFrame, useVideoConfig,
} from 'remotion';
import {SERIF} from './fonts';

// Проба по УСТРОЙСТВУ образца, принесённого владельцем (hero-1984).
// Копируется способ сборки, не содержание: кадры, слова и сюжет — наши.
//
// Замер образца (15.1 c, 1344x768, 24 к/с):
//   насыщенность по кадрам 2.5 -> 25.9   (у нас ровно 3.8-4.6)
//   яркость по кадрам      5.8 -> 113.8  (у нас ровно)
//   чёрного в кадре        19% -> 97.6%
//   движение               34.28         (наш сток 2.77)
// То есть образец ДЫШИТ: светлый кадр, тёмный кадр, почти чёрный как удар.
// Наш ряд ровный от начала до конца — это и копируем в первую очередь.
//
// Приёмы: крупная антиква поверх кадра, залезающая на предмет и за края;
// медленный наезд; жёсткая обработка (контраст вверх, лёгкий холод);
// зерно; пауза на чёрном.

const IMG = ['aedemo/a.jpg', 'aedemo/b.jpg', 'aedemo/c.jpg'];

const Grain: React.FC<{o?: number}> = ({o = 0.07}) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{
      opacity: o, mixBlendMode: 'overlay',
      backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/></filter><rect width='120' height='120' filter='url(%23n)'/></svg>\")",
      backgroundSize: '300px 300px',
      backgroundPosition: `${(f * 23) % 300}px ${(f * 11) % 300}px`,
    }} />
  );
};

// Кадр с наездом и обработкой «как в образце»: контраст вверх, холод,
// насыщенность подрезана — но не в ноль, иначе получится наш нынешний серый.
const Plate: React.FC<{src: string; len: number; bright: number; push?: number}> = ({
  src, len, bright, push = 0.14,
}) => {
  const f = useCurrentFrame();
  const t = Math.min(1, f / Math.max(1, len));
  const z = 1.08 + t * push;
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      <Img src={src} style={{
        width: '100%', height: '100%', objectFit: 'cover',
        transform: `scale(${z}) translate(${t * -18}px, ${t * -6}px)`,
        filter: `contrast(1.16) saturate(1.12) brightness(${bright})`,
      }} />
      <AbsoluteFill style={{
        background: 'radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 34%, rgba(0,0,0,0.8) 100%)',
      }} />
      <Grain />
    </AbsoluteFill>
  );
};

// Крупная антиква поверх кадра — главный приём образца.
//
// Цвет НЕ выбирается на глаз. Замер яркости полос, куда ложится текст
// (a.jpg верх 99.9, b.jpg середина 147.3, c.jpg верх 68.4, a.jpg низ 123.8):
// из четырёх надписей первой версии ТРИ стояли неверным цветом — чёрные на
// тёмном и белые на светлом. Это и есть цена слепого наложения слоёв.
//
// Правило простое: ярче 140 — чёрный, темнее 110 — белый, между ними ни один
// цвет не читается и нужна подложка.
const Line: React.FC<{
  text: string; size: number; start?: number; top?: string; left?: string;
  color?: string; scrim?: boolean;
}> = ({text, size, start = 0, top = '18%', left = '4%', color = '#f0efec', scrim}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f - start, fps, config: {damping: 200, mass: 0.6}});
  return (
    <div style={{
      position: 'absolute', top, left, right: '4%',
      background: scrim
        ? 'linear-gradient(90deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.55) 68%, rgba(0,0,0,0) 100%)'
        : undefined,
      padding: scrim ? '0.10em 0.28em' : undefined,
      fontFamily: SERIF, fontWeight: 700, fontSize: size, lineHeight: 0.94,
      color, letterSpacing: -1,
      opacity: s,
      transform: `translateY(${(1 - s) * 22}px)`,
    }}>{text}</div>
  );
};

const Black: React.FC<{text: string}> = ({text}) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [2, 12], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{background: '#050506', justifyContent: 'center', alignItems: 'center'}}>
      <div style={{
        fontFamily: SERIF, fontWeight: 700, fontSize: 128, color: '#f0efec',
        opacity: o, textAlign: 'center', padding: '0 6%',
      }}>{text}</div>
      <Grain o={0.05} />
    </AbsoluteFill>
  );
};

export const HeroDemo: React.FC = () => {
  // Ритм яркости — из замера образца: светло, темнее, почти чёрный, средне.
  const B = [0, 100, 190, 250, 340, 450];
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      <Sequence from={B[0]} durationInFrames={B[1]}>
        <Plate src={staticFile(IMG[0])} len={B[1]} bright={1.06} />
        <Line text="Zwei Wochen alt." size={132} start={8} color="#f0efec" />
      </Sequence>
      <Sequence from={B[1]} durationInFrames={B[2] - B[1]}>
        <Plate src={staticFile(IMG[1])} len={B[2] - B[1]} bright={0.72} push={0.2} />
        <Line text="Die Prüfung war bestanden." size={104} start={6} top="60%" color="#0a0a0a" />
      </Sequence>
      <Sequence from={B[2]} durationInFrames={B[3] - B[2]}>
        <Black text="Dann kam das Wasser." />
      </Sequence>
      <Sequence from={B[3]} durationInFrames={B[4] - B[3]}>
        <Plate src={staticFile(IMG[2])} len={B[4] - B[3]} bright={0.9} push={0.24} />
        <Line text="400 Millionen." size={172} start={4} top="22%" color="#f0efec" />
      </Sequence>
      <Sequence from={B[4]} durationInFrames={B[5] - B[4]}>
        <Plate src={staticFile(IMG[0])} len={B[5] - B[4]} bright={0.6} push={0.1} />
        <Line text="Niemand konnte erklären, warum." size={92} start={6} top="66%" color="#f0efec" scrim />
      </Sequence>
    </AbsoluteFill>
  );
};
