import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const PorePressureLagSectionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const reservoirRise = interpolate(frame, [0, duration], [180, 80], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const phreaticRise = interpolate(frame, [0, duration], [180, 140], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const gradientShift = interpolate(frame, [0, duration], [0, 40], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ticks = [0, 1, 2, 3];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 500 300">
        <defs>
          <linearGradient id="pressureGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d0523f" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#e9f2f6" />
          </linearGradient>
        </defs>

        <path d="M 50 250 L 200 50 L 350 250 Z" fill="#5b7f9c" stroke="#e9f2f6" strokeWidth="2" />
        <path d="M 120 250 L 200 50 L 280 250 Z" fill="#8a949b" stroke="#e9f2f6" strokeWidth="1" />
        
        <rect x="0" y={reservoirRise} width="50" height={250 - reservoirRise} fill="#5b7f9c" opacity="0.6" />
        <line x1="0" y1={reservoirRise} x2="120" y2={reservoirRise} stroke="#e9f2f6" strokeWidth="2" strokeDasharray="4 2" />
        
        <path d={`M 120 250 Q 200 ${phreaticRise} 280 250`} fill="none" stroke="#e0b44c" strokeWidth="3" />
        
        <rect x="120" y={phreaticRise - gradientShift} width="160" height={250 - phreaticRise + gradientShift} fill="url(#pressureGrad)" opacity="0.4" />

        {ticks.map((t) => (
          <g key={t}>
            <line x1="450" y1={250 - t * 50} x2="460" y2={250 - t * 50} stroke="#e9f2f6" strokeWidth="1" />
            <text x="470" y={253 - t * 50} fill="#e9f2f6" fontSize="10">{t}m</text>
          </g>
        ))}

        <text x="10" y={reservoirRise - 10} fill="#e9f2f6" fontSize="12">RESERVOIR</text>
        <text x="200" y={phreaticRise - 10} fill="#e0b44c" fontSize="12" textAnchor="middle">PHREATIC LINE</text>
        <text x="200" y="280" fill="#e9f2f6" fontSize="14" textAnchor="middle" fontWeight="bold">
          {p.title || "PORENWASSERDRUCK-STABILISIERUNG"}
        </text>
      </svg>
    </AbsoluteFill>
  );
};