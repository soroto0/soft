import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ImperialFragmentationScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const drift = interpolate(frame, [0, span * 0.8], [0, 150], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const scale = interpolate(frame, [0, span * 0.8], [1, 0.8], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const gapOpacity = interpolate(frame, [0, span * 0.5], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const provinces = [
    { id: 'Siria', x: 220, y: 50, w: 60, h: 40 },
    { id: 'Fenicia', x: 220, y: 100, w: 50, h: 30 },
    { id: 'Cilicia', x: 220, y: 140, w: 70, h: 30 },
    { id: 'Egipto', x: 220, y: 180, w: 80, h: 60 },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 400 300">
        <defs>
          <linearGradient id="mapGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5b7f9c" />
            <stop offset="0.5" stopColor="#4a5d75" />
            <stop offset="1" stopColor="#2a3a4d" />
          </linearGradient>
        </defs>

        <g transform={`scale(${scale})`}>
          <path d="M 50 50 L 200 50 L 200 250 L 50 250 Z" fill="url(#mapGrad)" stroke="#e9f2f6" strokeWidth="2" />
          <text x="125" y="150" fill="#e9f2f6" fontSize="16" textAnchor="middle" fontWeight="bold">CENTRAL</text>
          <text x="125" y="170" fill="#e9f2f6" fontSize="16" textAnchor="middle" fontWeight="bold">POWER</text>
        </g>

        {provinces.map((prov) => (
          <g key={prov.id} style={{ transform: `translateX(${drift}px)` }}>
            <rect x={prov.x} y={prov.y} width={prov.w} height={prov.h} fill="#e0b44c" stroke="#e9f2f6" strokeWidth="1" />
            <text x={prov.x + prov.w / 2} y={prov.y - 5} fill="#e9f2f6" fontSize="10" textAnchor="middle">{prov.id}</text>
          </g>
        ))}

        <rect x={200} y={50} width={drift} height={200} fill="#d0523f" opacity={0.3 * gapOpacity} />
        <text x={200 + drift / 2} y={280} fill="#d0523f" fontSize="12" textAnchor="middle" opacity={gapOpacity}>GAP: {Math.round(drift)} km</text>
      </svg>

      {p.title ? (
        <div style={{ 
          marginTop: 20, 
          fontFamily: "'Segoe UI', Arial, sans-serif", 
          fontSize: 32, 
          color: '#e9f2f6',
          textAlign: 'center',
          borderTop: '1px solid #e0b44c',
          paddingTop: '10px'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};