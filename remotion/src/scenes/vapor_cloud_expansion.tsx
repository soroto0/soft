import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const VaporCloudExpansionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const ruptureProgress = interpolate(frame, [0, span * 0.2], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const cloudScale = interpolate(frame, [span * 0.2, span * 0.9], [0.1, 1], {
    easing: Easing.out(Easing.exp),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const cloudOpacity = interpolate(frame, [span * 0.2, span * 0.3, span * 0.8, span], [0, 0.8, 0.8, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" height="80%" viewBox="0 0 600 400">
        <rect x="100" y="100" width="400" height="200" fill="none" stroke="#e9f2f6" strokeWidth="2" />
        <rect x="250" y="200" width="100" height="100" fill="none" stroke="#d0523f" strokeWidth="4" />
        <line x1="300" y1="200" x2="300" y2={200 - (ruptureProgress * 50)} stroke="#d0523f" strokeWidth="6" strokeDasharray="4 4" />
        <circle cx="300" cy="200" r={cloudScale * 150} fill="#e0b44c" fillOpacity={cloudOpacity * 0.3} stroke="#e0b44c" strokeWidth="2" strokeDasharray="8 4" />
      </svg>
      {p.title ? (
        <div style={{
          position: 'absolute',
          bottom: '10%',
          fontFamily: "'Segoe UI', Arial, sans-serif",
          fontSize: 32,
          color: '#e9f2f6',
          letterSpacing: '0.1em',
          textTransform: 'uppercase'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};