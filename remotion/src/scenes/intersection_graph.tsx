import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const IntersectionGraphScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const progress = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const demandY = interpolate(frame, [0, span], [180, 20], {
    easing: Easing.bezier(0.4, 0, 0.2, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const supplyY = interpolate(frame, [0, span], [40, 160], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ticks = [0, 1, 2, 3, 4];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 250">
        <line x1="50" y1="200" x2="350" y2="200" stroke="#e9f2f6" strokeWidth="2" />
        <line x1="50" y1="200" x2="50" y2="20" stroke="#e9f2f6" strokeWidth="2" />
        
        {ticks.map((t) => (
          <g key={t}>
            <line x1={50 + t * 75} y1="200" x2={50 + t * 75} y2="210" stroke="#e9f2f6" strokeWidth="1" />
            <text x={50 + t * 75} y="225" fill="#e9f2f6" fontSize="10" textAnchor="middle">
              {1950 + t * 20}
            </text>
          </g>
        ))}

        <path d={`M 50 200 Q 200 200 350 ${demandY}`} fill="none" stroke="#d0523f" strokeWidth="4" strokeDasharray="4 2" />
        <path d={`M 50 ${supplyY} L 350 160`} fill="none" stroke="#e0b44c" strokeWidth="4" />

        <circle cx="200" cy="110" r={4 * progress} fill="none" stroke="#e9f2f6" strokeWidth="2" />
        
        <text x="60" y="40" fill="#d0523f" fontSize="12" fontWeight="bold">DEMANDA</text>
        <text x="60" y="170" fill="#e0b44c" fontSize="12" fontWeight="bold">EXTRACCIÓN</text>
        
        <text x="200" y="245" fill="#e9f2f6" fontSize="14" textAnchor="middle" style={{ letterSpacing: '1px' }}>
          {p.title}
        </text>
      </svg>
    </AbsoluteFill>
  );
};