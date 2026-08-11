import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const LoadAccumulationGraphScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const progress = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const lineDraw = interpolate(frame, [0, span * 0.8], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [span * 0.5, span * 0.9], [0, 1], {
    easing: Easing.ease,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const yTicks = [0, 20, 40, 60, 80, 100];
  const xTicks = [0, 2, 4, 6, 8, 10];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 500 300">
        <defs>
          <linearGradient id="loadGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#e9f2f6" />
            <stop offset="50%" stopColor="#e0b44c" />
            <stop offset="100%" stopColor="#d0523f" />
          </linearGradient>
        </defs>

        <line x1="50" y1="250" x2="480" y2="250" stroke="#e9f2f6" strokeWidth="2" />
        <line x1="50" y1="250" x2="50" y2="30" stroke="#e9f2f6" strokeWidth="2" />

        {yTicks.map((t) => (
          <g key={t}>
            <line x1="45" y1={250 - t * 2} x2="50" y2={250 - t * 2} stroke="#e9f2f6" strokeWidth="1" />
            <text x="40" y={253 - t * 2} fill="#e9f2f6" fontSize="10" textAnchor="end">{t} kN</text>
          </g>
        ))}

        {xTicks.map((t) => (
          <g key={t}>
            <line x1={50 + t * 40} y1="250" x2={50 + t * 40} y2="255" stroke="#e9f2f6" strokeWidth="1" />
            <text x={50 + t * 40} y={270} fill="#e9f2f6" fontSize="10" textAnchor="middle">W{t}</text>
          </g>
        ))}

        <line x1="50" y1="50" x2="480" y2="50" stroke="#d0523f" strokeWidth="2" strokeDasharray="6 4" />
        <text x="475" y="40" fill="#d0523f" fontSize="12" textAnchor="end" opacity={labelFade}>Knickgrenze</text>

        <path
          d={`M 50 250 Q 250 250 480 ${250 - 200 * lineDraw}`}
          fill="none"
          stroke="url(#loadGrad)"
          strokeWidth="4"
        />

        <circle cx={50 + 430 * progress} cy={250 - 200 * Math.pow(progress, 2)} r="6" fill="#e0b44c" />
      </svg>

      {p.title ? (
        <div style={{
          marginTop: 20,
          fontFamily: 'sans-serif',
          fontSize: 32,
          color: '#e9f2f6',
          textAlign: 'center'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};