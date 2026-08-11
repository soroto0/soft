import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const FracturedLineDiagramScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = Math.max(1, Math.round((p.dur || 6) * fps));

  const fracture = interpolate(frame, [0, duration], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shift = interpolate(frame, [0, duration], [0, 50], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pulse = interpolate(frame, [0, duration], [0.5, 1], {
    easing: Easing.inOut(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const segments = Array.from({ length: 20 });
  const ticks = [0, 0.5, 1];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 400">
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#d0523f" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#e9f2f6" />
          </linearGradient>
        </defs>

        <rect x="50" y="50" width="300" height="300" fill="none" stroke="#e9f2f6" strokeWidth="0.5" strokeDasharray="4 4" />
        
        {segments.map((_, i) => {
          const x = 50 + (i * 15);
          const yBase = 200;
          const yOffset = (i % 2 === 0 ? 1 : -1) * (fracture * 80);
          return (
            <line
              key={i}
              x1={x}
              y1={yBase}
              x2={x + 15}
              y2={yBase + yOffset}
              stroke="url(#lineGrad)"
              strokeWidth={2 * pulse}
              strokeOpacity={0.8}
            />
          );
        })}

        <line x1="50" y1="360" x2="350" y2="360" stroke="#e9f2f6" strokeWidth="1" />
        {ticks.map((t) => (
          <g key={t}>
            <line x1={50 + t * 300} y1="360" x2={50 + t * 300} y2="370" stroke="#e9f2f6" strokeWidth="1" />
            <text x={50 + t * 300} y="385" fill="#e9f2f6" fontSize="12" textAnchor="middle">{t}</text>
          </g>
        ))}

        <text x="200" y="40" fill="#e0b44c" fontSize="16" textAnchor="middle" style={{ transform: `translateY(${shift}px)` }}>
          {p.title}
        </text>
        
        <text x="50" y="30" fill="#d0523f" fontSize="10">GEOMETRÍA</text>
        <text x="350" y="30" fill="#e9f2f6" fontSize="10" textAnchor="end">FRACCIÓN</text>
      </svg>
    </AbsoluteFill>
  );
};