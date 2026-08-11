import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const InversionDelSistemaScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const drawOuter = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const drawInner = interpolate(frame, [span * 0.3, span * 0.8], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const dateOpacity = interpolate(frame, [span * 0.2, span * 0.4], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { r: 180, label: 'ESTADO', color: '#e9f2f6' },
    { r: 120, label: 'HOMBRE', color: '#e0b44c' },
    { r: 60, label: 'MATERIA', color: '#d0523f' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 500 500">
        <defs>
          <linearGradient id="stoneGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#d0523f" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#e9f2f6" />
          </linearGradient>
        </defs>

        {layers.map((L, i) => {
          const progress = i === 0 ? drawOuter : drawInner;
          const circumference = 2 * Math.PI * L.r;
          return (
            <g key={L.label}>
              <circle
                cx="250"
                cy="250"
                r={L.r}
                fill="none"
                stroke="url(#stoneGrad)"
                strokeWidth="4"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - progress)}
              />
              <text
                x="250"
                y={250 - L.r - 10}
                fill={L.color}
                fontSize="16"
                textAnchor="middle"
                opacity={progress}
              >
                {L.label}
              </text>
            </g>
          );
        })}

        <text
          x="250"
          y={250 - 180}
          fill="#e9f2f6"
          fontSize="24"
          fontWeight="bold"
          textAnchor="middle"
          opacity={dateOpacity}
        >
          1642
        </text>

        <line x1="250" y1="70" x2="250" y2="40" stroke="#e9f2f6" strokeWidth="2" strokeDasharray="4 4" opacity={dateOpacity} />
        
        <text x="250" y="480" fill="#e9f2f6" fontSize="32" textAnchor="middle" style={{ fontFamily: 'sans-serif' }}>
          {p.title}
        </text>
      </svg>
    </AbsoluteFill>
  );
};