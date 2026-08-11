import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const SchematicOverlayScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const bend = interpolate(frame, [0, span * 0.5], [0, 25], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const cover = interpolate(frame, [span * 0.4, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.back()),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [span * 0.7, span * 0.9], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { y: 80, h: 10, label: 'Betondecke', color: '#8a949b' },
    { y: 90, h: 20, label: 'Tragstruktur', color: '#c9d3d9' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 500 300">
        <defs>
          <linearGradient id="metal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5d6a73" />
            <stop offset="0.5" stopColor="#8a949b" />
            <stop offset="1" stopColor="#5d6a73" />
          </linearGradient>
        </defs>

        {layers.map((l, i) => (
          <rect key={l.label} x={50} y={l.y + (i === 1 ? bend : 0)} width={400} height={l.h} fill={l.color} />
        ))}

        <path d={`M 50 110 Q 250 ${110 + bend} 450 110`} stroke="#d0523f" strokeWidth={4} fill="none" />
        
        <rect x={50} y={130} width={400 * cover} height={15} fill="#e9f2f6" opacity={0.9} />
        
        <line x1={450} y1={110} x2={450} y2={130} stroke="#e0b44c" strokeWidth={2} strokeDasharray="4 2" />
        <text x={460} y={125} fill="#e0b44c" fontSize={12} opacity={labelFade}>Korrektur</text>

        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i}>
            <line x1={50 + i * 100} y1={110} x2={50 + i * 100} y2={115 + (i % 2 === 0 ? bend : 0)} stroke="#e9f2f6" strokeWidth={1} />
            <text x={50 + i * 100} y={200} fill="#e9f2f6" fontSize={8} textAnchor="middle">{i * 1.2}m</text>
          </g>
        ))}
      </svg>
      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: 32, color: '#e9f2f6', fontWeight: 'bold' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};