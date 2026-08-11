import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const SocialTensionFlowScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = Math.max(1, Math.round((p.dur || 6) * fps));

  const flowProgress = interpolate(frame, [0, duration], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pressureScale = interpolate(frame, [0, duration], [0.2, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const glowPulse = interpolate(frame, [0, duration], [0.4, 0.9], {
    easing: Easing.inOut(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const youthNodes = [150, 250, 350];
  const citizenBars = [0, 1, 2, 3, 4];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 500 300">
        <defs>
          <linearGradient id="energyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e0b44c" />
            <stop offset="0.5" stopColor="#d0523f" />
            <stop offset="1" stopColor="#e9f2f6" />
          </linearGradient>
        </defs>

        <text x="250" y="30" fill="#e9f2f6" fontSize="12" textAnchor="middle" style={{ letterSpacing: 1 }}>SÓCRATES</text>
        <circle cx="250" cy="45" r={8 * glowPulse} fill="#e0b44c" />

        {youthNodes.map((x, i) => (
          <g key={i}>
            <line x1="250" y1="45" x2={x} y2="110" stroke="#e0b44c" strokeWidth="0.5" strokeDasharray="4 4" />
            <circle cx={250 + (x - 250) * flowProgress} cy={45 + (110 - 45) * flowProgress} r="3" fill="#e0b44c" />
            <circle cx={x} cy="110" r="6" fill="#e9f2f6" />
          </g>
        ))}

        <text x="250" y="180" fill="#e9f2f6" fontSize="12" textAnchor="middle">CIUDADANOS</text>
        {citizenBars.map((i) => (
          <rect
            key={i}
            x={110 + i * 60}
            y={200}
            width={30}
            height={60 * pressureScale}
            fill="#d0523f"
            stroke="#e9f2f6"
            strokeWidth="0.5"
          />
        ))}

        <line x1="110" y1="265" x2="350" y2="265" stroke="#e9f2f6" strokeWidth="1" />
        <text x="110" y="285" fill="#e9f2f6" fontSize="8" textAnchor="middle">0</text>
        <text x="350" y="285" fill="#e9f2f6" fontSize="8" textAnchor="middle">MAX</text>
        <text x="230" y="295" fill="#e9f2f6" fontSize="8" textAnchor="middle">PRESIÓN SOCIAL</text>
      </svg>

      {p.title ? (
        <div style={{
          marginTop: 20,
          fontFamily: 'serif',
          fontSize: 32,
          color: '#e9f2f6',
          textAlign: 'center',
          fontWeight: 'bold'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};