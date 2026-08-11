import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const StructuralCollapseScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = (p.dur || 6) * fps;
  const opacity = p.enter * p.exit;

  const collapse = interpolate(frame, [0, duration * 0.8], [0, 1], {
    easing: Easing.in(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const scatter = interpolate(frame, [duration * 0.2, duration], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const rotation = interpolate(frame, [0, duration], [0, 360], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const blocks = [
    { id: 0, x: 100, y: 100, dx: -20, dy: -20 },
    { id: 1, x: 250, y: 100, dx: 40, dy: -30 },
    { id: 2, x: 400, y: 100, dx: 10, dy: -50 },
    { id: 3, x: 100, y: 250, dx: -50, dy: 30 },
    { id: 4, x: 250, y: 250, dx: 0, dy: 60 },
    { id: 5, x: 400, y: 250, dx: 30, dy: 40 },
  ];

  const ticks = [0, 12, 24, 36, 48];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 800 500">
        <defs>
          <linearGradient id="blockGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e9f2f6" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#d0523f" />
          </linearGradient>
        </defs>

        <g transform={`translate(${scatter * 100}, ${scatter * 50}) rotate(${scatter * 10}, 300, 200)`}>
          {blocks.map((b) => (
            <rect
              key={b.id}
              x={b.x + b.dx * scatter}
              y={b.y + b.dy * scatter}
              width={80}
              height={60}
              fill="url(#blockGrad)"
              stroke="#e9f2f6"
              strokeWidth={2}
              style={{ opacity: 1 - collapse * 0.8 }}
            />
          ))}
        </g>

        <g transform="translate(650, 100)">
          <circle cx="0" cy="0" r="60" fill="none" stroke="#e9f2f6" strokeWidth={2} />
          {ticks.map((t, i) => (
            <line
              key={t}
              x1={Math.sin((i * Math.PI) / 2) * 50}
              y1={-Math.cos((i * Math.PI) / 2) * 50}
              x2={Math.sin((i * Math.PI) / 2) * 60}
              y2={-Math.cos((i * Math.PI) / 2) * 60}
              stroke="#e9f2f6"
              strokeWidth={2}
            />
          ))}
          <line x1="0" y1="0" x2={Math.sin((rotation * Math.PI) / 180) * 40} y2={-Math.cos((rotation * Math.PI) / 180) * 40} stroke="#d0523f" strokeWidth={4} />
          <text x="0" y="90" fill="#e9f2f6" fontSize="20" textAnchor="middle">48 HORAS</text>
        </g>

        <text x="50" y="450" fill="#e9f2f6" fontSize="32" fontFamily="sans-serif" fontWeight="bold">
          {p.title}
        </text>
      </svg>
    </AbsoluteFill>
  );
};