import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const DiaphragmTransmitterOperationScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const progress = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.inOut(Easing.ease),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const flex = interpolate(progress, [0, 1], [0, 20], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const current = interpolate(progress, [0, 1], [4, 20], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const glow = interpolate(progress, [0, 1], [0.5, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" height="80%" viewBox="0 0 800 400">
        <text x="400" y="380" textAnchor="middle" fill="#e9f2f6" style={{ fontSize: 28, fontFamily: 'sans-serif', letterSpacing: '2px' }}>
          {p.title}
        </text>
        
        <line x1="100" y1="200" x2="300" y2="200" stroke="#e9f2f6" strokeWidth="3" />
        <path d={`M 300 100 Q ${400 + flex} 200 300 300`} fill="none" stroke="#d0523f" strokeWidth="6" />
        
        <rect x="450" y="100" width="250" height="200" rx="10" fill="none" stroke="#e9f2f6" strokeWidth="2" />
        
        <text x="575" y="180" textAnchor="middle" fill="#e0b44c" style={{ fontSize: 48, fontWeight: 'bold', fontFamily: 'monospace' }} opacity={glow}>
          {current.toFixed(1)} mA
        </text>
        
        <path d={`M 700 200 L 750 200`} stroke="#e0b44c" strokeWidth="4" strokeDasharray="10 5" />
        
        <circle cx="300" cy="200" r="8" fill="#e9f2f6" />
        <circle cx="750" cy="200" r="12" fill="#e0b44c" opacity={glow} />
      </svg>
    </AbsoluteFill>
  );
};