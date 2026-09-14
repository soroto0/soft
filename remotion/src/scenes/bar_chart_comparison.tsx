import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const BarChartComparisonScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const barGrowth = interpolate(frame, [0, span * 0.6], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [span * 0.4, span * 0.7], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleRise = interpolate(frame, [0, span * 0.3], [20, 0], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const data = [
    { label: 'Kopf', value: 1 / 3, color: '#e0b44c', count: '167 Mio' },
    { label: 'Arme', value: 2 / 3, color: '#d0523f', count: '333 Mio' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 500 300">
        <line x1="50" y1="250" x2="450" y2="250" stroke="#e9f2f6" strokeWidth="2" />
        {data.map((item, i) => (
          <g key={item.label}>
            <rect
              x={100 + i * 200}
              y={250 - 180 * item.value * barGrowth}
              width={100}
              height={180 * item.value * barGrowth}
              fill={item.color}
            />
            <text
              x={150 + i * 200}
              y={240 - 180 * item.value * barGrowth}
              fill="#e9f2f6"
              fontSize="16"
              textAnchor="middle"
              opacity={labelFade}
            >
              {item.count}
            </text>
            <text
              x={150 + i * 200}
              y={280}
              fill="#e9f2f6"
              fontSize="18"
              textAnchor="middle"
            >
              {item.label}
            </text>
          </g>
        ))}
        <text x="250" y="30" fill="#e9f2f6" fontSize="24" textAnchor="middle" fontWeight="bold">
          500 Millionen Nervenzellen
        </text>
      </svg>
      {p.title ? (
        <div style={{
          marginTop: 40,
          transform: `translateY(${titleRise}px)`,
          fontFamily: 'sans-serif',
          fontSize: 32,
          color: '#e9f2f6',
          letterSpacing: '0.05em'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};