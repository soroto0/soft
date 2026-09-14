import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const CostComparisonScaleScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const scaleAnim = interpolate(frame, [0, span * 0.5], [0, 1], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const glow = interpolate(frame, [span * 0.3, span * 0.7], [0.4, 1], {
    easing: Easing.inOut(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pulse = interpolate(frame, [0, span], [0, 10], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ticks = [0, 500, 1000, 1500, 2000];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 800 400">
        <line x1="100" y1="300" x2="700" y2="300" stroke="#e9f2f6" strokeWidth="2" />
        <line x1="400" y1="100" x2="400" y2="300" stroke="#e9f2f6" strokeWidth="2" strokeDasharray="8 8" />
        
        <g transform={`translate(150, ${300 - 150 * scaleAnim})`}>
          <rect x="0" y="0" width="120" height="150" fill="#d0523f" fillOpacity={glow} stroke="#d0523f" strokeWidth="2" />
          <text x="60" y="-20" fill="#d0523f" fontSize="24" textAnchor="middle">2000 W</text>
          <text x="60" y="180" fill="#e9f2f6" fontSize="18" textAnchor="middle">Neubau</text>
        </g>

        <g transform={`translate(530, ${300 - 15 * scaleAnim})`}>
          <rect x="0" y="0" width="40" height="15" fill="#e0b44c" stroke="#e0b44c" strokeWidth="2" />
          <circle cx="20" cy="25" r={4 + Math.sin(pulse) * 2} fill="#e0b44c" />
          <text x="20" y="-20" fill="#e0b44c" fontSize="24" textAnchor="middle">40 W</text>
          <text x="20" y="180" fill="#e9f2f6" fontSize="18" textAnchor="middle">Brunnen</text>
        </g>

        {ticks.map((t, i) => (
          <g key={t}>
            <line x1={100 + i * 150} y1="300" x2={100 + i * 150} y2="315" stroke="#e9f2f6" strokeWidth="2" />
            <text x={100 + i * 150} y="340" fill="#e9f2f6" fontSize="14" textAnchor="middle">{t}W</text>
          </g>
        ))}
      </svg>
      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: 'sans-serif', fontSize: 48, color: '#e9f2f6', fontWeight: 'bold' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};