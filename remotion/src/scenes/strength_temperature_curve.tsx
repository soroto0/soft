import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const StrengthTemperatureCurveScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const lineProgress = interpolate(frame, [0, span * 0.8], [0, 1], {
    easing: Easing.bezier(0.4, 0, 0.2, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const drop = interpolate(frame, [span * 0.2, span * 0.9], [0, 150], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [0, span * 0.3], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const chartWidth = width * 0.8;
  const chartHeight = height * 0.6;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width={chartWidth} height={chartHeight} viewBox="0 0 400 200" style={{ overflow: 'visible' }}>
        <line x1="0" y1="200" x2="400" y2="200" stroke="#e9f2f6" strokeWidth="2" />
        <line x1="0" y1="200" x2="0" y2="0" stroke="#e9f2f6" strokeWidth="2" />
        
        <path
          d={`M 0 20 L ${400 * lineProgress} ${20 + drop}`}
          fill="none"
          stroke="#d0523f"
          strokeWidth="4"
          strokeLinecap="round"
        />
        
        <text x="0" y="230" fill="#e9f2f6" fontSize="14" fontFamily="sans-serif">20°C</text>
        <text x="360" y="230" fill="#e9f2f6" fontSize="14" fontFamily="sans-serif">82°C</text>
        <text x="-60" y="10" fill="#e0b44c" fontSize="14" fontFamily="sans-serif" transform="rotate(-90 0 10)">Strength</text>
      </svg>

      {p.title ? (
        <div style={{
          position: 'absolute',
          bottom: height * 0.1,
          fontFamily: "'Segoe UI', Arial, sans-serif",
          fontSize: 32,
          color: '#e9f2f6',
          fontWeight: 300,
          opacity: labelFade
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};