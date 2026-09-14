import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const EffectiveHeightGraphScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const draw = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shrink = interpolate(frame, [span * 0.3, span * 0.7], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [span * 0.6, span * 0.9], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const yBase = 250;
  const fullH = 180;
  const currentH = fullH * (1 - 0.6 * shrink);

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 600 350">
        <defs>
          <linearGradient id="beamGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5d6a73" />
            <stop offset="0.5" stopColor="#8a949b" />
            <stop offset="1" stopColor="#e9f2f6" />
          </linearGradient>
        </defs>

        <rect x={150} y={yBase - fullH * draw} width={100} height={fullH * draw} fill="url(#beamGrad)" stroke="#e9f2f6" strokeWidth={1} />
        <rect x={350} y={yBase - currentH * draw} width={100} height={currentH * draw} fill="url(#beamGrad)" stroke="#d0523f" strokeWidth={2} />

        <line x1={100} y1={yBase} x2={100} y2={yBase - fullH} stroke="#e9f2f6" strokeWidth={2} />
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <line x1={90} y1={yBase - fullH * t} x2={110} y2={yBase - fullH * t} stroke="#e9f2f6" strokeWidth={1} />
            <text x={70} y={yBase - fullH * t + 4} fill="#e9f2f6" fontSize={12} textAnchor="end">{Math.round(t * 100)}%</text>
          </g>
        ))}

        <text x={200} y={yBase + 30} fill="#e9f2f6" fontSize={14} textAnchor="middle">Original</text>
        <text x={400} y={yBase + 30} fill="#d0523f" fontSize={14} textAnchor="middle">Delaminiert</text>

        <path d={`M 260 ${yBase - fullH / 2} L 340 ${yBase - fullH / 2}`} stroke="#e0b44c" strokeWidth={2} strokeDasharray="4 4" opacity={labelFade} />
        <text x={300} y={yBase - fullH / 2 - 10} fill="#e0b44c" fontSize={12} textAnchor="middle" opacity={labelFade}>Verlust</text>

        {p.title ? (
          <text x={300} y={330} fill="#e9f2f6" fontSize={24} textAnchor="middle" fontWeight="bold">
            {p.title}
          </text>
        ) : null}
      </svg>
    </AbsoluteFill>
  );
};