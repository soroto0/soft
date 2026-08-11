import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ThaumasiteSulfateMatrixDecayScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const flow = interpolate(frame, [0, span], [0, 100], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const decay = interpolate(frame, [span * 0.2, span * 0.8], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const slurry = interpolate(frame, [span * 0.4, span], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const aggregates = [
    { x: 150, y: 150, r: 60 },
    { x: 450, y: 150, r: 70 },
    { x: 300, y: 350, r: 80 },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 600 500">
        <defs>
          <linearGradient id="slurry" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e0b44c" />
            <stop offset="0.5" stopColor="#d0523f" />
            <stop offset="1" stopColor="#e9f2f6" />
          </linearGradient>
        </defs>
        <rect x="50" y="50" width="500" height="400" fill="#2a353d" opacity="0.3" />
        {aggregates.map((a, i) => (
          <g key={i}>
            <circle cx={a.x} cy={a.y} r={a.r} fill="#c9d3d9" stroke="#e9f2f6" strokeWidth="2" />
            <text x={a.x} y={a.y + a.r + 20} fill="#e9f2f6" fontSize="12" textAnchor="middle">AGGREGATE</text>
          </g>
        ))}
        <rect x="50" y="250" width="500" height={100 * decay} fill="url(#slurry)" opacity={0.7 * decay} />
        {[0, 1, 2].map((i) => (
          <path key={i} d={`M ${100 + i * 200 - flow} 50 L ${150 + i * 200 - flow} 100`} stroke="#e0b44c" strokeWidth="4" markerEnd="url(#arrow)" />
        ))}
        <g opacity={slurry}>
          <circle cx="300" cy="250" r={10 * slurry} fill="#d0523f" />
          <text x="300" y="280" fill="#d0523f" fontSize="14" textAnchor="middle">MINERAL SLURRY</text>
        </g>
        <line x1="50" y1="450" x2="550" y2="450" stroke="#e9f2f6" strokeWidth="1" />
        <text x="50" y="470" fill="#e9f2f6" fontSize="10">0yr</text>
        <text x="550" y="470" fill="#e9f2f6" fontSize="10" textAnchor="end">40yr</text>
      </svg>
      {p.title ? (
        <div style={{ marginTop: 40, color: '#e9f2f6', fontSize: 24, fontWeight: 'bold', letterSpacing: 2 }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};