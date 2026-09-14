import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const BoltPenetrationCutScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const boltY = interpolate(frame, [0, span * 0.4], [-100, 220], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const moisture = interpolate(frame, [span * 0.4, span * 0.9], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const stress = interpolate(frame, [span * 0.4, span * 0.6], [0, 1], {
    easing: Easing.bounce,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const layers = [
    { y: 100, h: 40, fill: '#5d6a73', label: 'Membran' },
    { y: 140, h: 60, fill: '#8a949b', label: 'Dämmung' },
    { y: 200, h: 80, fill: '#c9d3d9', label: 'Obergurt' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="60%" viewBox="0 0 400 400">
        <defs>
          <linearGradient id="leak" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5b7f9c" stopOpacity="0" />
            <stop offset="0.5" stopColor="#5b7f9c" stopOpacity="0.6" />
            <stop offset="1" stopColor="#d0523f" stopOpacity="1" />
          </linearGradient>
        </defs>

        {layers.map((L) => (
          <g key={L.label}>
            <rect x={100} y={L.y} width={200} height={L.h} fill={L.fill} stroke="#e9f2f6" strokeWidth={1} />
            <text x={90} y={L.y + L.h / 2 + 4} fill="#e9f2f6" fontSize={12} textAnchor="end">{L.label}</text>
          </g>
        ))}

        <g style={{ transform: `translateY(${boltY - 220}px)` }}>
          <rect x={190} y={0} width={20} height={220} fill="#d0523f" />
          <path d="M 185 220 L 215 220 L 200 240 Z" fill="#d0523f" />
        </g>

        <rect x={192} y={140} width={16} height={140 * moisture} fill="url(#leak)" />

        <g opacity={stress}>
          <path d="M 180 130 L 170 110 M 220 130 L 230 110" stroke="#e0b44c" strokeWidth={3} />
        </g>

        {[0, 1, 2, 3].map((i) => (
          <line key={i} x1={100} y1={100 + i * 60} x2={300} y2={100 + i * 60} stroke="#e9f2f6" strokeWidth={0.5} strokeDasharray="4 4" />
        ))}

        <text x={200} y={350} fill="#e9f2f6" fontSize={24} textAnchor="middle" fontWeight="bold">
          {p.title || 'Beschädigung des Obergurts'}
        </text>
      </svg>
    </AbsoluteFill>
  );
};