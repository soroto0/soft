import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const FundamentbolzenAusrissScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = Math.max(1, Math.round((p.dur || 6) * fps));

  const boltRise = interpolate(frame, [0, duration], [0, 40], { easing: Easing.linear, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const fracture = interpolate(frame, [0, duration], [0, 1], { easing: Easing.out(Easing.cubic), extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const force = interpolate(frame, [0, duration], [0.5, 1.5], { easing: Easing.in(Easing.quad), extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const opacity = p.enter * p.exit;

  const layers = [
    { y: 100, h: 60, label: 'ASPHALT', fill: '#333' },
    { y: 160, h: 140, label: 'CONCRETE', fill: '#666' },
    { y: 300, h: 40, label: 'BEDROCK', fill: '#444' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 400 400">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d0523f" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#e9f2f6" />
          </linearGradient>
        </defs>
        {layers.map((l) => (
          <g key={l.label}>
            <rect x={50} y={l.y} width={300} height={l.h} fill={l.fill} stroke="#e9f2f6" strokeWidth={1} />
            <text x={360} y={l.y + l.h / 2 + 4} fill="#e9f2f6" fontSize={10}>{l.label}</text>
          </g>
        ))}
        <rect x={190} y={120 - boltRise} width={20} height={100} fill="#c9d3d9" />
        <path d={`M 200 120 L 200 ${80 - boltRise * 2}`} stroke="#d0523f" strokeWidth={4 * force} markerEnd="url(#arrow)" />
        <g opacity={fracture}>
          {[...Array(6)].map((_, i) => (
            <circle key={i} cx={180 + i * 10} cy={160 + i * 5} r={2 + fracture * 3} fill="#e0b44c" />
          ))}
        </g>
        <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#d0523f" />
        </marker>
      </svg>
      {p.title && (
        <div style={{ marginTop: 20, color: '#e9f2f6', fontSize: 24, fontWeight: 'bold', textAlign: 'center' }}>
          {p.title}
        </div>
      )}
    </AbsoluteFill>
  );
};