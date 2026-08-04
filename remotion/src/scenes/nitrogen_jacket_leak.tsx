import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const NitrogenJacketLeakScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const leakProgress = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pressureScale = interpolate(frame, [span * 0.2, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const sensorPulse = interpolate(frame, [0, span * 0.5, span], [0.5, 1, 0.5], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="60%" viewBox="0 0 400 400">
        <rect x="150" y="100" width="100" height="200" fill="none" stroke="#e9f2f6" strokeWidth="4" />
        <rect x="130" y="80" width="140" height="240" fill="none" stroke="#e9f2f6" strokeWidth="2" strokeDasharray="4 4" />
        <path d="M 200 150 L 250 150" stroke="#d0523f" strokeWidth="4" strokeDasharray="10 5" strokeDashoffset={-leakProgress * 20} />
        <circle cx="270" cy="200" r={20 * pressureScale} fill="#d0523f" opacity={0.6 * pressureScale} />
        <rect x="180" y="110" width="40" height="10" fill="#e0b44c" opacity={sensorPulse} />
        <text x="200" y="360" fill="#e9f2f6" fontSize="24" textAnchor="middle" fontFamily="sans-serif">
          {p.title}
        </text>
      </svg>
    </AbsoluteFill>
  );
};