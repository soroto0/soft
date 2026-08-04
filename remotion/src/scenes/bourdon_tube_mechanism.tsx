import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const BourdonTubeMechanismScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const pressure = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.bezier(0.4, 0, 0.2, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const tubePath = interpolate(pressure, [0, 1], [0, 15], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const needleRotation = interpolate(pressure, [0, 1], [-45, 135], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  return (
    <AbsoluteFill style={{ background: '#07090c', opacity, justifyContent: 'center', alignItems: 'center', color: '#e9f2f6', fontFamily: 'sans-serif' }}>
      <svg width="60%" viewBox="0 0 400 400">
        <circle cx="200" cy="200" r="150" fill="none" stroke="#e9f2f6" strokeWidth="2" />
        <path d={`M 150 200 A 50 50 0 0 1 ${200 + tubePath} 150`} fill="none" stroke="#e0b44c" strokeWidth="8" strokeLinecap="round" />
        <line x1="200" y1="200" x2="200" y2="100" stroke="#d0523f" strokeWidth="4" style={{ transformOrigin: '200px 200px', transform: `rotate(${needleRotation}deg)` }} />
        <circle cx="200" cy="200" r="6" fill="#d0523f" />
        <text x="200" y="380" textAnchor="middle" fill="#e9f2f6" fontSize="20" letterSpacing="1">{p.title || "Bourdon Tube Pressure Gauge"}</text>
      </svg>
    </AbsoluteFill>
  );
};