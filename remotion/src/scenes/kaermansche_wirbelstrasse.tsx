import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const KaermanscheWirbelstrasseScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const flow = interpolate(frame, [0, span], [0, 800], {
    easing: Easing.linear,
  });

  const vortex = interpolate(frame, [0, span], [0, Math.PI * 20], {
    easing: Easing.linear,
  });

  const force = interpolate(frame, [span * 0.2, span * 0.8], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const cylinders = [1, 2, 3, 4];
  const vortexes = [0, 1, 2, 3, 4, 5, 6, 7];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 800 400">
        <defs>
          <linearGradient id="flow" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#5b7f9c" />
            <stop offset="0.5" stopColor="#e9f2f6" />
            <stop offset="1" stopColor="#5b7f9c" />
          </linearGradient>
        </defs>

        <text x="400" y="40" fill="#e9f2f6" fontSize="24" textAnchor="middle" style={{ fontFamily: 'sans-serif' }}>
          Kármánsche Wirbelstraße im Raster
        </text>

        {cylinders.map((c) => (
          <circle key={c} cx={c * 160} cy={200} r={20} fill="#e9f2f6" />
        ))}

        {vortexes.map((v) => {
          const x = (v * 100 + flow) % 800;
          const y = 200 + Math.sin(v + vortex) * 80;
          const color = v % 2 === 0 ? '#d0523f' : '#e0b44c';
          return (
            <g key={v} transform={`translate(${x}, ${y}) rotate(${vortex * 20})`}>
              <circle cx="0" cy="0" r="8" fill="none" stroke={color} strokeWidth="2" />
              <line x1="0" y1="-12" x2="0" y2="-20" stroke={color} strokeWidth="2" />
            </g>
          );
        })}

        <g opacity={force}>
          <line x1="320" y1="180" x2="320" y2="140" stroke="#e0b44c" strokeWidth="3" />
          <polygon points="320,135 315,145 325,145" fill="#e0b44c" />
          <text x="330" y="150" fill="#e0b44c" fontSize="14">Querkraft</text>
        </g>

        <g transform="translate(50, 350)">
          <line x1="0" y1="0" x2="700" y2="0" stroke="#5b7f9c" strokeWidth="1" />
          {[0, 1, 2, 3, 4, 5, 6, 7].map((t) => (
            <g key={t}>
              <line x1={t * 100} y1="0" x2={t * 100} y2="10" stroke="#5b7f9c" strokeWidth="1" />
              <text x={t * 100} y="25" fill="#5b7f9c" fontSize="10" textAnchor="middle">{t * 10}ms</text>
            </g>
          ))}
        </g>
      </svg>
    </AbsoluteFill>
  );
};