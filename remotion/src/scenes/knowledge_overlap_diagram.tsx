import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const KnowledgeOverlapDiagramScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const progress = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const scaleLarge = interpolate(frame, [0, span * 0.5], [0, 1], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const scaleSmall = interpolate(frame, [span * 0.3, span * 0.8], [0, 1], {
    easing: Easing.out(Easing.elastic(1)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ticks = [0, 1, 2, 3, 4];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 500 300">
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e0b44c" />
            <stop offset="50%" stopColor="#d0523f" />
            <stop offset="100%" stopColor="#e9f2f6" />
          </linearGradient>
        </defs>

        <circle cx="200" cy="150" r={80 * scaleLarge} fill="url(#grad)" fillOpacity={0.3} stroke="#e9f2f6" strokeWidth="2" />
        <circle cx="200" cy="150" r={30 * scaleSmall} fill="none" stroke="#e0b44c" strokeWidth="4" strokeDasharray="8 4" />

        <line x1="50" y1="250" x2="450" y2="250" stroke="#e9f2f6" strokeWidth="1" />
        {ticks.map((t) => (
          <g key={t}>
            <line x1={50 + t * 100} y1="250" x2={50 + t * 100} y2="260" stroke="#e9f2f6" strokeWidth="1" />
            <text x={50 + t * 100} y="280" fill="#e9f2f6" fontSize="12" textAnchor="middle">{t * 25}%</text>
          </g>
        ))}

        <line x1="200" y1="150" x2="350" y2="100" stroke="#e9f2f6" strokeWidth="1" />
        <text x="355" y="100" fill="#e9f2f6" fontSize="14" alignmentBaseline="middle">Falsa Sabiduría (Sólida)</text>
        
        <line x1="200" y1="150" x2="350" y2="200" stroke="#e0b44c" strokeWidth="1" />
        <text x="355" y="200" fill="#e0b44c" fontSize="14" alignmentBaseline="middle">Sabiduría Socrática (Vacía)</text>

        <text x="250" y="30" fill="#e9f2f6" fontSize="20" textAnchor="middle" opacity={progress}>
          {p.title || 'La Paradoja del Saber'}
        </text>
      </svg>
    </AbsoluteFill>
  );
};