import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { VariantProps } from '../types';

// Callout, вариант «бирка на нити». Встроенный Callout ставит рядом с точкой
// прямоугольник, ai_6cdb — паспарту с ниточкой, ai_7e21 тянет размерную
// линию вбок. Здесь выноска ВИСИТ: от точки вниз уходит нить, на ней бирка,
// и она качается маятником, затухая. Единственный из четырёх, где движение
// вертикальное и инерционное — предмет, а не построение.
export const CalloutAiB95D: React.FC<VariantProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const m = /point:([\d.]+),([\d.]+)/.exec(p.pos || '');
  const cx = m ? parseFloat(m[1]) : 62;
  const cy = m ? parseFloat(m[2]) : 40;

  // Нить отрастает вниз, бирка падает вместе с ней и потом качается.
  const drop = interpolate(frame, [0, 16], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const t = frame / Math.max(1, fps);
  const damp = interpolate(frame, [10, Math.round(fps * 1.6)], [1, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // Качание вокруг ТОЧКИ ПОДВЕСА, а не вокруг центра бирки: иначе она
  // ездит вбок, вместо того чтобы висеть.
  const swing = Math.sin(t * 6.2) * 11 * damp;

  const CORD = 12;                       // длина нити, % высоты кадра
  const ACCENT = '#cdb98a';
  const opacity = p.enter * p.exit;

  return (
    <AbsoluteFill style={{ opacity }}>
      {/* гвоздик в самой точке */}
      <div style={{
        position: 'absolute',
        left: `${cx}%`, top: `${cy}%`,
        width: 9, height: 9, marginLeft: -4.5, marginTop: -4.5,
        borderRadius: '50%',
        background: ACCENT,
        boxShadow: `0 0 10px rgba(205,185,138,0.9)`,
      }} />

      <div style={{
        position: 'absolute',
        left: `${cx}%`,
        top: `${cy}%`,
        transform: `rotate(${swing}deg)`,
        transformOrigin: 'top center',
      }}>
        <div style={{
          width: 2,
          height: `${CORD * drop}vh`,
          margin: '0 auto',
          background: 'rgba(205,185,138,0.8)',
        }} />
        <div style={{
          transform: 'translateX(-50%)',
          marginLeft: 1,
          opacity: drop,
          background: 'rgba(238,231,214,0.94)',
          padding: '12px 22px',
          border: '1px solid rgba(90,78,54,0.45)',
          boxShadow: '0 12px 26px rgba(0,0,0,0.55)',
          fontFamily: "'Segoe UI', Arial, sans-serif",
          fontSize: 30,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: '#2a251c',
          whiteSpace: 'nowrap',
        }}>{p.content}</div>
      </div>
    </AbsoluteFill>
  );
};
