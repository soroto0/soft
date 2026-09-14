import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const WiringFaultLogicScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const draw = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const flow = interpolate(frame, [span * 0.2, span * 0.8], [0, 400], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pulse = interpolate(frame, [span * 0.4, span * 0.9], [0.5, 1.2], {
    easing: Easing.elastic(1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const nodes = [
    { id: 'S_IN', x: 50, y: 80, label: 'STARBOARD IN' },
    { id: 'P_IN', x: 50, y: 160, label: 'PORT IN' },
    { id: 'S_OUT', x: 450, y: 160, label: 'STARBOARD OUT' },
    { id: 'P_OUT', x: 450, y: 80, label: 'PORT OUT' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 500 300">
        <defs>
          <linearGradient id="flowGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#e0b44c" />
            <stop offset="0.5" stopColor="#d0523f" />
            <stop offset="1" stopColor="#e0b44c" />
          </linearGradient>
        </defs>

        {nodes.map((n) => (
          <g key={n.id} opacity={draw}>
            <circle cx={n.x} cy={n.y} r={6} fill="#e9f2f6" />
            <text x={n.x} y={n.y - 15} fill="#e9f2f6" fontSize={10} textAnchor="middle">{n.label}</text>
          </g>
        ))}

        <path d={`M 50 80 L 250 80 L 250 160 L 450 160`} fill="none" stroke="url(#flowGrad)" strokeWidth={4} strokeDasharray="10 5" strokeDashoffset={-flow} opacity={draw} />
        <path d={`M 50 160 L 250 160 L 250 80 L 450 80`} fill="none" stroke="url(#flowGrad)" strokeWidth={4} strokeDasharray="10 5" strokeDashoffset={-flow} opacity={draw} />

        <g transform={`translate(250, 120) scale(${pulse})`}>
          <text x={0} y={10} textAnchor="middle" fill="#d0523f" fontSize={40} fontWeight="bold">X</text>
          <rect x={-20} y={-20} width={40} height={40} fill="none" stroke="#d0523f" strokeWidth={2} />
        </g>

        <text x={250} y={260} fill="#e9f2f6" fontSize={24} textAnchor="middle" style={{ fontFamily: 'sans-serif' }}>{p.title}</text>
      </svg>
    </AbsoluteFill>
  );
};