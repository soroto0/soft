import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const DataComparisonChartScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const progress = interpolate(frame, [0, duration], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const gapHighlight = interpolate(frame, [duration * 0.5, duration * 0.8], [0, 1], {
    easing: Easing.ease,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [duration * 0.7, duration * 0.9], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const officialData = [40, 42, 41, 43, 42, 44];
  const actualData = [40, 41, 65, 86, 85, 87];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 600 350">
        <defs>
          <linearGradient id="gridGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e9f2f6" stopOpacity="0.1" />
            <stop offset="50%" stopColor="#e9f2f6" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#e9f2f6" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect x="50" y="50" width="500" height="250" fill="url(#gridGrad)" />
        {[0, 25, 50, 75, 100].map((val) => (
          <g key={val}>
            <line x1="50" y1={300 - val * 2.5} x2="550" y2={300 - val * 2.5} stroke="#e9f2f6" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />
            <text x="40" y={305 - val * 2.5} fill="#e9f2f6" fontSize="12" textAnchor="end">{val}%</text>
          </g>
        ))}
        <polyline
          fill="none"
          stroke="#e9f2f6"
          strokeWidth="3"
          points={officialData.map((d, i) => `${50 + i * 100},${300 - d * 2.5 * progress}`).join(' ')}
        />
        <polyline
          fill="none"
          stroke="#e0b44c"
          strokeWidth="3"
          points={actualData.map((d, i) => `${50 + i * 100},${300 - d * 2.5 * progress}`).join(' ')}
        />
        <line 
          x1="250" y1={300 - officialData[2] * 2.5} 
          x2="250" y2={300 - actualData[2] * 2.5} 
          stroke="#d0523f" strokeWidth="4" strokeDasharray="6 2" opacity={gapHighlight} 
        />
        <text x="260" y="150" fill="#d0523f" fontSize="14" fontWeight="bold" opacity={labelFade}>43% DISCREPANCY</text>
        <text x="50" y="330" fill="#e9f2f6" fontSize="12">TIME (T1-T6)</text>
        <g transform="translate(450, 50)">
          <rect width="12" height="12" fill="#e9f2f6" />
          <text x="20" y="10" fill="#e9f2f6" fontSize="12">Official Log</text>
          <rect y="20" width="12" height="12" fill="#e0b44c" />
          <text x="20" y="30" fill="#e9f2f6" fontSize="12">Actual Sensor</text>
        </g>
      </svg>
      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: 'sans-serif', fontSize: 32, color: '#e9f2f6', textAlign: 'center' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
