import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const EulerBucklingPhysicsScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = Math.max(1, Math.round((p.dur || 6) * fps));

  const load = interpolate(frame, [0, duration * 0.7], [0, 100], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const buckling = interpolate(frame, [duration * 0.7, duration * 0.75], [0, 1], {
    easing: Easing.out(Easing.back(2)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const arrowOffset = interpolate(frame, [0, duration * 0.7], [0, 20], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ticks = [0, 25, 50, 75, 100];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 400 400">
        <defs>
          <linearGradient id="loadGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e0b44c" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#d0523f" />
          </linearGradient>
        </defs>

        <line x1="200" y1="100" x2="200" y2="300 - 20 * buckling" 
              stroke="#e9f2f6" strokeWidth="8" strokeLinecap="round"
              transform={`rotate(${buckling * 15}, 200, 200)`} />

        <path d={`M 200 100 L ${200 + buckling * 50} 200 L 200 300`} 
              fill="none" stroke="#e0b44c" strokeWidth="4" 
              strokeDasharray="4 4" opacity={buckling} />

        <rect x="180" y="80" width="40" height={20 + load * 0.5} fill="url(#loadGrad)" />
        
        <line x1="160" y1="70" x2="240" y2="70" stroke="#e9f2f6" strokeWidth="2" />
        <line x1="200" y1="70" x2="200" y2={90 + arrowOffset} stroke="#e9f2f6" strokeWidth="4" />
        <path d="M 195 90 L 200 100 L 205 90" stroke="#e9f2f6" fill="none" strokeWidth="4" />

        <line x1="50" y1="350" x2="350" y2="350" stroke="#e9f2f6" strokeWidth="2" />
        {ticks.map((t) => (
          <g key={t}>
            <line x1={50 + t * 3} y1="350" x2={50 + t * 3} y2="360" stroke="#e9f2f6" strokeWidth="2" />
            <text x={50 + t * 3} y="380" fill="#e9f2f6" fontSize="12" textAnchor="middle">{t}</text>
          </g>
        ))}
        <rect x={50 + load * 3 - 2} y="340" width="4" height="20" fill="#d0523f" />
        <text x="200" y="395" fill="#e9f2f6" fontSize="14" textAnchor="middle">AXIALE LAST (kN)</text>

        <text x="200" y="40" fill="#e9f2f6" fontSize="20" textAnchor="middle" fontWeight="bold">
          {p.title}
        </text>
      </svg>
    </AbsoluteFill>
  );
};