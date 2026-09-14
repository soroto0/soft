import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const TacticalMapViewScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const pulse = interpolate(frame, [0, span * 0.2, span * 0.4, span * 0.6, span * 0.8, span], [1, 0.5, 1, 0.5, 1, 0.5], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const move = interpolate(frame, [0, span * 0.7], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const seal = interpolate(frame, [span * 0.4, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const orcas = [
    { x: 100, y: 100, targetX: 250, targetY: 150 },
    { x: 350, y: 100, targetX: 200, targetY: 150 },
    { x: 225, y: 250, targetX: 225, targetY: 180 },
  ];

  const sharks = [
    { x: 225, y: 160, id: 'S1' },
    { x: 210, y: 170, id: 'S2' },
    { x: 240, y: 170, id: 'S3' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 450 300">
        <defs>
          <linearGradient id="pathGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e0b44c" />
            <stop offset="0.5" stopColor="#d0523f" />
            <stop offset="1" stopColor="#e9f2f6" />
          </linearGradient>
        </defs>
        
        <text x="225" y="20" fill="#e9f2f6" fontSize="20" textAnchor="middle" style={{ letterSpacing: 2 }}>{p.title}</text>

        {orcas.map((o, i) => (
          <g key={i}>
            <circle cx={o.x + (o.targetX - o.x) * move} cy={o.y + (o.targetY - o.y) * move} r={6 * pulse} fill="#e0b44c" />
            <line x1={o.x} y1={o.y} x2={o.x + (o.targetX - o.x) * move} y2={o.y + (o.targetY - o.y) * move} stroke="#e0b44c" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
          </g>
        ))}

        {sharks.map((s, i) => (
          <g key={s.id}>
            <circle cx={s.x} cy={s.y + 40 * move} r={3} fill="#d0523f" />
            <path d={`M ${s.x} ${s.y + 40 * move} L ${s.x} ${s.y + 80 * move}`} stroke="#d0523f" strokeWidth="1" opacity={1 - move} />
            <text x={s.x + 8} y={s.y + 40 * move} fill="#d0523f" fontSize="8">HAIFISCH {i + 1}</text>
          </g>
        ))}

        <rect x={180} y={140} width={90} height={60} stroke="#e9f2f6" strokeWidth="2" fill="none" strokeDasharray="8 4" opacity={seal} />
        <text x={225} y={220} fill="#e9f2f6" fontSize="10" textAnchor="middle" opacity={seal}>KESSSEL-ZONE</text>
        
        <line x1="50" y1="280" x2="400" y2="280" stroke="#e9f2f6" strokeWidth="1" />
        <text x="50" y="295" fill="#e9f2f6" fontSize="8">0m</text>
        <text x="400" y="295" fill="#e9f2f6" fontSize="8" textAnchor="end">500m</text>
      </svg>
    </AbsoluteFill>
  );
};