import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ChimneyEffectHeatScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const drawStructure = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const flow = interpolate(frame, [span * 0.2, span * 0.8], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const heatGlow = interpolate(frame, [span * 0.4, span * 0.9], [0.2, 0.8], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { x: 100, w: 60, color: '#5b7f9c', label: 'Masonry' },
    { x: 160, w: 40, color: '#e0b44c', label: 'Insulation' },
    { x: 200, w: 30, color: '#d0523f', label: 'Cladding' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 300">
        <defs>
          <linearGradient id="grad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#d0523f" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#e9f2f6" />
          </linearGradient>
        </defs>
        {layers.map((l, i) => (
          <g key={l.label}>
            <rect x={l.x} y={50} width={l.w} height={200 * drawStructure} fill={l.color} opacity={0.8} />
            <line x1={l.x} y1={50} x2={l.x} y2={250} stroke="#e9f2f6" strokeWidth={1} />
            <text x={l.x + l.w / 2} y={270} fill="#e9f2f6" fontSize={10} textAnchor="middle" opacity={drawStructure}>
              {l.label}
            </text>
          </g>
        ))}
        <rect x={160} y={50} width={40} height={200} fill="url(#grad)" opacity={0.3 * heatGlow} />
        {[0, 1, 2].map((i) => (
          <path
            key={i}
            d={`M ${180} ${240 - (flow * 180) + (i * 50)} l -10 15 l 20 0 z`}
            fill="#d0523f"
            opacity={flow > 0 ? 0.8 : 0}
          />
        ))}
        <text x={200} y={30} fill="#e9f2f6" fontSize={12} textAnchor="middle" style={{ fontWeight: 'bold' }}>
          {p.title}
        </text>
      </svg>
    </AbsoluteFill>
  );
};