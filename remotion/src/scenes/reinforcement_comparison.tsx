import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ReinforcementComparisonScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const grow = interpolate(frame, [0, span * 0.5], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shift = interpolate(frame, [span * 0.2, span * 0.8], [0, 20], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const highlight = interpolate(frame, [span * 0.4, span * 0.9], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const bars = [
    { label: '16mm Soll', w: 80, color: '#e9f2f6', y: 100 },
    { label: '8mm Ist', w: 40, color: '#d0523f', y: 180 },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 400 300">
        <defs>
          <linearGradient id="steelGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8a949b" />
            <stop offset="0.5" stopColor="#e9f2f6" />
            <stop offset="1" stopColor="#5d6a73" />
          </linearGradient>
        </defs>

        <line x1="50" y1="50" x2="50" y2="250" stroke="#e9f2f6" strokeWidth="2" />
        {[0, 4, 8, 12, 16].map((val) => (
          <g key={val}>
            <line x1="40" y1={250 - val * 12} x2="50" y2={250 - val * 12} stroke="#e9f2f6" strokeWidth="1" />
            <text x="30" y={253 - val * 12} fill="#e9f2f6" fontSize="10" textAnchor="end">{val}mm</text>
          </g>
        ))}

        {bars.map((b, i) => (
          <g key={b.label} transform={`translate(0, ${i === 1 ? shift : 0})`}>
            <rect
              x={100 + i * 120}
              y={250 - b.w * grow}
              width={60}
              height={b.w * grow}
              fill={i === 0 ? 'url(#steelGrad)' : '#d0523f'}
              stroke={b.color}
              strokeWidth="2"
            />
            <text x={130 + i * 120} y={270} fill={b.color} fontSize="12" textAnchor="middle">{b.label}</text>
            <line x1={130 + i * 120} y1={250 - b.w} x2={130 + i * 120} y2={250 - b.w - 20} stroke={b.color} strokeDasharray="4 2" />
            <text x={130 + i * 120} y={250 - b.w - 25} fill="#e0b44c" fontSize="10" textAnchor="middle" opacity={highlight}>
              {b.w / 5}mm Ø
            </text>
          </g>
        ))}
      </svg>
      {p.title ? (
        <div style={{ marginTop: 20, color: '#e9f2f6', fontSize: 24, fontFamily: 'sans-serif' }}>{p.title}</div>
      ) : null}
    </AbsoluteFill>
  );
};