import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const DruckdifferenzVektorenScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const loadScale = interpolate(frame, [0, span * 0.6], [0.1, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shift = interpolate(frame, [0, span], [0, 20], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const glow = interpolate(frame, [0, span * 0.5, span], [0.3, 1, 0.3], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const vectors = [0, 1, 2, 3, 4, 5];
  const labels = [
    { x: 150, y: 180, text: '10m MOUND' },
    { x: 450, y: 180, text: 'EXCAVATION' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 600 300">
        <defs>
          <linearGradient id="vGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5b7f9c" />
            <stop offset="0.5" stopColor="#8a949b" />
            <stop offset="1" stopColor="#e9f2f6" />
          </linearGradient>
        </defs>
        <rect x="50" y="120" width="250" height="130" fill="#2a3035" stroke="#e9f2f6" strokeWidth="1" />
        <rect x="300" y="150" width="250" height="100" fill="#1a1d20" stroke="#d0523f" strokeWidth="1" strokeDasharray="4 4" />
        {labels.map((l) => (
          <text key={l.text} x={l.x} y={l.y} fill="#e9f2f6" fontSize="14" textAnchor="middle" opacity="0.6">{l.text}</text>
        ))}
        {vectors.map((i) => (
          <g key={i}>
            <rect x={70 + i * 35} y={120 - 60 * loadScale} width={15} height={60 * loadScale} fill="url(#vGrad)" />
            <path d={`M ${77.5 + i * 35} ${120 - 60 * loadScale} L ${65 + i * 35} ${100 - 60 * loadScale} L ${90 + i * 35} ${100 - 60 * loadScale} Z`} fill="#5b7f9c" />
          </g>
        ))}
        <rect x="320" y="100" width="210" height="40" fill="none" stroke="#e0b44c" strokeWidth="1" strokeDasharray="2 2" opacity={glow} />
        <text x="425" y="90" fill="#e0b44c" fontSize="12" textAnchor="middle" opacity={glow}>ZERO COUNTER-PRESSURE</text>
        <line x1="50" y1="250" x2="550" y2="250" stroke="#e9f2f6" strokeWidth="2" />
        <text x="300" y="280" fill="#e9f2f6" fontSize="12" textAnchor="middle" style={{ transform: `translateX(${shift}px)` }}>FOUNDATION BASELINE</text>
      </svg>
      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: 'sans-serif', fontSize: 32, color: '#e9f2f6', textTransform: 'uppercase', letterSpacing: '2px' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};