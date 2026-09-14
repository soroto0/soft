import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const DataDivergenceFlowScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const flow = interpolate(frame, [0, span * 0.5], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const filter = interpolate(frame, [span * 0.3, span * 0.7], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const split = interpolate(frame, [span * 0.4, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ticks = [0, 1, 2, 3];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 600 300">
        <defs>
          <linearGradient id="flowGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#e9f2f6" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#d0523f" />
          </linearGradient>
        </defs>

        <text x="300" y="30" fill="#e9f2f6" fontSize="20" textAnchor="middle" style={{ letterSpacing: '0.1em' }}>{p.title}</text>

        <path d={`M 50 150 L ${50 + 500 * flow} 150`} stroke="#e9f2f6" strokeWidth="2" strokeDasharray="4 4" />

        <g opacity={split}>
          <path d={`M 250 150 L 350 100`} stroke="#e9f2f6" strokeWidth="2" />
          <path d={`M 250 150 L 350 200`} stroke="#d0523f" strokeWidth="2" />
          
          <rect x="350" y="80" width="100" height="40" fill="none" stroke="#e9f2f6" strokeWidth="1" />
          <text x="400" y="105" fill="#e9f2f6" fontSize="12" textAnchor="middle">VERDAD</text>

          <rect x="350" y="180" width="100" height="40" fill="none" stroke="#d0523f" strokeWidth="1" />
          <text x="400" y="205" fill="#d0523f" fontSize="12" textAnchor="middle">CONTROL</text>
        </g>

        <g opacity={filter}>
          <rect x="250" y="170" width="40" height="60" fill="url(#flowGrad)" opacity="0.3" />
          <text x="270" y="245" fill="#d0523f" fontSize="10" textAnchor="middle">FILTRO</text>
        </g>

        {ticks.map((t) => (
          <g key={t}>
            <line x1={50 + t * 150} y1="145" x2={50 + t * 150} y2="155" stroke="#e9f2f6" strokeWidth="1" />
            <text x={50 + t * 150} y="170" fill="#e9f2f6" fontSize="8" textAnchor="middle">T{t}</text>
          </g>
        ))}
      </svg>
    </AbsoluteFill>
  );
};