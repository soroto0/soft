import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const TrojanHorseDiagramScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const openProgress = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const expandProgress = interpolate(frame, [span * 0.3, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const fadeConcepts = interpolate(frame, [span * 0.3, span * 0.5], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const concepts = [
    { label: 'RAISON', x: 1, y: -1 },
    { label: 'SCIENCE', x: 1.5, y: 0 },
    { label: 'LIBERTÉ', x: 1, y: 1 },
    { label: 'PROGRÈS', x: -1, y: 1 },
    { label: 'ÉGALITÉ', x: -1.5, y: 0 },
    { label: 'CRITIQUE', x: -1, y: -1 },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 800 500">
        <defs>
          <linearGradient id="bookGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e9f2f6" />
            <stop offset="0.5" stopColor="#d0523f" />
            <stop offset="1" stopColor="#e0b44c" />
          </linearGradient>
        </defs>

        <g transform="translate(400, 250)">
          <path d="M -60 -80 L 60 -80 L 60 80 L -60 80 Z" fill="#e9f2f6" />
          <path d="M -60 -80 L -60 80 L 0 80 L 0 -80 Z" fill="#d0523f" transform={`rotate(${-90 * openProgress}, 0, 0)`} />
          <path d="M 60 -80 L 60 80 L 0 80 L 0 -80 Z" fill="#d0523f" transform={`rotate(${90 * openProgress}, 0, 0)`} />
          
          {concepts.map((c, i) => (
            <g key={c.label} opacity={fadeConcepts}>
              <line x1={0} y1={0} x2={c.x * 150 * expandProgress} y2={c.y * 150 * expandProgress} stroke="#e0b44c" strokeWidth={2} strokeDasharray="4 4" />
              <circle cx={c.x * 150 * expandProgress} cy={c.y * 150 * expandProgress} r={6} fill="#d0523f" />
              <text x={c.x * 170 * expandProgress} y={c.y * 170 * expandProgress} fill="#e9f2f6" fontSize={18} textAnchor={c.x > 0 ? 'start' : 'end'}>{c.label}</text>
            </g>
          ))}
        </g>
      </svg>
      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: 'sans-serif', fontSize: 32, color: '#e9f2f6', textAlign: 'center' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};