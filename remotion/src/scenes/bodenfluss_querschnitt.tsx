import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const BodenflussQuerschnittScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const flow = interpolate(frame, [0, span], [0, 100], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shift = interpolate(frame, [0, span], [0, 40], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [0, span * 0.2], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { y: 100, h: 40, label: 'Oberboden', color: '#8a949b' },
    { y: 140, h: 60, label: 'Plastische Schicht', color: '#5d6a73' },
    { y: 200, h: 50, label: 'Festgestein', color: '#3d4a53' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 500 300">
        <defs>
          <linearGradient id="soilGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8a949b" />
            <stop offset="0.5" stopColor="#5d6a73" />
            <stop offset="1" stopColor="#3d4a53" />
          </linearGradient>
        </defs>

        <rect x="0" y="100" width="350" height="150" fill="url(#soilGrad)" />
        <rect x="350" y="100" width="150" height="200" fill="#1a1a1a" stroke="#d0523f" strokeWidth="2" />
        
        {layers.map((l, i) => (
          <g key={l.label}>
            <line x1="350" y1={l.y} x2="450" y2={l.y} stroke="#e9f2f6" strokeWidth="1" strokeDasharray="4 2" />
            <text x="355" y={l.y - 5} fill="#e9f2f6" fontSize="10" opacity={labelFade}>{l.label}</text>
          </g>
        ))}

        {[0, 1, 2, 3].map((i) => (
          <path
            key={i}
            d={`M ${350 - (flow + i * 20) % 350} ${160 + i * 15} L ${350 - (flow + i * 20) % 350 + 30} ${160 + i * 15}`}
            stroke="#e0b44c"
            strokeWidth="2"
            fill="none"
            opacity={0.8}
          />
        ))}

        <path d={`M 350 140 L 350 100 L 500 100 L 500 300 L 350 300`} fill="none" stroke="#d0523f" strokeWidth="3" />
        <text x="425" y="280" fill="#d0523f" fontSize="14" textAnchor="middle" fontWeight="bold">BAUGRUBE</text>
        
        <g transform={`translate(${-shift}, 0)`}>
          <rect x="0" y="140" width="350" height="60" fill="none" stroke="#e0b44c" strokeWidth="1" strokeDasharray="2 2" />
        </g>
      </svg>
      
      {p.title ? (
        <div style={{ marginTop: 40, color: '#e9f2f6', fontSize: 32, fontFamily: 'sans-serif', fontWeight: 'bold' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};