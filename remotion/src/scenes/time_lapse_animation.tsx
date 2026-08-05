import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const TimeLapseAnimationScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const progress = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const particles = [
    { x: 80, y: 20, delay: 0.1 }, { x: 150, y: 35, delay: 0.3 }, { x: 220, y: 15, delay: 0.2 },
    { x: 290, y: 40, delay: 0.4 }, { x: 360, y: 25, delay: 0.15 }, { x: 430, y: 30, delay: 0.5 },
    { x: 120, y: 45, delay: 0.6 }, { x: 190, y: 10, delay: 0.25 }, { x: 260, y: 35, delay: 0.7 },
    { x: 330, y: 20, delay: 0.35 }, { x: 400, y: 45, delay: 0.55 }, { x: 470, y: 15, delay: 0.8 }
  ];

  const sludgePath = `M 50 160 Q 150 ${160 + 80 * progress} 250 160 T 450 160 L 450 ${160 + 60 * progress} Q 250 ${160 + 100 * progress} 50 ${160 + 60 * progress} Z`;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 500 300">
        <defs>
          <linearGradient id="sludgeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e0b44c" />
            <stop offset="0.5" stopColor="#d0523f" />
            <stop offset="1" stopColor="#5b7f9c" />
          </linearGradient>
        </defs>
        <rect x="50" y="150" width="400" height="10" fill="#e9f2f6" opacity="0.3" />
        <text x="50" y="140" fill="#e9f2f6" fontSize="12" letterSpacing="1">SOAP FILM</text>
        <path d={sludgePath} fill="url(#sludgeGrad)" stroke="#e9f2f6" strokeWidth="1" />
        <text x="50" y="240" fill="#e0b44c" fontSize="12" fontWeight="bold">BIOFILM SLUDGE</text>
        {particles.map((pt, i) => (
          <g key={i} opacity={interpolate(progress, [pt.delay, pt.delay + 0.1], [0, 1])}>
            <circle cx={pt.x} cy={interpolate(progress, [pt.delay, pt.delay + 0.3], [pt.y, 160 + 20 * Math.sin(i)], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })} r={4} fill="#e9f2f6" />
          </g>
        ))}
        <line x1="50" y1="270" x2="450" y2="270" stroke="#e9f2f6" strokeWidth="1" />
        {[0, 1, 2].map((t) => (
          <g key={t}>
            <line x1={50 + t * 200} y1="265" x2={50 + t * 200} y2="275" stroke="#e9f2f6" strokeWidth="1" />
            <text x={50 + t * 200} y="290" fill="#e9f2f6" fontSize="10" textAnchor="middle">{t * 36}h</text>
          </g>
        ))}
      </svg>
      {p.title ? (
        <div style={{ marginTop: 20, fontFamily: 'sans-serif', fontSize: 32, color: '#e9f2f6', fontWeight: '300' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};