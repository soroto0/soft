import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { VariantProps } from '../types';
import { DISPLAY, TEXT } from '../fonts';

// Bars, вариант «столбцы». Встроенный BarChart растит полосы ВЛЕВО-ВПРАВО,
// ai_fcf3 чертит их лучом осциллографа. Здесь ось повёрнута: столбцы растут
// СНИЗУ ВВЕРХ от общей базовой линии, значение стоит над столбцом и
// набегает вместе с ним. Другая ось — другой силуэт кадра.
export const BarsAi8F3C: React.FC<VariantProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const items = (p.content || '').split(',').map((pair) => {
    const [label, val] = pair.split(':');
    return { label: (label || '').trim(), val: parseFloat(val) || 0 };
  }).filter((it) => it.label).slice(0, 5);
  const max = Math.max(...items.map((i) => i.val), 1);

  const step = Math.max(2, Math.round(fps * 0.1));
  const grow = Math.max(10, Math.round(fps * 0.7));
  const ACCENT = '#d9a441';
  const opacity = p.enter * p.exit;
  const fmt = (v: number) =>
    Math.abs(v % 1) > 0.001 ? v.toFixed(1) : String(Math.round(v));

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{
        opacity,
        display: 'flex',
        alignItems: 'flex-end',
        gap: 34,
        height: 340,
        borderBottom: '2px solid rgba(255,255,255,0.5)',
        padding: '0 20px',
      }}>
        {items.map((it, i) => {
          const t0 = i * step;
          const k = interpolate(frame, [t0, t0 + grow], [0, 1], {
            easing: Easing.out(Easing.cubic),
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          const h = (it.val / max) * 300 * k;
          return (
            <div key={i} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-end',
            }}>
              <div style={{
                opacity: k,
                fontFamily: DISPLAY,
                fontSize: 36,
                color: '#ffffff',
                marginBottom: 8,
                textShadow: '0 2px 10px rgba(0,0,0,0.95)',
                fontVariantNumeric: 'tabular-nums',
              }}>{fmt(it.val * k)}</div>
              <div style={{
                width: 74,
                height: h,
                background: `linear-gradient(180deg, ${ACCENT}, rgba(217,164,65,0.35))`,
                boxShadow: `0 0 18px rgba(217,164,65,0.45)`,
              }} />
              <div style={{
                marginTop: 10,
                opacity: k,
                fontFamily: TEXT,
                fontSize: 22,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#eceae4',
                textShadow: '0 2px 10px rgba(0,0,0,0.95)',
                maxWidth: 120,
                textAlign: 'center',
              }}>{it.label}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
