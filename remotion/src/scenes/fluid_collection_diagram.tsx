import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const FluidCollectionDiagramScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const fluidScale = interpolate(frame, [0, span * 0.7], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const corrosionGlow = interpolate(frame, [span * 0.4, span], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textFloat = interpolate(frame, [0, span], [10, -10], {
    easing: Easing.inOut(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="60%" viewBox="0 0 400 300">
        <rect x="50" y="50" width="300" height="200" fill="none" stroke="#e9f2f6" strokeWidth="2" />
        <rect x="80" y="80" width="240" height="140" fill="none" stroke="#e9f2f6" strokeDasharray="8 4" strokeWidth="1" />
        <path 
          d={`M 80 220 L 320 220 L 320 ${220 - (fluidScale * 60)} Q 200 ${220 - (fluidScale * 80)} 80 ${220 - (fluidScale * 60)} Z`}
          fill="#d0523f"
          fillOpacity={0.6 * fluidScale}
        />
        <text x="200" y="40" textAnchor="middle" fill="#e9f2f6" fontSize="16" fontFamily="sans-serif">
          Outer Jacketing
        </text>
        <text x="200" y="260" textAnchor="middle" fill="#e0b44c" fontSize="14" fontFamily="sans-serif" opacity={corrosionGlow}>
          Corrosive Condensate Pocket
        </text>
      </svg>
      {p.title ? (
        <div style={{ 
          marginTop: 40, 
          transform: `translateY(${textFloat}px)`,
          fontFamily: "'Segoe UI', Arial, sans-serif",
          fontSize: 28, 
          color: '#e9f2f6',
          textAlign: 'center'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};