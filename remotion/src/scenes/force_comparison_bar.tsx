import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ForceComparisonBarScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const lionBar = interpolate(frame, [0, span * 0.6], [0, 320], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const smilodonBar = interpolate(frame, [span * 0.2, span * 0.8], [0, 110], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [span * 0.5, span * 0.9], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const data = [
    { label: 'Löwe', height: lionBar, color: '#e9f2f6', value: '100%' },
    { label: 'Smilodon', height: smilodonBar, color: '#d0523f', value: '35%' },
  ];

  const ticks = [0, 25, 50, 75, 100];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 500 300">
        <line x1="50" y1="250" x2="450" y2="250" stroke="#e9f2f6" strokeWidth="2" />
        {ticks.map((t) => (
          <g key={t}>
            <line x1={50 + t * 4} y1="250" x2={50 + t * 4} y2="260" stroke="#e9f2f6" strokeWidth="1" />
            <text x={50 + t * 4} y="275" fill="#e9f2f6" fontSize="10" textAnchor="middle">{t}%</text>
          </g>
        ))}
        {data.map((d, i) => (
          <g key={d.label}>
            <rect x="50" y={80 + i * 80} width={d.height} height="40" fill={d.color} />
            <text x="40" y={105 + i * 80} fill="#e9f2f6" fontSize="14" textAnchor="end" fontWeight="bold">{d.label}</text>
            <text x={60 + d.height} y={105 + i * 80} fill="#e0b44c" fontSize="12" opacity={labelFade}>{d.value}</text>
          </g>
        ))}
        <text x="250" y="30" fill="#e9f2f6" fontSize="18" textAnchor="middle" style={{ letterSpacing: '1px' }}>
          BEISSKRAFT-INDEX
        </text>
      </svg>
      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: 'sans-serif', fontSize: 32, color: '#e9f2f6', fontWeight: '300' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};