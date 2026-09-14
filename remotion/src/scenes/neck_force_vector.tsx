import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const NeckForceVectorScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const headRotation = interpolate(frame, [0, span * 0.6], [0, 15], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const forcePulse = interpolate(frame, [0, span * 0.8], [0, 1], {
    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const neckStrain = interpolate(frame, [0, span * 0.7], [0, 10], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const arrowPoints = [
    { id: 1, x: 210, y: 120, label: 'Nackenkraft' },
    { id: 2, x: 280, y: 180, label: 'Bisskraft' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 600 400">
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#e0b44c" />
          </marker>
        </defs>

        <g transform={`rotate(${headRotation}, 250, 150)`}>
          <path d="M150 150 Q 250 100 350 150 L 350 200 L 150 200 Z" fill="#c9d3d9" stroke="#e9f2f6" strokeWidth="2" />
          <circle cx="330" cy="170" r="15" fill="#d0523f" />
        </g>

        <path d="M150 200 C 100 200 100 300 150 300" fill="none" stroke="#e9f2f6" strokeWidth="8" strokeLinecap="round" />
        
        <line x1="220" y1="130" x2="220" y2={130 + neckStrain * 2} stroke="#e0b44c" strokeWidth="4" markerEnd="url(#arrowhead)" />
        <line x1="300" y1="180" x2="300" y2={180 + neckStrain * 4} stroke="#d0523f" strokeWidth="4" markerEnd="url(#arrowhead)" />

        {arrowPoints.map((pt) => (
          <text key={pt.id} x={pt.x} y={pt.y - 20} fill="#e9f2f6" fontSize="14" textAnchor="middle" opacity={forcePulse}>
            {pt.label}
          </text>
        ))}

        <text x="300" y="350" fill="#e9f2f6" fontSize="24" textAnchor="middle" style={{ fontWeight: 'bold' }}>
          {p.title}
        </text>
      </svg>
    </AbsoluteFill>
  );
};