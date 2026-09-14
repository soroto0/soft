import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const CorrosionGraphScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const barAnim = interpolate(frame, [0, span * 0.6], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [span * 0.4, span * 0.7], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const highlight = interpolate(frame, [span * 0.5, span * 0.9], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const data = [
    { label: 'Grenzwert', value: 1, color: '#e9f2f6', x: 100 },
    { label: 'Messwert', value: 3, color: '#d0523f', x: 250 },
  ];

  const ticks = [0, 1, 2, 3];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 300">
        <defs>
          <linearGradient id="barGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#e0b44c" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#d0523f" />
          </linearGradient>
        </defs>

        <line x1={50} y1={250} x2={350} y2={250} stroke="#e9f2f6" strokeWidth={2} />
        
        {ticks.map((t) => (
          <g key={t}>
            <line x1={50} y1={250 - t * 60} x2={45} y2={250 - t * 60} stroke="#e9f2f6" strokeWidth={1} />
            <text x={35} y={255 - t * 60} fill="#e9f2f6" fontSize={12} textAnchor="end">{t}</text>
          </g>
        ))}

        {data.map((d, i) => (
          <g key={d.label}>
            <rect
              x={d.x}
              y={250 - d.value * 60 * barAnim}
              width={80}
              height={d.value * 60 * barAnim}
              fill={i === 1 ? 'url(#barGrad)' : d.color}
              opacity={0.8}
            />
            <text x={d.x + 40} y={270} fill="#e9f2f6" fontSize={14} textAnchor="middle" opacity={labelFade}>
              {d.label}
            </text>
            <text x={d.x + 40} y={240 - d.value * 60 * barAnim} fill={d.color} fontSize={14} textAnchor="middle" opacity={labelFade}>
              {d.value}x
            </text>
          </g>
        ))}

        <line x1={80} y1={250 - 1 * 60} x2={320} y2={250 - 1 * 60} stroke="#e0b44c" strokeWidth={2} strokeDasharray="4 4" opacity={highlight} />
      </svg>

      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: 'sans-serif', fontSize: 28, color: '#e9f2f6', textAlign: 'center' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};