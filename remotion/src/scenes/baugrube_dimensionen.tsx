import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const BaugrubeDimensionenScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const progress = interpolate(frame, [0, span * 0.5], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const dimensionLine = interpolate(frame, [span * 0.3, span * 0.8], [0, 1], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [span * 0.6, span * 0.9], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { y: 0, h: 40, label: 'Humus', color: '#8a949b' },
    { y: 40, h: 80, label: 'Lehm', color: '#5d6a73' },
    { y: 120, h: 100, label: 'Kies', color: '#3d4a53' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 500 300">
        <defs>
          <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="#e9f2f6" strokeWidth="0.5" />
          </pattern>
        </defs>

        {layers.map((l, i) => (
          <g key={l.label}>
            <rect x={150} y={l.y} width={300} height={l.h} fill={l.color} stroke="#e9f2f6" strokeWidth={0.5} />
            <text x={140} y={l.y + l.h / 2 + 4} fill="#e9f2f6" fontSize={12} textAnchor="end">{l.label}</text>
            <line x1={150} y1={l.y} x2={450} y2={l.y} stroke="#e9f2f6" strokeWidth={0.5} />
          </g>
        ))}

        <rect x={150} y={0} width={100} height={120 * progress} fill="#000" fillOpacity={0.6} />
        <rect x={150} y={0} width={100} height={120 * progress} fill="url(#hatch)" />

        <line x1={130} y1={0} x2={130} y2={120 * dimensionLine} stroke="#e0b44c" strokeWidth={2} />
        <line x1={120} y1={0} x2={140} y2={0} stroke="#e0b44c" strokeWidth={2} />
        <line x1={120} y1={120 * dimensionLine} x2={140} y2={120 * dimensionLine} stroke="#e0b44c" strokeWidth={2} />
        
        <text x={110} y={60 * dimensionLine} fill="#e0b44c" fontSize={14} textAnchor="end" dominantBaseline="middle" opacity={labelFade}>
          4,6 m
        </text>

        <text x={250} y={280} fill="#e9f2f6" fontSize={20} textAnchor="middle" style={{ fontWeight: 'bold' }}>
          {p.title}
        </text>
      </svg>
    </AbsoluteFill>
  );
};