import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const MolecularDiagramScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const progress = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const beadMorph = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const tensionLine = interpolate(frame, [0, span], [1, 0.3], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const surfaces = [
    { x: 200, label: 'Untreated', color: '#5b7f9c' },
    { x: 600, label: 'Treated', color: '#e0b44c' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg viewBox="0 0 800 400" width="80%">
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5b7f9c" />
            <stop offset="0.5" stopColor="#8a949b" />
            <stop offset="1" stopColor="#e9f2f6" />
          </linearGradient>
        </defs>

        {surfaces.map((s, i) => (
          <g key={s.label}>
            <line x1={s.x - 100} y1="300" x2={s.x + 100} y2="300" stroke="#e9f2f6" strokeWidth="4" />
            <text x={s.x} y="340" fill="#e9f2f6" fontSize="20" textAnchor="middle">{s.label}</text>
            <path
              d={i === 0 
                ? `M ${s.x - 50} 300 A 50 50 0 0 1 ${s.x + 50} 300` 
                : `M ${s.x - 100 + (100 * (1 - beadMorph))} 300 Q ${s.x} ${300 - 100 * (1 - beadMorph)} ${s.x + 100 - (100 * (1 - beadMorph))} 300`}
              fill="url(#grad)"
              stroke={s.color}
              strokeWidth="2"
            />
            <line 
              x1={s.x} y1="250" x2={s.x} y2={290 - 40 * (i === 0 ? 1 : tensionLine)} 
              stroke="#d0523f" strokeWidth="2" strokeDasharray="4 2" 
            />
            <text x={s.x} y="240" fill="#d0523f" fontSize="14" textAnchor="middle">
              {i === 0 ? 'High Tension' : 'Low Tension'}
            </text>
          </g>
        ))}

        <g transform={`translate(400, ${150 + 50 * progress})`}>
          <path d="M -20 -20 L 20 20 M 20 -20 L -20 20" stroke="#e0b44c" strokeWidth="4" />
          <text x="0" y="-30" fill="#e0b44c" fontSize="16" textAnchor="middle">Surfactant</text>
        </g>
      </svg>

      {p.title ? (
        <div style={{ 
          marginTop: 40, 
          fontFamily: "'Segoe UI', Arial, sans-serif", 
          fontSize: 32, 
          color: '#e9f2f6' 
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};