import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const LamellarTearingMicrostructureScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const tear = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const separation = interpolate(frame, [0, span], [0, 40], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const stress = interpolate(frame, [0, span * 0.5], [0, 1], {
    easing: Easing.out(Easing.back()),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const planes = [
    { y: 80, label: 'ROLLING PLANE 1' },
    { y: 140, label: 'ROLLING PLANE 2' },
    { y: 200, label: 'ROLLING PLANE 3' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 600 300">
        <defs>
          <linearGradient id="steel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8a949b" />
            <stop offset="0.5" stopColor="#5d6a73" />
            <stop offset="1" stopColor="#3a444a" />
          </linearGradient>
        </defs>

        {planes.map((pl, i) => (
          <g key={pl.label}>
            <rect 
              x={50} 
              y={pl.y + (i === 1 ? separation / 2 : i === 0 ? -separation / 2 : 0)} 
              width={500} 
              height={20} 
              fill="url(#steel)" 
            />
            <text x={560} y={pl.y + 15} fill="#e9f2f6" fontSize={12} textAnchor="end">{pl.label}</text>
          </g>
        ))}

        <path 
          d={`M 150 ${150 - separation / 2} L 450 ${150 - separation / 2} L 450 ${150 + separation / 2} L 150 ${150 + separation / 2} Z`}
          fill="#d0523f"
          fillOpacity={0.6 * tear}
          stroke="#d0523f"
          strokeWidth={2}
        />

        <g opacity={stress}>
          <line x1={300} y1={80} x2={300} y2={40} stroke="#e0b44c" strokeWidth={3} />
          <path d="M 300 40 L 290 50 M 300 40 L 310 50" stroke="#e0b44c" strokeWidth={3} fill="none" />
          <text x={310} y={60} fill="#e0b44c" fontSize={14} fontWeight="bold">WELD SHRINKAGE</text>
        </g>

        <line x1={150} y1={150} x2={450} y2={150} stroke="#d0523f" strokeWidth={1} strokeDasharray="4 4" />
        <text x={300} y={145} fill="#d0523f" fontSize={10} textAnchor="middle">TEARING PATH</text>
      </svg>

      {p.title ? (
        <div style={{
          marginTop: 20,
          fontFamily: "'Segoe UI', Arial, sans-serif",
          fontSize: 36,
          color: '#e9f2f6',
          fontWeight: 'bold',
          textTransform: 'uppercase'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};