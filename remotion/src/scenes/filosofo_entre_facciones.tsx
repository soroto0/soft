import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const FilosofoEntreFaccionesScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const squeeze = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const factionShift = interpolate(frame, [0, span], [0, 20], {
    easing: Easing.inOut(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const hobbesY = interpolate(frame, [0, span], [125, 180], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const factions = [
    { label: 'PROTESTANTES', x: 170 - factionShift, color: '#7a8b83' },
    { label: 'CATÓLICOS', x: 250 + factionShift, color: '#5a6b63' },
  ];

  const ticks = [0, 1, 2, 3, 4];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 420 250">
        <defs>
          <linearGradient id="hobbesGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e9f2f6" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#d0523f" />
          </linearGradient>
        </defs>

        {factions.map((f) => (
          <g key={f.label}>
            <circle cx={f.x} cy={125} r={90} fill={f.color} opacity={0.4} />
            <text x={f.x} y={235} fill="#e9f2f6" fontSize={10} textAnchor="middle" letterSpacing={1}>
              {f.label}
            </text>
          </g>
        ))}

        <circle cx={210} cy={hobbesY} r={6 - 2 * squeeze} fill="url(#hobbesGrad)" />

        <line x1={100} y1={210} x2={320} y2={210} stroke="#e9f2f6" strokeWidth={0.5} />
        {ticks.map((t) => (
          <g key={t}>
            <line x1={100 + t * 55} y1={210} x2={100 + t * 55} y2={215} stroke="#e9f2f6" strokeWidth={0.5} />
            <text x={100 + t * 55} y={228} fill="#e9f2f6" fontSize={8} textAnchor="middle">
              {1640 + t * 10}
            </text>
          </g>
        ))}

        <line x1={210} y1={125} x2={210} y2={hobbesY} stroke="#e0b44c" strokeWidth={1} strokeDasharray="4 2" />
        <text x={215} y={125} fill="#e0b44c" fontSize={9}>FUGITIVO</text>
      </svg>

      {p.title ? (
        <div style={{
          marginTop: 20,
          fontFamily: "'Segoe UI', Arial, sans-serif",
          fontSize: 32,
          color: '#e9f2f6',
          textAlign: 'center',
          textTransform: 'uppercase',
          letterSpacing: 1
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};