import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const FloatingStructureScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const float = interpolate(frame, [0, span], [-20, 20], {
    easing: Easing.inOut(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const tilt = interpolate(frame, [0, span], [-5, 5], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const scan = interpolate(frame, [0, span], [0, 100], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { id: 0, y: 100, h: 20, color: '#e9f2f6', label: 'EMPIRICAL' },
    { id: 1, y: 125, h: 15, color: '#e0b44c', label: 'LOGIC' },
    { id: 2, y: 145, h: 10, color: '#d0523f', label: 'INTUITION' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 300" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="void" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1a1a1a" />
            <stop offset="0.5" stopColor="#0a0a0a" />
            <stop offset="1" stopColor="#000000" />
          </linearGradient>
        </defs>
        <rect x="0" y="200" width="400" height="100" fill="url(#void)" />
        <g transform={`translate(0, ${float}) rotate(${tilt}, 200, 150)`}>
          {layers.map((layer) => (
            <g key={layer.id}>
              <rect x={100} y={layer.y} width={200} height={layer.h} fill={layer.color} stroke="#333" strokeWidth={0.5} />
              <line x1={80} y1={layer.y + layer.h / 2} x2={100} y2={layer.y + layer.h / 2} stroke="#e9f2f6" strokeWidth={0.5} />
              <text x={75} y={layer.y + layer.h / 2 + 3} fill="#e9f2f6" fontSize={8} textAnchor="end" fontFamily="sans-serif">{layer.label}</text>
            </g>
          ))}
          <line x1={100 + scan * 2} y1={90} x2={100 + scan * 2} y2={165} stroke="#e0b44c" strokeWidth={1} strokeDasharray="2 2" />
        </g>
        <line x1={0} y1={200} x2={400} y2={200} stroke="#333" strokeWidth={1} />
        <text x={200} y={280} fill="#e9f2f6" fontSize={12} textAnchor="middle" fontFamily="sans-serif" style={{ letterSpacing: '0.1em' }}>{p.title}</text>
      </svg>
    </AbsoluteFill>
  );
};