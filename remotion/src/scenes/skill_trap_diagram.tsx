import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const SkillTrapDiagramScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const scale = interpolate(frame, [0, span], [1, 2.5], {
    easing: Easing.bezier(0.4, 0, 0.2, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const wobble = interpolate(frame, [0, span], [0, 10], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shift = interpolate(frame, [0, span], [0, 20], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const zones = [
    { label: 'OFICIO', color: '#e9f2f6', pos: 0 },
    { label: 'POLÍTICA', color: '#e0b44c', pos: 120 },
    { label: 'ÉTICA', color: '#d0523f', pos: 240 },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 500 500">
        <defs>
          <radialGradient id="grad">
            <stop offset="0%" stopColor="#e9f2f6" />
            <stop offset="50%" stopColor="#e0b44c" />
            <stop offset="100%" stopColor="#d0523f" />
          </radialGradient>
        </defs>
        <g transform={`translate(250, 250) rotate(${Math.sin(frame / 5) * wobble})`}>
          <circle r={80 * scale} fill="url(#grad)" opacity={0.3} stroke="#e9f2f6" strokeWidth={2} />
          <circle r={80} fill="#222" />
          {zones.map((z, i) => {
            const angle = (z.pos * Math.PI) / 180;
            const x = Math.cos(angle) * (80 * scale * 0.7);
            const y = Math.sin(angle) * (80 * scale * 0.7);
            return (
              <g key={z.label}>
                <line x1={0} y1={0} x2={x} y2={y} stroke={z.color} strokeWidth={1} strokeDasharray="4 4" />
                <circle cx={x} cy={y} r={5} fill={z.color} />
                <text x={x} y={y - 15} fill={z.color} fontSize={16} textAnchor="middle" fontWeight="bold">
                  {z.label}
                </text>
              </g>
            );
          })}
        </g>
        <rect x={100} y={420 + shift} width={300} height={2} fill="#e9f2f6" />
        <text x={250} y={460 + shift} fill="#e9f2f6" fontSize={24} textAnchor="middle" style={{ fontFamily: 'sans-serif' }}>
          {p.title}
        </text>
        <text x={250} y={485 + shift} fill="#e0b44c" fontSize={14} textAnchor="middle">
          ESTABILIDAD TÉCNICA VS. ALCANCE CONCEPTUAL
        </text>
      </svg>
    </AbsoluteFill>
  );
};