import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const DeflectionCurveScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const draw = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const deflection = interpolate(frame, [span * 0.2, span * 0.8], [0, 4.2], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [span * 0.5, span * 0.9], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ticks = [0, 1, 2, 3, 4];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 500 300" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="beamGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#e9f2f6" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#d0523f" />
          </linearGradient>
        </defs>

        <line x1="50" y1="100" x2="450" y2="100" stroke="#e9f2f6" strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />
        <text x="50" y="85" fill="#e9f2f6" fontSize="12" opacity="0.6">Initial State</text>

        <path
          d={`M 50 100 Q 250 ${100 + deflection * 15}, 450 100`}
          fill="none"
          stroke="url(#beamGrad)"
          strokeWidth={6 * draw}
          strokeLinecap="round"
        />

        <line x1="250" y1="100" x2="250" y2={100 + deflection * 15} stroke="#d0523f" strokeWidth="2" strokeDasharray="2 2" />
        <circle cx="250" cy={100 + deflection * 15} r="3" fill="#d0523f" />
        
        <text x="260" y={100 + deflection * 7} fill="#d0523f" fontSize="14" fontWeight="bold" opacity={labelFade}>
          {deflection.toFixed(1)} mm
        </text>

        {ticks.map((t) => (
          <g key={t}>
            <line x1={50 + t * 100} y1="200" x2={50 + t * 100} y2="210" stroke="#e9f2f6" strokeWidth="1" />
            <text x={50 + t * 100} y="225" fill="#e9f2f6" fontSize="10" textAnchor="middle">{t * 10}m</text>
          </g>
        ))}

        <line x1="50" y1="200" x2="450" y2="200" stroke="#e9f2f6" strokeWidth="1" />
        <text x="250" y="250" fill="#e9f2f6" fontSize="12" textAnchor="middle" opacity="0.8">Beam Span (m)</text>
      </svg>

      {p.title ? (
        <div style={{ marginTop: 60, fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: 28, color: '#e0b44c', letterSpacing: '0.05em' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};