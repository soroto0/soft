import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const GrowthChartScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const growth = interpolate(frame, [0, span * 0.7], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pulse = interpolate(frame, [span * 0.4, span], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const slide = interpolate(frame, [0, span], [0, 50], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;
  const bars = [
    { x: 100, h: 0.2 },
    { x: 200, h: 0.4 },
    { x: 300, h: 0.6 },
    { x: 400, h: 0.9 },
  ];
  const ticks = [0, 25, 50, 75, 100];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 600 400">
        <defs>
          <linearGradient id="g" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#5b7f9c" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#d0523f" />
          </linearGradient>
        </defs>
        <line x1="50" y1="350" x2="550" y2="350" stroke="#e9f2f6" strokeWidth="2" />
        {ticks.map((t) => (
          <g key={t}>
            <line x1="40" y1={350 - t * 2.5} x2="50" y2={350 - t * 2.5} stroke="#e9f2f6" strokeWidth="1" />
            <text x="35" y={355 - t * 2.5} fill="#e9f2f6" fontSize="12" textAnchor="end">{t}</text>
          </g>
        ))}
        {bars.map((b) => (
          <rect key={b.x} x={b.x} y={350 - b.h * 250 * growth} width="60" height={b.h * 250 * growth} fill="url(#g)" />
        ))}
        <g transform={`translate(450, ${50 - slide})`}>
          <path d="M0 50 L50 50 L50 20 L25 0 L0 20 Z" fill="#e9f2f6" />
          <circle cx="25" cy="25" r={10 + 10 * Math.sin(pulse * 20)} stroke="#d0523f" fill="none" strokeWidth="3" />
          <circle cx="25" cy="25" r={20 + 10 * Math.sin(pulse * 20)} stroke="#d0523f" fill="none" strokeWidth="1" opacity={0.5} />
        </g>
      </svg>
      {p.title ? (
        <div style={{ marginTop: 20, fontFamily: 'sans-serif', fontSize: 32, color: '#e9f2f6', fontWeight: 'bold' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};