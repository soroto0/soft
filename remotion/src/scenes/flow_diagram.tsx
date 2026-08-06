import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const FlowDiagramScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const progress = interpolate(frame, [0, span * 0.8], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const wealthGrowth = interpolate(frame, [span * 0.2, span * 0.9], [0, 1], {
    easing: Easing.in(Easing.exp),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const virtueDrop = interpolate(frame, [span * 0.2, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;
  const gridTicks = [0, 1, 2, 3, 4];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 500 300">
        <defs>
          <linearGradient id="wealthGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#e0b44c" />
            <stop offset="50%" stopColor="#d0523f" />
            <stop offset="100%" stopColor="#e9f2f6" />
          </linearGradient>
        </defs>

        <line x1="50" y1="250" x2="450" y2="250" stroke="#e9f2f6" strokeWidth="1" />
        <line x1="50" y1="50" x2="50" y2="250" stroke="#e9f2f6" strokeWidth="1" />
        
        {gridTicks.map((t) => (
          <g key={t}>
            <line x1={50 + t * 100} y1="250" x2={50 + t * 100} y2="260" stroke="#e9f2f6" strokeWidth="1" />
            <text x={50 + t * 100} y="280" fill="#e9f2f6" fontSize="10" textAnchor="middle">T{t}</text>
          </g>
        ))}

        <path d={`M 50 150 L ${50 + 400 * progress} ${150 + 80 * virtueDrop}`} 
              fill="none" stroke="#e9f2f6" strokeWidth="3" strokeDasharray="6 4" />
        
        <path d={`M 50 150 Q 250 150 450 ${150 - 100 * wealthGrowth}`} 
              fill="none" stroke="url(#wealthGrad)" strokeWidth="4" />

        <text x="450" y={150 + 80 * virtueDrop} fill="#e9f2f6" fontSize="12" textAnchor="end">Virtud</text>
        <text x="450" y={150 - 100 * wealthGrowth} fill="#e0b44c" fontSize="12" textAnchor="end">Influencia/Riqueza</text>
        
        <circle cx="50" cy="150" r="4" fill="#e9f2f6" />
        <text x="50" y="130" fill="#e9f2f6" fontSize="10" textAnchor="middle">Séneca</text>
      </svg>

      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: 'sans-serif', fontSize: 32, color: '#e9f2f6', fontWeight: 'bold' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};