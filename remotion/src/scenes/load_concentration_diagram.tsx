import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const LoadConcentrationDiagramScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const draw = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pulse = interpolate(frame, [span * 0.3, span * 0.7], [1, 1.2], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const arrow = interpolate(frame, [span * 0.4, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const units = [
    { x: 150, y: 150, label: 'HVAC A' },
    { x: 350, y: 150, label: 'HVAC B' },
    { x: 250, y: 250, label: 'HVAC C' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 500 400">
        <defs>
          <radialGradient id="loadGrad">
            <stop offset="0%" stopColor="#d0523f" />
            <stop offset="60%" stopColor="#e0b44c" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>

        <rect x="50" y="50" width="400" height="300" fill="none" stroke="#e9f2f6" strokeWidth="2" strokeDasharray="8 8" opacity="0.3" />
        <text x="250" y="40" fill="#e9f2f6" fontSize="12" textAnchor="middle">ROOF STRUCTURE GRID</text>

        {units.map((u) => (
          <g key={u.label} transform={`scale(${draw})`} style={{ transformOrigin: `${u.x}px ${u.y}px` }}>
            <circle cx={u.x} cy={u.y} r={60 * pulse} fill="url(#loadGrad)" opacity={0.7 * arrow} />
            <rect x={u.x - 20} y={u.y - 20} width="40" height="40" fill="#e9f2f6" />
            <text x={u.x} y={u.y + 35} fill="#e9f2f6" fontSize="10" textAnchor="middle">{u.label}</text>
          </g>
        ))}

        <g opacity={arrow}>
          <line x1="450" y1="100" x2="450" y2="300" stroke="#e9f2f6" strokeWidth="2" />
          <text x="460" y="100" fill="#e9f2f6" fontSize="10">MAX LOAD</text>
          <text x="460" y="300" fill="#e9f2f6" fontSize="10">MIN LOAD</text>
          <path d="M445 100 L450 90 L455 100" fill="none" stroke="#e9f2f6" strokeWidth="2" />
          <path d="M445 300 L450 310 L455 300" fill="none" stroke="#e9f2f6" strokeWidth="2" />
        </g>
      </svg>

      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: 'sans-serif', fontSize: 32, color: '#e0b44c', fontWeight: 'bold' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};