import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const PorePressureProcessScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const compression = interpolate(frame, [0, span], [0, 40], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const waterFlow = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pressureLabel = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;
  const plates = [0, 1, 2, 3];
  const waterDrops = [0, 1, 2, 3, 4, 5, 6, 7];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 300">
        <text x="200" y="30" fill="#e9f2f6" fontSize="18" textAnchor="middle" style={{ fontWeight: 'bold' }}>{p.title}</text>
        
        <rect x="100" y="50" width="200" height="20" fill="#d0523f" />
        <text x="200" y="40" fill="#d0523f" fontSize="12" textAnchor="middle">LOAD (1M BUSHELS)</text>

        {plates.map((i) => (
          <rect key={i} x="100" y={100 + i * (50 - compression / 3)} width="200" height="10" fill="#c9d3d9" />
        ))}

        {waterDrops.map((i) => (
          <circle key={i} cx={120 + (i * 30) + (waterFlow * 50)} cy={115 + (i % 3) * 40 - (compression / 2)} r={3 * pressureLabel} fill="#5b7f9c" />
        ))}

        <line x1="80" y1="100" x2="80" y2="250" stroke="#e9f2f6" strokeWidth="1" />
        <text x="70" y="175" fill="#e9f2f6" fontSize="10" textAnchor="end" transform="rotate(-90 70 175)">CLAY PLATES</text>
        
        <line x1="330" y1="100" x2="330" y2="250" stroke="#e0b44c" strokeWidth="2" />
        <text x="340" y="175" fill="#e0b44c" fontSize="10">PORE WATER</text>

        <path d={`M 330 150 L 360 150 L 360 ${150 + (waterFlow * 50)}`} fill="none" stroke="#e0b44c" strokeWidth="2" />
        <text x="365" y={150 + (waterFlow * 50)} fill="#e0b44c" fontSize="10">ESCAPE</text>
      </svg>
    </AbsoluteFill>
  );
};