import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const AsymmetricLoadRedistributionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const collapse = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const arrowFlow = interpolate(frame, [span * 0.3, span * 0.9], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelRise = interpolate(frame, [span * 0.1, span * 0.4], [20, 0], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const trusses = [
    { id: 0, x: 50, y: 100 },
    { id: 1, x: 150, y: 100 },
    { id: 2, x: 250, y: 100 },
    { id: 3, x: 350, y: 100 },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 500 300">
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#e0b44c" />
          </marker>
        </defs>

        {trusses.map((t) => (
          <g key={t.id}>
            <rect
              x={t.x} y={t.y} width={80} height={100}
              fill={t.id === 1 ? '#d0523f' : '#e9f2f6'}
              opacity={t.id === 1 ? 1 - collapse * 0.8 : 0.6}
            />
            <text x={t.x + 40} y={t.y + 130} fill="#e9f2f6" fontSize={10} textAnchor="middle">
              KNOTEN {t.id + 1}
            </text>
          </g>
        ))}

        <g opacity={arrowFlow}>
          <line x1={190} y1={80} x2={130} y2={40} stroke="#e0b44c" strokeWidth={4} markerEnd="url(#arrowhead)" />
          <line x1={190} y1={80} x2={250} y2={40} stroke="#e0b44c" strokeWidth={4} markerEnd="url(#arrowhead)" />
          <text x={190} y={30} fill="#e0b44c" fontSize={12} textAnchor="middle" fontWeight="bold">
            LASTUMVERTEILUNG
          </text>
        </g>

        <text x={250} y={280} fill="#e9f2f6" fontSize={24} textAnchor="middle" style={{ opacity: labelRise }}>
          {p.title || "ASYMMETRISCHE LASTVERTEILUNG"}
        </text>
      </svg>
    </AbsoluteFill>
  );
};