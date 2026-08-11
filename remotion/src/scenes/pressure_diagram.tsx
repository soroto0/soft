import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const PressureDiagramScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const progress = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const wallOffset = interpolate(progress, [0, 1], [0, 120], {
    easing: Easing.bezier(0.4, 0, 0.2, 1),
  });

  const forceMagnitude = interpolate(progress, [0, 1], [1, 3], {
    easing: Easing.in(Easing.quad),
  });

  const wallLayers = [
    { id: 0, color: '#5d6a73', label: 'Outer Stone' },
    { id: 1, color: '#8a949b', label: 'Inner Masonry' },
    { id: 2, color: '#c9d3d9', label: 'Structural Core' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 500 300">
        <defs>
          <linearGradient id="pressureGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d0523f" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#5b7f9c" />
          </linearGradient>
        </defs>

        {wallLayers.map((layer, i) => (
          <g key={layer.id}>
            <rect x={20 + wallOffset + (i * 15)} y={20 + (i * 15)} width={460 - 2 * wallOffset - (2 * i * 15)} height={260 - (2 * i * 15)} fill="none" stroke={layer.color} strokeWidth={2} />
            <text x={30 + wallOffset + (i * 15)} y={35 + (i * 15)} fill={layer.color} fontSize={10}>{layer.label}</text>
          </g>
        ))}

        <circle cx={250} cy={150} r={10 * (1 - progress * 0.8)} fill="url(#pressureGrad)" />

        {[0, 1, 2, 3].map((i) => {
          const angle = (i * Math.PI) / 2;
          const x1 = 250 + Math.cos(angle) * 140;
          const y1 = 150 + Math.sin(angle) * 120;
          const x2 = 250 + Math.cos(angle) * 20;
          const y2 = 150 + Math.sin(angle) * 20;
          return (
            <g key={i}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#d0523f" strokeWidth={forceMagnitude} />
              <polygon points={`${x2},${y2} ${x2 + Math.cos(angle + 0.5) * 10},${y2 + Math.sin(angle + 0.5) * 10} ${x2 + Math.cos(angle - 0.5) * 10},${y2 + Math.sin(angle - 0.5) * 10}`} fill="#d0523f" />
              <text x={x1 + (x1 > 250 ? 10 : -40)} y={y1} fill="#e9f2f6" fontSize={10}>{Math.round(forceMagnitude * 100)} kPa</text>
            </g>
          );
        })}
      </svg>

      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: 'sans-serif', fontSize: 32, color: '#e9f2f6', textAlign: 'center' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};