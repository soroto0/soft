import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const PiezometerBlindSpotScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const draw = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const waterLevel = interpolate(frame, [span * 0.2, span * 0.8], [200, 50], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pulse = interpolate(frame, [0, span], [0, 10], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { y: 200, h: 50, label: 'CORE', fill: '#5d6a73' },
    { y: 150, h: 50, label: 'FILTER', fill: '#8a949b' },
    { y: 100, h: 50, label: 'SHELL', fill: '#c9d3d9' },
  ];

  const piezos = [
    { x: 100, y: 175, active: false },
    { x: 200, y: 125, active: false },
    { x: 300, y: 175, active: false },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 300">
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5b7f9c" />
            <stop offset="0.5" stopColor="#8a949b" />
            <stop offset="1" stopColor="#5d6a73" />
          </linearGradient>
        </defs>

        {layers.map((l, i) => (
          <g key={l.label}>
            <rect x={50} y={l.y} width={300} height={l.h} fill={l.fill} opacity={0.3 * draw} />
            <text x={360} y={l.y + 30} fill="#e9f2f6" fontSize={10}>{l.label}</text>
          </g>
        ))}

        <rect x={50} y={waterLevel} width={300} height={250 - waterLevel} fill="url(#grad)" opacity={0.6} />
        <line x1={40} y1={waterLevel} x2={360} y2={waterLevel} stroke="#e9f2f6" strokeWidth={2} strokeDasharray="4 2" />
        <text x={40} y={waterLevel - 10} fill="#e9f2f6" fontSize={10}>WATER LEVEL</text>

        <path d="M 50 250 L 150 150 L 250 150 L 350 250" fill="none" stroke="#e0b44c" strokeWidth={4} opacity={draw} />
        <circle cx={200} cy={150} r={6 + Math.sin(pulse) * 2} fill="#d0523f" />
        <text x={200} y={135} fill="#d0523f" fontSize={10} textAnchor="middle">BLIND SPOT</text>

        {piezos.map((pz, i) => (
          <g key={i}>
            <circle cx={pz.x} cy={pz.y} r={8} fill="#5d6a73" stroke="#e9f2f6" strokeWidth={2} />
            <text x={pz.x} y={pz.y + 20} fill="#e9f2f6" fontSize={8} textAnchor="middle">PIEZOMETER {i + 1}</text>
          </g>
        ))}
      </svg>
      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: 'sans-serif', fontSize: 24, color: '#e0b44c', letterSpacing: 2 }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};