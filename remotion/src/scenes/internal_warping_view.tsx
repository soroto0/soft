import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const InternalWarpingViewScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const warpTop = interpolate(frame, [0, span * 0.3, span * 0.7, span], [0, -40, 20, 0], {
    easing: Easing.bezier(0.45, 0.05, 0.55, 0.95),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const warpBottom = interpolate(frame, [0, span * 0.4, span * 0.8, span], [0, 50, -30, 0], {
    easing: Easing.bezier(0.45, 0.05, 0.55, 0.95),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pulse = interpolate(frame, [0, span * 0.5, span], [0.4, 1, 0.4], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  return (
    <AbsoluteFill style={{ background: '#07090c', opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="60%" viewBox="0 0 400 400">
        <path
          d={`M 100 100 C 150 ${100 + warpTop} 250 ${100 - warpTop} 300 100 L 300 300 C 250 ${300 - warpBottom} 150 ${300 + warpBottom} 100 300 Z`}
          fill="none"
          stroke="#e9f2f6"
          strokeWidth="3"
        />
        <circle cx="200" cy="120" r={10 + warpTop * 0.2} fill="#e0b44c" opacity={pulse} />
        <circle cx="200" cy="280" r={15 + warpBottom * 0.3} fill="#d0523f" opacity={pulse} />
        <line x1="100" y1="200" x2="300" y2="200" stroke="#e9f2f6" strokeWidth="1" strokeDasharray="4 4" />
      </svg>
      {p.title ? (
        <div style={{
          position: 'absolute',
          bottom: '10%',
          fontFamily: "'Courier New', monospace",
          fontSize: 32,
          color: '#e9f2f6',
          textTransform: 'uppercase',
          letterSpacing: '2px',
          borderTop: '1px solid #e0b44c',
          paddingTop: '10px'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};