import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const SteamJacketHeatingScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationInFrames = Math.max(1, Math.round((p.dur || 6) * fps));

  const steamFlow = interpolate(frame, [0, durationInFrames], [0, 100], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const heatGradient = interpolate(frame, [0, durationInFrames], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const structureFade = interpolate(frame, [durationInFrames * 0.3, durationInFrames], [1, 0.4], {
    easing: Easing.in(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  return (
    <AbsoluteFill style={{ background: '#07090c', opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" height="80%" viewBox="0 0 400 200">
        <rect x="50" y="50" width="300" height="100" fill="#2a2d32" stroke="#e9f2f6" strokeWidth="2" />
        <rect x="50" y="50" width="300" height="20" fill="#e0b44c" fillOpacity={0.3 + (heatGradient * 0.5)} />
        <g stroke="#e0b44c" strokeWidth="2" strokeDasharray="10 10">
          <line x1={50 - steamFlow} y1="60" x2={350 - steamFlow} y2="60" />
        </g>
        <g opacity={structureFade}>
          {[...Array(10)].map((_, i) => (
            <circle key={i} cx={70 + i * 28} cy={100} r={2} fill="#e9f2f6" />
          ))}
        </g>
        <text x="200" y="180" fill="#d0523f" fontSize="12" textAnchor="middle" fontFamily="sans-serif">
          {p.title || 'Thermal Degradation of Steel'}
        </text>
      </svg>
    </AbsoluteFill>
  );
};