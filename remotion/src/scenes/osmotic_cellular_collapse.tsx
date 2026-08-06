import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const OsmoticCellularCollapseScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const collapse = interpolate(frame, [0, span], [1, 0.4], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const flow = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const waterMolecules = [
    { startX: 200, startY: 100 }, { startX: 220, startY: 120 },
    { startX: 200, startY: 140 }, { startX: 220, startY: 160 },
    { startX: 200, startY: 180 }, { startX: 220, startY: 200 }
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 500 300">
        <defs>
          <linearGradient id="saltGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#5b7f9c" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#d0523f" />
          </linearGradient>
        </defs>

        <rect x={350} y={50} width={100} height={200} fill="#d0523f" opacity={0.1} />
        <text x={400} y={40} fill="#d0523f" fontSize={12} textAnchor="middle">HIGH SALT</text>
        
        <g transform={`scale(${collapse}, 1)`}>
          <rect x={150} y={75} width={100} height={150} fill="#5b7f9c" opacity={0.3} stroke="#e9f2f6" strokeWidth={2} />
          <text x={200} y={150} fill="#e9f2f6" fontSize={12} textAnchor="middle">CYTOPLASM</text>
          <line x1={250} y1={75} x2={250} y2={225} stroke="#e0b44c" strokeWidth={4} />
          <text x={260} y={150} fill="#e0b44c" fontSize={10}>CELL WALL</text>
        </g>

        {waterMolecules.map((m, i) => (
          <g key={i} opacity={interpolate(flow, [0, 0.2, 1], [0, 1, 0])}>
            <circle cx={m.startX + flow * 150} cy={m.startY} r={4} fill="#e9f2f6" />
            <path d={`M ${m.startX} ${m.startY} L ${m.startX + flow * 150} ${m.startY}`} stroke="#e9f2f6" strokeWidth={1} strokeDasharray="2 2" />
          </g>
        ))}

        <line x1={50} y1={260} x2={450} y2={260} stroke="#e9f2f6" strokeWidth={1} />
        <text x={50} y={280} fill="#e9f2f6" fontSize={10}>0% SALT</text>
        <text x={450} y={280} fill="#e9f2f6" fontSize={10} textAnchor="end">100% SALT</text>
        <rect x={50} y={255} width={400} height={10} fill="url(#saltGrad)" />
      </svg>
      {p.title ? (
        <div style={{ marginTop: 20, fontFamily: 'sans-serif', fontSize: 32, color: '#e9f2f6', fontWeight: 'bold' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};