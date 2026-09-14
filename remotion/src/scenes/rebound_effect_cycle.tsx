import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ReboundEffectCycleScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const rotation = interpolate(frame, [0, span], [0, 360], {
    easing: Easing.linear,
  });
  const growth = interpolate(frame, [0, span], [1, 2.5], {
    easing: Easing.inOut(Easing.quad),
  });
  const strokeWidth = interpolate(frame, [0, span], [2, 8], {
    easing: Easing.inOut(Easing.quad),
  });

  const stages = [
    { label: '1. EFFICIENCY GAIN', color: '#e9f2f6', offset: 0 },
    { label: '2. LOWER COST', color: '#e0b44c', offset: 120 },
    { label: '3. HIGHER DEMAND', color: '#d0523f', offset: 240 },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" height="80%" viewBox="0 0 400 400">
        <defs>
          <linearGradient id="spiralGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#e9f2f6" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#d0523f" />
          </linearGradient>
        </defs>

        <g transform={`rotate(${rotation} 200 200)`}>
          <path
            d="M 200 200 m -50 0 a 50 50 0 1 0 100 0 a 50 50 0 1 0 -100 0"
            fill="none"
            stroke="url(#spiralGrad)"
            strokeWidth={strokeWidth}
            strokeDasharray="10 5"
          />
          <path
            d={`M 200 200 m -${50 * growth} 0 a ${50 * growth} ${50 * growth} 0 1 0 ${100 * growth} 0 a ${50 * growth} ${50 * growth} 0 1 0 -${100 * growth} 0`}
            fill="none"
            stroke="#d0523f"
            strokeWidth={2}
            opacity={0.5}
          />
        </g>

        {stages.map((s, i) => (
          <g key={s.label}>
            <circle cx={200 + 120 * Math.cos((s.offset * Math.PI) / 180)} 
                    cy={200 + 120 * Math.sin((s.offset * Math.PI) / 180)} 
                    r={8} fill={s.color} />
            <text x={200 + 140 * Math.cos((s.offset * Math.PI) / 180)} 
                  y={200 + 140 * Math.sin((s.offset * Math.PI) / 180)} 
                  fill={s.color} fontSize={12} fontWeight="bold">
              {s.label}
            </text>
            <line x1={200} y1={200} 
                  x2={200 + 100 * Math.cos((s.offset * Math.PI) / 180)} 
                  y2={200 + 100 * Math.sin((s.offset * Math.PI) / 180)} 
                  stroke="#e9f2f6" strokeWidth={0.5} strokeDasharray="2 2" />
          </g>
        ))}

        <text x={200} y={380} fill="#e9f2f6" fontSize={20} textAnchor="middle" 
              style={{ fontFamily: 'sans-serif' }}>
          {p.title}
        </text>
      </svg>
    </AbsoluteFill>
  );
};