import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const LoadDistributionGraphScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const barGrowth = interpolate(frame, [0, span * 0.6], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const concreteReveal = interpolate(frame, [span * 0.3, span * 0.8], [0, 1], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [span * 0.5, span * 0.9], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ticks = [0, 20, 40, 60, 80, 100];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 500 300">
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e0b44c" />
            <stop offset="0.5" stopColor="#d0523f" />
            <stop offset="1" stopColor="#8a949b" />
          </linearGradient>
        </defs>

        <line x1="50" y1="250" x2="450" y2="250" stroke="#e9f2f6" strokeWidth="2" />
        {ticks.map((t) => (
          <g key={t}>
            <line x1={50 + t * 4} y1="250" x2={50 + t * 4} y2="260" stroke="#e9f2f6" strokeWidth="1" />
            <text x={50 + t * 4} y="275" fill="#e9f2f6" fontSize="10" textAnchor="middle">{t}t</text>
          </g>
        ))}

        <rect x="80" y={250 - 150 * barGrowth} width="80" height={150 * barGrowth} fill="#e0b44c" />
        <text x="120" y={240 - 150 * barGrowth} fill="#e0b44c" fontSize="12" textAnchor="middle">Calculated</text>

        <rect x="250" y={250 - 150 * barGrowth} width="80" height={150 * barGrowth} fill="#e0b44c" />
        <rect x="250" y={250 - 150 * barGrowth - 80 * concreteReveal} width="80" height={80 * concreteReveal} fill="#d0523f" />
        
        <text x="290" y={240 - 150 * barGrowth - 80 * concreteReveal} fill="#e9f2f6" fontSize="12" textAnchor="middle" opacity={labelFade}>Actual</text>
        <text x="290" y={225 - 150 * barGrowth - 80 * concreteReveal} fill="#d0523f" fontSize="10" textAnchor="middle" opacity={labelFade}>+ Concrete</text>

        <path d={`M 340 ${250 - 150 * barGrowth - 40 * concreteReveal} h 30`} stroke="#d0523f" strokeWidth="2" opacity={labelFade} />
        <text x="380" y={250 - 150 * barGrowth - 35 * concreteReveal} fill="#d0523f" fontSize="12" opacity={labelFade}>Missing Load</text>
      </svg>

      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: "'Segoe UI', sans-serif", fontSize: 32, color: '#e9f2f6', fontWeight: 'bold' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};