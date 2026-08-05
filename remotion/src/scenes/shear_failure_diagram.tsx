import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ShearFailureDiagramScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const progress = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const slide = interpolate(progress, [0.2, 0.9], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const lubrication = interpolate(progress, [0.1, 0.4], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const layers = [
    { y: 50, h: 60, fill: '#5b7f9c', label: 'Topsoil' },
    { y: 110, h: 80, fill: '#8a949b', label: 'Clay Layer' },
    { y: 190, h: 60, fill: '#c9d3d9', label: 'Bedrock' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 400 300">
        <defs>
          <linearGradient id="lubrication" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#e0b44c" stopOpacity={0} />
            <stop offset="0.5" stopColor="#e0b44c" stopOpacity={lubrication} />
            <stop offset="1" stopColor="#e0b44c" stopOpacity={0} />
          </linearGradient>
        </defs>

        {layers.map((l, i) => (
          <g key={l.label}>
            <rect x={50} y={l.y} width={300} height={l.h} fill={l.fill} stroke="#e9f2f6" strokeWidth={0.5} />
            <text x={360} y={l.y + l.h / 2 + 4} fill="#e9f2f6" fontSize={10}>{l.label}</text>
            <line x1={355} y1={l.y + l.h / 2} x2={350} y2={l.y + l.h / 2} stroke="#e9f2f6" strokeWidth={0.5} />
          </g>
        ))}

        <path d="M 60 110 Q 200 110 300 200" fill="none" stroke="#e0b44c" strokeWidth={3} strokeDasharray="6 4" />
        <rect x={50} y={110} width={300} height={4} fill="url(#lubrication)" />

        <g style={{ transform: `translate(${slide * 40}px, ${slide * 30}px) rotate(${slide * 5}deg)` }}>
          <rect x={80} y={60} width={80} height={50} fill="#d0523f" stroke="#e9f2f6" strokeWidth={2} />
          <text x={120} y={90} fill="#e9f2f6" fontSize={10} textAnchor="middle">BUILDING</text>
        </g>

        <path d="M 280 180 L 300 200 L 280 220" stroke="#d0523f" strokeWidth={2} fill="none" />
        <text x={310} y={205} fill="#d0523f" fontSize={10}>Slip Plane</text>
      </svg>

      {p.title ? (
        <div style={{ marginTop: 20, fontFamily: 'sans-serif', fontSize: 28, color: '#e9f2f6', fontWeight: 'bold' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};