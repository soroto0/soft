import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const FinancialPressureScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationInFrames = (p.dur || 6) * fps;
  const opacity = p.enter * p.exit;

  const progress = interpolate(frame, [0, durationInFrames], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const treasuryHeight = interpolate(frame, [0, durationInFrames], [180, 40], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const debtHeight = interpolate(frame, [0, durationInFrames], [20, 160], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const arrowY = interpolate(frame, [durationInFrames * 0.7, durationInFrames], [220, 180], {
    easing: Easing.out(Easing.back(2)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ticks = [0, 25, 50, 75, 100];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 500 300">
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e0b44c" />
            <stop offset="0.5" stopColor="#d0523f" />
            <stop offset="1" stopColor="#8b3a2d" />
          </linearGradient>
        </defs>

        <line x1="50" y1="220" x2="450" y2="220" stroke="#e9f2f6" strokeWidth="2" />
        <line x1="50" y1="20" x2="50" y2="220" stroke="#e9f2f6" strokeWidth="2" />
        
        {ticks.map((t) => (
          <g key={t}>
            <line x1="45" y1={220 - t * 1.8} x2="55" y2={220 - t * 1.8} stroke="#e9f2f6" strokeWidth="1" />
            <text x="35" y={225 - t * 1.8} fill="#e9f2f6" fontSize="10" textAnchor="end">{t}</text>
          </g>
        ))}

        <rect x="150" y={220 - treasuryHeight} width="80" height={treasuryHeight} fill="#e9f2f6" opacity="0.8" />
        <rect x="270" y={220 - debtHeight} width="80" height={debtHeight} fill="url(#grad)" />

        <text x="190" y="240" fill="#e9f2f6" fontSize="12" textAnchor="middle">Tesoro</text>
        <text x="310" y="240" fill="#e0b44c" fontSize="12" textAnchor="middle">Deuda</text>

        <path d={`M 310 220 L 310 ${arrowY}`} stroke="#d0523f" strokeWidth="4" markerEnd="url(#arrowhead)" />
        <text x="310" y={arrowY - 10} fill="#d0523f" fontSize="14" textAnchor="middle" fontWeight="bold">Violencia</text>
        
        <text x="250" y="280" fill="#e9f2f6" fontSize="24" textAnchor="middle" opacity={progress}>
          {p.title}
        </text>
      </svg>
    </AbsoluteFill>
  );
};