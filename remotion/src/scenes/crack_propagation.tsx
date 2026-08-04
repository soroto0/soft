import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const CrackPropagationScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationInFrames = Math.max(1, Math.round((p.dur || 6) * fps));

  const crackDepth = interpolate(frame, [0, durationInFrames], [0, 180], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const branchOpacity = interpolate(frame, [durationInFrames * 0.4, durationInFrames * 0.6], [0, 1], {
    easing: Easing.ease,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const grainShift = interpolate(frame, [0, durationInFrames], [0, 5], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  return (
    <AbsoluteFill style={{ background: '#07090c', opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="60%" viewBox="0 0 200 300" style={{ overflow: 'visible' }}>
        <rect x={50} y={20} width={100} height={240} fill="none" stroke="#e9f2f6" strokeWidth={2} strokeDasharray="4 4" />
        <path d="M 100 20 L 100 260" stroke="#e9f2f6" strokeWidth={1} strokeOpacity={0.3} />
        <path d={`M 100 20 L 100 ${20 + crackDepth}`} stroke="#d0523f" strokeWidth={3} strokeLinecap="round" />
        <path d={`M 100 ${20 + crackDepth * 0.5} L ${100 + grainShift * 4} ${20 + crackDepth * 0.5 + 20}`} 
              stroke="#e0b44c" strokeWidth={2} strokeOpacity={branchOpacity} />
        <text x={100} y={280} textAnchor="middle" fill="#e9f2f6" style={{ fontSize: 12, fontFamily: 'sans-serif' }}>
          4mm Wall Cross-Section
        </text>
      </svg>
      {p.title ? (
        <div style={{ 
          position: 'absolute', 
          bottom: '10%', 
          fontFamily: "'Segoe UI', Arial, sans-serif", 
          fontSize: 24, 
          color: '#e9f2f6',
          letterSpacing: '0.05em'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};