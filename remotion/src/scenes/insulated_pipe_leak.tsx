import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const InsulatedPipeLeakScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const leakProgress = interpolate(frame, [span * 0.1, span * 0.5], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pocketOpacity = interpolate(frame, [span * 0.3, span * 0.6], [0, 0.8], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textFloat = interpolate(frame, [0, span], [10, -10], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  return (
    <AbsoluteFill style={{ background: '#07090c', opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="60%" viewBox="0 0 400 400">
        <circle cx={200} cy={200} r={80} fill="none" stroke="#e9f2f6" strokeWidth={4} />
        <circle cx={200} cy={200} r={110} fill="none" stroke="#e9f2f6" strokeWidth={2} strokeDasharray="4 4" />
        <path d="M 200 120 L 200 110" stroke="#d0523f" strokeWidth={6} strokeDasharray="10 10" strokeDashoffset={leakProgress * -20} />
        <path d="M 160 110 A 50 50 0 0 1 240 110" fill="#d0523f" fillOpacity={pocketOpacity} stroke="#e0b44c" strokeWidth={2} />
        <text x={200} y={350} textAnchor="middle" fill="#e9f2f6" fontSize={24} fontFamily="monospace">
          {Math.floor(interpolate(frame, [0, span], [30, 42]))} BAR
        </text>
      </svg>
      {p.title ? (
        <div style={{ 
          marginTop: 40, 
          transform: `translateY(${textFloat}px)`,
          fontFamily: 'sans-serif', 
          fontSize: 32, 
          color: '#e9f2f6',
          fontWeight: 'bold',
          letterSpacing: '0.05em'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};