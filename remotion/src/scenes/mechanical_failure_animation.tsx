import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const MechanicalFailureAnimationScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const pullDepth = interpolate(frame, [0, span], [0, 150], {
    easing: Easing.in(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const tearWidth = interpolate(frame, [0, span], [40, 120], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const stressColor = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;
  const dangerColor = `rgb(208, 82, ${63 + stressColor * 100})`;

  return (
    <AbsoluteFill style={{ background: '#07090c', opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 400 300">
        <rect x="50" y="140" width="300" height="20" fill="#e9f2f6" />
        <path
          d={`M ${200 - tearWidth / 2} 140 Q 200 ${140 + pullDepth} ${200 + tearWidth / 2} 140`}
          fill="none"
          stroke={dangerColor}
          strokeWidth={4}
        />
        <rect x="170" y={100 + pullDepth} width="60" height="40" fill="#e0b44c" />
        <line x1="170" y1={140 + pullDepth} x2="230" y2={140 + pullDepth} stroke="#e9f2f6" strokeWidth={2} />
      </svg>
      {p.title ? (
        <div style={{
          position: 'absolute',
          top: '10%',
          fontFamily: "'Segoe UI', Arial, sans-serif",
          fontSize: 32,
          color: '#e9f2f6',
          letterSpacing: '0.05em',
          textTransform: 'uppercase'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};