import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const LoadDistributionDiagramScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const pressureRise = interpolate(frame, [0, span * 0.8], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const stampScale = interpolate(frame, [0, span * 0.2], [2, 1], {
    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const stampOpacity = interpolate(frame, [0, span * 0.2], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { id: 0, label: 'CORE', color: '#8a949b', y: 50 },
    { id: 1, label: 'REINFORCEMENT', color: '#5d6a73', y: 90 },
    { id: 2, label: 'CONCRETE', color: '#c9d3d9', y: 130 },
  ];

  const ticks = [0, 25, 50, 75, 100];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 500 400">
        <defs>
          <linearGradient id="pressureGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d0523f" />
            <stop offset="50%" stopColor="#e0b44c" />
            <stop offset="100%" stopColor="#e9f2f6" />
          </linearGradient>
        </defs>

        <g transform="translate(100, 50)">
          <text x="150" y="-20" fill="#e9f2f6" fontSize="16" textAnchor="middle" fontWeight="bold">Pfeilerbelastung vs. Zertifizierung</text>
          <rect x="0" y="0" width="300" height="200" fill="#1a1f22" stroke="#e9f2f6" strokeWidth="2" />
          {layers.map((l) => (
            <g key={l.label}>
              <rect x="20" y={l.y} width="260" height="30" fill={l.color} opacity="0.4" />
              <text x="25" y={l.y + 20} fill="#e9f2f6" fontSize="10">{l.label}</text>
            </g>
          ))}
          
          <rect x="20" y="50" width="260" height={100 * pressureRise} fill="url(#pressureGrad)" opacity="0.7" />
          
          <text x="310" y="50" fill="#d0523f" fontSize="12">MAX</text>
          <text x="310" y="150" fill="#e9f2f6" fontSize="12">MIN</text>
        </g>

        <g transform="translate(100, 300)">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={t * 2.6} y1="0" x2={t * 2.6} y2="10" stroke="#e9f2f6" strokeWidth="1" />
              <text x={t * 2.6} y="25" fill="#e9f2f6" fontSize="8" textAnchor="middle">{t}</text>
            </g>
          ))}
          <text x="130" y="45" fill="#e9f2f6" fontSize="10" textAnchor="middle">Zeitverlauf (Tage)</text>
        </g>

        <g transform={`translate(250, 150) scale(${stampScale})`} opacity={stampOpacity}>
          <rect x="-70" y="-25" width="140" height="50" fill="none" stroke="#d0523f" strokeWidth="4" transform="rotate(-15)" />
          <text x="0" y="10" fill="#d0523f" fontSize="24" fontWeight="bold" textAnchor="middle" transform="rotate(-15)">ZERTIFIZIERT</text>
        </g>
      </svg>
    </AbsoluteFill>
  );
};