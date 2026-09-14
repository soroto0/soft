import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { VariantProps } from '../types';
import { DISPLAY, TEXT } from '../fonts';

/**
 * СЕМЬЯ «ПРО» — моушн-приёмы, снятые с профессионального датасета
 * (шоурилы студий и реклама Apple).
 *
 * Чем отличается от всего, что было в библиотеке. Прежние плашки двигали
 * прямоугольники: подложка приехала, текст проявился. Здесь работают
 * приёмы, которые считаются фильтром, а не раскладкой, и потому дают
 * картинку другого класса:
 *
 *   ИСКАЖЕНИЕ     feTurbulence + feDisplacementMap: волна проходит по
 *                 кадру. Сила и частота анимируются — отсюда «течение»,
 *                 а не размазанная картинка
 *   РАСЩЕПЛЕНИЕ   каналы R и B разъезжаются и сходятся; работает только
 *                 на 0.15–0.3 с, дольше читается как брак
 *   МАСКА         полоса раскрывает текст резко; мягкое раскрытие — это
 *                 уже затухание, другой приём
 *   КИНЕТИКА      знаки влетают по одному с поворотом в перспективе
 *   ПОДАЧА APPLE  светлое поле с градиентом, герой по центру, гигантское
 *                 слово ПОЗАДИ него, мелкая строка с точкой в конце
 *
 * Про подачу Apple отдельно: разобрана покадрово их десятисекундная
 * реклама. Там поле СВЕТЛОЕ, текст МЕЛКИЙ, а гигантская типографика —
 * фактура позади продукта, а не сообщение. Ровно наоборот тому, как
 * обычно делают «под Apple».
 *
 * Все сиды фильтров фиксированы: рендер обязан быть воспроизводимым.
 */

/** Фильтры объявляются в разметке — в CSS SVG-фильтр не создать. */
const Defs: React.FC<{ warp: number; freq: number; split: number }> = ({ warp, freq, split }) => (
  <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
    <defs>
      <filter id="mp-warp" x="-20%" y="-20%" width="140%" height="140%">
        <feTurbulence type="fractalNoise" baseFrequency={`${freq} ${freq * 2}`}
                      numOctaves={2} seed={7} result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale={warp}
                           xChannelSelector="R" yChannelSelector="G" />
      </filter>
      <filter id="mp-rgb" x="-10%" y="-10%" width="120%" height="120%">
        <feOffset in="SourceGraphic" dx={-split} dy={0} result="r" />
        <feColorMatrix in="r" type="matrix" result="rr"
          values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" />
        <feOffset in="SourceGraphic" dx={split} dy={0} result="b" />
        <feColorMatrix in="b" type="matrix" result="bb"
          values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" />
        <feColorMatrix in="SourceGraphic" type="matrix" result="gg"
          values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" />
        <feBlend in="rr" in2="gg" mode="screen" result="rg" />
        <feBlend in="rg" in2="bb" mode="screen" />
      </filter>
    </defs>
  </svg>
);

/**
 * Заголовок с волной искажения. Контент: «ЗАГОЛОВОК::подпись».
 */
