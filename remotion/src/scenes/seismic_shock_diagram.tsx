import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const SeismicShockDiagramScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const waveProgress = interpolate(frame, [0, span * 0.8], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const conduitSnap = interpolate(frame, [span * 0.4, span * 0.7], [0, 1], {
    easing: Easing.out(Easing.back(2)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textFade = interpolate(frame, [0, span * 0.2], [0, 1], {
    easing: Easing.ease,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" height="80%" viewBox="0 0 600 400">
        <rect x="50" y="150" width="500" height="50" fill="#e9f2f6" fillOpacity="0.1" stroke="#e9f2f6" strokeWidth="2" />
        <line x1="50" y1="220" x2={50 + 500 * conduitSnap} y2="220" stroke="#e9f2f6" strokeWidth="4" strokeDasharray="10 10" />
        <line x1={50 + 250 * waveProgress} y1="140" x2={50 + 250 * waveProgress} y2="210" stroke="#d0523f" strokeWidth="6" />
        <path d={`M 250 220 L ${250 + 50 * conduitSnap} 250`} stroke="#e0b44c" strokeWidth="4" fill="none" />
        <path d={`M 350 220 L ${350 - 50 * conduitSnap} 250`} stroke="#e0b44c" strokeWidth="4" fill="none" />
      </svg>
      {p.title ? (
        <div style={{ 
          position: 'absolute', 
          bottom: '10%', 
          fontFamily: 'sans-serif', 
          fontSize: 32, 
          color: '#e9f2f6', 
          opacity: textFade,
          letterSpacing: '0.1em',
          textTransform: 'uppercase'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};