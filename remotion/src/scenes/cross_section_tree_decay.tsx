import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const CrossSectionTreeDecayScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const progress = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const decay = interpolate(frame, [span * 0.3, span * 0.9], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const flow = interpolate(frame, [0, span * 0.5], [1, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const rings = [
    { r: 120, color: '#e9f2f6' },
    { r: 90, color: '#d1dadd' },
    { r: 60, color: '#b9c2c5' },
    { r: 30, color: '#a1a9ad' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="60%" viewBox="0 0 400 400">
        <defs>
          <radialGradient id="decayGrad">
            <stop offset="0" stopColor="#d0523f" stopOpacity={decay} />
            <stop offset="0.5" stopColor="#e0b44c" stopOpacity={decay * 0.5} />
            <stop offset="1" stopColor="#5b7f9c" stopOpacity="0" />
          </radialGradient>
        </defs>

        {rings.map((ring, i) => (
          <circle key={i} cx={200} cy={200} r={ring.r} fill="none" stroke={ring.color} strokeWidth={2} strokeDasharray="4 2" />
        ))}

        <circle cx={200} cy={200} r={120 * decay} fill="url(#decayGrad)" />

        {[0, 90, 180, 270].map((angle) => {
          const x = 200 + 135 * Math.cos((angle * Math.PI) / 180);
          const y = 200 + 135 * Math.sin((angle * Math.PI) / 180);
          return (
            <g key={angle}>
              <line x1={200 + 120 * Math.cos((angle * Math.PI) / 180)} y1={200 + 120 * Math.sin((angle * Math.PI) / 180)} 
                    x2={x} y2={y} stroke="#e0b44c" strokeWidth={3} strokeOpacity={flow} />
              <text x={x} y={y} fill="#e0b44c" fontSize={12} textAnchor="middle" opacity={flow}>Savia</text>
            </g>
          );
        })}

        <line x1={200} y1={200} x2={200 + 80 * Math.cos(progress * Math.PI * 2)} y2={200 + 80 * Math.sin(progress * Math.PI * 2)} stroke="#e9f2f6" strokeWidth={1} />
        <text x={200} y={380} fill="#e9f2f6" fontSize={14} textAnchor="middle">Corteza Exterior</text>
        <text x={200} y={200} fill="#d0523f" fontSize={14} textAnchor="middle" opacity={decay}>Putrefacción</text>
      </svg>

      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: 'sans-serif', fontSize: 32, color: '#e9f2f6', textAlign: 'center' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};