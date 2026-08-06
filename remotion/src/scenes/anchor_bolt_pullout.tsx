import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const AnchorBoltPulloutScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = Math.max(1, Math.round((p.dur || 6) * fps));

  const pullout = interpolate(frame, [0, duration], [0, 180], {
    easing: Easing.bezier(0.4, 0, 0.2, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const crumble = interpolate(frame, [0, duration * 0.8], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const force = interpolate(frame, [0, duration * 0.2], [0, 1], {
    easing: Easing.in(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const layers = [
    { y: 0, h: 80, fill: '#5d6a73', label: 'Surface' },
    { y: 80, h: 120, fill: '#8a949b', label: 'Green Concrete' },
    { y: 200, h: 100, fill: '#c9d3d9', label: 'Core' },
  ];

  const debris = [
    { x: 170, y: 100 }, { x: 230, y: 120 }, { x: 160, y: 150 }, { x: 240, y: 170 }
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="60%" viewBox="0 0 400 400">
        <defs>
          <linearGradient id="boltGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e0b44c" />
            <stop offset="0.5" stopColor="#e9f2f6" />
            <stop offset="1" stopColor="#e0b44c" />
          </linearGradient>
        </defs>

        {layers.map((l) => (
          <g key={l.label}>
            <rect x={100} y={l.y} width={200} height={l.h} fill={l.fill} stroke="#e9f2f6" strokeWidth={1} />
            <line x1={80} y1={l.y + l.h / 2} x2={100} y2={l.y + l.h / 2} stroke="#e9f2f6" strokeWidth={0.5} />
            <text x={75} y={l.y + l.h / 2 + 4} fill="#e9f2f6" fontSize={10} textAnchor="end">{l.label}</text>
          </g>
        ))}

        <rect x={190} y={40 + pullout} width={20} height={160} fill="url(#boltGrad)" />

        <g opacity={crumble}>
          {debris.map((d, i) => (
            <circle key={i} cx={d.x + (i % 2 === 0 ? pullout * 0.2 : -pullout * 0.2)} cy={d.y + pullout * 0.5} r={4} fill="#d0523f" />
          ))}
          <path d={`M 180 80 Q 170 140 180 200`} stroke="#d0523f" strokeWidth={2} strokeDasharray="2 2" fill="none" />
          <path d={`M 220 80 Q 230 140 220 200`} stroke="#d0523f" strokeWidth={2} strokeDasharray="2 2" fill="none" />
        </g>

        <g opacity={force}>
          <line x1={200} y1={10} x2={200} y2={40} stroke="#d0523f" strokeWidth={6} />
          <path d="M 185 30 L 200 40 L 215 30" stroke="#d0523f" strokeWidth={6} fill="none" />
          <text x={220} y={30} fill="#d0523f" fontSize={14} fontWeight="bold">LOAD</text>
        </g>
      </svg>

      {p.title ? (
        <div style={{ marginTop: 20, fontFamily: 'sans-serif', fontSize: 28, color: '#e9f2f6', textTransform: 'uppercase', letterSpacing: 1 }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};