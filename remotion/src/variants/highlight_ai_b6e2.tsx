import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { VariantProps } from '../types';

// Highlight, вариант «эхо». Ни обводки, ни скобок: от точки РАСХОДЯТСЯ
// кольца, как круги по воде, — три штуки со сдвигом по времени, каждое
// растёт и гаснет. Движение повторяющееся и направлено наружу (у встроенного
// Highlight — однократная обводка по контуру, у «фокусировки» — схождение
// внутрь). Подпись висит на тонком стебле сверху, а не сбоку.
export const HighlightAiB6E2: React.FC<VariantProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const m = /point:([\d.]+),([\d.]+)/.exec(p.pos || '');
  const cx = m ? parseFloat(m[1]) : 62;
  const cy = m ? parseFloat(m[2]) : 45;

  const period = Math.max(12, Math.round(fps * 0.85));
  const ACCENT = '#7ec8e3';
  const opacity = p.enter * p.exit;

  // Три кольца со сдвигом на треть периода — получается непрерывное эхо,
  // а не пульсация целиком.
  const rings = [0, 1, 2].map((i) => {
    const t = ((frame - i * (period / 3)) % period + period) % period;
    const k = t / period;
    return { r: 2 + k * 11, o: (1 - k) * 0.85, w: 0.55 * (1 - k) + 0.15 };
  });

  const stem = interpolate(frame, [6, 22], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const labelIn = interpolate(frame, [18, 32], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const STEM = 13;                              // длина стебля, % высоты
  const labelTop = Math.max(cy - STEM - 8, 4);  // не уезжать за верх кадра

  return (
    <AbsoluteFill style={{ opacity }}>
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none"
           style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        {rings.map((r, i) => (
          <ellipse key={i} cx={cx} cy={cy} rx={r.r} ry={r.r * 0.78}
                   fill="none" stroke={ACCENT} strokeWidth={r.w}
                   opacity={r.o} vectorEffect="non-scaling-stroke" />
        ))}
        {/* ядро точки */}
        <ellipse cx={cx} cy={cy} rx={1.1} ry={0.85} fill={ACCENT}
                 style={{ filter: `drop-shadow(0 0 6px rgba(126,200,227,0.9))` }} />
        {/* стебель вверх — прочерчивается */}
        <line x1={cx} y1={cy - 2} x2={cx} y2={cy - 2 - STEM * stem}
              stroke={ACCENT} strokeWidth={0.35} vectorEffect="non-scaling-stroke" />
      </svg>

      <div style={{
        position: 'absolute',
        left: `${cx}%`,
        top: `${labelTop}%`,
        transform: `translate(-50%, ${(1 - labelIn) * -8}px)`,
        opacity: labelIn,
        fontFamily: "'Segoe UI', Arial, sans-serif",
        fontSize: 29,
        color: '#eaf6fb',
        background: 'rgba(8,14,20,0.74)',
        padding: '8px 18px',
        borderBottom: `2px solid ${ACCENT}`,
        textShadow: '0 2px 8px rgba(0,0,0,0.9)',
        whiteSpace: 'nowrap',
        maxWidth: '40%',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>{p.content}</div>
    </AbsoluteFill>
  );
};
