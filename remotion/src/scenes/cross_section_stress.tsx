import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const CrossSectionStressScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = Math.max(1, Math.round((p.dur || 6) * fps));

  const impact = interpolate(frame, [0, duration * 0.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const stressIntensity = interpolate(frame, [duration * 0.3, duration * 0.7], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const fractureCrack = interpolate(frame, [duration * 0.6, duration * 0.9], [0, 1], {
    easing: Easing.in(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const toothLayers = [
    { y: 60, h: 50, fill: '#e9f2f6', label: 'Enamel' },
    { y: 110, h: 70, fill: '#c9d3d9', label: 'Dentin' },
    { y: 180, h: 40, fill: '#8a949b', label: 'Pulp' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="60%" viewBox="0 0 400 400">
        <defs>
          <radialGradient id="stressGrad">
            <stop offset="0%" stopColor="#d0523f" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#e0b44c" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#d0523f" stopOpacity="0" />
          </radialGradient>
        </defs>

        {toothLayers.map((l, i) => (
          <g key={l.label}>
            <rect x={120} y={l.y - impact * 20} width={160} height={l.h} fill={l.fill} stroke="#333" strokeWidth={1} />
            <line x1={100} y1={l.y + l.h / 2 - impact * 20} x2={120} y2={l.y + l.h / 2 - impact * 20} stroke="#e9f2f6" strokeWidth={1} />
            <text x={95} y={l.y + l.h / 2 - impact * 20 + 4} fill="#e9f2f6" fontSize={12} textAnchor="end">{l.label}</text>
          </g>
        ))}

        <circle cx={200} cy={150} r={80 * stressIntensity} fill="url(#stressGrad)" />

        <rect x={100} y={240} width={200} height={20} fill="#e0b44c" />
        <text x={200} y={280} fill="#e0b44c" fontSize={14} textAnchor="middle">BONE RESISTANCE</text>

        <path d={`M 180 60 L 220 ${60 + 120 * fractureCrack}`} stroke="#d0523f" strokeWidth={4 * fractureCrack} strokeLinecap="round" />
        <text x={230} y={100} fill="#d0523f" fontSize={16} fontWeight="bold" opacity={fractureCrack}>FRACTURE</text>

        <g transform="translate(150, 320)">
          <line x1={0} y1={0} x2={100} y2={0} stroke="#e9f2f6" strokeWidth={2} />
          <text x={50} y={20} fill="#e9f2f6" fontSize={10} textAnchor="middle">0 MPa</text>
          <text x={100} y={20} fill="#e9f2f6" fontSize={10} textAnchor="middle">500 MPa</text>
        </g>
      </svg>

      {p.title ? (
        <div style={{ marginTop: 20, fontFamily: 'sans-serif', fontSize: 28, color: '#e9f2f6', textAlign: 'center' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};