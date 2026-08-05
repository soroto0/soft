import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const UnderpinningRepairPlanScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const build = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const jackAction = interpolate(frame, [span * 0.4, span * 0.8], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const lift = interpolate(frame, [span * 0.5, span * 0.9], [0, -15], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;
  const piers = [0, 1, 2, 3];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 600 400">
        <defs>
          <linearGradient id="soil" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5d6a73" />
            <stop offset="0.5" stopColor="#3a454d" />
            <stop offset="1" stopColor="#2a3238" />
          </linearGradient>
        </defs>
        <rect x="50" y="50" width="500" height="200" fill="url(#soil)" />
        <rect x="50" y="250" width="500" height="40" fill="#e0b44c" />
        <text x="300" y="277" fill="#2a3238" fontSize="14" textAnchor="middle" fontWeight="bold">LIMESTONE BEDROCK</text>
        <text x="50" y="40" fill="#e9f2f6" fontSize="12">STRUCTURE BASE</text>
        <line x1="50" y1="50" x2="550" y2="50" stroke="#e9f2f6" strokeWidth="3" />
        {piers.map((i) => (
          <g key={i}>
            <rect x={100 + i * 120} y={50} width="40" height={200 * build} fill="#c9d3d9" />
            <rect x={105 + i * 120} y={30 + lift} width="30" height={20} fill="#d0523f" />
            <path d={`M ${120 + i * 120} ${30 + lift} l -15 -15 l 30 0 l -15 15`} fill="#e0b44c" opacity={jackAction} />
            <text x={120 + i * 120} y={20 + lift} fill="#e0b44c" fontSize="10" textAnchor="middle" opacity={jackAction}>JACK</text>
          </g>
        ))}
        <line x1="50" y1="320" x2="550" y2="320" stroke="#e9f2f6" strokeWidth="1" />
        <line x1="50" y1="315" x2="50" y2="325" stroke="#e9f2f6" strokeWidth="1" />
        <line x1="550" y1="315" x2="550" y2="325" stroke="#e9f2f6" strokeWidth="1" />
        <text x="300" y="340" fill="#e9f2f6" fontSize="14" textAnchor="middle">54 FT DEPTH TO BEDROCK</text>
      </svg>
      {p.title ? (
        <div style={{ marginTop: 20, fontFamily: 'sans-serif', fontSize: 32, color: '#e9f2f6', textTransform: 'uppercase', letterSpacing: 2 }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};