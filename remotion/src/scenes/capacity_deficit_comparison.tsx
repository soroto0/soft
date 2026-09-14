import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const CapacityDeficitComparisonScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const grow = interpolate(frame, [0, span * 0.5], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [span * 0.4, span * 0.6], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shift = interpolate(frame, [span * 0.2, span * 0.8], [0, 20], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const plates = [
    { id: 'theoretical', x: 100, w: 180, fill: '#8a949b', label: 'THEORETICAL (3x)', load: 3 },
    { id: 'actual', x: 320, w: 60, fill: '#d0523f', label: 'ACTUAL (1x)', load: 1 },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 500 300">
        <defs>
          <linearGradient id="grid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e9f2f6" stopOpacity="0.1" />
            <stop offset="1" stopColor="#e9f2f6" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        <rect x={50} y={250} width={400} height={2} fill="#e9f2f6" />
        {plates.map((plate) => (
          <g key={plate.id}>
            <rect
              x={plate.x}
              y={250 - 150 * grow * (plate.load / 3)}
              width={plate.w}
              height={150 * grow * (plate.load / 3)}
              fill={plate.fill}
              stroke="#e9f2f6"
              strokeWidth={2}
            />
            <text
              x={plate.x + plate.w / 2}
              y={240 - 150 * grow * (plate.load / 3)}
              fill="#e9f2f6"
              fontSize={14}
              textAnchor="middle"
              opacity={labelFade}
            >
              {plate.label}
            </text>
            <line
              x1={plate.x + plate.w / 2}
              y1={250}
              x2={plate.x + plate.w / 2}
              y2={270}
              stroke="#e9f2f6"
              strokeWidth={1}
            />
          </g>
        ))}
        <path
          d={`M 80 100 L 420 100 M 80 150 L 420 150 M 80 200 L 420 200`}
          stroke="url(#grid)"
          strokeWidth={1}
          strokeDasharray="4 4"
        />
        <text x={430} y={105} fill="#e9f2f6" fontSize={12}>Load Capacity</text>
        <g transform={`translate(0, ${shift})`}>
          <line x1={280} y1={120} x2={320} y2={120} stroke="#e0b44c" strokeWidth={3} />
          <text x={300} y={110} fill="#e0b44c" fontSize={12} textAnchor="middle">DEFICIT</text>
        </g>
      </svg>
      {p.title ? (
        <div style={{
          marginTop: 40,
          fontFamily: "'Segoe UI', Arial, sans-serif",
          fontSize: 48,
          fontWeight: 'bold',
          color: '#e0b44c',
          textTransform: 'uppercase'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};