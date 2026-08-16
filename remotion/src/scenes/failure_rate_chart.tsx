import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const FailureRateChartScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const progress = interpolate(frame, [span * 0.1, span * 0.9], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const dissolve = interpolate(frame, [span * 0.2, span * 0.8], [0, 1], {
    easing: Easing.in(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [0, span * 0.3], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const bars = Array.from({ length: 20 }, (_, i) => i);

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 500 300">
        <defs>
          <linearGradient id="puddle" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d0523f" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#e9f2f6" />
          </linearGradient>
        </defs>
        <line x1="50" y1="250" x2="450" y2="250" stroke="#e9f2f6" strokeWidth="2" />
        <text x="250" y="280" fill="#e9f2f6" fontSize="16" textAnchor="middle" opacity={labelFade}>90 DAY TIMELINE</text>
        {bars.map((i) => {
          const isFailing = i < 18;
          const height = isFailing ? Math.max(20, 150 * (1 - dissolve)) : 150;
          const y = 250 - height;
          return (
            <rect
              key={i}
              x={60 + i * 20}
              y={y}
              width={15}
              height={height}
              fill={isFailing && dissolve > 0 ? 'url(#puddle)' : '#e9f2f6'}
              opacity={labelFade}
            />
          );
        })}
        <text x="50" y="40" fill="#e9f2f6" fontSize="14" opacity={labelFade}>20 UNITS</text>
        <text x="450" y="40" fill="#d0523f" fontSize="14" textAnchor="end" opacity={labelFade}>18 FAILED</text>
        <text x="250" y="20" fill="#e9f2f6" fontSize="24" textAnchor="middle" opacity={labelFade} fontWeight="bold">
          {Math.round(progress * 90)} DAYS
        </text>
      </svg>
      {p.title ? (
        <div style={{ marginTop: 40, color: '#e9f2f6', fontSize: 32, fontFamily: 'sans-serif', opacity: labelFade }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};