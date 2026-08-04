import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ForceVectorFlowScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const drawLines = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const arrowProgress = interpolate(frame, [span * 0.3, span * 0.8], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const captionFade = interpolate(frame, [span * 0.6, span * 0.9], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const yPos = 100 + arrowProgress * 100;

  return (
    <AbsoluteFill style={{ background: '#07090c', opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 400">
        <line x1="50" y1="100" x2="350" y2="100" stroke="#e9f2f6" strokeWidth="4" strokeDasharray="300" strokeDashoffset={300 * (1 - drawLines)} />
        <line x1="50" y1="200" x2="350" y2="200" stroke="#e9f2f6" strokeWidth="4" strokeDasharray="300" strokeDashoffset={300 * (1 - drawLines)} />
        <line x1="200" y1="100" x2="200" y2={yPos} stroke="#e0b44c" strokeWidth="6" strokeLinecap="round" />
        <path d={`M 190 ${yPos} L 210 ${yPos} L 200 ${yPos + 15} Z`} fill="#d0523f" />
        <circle cx="200" cy="100" r="6" fill="#e0b44c" />
        <circle cx="200" cy={yPos} r="8" fill="#d0523f" />
      </svg>
      {p.title ? (
        <div style={{
          position: 'absolute',
          bottom: '15%',
          fontFamily: "'Segoe UI', Arial, sans-serif",
          fontSize: 42,
          fontWeight: 'bold',
          color: '#e0b44c',
          opacity: captionFade,
          textTransform: 'uppercase',
          letterSpacing: '0.1em'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};