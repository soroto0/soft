import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const LateralSaltMigrationScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const progress = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ionSpread = interpolate(frame, [0, span], [0, 350], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pulse = interpolate(frame, [0, span / 4, span / 2, span], [0.5, 1, 0.5, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const layers = [
    { y: 50, h: 50, label: 'Surface', color: '#3a4a55' },
    { y: 100, h: 100, label: 'Topsoil', color: '#5b7f9c' },
    { y: 200, h: 100, label: 'Subsoil', color: '#8a949b' },
  ];

  const markers = [0, 1, 2, 3, 4];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 500 350">
        <defs>
          <linearGradient id="saltFlow" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#d0523f" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#e9f2f6" />
          </linearGradient>
        </defs>

        <rect x={0} y={50} width={80} height={250} fill="#2c3e50" />
        <text x={40} y={40} fill="#e9f2f6" fontSize={12} textAnchor="middle">ROAD</text>

        {layers.map((l) => (
          <g key={l.label}>
            <rect x={80} y={l.y} width={420} height={l.h} fill={l.color} stroke="#e9f2f6" strokeWidth={0.5} opacity={0.3} />
            <text x={495} y={l.y + l.h / 2 + 5} fill="#e9f2f6" fontSize={10} textAnchor="end">{l.label}</text>
          </g>
        ))}

        <rect x={80} y={120} width={ionSpread} height={60} fill="url(#saltFlow)" opacity={0.7 * pulse} />
        
        <path d={`M ${80 + ionSpread} 120 L ${80 + ionSpread + 15} 150 L ${80 + ionSpread} 180 Z`} fill="#d0523f" />

        {markers.map((m) => (
          <g key={m}>
            <line x1={80 + m * 100} y1={300} x2={80 + m * 100} y2={310} stroke="#e9f2f6" strokeWidth={1} />
            <text x={80 + m * 100} y={325} fill="#e9f2f6" fontSize={10} textAnchor="middle">{m * 2}m</text>
          </g>
        ))}

        <line x1={80} y1={300} x2={480} y2={300} stroke="#e9f2f6" strokeWidth={2} />
        <text x={280} y={345} fill="#e9f2f6" fontSize={12} textAnchor="middle">Lateral Distance from Driveway Edge</text>
      </svg>

      {p.title ? (
        <div style={{ marginTop: 20, fontFamily: 'sans-serif', fontSize: 32, color: '#e9f2f6', opacity: progress }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};