import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const BallastSystemFlowScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const flow = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pumpPulse = interpolate(frame % 30, [0, 15, 30], [1, 0.6, 1], {
    easing: Easing.inOut(Easing.quad),
  });

  const arrowPos = interpolate(frame, [0, span], [0, 100], {
    easing: Easing.linear,
  });

  const opacity = p.enter * p.exit;

  const tanks = [
    { id: 1, x: 50, label: 'T1' },
    { id: 2, x: 150, label: 'T2' },
    { id: 3, x: 250, label: 'T3' },
    { id: 4, x: 350, label: 'T4' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 500 300">
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#e0b44c" />
          </marker>
        </defs>

        <text x={250} y={30} fill="#e9f2f6" fontSize={24} textAnchor="middle" style={{ letterSpacing: '0.1em' }}>
          {p.title}
        </text>

        {tanks.map((t) => (
          <g key={t.id}>
            <rect x={t.x} y={150} width={80} height={100} fill={t.id === 4 ? '#d0523f' : '#2c3e50'} stroke="#e9f2f6" strokeWidth={2} />
            <text x={t.x + 40} y={205} fill="#e9f2f6" fontSize={16} textAnchor="middle">{t.label}</text>
          </g>
        ))}

        <rect x={200} y={80} width={60} height={40} fill="#5b7f9c" opacity={pumpPulse} />
        <text x={230} y={105} fill="#e9f2f6" fontSize={12} textAnchor="middle">PUMP</text>

        <path d="M 230 120 L 230 140 L 390 140 L 390 150" fill="none" stroke="#e9f2f6" strokeWidth={2} strokeDasharray="4 4" />
        
        <circle cx={230 + arrowPos * 1.6} cy={140} r={5} fill="#e0b44c" opacity={flow > 0.1 ? 1 : 0} />
        <line x1={380} y1={140} x2={390} y2={150} stroke="#e0b44c" strokeWidth={4} markerEnd="url(#arrowhead)" />

        <text x={50} y={280} fill="#e9f2f6" fontSize={10}>INTAKE</text>
        <text x={450} y={280} fill="#d0523f" fontSize={10} textAnchor="end">TANK 4 ACTIVE</text>
      </svg>
    </AbsoluteFill>
  );
};