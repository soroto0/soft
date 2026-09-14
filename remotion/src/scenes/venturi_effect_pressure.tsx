import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const VenturiEffectPressureScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const flow = interpolate(frame, [0, span], [0, 100], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pressure = interpolate(frame, [span * 0.2, span * 0.8], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [span * 0.4, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const lines = [0, 1, 2, 3, 4, 5, 6, 7];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 500 300">
        <defs>
          <linearGradient id="pressGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#d0523f" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#5b7f9c" />
          </linearGradient>
        </defs>
        <rect x="200" y="50" width="100" height="200" fill="#2a3a4a" stroke="#e9f2f6" strokeWidth="2" />
        <rect x="220" y="80" width="60" height="140" fill="#5b7f9c" />
        <text x="250" y="150" fill="#e9f2f6" textAnchor="middle" fontSize="12">FAN</text>
        {lines.map((i) => (
          <line
            key={i}
            x1={100 + (i * 40) + (flow % 40)}
            y1={100 + i * 10}
            x2={150 + (i * 40) + (flow % 40)}
            y2={100 + i * 10}
            stroke={i < 3 ? '#d0523f' : '#5b7f9c'}
            strokeWidth="2"
            strokeOpacity={pressure}
          />
        ))}
        <line x1="200" y1="40" x2="200" y2="260" stroke="#e9f2f6" strokeWidth="1" strokeDasharray="4 4" />
        <text x="190" y="30" fill="#d0523f" fontSize="10" textAnchor="end" opacity={labelFade}>HIGH P</text>
        <text x="310" y="30" fill="#5b7f9c" fontSize="10" opacity={labelFade}>LOW P</text>
        <path d="M 200 150 L 150 150 M 300 150 L 350 150" stroke="#e9f2f6" strokeWidth="2" />
      </svg>
      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: 'sans-serif', fontSize: 32, color: '#e9f2f6', opacity: labelFade }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};