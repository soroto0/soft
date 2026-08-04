import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const StressConcentrationMapScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const heat = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shift = interpolate(frame, [0, span], [0, 50], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const glow = interpolate(frame, [0, span * 0.5, span], [0.5, 1, 0.5], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const redValue = Math.floor(208 * heat);
  const blueValue = Math.floor(246 * (1 - heat));
  const color = `rgb(${redValue}, 82, ${blueValue})`;

  return (
    <AbsoluteFill style={{ background: '#07090c', opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="60%" viewBox="0 0 400 400">
        <path d="M 100 200 L 300 200 L 300 250 L 220 250 L 200 300 L 180 250 L 100 250 Z" 
              fill="none" stroke="#e9f2f6" strokeWidth="2" />
        <circle cx={200} cy={250} r={20} fill={color} opacity={glow} 
                transform={`translate(0, ${-shift})`} />
        <text x="200" y="350" textAnchor="middle" fill="#e9f2f6" 
              style={{ fontSize: 20, fontFamily: 'sans-serif' }}>
          200mm Nozzle Interface
        </text>
      </svg>
      {p.title ? (
        <div style={{ 
          position: 'absolute', top: '10%', 
          fontFamily: "'Segoe UI', Arial, sans-serif", 
          fontSize: 42, color: '#e0b44c', fontWeight: 'bold' 
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};