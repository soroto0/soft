import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ElenchosDeconstructionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const collapse = interpolate(frame, [span * 0.3, span * 0.8], [0, 1], {
    easing: Easing.in(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const impact = interpolate(frame, [span * 0.2, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.back(2)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const float = interpolate(frame, [0, span], [0, 20], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const blocks = [
    { id: 0, x: 180, y: 100, dx: -50, dy: -60 },
    { id: 1, x: 240, y: 100, dx: 50, dy: -60 },
    { id: 2, x: 180, y: 160, dx: -80, dy: 40 },
    { id: 3, x: 240, y: 160, dx: 80, dy: 40 },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 420 300">
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e9f2f6" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#d0523f" />
          </linearGradient>
        </defs>
        
        <g transform={`translate(${collapse * 20}, ${collapse * 50})`}>
          {blocks.map((b) => (
            <rect
              key={b.id}
              x={b.x + b.dx * collapse}
              y={b.y + b.dy * collapse}
              width={50}
              height={50}
              fill="url(#grad)"
              stroke="#e9f2f6"
              strokeWidth={2}
              transform={`rotate(${collapse * 45}, ${b.x + 25}, ${b.y + 25})`}
            />
          ))}
          <rect x={180} y={100} width={110} height={110} fill="none" stroke="#e9f2f6" strokeWidth={2} strokeDasharray="4 4" />
        </g>

        <circle cx={235} cy={155} r={10 * impact} fill="#d0523f" />
        <line x1={235} y1={155} x2={235 - 60 * impact} y2={155 - 60 * impact} stroke="#e0b44c" strokeWidth={3} />
        
        <text x={235} y={140} fill="#e9f2f6" fontSize={12} textAnchor="middle" opacity={1 - collapse}>PREGUNTA</text>
        
        <g transform={`translate(0, ${float})`}>
          <text x={210} y={260} fill="#e9f2f6" fontSize={24} fontWeight="bold" letterSpacing={1}>
            {p.title || "Desmontaje del Elenchos"}
          </text>
        </g>
      </svg>
    </AbsoluteFill>
  );
};