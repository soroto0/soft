import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const VolumeScaleComparisonScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const reveal = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const liverOpacity = interpolate(frame, [span * 0.4, span * 0.7], [0.2, 0.9], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const bodyTransparency = interpolate(frame, [span * 0.4, span * 0.7], [1, 0.2], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labels = [
    { label: '25% LEBER', x: 250, y: 120, color: '#e0b44c' },
    { label: '75% KÖRPER', x: 250, y: 200, color: '#e9f2f6' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 500 300">
        <defs>
          <linearGradient id="liverGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d0523f" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#a88030" />
          </linearGradient>
        </defs>
        <g opacity={bodyTransparency}>
          <path d="M 50 150 Q 150 50 300 150 T 450 150 Q 300 250 150 150 T 50 150" 
                fill="#5b7f9c" stroke="#e9f2f6" strokeWidth={2} />
        </g>
        <path d="M 120 150 Q 180 100 250 150 T 380 150 Q 250 220 120 150" 
              fill="url(#liverGrad)" stroke="#e9f2f6" strokeWidth={1} 
              opacity={liverOpacity * reveal} />
        <line x1={250} y1={150} x2={350} y2={120} stroke="#e9f2f6" strokeWidth={1} />
        <line x1={250} y1={150} x2={350} y2={200} stroke="#e9f2f6" strokeWidth={1} />
        {labels.map((l) => (
          <text key={l.label} x={l.x + 105} y={l.y} fill={l.color} fontSize={16} fontWeight="bold">
            {l.label}
          </text>
        ))}
        <text x={250} y={280} fill="#e9f2f6" fontSize={12} textAnchor="middle" opacity={reveal}>
          VOLUMENVERGLEICH: LEBER VS. GESAMTGEWICHT
        </text>
      </svg>
      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: "'Segoe UI', Arial, sans-serif", 
                      fontSize: 32, color: '#e9f2f6', textAlign: 'center' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};