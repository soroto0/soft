import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const CrackedSurfaceDiagramScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const crackProgress = interpolate(frame, [span * 0.2, span * 0.8], [0, 1], {
    easing: Easing.bezier(0.4, 0, 0.2, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const surfaceShift = interpolate(frame, [span * 0.5, span * 0.9], [0, 15], {
    easing: Easing.cubic,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [span * 0.6, span * 0.8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { id: 1, y: 100, h: 40, color: '#e9f2f6', label: 'CORTEX' },
    { id: 2, y: 140, h: 40, color: '#c9d3d9', label: 'LIMBIC' },
    { id: 3, y: 180, h: 40, color: '#8a949b', label: 'BRAINSTEM' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 300">
        <defs>
          <linearGradient id="crackGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d0523f" />
            <stop offset="0.5" stopColor="#5b7f9c" />
            <stop offset="1" stopColor="#000000" />
          </linearGradient>
        </defs>

        {layers.map((layer) => (
          <g key={layer.id}>
            <rect
              x={100 - surfaceShift * (layer.id % 2 === 0 ? 1 : -1)}
              y={layer.y}
              width={200}
              height={layer.h}
              fill={layer.color}
              stroke="#e9f2f6"
              strokeWidth={1}
            />
            <text x={80} y={layer.y + 25} fill="#e9f2f6" fontSize={10} textAnchor="end">
              {layer.label}
            </text>
          </g>
        ))}

        <path
          d={`M 200 100 L ${200 + 40 * crackProgress} 140 L ${200 - 20 * crackProgress} 180 L ${200 + 60 * crackProgress} 220`}
          fill="none"
          stroke="url(#crackGradient)"
          strokeWidth={4 * crackProgress}
          strokeLinecap="round"
        />

        <line x1={200} y1={100} x2={200} y2={220} stroke="#d0523f" strokeWidth={1} strokeDasharray="4 4" opacity={labelFade} />
        <text x={210} y={120} fill="#d0523f" fontSize={10} opacity={labelFade}>FRACTURE</text>
      </svg>

      {p.title ? (
        <div style={{
          marginTop: 40,
          fontFamily: "'Segoe UI', Arial, sans-serif",
          fontSize: 32,
          color: '#e9f2f6',
          letterSpacing: '0.1em',
          textTransform: 'uppercase'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};