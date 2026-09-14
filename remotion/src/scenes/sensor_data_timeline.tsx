import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const SensorDataTimelineScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = p.enter * p.exit;
  const duration = (p.dur || 6) * fps;

  const progress = interpolate(frame, [0, duration], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const failurePoint = interpolate(frame, [duration * 0.95, duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const signalShift = interpolate(frame, [0, duration * 0.95], [0, 10], {
    easing: Easing.bezier(0.5, 0, 0.5, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const yTicks = [0, 25, 50, 75, 100];
  const xTicks = [0, 30, 60, 90, 120];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 600 300">
        <defs>
          <linearGradient id="gridGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e9f2f6" stopOpacity="0.1" />
            <stop offset="1" stopColor="#e9f2f6" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <rect x="50" y="20" width="500" height="200" fill="url(#gridGrad)" />
        {yTicks.map((y) => (
          <g key={y}>
            <line x1="50" y1={220 - y * 2} x2="550" y2={220 - y * 2} stroke="#e9f2f6" strokeWidth="0.5" strokeDasharray="2 2" />
            <text x="40" y={220 - y * 2 + 4} fill="#e9f2f6" fontSize="10" textAnchor="end">{y}%</text>
          </g>
        ))}
        {xTicks.map((x) => (
          <text key={x} x={50 + x * 4.16} y="240" fill="#e9f2f6" fontSize="10" textAnchor="middle">{x}s</text>
        ))}
        <path
          d={`M 50 120 ${Array.from({ length: 100 }).map((_, i) => {
            const x = 50 + (i / 99) * 500 * progress;
            const y = 120 + Math.sin(i * 0.5 + signalShift) * 5;
            return `L ${x} ${y}`;
          }).join(' ')}`}
          fill="none"
          stroke="#e9f2f6"
          strokeWidth="2"
        />
        <circle cx={50 + 500 * progress} cy="120" r={4 * failurePoint + 2} fill={failurePoint > 0 ? '#d0523f' : '#e0b44c'} />
        <line x1="50" y1="220" x2="550" y2="220" stroke="#e9f2f6" strokeWidth="2" />
        <line x1="50" y1="20" x2="50" y2="220" stroke="#e9f2f6" strokeWidth="2" />
      </svg>
      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: 'sans-serif', fontSize: 32, color: '#e9f2f6', fontWeight: 300 }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};