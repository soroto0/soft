import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const CircuitFlowDiagramScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const waterFlow = interpolate(frame, [0, span * 0.5], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shortCircuit = interpolate(frame, [span * 0.4, span * 0.6], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const valveAction = interpolate(frame, [span * 0.5, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const nodes = [
    { id: 'source', x: 50, y: 150, label: 'PWR' },
    { id: 'valve', x: 350, y: 150, label: 'VALVE' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 600 300">
        <defs>
          <linearGradient id="waterGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#5b7f9c" />
            <stop offset="0.5" stopColor="#8a949b" />
            <stop offset="1" stopColor="#5b7f9c" />
          </linearGradient>
        </defs>

        <path d="M 80 150 L 350 150" stroke="#e9f2f6" strokeWidth="4" />
        
        <path d={`M 200 150 L 200 ${150 + 100 * waterFlow}`} stroke="url(#waterGrad)" strokeWidth="8" strokeDasharray="10 5" />
        <text x={210} y={200 + 50 * waterFlow} fill="#5b7f9c" fontSize="14">WATER INGRESS</text>

        <path d="M 200 250 L 350 250 L 350 170" stroke="#d0523f" strokeWidth="4" strokeDasharray="4 4" opacity={shortCircuit} />
        <text x={275} y={270} fill="#d0523f" fontSize="14" opacity={shortCircuit}>SHORT CIRCUIT</text>

        {nodes.map((n) => (
          <g key={n.id}>
            <rect x={n.x - 40} y={n.y - 30} width={80} height={60} fill="none" stroke="#e9f2f6" strokeWidth="2" />
            <text x={n.x} y={n.y + 5} fill="#e9f2f6" fontSize="16" textAnchor="middle">{n.label}</text>
          </g>
        ))}

        <rect x={340} y={150 - 20 * valveAction} width={20} height={40} fill="#e0b44c" />
        <text x={350} y={100} fill="#e0b44c" fontSize="20" textAnchor="middle" opacity={valveAction}>OPENED</text>
      </svg>

      {p.title ? (
        <div style={{
          marginTop: 50,
          fontFamily: 'sans-serif',
          fontSize: 32,
          color: '#e9f2f6',
          textAlign: 'center'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};