export const ProWarpTitle: React.FC<VariantProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [head, sub] = (p.content || '').split('::');
  const out = p.enter * p.exit;

  // Волна: быстрый набор силы, долгий спад. Держится всего полсекунды —
  // дольше искажение перестаёт читаться как приём и начинает мешать.
  const w = Math.round(fps * 0.5);
  const warp = interpolate(frame, [0, w * 0.4, w], [0, 46, 0], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const freq = interpolate(frame, [0, w], [0.004, 0.011], { extrapolateRight: 'clamp' });

  // Маска раскрывает строку снизу — резко, за треть секунды.
  const m = interpolate(frame, [Math.round(fps * 0.1), Math.round(fps * 0.45)], [100, 0], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ opacity: out }}>
      <Defs warp={warp} freq={freq} split={0} />
      <div style={{ position: 'absolute', left: '6%', right: '6%', bottom: '14%',
                    filter: 'url(#mp-warp)' }}>
        <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: '5.4cqw',
                      lineHeight: 0.95, color: '#f7f7f8', letterSpacing: '-0.025em',
                      textTransform: 'uppercase',
                      clipPath: `inset(${m}% 0 0 0)`,
                      textShadow: '0 6px 30px rgba(0,0,0,.6)' }}>
          {head}
        </div>
        {sub ? (
          <div style={{ fontFamily: TEXT, fontSize: '1.6cqw', color: 'rgba(247,247,248,.8)',
                        letterSpacing: '0.2em', textTransform: 'uppercase',
                        marginTop: '1cqw', clipPath: `inset(${m}% 0 0 0)` }}>
            {sub}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

/**
 * Переход-расщепление: каналы разъезжаются и сходятся. Ставится на стык.
 */
export const ProRGBSplit: React.FC<VariantProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const text = (p.content || '').split('::')[0];
  const out = p.enter * p.exit;

  const d = Math.round(fps * 0.26);
  const split = interpolate(frame, [0, d * 0.5, d], [0, 26, 0], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ opacity: out }}>
      <Defs warp={0} freq={0.004} split={split} />
      {text ? (
        <div style={{ position: 'absolute', left: 0, right: 0, top: '44%',
                      textAlign: 'center', filter: 'url(#mp-rgb)',
                      fontFamily: DISPLAY, fontWeight: 900, fontSize: '7cqw',
                      color: '#f7f7f8', textTransform: 'uppercase',
                      letterSpacing: '-0.03em' }}>
          {text}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

/**
 * Посимвольный вылет с поворотом в перспективе. Контент: одна строка.
 */
export const ProKineticLine: React.FC<VariantProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const out = p.enter * p.exit;
  const chars = [...((p.content || '').split('::')[0] || '')];
  const step = Math.max(1, Math.round(fps * 0.035));

  return (
    <AbsoluteFill style={{ opacity: out, perspective: 1200 }}>
      <div style={{ position: 'absolute', left: '6%', right: '6%', bottom: '16%',
                    fontFamily: DISPLAY, fontWeight: 900, fontSize: '5.8cqw',
                    color: '#f7f7f8', textTransform: 'uppercase',
                    letterSpacing: '-0.025em', textShadow: '0 6px 30px rgba(0,0,0,.6)' }}>
        {chars.map((ch, i) => {
          const t = interpolate(frame, [i * step, i * step + Math.round(fps * 0.34)], [0, 1], {
            easing: Easing.out(Easing.poly(4)),
            extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
          });
          return (
            <span key={i} style={{
              display: 'inline-block',
              opacity: t,
              transform: `translateY(${(1 - t) * 90}px) rotateX(${(1 - t) * -70}deg)`,
              transformOrigin: '50% 100%',
            }}>
              {ch === ' ' ? ' ' : ch}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/**
 * Подача Apple: светлое поле, гигантское слово подложкой, мелкая строка.
 * Контент: «СЛОВО-ПОДЛОЖКА::мелкая строка с точкой.»
 */
export const ProAppleCard: React.FC<VariantProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const [word, line] = (p.content || '').split('::');
  const out = p.enter * p.exit;

  // Появление у Apple почти не видно: короткий подъём, мягкая остановка.
  const rise = (delay: number) =>
    interpolate(frame, [Math.round(fps * delay), Math.round(fps * (delay + 0.9))], [0, 1], {
      easing: Easing.out(Easing.quad),
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    });

  const tw = rise(0.1);
  const tl = rise(0.7);
  // Кадр дышит: медленный наезд на всю длину.
  const drift = interpolate(frame, [0, fps * 3], [1, 1.04], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ opacity: out }}>
      {/* Поле светлое — в разобранной рекламе тёмного фона нет вовсе. */}
      <AbsoluteFill style={{
        background: 'radial-gradient(120% 90% at 50% 20%, #fffdf6 0%, #f6e6bd 38%, #d8b25c 78%, #b98f34 100%)',
        opacity: 0.96,
      }} />
      {word ? (
        <div style={{
          position: 'absolute', left: 0, right: 0, top: '26%', textAlign: 'center',
          fontFamily: DISPLAY, fontWeight: 800, fontSize: Math.round(width * 0.17), lineHeight: 0.9,
          color: '#14140f', letterSpacing: '-0.04em', textTransform: 'uppercase',
          opacity: tw * 0.92, transform: `translateY(${(1 - tw) * 24}px) scale(${drift})`,
        }}>
          {word}
        </div>
      ) : null}
      {line ? (
        <div style={{
          position: 'absolute', left: '10%', right: '10%', bottom: '22%',
          textAlign: 'center', fontFamily: TEXT, fontWeight: 600,
          fontSize: Math.round(width * 0.026), color: '#14140f', letterSpacing: '-0.01em',
          opacity: tl, transform: `translateY(${(1 - tl) * 16}px)`,
        }}>
          {line}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

/**
 * Шлейф за словом: две копии позади со сдвигом по времени.
 * Контент: одна строка.
 */
export const ProEchoWord: React.FC<VariantProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const word = (p.content || '').split('::')[0];
  const out = p.enter * p.exit;

  const layer = (delayS: number, alpha: number) => {
    const t = interpolate(frame,
      [Math.round(fps * delayS), Math.round(fps * (delayS + 0.4))], [0, 1], {
        easing: Easing.out(Easing.poly(4)),
        extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
      });
    return { opacity: t * alpha, transform: `translateX(${(1 - t) * -120}px)` };
  };

  return (
    <AbsoluteFill style={{ opacity: out }}>
      {[[0.0, 0.20], [0.06, 0.34], [0.12, 1.0]].map(([d, a], i) => (
        <div key={i} style={{
          position: 'absolute', left: '6%', right: '6%', bottom: '18%',
          fontFamily: DISPLAY, fontWeight: 900, fontSize: '7.2cqw',
          color: i === 2 ? '#f7f7f8' : '#d8b25c',
          textTransform: 'uppercase', letterSpacing: '-0.03em',
          ...layer(d as number, a as number),
        }}>
          {word}
        </div>
      ))}
    </AbsoluteFill>
  );
};
