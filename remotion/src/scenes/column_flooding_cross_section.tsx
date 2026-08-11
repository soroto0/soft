import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ColumnFloodingCrossSectionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const tilt = interpolate(frame, [0, span], [0, 15], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const waterLevel = interpolate(frame, [0, span], [200, 50], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const volumeLabel = interpolate(frame, [0, span], [0, 4500], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { id: 0, name: 'Outer Steel', color: '#5d6a73', x: 0 },
    { id: 1, name: 'Insulation', color: '#8a949b', x: 20 },
    { id: 2, name: 'Inner Liner', color: '#c9d3d9', x: 40 },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="60%" viewBox="0 0 400 300" style={{ transform: `rotate(${tilt}deg)` }}>
        <defs>
          <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5b7f9c" stopOpacity="0.2" />
            <stop offset="0.5" stopColor="#5b7f9c" stopOpacity="0.6" />
            <stop offset="1" stopColor="#5b7f9c" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        {layers.map((l) => (
          <rect key={l.id} x={100 + l.x} y={50} width={20} height={200} fill={l.color} stroke="#e9f2f6" strokeWidth={1} />
        ))}

        <rect x={100} y={waterLevel} width={60} height={250 - waterLevel} fill="url(#waterGrad)" />
        
        <line x1={180} y1={250} x2={180} y2={waterLevel} stroke="#e0b44c" strokeWidth={2} />
        <text x={185} y={(250 + waterLevel) / 2} fill="#e0b44c" fontSize={12}>H: {Math.round(250 - waterLevel)}mm</text>

        <line x1={80} y1={250} x2={80} y2={50} stroke="#e9f2f6" strokeWidth={1} strokeDasharray="4 4" />
        <text x={70} y={150} fill="#e9f2f6" fontSize={10} textAnchor="end" transform="rotate(-90 70 150)">COLUMN AXIS</text>

        <text x={200} y={30} fill="#e9f2f6" fontSize={14} textAnchor="middle">VOLUME: {Math.round(volumeLabel)} L</text>
        <text x={200} y={280} fill="#d0523f" fontSize={14} textAnchor="middle">{Math.round(tilt)}° TILT</text>
      </svg>

      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: 'sans-serif', fontSize: 24, color: '#e9f2f6', fontWeight: 'bold' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};