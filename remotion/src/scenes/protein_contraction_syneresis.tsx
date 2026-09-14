import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ProteinContractionSyneresisScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const contraction = interpolate(frame, [0, span * 0.4], [1, 0.5], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const fluid = interpolate(frame, [span * 0.3, span * 0.8], [0, 1], {
    easing: Easing.in(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const temp = interpolate(frame, [0, span * 0.3], [20, 73], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const grid = Array.from({ length: 6 }, (_, i) => i - 2.5);

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 600 400">
        <defs>
          <linearGradient id="fluidGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e0b44c" />
            <stop offset="0.5" stopColor="#d0523f" />
            <stop offset="1" stopColor="#8a4030" />
          </linearGradient>
        </defs>

        <text x="300" y="30" fill="#e9f2f6" fontSize="24" textAnchor="middle" style={{ letterSpacing: '2px' }}>
          {p.title}
        </text>

        <g transform="translate(300, 220)">
          <rect x={-150 * contraction} y={-150 * contraction} width={300 * contraction} height={300 * contraction} 
                fill="none" stroke="#e9f2f6" strokeWidth="2" strokeDasharray="8 8" />
          
          {grid.map((x) => grid.map((y) => (
            <circle key={`${x}-${y}`} cx={x * 50 * contraction} cy={y * 50 * contraction} r="3" fill="#e9f2f6" />
          )))}

          {grid.map((i) => (
            <circle key={`drop-${i}`} cx={i * 40 * fluid} cy={i * 40 * fluid} r={6 * fluid} fill="url(#fluidGrad)" />
          ))}
        </g>

        <g transform="translate(50, 100)">
          <line x1="0" y1="200" x2="0" y2="0" stroke="#e9f2f6" strokeWidth="2" />
          <text x="-10" y="205" fill="#e9f2f6" fontSize="12" textAnchor="end">20°C</text>
          <text x="-10" y="5" fill="#d0523f" fontSize="12" textAnchor="end">73°C</text>
          <rect x="-5" y={200 - (temp / 80) * 200} width="10" height="5" fill="#d0523f" />
        </g>

        <g transform="translate(550, 100)">
          <line x1="0" y1="200" x2="0" y2="0" stroke="#e9f2f6" strokeWidth="1" />
          <text x="10" y="200" fill="#e9f2f6" fontSize="10">Red expandida</text>
          <text x="10" y="20" fill="#e9f2f6" fontSize="10">Red contraída</text>
          <line x1="-5" y1="200" x2="5" y2="200" stroke="#e9f2f6" strokeWidth="2" />
          <line x1="-5" y1="20" x2="5" y2="20" stroke="#e9f2f6" strokeWidth="2" />
        </g>
      </svg>
    </AbsoluteFill>
  );
};