import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const SupplyStarvationScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const lineThickness = interpolate(frame, [0, span * 0.8], [8, 0.5], {
    easing: Easing.in(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const snap = interpolate(frame, [span * 0.8, span * 0.85], [1, 0], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const rotGrowth = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ticks = [0, 1, 2, 3, 4, 5, 6];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 600 300">
        <defs>
          <radialGradient id="rot">
            <stop offset="0" stopColor="#4a6741" stopOpacity="0.8" />
            <stop offset="0.5" stopColor="#4a6741" stopOpacity="0.3" />
            <stop offset="1" stopColor="#4a6741" stopOpacity="0" />
          </radialGradient>
        </defs>

        <text x="100" y="120" fill="#e9f2f6" fontSize="16" textAnchor="middle">ALEXANDRIA</text>
        <text x="500" y="120" fill="#e9f2f6" fontSize="16" textAnchor="middle">ROME</text>

        <line x1="100" y1="160" x2="500" y2="160" stroke="#e9f2f6" strokeWidth={lineThickness} strokeOpacity={snap} />
        
        <circle cx="500" cy="160" r={150 * rotGrowth} fill="url(#rot)" />
        
        <g stroke="#e9f2f6" strokeWidth="1">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={100 + t * 66.6} y1="150" x2={100 + t * 66.6} y2="170" />
              <text x={100 + t * 66.6} y="195" fill="#e9f2f6" fontSize="12" textAnchor="middle">{t}w</text>
            </g>
          ))}
        </g>

        <text x="300" y="260" fill="#d0523f" fontSize="18" textAnchor="middle" fontWeight="bold">
          {snap > 0.5 ? "SUPPLY FLOW" : "SYSTEM COLLAPSE"}
        </text>
      </svg>

      {p.title ? (
        <div style={{
          position: 'absolute',
          top: 40,
          fontFamily: "'Segoe UI', Arial, sans-serif",
          fontSize: 32,
          color: '#e0b44c',
          textTransform: 'uppercase',
          letterSpacing: '2px'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};