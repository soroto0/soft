import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ProcessFlowScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const draw = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const flow = interpolate(frame, [span * 0.2, span * 0.6], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const exile = interpolate(frame, [span * 0.5, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 800 400" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="pathGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#d0523f" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#e9f2f6" />
          </linearGradient>
        </defs>

        <g opacity={draw}>
          <rect x={50} y={150} width={180} height={100} fill="none" stroke="#d0523f" strokeWidth={2} />
          <text x={140} y={205} fill="#e9f2f6" fontSize={24} textAnchor="middle">ACUSACIÓN</text>
          <text x={140} y={230} fill="#d0523f" fontSize={14} textAnchor="middle">ADULTERIO</text>
        </g>

        <g opacity={flow}>
          <rect x={310} y={150} width={180} height={100} fill="none" stroke="#e0b44c" strokeWidth={2} />
          <rect x={320} y={160} width={160} height={80} fill="#2a2a2a" stroke="#e0b44c" strokeWidth={1} />
          {[0, 1, 2, 3].map((i) => (
            <line key={i} x1={330 + i * 40} y1={160} x2={330 + i * 40} y2={240} stroke="#e0b44c" strokeWidth={2} />
          ))}
          <text x={400} y={205} fill="#e9f2f6" fontSize={24} textAnchor="middle">PRISIÓN</text>
        </g>

        <line x1={230} y1={200} x2={310 * flow} y2={200} stroke="#e9f2f6" strokeWidth={4} />
        <polygon points="310,200 290,190 290,210" fill="#e9f2f6" opacity={flow} />

        <g opacity={exile} transform={`translate(${200 * exile}, 0)`}>
          <rect x={570} y={150} width={180} height={100} fill="none" stroke="#e9f2f6" strokeWidth={2} />
          <text x={660} y={205} fill="#e9f2f6" fontSize={24} textAnchor="middle">CÓRCEGA</text>
          <path d="M 490 200 L 570 200" stroke="url(#pathGrad)" strokeWidth={6} strokeDasharray="8 4" />
          <polygon points="570,200 550,190 550,210" fill="#e9f2f6" />
        </g>

        <text x={400} y={350} fill="#e9f2f6" fontSize={20} textAnchor="middle" style={{ letterSpacing: '2px' }}>
          {p.title || "El camino al exilio"}
        </text>
      </svg>
    </AbsoluteFill>
  );
};