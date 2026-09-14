import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { VariantProps } from '../types';
import { DISPLAY, TEXT } from '../fonts';

/**
 * КОЛЛАЖНАЯ СЕМЬЯ ПЛАШЕК — вырезка из бумаги, а не прямоугольник.
 *
 * Откуда взято. Разобрано 94 ролика датасета; коллажная перекладка —
 * самая крупная его часть (57 роликов). Оттуда сняты приёмы, которых в
 * библиотеке не было ни одного:
 *
 *   рваный край   вместо ровной рамки — clip-path неровным многоугольником
 *   бумага        тёплая подложка с зерном, а не плоская заливка
 *   скотч         полупрозрачные полоски по углам: вырезку «приклеили»
 *   дрожь         покадровый скачок положения — подпись покадровой съёмки
 *   вырубка       текст на подложке, выходящий за её край
 *
 * Почему это стоит в продукте. Все прежние плашки — цифровые: ровные
 * рамки, плавные кривые. На документальном материале они читаются как
 * презентация. Коллажная семья даёт бумажную фактуру, под которую
 * подходит архивная тема — а именно её берут каналы вроде einsturzpunkt.
 *
 * Дрожь задана таблицей, а не Math.random(): рендер обязан быть
 * воспроизводимым, иначе один и тот же кадр в двух прогонах разный.
 */

// Смещения перекладки. Десять шагов, дальше повтор — на глаз период не
// читается, а таблица держит детерминизм.
const JITTER: Array<[number, number]> = [
  [0, 0], [2, -1], [-1, 2], [1, 1], [-2, -1],
  [0, 2], [2, 0], [-1, -2], [1, -1], [-2, 1],
];

// Рваный край. Точки заданы вручную: сгенерированные при каждом рендере
// давали бы разную форму на одном и том же кадре.
const TORN =
  'polygon(1% 3%,12% 0%,26% 4%,41% 1%,58% 5%,73% 1%,88% 4%,99% 1%,' +
  '100% 14%,97% 29%,100% 44%,98% 61%,100% 76%,97% 91%,99% 99%,' +
  '86% 97%,71% 100%,55% 96%,38% 100%,22% 97%,8% 100%,0% 96%,' +
  '2% 82%,0% 66%,3% 50%,0% 34%,2% 18%)';

const GRAIN =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'>" +
  "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' " +
  "stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter>" +
  "<rect width='300' height='300' filter='url(%23n)' opacity='0.55'/></svg>";

const PAPER = '#efe7d6';
const INK = '#1a1714';

/** Шаг перекладки: 12 «кадров» в секунду независимо от fps проекта. */
function useJitter(frame: number, fps: number): [number, number] {
  const step = Math.max(1, Math.round(fps / 12));
  return JITTER[Math.floor(frame / step) % JITTER.length];
}

const Tape: React.FC<{ style: React.CSSProperties }> = ({ style }) => (
  <div
    style={{
      position: 'absolute',
      width: 150,
      height: 42,
      background: 'rgba(245,240,215,.74)',
      boxShadow: '0 1px 0 rgba(20,18,16,.16)',
      ...style,
    }}
  />
);

/**
 * Титульная вырезка. Контент: «ЗАГОЛОВОК::подпись».
 */
