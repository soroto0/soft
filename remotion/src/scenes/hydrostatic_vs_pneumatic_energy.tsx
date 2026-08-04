import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const HydrostaticVsPneumaticEnergyScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const rupture = interpolate(frame, [span * 0.3, span * 0.4], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const springCompression = interpolate(frame, [0, span * 0.3], [1, 0.4], {
    easing: Easing.in(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const explosion = interpolate(frame, [span * 0.4, span * 0.7], [0, 1], {
    easing: Easing.out(Easing.back(2)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" height="80%" viewBox="0 0 800 400">
        <text x="400" y="50" fill="#e9f2f6" fontSize="32" textAnchor="middle" fontFamily="sans-serif">{p.title}</text>
        
        <g transform="translate(200, 200)">
          <rect x="-40" y="-60" width="80" height="120" fill="none" stroke="#e9f2f6" strokeWidth="3" />
          <rect x="-35" y="-55" width="70" height={110 * (1 - rupture * 0.1)} fill="#e9f2f6" opacity="0.3" />
          <text x="0" y="100" fill="#e9f2f6" fontSize="16" textAnchor="middle">Hydrostatic</text>
        </g>

        <g transform="translate(600, 200)">
          <rect x="-40" y="-60" width="80" height="120" fill="none" stroke="#e0b44c" strokeWidth="3" />
          <rect x="-35" y="-55" width="70" height={110 * springCompression} fill="#e0b44c" />
          <circle cx="0" cy="0" r={20 * explosion} fill="#d0523f" opacity={explosion} />
          <text x="0" y="100" fill="#e0b44c" fontSize="16" textAnchor="middle">Pneumatic</text>
        </g>
      </svg>
    </AbsoluteFill>
  );
};