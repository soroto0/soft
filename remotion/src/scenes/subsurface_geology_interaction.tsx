import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const SubsurfaceGeologyInteractionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const progress = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const tilt = interpolate(frame, [span * 0.2, span * 0.6], [0, 12], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const settle = interpolate(frame, [span * 0.4, span * 0.8], [0, 20], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const layers = [
    { y: 0, h: 120, name: 'LOOSE FILL', color: '#5d6a73' },
    { y: 120, h: 80, name: 'DENSE CLAY', color: '#8a949b' },
    { y: 200, h: 100, name: 'BEDROCK', color: '#c9d3d9' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 400 300">
        <defs>
          <linearGradient id="soilGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5d6a73" />
            <stop offset="0.4" stopColor="#8a949b" />
            <stop offset="1" stopColor="#c9d3d9" />
          </linearGradient>
        </defs>

        {layers.map((l, i) => (
          <g key={l.name}>
            <rect x={0} y={l.y} width={400} height={l.h} fill={l.color} opacity={0.2 + i * 0.15} />
            <line x1={0} y1={l.y} x2={400} y2={l.y} stroke="#e9f2f6" strokeWidth={1} strokeDasharray="4 4" />
            <text x={10} y={l.y + 20} fill="#e9f2f6" fontSize={10}>{l.name}</text>
          </g>
        ))}

        <g transform={`translate(200, 120) rotate(${tilt}) translate(-30, ${settle})`}>
          <rect x={0} y={0} width={60} height={100} fill="#e0b44c" stroke="#e9f2f6" strokeWidth={2} />
          <path d="M 30 100 L 10 130 L 50 130 Z" fill="#d0523f" />
          <line x1={30} y1={100} x2={30} y2={130} stroke="#d0523f" strokeWidth={3} />
        </g>

        <circle cx={200} cy={120} r={4} fill="#d0523f" />
        <text x={210} y={115} fill="#e0b44c" fontSize={12} fontWeight="bold">PIVOT POINT</text>

        <path d={`M 0 200 L ${400 * progress} 200`} stroke="#e0b44c" strokeWidth={4} strokeDasharray="8 4" />
        <text x={200} y={220} fill="#e0b44c" fontSize={10} textAnchor="middle">RESISTANT LAYER</text>
      </svg>

      {p.title ? (
        <div style={{ marginTop: 20, fontFamily: 'sans-serif', fontSize: 32, color: '#e9f2f6' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};