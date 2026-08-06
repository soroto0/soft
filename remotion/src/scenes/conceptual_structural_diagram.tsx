import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ConceptualStructuralDiagramScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const build = interpolate(frame, [0, span * 0.5], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const dataFade = interpolate(frame, [span * 0.3, span * 0.7], [1, 0.2], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const float = interpolate(frame, [0, span], [0, 15], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const concepts = [
    { x: 120, label: 'Analogía' },
    { x: 240, label: 'Poética' },
    { x: 360, label: 'Metáfora' },
    { x: 480, label: 'Intuición' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 600 400">
        <defs>
          <linearGradient id="beamGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#e0b44c" />
            <stop offset="0.5" stopColor="#d0523f" />
            <stop offset="1" stopColor="#e9f2f6" />
          </linearGradient>
        </defs>

        <rect x={100} y={100 - float} width={400} height={40 * build} fill="url(#beamGrad)" />
        <text x={300} y={80 - float} fill="#e9f2f6" fontSize={20} textAnchor="middle" letterSpacing={2}>ARQUITECTURA TEÓRICA</text>

        {concepts.map((c, i) => (
          <g key={c.label}>
            <rect x={c.x} y={140} width={40} height={120 * build} fill="#e9f2f6" opacity={0.7} />
            <text x={c.x + 20} y={280} fill="#e0b44c" fontSize={12} textAnchor="middle" transform={`rotate(45 ${c.x + 20} 280)`}>{c.label}</text>
            <text x={c.x + 20} y={130} fill="#e9f2f6" fontSize={10} textAnchor="middle">{i + 1}</text>
          </g>
        ))}

        <line x1={100} y1={320} x2={500} y2={320} stroke="#d0523f" strokeWidth={2} strokeDasharray="6 4" opacity={dataFade} />
        <text x={300} y={345} fill="#d0523f" fontSize={14} textAnchor="middle" opacity={dataFade}>EVIDENCIA ARQUEOLÓGICA (0.2)</text>
        
        <g opacity={dataFade}>
          <line x1={150} y1={320} x2={150} y2={340} stroke="#d0523f" strokeWidth={1} />
          <line x1={450} y1={320} x2={450} y2={340} stroke="#d0523f" strokeWidth={1} />
        </g>
      </svg>

      {p.title ? (
        <div style={{ marginTop: 20, fontFamily: 'sans-serif', fontSize: 28, color: '#e9f2f6', fontWeight: '300' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};