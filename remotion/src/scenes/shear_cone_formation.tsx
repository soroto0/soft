import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ShearConeFormationScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const progress = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const coneGrowth = interpolate(frame, [span * 0.2, span * 0.8], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [span * 0.5, span * 0.9], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const layers = [
    { y: 0, h: 40, label: 'Surface Ice', color: '#e9f2f6' },
    { y: 40, h: 120, label: 'Concrete Slab', color: '#8a949b' },
    { y: 160, h: 40, label: 'Support Base', color: '#5d6a73' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 300">
        <defs>
          <linearGradient id="shear" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d0523f" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#d0523f" />
          </linearGradient>
        </defs>

        {layers.map((l, i) => (
          <rect key={i} x={50} y={l.y} width={300} height={l.h} fill={l.color} opacity={0.3} stroke="#e9f2f6" strokeWidth={0.5} />
        ))}

        <rect x={175} y={160} width={50} height={100} fill="#5d6a73" />
        
        <path
          d={`M 175 160 L ${175 - 100 * coneGrowth} 60 L ${225 + 100 * coneGrowth} 60 L 225 160 Z`}
          fill="url(#shear)"
          opacity={0.7 * coneGrowth}
        />

        <line x1={175} y1={160} x2={75} y2={60} stroke="#d0523f" strokeWidth={2} strokeDasharray="4 2" opacity={coneGrowth} />
        <line x1={225} y1={160} x2={325} y2={60} stroke="#d0523f" strokeWidth={2} strokeDasharray="4 2" opacity={coneGrowth} />

        <text x={200} y={120} fill="#e9f2f6" fontSize={12} textAnchor="middle" opacity={labelFade}>
          Scherkegel
        </text>
        
        {layers.map((l, i) => (
          <text key={i} x={360} y={l.y + l.h / 2 + 4} fill="#e9f2f6" fontSize={8} textAnchor="start">
            {l.label}
          </text>
        ))}

        <line x1={355} y1={20} x2={355} y2={180} stroke="#e9f2f6" strokeWidth={1} />
        {[0, 1, 2].map((t) => (
          <line key={t} x1={350} y1={20 + t * 80} x2={355} y2={20 + t * 80} stroke="#e9f2f6" strokeWidth={1} />
        ))}
      </svg>

      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: 'sans-serif', fontSize: 24, color: '#e9f2f6', opacity: progress }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};