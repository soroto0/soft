import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const SymptomMappingScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const progress = interpolate(frame, [0, span * 0.8], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pulse = interpolate(frame, [0, span], [1, 0.7], {
    easing: Easing.bezier(0.4, 0, 0.2, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const flow = interpolate(frame, [0, span], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const symptoms = [
    { label: 'Democracia', y: 80, color: '#e0b44c' },
    { label: 'Parlamentarismo', y: 140, color: '#d0523f' },
    { label: 'Cientificismo', y: 200, color: '#e9f2f6' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 600 400">
        <defs>
          <linearGradient id="decay" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e9f2f6" />
            <stop offset="50%" stopColor="#e0b44c" />
            <stop offset="100%" stopColor="#d0523f" />
          </linearGradient>
        </defs>

        <path d={`M 100 300 Q 300 ${300 - 100 * pulse} 500 300`} fill="none" stroke="#e9f2f6" strokeWidth="2" />
        
        {symptoms.map((s, i) => (
          <g key={s.label} opacity={progress > (i * 0.2) ? 1 : 0}>
            <line x1={150 + i * 100} y1={300} x2={150 + i * 100} y2={s.y} stroke={s.color} strokeWidth="2" strokeDasharray="4 4" />
            <circle cx={150 + i * 100} cy={s.y} r={6 * progress} fill={s.color} />
            <text x={150 + i * 100} y={s.y - 15} fill={s.color} fontSize="14" textAnchor="middle" fontFamily="sans-serif">
              {s.label}
            </text>
          </g>
        ))}

        <rect x="50" y="350" width="500" height="20" fill="url(#decay)" opacity="0.3" />
        <text x="50" y="385" fill="#e9f2f6" fontSize="12">VITALIDAD: 100%</text>
        <text x="550" y="385" fill="#d0523f" fontSize="12" textAnchor="end">SENILIDAD: 0%</text>
        
        <line x1={50 + flow * 5} y1="340" x2={50 + flow * 5} y2="360" stroke="#e9f2f6" strokeWidth="4" />
      </svg>

      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: 'serif', fontSize: 32, color: '#e9f2f6', letterSpacing: '0.05em' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};