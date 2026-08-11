import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const CenterOfGravityShiftScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const draw = interpolate(frame, [0, span * 0.2], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shift = interpolate(frame, [span * 0.3, span * 0.7], [0, 60], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pulse = interpolate(frame, [0, span], [0.8, 1.2], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { y: 200, h: 40, label: 'HULL', color: '#5d6a73' },
    { y: 160, h: 40, label: 'CARGO', color: '#8a949b' },
    { y: 120, h: 40, label: 'ACCOMMODATION', color: '#c9d3d9' },
  ];

  const axisTicks = [0, 50, 100, 150, 200];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 500 350">
        <defs>
          <linearGradient id="metal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#c9d3d9" />
            <stop offset="0.5" stopColor="#8a949b" />
            <stop offset="1" stopColor="#5d6a73" />
          </linearGradient>
        </defs>

        <rect x={150} y={120} width={200} height={120} fill="url(#metal)" opacity={0.2 * draw} />

        {layers.map((l, i) => (
          <g key={l.label}>
            <rect x={150} y={l.y} width={200} height={l.h} fill={l.color} opacity={draw} stroke="#e9f2f6" strokeWidth={1} />
            <text x={140} y={l.y + 25} fill="#e9f2f6" fontSize={12} textAnchor="end">{l.label}</text>
          </g>
        ))}

        <line x1={250} y1={240} x2={250} y2={80} stroke="#e9f2f6" strokeWidth={1} strokeDasharray="4 4" />

        <circle cx={250} cy={180} r={6 * pulse} fill="#c9d3d9" />
        <text x={265} y={185} fill="#c9d3d9" fontSize={12}>THEORETICAL COG</text>

        <circle cx={250} cy={180 - shift} r={6 * pulse} fill="#d0523f" />
        <text x={265} y={185 - shift} fill="#d0523f" fontSize={12}>ACTUAL COG</text>

        <line x1={250} y1={180} x2={250} y2={180 - shift} stroke="#e0b44c" strokeWidth={3} />

        {axisTicks.map((t) => (
          <g key={t}>
            <line x1={130} y1={240 - t} x2={140} y2={240 - t} stroke="#e9f2f6" strokeWidth={1} />
            <text x={125} y={244 - t} fill="#e9f2f6" fontSize={10} textAnchor="end">{t}m</text>
          </g>
        ))}

        <text x={250} y={320} fill="#e9f2f6" fontSize={24} textAnchor="middle" fontWeight="bold">
          {p.title}
        </text>
      </svg>
    </AbsoluteFill>
  );
};