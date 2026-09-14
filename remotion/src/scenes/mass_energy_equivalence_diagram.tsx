import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const MassEnergyEquivalenceDiagramScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const progress = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const split = interpolate(frame, [span * 0.3, span * 0.6], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const energy = interpolate(frame, [span * 0.6, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ticks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 600 300">
        <defs>
          <linearGradient id="energyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d0523f" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#e9f2f6" />
          </linearGradient>
        </defs>

        <line x1={50} y1={150} x2={550} y2={150} stroke="#e9f2f6" strokeWidth={2} strokeDasharray="4 4" opacity={0.3} />
        
        {ticks.map((t) => (
          <g key={t}>
            <line x1={50 + t * 500} y1={145} x2={50 + t * 500} y2={155} stroke="#e9f2f6" strokeWidth={1} />
            <text x={50 + t * 500} y={170} fill="#e9f2f6" fontSize={10} textAnchor="middle">
              {t === 0 ? '0' : t === 1 ? 'M' : ''}
            </text>
          </g>
        ))}

        <rect x={50 + 250 * (1 - progress)} y={140} width={500 * progress} height={20} fill="#e9f2f6" opacity={1 - split} />
        
        <rect x={50} y={140} width={250 - 30 * split} height={20} fill="#8a949b" opacity={split} />
        <rect x={300 + 30 * split} y={140} width={250 - 30 * split} height={20} fill="#8a949b" opacity={split} />

        <circle cx={300} cy={150} r={30 * energy} fill="url(#energyGrad)" opacity={energy} />
        
        <text x={300} y={110} fill="#e0b44c" fontSize={14} textAnchor="middle" opacity={energy}>
          E = Δmc²
        </text>

        <text x={300} y={250} fill="#e9f2f6" fontSize={24} textAnchor="middle" style={{ fontWeight: 'bold' }}>
          {p.title || 'La pérdida de masa'}
        </text>
      </svg>
    </AbsoluteFill>
  );
};