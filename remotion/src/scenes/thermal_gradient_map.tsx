import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ThermalGradientMapScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const heatProgress = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const glow = interpolate(frame, [0, span * 0.8], [0.3, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textShift = interpolate(frame, [0, span], [10, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const redIntensity = Math.floor(128 + (127 * heatProgress));
  const blueIntensity = Math.floor(200 - (200 * heatProgress));
  const color = `rgb(${redIntensity}, 82, ${blueIntensity})`;

  const opacity = p.enter * p.exit;

  return (
    <AbsoluteFill style={{ background: '#07090c', opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="60%" viewBox="0 0 400 200">
        <rect x="50" y="50" width="300" height="100" fill="none" stroke="#e9f2f6" strokeWidth="2" />
        <rect x="55" y="55" width="290" height="90" fill={color} fillOpacity={glow} />
        <text x="200" y="40" fill="#e9f2f6" fontSize="16" textAnchor="middle" letterSpacing="1px">
          STEAM JACKET CROSS-SECTION
        </text>
        <line x1="50" y1="160" x2="350" y2="160" stroke="#e0b44c" strokeWidth="2" strokeDasharray="4 4" />
      </svg>
      {p.title ? (
        <div style={{ 
          marginTop: 40, 
          transform: `translateY(${textShift}px)`,
          fontFamily: "'Segoe UI', Arial, sans-serif", 
          fontSize: 32, 
          color: '#e9f2f6',
          letterSpacing: '2px',
          textTransform: 'uppercase'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};