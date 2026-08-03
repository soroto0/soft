import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { VariantProps } from '../types';

// Infographic, вариант «табло». Встроенный тип рисуется тем же BarChart, что и
// bars: горизонтальные полосы, растущие влево-вправо. Здесь полос нет вообще —
// значения показаны КРУПНЫМИ ЧИСЛАМИ, которые набегают счётчиком, а между
// колонками сверху вниз прочерчиваются разделители. Для инфографики это честнее:
// зритель читает величину, а не сравнивает длины.
export const InfographicAi4B17: React.FC<VariantProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const items = (p.content || '').split(',').map((pair) => {
    const [label, val] = pair.split(':');
    return { label: (label || '').trim(), val: parseFloat(val) || 0 };
  }).filter((it) => it.label).slice(0, 4);

  const step = Math.max(3, Math.round(fps * 0.13));
  const spin = Math.max(8, Math.round(fps * 0.55));   // сколько бежит счётчик

  const ACCENT = '#e8b64c';
  const opacity = p.enter * p.exit;

  // Дробную часть держим: «3.5» не должно превратиться в «35».
  const fmt = (v: number) => (Math.abs(v % 1) > 0.001 ? v.toFixed(1) : String(Math.round(v)));

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{
        opacity,
        display: 'flex',
        gap: 0,
        padding: '34px 10px',
        maxWidth: '86%',
      }}>
        {items.map((it, i) => {
          const t0 = i * step;
          const run = interpolate(frame, [t0, t0 + spin], [0, 1], {
            easing: Easing.out(Easing.poly(4)),
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          const rise = interpolate(frame, [t0, t0 + 12], [26, 0], {
            easing: Easing.out(Easing.cubic),
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          // разделитель прочерчивается сверху вниз, у первой колонки его нет
          const rule = interpolate(frame, [t0 - 4, t0 + 14], [0, 1], {
            easing: Easing.out(Easing.cubic),
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          return (
            <div key={i} style={{
              position: 'relative',
              padding: '0 44px',
              textAlign: 'center',
              minWidth: 190,
            }}>
              {i > 0 ? (
                <div style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 1,
                  background: 'rgba(255,255,255,0.28)',
                  transform: `scaleY(${rule})`,
                  transformOrigin: 'top center',
                }} />
              ) : null}
              <div style={{
                transform: `translateY(${rise}px)`,
                opacity: run > 0 ? 1 : 0,
                fontFamily: "'Segoe UI', Arial, sans-serif",
                fontSize: 92,
                fontWeight: 700,
                lineHeight: 1,
                color: ACCENT,
                textShadow: '0 4px 22px rgba(0,0,0,0.92)',
                fontVariantNumeric: 'tabular-nums',
              }}>{fmt(it.val * run)}</div>
              <div style={{
                marginTop: 12,
                transform: `translateY(${rise * 0.6}px)`,
                opacity: run,
                fontFamily: "'Segoe UI', Arial, sans-serif",
                fontSize: 24,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: '#e9e6df',
                textShadow: '0 2px 10px rgba(0,0,0,0.95)',
              }}>{it.label}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
