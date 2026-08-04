import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const FracturePropagationAnimationScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const crackProgress = interpolate(frame, [0, span * 0.8], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pressureRelease = interpolate(frame, [span * 0.2, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleRise = interpolate(frame, [0, span * 0.2], [40, 0], {
    easing: Easing.out(Easing.back()),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 800 400">
        <rect x="100" y="150" width="600" height="100" fill="none" stroke="#e9f2f6" strokeWidth="2" />
        <line x1="100" y1="200" x2="700" y2="200" stroke="#e9f2f6" strokeWidth="4" strokeDasharray="10 10" />
        <path
          d={`M 100 200 L ${100 + 600 * crackProgress} 200 L ${100 + 600 * crackProgress - 20} 180 L ${100 + 600 * crackProgress + 10} 220 L ${100 + 600 * crackProgress} 200`}
          fill="none"
          stroke="#d0523f"
          strokeWidth="6"
        />
        <circle cx={100 + 600 * crackProgress} cy="200" r={20 * pressureRelease} fill="none" stroke="#e0b44c" strokeWidth="2" opacity={1 - pressureRelease} />
      </svg>
      {p.title ? (
        <div style={{
          position: 'absolute',
          bottom: '10%',
          transform: `translateY(${titleRise}px)`,
          fontFamily: "'Helvetica Neue', Arial, sans-serif",
          fontSize: 48,
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