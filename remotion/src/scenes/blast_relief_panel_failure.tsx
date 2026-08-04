import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const BlastReliefPanelFailureScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const totalFrames = Math.max(1, Math.round((p.dur || 6) * fps));

  const zoom = interpolate(frame, [0, totalFrames], [1, 1.8], {
    easing: Easing.bezier(0.4, 0, 0.2, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const boltGlow = interpolate(frame, [totalFrames * 0.4, totalFrames * 0.7], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const panelShift = interpolate(frame, [totalFrames * 0.6, totalFrames], [0, 5], {
    easing: Easing.elastic(1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" height="80%" viewBox="0 0 400 400" style={{ transform: `scale(${zoom})` }}>
        <rect x="100" y="100" width="200" height="200" fill="none" stroke="#e9f2f6" strokeWidth="2" />
        <rect x={100 + panelShift} y="100" width="200" height="200" fill="none" stroke="#e9f2f6" strokeWidth="2" strokeDasharray="10 5" />
        <circle cx="100" cy="100" r="8" fill={boltGlow > 0.5 ? '#d0523f' : '#e0b44c'} />
        <circle cx="300" cy="100" r="8" fill={boltGlow > 0.5 ? '#d0523f' : '#e0b44c'} />
        <circle cx="100" cy="300" r="8" fill={boltGlow > 0.5 ? '#d0523f' : '#e0b44c'} />
        <circle cx="300" cy="300" r="8" fill={boltGlow > 0.5 ? '#d0523f' : '#e0b44c'} />
        <line x1="100" y1="100" x2="300" y2="300" stroke="#e0b44c" strokeWidth="1" opacity="0.3" />
        <line x1="300" y1="100" x2="100" y2="300" stroke="#e0b44c" strokeWidth="1" opacity="0.3" />
      </svg>
      {p.title ? (
        <div style={{
          position: 'absolute',
          bottom: '10%',
          fontFamily: "'Segoe UI', Arial, sans-serif",
          fontSize: 32,
          color: '#e9f2f6',
          textAlign: 'center',
          textTransform: 'uppercase',
          letterSpacing: '2px'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};