import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const StabilityDiagramScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const draw = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const checkScale = interpolate(frame, [span * 0.5, span * 0.7], [0, 1], {
    easing: Easing.elastic(1.2),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const forceMagnitude = 80;
  const forceAnim = interpolate(frame, [span * 0.2, span * 0.5], [0, forceMagnitude], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ticks = [0, 50, 100];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 500 400">
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e9f2f6" />
            <stop offset="0.5" stopColor="#c9d3d9" />
            <stop offset="1" stopColor="#8a949b" />
          </linearGradient>
        </defs>

        <rect x="150" y="150" width="200" height="100" fill="url(#grad)" stroke="#e9f2f6" strokeWidth="2" opacity={draw} />
        
        <line x1="250" y1="200" x2="250" y2={200 + forceAnim} stroke="#d0523f" strokeWidth="6" strokeLinecap="round" />
        <text x="265" y={200 + forceAnim} fill="#d0523f" fontSize="18" fontWeight="bold">G={forceAnim.toFixed(0)}kN</text>
        
        <line x1="250" y1="200" x2="250" y2={200 - forceAnim} stroke="#e0b44c" strokeWidth="6" strokeLinecap="round" />
        <text x="265" y={200 - forceAnim} fill="#e0b44c" fontSize="18" fontWeight="bold">B={forceAnim.toFixed(0)}kN</text>

        <line x1="100" y1="320" x2="400" y2="320" stroke="#e9f2f6" strokeWidth="2" />
        {ticks.map((t, i) => (
          <g key={t}>
            <line x1={100 + i * 150} y1="320" x2={100 + i * 150} y2="335" stroke="#e9f2f6" strokeWidth="2" />
            <text x={100 + i * 150} y="355" fill="#e9f2f6" fontSize="14" textAnchor="middle">{t}kN</text>
          </g>
        ))}

        <g transform={`scale(${checkScale})`} transform-origin="250 200">
          <circle cx="250" cy="200" r="30" fill="#e9f2f6" />
          <path d="M 235 200 L 245 210 L 265 190" fill="none" stroke="#2d5a27" strokeWidth="6" strokeLinecap="round" />
        </g>
      </svg>

      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: 'sans-serif', fontSize: 32, color: '#e9f2f6', fontWeight: 'bold' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};