import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const FreeSurfaceEffectSectionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = (p.dur || 6) * fps;

  const opacity = p.enter * p.exit;

  const tilt = interpolate(frame, [0, duration], [-15, 15], {
    easing: Easing.inOut(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const waterSurfaceY = interpolate(tilt, [-15, 15], [100, 140], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const forceArrow = interpolate(tilt, [-15, 15], [0.5, 2.5], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { id: 'hull', color: '#5d6a73', label: 'Rumpf' },
    { id: 'water', color: '#5b7f9c', label: 'Freie Oberfläche' },
    { id: 'air', color: '#e9f2f6', label: 'Luft' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 300">
        <g transform={`rotate(${tilt}, 200, 150)`}>
          <path d="M 100 100 L 300 100 L 280 220 L 120 220 Z" fill="#5d6a73" stroke="#e9f2f6" strokeWidth="2" />
          <path d={`M 100 100 L 300 100 L 280 220 L 120 220 Z`} fill="#5b7f9c" clipPath="url(#waterClip)" />
          <defs>
            <clipPath id="waterClip">
              <rect x="100" y={waterSurfaceY} width="200" height="200" />
            </clipPath>
          </defs>
          <line x1="100" y1={waterSurfaceY} x2="300" y2={waterSurfaceY} stroke="#e0b44c" strokeWidth="3" strokeDasharray="4 2" />
          <line x1="200" y1="150" x2={200 + tilt * 2} y2={150 + forceArrow * 20} stroke="#d0523f" strokeWidth="4" markerEnd="url(#arrowhead)" />
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#d0523f" />
            </marker>
          </defs>
        </g>
        {layers.map((l, i) => (
          <g key={l.id}>
            <rect x={20 + i * 130} y={260} width="15" height="15" fill={l.color} />
            <text x={40 + i * 130} y={273} fill="#e9f2f6" fontSize="12" fontFamily="sans-serif">{l.label}</text>
          </g>
        ))}
        <text x="200" y="40" fill="#e0b44c" fontSize="18" textAnchor="middle" fontWeight="bold">
          {p.title}
        </text>
      </svg>
    </AbsoluteFill>
  );
};