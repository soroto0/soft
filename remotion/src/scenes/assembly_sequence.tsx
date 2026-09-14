import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const AssemblySequenceScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const truckX = interpolate(frame, [0, duration * 0.7], [-200, 150], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const liftY = interpolate(frame, [duration * 0.7, duration * 0.9], [0, 40], {
    easing: Easing.out(Easing.bounce),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [duration * 0.8, duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const stages = [
    { x: 100, label: 'Fertigung' },
    { x: 250, label: 'Transport' },
    { x: 400, label: 'Montage' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 600 300">
        <defs>
          <linearGradient id="bridgeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e9f2f6" />
            <stop offset="0.5" stopColor="#c9d3d9" />
            <stop offset="1" stopColor="#8a949b" />
          </linearGradient>
        </defs>

        <line x1="50" y1="220" x2="550" y2="220" stroke="#e9f2f6" strokeWidth="2" />
        
        {stages.map((s, i) => (
          <g key={s.label}>
            <circle cx={s.x} cy="220" r="4" fill="#e0b44c" />
            <text x={s.x} y="245" fill="#e9f2f6" fontSize="12" textAnchor="middle">
              {i + 1}. {s.label}
            </text>
          </g>
        ))}

        <g style={{ transform: `translate(${truckX}px, ${liftY}px)` }}>
          <rect x="0" y="180" width="120" height="40" fill="#d0523f" />
          <rect x="10" y="140" width="100" height="40" fill="url(#bridgeGrad)" stroke="#e9f2f6" strokeWidth="1" />
          <circle cx="25" cy="220" r="8" fill="#e9f2f6" />
          <circle cx="95" cy="220" r="8" fill="#e9f2f6" />
        </g>

        <path d="M 400 180 L 400 140 M 390 140 L 410 140" stroke="#e0b44c" strokeWidth="2" strokeDasharray="4 2" opacity={labelFade} />
        <text x="400" y="130" fill="#e0b44c" fontSize="14" textAnchor="middle" opacity={labelFade}>Hydraulik</text>
      </svg>

      {p.title ? (
        <div style={{
          marginTop: 40,
          fontFamily: "'Segoe UI', Arial, sans-serif",
          fontSize: 32,
          color: '#e9f2f6',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          letterSpacing: 2
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};