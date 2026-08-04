import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const UnzippingFailureDiagramScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const totalFrames = Math.max(1, Math.round((p.dur || 6) * fps));

  const progress = interpolate(frame, [0, totalFrames], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const zipperY = interpolate(progress, [0, 0.8], [50, 350], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const peelWidth = interpolate(progress, [0.1, 0.9], [0, 80], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  return (
    <AbsoluteFill style={{ background: '#07090c', opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="60%" viewBox="0 0 400 400">
        <rect x="150" y="50" width="100" height="300" fill="#1a1f26" stroke="#e9f2f6" strokeWidth="2" />
        <line x1="200" y1="50" x2="200" y2={zipperY} stroke="#d0523f" strokeWidth="4" strokeDasharray="8 4" />
        <path d={`M 200 ${zipperY} Q ${200 + peelWidth} ${zipperY + 50}, ${200 + peelWidth * 0.5} ${zipperY + 100}`} 
              stroke="#e0b44c" strokeWidth="3" fill="none" />
        <path d={`M 200 ${zipperY} Q ${200 - peelWidth} ${zipperY + 50}, ${200 - peelWidth * 0.5} ${zipperY + 100}`} 
              stroke="#e0b44c" strokeWidth="3" fill="none" />
        <circle cx="200" cy={zipperY} r="6" fill="#d0523f" />
      </svg>
      {p.title ? (
        <div style={{
          position: 'absolute',
          bottom: '10%',
          fontFamily: "'Segoe UI', Arial, sans-serif",
          fontSize: 48,
          fontWeight: 'bold',
          color: '#d0523f',
          textTransform: 'uppercase',
          letterSpacing: '4px',
          textAlign: 'center',
          textShadow: '0 0 10px rgba(208, 82, 63, 0.5)'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};