import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const GeographyContainmentScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = Math.max(1, Math.round((p.dur || 6) * fps));

  const scale = interpolate(frame, [0, duration * 0.8], [1, 0.2], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const borderDash = interpolate(frame, [0, duration * 0.8], [20, 5], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [duration * 0.5, duration * 0.9], [0, 1], {
    easing: Easing.ease,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const markers = [
    { x: 100, y: 80, label: 'FIRENZE' },
    { x: 350, y: 200, label: 'SIENA' },
    { x: 250, y: 150, label: 'S. CASCIANO' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 500 300">
        <defs>
          <linearGradient id="mapGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#2c3e50" />
            <stop offset="0.5" stopColor="#34495e" />
            <stop offset="1" stopColor="#2c3e50" />
          </linearGradient>
        </defs>
        <rect x="20" y="20" width="460" height="260" fill="url(#mapGrad)" stroke="#e9f2f6" strokeWidth="0.5" />
        {markers.map((m) => (
          <g key={m.label}>
            <circle cx={m.x} cy={m.y} r={3} fill="#e0b44c" />
            <text x={m.x} y={m.y - 8} fill="#e9f2f6" fontSize={8} textAnchor="middle">{m.label}</text>
          </g>
        ))}
        <rect x={250 - 220 * scale} y={150 - 120 * scale} width={440 * scale} height={240 * scale} 
              fill="none" stroke="#d0523f" strokeWidth={2} strokeDasharray={borderDash} />
        <path d="M 20 280 L 120 280 M 20 275 L 20 285 M 120 275 L 120 285" stroke="#e9f2f6" strokeWidth="1" />
        <text x="70" y="270" fill="#e9f2f6" fontSize="10" textAnchor="middle">100 km</text>
        <g opacity={labelFade}>
          <rect x="150" y="240" width="200" height="30" fill="#d0523f" />
          <text x="250" y="262" fill="#e9f2f6" fontSize="18" textAnchor="middle" fontWeight="bold">
            {p.title || "Confinamiento domiciliario"}
          </text>
        </g>
        <text x="470" y="40" fill="#e9f2f6" fontSize="12" textAnchor="end" opacity="0.5">TOSCANA</text>
      </svg>
    </AbsoluteFill>
  );
};