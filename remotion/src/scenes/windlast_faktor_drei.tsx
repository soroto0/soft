import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const WindlastFaktorDreiScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const arrowGrow = interpolate(frame, [span * 0.2, span * 0.6], [1, 3], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const warningPulse = interpolate(frame, [span * 0.6, span * 0.9], [0.3, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textShift = interpolate(frame, [0, span * 0.2], [50, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ticks = [1, 2, 3];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 600 300">
        <defs>
          <linearGradient id="arrowGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#8a949b" />
            <stop offset="0.5" stopColor="#c9d3d9" />
            <stop offset="1" stopColor="#8a949b" />
          </linearGradient>
        </defs>
        
        <text x="300" y="40" fill="#e9f2f6" fontSize="20" textAnchor="middle" style={{ opacity: 1 - textShift / 50 }}>
          Windlastvergleich Berechnung vs Realität
        </text>

        <line x1="100" y1="220" x2="500" y2="220" stroke="#e9f2f6" strokeWidth="2" />
        {ticks.map((t) => (
          <g key={t}>
            <line x1={100 + t * 100} y1="220" x2={100 + t * 100} y2="235" stroke="#e9f2f6" strokeWidth="2" />
            <text x={100 + t * 100} y="255" fill="#e9f2f6" fontSize="14" textAnchor="middle">{t}x</text>
          </g>
        ))}

        <g transform={`translate(100, 150)`}>
          <rect x="0" y="0" width={100 * arrowGrow} height="40" fill="url(#arrowGrad)" />
          <polygon points={`${100 * arrowGrow}, -10 ${100 * arrowGrow + 20}, 20 ${100 * arrowGrow}, 50`} fill="#d0523f" opacity={warningPulse} />
          <text x="5" y="-15" fill="#e0b44c" fontSize="16">Spitzenlast</text>
        </g>

        <rect x="100" y="100" width="100" height="40" fill="#5d6a73" />
        <text x="150" y="90" fill="#e9f2f6" fontSize="12" textAnchor="middle">Berechnung</text>
      </svg>
      
      {p.title ? (
        <div style={{ marginTop: 20, color: '#e9f2f6', fontSize: 24, textAlign: 'center' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};