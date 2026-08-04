import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ComparisonDiagramScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const draw = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const gap = interpolate(frame, [span * 0.4, span * 0.8], [0, 40], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shift = interpolate(frame, [span * 0.4, span * 0.8], [0, 20], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" height="80%" viewBox="0 0 800 400">
        <text x="200" y="100" fill="#e9f2f6" fontSize="28" textAnchor="middle" style={{ fontFamily: 'sans-serif', letterSpacing: '1px' }}>Single Rod</text>
        <line x1="75" y1="200" x2={75 + 250 * draw} y2="200" stroke="#d0523f" strokeWidth="10" strokeLinecap="round" />
        
        <text x="600" y="100" fill="#e0b44c" fontSize="28" textAnchor="middle" style={{ fontFamily: 'sans-serif', letterSpacing: '1px' }}>Two Rods</text>
        <line x1="475" y1="200" x2={475 + (125 - shift) * draw} y2="200" stroke="#e0b44c" strokeWidth="10" strokeLinecap="round" />
        <line x1={625 + shift} y1="200" x2={625 + shift + (125 - shift) * draw} y2="200" stroke="#e0b44c" strokeWidth="10" strokeLinecap="round" />
        
        <line x1="550" y1="190" x2="550" y2="210" stroke="#e9f2f6" strokeWidth="2" strokeDasharray="4 4" opacity={gap / 40} />
      </svg>
      {p.title ? (
        <div style={{ 
          position: 'absolute',
          bottom: '10%',
          fontFamily: "'Segoe UI', Arial, sans-serif", 
          fontSize: 48, 
          color: '#e9f2f6',
          textAlign: 'center',
          fontWeight: 200
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};