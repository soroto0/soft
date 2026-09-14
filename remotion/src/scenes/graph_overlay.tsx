import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const GraphOverlayScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const waterLevel = interpolate(frame, [0, span * 0.8], [0, 100], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pressureCurve = interpolate(frame, [0, span * 0.8], [0, 1], {
    easing: Easing.in(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const gridFade = interpolate(frame, [span * 0.2, span * 0.5], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ticks = [0, 25, 50, 75, 100];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 300" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="pressureGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#5b7f9c" />
            <stop offset="50%" stopColor="#e0b44c" />
            <stop offset="100%" stopColor="#d0523f" />
          </linearGradient>
        </defs>

        <line x1="50" y1="250" x2="350" y2="250" stroke="#e9f2f6" strokeWidth="2" />
        <line x1="50" y1="50" x2="50" y2="250" stroke="#e9f2f6" strokeWidth="2" />

        {ticks.map((t) => (
          <g key={t} opacity={gridFade}>
            <line x1={50 + t * 3} y1="250" x2={50 + t * 3} y2="260" stroke="#e9f2f6" strokeWidth="1" />
            <text x={50 + t * 3} y="275" fill="#e9f2f6" fontSize="10" textAnchor="middle">{t}m</text>
          </g>
        ))}

        <path
          d={`M 50 250 Q 50 250 ${50 + waterLevel * 3} ${250 - (waterLevel * waterLevel) / 40}`}
          fill="none"
          stroke="url(#pressureGrad)"
          strokeWidth="4"
          strokeDasharray="400"
          strokeDashoffset={400 * (1 - pressureCurve)}
        />

        <circle cx={50 + waterLevel * 3} cy={250 - (waterLevel * waterLevel) / 40} r="5" fill="#d0523f" />

        <text x="200" y="30" fill="#e9f2f6" fontSize="16" textAnchor="middle" style={{ fontWeight: 'bold' }}>
          {p.title}
        </text>
        
        <text x="350" y="240" fill="#e9f2f6" fontSize="10" textAnchor="end">Porenwasserdruck</text>
        <text x="60" y="60" fill="#e9f2f6" fontSize="10">Pegelstand</text>
      </svg>
    </AbsoluteFill>
  );
};