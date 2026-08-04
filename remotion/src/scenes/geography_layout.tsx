import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const GeographyLayoutScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const draw = interpolate(frame, [0, span * 0.7], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const highlight = interpolate(frame, [span * 0.3, span * 0.8], [0, 1], {
    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [span * 0.1, span * 0.4], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" height="80%" viewBox="0 0 400 400">
        <rect x="50" y="50" width="300" height="300" fill="none" stroke="#e9f2f6" strokeWidth={2} strokeDasharray="1200" strokeDashoffset={1200 * (1 - draw)} />
        <rect x="120" y="120" width="160" height="160" fill="#1a2026" stroke="#e9f2f6" strokeWidth={1} />
        <line x1="50" y1="200" x2="120" y2="200" stroke="#e9f2f6" strokeWidth={4} strokeDasharray="70" strokeDashoffset={70 * (1 - draw)} />
        <line x1="280" y1="200" x2="350" y2="200" stroke="#e9f2f6" strokeWidth={4} strokeDasharray="70" strokeDashoffset={70 * (1 - draw)} />
        <rect x="120" y="120" width="160" height="160" fill="#d0523f" fillOpacity={highlight * 0.6} stroke="none" />
        <text x="200" y="380" fill="#e0b44c" fontSize="20" textAnchor="middle" style={{ opacity: labelFade, fontFamily: 'sans-serif' }}>
          {p.title}
        </text>
      </svg>
    </AbsoluteFill>
  );
};