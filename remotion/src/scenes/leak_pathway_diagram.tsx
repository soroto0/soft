import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const LeakPathwayDiagramScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const leakProgress = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const bulgeScale = interpolate(frame, [span * 0.3, span * 0.8], [0, 1], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pulse = interpolate(frame, [span * 0.5, span], [0.4, 0.8], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" height="80%" viewBox="0 0 400 400">
        <rect x="150" y="100" width="100" height="200" fill="none" stroke="#e9f2f6" strokeWidth="4" />
        <rect x="140" y="90" width="120" height="220" fill="none" stroke="#e9f2f6" strokeWidth="2" strokeDasharray="8 8" />
        
        <line x1="200" y1="150" x2="250" y2="150" stroke="#d0523f" strokeWidth="4" 
              strokeDasharray="100" strokeDashoffset={100 * (1 - leakProgress)} />
        
        <path d={`M 250 150 Q 300 150 300 ${150 + 30 * bulgeScale} Q 300 ${150 + 60 * bulgeScale} 250 ${150 + 60 * bulgeScale} Z`} 
              fill="#d0523f" fillOpacity={pulse} stroke="#d0523f" strokeWidth="2" />
        
        <circle cx="200" cy="200" r="5" fill="#e9f2f6" />
      </svg>
      {p.title ? (
        <div style={{ 
          position: 'absolute', 
          bottom: '10%', 
          fontFamily: "'Segoe UI', Arial, sans-serif", 
          fontSize: 32, 
          color: '#e0b44c',
          textTransform: 'uppercase',
          letterSpacing: '2px'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};