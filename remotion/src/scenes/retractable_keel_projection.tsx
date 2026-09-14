import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const RetractableKeelProjectionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const keelY = interpolate(frame, [span * 0.1, span * 0.6], [80, 140], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const lineGrow = interpolate(frame, [span * 0.2, span * 0.7], [0, 1], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textFade = interpolate(frame, [span * 0.5, span * 0.9], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const stages = [
    { label: 'RETRACTED', y: 80 },
    { label: 'MID-POSITION', y: 140 },
    { label: 'MAX DEPTH', y: 200 },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 300">
        <defs>
          <linearGradient id="keelFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8a949b" />
            <stop offset="0.5" stopColor="#5d6a73" />
            <stop offset="1" stopColor="#2a3035" />
          </linearGradient>
        </defs>

        <rect x="170" y="50" width="60" height="180" fill="none" stroke="#e9f2f6" strokeWidth="0.5" strokeDasharray="4 4" />

        <rect x="175" y={keelY} width="50" height="40" fill="url(#keelFill)" stroke="#e9f2f6" strokeWidth="1" />

        {stages.map((s, i) => (
          <g key={s.label}>
            <line x1="150" y1={s.y + 20} x2="170" y2={s.y + 20} stroke="#e9f2f6" strokeWidth="1" />
            <text x="145" y={s.y + 24} fill="#e9f2f6" fontSize="10" textAnchor="end">{s.label}</text>
            <text x="145" y={s.y + 36} fill="#e9f2f6" fontSize="8" textAnchor="end" opacity="0.6">{i * 2}m</text>
          </g>
        ))}

        <line x1="250" y1="220" x2="250" y2={220 - 80 * lineGrow} stroke="#e0b44c" strokeWidth="4" />
        <path d="M 245 220 L 255 220 M 245 140 L 255 140" stroke="#e0b44c" strokeWidth="2" />
        
        <text x="265" y="180" fill="#e0b44c" fontSize="12" opacity={textFade} style={{ fontWeight: 'bold' }}>
          80cm OFFSET
        </text>

        <text x="200" y="280" fill="#e9f2f6" fontSize="20" textAnchor="middle" style={{ fontFamily: 'sans-serif' }}>
          {p.title || 'Ballastkiel-Positionen'}
        </text>
      </svg>
    </AbsoluteFill>
  );
};