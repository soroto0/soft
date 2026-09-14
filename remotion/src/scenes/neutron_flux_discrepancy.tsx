import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const NeutronFluxDiscrepancyScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const progress = interpolate(frame, [0, duration], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const spike = interpolate(frame, [duration * 0.5, duration * 0.8], [0, 1], {
    easing: Easing.elastic(1.5),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [duration * 0.7, duration * 0.9], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const theoreticalPoints = Array.from({ length: 11 }, (_, i) => ({
    x: i * 40,
    y: 150 - (Math.sin(i * 0.5) * 50),
  }));

  const actualPoints = theoreticalPoints.map((pt, i) => ({
    x: pt.x,
    y: i === 8 ? pt.y - 40 * spike : pt.y - (Math.sin(i * 0.5) * 50 * 0.1),
  }));

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" height="80%" viewBox="0 0 400 250">
        <defs>
          <linearGradient id="gridGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e9f2f6" stopOpacity="0.1" />
            <stop offset="1" stopColor="#e9f2f6" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        
        <rect x="40" y="20" width="320" height="180" fill="url(#gridGrad)" />
        
        {[0, 60, 120, 180].map((y) => (
          <g key={y}>
            <line x1="40" y1={20 + y} x2="360" y2={20 + y} stroke="#e9f2f6" strokeWidth="0.5" strokeDasharray="2 2" />
            <text x="35" y={25 + y} fill="#e9f2f6" fontSize="8" textAnchor="end">{100 - y / 2}%</text>
          </g>
        ))}

        <polyline
          fill="none"
          stroke="#e9f2f6"
          strokeWidth="2"
          points={theoreticalPoints.map((pt) => `${40 + pt.x * progress},${pt.y}`).join(' ')}
        />

        <polyline
          fill="none"
          stroke="#e0b44c"
          strokeWidth="2"
          points={actualPoints.map((pt) => `${40 + pt.x * progress},${pt.y}`).join(' ')}
        />

        <circle cx={40 + 8 * 40} cy={actualPoints[8].y} r="4" fill="#d0523f" opacity={labelFade} />
        <text x={40 + 8 * 40 + 10} y={actualPoints[8].y - 10} fill="#d0523f" fontSize="10" opacity={labelFade}>+14%</text>
        
        <text x="200" y="240" fill="#e9f2f6" fontSize="12" textAnchor="middle" style={{ letterSpacing: '0.1em' }}>
          {p.title}
        </text>
      </svg>
    </AbsoluteFill>
  );
};
