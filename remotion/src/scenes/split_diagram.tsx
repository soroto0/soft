import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const SplitDiagramScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const growth = interpolate(frame, [0, span * 0.7], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shimmer = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.inOut(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const drift = interpolate(frame, [0, span], [0, 20], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const sets = [
    { id: 1, val: 100 },
    { id: 2, val: 140 },
    { id: 3, val: 180 },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 400 400">
        <defs>
          <linearGradient id="etherealGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e9f2f6" stopOpacity="0.05" />
            <stop offset="50%" stopColor="#e0b44c" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#d0523f" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        <rect x="20" y="220" width="360" height="150" fill="none" stroke="#e9f2f6" strokeWidth="0.5" strokeDasharray="4 4" />
        <text x="30" y="240" fill="#e9f2f6" fontSize="10">ZONA TRANSFINITA</text>

        {sets.map((s) => (
          <g key={s.id}>
            <circle cx={80 + s.id * 80} cy={300} r={s.val * 0.2 * growth} fill="none" stroke="#e9f2f6" strokeWidth="1" />
            <text x={80 + s.id * 80} y={305} fill="#e9f2f6" fontSize="8" textAnchor="middle">ℵ{s.id}</text>
          </g>
        ))}

        <path d={`M 20 200 Q 200 ${120 + drift} 380 200 L 380 20 L 20 20 Z`} fill="url(#etherealGrad)" />
        <path d="M 20 200 L 380 200" stroke="#e0b44c" strokeWidth="2" />
        
        <text x="200" y="100" fill="#e0b44c" fontSize="16" textAnchor="middle" style={{ opacity: 0.5 + shimmer * 0.5 }}>INFINITO ABSOLUTO</text>
        
        <line x1="20" y1="150" x2="380" y2="150" stroke="#d0523f" strokeWidth="1" strokeDasharray="2 2" />
        <text x="200" y="145" fill="#d0523f" fontSize="8" textAnchor="middle">LÍMITE INALCANZABLE</text>
      </svg>

      {p.title ? (
        <div style={{ marginTop: 20, fontFamily: 'sans-serif', fontSize: 28, color: '#e9f2f6', textAlign: 'center' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};