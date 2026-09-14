import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const SoilMechanicsAnimationScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const flow = interpolate(frame, [0, span], [0, 100], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const bend = interpolate(frame, [0, span], [0, 25], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shift = interpolate(frame, [0, span], [0, 40], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const soilLayers = [
    { y: 100, color: '#5d6a73', label: 'Topsoil' },
    { y: 140, color: '#8a949b', label: 'Clay' },
    { y: 180, color: '#c9d3d9', label: 'Silt' },
  ];

  const piles = [100, 200, 300];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 400 300">
        <defs>
          <linearGradient id="soilFlow" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#5d6a73" />
            <stop offset="0.5" stopColor="#8a949b" />
            <stop offset="1" stopColor="#c9d3d9" />
          </linearGradient>
        </defs>

        {soilLayers.map((layer, i) => (
          <path
            key={layer.label}
            d={`M 0 ${layer.y} Q ${200 + shift} ${layer.y + flow * 0.5}, 400 ${layer.y + flow} L 400 300 L 0 300 Z`}
            fill={layer.color}
            opacity={0.8 - i * 0.2}
          />
        ))}

        {piles.map((x) => (
          <g key={x}>
            <line
              x1={x}
              y1={50}
              x2={x + bend}
              y2={250}
              stroke="#e0b44c"
              strokeWidth={8}
              strokeLinecap="round"
            />
            <circle cx={x + bend} cy={250} r={4} fill="#d0523f" />
          </g>
        ))}

        <text x={20} y={40} fill="#e9f2f6" fontSize={12}>Building Load</text>
        <line x1={200} y1={45} x2={200} y2={80} stroke="#e9f2f6" strokeWidth={2} strokeDasharray="4 2" />
        
        <text x={380} y={280} fill="#e0b44c" fontSize={10} textAnchor="end">Piles</text>
        <text x={20} y={280} fill="#c9d3d9" fontSize={10}>Flow Direction</text>
      </svg>

      {p.title ? (
        <div style={{
          marginTop: 40,
          fontFamily: "'Segoe UI', Arial, sans-serif",
          fontSize: 28,
          color: '#e9f2f6',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          letterSpacing: '1px'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};