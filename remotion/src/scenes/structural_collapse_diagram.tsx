import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const StructuralCollapseDiagramScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = p.enter * p.exit;
  const duration = (p.dur || 6) * fps;

  const collapse = interpolate(frame, [0, duration], [0, 1], {
    easing: Easing.bezier(0.42, 0, 0.58, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const scatter = interpolate(frame, [0, duration], [0, 60], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const fade = interpolate(frame, [duration * 0.7, duration], [1, 0.2], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const blocks = [
    { id: 0, w: 100, label: 'ASAMBLEA' },
    { id: 1, w: 140, label: 'TRIRREME' },
    { id: 2, w: 180, label: 'TRIRREME' },
  ];

  const ticks = [0, 25, 50, 75, 100];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 400 400">
        <defs>
          <linearGradient id="metal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e0b44c" />
            <stop offset="0.5" stopColor="#d0523f" />
            <stop offset="1" stopColor="#5b7f9c" />
          </linearGradient>
        </defs>

        <text x="200" y="40" fill="#e9f2f6" fontSize="24" textAnchor="middle" fontWeight="bold">
          {p.title}
        </text>

        {blocks.map((b, i) => (
          <g key={b.id} transform={`translate(${i % 2 === 0 ? scatter : -scatter}, ${collapse * 150})`}>
            <rect
              x={200 - b.w / 2}
              y={80 + i * 50}
              width={b.w}
              height={40}
              fill="url(#metal)"
              stroke="#e9f2f6"
              strokeWidth={1}
              opacity={fade}
            />
            <text x={200} y={105 + i * 50} fill="#e9f2f6" fontSize={10} textAnchor="middle" opacity={fade}>
              {b.label}
            </text>
          </g>
        ))}

        <line x1="50" y1="320" x2="350" y2="320" stroke="#e9f2f6" strokeWidth={2} />
        {ticks.map((t, i) => (
          <g key={t}>
            <line x1={50 + i * 75} y1="320" x2={50 + i * 75} y2="330" stroke="#e9f2f6" strokeWidth={1} />
            <text x={50 + i * 75} y="345" fill="#e9f2f6" fontSize={10} textAnchor="middle">
              {t}%
            </text>
          </g>
        ))}
        
        <path d={`M 50 320 L ${50 + collapse * 300} 320`} stroke="#d0523f" strokeWidth={4} />
        <text x="200" y="370" fill="#e9f2f6" fontSize={12} textAnchor="middle">INTEGRIDAD DE LA HEGEMONÍA</text>
      </svg>
    </AbsoluteFill>
  );
};