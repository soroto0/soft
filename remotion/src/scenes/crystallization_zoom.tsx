import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const CrystallizationZoomScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const evap = interpolate(frame, [0, span * 0.7], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const crust = interpolate(frame, [span * 0.2, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const vapor = interpolate(frame, [0, span * 0.6], [1, 0], {
    easing: Easing.in(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const mineralPoints = [
    { x: 100, y: 220 }, { x: 140, y: 215 }, { x: 180, y: 225 },
    { x: 220, y: 210 }, { x: 260, y: 220 }, { x: 300, y: 215 },
    { x: 340, y: 225 }, { x: 380, y: 210 }, { x: 420, y: 220 },
    { x: 460, y: 215 }, { x: 500, y: 225 }
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 600 300">
        <defs>
          <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5b7f9c" stopOpacity={0.6 * vapor} />
            <stop offset="0.5" stopColor="#5b7f9c" stopOpacity={0.3 * vapor} />
            <stop offset="1" stopColor="#e9f2f6" stopOpacity={0.1 * vapor} />
          </linearGradient>
        </defs>

        <rect x={50} y={50} width={500} height={200} fill="url(#waterGrad)" />
        
        <line x1={50} y1={250} x2={550} y2={250} stroke="#e9f2f6" strokeWidth={4} />
        <text x={300} y={285} fill="#e9f2f6" fontSize={14} textAnchor="middle" letterSpacing={2}>GLASS SURFACE</text>

        {mineralPoints.map((pt, i) => (
          <path
            key={i}
            d={`M ${pt.x} 250 L ${pt.x + 15 * crust} ${pt.y} L ${pt.x + 30 * crust} 250 Z`}
            fill="#e0b44c"
            stroke="#d0523f"
            strokeWidth={1}
            opacity={crust}
          />
        ))}

        <line x1={50} y1={50} x2={550} y2={50} stroke="#e9f2f6" strokeWidth={1} strokeDasharray="4 4" />
        <text x={555} y={55} fill="#e9f2f6" fontSize={10}>WATER LEVEL</text>
        <text x={555} y={70} fill="#e9f2f6" fontSize={10}>{Math.round(100 - evap * 100)}%</text>
      </svg>

      {p.title ? (
        <div style={{ 
          marginTop: 40, 
          fontFamily: "'Segoe UI', Arial, sans-serif", 
          fontSize: 32, 
          color: '#e0b44c', 
          fontWeight: 'bold',
          textTransform: 'uppercase'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};