import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const BuoyancyLossDistributionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const collapse = interpolate(frame, [span * 0.2, span * 0.4], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shift = interpolate(frame, [span * 0.3, span * 0.6], [0, 40], {
    easing: Easing.out(Easing.back(2)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const vectorScale = interpolate(frame, [span * 0.35, span * 0.7], [1, 0.6], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const columns = [
    { id: 'A', x: 100 },
    { id: 'B', x: 200 },
    { id: 'C', x: 300 },
    { id: 'D', x: 400 },
    { id: 'E', x: 500 },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 600 300">
        <defs>
          <linearGradient id="deck" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5b7f9c" />
            <stop offset="0.5" stopColor="#8a949b" />
            <stop offset="1" stopColor="#c9d3d9" />
          </linearGradient>
        </defs>
        <rect x={50} y={80} width={500} height={20} fill="url(#deck)" />
        {columns.map((col) => (
          <g key={col.id}>
            <rect x={col.x - 10} y={100} width={20} height={100} fill="#c9d3d9" />
            <text x={col.x} y={220} fill="#e9f2f6" fontSize={12} textAnchor="middle">{col.id}</text>
            {col.id === 'D' && (
              <g opacity={collapse}>
                <line x1={col.x - 20} y1={100} x2={col.x + 20} y2={200} stroke="#d0523f" strokeWidth={4} />
                <line x1={col.x + 20} y1={100} x2={col.x - 20} y2={200} stroke="#d0523f" strokeWidth={4} />
              </g>
            )}
            <line x1={col.x} y1={80} x2={col.x} y2={80 - 40 * (col.id === 'D' ? vectorScale : 1)} 
                  stroke="#e0b44c" strokeWidth={3} />
          </g>
        ))}
        <circle cx={300 + shift} cy={60} r={8} fill="#e0b44c" />
        <text x={300 + shift} y={40} fill="#e0b44c" fontSize={10} textAnchor="middle">BUOYANCY</text>
        <line x1={50} y={250} x2={550} y2={250} stroke="#e9f2f6" strokeWidth={1} />
        <text x={50} y={270} fill="#e9f2f6" fontSize={10}>0m</text>
        <text x={550} y={270} fill="#e9f2f6" fontSize={10} textAnchor="end">50m</text>
      </svg>
      {p.title && (
        <div style={{ marginTop: 40, fontFamily: 'sans-serif', fontSize: 32, color: '#e9f2f6', fontWeight: 'bold' }}>
          {p.title}
        </div>
      )}
    </AbsoluteFill>
  );
};