import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const QuerschnittFundamentversagenScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dur = (p.dur || 6) * fps;

  const opacity = p.enter * p.exit;

  const draw = interpolate(frame, [0, dur * 0.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const crack = interpolate(frame, [dur * 0.4, dur * 0.7], [0, 1], {
    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const piles = [
    { x: 120, label: 'Pfahl A' },
    { x: 300, label: 'Pfahl B' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 500 300" style={{ overflow: 'visible' }}>
        <defs>
          <pattern id="concrete" width="10" height="10" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="0.5" fill="#8a949b" />
          </pattern>
        </defs>

        <rect x="0" y="240" width="500" height="60" fill="#2d3748" />
        <text x="250" y="275" fill="#e9f2f6" fontSize="14" textAnchor="middle" fontFamily="sans-serif">BODENPLATTE</text>

        {piles.map((pile) => (
          <g key={pile.x} transform={`scale(1, ${draw})`} transform-origin={`${pile.x} 240`}>
            <path d={`M ${pile.x - 60} 240 L ${pile.x - 60} 50 L ${pile.x + 60} 50 L ${pile.x + 60} 240 Z`} fill="url(#concrete)" stroke="#e9f2f6" />
            <path d={`M ${pile.x - 30} 240 L ${pile.x - 30} 80 L ${pile.x + 30} 80 L ${pile.x + 30} 240 Z`} fill="#0d1117" stroke="#e9f2f6" />
            
            <line x1={pile.x - 60} y1="30" x2={pile.x - 30} y2="30" stroke="#e9f2f6" strokeWidth="1" />
            <line x1={pile.x - 60} y1="20" x2={pile.x - 60} y2="40" stroke="#e9f2f6" strokeWidth="1" />
            <line x1={pile.x - 30} y1="20" x2={pile.x - 30} y2="40" stroke="#e9f2f6" strokeWidth="1" />
            <text x={pile.x - 45} y="20" fill="#e9f2f6" fontSize="12" textAnchor="middle">30cm</text>
          </g>
        ))}

        <path d={`M 150 150 L 180 120`} stroke="#d0523f" strokeWidth={4 * crack} strokeLinecap="round" />
        <circle cx="150" cy="150" r={6 * crack} fill="#d0523f" />
        <text x="150" y="110" fill="#d0523f" fontSize="14" fontWeight="bold" opacity={crack}>BRUCHSTELLE</text>

        <line x1="50" y1="240" x2="50" y2="50" stroke="#e0b44c" strokeWidth="2" strokeDasharray="4 4" />
        <text x="40" y="150" fill="#e0b44c" fontSize="14" transform="rotate(-90 40 150)">PFÄHLE</text>
      </svg>

      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: 'sans-serif', fontSize: 32, color: '#e9f2f6', textAlign: 'center' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};