import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const MechanicalDiagramScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const wedge = interpolate(frame, [0, span * 0.8], [0, 15], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pressure = interpolate(frame, [0, span * 0.5], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const tilt = interpolate(frame, [span * 0.3, span], [0, 5], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { y: 100, h: 50, fill: '#5d6a73', label: 'Damm' },
    { y: 150, h: 10, fill: '#e0b44c', label: 'Fuge' },
    { y: 160, h: 100, fill: '#8a949b', label: 'Fels' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 300">
        <defs>
          <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5b7f9c" stopOpacity="0.2" />
            <stop offset="0.5" stopColor="#5b7f9c" stopOpacity="0.6" />
            <stop offset="1" stopColor="#5b7f9c" stopOpacity="1" />
          </linearGradient>
        </defs>

        <g style={{ transform: `rotate(${tilt}deg)`, transformOrigin: '200px 100px' }}>
          {layers.map((l, i) => (
            <rect key={i} x={100} y={l.y} width={200} height={l.h} fill={l.fill} stroke="#e9f2f6" strokeWidth={1} />
          ))}
          <text x={90} y={125} fill="#e9f2f6" fontSize={12} textAnchor="end">Damm</text>
          <text x={90} y={157} fill="#e0b44c" fontSize={12} textAnchor="end">Fuge</text>
          <text x={90} y={210} fill="#8a949b" fontSize={12} textAnchor="end">Fels</text>
        </g>

        <path d={`M 80 100 L 100 100 L 100 ${150 + wedge} L 80 ${150 + wedge} Z`} fill="url(#water)" />
        
        <line x1={80} y1={100} x2={80} y2={150 + wedge} stroke="#e9f2f6" strokeWidth={2} />
        
        <g opacity={pressure}>
          <path d={`M 100 155 L ${100 + wedge * 2} 155 L 100 165 Z`} fill="#d0523f" />
          <line x1={100} y1={160} x2={130} y2={160} stroke="#d0523f" strokeWidth={2} strokeDasharray="4 2" />
          <text x={135} y={165} fill="#d0523f" fontSize={10}>Hydraulischer Druck</text>
        </g>
      </svg>
      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: 'sans-serif', fontSize: 24, color: '#e9f2f6', fontWeight: 'bold' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};