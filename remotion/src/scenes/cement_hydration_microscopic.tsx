import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const CementHydrationMicroscopicScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const progress = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const crystalGrowth = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const coldStunt = interpolate(frame, [0, span], [0, 0.25], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const normalCrystals = [
    { x: 150, y: 200, angle: 0 },
    { x: 250, y: 200, angle: 45 },
    { x: 200, y: 150, angle: 90 },
    { x: 200, y: 250, angle: 135 },
  ];

  const coldCrystals = [
    { x: 550, y: 200 },
    { x: 650, y: 200 },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg viewBox="0 0 800 400" style={{ width: '80%', height: '80%' }}>
        <defs>
          <linearGradient id="tempGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#5b7f9c" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#d0523f" />
          </linearGradient>
        </defs>

        <text x="200" y="50" fill="#e9f2f6" fontSize="20" textAnchor="middle">20°C (Normal)</text>
        <text x="600" y="50" fill="#e9f2f6" fontSize="20" textAnchor="middle">38°C (Stunted)</text>

        {normalCrystals.map((c, i) => (
          <g key={i} transform={`rotate(${c.angle + progress * 45}, ${c.x}, ${c.y})`}>
            <line x1={c.x - 40 * crystalGrowth} y1={c.y} x2={c.x + 40 * crystalGrowth} y2={c.y} stroke="#e9f2f6" strokeWidth="3" />
            <line x1={c.x} y1={c.y - 40 * crystalGrowth} x2={c.x} y2={c.y + 40 * crystalGrowth} stroke="#e9f2f6" strokeWidth="3" />
          </g>
        ))}

        {coldCrystals.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r={10 + 5 * coldStunt} fill="none" stroke="#d0523f" strokeWidth="2" />
        ))}

        <line x1="400" y1="80" x2="400" y2="320" stroke="#e9f2f6" strokeWidth="1" strokeDasharray="4 4" />
        
        <rect x="50" y="350" width="300" height="10" fill="url(#tempGrad)" />
        <text x="50" y="380" fill="#e9f2f6" fontSize="12">Low Reaction</text>
        <text x="350" y="380" fill="#e9f2f6" fontSize="12" textAnchor="end">High Reaction</text>

        <text x="200" y="320" fill="#e9f2f6" fontSize="16" textAnchor="middle">Interlocking Matrix</text>
        <text x="600" y="320" fill="#e9f2f6" fontSize="16" textAnchor="middle">Isolated Nuclei</text>
      </svg>

      {p.title ? (
        <div style={{ marginTop: 40, color: '#e9f2f6', fontSize: 32, fontFamily: 'sans-serif', fontWeight: 300 }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};