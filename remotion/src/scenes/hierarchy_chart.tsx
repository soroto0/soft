import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const HierarchyChartScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const reveal = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const manipulate = interpolate(frame, [span * 0.3, span * 0.7], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shift = interpolate(frame, [span * 0.7, span], [0, 10], {
    easing: Easing.out(Easing.elastic(1)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const nodes = [
    { id: 'A', x: 500, y: 150, label: 'AGRIPINA', color: '#e0b44c' },
    { id: 'S', x: 350, y: 350, label: 'SÉNECA', color: '#e9f2f6' },
    { id: 'N', x: 650, y: 350, label: 'NERÓN', color: '#d0523f' },
  ];

  const lines = [
    { x1: 500, y1: 180, x2: 350, y2: 320 },
    { x1: 500, y1: 180, x2: 650, y2: 320 },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" height="80%" viewBox="0 0 1000 600">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#e9f2f6" />
          </marker>
        </defs>
        
        {lines.map((l, i) => (
          <line
            key={i}
            x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
            stroke="#e9f2f6"
            strokeWidth={2}
            strokeDasharray="8 4"
            strokeDashoffset={-frame * 2}
            opacity={reveal}
          />
        ))}

        {nodes.map((n) => (
          <g key={n.id} opacity={reveal}>
            <circle cx={n.x} cy={n.y} r={40 + shift} fill={n.color} />
            <text x={n.x} y={n.y + 70} fill="#e9f2f6" textAnchor="middle" fontSize={24} fontFamily="sans-serif">
              {n.label}
            </text>
          </g>
        ))}

        <path
          d={`M 500 150 C 500 ${150 + 200 * manipulate}, 350 ${350 - 100 * manipulate}, 350 350`}
          fill="none"
          stroke="#e0b44c"
          strokeWidth={4}
          strokeDasharray="10 10"
          opacity={manipulate}
        />
        
        <text x={500} y={550} fill="#e9f2f6" textAnchor="middle" fontSize={32} fontWeight="bold">
          {p.title}
        </text>
      </svg>
    </AbsoluteFill>
  );
};