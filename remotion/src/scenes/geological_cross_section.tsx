import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const GeologicalCrossSectionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const reveal = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const highlight = interpolate(frame, [span * 0.3, span * 0.7], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shift = interpolate(frame, [span * 0.5, span * 0.9], [0, 10], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const layers = [
    { y: 0, h: 40, fill: '#e9f2f6', label: 'Topsoil', opacity: 0.2 },
    { y: 40, h: 80, fill: '#a0b8c8', label: 'Silt/Sand', opacity: 0.4 },
    { y: 120, h: 100, fill: '#5b7f9c', label: 'Dense Blue Clay', opacity: 0.8 },
    { y: 220, h: 30, fill: '#3a4a56', label: 'Bedrock', opacity: 1 },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 300">
        <defs>
          <linearGradient id="clayHighlight" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#d0523f" />
          </linearGradient>
        </defs>
        
        {layers.map((L, i) => (
          <g key={L.label}>
            <rect x={50} y={L.y} width={300 * reveal} height={L.h} fill={L.fill} stroke="#e9f2f6" strokeWidth={0.5} />
            <line x1={360} y1={L.y + L.h / 2} x2={380} y2={L.y + L.h / 2} stroke="#e9f2f6" strokeWidth={1} />
            <text x={385} y={L.y + L.h / 2 + 3} fill="#e9f2f6" fontSize={10}>{L.label}</text>
          </g>
        ))}

        <rect x={50} y={120} width={300 * reveal} height={100} fill="url(#clayHighlight)" opacity={0.3 * highlight} />
        
        <path d={`M 50 220 L 350 220 M 50 120 L 350 120`} stroke="#e0b44c" strokeWidth={2} strokeDasharray="4 2" opacity={highlight} />
        
        <text x={200} y={175} fill="#e9f2f6" fontSize={12} textAnchor="middle" opacity={highlight} style={{ fontWeight: 'bold' }}>
          COMPRESSION ZONE
        </text>

        <g transform={`translate(0, ${shift})`}>
          <rect x={100} y={-20} width={200} height={20} fill="#d0523f" />
          <text x={200} y={-25} fill="#e9f2f6" fontSize={8} textAnchor="middle">FOUNDATION</text>
        </g>
      </svg>

      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: 'sans-serif', fontSize: 24, color: '#e9f2f6', letterSpacing: '0.1em' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};