import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const EnergyComparisonGraphScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const barGrowth = interpolate(frame, [0, span * 0.7], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [span * 0.5, span * 0.8], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const lineShift = interpolate(frame, [0, span], [0, 20], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;
  const gasHeight = barGrowth * 300;
  const waterHeight = barGrowth * (300 / 44);

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ width: '80%', height: '80%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#e9f2f6', fontSize: 48, marginBottom: 60, fontFamily: 'sans-serif', fontWeight: 100, letterSpacing: '0.05em' }}>
          {p.title}
        </div>
        <svg viewBox="0 0 600 400" style={{ width: '100%', height: '100%' }}>
          <line x1="100" y1="350" x2="500" y2="350" stroke="#e9f2f6" strokeWidth="2" strokeDasharray="4 4" />
          
          <rect x="180" y={350 - waterHeight} width="60" height={waterHeight} fill="#d0523f" />
          <text x="210" y="380" fill="#e9f2f6" textAnchor="middle" fontSize="16" fontFamily="sans-serif">Water</text>
          
          <rect x="360" y={350 - gasHeight} width="60" height={gasHeight} fill="#e0b44c" />
          <text x="390" y="380" fill="#e9f2f6" textAnchor="middle" fontSize="16" fontFamily="sans-serif">Gas</text>
          
          <line x1="390" y1={340 - gasHeight - lineShift} x2="390" y2={340 - gasHeight - lineShift - 40} stroke="#e0b44c" strokeWidth="2" opacity={labelFade} />
          <text x="390" y={340 - gasHeight - lineShift - 50} fill="#e0b44c" textAnchor="middle" fontSize="24" fontWeight="bold" opacity={labelFade} fontFamily="sans-serif">
            44x
          </text>
        </svg>
        <div style={{ marginTop: 20, color: '#e9f2f6', fontSize: 22, opacity: labelFade, fontFamily: 'sans-serif', textAlign: 'center' }}>
          Stored Kinetic Energy
        </div>
      </div>
    </AbsoluteFill>
  );
};