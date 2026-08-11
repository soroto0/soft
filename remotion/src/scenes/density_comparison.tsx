import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const DensityComparisonScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const campProgress = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const cityProgress = interpolate(frame, [0, span * 0.9], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleRise = interpolate(frame, [0, span], [20, 0], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ticks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 600 400">
        <defs>
          <linearGradient id="scaleGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#e9f2f6" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#d0523f" />
          </linearGradient>
        </defs>

        <text x={300} y={40} fill="#e9f2f6" fontSize={32} textAnchor="middle" style={{ opacity: titleRise }}>
          {p.title}
        </text>

        <g transform="translate(300, 220)">
          <circle cx={0} cy={0} r={120} fill="none" stroke="#e9f2f6" strokeWidth={1} strokeDasharray="4 4" />
          <circle cx={-40} cy={0} r={80} fill="#8da399" fillOpacity={cityProgress * 0.6} stroke="#e9f2f6" strokeWidth={1} />
          <circle cx={40} cy={0} r={40} fill="#8da399" fillOpacity={campProgress * 0.9} stroke="#e9f2f6" strokeWidth={2} />
          
          <line x1={40} y1={-60} x2={40} y2={-90} stroke="#e9f2f6" strokeWidth={1} />
          <text x={40} y={-100} fill="#e9f2f6" fontSize={12} textAnchor="middle">Campamento</text>
          
          <line x1={-40} y1={60} x2={-40} y2={90} stroke="#e9f2f6" strokeWidth={1} />
          <text x={-40} y={105} fill="#e9f2f6" fontSize={12} textAnchor="middle">Ciudad</text>
        </g>

        <g transform="translate(100, 350)">
          <line x1={0} y1={0} x2={400} y2={0} stroke="url(#scaleGrad)" strokeWidth={4} />
          {ticks.map((t) => (
            <g key={t}>
              <line x1={t * 400} y1={0} x2={t * 400} y2={15} stroke="#e9f2f6" strokeWidth={1} />
              <text x={t * 400} y={35} fill="#e9f2f6" fontSize={10} textAnchor="middle">{Math.round(t * 100)}%</text>
            </g>
          ))}
          <text x={200} y={-10} fill="#e9f2f6" fontSize={10} textAnchor="middle">NIVEL DE CONTAGIO</text>
        </g>
      </svg>
    </AbsoluteFill>
  );
};