import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const AsymmetrischeErdmassenScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const moundGrowth = interpolate(frame, [0, span * 0.6], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const loadIntensity = interpolate(frame, [span * 0.3, span * 0.8], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const arrowShift = interpolate(frame, [0, span], [0, 5], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const buildingWidth = 120;
  const centerX = 210;
  const baseY = 180;

  const layers = [
    { id: 0, y: baseY, h: 10, color: '#8a949b' },
    { id: 1, y: baseY - 40, h: 30, color: '#c9d3d9' },
    { id: 2, y: baseY - 70, h: 30, color: '#c9d3d9' },
  ];

  const loadArrows = [0, 1, 2, 3];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 420 250">
        <defs>
          <linearGradient id="earth" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d0523f" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#8a949b" />
          </linearGradient>
        </defs>

        {layers.map((l) => (
          <rect key={l.id} x={centerX - buildingWidth / 2} y={l.y - l.h} width={buildingWidth} height={l.h} fill={l.color} stroke="#e9f2f6" strokeWidth={0.5} />
        ))}

        <polygon points={`${centerX + buildingWidth / 2},${baseY} ${centerX + buildingWidth / 2 + 100 * moundGrowth},${baseY} ${centerX + buildingWidth / 2 + 50 * moundGrowth},${baseY - 60 * moundGrowth}`} fill="url(#earth)" opacity={0.8 * moundGrowth} />

        <line x1={centerX + buildingWidth / 2 + 20} y1={baseY - 65 * moundGrowth} x2={centerX + buildingWidth / 2 + 80 * moundGrowth} y2={baseY - 65 * moundGrowth} stroke="#e9f2f6" strokeWidth={1} strokeDasharray="2 2" />
        <text x={centerX + buildingWidth / 2 + 50} y={baseY - 70 * moundGrowth} fill="#e9f2f6" fontSize={8} textAnchor="middle">10m</text>

        {loadArrows.map((i) => (
          <g key={i} opacity={loadIntensity}>
            <line x1={centerX + buildingWidth / 2 + 20 + i * 20} y1={baseY - 50 * moundGrowth + arrowShift} x2={centerX + buildingWidth / 2 + 20 + i * 20} y2={baseY + 10} stroke="#d0523f" strokeWidth={2} />
            <polygon points={`${centerX + buildingWidth / 2 + 15 + i * 20},${baseY} ${centerX + buildingWidth / 2 + 25 + i * 20},${baseY} ${centerX + buildingWidth / 2 + 20 + i * 20},${baseY + 8}`} fill="#d0523f" />
          </g>
        ))}
        
        <text x={210} y={240} fill="#e9f2f6" fontSize={16} textAnchor="middle" fontWeight="bold">Asymmetrische Erdbelastung</text>
      </svg>
    </AbsoluteFill>
  );
};