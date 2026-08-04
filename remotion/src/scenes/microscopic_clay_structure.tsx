import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const MicroscopicClayStructureScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const move = interpolate(frame, [0, span], [0, 40], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const chargePulse = interpolate(frame, [0, span / 2, span], [0.5, 1, 0.5], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const waterFlow = interpolate(frame, [0, span], [0, 10], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const plates = [
    { y: 100, label: 'Clay Plate A' },
    { y: 200, label: 'Clay Plate B' },
  ];

  const waterMolecules = [0, 1, 2, 3, 4, 5];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 500 400">
        <defs>
          <linearGradient id="chargeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d0523f" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#e9f2f6" />
          </linearGradient>
        </defs>

        {plates.map((plate, i) => (
          <g key={plate.label} style={{ transform: `translateY(${i === 0 ? -move : move}px)` }}>
            <rect x="50" y={plate.y} width="400" height="20" fill="#8a949b" rx="2" />
            <text x="60" y={plate.y - 10} fill="#e9f2f6" fontSize="12">{plate.label}</text>
            <text x="440" y={plate.y + 15} fill="#d0523f" fontSize="16" opacity={chargePulse}>-</text>
          </g>
        ))}

        {waterMolecules.map((m) => (
          <circle 
            key={m} 
            cx={100 + m * 60} 
            cy={150 + waterFlow} 
            r={6} 
            fill="#e9f2f6" 
            stroke="#5b7f9c" 
            strokeWidth="1" 
          />
        ))}

        <line x1="250" y1="120" x2="250" y2="180" stroke="#e0b44c" strokeWidth="2" strokeDasharray="4 4" />
        <text x="260" y="150" fill="#e0b44c" fontSize="12">Repulsion</text>
      </svg>

      {p.title ? (
        <div style={{ 
          marginTop: 40, 
          fontFamily: "'Segoe UI', Arial, sans-serif", 
          fontSize: 24, 
          color: '#e9f2f6',
          letterSpacing: '0.05em' 
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};