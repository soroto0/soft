import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const LegalWallDiagramScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const wallGrowth = interpolate(frame, [0, span * 0.6], [0, 600], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [span * 0.4, span * 0.7], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const glowShift = interpolate(frame, [0, span], [0, 50], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { y: 200, label: 'PASADO JUDICIAL', color: '#d0523f' },
    { y: 300, label: 'AMNISTÍA', color: '#e0b44c' },
    { y: 400, label: 'FUTURO DEMOCRÁTICO', color: '#e9f2f6' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg viewBox="0 0 800 600" style={{ width: '80%', height: '80%' }}>
        <defs>
          <linearGradient id="wallGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d0523f" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#e9f2f6" />
          </linearGradient>
        </defs>

        {layers.map((l, i) => (
          <g key={l.label}>
            <line x1={100} y1={l.y} x2={700} y2={l.y} stroke="#333" strokeWidth={1} />
            <text x={90} y={l.y + 5} fill={l.color} fontSize={12} textAnchor="end" opacity={0.8}>
              {l.label}
            </text>
            <text x={710} y={l.y + 5} fill="#e9f2f6" fontSize={10}>
              {i * 50 + glowShift} units
            </text>
          </g>
        ))}

        <line x1={100} y1={300} x2={100 + wallGrowth} y2={300} stroke="#e0b44c" strokeWidth={6} />
        
        <text x={400} y={280} fill="#e0b44c" fontSize={24} textAnchor="middle" opacity={labelFade} style={{ letterSpacing: '4px' }}>
          Amnistía
        </text>

        <rect x={100} y={200} width={wallGrowth} height={200} fill="url(#wallGradient)" opacity={0.15} />
        
        <path d={`M 100 200 L 100 ${200 + wallGrowth / 3} L 700 ${200 + wallGrowth / 3} L 700 200 Z`} fill="#e0b44c" opacity={0.2} />
      </svg>

      {p.title ? (
        <div style={{
          marginTop: 20,
          fontFamily: "'Segoe UI', sans-serif",
          fontSize: 32,
          color: '#e9f2f6',
          textAlign: 'center',
          textTransform: 'uppercase',
          letterSpacing: '2px'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};