import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const PriceComparisonScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 4) * fps));

  const draw = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const showX = interpolate(frame, [span * 0.5, span * 0.6], [0, 1], {
    easing: Easing.bounce,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const float = interpolate(frame, [0, span], [0, 20], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const sticks = [
    { id: 0, x: 120, label: 'VALUE', price: '$2.00', color: '#e9f2f6' },
    { id: 1, x: 280, label: 'COMMERCIAL', price: '$14.00', color: '#e0b44c' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 300">
        <defs>
          <linearGradient id="stickGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8a949b" />
            <stop offset="0.5" stopColor="#5d6a73" />
            <stop offset="1" stopColor="#2d3a43" />
          </linearGradient>
        </defs>
        {sticks.map((s) => (
          <g key={s.id} transform={`translate(0, ${s.id === 1 ? -float : 0})`}>
            <rect x={s.x} y={220 - 150 * draw} width={40} height={150 * draw} fill="url(#stickGrad)" />
            <text x={s.x + 20} y={240} fill={s.color} fontSize={12} textAnchor="middle" fontWeight="bold">{s.label}</text>
            <text x={s.x + 20} y={255} fill={s.color} fontSize={14} textAnchor="middle">{s.price}</text>
          </g>
        ))}
        <g opacity={showX} transform="translate(280, 100)">
          <line x1={0} y1={0} x2={40} y2={40} stroke="#d0523f" strokeWidth={6} />
          <line x1={40} y1={0} x2={0} y2={40} stroke="#d0523f" strokeWidth={6} />
        </g>
        <line x1={80} y1={270} x2={340} y2={270} stroke="#e9f2f6" strokeWidth={2} />
        {[0, 1, 2, 3, 4].map((i) => (
          <line key={i} x1={80 + i * 65} y1={270} x2={80 + i * 65} y2={280} stroke="#e9f2f6" strokeWidth={1} />
        ))}
      </svg>
      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: 'sans-serif', fontSize: 32, color: '#e9f2f6', textAlign: 'center' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};