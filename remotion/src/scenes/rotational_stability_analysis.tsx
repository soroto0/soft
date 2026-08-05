import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const RotationalStabilityAnalysisScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const tilt = interpolate(frame, [0, span], [0, 25], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const cogOffset = interpolate(frame, [0, span], [0, 120], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const warningPulse = interpolate(frame, [0, span], [0.3, 1], {
    easing: Easing.bezier(0.5, 0, 0.5, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;
  const cx = 250;
  const base = 300;
  const foundationWidth = 160;

  const layers = [
    { y: 100, h: 50, fill: '#8a949b', label: 'Roof' },
    { y: 150, h: 100, fill: '#c9d3d9', label: 'Structure' },
    { y: 250, h: 50, fill: '#5d6a73', label: 'Foundation' },
  ];

  const ticks = [-80, -40, 0, 40, 80];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 500 400">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e9f2f6" />
            <stop offset="0.5" stopColor="#c9d3d9" />
            <stop offset="1" stopColor="#8a949b" />
          </linearGradient>
        </defs>

        <g transform={`rotate(${tilt}, ${cx}, ${base})`}>
          {layers.map((l) => (
            <rect key={l.label} x={cx - 60} y={l.y} width={120} height={l.h} fill={l.fill} stroke="#e9f2f6" strokeWidth={1} />
          ))}
          <line x1={cx} y1={200} x2={cx + cogOffset * 0.5} y2={320} stroke="#e0b44c" strokeWidth={4} strokeDasharray="8 4" />
          <circle cx={cx + cogOffset * 0.5} cy={320} r={6} fill="#d0523f" opacity={warningPulse} />
        </g>

        <line x1={cx - foundationWidth / 2} y1={base} x2={cx + foundationWidth / 2} y2={base} stroke="#e0b44c" strokeWidth={6} />
        
        {ticks.map((t) => (
          <g key={t}>
            <line x1={cx + t} y1={base} x2={cx + t} y2={base + 10} stroke="#e9f2f6" strokeWidth={2} />
            <text x={cx + t} y={base + 25} fill="#e9f2f6" fontSize={10} textAnchor="middle">{t > 0 ? '+' : ''}{t / 10}m</text>
          </g>
        ))}

        <text x={cx} y={80} fill="#e9f2f6" fontSize={14} textAnchor="middle" style={{ letterSpacing: 1 }}>
          {tilt > 15 ? 'CRITICAL TILT' : 'STABLE'}
        </text>
      </svg>

      {p.title ? (
        <div style={{ marginTop: 20, fontFamily: 'sans-serif', fontSize: 32, color: '#e9f2f6', fontWeight: 'bold' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};