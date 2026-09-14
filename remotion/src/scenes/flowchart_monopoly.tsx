import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const FlowchartMonopolyScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const flow = interpolate(frame, [0, span * 0.8], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const moneyFlow = interpolate(frame, [span * 0.2, span * 0.9], [1, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pulse = interpolate(frame, [0, span], [0, 10], {
    easing: Easing.inOut(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const stages = [
    { id: 1, label: 'Anlage', x: 100, y: 100 },
    { id: 2, label: 'Wartung', x: 300, y: 100 },
    { id: 3, label: 'Neukauf', x: 300, y: 250 },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 500 400">
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e0b44c" />
            <stop offset="0.5" stopColor="#d0523f" />
            <stop offset="1" stopColor="#e9f2f6" />
          </linearGradient>
        </defs>

        <text x={250} y={30} fill="#e9f2f6" fontSize={24} textAnchor="middle" style={{ fontWeight: 'bold' }}>{p.title}</text>

        {stages.map((s) => (
          <g key={s.id}>
            <rect x={s.x - 40} y={s.y - 20} width={80} height={40} fill="none" stroke="#e9f2f6" strokeWidth={2} />
            <text x={s.x} y={s.y + 5} fill="#e9f2f6" fontSize={12} textAnchor="middle">{s.label}</text>
          </g>
        ))}

        <path d="M 140 100 L 260 100" stroke="#e9f2f6" strokeWidth={2} strokeDasharray="4 4" />
        <path d="M 300 120 L 300 230" stroke="#d0523f" strokeWidth={2 + pulse} />
        <path d="M 260 270 L 140 270" stroke="#d0523f" strokeWidth={2} />
        <path d="M 100 250 L 100 140" stroke="#d0523f" strokeWidth={2} />

        <circle cx={100 + 200 * flow} cy={100} r={6} fill="#e0b44c" opacity={moneyFlow} />
        <circle cx={300} cy={120 + 110 * flow} r={6} fill="#d0523f" opacity={moneyFlow} />

        <g transform="translate(50, 250)">
          <rect x={0} y={0} width={100} height={50} fill="none" stroke="#e0b44c" strokeWidth={2} />
          <text x={50} y={30} fill="#e0b44c" fontSize={12} textAnchor="middle">Brunnenring</text>
          <line x1={100} y1={25} x2={150} y2={25} stroke="#e0b44c" strokeWidth={2} />
          <line x1={150} y1={10} x2={150} y2={40} stroke="#e0b44c" strokeWidth={4} />
        </g>

        <text x={300} y={350} fill="#d0523f" fontSize={10} textAnchor="middle">Wartungs-Zyklus</text>
        <text x={100} y={350} fill="#e0b44c" fontSize={10} textAnchor="middle">Sackgasse (Stopp)</text>
      </svg>
    </AbsoluteFill>
  );
};