import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const UltrasonicSensorDiagramScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const waveProgress = interpolate(frame, [0, span * 0.8], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const crackVisibility = interpolate(frame, [span * 0.3, span * 0.6], [0, 1], {
    easing: Easing.ease,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const sensorPulse = interpolate(frame, [0, span * 0.2, span * 0.4, span * 0.6, span * 0.8], [0.3, 1, 0.3, 1, 0.3], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  return (
    <AbsoluteFill style={{ background: '#07090c', opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 600 400">
        <rect x={100} y={150} width={400} height={100} fill="none" stroke="#e9f2f6" strokeWidth={2} />
        <rect x={100} y={150} width={400} height={30} fill="#d0523f" opacity={crackVisibility} />
        <line x1={300} y1={100} x2={300} y2={150} stroke="#e0b44c" strokeWidth={6} opacity={sensorPulse} />
        <path 
          d={`M 300 150 L 300 ${150 + (180 * waveProgress)}`} 
          stroke="#e0b44c" 
          strokeWidth={2} 
          strokeDasharray="10 5"
        />
        <text x={310} y={140} fill="#e0b44c" fontSize={16} fontFamily="sans-serif">4mm</text>
        <text x={100} y={300} fill="#e9f2f6" fontSize={14} fontFamily="sans-serif">
          Actual thickness: 30% remaining
        </text>
      </svg>
      {p.title ? (
        <div style={{ 
          position: 'absolute', 
          bottom: '10%', 
          fontFamily: "'Segoe UI', Arial, sans-serif", 
          fontSize: 32, 
          color: '#e9f2f6',
          letterSpacing: '0.05em'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};