import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ThermalLayerDiagramScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationInFrames = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const bubbleScale = interpolate(frame, [0, durationInFrames], [0.8, 1.2], {
    easing: Easing.bezier(0.4, 0, 0.2, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const bubbleOpacity = interpolate(frame, [0, durationInFrames / 2, durationInFrames], [0.2, 0.6, 0.3], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const sensorPulse = interpolate(frame, [0, durationInFrames / 4, durationInFrames / 2, durationInFrames], [1, 1.1, 1, 1.1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const molecules = [
    { x: -30, y: -30 }, { x: 0, y: -40 }, { x: 30, y: -30 },
    { x: -40, y: 0 }, { x: 40, y: 0 },
    { x: -30, y: 30 }, { x: 0, y: 40 }, { x: 30, y: 30 },
  ];

  const temps = [
    { label: '80°C', y: 100 },
    { label: '50°C', y: 150 },
    { label: '20°C', y: 200 },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 400 400">
        <defs>
          <radialGradient id="heatGradient">
            <stop offset="0%" stopColor="#e0b44c" />
            <stop offset="60%" stopColor="#d0523f" />
            <stop offset="100%" stopColor="#e0b44c" />
          </radialGradient>
        </defs>

        <circle cx="200" cy="200" r={80 * bubbleScale} fill="url(#heatGradient)" opacity={bubbleOpacity} />
        
        <g transform={`scale(${sensorPulse})`} transform-origin="200 200">
          <rect x="185" y="185" width="30" height="30" fill="#e9f2f6" stroke="#d0523f" strokeWidth="2" />
          <line x1="200" y1="185" x2="200" y2="100" stroke="#e9f2f6" strokeWidth="2" />
        </g>

        {molecules.map((m, i) => (
          <circle key={i} cx={200 + m.x} cy={200 + m.y} r="3" fill="#e9f2f6" opacity="0.7" />
        ))}

        <line x1="320" y1="100" x2="320" y2="200" stroke="#e9f2f6" strokeWidth="1" />
        {temps.map((t, i) => (
          <g key={i}>
            <line x1="315" y1={t.y} x2="325" y2={t.y} stroke="#e9f2f6" strokeWidth="1" />
            <text x="335" y={t.y + 4} fill="#e9f2f6" fontSize="12">{t.label}</text>
          </g>
        ))}
        
        <text x="200" y="350" fill="#e9f2f6" fontSize="20" textAnchor="middle" style={{ letterSpacing: '1px' }}>
          {p.title}
        </text>
      </svg>
    </AbsoluteFill>
  );
};