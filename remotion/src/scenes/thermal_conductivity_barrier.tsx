import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ThermalConductivityBarrierScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const draw = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const flow = interpolate(frame, [span * 0.2, span * 0.9], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const grime = interpolate(frame, [span * 0.4, span * 0.7], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { x: 100, w: 400, fill: '#8a949b', label: 'ALUMINUM (237 W/m-K)' },
    { x: 500, w: 40, fill: '#5c431d', label: 'GRIME (<1 W/m-K)' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 700 300">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#d0523f" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#e9f2f6" />
          </linearGradient>
        </defs>
        {layers.map((l, i) => (
          <g key={l.label}>
            <rect x={l.x} y={100} width={l.w * draw} height={100} fill={l.fill} />
            <text x={l.x + l.w / 2} y={230} fill="#e9f2f6" fontSize={14} textAnchor="middle" opacity={draw}>
              {l.label}
            </text>
            <line x1={l.x} y1={90} x2={l.x} y2={210} stroke="#e9f2f6" strokeWidth={1} />
            {i === 1 && <text x={l.x + l.w / 2} y={80} fill="#e0b44c" fontSize={12} textAnchor="middle" opacity={grime}>0.01 inch</text>}
          </g>
        ))}
        <rect x={50} y={120} width={600 * flow} height={60} fill="url(#g)" opacity={0.6} />
        <path d={`M ${50 + 550 * flow} 130 L ${50 + 550 * flow + 20} 150 L ${50 + 550 * flow} 170`} stroke="#e0b44c" strokeWidth={4} fill="none" />
        <path d={`M ${540 + 40 * grime} 130 L ${540 + 40 * grime + 5} 150 L ${540 + 40 * grime} 170`} stroke="#d0523f" strokeWidth={1} fill="none" />
      </svg>
      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: 'sans-serif', fontSize: 32, color: '#e9f2f6', fontWeight: 'bold' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};