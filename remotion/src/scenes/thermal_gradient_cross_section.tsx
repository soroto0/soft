import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ThermalGradientCrossSectionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const heatSpread = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const strengthDrop = interpolate(frame, [span * 0.3, span], [100, 40], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const glow = interpolate(frame, [0, span * 0.5, span], [0.3, 1, 0.6], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  return (
    <AbsoluteFill style={{ background: '#07090c', opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 600 400">
        <rect x={100} y={100} width={400} height={100} fill="#2a3038" stroke="#e9f2f6" strokeWidth={2} />
        <rect x={100} y={100} width={400 * heatSpread} height={100} fill="#d0523f" opacity={glow} />
        <circle cx={150} cy={150} r={15} fill="#e0b44c" />
        <text x={300} y={250} fill="#e9f2f6" fontSize={20} textAnchor="middle" fontFamily="sans-serif">
          Yield Strength: {Math.round(strengthDrop)} MPa
        </text>
        <path d={`M 100 300 L 500 300 L 500 ${300 - strengthDrop}`} fill="none" stroke="#e0b44c" strokeWidth={3} />
      </svg>
      {p.title ? (
        <div style={{ position: 'absolute', top: '10%', color: '#e9f2f6', fontSize: 48, fontFamily: 'sans-serif', fontWeight: 'bold' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};