import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { VariantProps } from '../types';
import { TEXT } from '../fonts';

// Bars, третий вид. Ни горизонтальных полос (встроенный BarChart), ни
// вертикальных столбиков (ai_9a13): значения расходятся ЛУЧАМИ из центра, и
// длина луча — это величина. Лучи прочерчиваются по кругу против часовой,
// подпись едет вместе с концом луча. Механика радиальная — третья.
export const BarsAiD461: React.FC<VariantProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const items = (p.content || '').split(',').map((pair) => {
    const [label, val] = pair.split(':');
    return { label: (label || '').trim(), val: parseFloat(val) || 0 };
  }).filter((it) => it.label).slice(0, 6);

  const maxVal = Math.max(...items.map((i) => i.val), 1);
  const n = Math.max(1, items.length);
  const step = Math.max(2, Math.round(fps * 0.1));
  const grow = Math.max(8, Math.round(fps * 0.45));

  const CX = 50, CY = 50;
  const R_MIN = 7, R_MAX = 33;
  const ACCENT = '#e0784f';
  const opacity = p.enter * p.exit;
  const fmt = (v: number) => (Math.abs(v % 1) > 0.001 ? v.toFixed(1) : String(Math.round(v)));

  return (
    <AbsoluteFill style={{ opacity }}>
      <svg width="100%" height="100%" viewBox="0 0 100 100"
           preserveAspectRatio="xMidYMid meet"
           style={{ position: 'absolute', inset: 0 }}>
        <circle cx={CX} cy={CY} r={R_MIN - 2} fill="none"
                stroke="rgba(255,255,255,0.25)" strokeWidth={0.4} />
        {items.map((it, i) => {
          const t0 = i * step;
          const k = interpolate(frame, [t0, t0 + grow], [0, 1], {
            easing: Easing.out(Easing.cubic),
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          // против часовой, старт сверху
          const a = (-Math.PI / 2) - (2 * Math.PI * i) / n;
          const len = R_MIN + (R_MAX - R_MIN) * (it.val / maxVal) * k;
          const x2 = CX + Math.cos(a) * len;
          const y2 = CY + Math.sin(a) * len * 0.92;   // поправка на 16:9
          return (
            <g key={i}>
              <line x1={CX + Math.cos(a) * R_MIN}
                    y1={CY + Math.sin(a) * R_MIN * 0.92}
                    x2={x2} y2={y2}
                    stroke={ACCENT} strokeWidth={2.2} strokeLinecap="round"
                    opacity={0.55 + 0.45 * k}
                    style={{ filter: 'drop-shadow(0 0 4px rgba(224,120,79,0.6))' }} />
              <circle cx={x2} cy={y2} r={1.3} fill={ACCENT} opacity={k} />
            </g>
          );
        })}
      </svg>

      {items.map((it, i) => {
        const t0 = i * step;
        const k = interpolate(frame, [t0, t0 + grow], [0, 1], {
          easing: Easing.out(Easing.cubic),
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const a = (-Math.PI / 2) - (2 * Math.PI * i) / n;
        const len = R_MIN + (R_MAX - R_MIN) * (it.val / maxVal) * k + 4.5;
        const left = CX + Math.cos(a) * len;
        const top = CY + Math.sin(a) * len * 0.92;
        return (
          <div key={i} style={{
            position: 'absolute',
            left: `${left}%`, top: `${top}%`,
            transform: 'translate(-50%, -50%)',
            opacity: k,
            textAlign: 'center',
            fontFamily: TEXT,
            textShadow: '0 2px 10px rgba(0,0,0,0.95)',
            whiteSpace: 'nowrap',
          }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: ACCENT }}>
              {fmt(it.val * k)}
            </div>
            <div style={{
              fontSize: 17, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: '#f0e8e2',
            }}>{it.label}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
