import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const MolecularAlignmentScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const align = interpolate(frame, [0, span * 0.6], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const tailWiggle = interpolate(frame, [span * 0.4, span], [0, 1], {
    easing: Easing.inOut(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const fade = interpolate(frame, [0, span * 0.2], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;
  const molecules = Array.from({ length: 8 }).map((_, i) => ({
    x: 60 + i * 40,
    y: 125,
  }));

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 400 250">
        <defs>
          <linearGradient id="tailGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e0b44c" />
            <stop offset="0.5" stopColor="#d0523f" />
            <stop offset="1" stopColor="#5b7f9c" />
          </linearGradient>
        </defs>

        <rect x={0} y={125} width={400} height={10} fill="#e9f2f6" opacity={0.3} />
        <text x={200} y={115} fill="#e9f2f6" fontSize={12} textAnchor="middle" opacity={0.6}>GLASS SURFACE</text>

        {molecules.map((m, i) => (
          <g key={i} transform={`translate(${m.x}, ${m.y})`}>
            <circle cx={0} cy={0} r={12 * align} fill="#e9f2f6" />
            <path
              d={`M 0 12 Q ${10 * Math.sin(tailWiggle * 6)} 50, 0 80`}
              fill="none"
              stroke="url(#tailGrad)"
              strokeWidth={4}
              strokeLinecap="round"
              opacity={align}
            />
          </g>
        ))}

        <line x1={20} y1={210} x2={380} y2={210} stroke="#e9f2f6" strokeWidth={1} strokeDasharray="4 4" />
        <text x={20} y={230} fill="#e9f2f6" fontSize={10}>HYDROPHILIC HEAD</text>
        <text x={380} y={230} fill="#e9f2f6" fontSize={10} textAnchor="end">HYDROPHOBIC TAIL</text>
      </svg>

      {p.title ? (
        <div style={{
          marginTop: 40,
          opacity: fade,
          fontFamily: "'Segoe UI', Arial, sans-serif",
          fontSize: 32,
          color: '#e9f2f6',
          letterSpacing: '0.05em'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};