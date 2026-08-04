import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const LabTestSimulationScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const totalFrames = Math.max(1, Math.round((p.dur || 6) * fps));

  const pistonMove = interpolate(frame, [0, totalFrames], [0, 100], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const beamCurve = interpolate(frame, [0, totalFrames], [0, 30], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const colorShift = interpolate(frame, [0, totalFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;
  const strokeColor = colorShift > 0.7 ? '#d0523f' : '#e0b44c';

  return (
    <AbsoluteFill style={{ background: '#07090c', opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" height="80%" viewBox="0 0 400 400">
        <line x1={100} y1={50} x2={300} y2={50} stroke="#e9f2f6" strokeWidth={4} />
        <rect x={175} y={50 - pistonMove} width={50} height={50} fill="#e9f2f6" />
        <path
          d={`M 200 100 Q ${200 + beamCurve} 225 200 350`}
          fill="none"
          stroke={strokeColor}
          strokeWidth={12}
          strokeLinecap="round"
        />
        <rect x={150} y={350} width={100} height={10} fill="#e9f2f6" />
      </svg>
      {p.title ? (
        <div style={{
          position: 'absolute',
          bottom: '10%',
          fontFamily: "'Courier New', monospace",
          fontSize: 42,
          color: '#e9f2f6',
          textAlign: 'center',
          width: '100%',
          textTransform: 'uppercase',
          letterSpacing: '2px'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};