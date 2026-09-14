import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const CoatingSectionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const reveal = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const hydrogenMove = interpolate(frame, [span * 0.3, span * 0.9], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const seal = interpolate(frame, [span * 0.5, span * 0.8], [0, 1], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const hydrogenAtoms = [
    { x: 120, y: 150 }, { x: 180, y: 130 }, { x: 240, y: 160 },
    { x: 150, y: 180 }, { x: 210, y: 190 }, { x: 280, y: 140 }
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 300">
        <defs>
          <linearGradient id="steelGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5d6a73" />
            <stop offset="1" stopColor="#3a454d" />
          </linearGradient>
        </defs>

        <rect x="50" y="100" width="300" height="150" fill="url(#steelGrad)" stroke="#e9f2f6" strokeWidth="2" />
        <text x="200" y="180" fill="#e9f2f6" fontSize="14" textAnchor="middle" opacity={0.5}>STEEL CORE</text>

        <rect x="50" y="70" width="300" height={30 * seal} fill="#c9d3d9" stroke="#e9f2f6" strokeWidth="1" />
        <text x="200" y="60" fill="#c9d3d9" fontSize="12" textAnchor="middle" opacity={seal}>ZINC LAYER</text>

        {hydrogenAtoms.map((h, i) => (
          <circle 
            key={i} 
            cx={h.x} 
            cy={h.y - (hydrogenMove * 50)} 
            r={4 * reveal} 
            fill="#e0b44c" 
            opacity={1 - (seal * 0.8)}
          />
        ))}

        <line x1="50" y1="70" x2="350" y2="70" stroke="#e9f2f6" strokeWidth="2" strokeDasharray="4 4" />
        <text x="55" y="90" fill="#e9f2f6" fontSize="10">INTERFACE</text>
      </svg>

      {p.title ? (
        <div style={{ 
          marginTop: 40, 
          fontFamily: "'Segoe UI', sans-serif", 
          fontSize: 32, 
          color: '#e0b44c',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          letterSpacing: 2
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};