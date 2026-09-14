import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const PincerManeuverDiagramScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const progress = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const sharkY = interpolate(progress, [0, 1], [125, 50], {
    easing: Easing.out(Easing.cubic),
  });

  const orcaX = interpolate(progress, [0, 1], [100, 180], {
    easing: Easing.linear,
  });

  const orcaY = interpolate(progress, [0, 1], [125, 80], {
    easing: Easing.linear,
  });

  const surfaceTicks = [0, 1, 2, 3, 4, 5, 6];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 400 250">
        <defs>
          <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1a2a3a" />
            <stop offset="1" stopColor="#0a121a" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="400" height="250" fill="url(#water)" />
        <line x1="0" y1="50" x2="400" y2="50" stroke="#e9f2f6" strokeWidth="2" />
        {surfaceTicks.map((t) => (
          <line key={t} x1={t * 66} y1="50" x2={t * 66} y2="45" stroke="#e9f2f6" strokeWidth="1" />
        ))}
        <text x="200" y="35" fill="#e9f2f6" fontSize="12" textAnchor="middle">SURFACE</text>
        <g transform={`translate(${orcaX}, ${orcaY})`}>
          <ellipse cx="0" cy="0" rx="25" ry="10" fill="#e9f2f6" />
          <path d="M -25 0 L -35 -10 L -35 10 Z" fill="#e9f2f6" />
          <text x="0" y="-15" fill="#e9f2f6" fontSize="8" textAnchor="middle">PORT</text>
        </g>
        <g transform={`translate(${400 - orcaX}, ${orcaY})`}>
          <ellipse cx="0" cy="0" rx="25" ry="10" fill="#e9f2f6" />
          <path d="M 25 0 L 35 -10 L 35 10 Z" fill="#e9f2f6" />
          <text x="0" y="-15" fill="#e9f2f6" fontSize="8" textAnchor="middle">STARBOARD</text>
        </g>
        <g transform={`translate(200, ${sharkY})`}>
          <path d="M -30 0 L 0 -5 L 30 0 L 0 5 Z" fill="#d0523f" />
          <path d="M 20 -2 L 30 -8 L 30 2 Z" fill="#d0523f" />
          <text x="0" y="15" fill="#d0523f" fontSize="8" textAnchor="middle">PREY</text>
        </g>
        <path d={`M ${orcaX + 25} ${orcaY} Q 200 ${orcaY - 20} 200 ${sharkY}`} stroke="#e0b44c" strokeWidth="1" fill="none" strokeDasharray="3 3" />
        <path d={`M ${400 - orcaX - 25} ${orcaY} Q 200 ${orcaY - 20} 200 ${sharkY}`} stroke="#e0b44c" strokeWidth="1" fill="none" strokeDasharray="3 3" />
      </svg>
      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: 'sans-serif', fontSize: 32, color: '#e9f2f6', fontWeight: 'bold' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};