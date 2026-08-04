import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, Easing } from 'remotion';
import type { VariantProps } from '../types';
import { TEXT } from '../fonts';

// Highlight, вариант «фокусировка». Встроенный Highlight обводит точку
// эллипсом и тянет выноску вбок к подписи. Здесь эллипса нет вовсе: с четырёх
// сторон СХОДЯТСЯ угловые скобки, как автофокус в видоискателе, и в момент
// схождения коротко вспыхивает рамка — «поймал». Подпись не уезжает вбок,
// а стоит прямо под точкой. Движение направлено внутрь, а не наружу.
export const HighlightAi5A19: React.FC<VariantProps> = (p) => {
  const frame = useCurrentFrame();

  const m = /point:([\d.]+),([\d.]+)/.exec(p.pos || '');
  const cx = m ? parseFloat(m[1]) : 62;
  const cy = m ? parseFloat(m[2]) : 45;

  // Схождение: скобки идут из-за пределов зоны к её углам.
  const lock = interpolate(frame, [0, 18], [1, 0], {
    easing: Easing.out(Easing.poly(4)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // Вспышка ровно в момент схождения — короткая, 5 кадров.
  const flash = interpolate(frame, [17, 20, 25], [0, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const labelIn = interpolate(frame, [20, 32], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ACCENT = '#e0c05a';
  const HALF = 7.5;                 // полуразмер зоны фокуса, % кадра
  const spread = lock * 9;          // насколько скобки ещё разведены
  const opacity = p.enter * p.exit;

  // Подпись под точкой, но не за нижней кромкой кадра.
  const labelTop = Math.min(cy + HALF + 4, 84);

  const corner = (dx: number, dy: number) => {
    const x = cx + dx * (HALF + spread);
    const y = cy + dy * (HALF + spread);
    const arm = 3.2;
    return (
      <g key={`${dx}_${dy}`}>
        <line x1={x} y1={y} x2={x - dx * arm} y2={y}
              stroke={ACCENT} strokeWidth={0.5} vectorEffect="non-scaling-stroke" />
        <line x1={x} y1={y} x2={x} y2={y - dy * arm}
              stroke={ACCENT} strokeWidth={0.5} vectorEffect="non-scaling-stroke" />
      </g>
    );
  };

  return (
    <AbsoluteFill style={{ opacity }}>
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none"
           style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        <g style={{ filter: `drop-shadow(0 0 5px rgba(224,192,90,0.7))` }}>
          {corner(-1, -1)}
          {corner(1, -1)}
          {corner(-1, 1)}
          {corner(1, 1)}
        </g>
        {/* вспышка захвата: рамка целиком, живёт пять кадров */}
        {flash > 0.01 ? (
          <rect x={cx - HALF} y={cy - HALF} width={HALF * 2} height={HALF * 2}
                fill="none" stroke={ACCENT} strokeWidth={0.35}
                opacity={flash * 0.9} vectorEffect="non-scaling-stroke" />
        ) : null}
      </svg>

      <div style={{
        position: 'absolute',
        left: `${cx}%`,
        top: `${labelTop}%`,
        transform: `translate(-50%, ${(1 - labelIn) * 8}px)`,
        opacity: labelIn,
        fontFamily: TEXT,
        fontSize: 30,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: '#fff',
        background: 'rgba(10,12,16,0.78)',
        padding: '8px 16px',
        borderTop: `3px solid ${ACCENT}`,
        textShadow: '0 2px 8px rgba(0,0,0,0.9)',
        whiteSpace: 'nowrap',
        maxWidth: '40%',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>{p.content}</div>
    </AbsoluteFill>
  );
};
