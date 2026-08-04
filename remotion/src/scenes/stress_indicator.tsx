import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const StressIndicatorScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const magnitude = interpolate(frame, [0, span * 0.8], [1, 2], {
    easing: Easing.bezier(0.4, 0, 0.2, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const colorInterpolation = interpolate(frame, [span * 0.4, span * 0.6], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const float = interpolate(frame, [0, span], [0, 20], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;
  const red = Math.floor(208 * colorInterpolation + 224 * (1 - colorInterpolation));
  const green = Math.floor(82 * colorInterpolation + 180 * (1 - colorInterpolation));
  const blue = Math.floor(63 * colorInterpolation + 76 * (1 - colorInterpolation));
  const currentColor = `rgb(${red}, ${green}, ${blue})`;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="60%" viewBox="0 0 400 400">
        <line x1="200" y1="380" x2="200" y2="20" stroke="#e9f2f6" strokeWidth="2" strokeDasharray="8 8" />
        <circle cx="200" cy="200" r={20 * magnitude} fill="none" stroke={currentColor} strokeWidth="4" />
        <line x1="200" y1="200" x2={200 + 120 * magnitude} y2="200" stroke={currentColor} strokeWidth={6 * magnitude} />
        <text x="200" y={150 - float} fill="#e9f2f6" textAnchor="middle" style={{ fontSize: 24, fontFamily: 'sans-serif', fontWeight: 'bold' }}>
          4th Floor Connection
        </text>
      </svg>
      {p.title ? (
        <div style={{ 
          marginTop: 60, 
          fontFamily: "'Segoe UI', Arial, sans-serif", 
          fontSize: 48, 
          color: '#e9f2f6',
          textAlign: 'center',
          letterSpacing: '0.05em'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};