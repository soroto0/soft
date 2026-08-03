import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, Easing } from 'remotion';
import type { VariantProps } from '../types';

// Callout, вариант «размерная выноска». Встроенный Callout ставит рядом с
// точкой прямоугольник с указателем, ai_6cdb — музейное паспарту с ниточкой
// к цели. Здесь ни рамки, ни коробки: от точки, как рулетка, ВЫТЯГИВАЕТСЯ
// размерная линия с засечками на концах, и подпись сидит прямо НА линии —
// так подписывают узлы на чертеже. Движение линейное и одномерное (растёт
// длина), а не «появилась плашка».
export const CalloutAi7E21: React.FC<VariantProps> = (p) => {
  const frame = useCurrentFrame();

  const m = /point:([\d.]+),([\d.]+)/.exec(p.pos || '');
  const cx = m ? parseFloat(m[1]) : 62;
  const cy = m ? parseFloat(m[2]) : 45;

  // Тянем в сторону, где больше места: у правого края линия ушла бы за кадр.
  const toLeft = cx > 55;
  const dir = toLeft ? -1 : 1;
  const LEN = 26;                       // длина выноски, % ширины

  const pull = interpolate(frame, [0, 20], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const labelIn = interpolate(frame, [14, 28], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ACCENT = '#e6d3a3';
  const opacity = p.enter * p.exit;
  const endX = cx + dir * LEN * pull;
  const TICK = 2.4;                     // высота засечки, % высоты

  return (
    <AbsoluteFill style={{ opacity }}>
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none"
           style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        <g stroke={ACCENT} strokeWidth={0.4} vectorEffect="non-scaling-stroke"
           style={{ filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.9))' }}>
          {/* засечка у самой точки — стоит сразу, она и есть «отсюда меряем» */}
          <line x1={cx} y1={cy - TICK} x2={cx} y2={cy + TICK} />
          {/* сама размерная линия — вытягивается */}
          <line x1={cx} y1={cy} x2={endX} y2={cy} />
          {/* засечка на дальнем конце появляется, только когда линия дошла */}
          {pull > 0.92 ? (
            <line x1={endX} y1={cy - TICK} x2={endX} y2={cy + TICK} />
          ) : null}
        </g>
      </svg>

      <div style={{
        position: 'absolute',
        left: `${(cx + endX) / 2}%`,
        top: `${cy}%`,
        transform: 'translate(-50%, -140%)',
        opacity: labelIn,
        fontFamily: "'Bahnschrift', 'Segoe UI', sans-serif",
        fontSize: 30,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: '#ffffff',
        textShadow: '0 2px 10px rgba(0,0,0,0.95), 0 0 24px rgba(0,0,0,0.8)',
        whiteSpace: 'nowrap',
      }}>{p.content}</div>
    </AbsoluteFill>
  );
};
