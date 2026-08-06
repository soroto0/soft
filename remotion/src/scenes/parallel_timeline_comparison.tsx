import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ParallelTimelineComparisonScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const draw = interpolate(frame, [0, span * 0.5], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shift = interpolate(frame, [span * 0.2, span * 0.8], [0, 100], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pulse = interpolate(frame, [0, span], [0.5, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const data = [
    { label: 'Faraónico', y: 80, color: '#e0b44c', val: 800 },
    { label: 'Industrial', y: 180, color: '#d0523f', val: 200 },
  ];

  const ticks = [0, 1, 2, 3, 4];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 500 300">
        <defs>
          <linearGradient id="axisGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e0b44c" />
            <stop offset="0.5" stopColor="#e9f2f6" />
            <stop offset="1" stopColor="#d0523f" />
          </linearGradient>
        </defs>

        <text x={250} y={30} fill="#e9f2f6" fontSize={24} textAnchor="middle" style={{ fontFamily: 'sans-serif' }}>
          {p.title}
        </text>

        {data.map((row, i) => (
          <g key={row.label}>
            <text x={10} y={row.y + 5} fill="#e9f2f6" fontSize={12} textAnchor="end">{row.label}</text>
            <line x1={40} y1={row.y} x2={460} y2={row.y} stroke="#e9f2f6" strokeWidth={1} />
            <rect 
              x={40 + shift} 
              y={row.y - 15} 
              width={300 * draw} 
              height={30} 
              fill={row.color} 
              fillOpacity={0.6 * pulse}
            />
            <text x={40 + 300 * draw + shift + 10} y={row.y + 5} fill={row.color} fontSize={10}>
              {row.val} units
            </text>
          </g>
        ))}

        {ticks.map((t) => (
          <g key={t}>
            <line x1={40 + t * 75} y1={220} x2={40 + t * 75} y2={230} stroke="#e9f2f6" strokeWidth={1} />
            <text x={40 + t * 75} y={245} fill="#e9f2f6" fontSize={8} textAnchor="middle">
              {t * 500}y
            </text>
          </g>
        ))}

        <line x1={40} y1={220} x2={460} y2={220} stroke="url(#axisGrad)" strokeWidth={2} />
        
        <g transform="translate(40, 270)">
          <text x={0} y={0} fill="#e0b44c" fontSize={10}>ESTRUCTURA CENTRALIZADA</text>
          <text x={420} y={0} fill="#d0523f" fontSize={10} textAnchor="end">PRODUCCIÓN MASIVA</text>
        </g>
      </svg>
    </AbsoluteFill>
  );
};