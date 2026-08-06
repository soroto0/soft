import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ConcreteStrengthComparisonScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const barAnim = interpolate(frame, [0, span * 0.6], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [span * 0.5, span * 0.8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const dangerHighlight = interpolate(frame, [span * 0.7, span * 0.9], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const yAxis = [0, 1000, 2000, 3000];
  const bars = [
    { label: 'Required', value: 3000, color: '#e9f2f6', x: 150 },
    { label: 'Actual', value: 2000, color: '#d0523f', x: 300 },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 600 400">
        <defs>
          <linearGradient id="barGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#e9f2f6" />
          </linearGradient>
        </defs>

        <line x1="80" y1="320" x2="520" y2="320" stroke="#e9f2f6" strokeWidth="2" />
        <line x1="80" y1="50" x2="80" y2="320" stroke="#e9f2f6" strokeWidth="2" />

        {yAxis.map((val) => (
          <g key={val}>
            <line x1="70" y1={320 - (val / 3000) * 240} x2="80" y2={320 - (val / 3000) * 240} stroke="#e9f2f6" strokeWidth="1" />
            <text x="60" y={325 - (val / 3000) * 240} fill="#e9f2f6" fontSize="14" textAnchor="end">{val}</text>
          </g>
        ))}

        {bars.map((b) => (
          <g key={b.label}>
            <rect x={b.x} y={320 - (b.value / 3000) * 240 * barAnim} width="80" height={(b.value / 3000) * 240 * barAnim} fill={b.color} opacity="0.8" />
            <text x={b.x + 40} y="350" fill="#e9f2f6" fontSize="16" textAnchor="middle">{b.label}</text>
            <text x={b.x + 40} y={310 - (b.value / 3000) * 240 * barAnim} fill={b.color} fontSize="14" textAnchor="middle" opacity={labelFade}>{b.value} PSI</text>
          </g>
        ))}

        <rect x="280" y="50" width="120" height="270" fill="none" stroke="#d0523f" strokeWidth="2" strokeDasharray="5,5" opacity={dangerHighlight} />
        <text x="340" y="40" fill="#d0523f" fontSize="18" textAnchor="middle" opacity={dangerHighlight}>DEFICIT</text>
      </svg>

      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: 'sans-serif', fontSize: 32, color: '#e9f2f6', fontWeight: 'bold' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};