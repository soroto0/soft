import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const CausticMetalReactionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const animation = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const erosion = interpolate(frame, [0, span], [0, 40], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const bubbleOffset = interpolate(frame, [0, span], [0, 100], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const bubbles = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => ({
    x: 80 + i * 45,
    y: 150 - ((bubbleOffset + i * 15) % 80),
    r: 3 + (i % 3) * 2,
  }));

  const layers = [
    { y: 150, h: 100, fill: '#8a949b', label: 'ALUMINUM' },
    { y: 250, h: 20, fill: '#5d6a73', label: 'SUBSTRATE' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 600 400">
        <defs>
          <linearGradient id="foam" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d0523f" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#e9f2f6" />
          </linearGradient>
        </defs>

        {layers.map((l, i) => (
          <rect key={i} x="50" y={l.y} width="500" height={l.h} fill={l.fill} />
        ))}

        <path d={`M 50 150 Q 300 ${150 + erosion} 550 150 L 550 150 Z`} fill="url(#foam)" opacity={0.7} />

        {bubbles.map((b, i) => (
          <circle key={i} cx={b.x} cy={b.y} r={b.r * animation} fill="#e9f2f6" opacity={0.6} />
        ))}

        <line x1="50" y1="150" x2="550" y2="150" stroke="#e9f2f6" strokeWidth="2" />
        <text x="50" y="130" fill="#e9f2f6" fontSize="16">INTERFACE</text>
        
        <line x1="550" y1="150" x2="550" y2={150 + erosion} stroke="#d0523f" strokeWidth="2" />
        <text x="560" y={150 + erosion / 2} fill="#d0523f" fontSize="14">PITTED DEPTH: {Math.round(erosion)}µm</text>

        <text x="300" y="380" fill="#e9f2f6" fontSize="24" textAnchor="middle" style={{ fontFamily: 'sans-serif' }}>
          {p.title}
        </text>
      </svg>
    </AbsoluteFill>
  );
};