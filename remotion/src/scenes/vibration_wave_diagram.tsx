import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const VibrationWaveDiagramScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const progress = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.linear,
  });

  const waveShift = interpolate(frame, [0, span], [0, Math.PI * 12], {
    easing: Easing.linear,
  });

  const amp = interpolate(frame, [0, span * 0.2, span * 0.8, span], [0, 1, 1, 0], {
    easing: Easing.inOut(Easing.quad),
  });

  const ropes = [
    { y: 100, freq: 0.15, color: '#e9f2f6', label: '0.5 Hz' },
    { y: 200, freq: 0.25, color: '#e0b44c', label: '1.2 Hz' },
    { y: 300, freq: 0.40, color: '#d0523f', label: '2.5 Hz' },
  ];

  const ticks = [0, 200, 400, 600, 800];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 1000 500">
        <defs>
          <linearGradient id="waveGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#e9f2f6" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#d0523f" />
          </linearGradient>
        </defs>

        <line x1="100" y1="400" x2="900" y2="400" stroke="#e9f2f6" strokeWidth="1" />
        {ticks.map((t) => (
          <g key={t}>
            <line x1={100 + t} y1="400" x2={100 + t} y2="410" stroke="#e9f2f6" strokeWidth="2" />
            <text x={100 + t} y="430" fill="#e9f2f6" fontSize="12" textAnchor="middle">{t}m</text>
          </g>
        ))}

        {ropes.map((rope, i) => (
          <g key={rope.label}>
            <path
              d={`M 100 ${rope.y} ${Array.from({ length: 100 }).map((_, x) => 
                `L ${100 + x * 8} ${rope.y + Math.sin(x * rope.freq + waveShift) * 30 * amp}`
              ).join(' ')}`}
              fill="none"
              stroke={rope.color}
              strokeWidth="2"
              strokeDasharray="4 2"
            />
            <text x="920" y={rope.y} fill={rope.color} fontSize="14" alignmentBaseline="middle">
              {rope.label}
            </text>
            <line x1="90" y1={rope.y} x2="100" y2={rope.y} stroke={rope.color} strokeWidth="2" />
          </g>
        ))}

        <rect x="100" y="450" width={800 * progress} height="4" fill="url(#waveGrad)" />
        <text x="500" y="485" fill="#e9f2f6" fontSize="14" textAnchor="middle" opacity={0.7}>
          HARMONISCHE ANALYSE DER SEILSPANNUNG
        </text>
      </svg>

      {p.title ? (
        <div style={{
          position: 'absolute',
          top: '5%',
          fontFamily: 'sans-serif',
          fontSize: 32,
          color: '#e9f2f6',
          fontWeight: 300
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};