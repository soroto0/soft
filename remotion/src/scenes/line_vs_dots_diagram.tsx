import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const LineVsDotsDiagramScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const progress = interpolate(frame, [0, span * 0.8], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const dotReveal = interpolate(frame, [span * 0.2, span * 0.6], [0, 1], {
    easing: Easing.elastic(1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const lineGrow = interpolate(frame, [0, span * 0.5], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const integers = Array.from({ length: 11 }, (_, i) => i);
  const realTicks = Array.from({ length: 21 }, (_, i) => i);

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 600 300">
        <text x="300" y="40" fill="#e9f2f6" fontSize="24" textAnchor="middle" style={{ letterSpacing: '0.1em' }}>{p.title}</text>
        
        <g transform="translate(50, 120)">
          <text x="0" y="-20" fill="#e0b44c" fontSize="14">Números Enteros (Discretos)</text>
          <line x1="0" y1="0" x2={500 * progress} y2="0" stroke="#e9f2f6" strokeWidth="1" />
          {integers.map((i) => (
            <g key={`int-${i}`}>
              <circle cx={i * 50} cy="0" r={4 * dotReveal} fill="#e0b44c" />
              <text x={i * 50} y="25" fill="#e9f2f6" fontSize="10" textAnchor="middle">{i}</text>
            </g>
          ))}
        </g>

        <g transform="translate(50, 220)">
          <text x="0" y="-20" fill="#d0523f" fontSize="14">Números Reales (Continuos)</text>
          <line x1="0" y1="0" x2={500 * lineGrow} y2="0" stroke="#d0523f" strokeWidth="3" />
          {realTicks.map((i) => (
            <line key={`real-${i}`} x1={i * 25} y1="-8" x2={i * 25} y2="8" stroke="#d0523f" strokeWidth="1" />
          ))}
          <text x="0" y="25" fill="#e9f2f6" fontSize="10" textAnchor="middle">0</text>
          <text x="500" y="25" fill="#e9f2f6" fontSize="10" textAnchor="middle">10</text>
        </g>
      </svg>
    </AbsoluteFill>
  );
};