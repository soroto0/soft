import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const SafetyFactorGaugeScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const needleRotation = interpolate(frame, [span * 0.2, span * 0.8], [-45, 135], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const needleColor = interpolate(frame, [span * 0.5, span * 0.6], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  }) > 0.5 ? '#d0523f' : '#e0b44c';

  const scaleOpacity = interpolate(frame, [0, span * 0.3], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="60%" viewBox="0 0 400 250" style={{ opacity: scaleOpacity }}>
        <path d="M 50 200 A 150 150 0 0 1 350 200" fill="none" stroke="#e9f2f6" strokeWidth="2" />
        <path d="M 50 200 A 150 150 0 0 1 150 60" fill="none" stroke="#e0b44c" strokeWidth="10" />
        <path d="M 150 60 A 150 150 0 0 1 350 200" fill="none" stroke="#d0523f" strokeWidth="10" />
        <g transform={`rotate(${needleRotation} 200 200)`}>
          <line x1="200" y1="200" x2="200" y2="80" stroke={needleColor} strokeWidth="4" strokeLinecap="round" />
          <circle cx="200" cy="200" r="6" fill={needleColor} />
        </g>
      </svg>
      {p.title ? (
        <div style={{ 
          marginTop: 40, 
          fontFamily: "'Segoe UI', Arial, sans-serif", 
          fontSize: 42, 
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