import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const TimeProcessGraphScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationInFrames = (p.dur || 6) * fps;
  const opacity = p.enter * p.exit;

  const barGrowth = interpolate(frame, [0, durationInFrames * 0.5], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const errorReveal = interpolate(frame, [durationInFrames * 0.4, durationInFrames * 0.8], [0, 1], {
    easing: Easing.bezier(0.25, 1, 0.5, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [durationInFrames * 0.6, durationInFrames * 0.9], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const normalWidth = 200;
  const extraWidth = 120;
  const startX = 100;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 800 400">
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#e9f2f6" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#d0523f" />
          </linearGradient>
        </defs>

        <line x1={startX} y1="300" x2={startX + 400} y2="300" stroke="#e9f2f6" strokeWidth="2" />
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i}>
            <line x1={startX + i * 100} y1="300" x2={startX + i * 100} y2="315" stroke="#e9f2f6" strokeWidth="2" />
            <text x={startX + i * 100} y="340" fill="#e9f2f6" fontSize="18" textAnchor="middle">{i * 30} min</text>
          </g>
        ))}

        <rect x={startX} y="150" width={normalWidth * barGrowth} height="60" fill="#e9f2f6" opacity="0.3" />
        <text x={startX + 10} y="190" fill="#e9f2f6" fontSize="20" opacity={labelFade}>Normale Dauer</text>

        <rect x={startX + normalWidth} y="150" width={extraWidth * errorReveal} height="60" fill="#d0523f" />
        <text x={startX + normalWidth + 5} y="140" fill="#d0523f" fontSize="20" fontWeight="bold" opacity={errorReveal}>+42 min Überzeit</text>

        <path d={`M ${startX} 230 L ${startX + normalWidth + extraWidth * errorReveal} 230`} stroke="url(#barGrad)" strokeWidth="6" strokeDasharray="10 5" />
        <text x={startX + (normalWidth + extraWidth * errorReveal) / 2} y="260" fill="#e0b44c" fontSize="16" textAnchor="middle" opacity={labelFade}>Tatsächliche Produktionsdauer</text>
      </svg>

      {p.title ? (
        <div style={{
          marginTop: 50,
          fontFamily: "'Segoe UI', Arial, sans-serif",
          fontSize: 42,
          color: '#e9f2f6',
          fontWeight: 'bold',
          textTransform: 'uppercase'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};