import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const QuantityComparisonScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const progress = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const transform = interpolate(frame, [span * 0.3, span * 0.8], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const orbit = interpolate(frame, [0, span], [0, 360], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const stacks = [
    { x: 150, h: 200, label: 'LITURGIA' },
    { x: 350, h: 200, label: 'CIENCIA' },
  ];

  const ticks = [0, 5, 10, 15, 20, 25];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 600 400">
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e0b44c" />
            <stop offset="0.5" stopColor="#d0523f" />
            <stop offset="1" stopColor="#e9f2f6" />
          </linearGradient>
        </defs>

        {ticks.map((t) => (
          <g key={t}>
            <line x1={100} y1={300 - t * 8} x2={500} y2={300 - t * 8} stroke="#5d6a73" strokeWidth={0.5} strokeDasharray="2 2" />
            <text x={90} y={305 - t * 8} fill="#5d6a73" fontSize={10} textAnchor="end">{t}</text>
          </g>
        ))}

        {stacks.map((s, i) => (
          <g key={s.label}>
            <rect
              x={s.x}
              y={300 - (i === 0 ? s.h * progress : (s.h - 120 * transform) * progress)}
              width={80}
              height={(i === 0 ? s.h * progress : (s.h - 120 * transform) * progress)}
              fill={i === 0 ? '#e9f2f6' : '#e0b44c'}
              stroke="#5d6a73"
              strokeWidth={2}
            />
            <text x={s.x + 40} y={330} fill="#e9f2f6" textAnchor="middle" fontSize={14}>{s.label}</text>
          </g>
        ))}

        <g transform={`translate(390, 180) rotate(${orbit})`} opacity={transform}>
          <ellipse cx={0} cy={0} rx={60} ry={30} fill="none" stroke="#e0b44c" strokeWidth={2} />
          <circle cx={60} cy={0} r={6} fill="#d0523f" />
        </g>

        <path
          d={`M 390 300 L 390 180`}
          stroke="#d0523f"
          strokeWidth={2}
          strokeDasharray="4 4"
          opacity={transform}
        />
      </svg>

      {p.title ? (
        <div style={{ marginTop: 20, fontFamily: 'sans-serif', fontSize: 32, color: '#e9f2f6', textAlign: 'center' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};