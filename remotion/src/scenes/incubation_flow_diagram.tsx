import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const IncubationFlowDiagramScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const flowProgress = interpolate(frame, [0, span * 0.6], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const tyrantReveal = interpolate(frame, [span * 0.4, span * 0.9], [0, 1], {
    easing: Easing.elastic(1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pulse = interpolate(frame, [0, span], [0, 10], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const nodes = [
    { id: 'Socrates', x: 210, y: 50, label: 'SÓCRATES' },
    { id: 'Critias', x: 100, y: 200, label: 'CRITIAS' },
    { id: 'Alcibiades', x: 320, y: 200, label: 'ALCIBÍADES' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 420 280">
        <defs>
          <linearGradient id="flow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e9f2f6" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#d0523f" />
          </linearGradient>
        </defs>

        <circle cx={210} cy={50} r={15 + Math.sin(pulse) * 2} fill="#e9f2f6" />
        <text x={210} y={30} fill="#e9f2f6" fontSize={12} textAnchor="middle" letterSpacing={1}>
          {nodes[0].label}
        </text>

        {nodes.slice(1).map((node, i) => (
          <g key={node.id} opacity={tyrantReveal}>
            <line
              x1={210}
              y1={50}
              x2={210 + (i === 0 ? -110 : 110) * flowProgress}
              y2={50 + 150 * flowProgress}
              stroke="url(#flow)"
              strokeWidth={2}
              strokeDasharray="4 4"
            />
            <rect
              x={node.x - 40}
              y={node.y - 15}
              width={80}
              height={30}
              fill="none"
              stroke="#d0523f"
              strokeWidth={1.5}
            />
            <text x={node.x} y={node.y + 5} fill="#e9f2f6" fontSize={12} textAnchor="middle">
              {node.label}
            </text>
          </g>
        ))}

        <text x={210} y={260} fill="#e9f2f6" fontSize={18} textAnchor="middle" style={{ fontWeight: 'bold' }}>
          {p.title}
        </text>
      </svg>
    </AbsoluteFill>
  );
};