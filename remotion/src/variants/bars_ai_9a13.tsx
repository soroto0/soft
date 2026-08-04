import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { VariantProps } from '../types';
import { TEXT } from '../fonts';

// Bars, второй вид. Встроенный BarChart растит ГОРИЗОНТАЛЬНЫЕ сплошные полосы
// слева направо. Здесь полосы ВЕРТИКАЛЬНЫЕ и набираются дискретными блоками
// снизу вверх — как столбик из кубиков. Дробность вместо гладкости: значение
// читается ещё и по числу блоков, а не только по длине.
export const BarsAi9A13: React.FC<VariantProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const items = (p.content || '').split(',').map((pair) => {
    const [label, val] = pair.split(':');
    return { label: (label || '').trim(), val: parseFloat(val) || 0 };
  }).filter((it) => it.label).slice(0, 5);

  const maxVal = Math.max(...items.map((i) => i.val), 1);
  const BLOCKS = 12;                       // высота столбика в блоках
  const step = Math.max(2, Math.round(fps * 0.1));
  const fill = Math.max(8, Math.round(fps * 0.5));

  const ACCENT = '#5fb0d9';
  const opacity = p.enter * p.exit;
  const fmt = (v: number) => (Math.abs(v % 1) > 0.001 ? v.toFixed(1) : String(Math.round(v)));

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{
        opacity,
        display: 'flex',
        alignItems: 'flex-end',
        gap: 30,
        height: '52%',
      }}>
        {items.map((it, i) => {
          const t0 = i * step;
          const k = interpolate(frame, [t0, t0 + fill], [0, 1], {
            easing: Easing.out(Easing.cubic),
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          const target = (it.val / maxVal) * BLOCKS;
          const lit = target * k;
          return (
            <div key={i} style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', height: '100%',
            }}>
              <div style={{
                opacity: k,
                marginBottom: 8,
                fontFamily: TEXT,
                fontSize: 30, fontWeight: 700, color: ACCENT,
                textShadow: '0 2px 12px rgba(0,0,0,0.95)',
                fontVariantNumeric: 'tabular-nums',
              }}>{fmt(it.val * k)}</div>

              <div style={{
                flex: 1,
                display: 'flex', flexDirection: 'column-reverse',
                gap: 4, width: 46,
              }}>
                {Array.from({ length: BLOCKS }, (_, b) => {
                  // блок зажигается, когда до него дошло заполнение
                  const on = Math.min(1, Math.max(0, lit - b));
                  return (
                    <div key={b} style={{
                      flex: 1,
                      background: on > 0.02
                        ? `rgba(95,176,217,${0.35 + 0.6 * on})`
                        : 'rgba(255,255,255,0.09)',
                      boxShadow: on > 0.5
                        ? '0 0 10px rgba(95,176,217,0.55)' : 'none',
                      transform: `scaleY(${0.55 + 0.45 * Math.max(on, 0.35)})`,
                    }} />
                  );
                })}
              </div>

              <div style={{
                marginTop: 10,
                opacity: k,
                fontFamily: TEXT,
                fontSize: 20,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: '#e6ecf0',
                textShadow: '0 2px 10px rgba(0,0,0,0.95)',
                maxWidth: 110,
                textAlign: 'center',
              }}>{it.label}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
