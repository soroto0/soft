import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const GroutVolumeComparisonScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const barGrowth = interpolate(frame, [0, span * 0.6], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [span * 0.5, span * 0.8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const highlightPulse = interpolate(frame, [span * 0.6, span * 0.9], [0.6, 1], {
    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const bars = [
    { label: 'SOLL', value: 285000, color: '#5d6a73' },
    { label: 'IST', value: 570000, color: '#5d6a73' },
  ];

  const yTicks = [0, 142500, 285000, 427500, 570000];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width={width * 0.7} viewBox="0 0 500 300">
        <line x1={50} y1={250} x2={450} y2={250} stroke="#e9f2f6" strokeWidth={2} />
        {yTicks.map((val, i) => (
          <g key={val}>
            <line x1={50} y1={250 - (i * 50)} x2={450} y2={250 - (i * 50)} stroke="#e9f2f6" strokeWidth={0.5} strokeDasharray="4 4" opacity={0.3} />
            <text x={40} y={255 - (i * 50)} fill="#e9f2f6" fontSize={10} textAnchor="end">{val.toLocaleString()}</text>
          </g>
        ))}
        {bars.map((b, i) => (
          <g key={b.label}>
            <rect
              x={120 + i * 200}
              y={250 - (b.value / 570000) * 200 * barGrowth}
              width={80}
              height={(b.value / 570000) * 200 * barGrowth}
              fill={b.color}
            />
            <text x={160 + i * 200} y={270} fill="#e9f2f6" fontSize={14} textAnchor="middle">{b.label}</text>
          </g>
        ))}
        <rect
          x={320}
          y={250 - (285000 / 570000) * 200 * barGrowth}
          width={80}
          height={(285000 / 570000) * 200 * barGrowth}
          fill="#d0523f"
          opacity={highlightPulse}
        />
        <text x={360} y={120} fill="#d0523f" fontSize={12} textAnchor="middle" opacity={labelFade} fontWeight="bold">
          +285.000 SACK
        </text>
      </svg>
      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: 'sans-serif', fontSize: 32, color: '#e9f2f6', textAlign: 'center' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
