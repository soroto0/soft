import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const AquiferCrossSectionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const pressure = interpolate(frame, [0, span * 0.6], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const flow = interpolate(frame, [span * 0.4, span * 0.9], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const shift = interpolate(frame, [0, span], [0, 20], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;
  const layers = [
    { y: 0, h: 60, fill: '#5d6a73', name: 'Topsoil' },
    { y: 60, h: 80, fill: '#8a949b', name: 'Clay Cap' },
    { y: 140, h: 50, fill: '#c9d3d9', name: 'Gravel Aquifer' },
    { y: 190, h: 40, fill: '#4a4a4a', name: 'Bedrock' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 300">
        <defs>
          <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5b7f9c" />
            <stop offset="0.5" stopColor="#8fb3d1" />
            <stop offset="1" stopColor="#5b7f9c" />
          </linearGradient>
        </defs>
        {layers.map((L, i) => (
          <g key={L.name}>
            <rect x={50} y={L.y + shift} width={300} height={L.h} fill={L.fill} stroke="#e9f2f6" strokeWidth={0.5} />
            <text x={40} y={L.y + L.h / 2 + shift} fill="#e9f2f6" fontSize={8} textAnchor="end" dominantBaseline="middle">{L.name}</text>
            <line x1={350} y1={L.y + L.h / 2 + shift} x2={370} y2={L.y + L.h / 2 + shift} stroke="#e9f2f6" strokeWidth={0.5} />
          </g>
        ))}
        <rect x={50} y={140 + shift} width={300} height={50} fill="url(#water)" opacity={0.6 + 0.4 * pressure} />
        <path d={`M 200 ${140 + shift} v ${50 * pressure}`} stroke="#e0b44c" strokeWidth={3} strokeDasharray="4 2" />
        <circle cx={200} cy={140 + shift + (50 * pressure * flow)} r={4} fill="#d0523f" />
        <text x={200} y={130 + shift} fill="#e0b44c" fontSize={9} textAnchor="middle" fontWeight="bold">PRESSURIZED</text>
        <text x={200} y={250} fill="#e9f2f6" fontSize={12} textAnchor="middle" style={{ fontFamily: 'sans-serif' }}>{p.title}</text>
      </svg>
    </AbsoluteFill>
  );
};