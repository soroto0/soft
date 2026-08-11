import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const DecisionTreeScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const reveal = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const weight = interpolate(frame, [span * 0.4, span * 0.8], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shift = interpolate(frame, [span * 0.5, span * 0.9], [0, 20], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const resources = [
    { label: 'Oro', val: 0.7 },
    { label: 'Tropas', val: 0.4 },
    { label: 'Influencia', val: 0.9 },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 400 300">
        <defs>
          <linearGradient id="valGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#d0523f" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#e9f2f6" />
          </linearGradient>
        </defs>

        <text x={200} y={30} fill="#e9f2f6" fontSize={14} textAnchor="middle" opacity={reveal}>Borgia</text>
        <line x1={200} y1={40} x2={100} y2={80} stroke="#e9f2f6" strokeWidth={1} opacity={reveal} />
        <line x1={200} y1={40} x2={300} y2={80} stroke="#e9f2f6" strokeWidth={1} opacity={reveal} />

        <text x={100} y={100} fill="#e0b44c" fontSize={12} textAnchor="middle" opacity={reveal}>Aliada</text>
        <text x={300} y={100} fill="#d0523f" fontSize={12} textAnchor="middle" opacity={reveal}>Botín</text>

        {resources.map((r, i) => (
          <g key={r.label} opacity={reveal}>
            <text x={50} y={150 + i * 40} fill="#e9f2f6" fontSize={10}>{r.label}</text>
            <rect x={100} y={142 + i * 40} width={200 * r.val} height={10} fill="url(#valGrad)" opacity={0.6} />
            <text x={310} y={152 + i * 40} fill="#e9f2f6" fontSize={10}>{Math.round(r.val * 100)}</text>
          </g>
        ))}

        <line x1={100 + shift} y1={130} x2={100 + shift} y2={260} stroke="#e9f2f6" strokeWidth={2} opacity={weight} />
        <text x={100 + shift} y={275} fill="#e9f2f6" fontSize={10} textAnchor="middle" opacity={weight}>Cálculo</text>
        
        <line x1={10} y1={280} x2={390} y2={280} stroke="#e9f2f6" strokeWidth={0.5} />
        <text x={10} y={295} fill="#e9f2f6" fontSize={8}>0</text>
        <text x={200} y={295} fill="#e9f2f6" fontSize={8} textAnchor="middle">50</text>
        <text x={390} y={295} fill="#e9f2f6" fontSize={8} textAnchor="end">100</text>
      </svg>

      {p.title ? (
        <div style={{ marginTop: 40, color: '#e9f2f6', fontSize: 24, fontFamily: 'sans-serif' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};