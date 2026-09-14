import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const HydrolysisZoomScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const bondBreak = interpolate(frame, [span * 0.2, span * 0.8], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const waterEntry = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const decay = interpolate(frame, [span * 0.5, span * 0.9], [1, 0], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { y: 50, label: 'Holzschicht A', color: '#e9f2f6' },
    { y: 110, label: 'Leimfuge (Harnstoff)', color: '#e0b44c' },
    { y: 170, label: 'Holzschicht B', color: '#e9f2f6' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 500 300">
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#5b7f9c" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#d0523f" />
          </linearGradient>
        </defs>

        {layers.map((l, i) => (
          <g key={i}>
            <rect x={50} y={l.y} width={400} height={40} fill={l.color} opacity={0.1} />
            <text x={55} y={l.y + 25} fill={l.color} fontSize={12} opacity={0.6}>{l.label}</text>
          </g>
        ))}

        <rect x={50 + (1 - waterEntry) * 400} y={110} width={waterEntry * 400} height={40} fill="url(#grad)" opacity={0.6} />

        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i} transform={`translate(${100 + i * 70}, 130)`}>
            <circle r={8 * decay} fill="#e0b44c" stroke="#e9f2f6" strokeWidth={2} />
            <line x1={-12} y1={-12} x2={12} y2={12} stroke="#d0523f" strokeWidth={3} opacity={bondBreak} />
            <line x1={12} y1={-12} x2={-12} y2={12} stroke="#d0523f" strokeWidth={3} opacity={bondBreak} />
          </g>
        ))}

        <line x1={50} y={240} x2={450} y2={240} stroke="#e9f2f6" strokeWidth={1} />
        <text x={50} y={260} fill="#e9f2f6" fontSize={10}>Intakt</text>
        <text x={450} y={260} fill="#d0523f" fontSize={10} textAnchor="end">Hydrolysiert</text>
        
        <text x={250} y={30} fill="#e9f2f6" fontSize={20} textAnchor="middle" fontWeight="bold">
          {p.title}
        </text>
      </svg>
    </AbsoluteFill>
  );
};