import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const StressDistributionCutScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const progress = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const tilt = interpolate(frame, [span * 0.3, span * 0.8], [0, 15], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const stress = interpolate(frame, [span * 0.4, span * 0.9], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { id: 0, label: 'Flansch', y: 20, h: 40, color: '#e9f2f6' },
    { id: 1, label: 'Steg', y: 60, h: 120, color: '#c9d3d9' },
    { id: 2, label: 'Flansch', y: 180, h: 40, color: '#e9f2f6' },
  ];

  const ticks = [0, 70, 140, 210];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 300" style={{ transform: `rotate(${tilt}deg)` }}>
        <defs>
          <linearGradient id="stressGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d0523f" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#5b7f9c" />
          </linearGradient>
        </defs>

        {layers.map((l) => (
          <g key={l.id}>
            <rect x={100} y={l.y} width={200 * progress} height={l.h} fill={l.color} stroke="#333" strokeWidth={1} />
            <text x={90} y={l.y + l.h / 2 + 4} fill="#e9f2f6" fontSize={12} textAnchor="end">{l.label}</text>
          </g>
        ))}

        <rect x={100} y={20} width={200 * progress} height={200} fill="url(#stressGrad)" opacity={0.6 * stress} />

        {ticks.map((t, i) => (
          <g key={t}>
            <line x1={310} y1={20 + i * 60} x2={330} y2={20 + i * 60} stroke="#e9f2f6" strokeWidth={1} />
            <text x={335} y={25 + i * 60} fill="#e9f2f6" fontSize={10}>{t} MPa</text>
          </g>
        ))}

        <path d="M 100 230 L 300 230 M 100 230 L 100 240 M 300 230 L 300 240" stroke="#e9f2f6" strokeWidth={2} />
        <text x={200} y={255} fill="#e9f2f6" fontSize={12} textAnchor="middle">Querschnitt</text>
      </svg>

      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: 32, color: '#e0b44c', fontWeight: 'bold' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};