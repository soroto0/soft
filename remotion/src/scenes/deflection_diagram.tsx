import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const DeflectionDiagramScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const progress = interpolate(frame, [0, span * 0.6], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const deflection = interpolate(frame, [span * 0.2, span * 0.8], [0, 30], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [span * 0.5, span * 0.9], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { y: 100, label: 'Oberflansch', color: '#e9f2f6' },
    { y: 120, label: 'Stegblech', color: '#8a949b' },
    { y: 140, label: 'Unterflansch', color: '#e9f2f6' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 600 300">
        <defs>
          <linearGradient id="beamGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e9f2f6" />
            <stop offset="0.5" stopColor="#8a949b" />
            <stop offset="1" stopColor="#e9f2f6" />
          </linearGradient>
        </defs>
        
        <text x="300" y="40" fill="#e9f2f6" fontSize="16" textAnchor="middle" style={{ letterSpacing: 1 }}>
          {p.title}
        </text>

        <line x1="50" y1="120" x2="550" y2="120" stroke="#e9f2f6" strokeWidth="2" strokeDasharray="6 6" opacity="0.6" />
        
        <path d={`M 50 120 Q 300 ${120 + deflection * progress}, 550 120`} 
              fill="none" stroke="url(#beamGrad)" strokeWidth="8" />

        {layers.map((l, i) => (
          <text key={i} x="50" y={220 + i * 20} fill={l.color} fontSize="12">
            {l.label}
          </text>
        ))}

        <line x1="300" y1="120" x2="300" y2={120 + deflection * progress} stroke="#d0523f" strokeWidth="2" />
        <text x="310" y={120 + (deflection * progress) / 2} fill="#d0523f" fontSize="14" opacity={labelFade}>
          3 cm
        </text>

        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <g key={i}>
            <line x1={50 + i * 83.3} y1="115" x2={50 + i * 83.3} y2="125" stroke="#e9f2f6" strokeWidth="1" />
            <text x={50 + i * 83.3} y="140" fill="#e9f2f6" fontSize="10" textAnchor="middle">
              {i * 2}m
            </text>
          </g>
        ))}
      </svg>
    </AbsoluteFill>
  );
};