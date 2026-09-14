import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const LoadDistributionShiftScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const buoyancy = interpolate(frame, [0, duration], [1, 0.1], {
    easing: Easing.in(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const weight = interpolate(frame, [0, duration], [40, 220], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const floodLevel = interpolate(frame, [0, duration], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const legs = [
    { x: 120, label: 'SÄULE 1', factor: 1.0 },
    { x: 300, label: 'SÄULE 2', factor: 0.8 },
    { x: 480, label: 'SÄULE 3', factor: 0.6 },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 600 400">
        <defs>
          <marker id="arrowhead-up" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
            <polygon points="0 8, 4 0, 8 8" fill="#e0b44c" />
          </marker>
          <marker id="arrowhead-down" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
            <polygon points="0 0, 4 8, 8 0" fill="#d0523f" />
          </marker>
        </defs>

        <rect x="50" y="80" width="500" height="40" fill="#5d6a73" />
        <text x="300" y="105" fill="#e9f2f6" fontSize="16" textAnchor="middle">OCEAN RANGER HULL</text>

        {legs.map((leg) => (
          <g key={leg.label}>
            <rect x={leg.x} y="120" width="40" height="200" fill="#8a949b" />
            <rect x={leg.x} y={320 - (200 * floodLevel)} width="40" height={200 * floodLevel} fill="#3a4a55" />
            <line x1={leg.x + 20} y1="120" x2={leg.x + 20} y2={120 - (80 * buoyancy * leg.factor)} 
                  stroke="#e0b44c" strokeWidth={6 * buoyancy * leg.factor} markerEnd="url(#arrowhead-up)" />
            <text x={leg.x + 20} y={110 - (80 * buoyancy * leg.factor)} fill="#e0b44c" fontSize="10" textAnchor="middle">
              {Math.round(100 * buoyancy * leg.factor)}%
            </text>
          </g>
        ))}

        <line x1="300" y1="120" x2="300" y2={120 + weight} 
              stroke="#d0523f" strokeWidth="12" markerEnd="url(#arrowhead-down)" />
        <text x="315" y={120 + weight / 2} fill="#d0523f" fontSize="14" fontWeight="bold">GEWICHT</text>

        <line x1="50" y1="350" x2="550" y2="350" stroke="#e9f2f6" strokeWidth="2" strokeDasharray="6 4" />
        <text x="550" y="375" fill="#e9f2f6" fontSize="12" textAnchor="end">ABGRUND</text>
      </svg>

      {p.title ? (
        <div style={{ 
          marginTop: 20, 
          fontFamily: "'Segoe UI', Arial, sans-serif",
          fontSize: 32, 
          color: '#e9f2f6',
          fontWeight: 'bold'
        }}>{p.title}</div>
      ) : null}
    </AbsoluteFill>
  );
};