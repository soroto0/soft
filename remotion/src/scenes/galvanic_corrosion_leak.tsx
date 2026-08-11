import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const GalvanicCorrosionLeakScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const progress = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const erode = interpolate(frame, [span * 0.2, span * 0.6], [0, 15], {
    easing: Easing.in(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const leak = interpolate(frame, [span * 0.6, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const particles = [0, 1, 2, 3, 4, 5].map((i) => ({
    x: 210 + i * 15 * leak,
    y: 125 - i * 5 * leak,
    size: 2 + i * 0.5,
  }));

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 250">
        <defs>
          <linearGradient id="metalGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e9f2f6" />
            <stop offset="0.5" stopColor="#8a949b" />
            <stop offset="1" stopColor="#5d6a73" />
          </linearGradient>
        </defs>
        <rect x="100" y="50" width="100" height="150" fill="#e9f2f6" stroke="#5d6a73" strokeWidth="2" />
        <text x="150" y="40" fill="#e9f2f6" fontSize="12" textAnchor="middle">ALUMINUM FIN</text>
        <rect x="200" y="50" width="100" height="150" fill="#e0b44c" stroke="#d0523f" strokeWidth="2" />
        <text x="250" y="40" fill="#e0b44c" fontSize="12" textAnchor="middle">COPPER TUBE</text>
        <rect x="190" y="100 - erode" width="20" height={50 + erode} fill="#d0523f" opacity={0.8} />
        <text x="140" y="120" fill="#d0523f" fontSize="10" transform="rotate(-90 140,120)">IONIC BRIDGE</text>
        <circle cx="200" cy="125" r={3 * leak} fill="#d0523f" />
        {particles.map((pt, i) => (
          <circle key={i} cx={pt.x} cy={pt.y} r={pt.size} fill="#e9f2f6" opacity={leak} />
        ))}
        <line x1="200" y1="125" x2="250" y2="125" stroke="#e9f2f6" strokeWidth="1" strokeDasharray="2 2" />
        <text x="255" y="128" fill="#e9f2f6" fontSize="10">GAS LEAK</text>
      </svg>
      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: 'sans-serif', fontSize: 24, color: '#e9f2f6', opacity: progress }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};