export const CollageTorn: React.FC<VariantProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [jx, jy] = useJitter(frame, fps);

  const [headline, sub] = (p.content || '').split('::');

  // Влёт: издалека, с поворотом и смазом. Смаз обязателен — резкая
  // вырезка, прилетевшая за четверть секунды, читается как подмена кадра.
  const t = interpolate(frame, [0, Math.round(fps * 0.28)], [0, 1], {
    easing: Easing.out(Easing.poly(4)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const blur = interpolate(t, [0, 1], [26, 0]);
  const rot = interpolate(t, [0, 1], [-11, -3]);
  const scale = interpolate(t, [0, 1], [1.22, 1]);

  // Уход: вдвое быстрее прихода. Приход надо рассмотреть, уход — нет.
  const out = p.enter * Math.min(1, p.exit * 2);   // уход вдвое быстрее прихода

  return (
    <AbsoluteFill style={{ opacity: out }}>
      <div
        style={{
          position: 'absolute',
          left: '6%',
          bottom: '12%',
          width: '58%',
          transform: `translate(${jx}px, ${jy}px) rotate(${rot}deg) scale(${scale})`,
          filter: `blur(${blur}px)`,
          opacity: t,
        }}
      >
        <div
          style={{
            position: 'relative',
            background: PAPER,
            clipPath: TORN,
            padding: '3.4cqw 3.8cqw',
          }}
        >
          {/* зерно бумаги: без него подложка выглядит пластиком */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `url("${GRAIN}")`,
              backgroundSize: '200px 200px',
              opacity: 0.18,
              mixBlendMode: 'multiply',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              fontFamily: DISPLAY,
              fontWeight: 900,
              fontSize: '4.2cqw',
              lineHeight: 0.92,
              letterSpacing: '-0.02em',
              color: INK,
              textTransform: 'uppercase',
              position: 'relative',
            }}
          >
            {headline}
          </div>
          {sub ? (
            <div
              style={{
                fontFamily: TEXT,
                fontSize: '1.5cqw',
                marginTop: '1.1cqw',
                color: 'rgba(26,23,20,.72)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                position: 'relative',
              }}
            >
              {sub}
            </div>
          ) : null}
        </div>

        <Tape style={{ left: -34, top: -16, transform: 'rotate(-38deg)' }} />
        <Tape style={{ right: -34, bottom: -16, transform: 'rotate(-38deg)' }} />
      </div>
    </AbsoluteFill>
  );
};

/**
 * Нижняя треть вырезкой. Контент: «ИМЯ::должность».
 */
export const CollageLower: React.FC<VariantProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [jx, jy] = useJitter(frame, fps);
  const [name, role] = (p.content || '').split('::');

  const t = interpolate(frame, [0, Math.round(fps * 0.24)], [0, 1], {
    easing: Easing.out(Easing.poly(4)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const x = interpolate(t, [0, 1], [-46, 0]);
  const out = p.enter * Math.min(1, p.exit * 2);   // уход вдвое быстрее прихода

  return (
    <AbsoluteFill style={{ opacity: out }}>
      <div
        style={{
          position: 'absolute',
          left: '5%',
          bottom: '14%',
          transform: `translate(${x + jx}%, ${jy}px) rotate(-1.5deg)`,
          opacity: t,
          filter: `blur(${interpolate(t, [0, 1], [18, 0])}px)`,
        }}
      >
        <div
          style={{
            background: INK,
            color: PAPER,
            fontFamily: DISPLAY,
            fontWeight: 900,
            fontSize: '2.6cqw',
            letterSpacing: '-0.01em',
            textTransform: 'uppercase',
            padding: '0.5cqw 1.4cqw',
            clipPath: TORN,
          }}
        >
          {name}
        </div>
        {role ? (
          <div
            style={{
              background: PAPER,
              color: INK,
              fontFamily: TEXT,
              fontSize: '1.3cqw',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              padding: '0.4cqw 1.2cqw',
              marginTop: '0.4cqw',
              marginLeft: '2.2cqw',
              display: 'inline-block',
              transform: 'rotate(1.2deg)',
            }}
          >
            {role}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

/**
 * Вырубленная цитата: буквы поверх подложки, выходящие за её край.
 * Контент: «текст цитаты::автор».
 */
export const CollageQuote: React.FC<VariantProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [jx, jy] = useJitter(frame, fps);
  const [quote, author] = (p.content || '').split('::');

  const t = interpolate(frame, [0, Math.round(fps * 0.3)], [0, 1], {
    easing: Easing.out(Easing.poly(4)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const out = p.enter * Math.min(1, p.exit * 2);   // уход вдвое быстрее прихода

  return (
    <AbsoluteFill style={{ opacity: out }}>
      <div
        style={{
          position: 'absolute',
          left: '8%',
          top: '22%',
          width: '52%',
          transform: `translate(${jx}px, ${jy}px) rotate(2deg) scale(${interpolate(t, [0, 1], [1.15, 1])})`,
          opacity: t,
          filter: `blur(${interpolate(t, [0, 1], [22, 0])}px)`,
        }}
      >
        {/* подложка чуть меньше текста: буквы намеренно вылезают за край */}
        <div
          style={{
            position: 'absolute',
            inset: '8% 12% 14% 6%',
            background: PAPER,
            clipPath: TORN,
          }}
        />
        <div
          style={{
            position: 'relative',
            fontFamily: DISPLAY,
            fontWeight: 900,
            fontSize: '3.4cqw',
            lineHeight: 1.0,
            letterSpacing: '-0.025em',
            color: INK,
            textTransform: 'uppercase',
            padding: '2cqw',
          }}
        >
          {quote}
        </div>
        {author ? (
          <div
            style={{
              position: 'relative',
              marginLeft: '2cqw',
              display: 'inline-block',
              background: INK,
              color: PAPER,
              fontFamily: TEXT,
              fontSize: '1.2cqw',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              padding: '0.35cqw 1cqw',
              transform: 'rotate(-1.6deg)',
            }}
          >
            {author}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
