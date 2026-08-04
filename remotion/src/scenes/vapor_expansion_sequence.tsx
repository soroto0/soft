import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const VaporExpansionSequenceScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const crack = interpolate(frame, [0, span * 0.2], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const cloudScale = interpolate(frame, [span * 0.2, span * 0.8], [0.1, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const cloudOpacity = interpolate(frame, [span * 0.2, span * 0.3], [0, 0.6], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" height="80%" viewBox="0 0 400 400">
        <rect x="50" y="50" width="300" height="300" fill="none" stroke="#e9f2f6" strokeWidth="2" strokeDasharray="4 4" />
        <rect x="150" y="150" width="100" height="100" fill="none" stroke="#d0523f" strokeWidth={3 + (crack * 2)} />
        <line x1="200" y1="150" x2="200" y2={150 - (crack * 20)} stroke="#d0523f" strokeWidth="4" />
        <circle cx="200" cy="200" r={100 * cloudScale} fill="#e0b44c" opacity={cloudOpacity} />
        <text x="200" y="380" textAnchor="middle" fill="#e9f2f6" style={{ fontSize: 24, fontFamily: 'sans-serif' }}>
          {p.title}
        </text>
      </svg>
    </AbsoluteFill>
  );
};