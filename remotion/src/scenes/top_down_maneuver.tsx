import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const TopDownManeuverScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const progress = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const orca1X = interpolate(progress, [0, 1], [100, 250], { easing: Easing.out(Easing.quad) });
  const orca1Y = interpolate(progress, [0, 1], [100, 180], { easing: Easing.out(Easing.quad) });
  const orca2X = interpolate(progress, [0, 1], [100, 250], { easing: Easing.out(Easing.quad) });
  const orca2Y = interpolate(progress, [0, 1], [300, 220], { easing: Easing.out(Easing.quad) });
  const preyX = interpolate(progress, [0, 1], [350, 280], { easing: Easing.out(Easing.quad) });

  const grid = [0, 1, 2, 3, 4];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 500 400">
        <defs>
          <linearGradient id="path" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#e0b44c" stopOpacity="0.2" />
            <stop offset="0.5" stopColor="#e0b44c" stopOpacity="0.5" />
            <stop offset="1" stopColor="#d0523f" stopOpacity="0.8" />
          </linearGradient>
        </defs>
        {grid.map((i) => (
          <g key={i}>
            <line x1={i * 125} y1="0" x2={i * 125} y2="400" stroke="#e9f2f6" strokeWidth="0.5" opacity="0.2" />
            <line x1="0" y1={i * 100} x2="500" y2={i * 100} stroke="#e9f2f6" strokeWidth="0.5" opacity="0.2" />
          </g>
        ))}
        <path d={`M 100 100 L ${preyX} 200 L 100 300`} fill="none" stroke="url(#path)" strokeWidth="2" strokeDasharray="6 4" />
        <circle cx={orca1X} cy={orca1Y} r="12" fill="#e9f2f6" />
        <text x={orca1X} y={orca1Y - 20} fill="#e9f2f6" fontSize="12" textAnchor="middle">PORT</text>
        <circle cx={orca2X} cy={orca2Y} r="12" fill="#e9f2f6" />
        <text x={orca2X} y={orca2Y + 30} fill="#e9f2f6" fontSize="12" textAnchor="middle">STARBOARD</text>
        <ellipse cx={preyX} cy="200" rx="8" ry="4" fill="#d0523f" />
        <text x={preyX} y="185" fill="#d0523f" fontSize="10" textAnchor="middle">PREY</text>
        <line x1="280" y1="200" x2="320" y2="200" stroke="#d0523f" strokeWidth="1" />
        <text x="330" y="204" fill="#d0523f" fontSize="10">ESCAPE BLOCKED</text>
      </svg>
      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: 32, color: '#e9f2f6', fontWeight: 'bold' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};