import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const PressureBuildupDiagramScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const crackExpansion = interpolate(frame, [0, duration], [0.2, 1], {
    easing: Easing.bezier(0.4, 0, 0.2, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const atomMovement = interpolate(frame, [0, duration], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pressureForce = interpolate(frame, [duration * 0.3, duration], [0, 1], {
    easing: Easing.elastic(1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const atoms = [
    { id: 0, x: 200, y: 120 },
    { id: 1, x: 215, y: 135 },
    { id: 2, x: 190, y: 140 },
    { id: 3, x: 205, y: 155 },
    { id: 4, x: 220, y: 150 },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 400 300">
        <defs>
          <linearGradient id="metalGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5d6a73" />
            <stop offset="0.5" stopColor="#8a949b" />
            <stop offset="1" stopColor="#5d6a73" />
          </linearGradient>
        </defs>

        <rect x="50" y="50" width="300" height="200" fill="url(#metalGrad)" rx="5" />
        
        <path d={`M 200 100 L ${200 - 20 * crackExpansion} 200 L ${200 + 20 * crackExpansion} 200 Z`} fill="#000" opacity="0.6" />

        {atoms.map((atom) => (
          <circle 
            key={atom.id} 
            cx={atom.x + (200 - atom.x) * atomMovement} 
            cy={atom.y + (150 - atom.y) * atomMovement} 
            r={3} 
            fill="#e0b44c" 
          />
        ))}

        <g stroke="#d0523f" strokeWidth={2} opacity={pressureForce}>
          <line x1="200" y1="150" x2="170" y2="150" />
          <path d="M 170 150 L 175 145 M 170 150 L 175 155" />
          <line x1="200" y1="150" x2="230" y2="150" />
          <path d="M 230 150 L 225 145 M 230 150 L 225 155" />
        </g>

        <text x="200" y="40" fill="#e9f2f6" fontSize="12" textAnchor="middle" letterSpacing="1">
          MIKROSKOPISCHER HAARRISS
        </text>
        <text x="200" y="270" fill="#e0b44c" fontSize="10" textAnchor="middle">
          WASSERSTOFFANREICHERUNG
        </text>
      </svg>

      {p.title && (
        <div style={{ marginTop: 40, color: '#e9f2f6', fontSize: 24, fontFamily: 'sans-serif', fontWeight: 'bold' }}>
          {p.title}
        </div>
      )}
    </AbsoluteFill>
  );
};