import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const DualityMapScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const progress = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const chaos = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.bezier(0.4, 0, 0.2, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelRise = interpolate(frame, [0, span * 0.2], [20, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ticks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width={width * 0.8} height={height * 0.6} viewBox="0 0 800 400">
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#e9f2f6" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#d0523f" />
          </linearGradient>
        </defs>

        <line x1="50" y1="350" x2="750" y2="350" stroke="#e9f2f6" strokeWidth="2" />
        <text x="400" y="390" fill="#e9f2f6" fontSize="20" textAnchor="middle">TIEMPO (BASTILLA)</text>

        {ticks.map((t) => (
          <g key={t}>
            <line x1={50 + t * 700} y1="350" x2={50 + t * 700} y2="365" stroke="#e9f2f6" strokeWidth="2" />
            <text x={50 + t * 700} y="380" fill="#e9f2f6" fontSize="14" textAnchor="middle">{Math.round(t * 100)}%</text>
          </g>
        ))}

        <path
          d={`M 50 100 L ${50 + progress * 700} 100`}
          fill="none"
          stroke="#e9f2f6"
          strokeWidth="4"
          strokeDasharray="10 5"
        />
        <text x="60" y="80" fill="#e9f2f6" fontSize="18">SUMISIÓN PÚBLICA</text>

        <path
          d={`M 50 250 ${Array.from({ length: 20 }).map((_, i) => {
            const x = 50 + (i / 19) * 700 * progress;
            const y = 250 + Math.sin(i * 2 + frame * 0.2) * 50 * chaos;
            return `L ${x} ${y}`;
          }).join(' ')}`}
          fill="none"
          stroke="url(#grad)"
          strokeWidth="3"
        />
        <text x="60" y="320" fill="#e0b44c" fontSize="18">ACTIVIDAD INTELECTUAL OCULTA</text>
      </svg>

      {p.title ? (
        <div style={{
          marginTop: 40,
          opacity: 1 - labelRise / 20,
          fontFamily: 'sans-serif',
          fontSize: 48,
          color: '#e9f2f6',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          letterSpacing: '0.1em'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};