import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const NucleationAnimationScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const progress = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const growth = interpolate(frame, [0, span], [0.1, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pull = interpolate(frame, [0, span], [1, 0.15], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const molecules = [
    { angle: 0 }, { angle: 60 }, { angle: 120 }, { angle: 180 }, { angle: 240 }, { angle: 300 }
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 400 400">
        <defs>
          <radialGradient id="fog">
            <stop offset="0%" stopColor="#e9f2f6" stopOpacity="0.4" />
            <stop offset="70%" stopColor="#e9f2f6" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#e9f2f6" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx={200} cy={200} r={60 * growth} fill="url(#fog)" stroke="#e9f2f6" strokeWidth={1} strokeDasharray="4 4" />
        <circle cx={200} cy={200} r={8} fill="#e0b44c" />
        
        {molecules.map((m, i) => {
          const x = 200 + Math.cos((m.angle * Math.PI) / 180) * 150 * pull;
          const y = 200 + Math.sin((m.angle * Math.PI) / 180) * 150 * pull;
          return (
            <g key={i}>
              <line x1={200 + Math.cos((m.angle * Math.PI) / 180) * 150} y1={200 + Math.sin((m.angle * Math.PI) / 180) * 150} x2={x} y2={y} stroke="#d0523f" strokeWidth={2} />
              <circle cx={x} cy={y} r={6} fill="#e9f2f6" />
              <text x={x} y={y - 10} fill="#e9f2f6" fontSize={10} textAnchor="middle">H₂O</text>
            </g>
          );
        })}

        <path d="M 50 350 L 350 350" stroke="#e9f2f6" strokeWidth={2} />
        <text x={50} y={370} fill="#e9f2f6" fontSize={12}>VAPOR STATE</text>
        <text x={350} y={370} fill="#e9f2f6" fontSize={12} textAnchor="end">LIQUID DROPLET</text>
        <rect x={50 + 300 * progress - 5} y={345} width={10} height={10} fill="#e0b44c" />
        
        <text x={200} y={180} fill="#e0b44c" fontSize={12} textAnchor="middle" fontWeight="bold">DUST PARTICLE</text>
      </svg>

      {p.title ? (
        <div style={{ marginTop: 20, fontFamily: 'sans-serif', fontSize: 32, color: '#e9f2f6', fontWeight: 'bold' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};