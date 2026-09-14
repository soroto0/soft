import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const TacticalPincerMovementScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const progress = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const preyPos = interpolate(frame, [0, span], [0, 0.2], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pincer = interpolate(frame, [0, span], [1, 0.4], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const orcas = [
    { angle: 0, label: 'V1' },
    { angle: 90, label: 'V2' },
    { angle: 180, label: 'V3' },
    { angle: 270, label: 'V4' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg viewBox="0 0 400 400" width="70%">
        <defs>
          <radialGradient id="grad">
            <stop offset="0%" stopColor="#e0b44c" />
            <stop offset="50%" stopColor="#d0523f" />
            <stop offset="100%" stopColor="#5b7f9c" />
          </radialGradient>
        </defs>
        <circle cx="200" cy="200" r="150" fill="none" stroke="#e9f2f6" strokeWidth="0.5" strokeDasharray="4 4" />
        <circle cx={200 + preyPos * 50} cy="200" r="8" fill="#d0523f" />
        <text x={200 + preyPos * 50} y={180} fill="#d0523f" fontSize="12" textAnchor="middle">PREY</text>
        {orcas.map((o, i) => {
          const rad = (o.angle * Math.PI) / 180;
          const x = 200 + Math.cos(rad) * 150 * pincer;
          const y = 200 + Math.sin(rad) * 150 * pincer;
          return (
            <g key={i}>
              <circle cx={x} cy={y} r="12" fill="#e9f2f6" />
              <line x1={x} y1={y} x2={200} y2={200} stroke="#e0b44c" strokeWidth="1" strokeDasharray="2 2" opacity={progress} />
              <text x={x} y={y + 25} fill="#e9f2f6" fontSize="10" textAnchor="middle">{o.label}</text>
            </g>
          );
        })}
        <path d={`M 50 50 L 350 50 L 350 350 L 50 350 Z`} fill="none" stroke="#5b7f9c" strokeWidth="1" />
        <text x="200" y="380" fill="#e9f2f6" fontSize="12" textAnchor="middle">FLUCHTVEKTOREN ABGERIEGELT</text>
      </svg>
      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: 'sans-serif', fontSize: 32, color: '#e9f2f6', fontWeight: 'bold' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};