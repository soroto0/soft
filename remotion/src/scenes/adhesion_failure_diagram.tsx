import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const AdhesionFailureDiagramScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const reveal = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const gap = interpolate(frame, [span * 0.3, span * 0.6], [0, 25], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pulse = interpolate(frame, [span * 0.6, span * 0.9], [1, 1.5], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const woodLayers = [
    { y: 180, color: '#5d6a73', label: 'GRAIN' },
    { y: 200, color: '#8a949b', label: 'FIBER' },
    { y: 220, color: '#c9d3d9', label: 'CORE' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 400 300">
        <defs>
          <linearGradient id="fillerGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e0b44c" />
            <stop offset="0.5" stopColor="#d0523f" />
            <stop offset="1" stopColor="#5b7f9c" />
          </linearGradient>
        </defs>
        <rect x="50" y="180" width="300" height="80" fill="#2a3035" />
        {woodLayers.map((layer, i) => (
          <text key={layer.label} x="360" y={layer.y + 5} fill={layer.color} fontSize="8" opacity={reveal}>
            {layer.label}
          </text>
        ))}
        <path d="M 100 180 Q 200 120 300 180" fill="none" stroke="#e9f2f6" strokeWidth="2" />
        <rect x="100" y={155 - gap} width="200" height="25" fill="url(#fillerGrad)" opacity={reveal} />
        <line x1="200" y1={180 - gap} x2="200" y2="155 - gap" stroke="#d0523f" strokeWidth="2" strokeDasharray="4 2" />
        <text x="200" y={140 - gap} fill="#d0523f" fontSize="12" textAnchor="middle" transform={`scale(${pulse})`} transform-origin="200 140">
          GAP
        </text>
        <text x="200" y="280" fill="#e9f2f6" fontSize="20" textAnchor="middle" style={{ fontWeight: 'bold' }}>
          {p.title}
        </text>
      </svg>
    </AbsoluteFill>
  );
};