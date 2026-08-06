import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const FinancialMapScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const flow = interpolate(frame, [0, span * 0.8], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const growth = interpolate(frame, [span * 0.2, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelRise = interpolate(frame, [span * 0.1, span * 0.3], [20, 0], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const provinces = [
    { id: 1, x: 100, y: 80, name: 'Londinium' },
    { id: 2, x: 180, y: 150, name: 'Eboracum' },
    { id: 3, x: 80, y: 220, name: 'Deva' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 600 400">
        <defs>
          <linearGradient id="goldFlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e0b44c" stopOpacity="0" />
            <stop offset="0.5" stopColor="#e0b44c" stopOpacity="1" />
            <stop offset="1" stopColor="#e0b44c" stopOpacity="0" />
          </linearGradient>
        </defs>
        
        <text x="300" y="30" fill="#e9f2f6" fontSize="24" textAnchor="middle" style={{ opacity: labelRise }}>
          {p.title}
        </text>

        <rect x="250" y="150" width="100" height="100" fill="#2a3a4a" stroke="#e0b44c" strokeWidth="2" />
        <text x="300" y="205" fill="#e9f2f6" fontSize="14" textAnchor="middle">SÉNECA</text>
        <text x="300" y="225" fill="#e0b44c" fontSize="18" textAnchor="middle" fontWeight="bold">
          {Math.floor(growth * 300)}M Sestercios
        </text>

        {provinces.map((prov) => (
          <g key={prov.id}>
            <circle cx={prov.x} cy={prov.y} r="6" fill="#d0523f" />
            <text x={prov.x} y={prov.y - 15} fill="#e9f2f6" fontSize="12" textAnchor="middle">{prov.name}</text>
            <line 
              x1={prov.x} y1={prov.y} 
              x2={300 - (300 - prov.x) * (1 - flow)} 
              y2={200 - (200 - prov.y) * (1 - flow)} 
              stroke="url(#goldFlow)" 
              strokeWidth="3" 
              strokeDasharray="4 4"
            />
          </g>
        ))}

        <g transform="translate(450, 100)">
          <rect x="0" y="0" width="20" height="200" fill="#1a2a3a" stroke="#e9f2f6" />
          <rect x="0" y={200 - (200 * growth)} width="20" height={200 * growth} fill="#e0b44c" />
          <text x="30" y="10" fill="#e9f2f6" fontSize="12">300M</text>
          <text x="30" y="200" fill="#e9f2f6" fontSize="12">0</text>
        </g>
      </svg>
    </AbsoluteFill>
  );
};