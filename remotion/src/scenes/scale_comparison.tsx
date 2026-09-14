import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ScaleComparisonScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const grow = interpolate(frame, [0, span * 0.6], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const revealLabel = interpolate(frame, [span * 0.4, span * 0.7], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shift = interpolate(frame, [0, span], [0, 20], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const bars = [
    { label: 'Soll', val: 300, color: '#c9d3d9', x: 100 },
    { label: 'Ist', val: 100, color: '#e0b44c', x: 250 },
  ];

  const ticks = [0, 100, 200, 300];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 300">
        <text x="200" y="30" fill="#e9f2f6" fontSize="20" textAnchor="middle" style={{ fontWeight: 'bold' }}>
          Knotenpunkt 11
        </text>
        
        <line x1="50" y1="250" x2="350" y2="250" stroke="#e9f2f6" strokeWidth="2" />
        
        {ticks.map((t) => (
          <g key={t}>
            <line x1="50" y1={250 - (t / 300) * 200} x2="45" y2={250 - (t / 300) * 200} stroke="#e9f2f6" strokeWidth="1" />
            <text x="40" y={255 - (t / 300) * 200} fill="#e9f2f6" fontSize="10" textAnchor="end">{t} kN</text>
          </g>
        ))}

        {bars.map((b, i) => (
          <g key={b.label}>
            <rect 
              x={b.x} 
              y={250 - (b.val * grow)} 
              width="60" 
              height={b.val * grow} 
              fill={b.color} 
            />
            <text x={b.x + 30} y={270} fill="#e9f2f6" fontSize="12" textAnchor="middle">{b.label}</text>
            <text x={b.x + 30} y={240 - (b.val * grow)} fill={b.color} fontSize="12" textAnchor="middle" opacity={revealLabel}>
              {Math.round(b.val * grow)} kN
            </text>
          </g>
        ))}

        <path d={`M 130 220 L 280 220`} stroke="#d0523f" strokeWidth="2" strokeDasharray="4 2" opacity={revealLabel} />
        <text x="205" y="210" fill="#d0523f" fontSize="10" textAnchor="middle" opacity={revealLabel}>-66% Kapazität</text>
      </svg>

      {p.title ? (
        <div style={{ 
          marginTop: 40, 
          transform: `translateY(${shift}px)`,
          fontFamily: 'sans-serif', 
          fontSize: 28, 
          color: '#e9f2f6',
          textAlign: 'center' 
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};