import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const EntropyFunnelScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const flow = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const chaos = interpolate(frame, [span * 0.3, span], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const rise = interpolate(frame, [0, span * 0.2], [40, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const particles = Array.from({ length: 12 }).map((_, i) => ({
    id: i,
    x: 210 + Math.sin(i) * 30 * chaos,
    y: 150 + (i * 8) * chaos,
    size: 4 + i * 0.5,
  }));

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 300">
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e9f2f6" />
            <stop offset="50%" stopColor="#e0b44c" />
            <stop offset="100%" stopColor="#d0523f" />
          </linearGradient>
        </defs>
        <path d="M 100 50 L 300 50 L 220 150 L 220 250 L 180 250 L 180 150 Z" 
              fill="none" stroke="#e9f2f6" strokeWidth="2" />
        <rect x="120" y="60" width="160" height={40 * flow} fill="#e9f2f6" />
        <text x="200" y="40" fill="#e9f2f6" fontSize="12" textAnchor="middle">RECURSOS ORDENADOS</text>
        {particles.map((pt) => (
          <circle key={pt.id} cx={pt.x} cy={pt.y} r={pt.size * chaos} fill="#d0523f" opacity={chaos} />
        ))}
        <text x="200" y="280" fill="#d0523f" fontSize="12" textAnchor="middle">RESIDUOS INÚTILES</text>
        <line x1="80" y1="50" x2="80" y2="250" stroke="#e9f2f6" strokeWidth="1" />
        {[0, 1, 2].map((t) => (
          <g key={t}>
            <line x1="75" y1={50 + t * 100} x2="85" y2={50 + t * 100} stroke="#e9f2f6" strokeWidth="1" />
            <text x="65" y={55 + t * 100} fill="#e9f2f6" fontSize="10" textAnchor="end">{100 - t * 50}%</text>
          </g>
        ))}
      </svg>
      {p.title ? (
        <div style={{ marginTop: 20, opacity: rise, fontFamily: 'sans-serif', fontSize: 32, color: '#e9f2f6' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};