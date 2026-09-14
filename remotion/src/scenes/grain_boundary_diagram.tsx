import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const GrainBoundaryDiagramScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const progress = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const hAtomMove = interpolate(frame, [0, span * 0.8], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const hAtomAccumulate = interpolate(frame, [span * 0.5, span], [0, 1], {
    easing: Easing.elastic(1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const grains = [
    { x: 50, y: 50, w: 120, h: 120, label: 'G1' },
    { x: 180, y: 50, w: 150, h: 120, label: 'G2' },
    { x: 50, y: 180, w: 150, h: 100, label: 'G3' },
    { x: 210, y: 180, w: 120, h: 100, label: 'G4' },
  ];

  const hAtoms = [
    { x: 175, y: 60 }, { x: 175, y: 100 }, { x: 175, y: 140 },
    { x: 205, y: 200 }, { x: 205, y: 240 },
    { x: 100, y: 175 }, { x: 140, y: 175 }, { x: 180, y: 175 },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 400">
        <defs>
          <linearGradient id="grainGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5b7f9c" />
            <stop offset="0.5" stopColor="#8a949b" />
            <stop offset="1" stopColor="#5b7f9c" />
          </linearGradient>
        </defs>
        {grains.map((g, i) => (
          <rect key={i} x={g.x} y={g.y} width={g.w} height={g.h} 
                fill="url(#grainGrad)" stroke="#e9f2f6" strokeWidth={2} />
        ))}
        {hAtoms.map((h, i) => (
          <circle key={i} cx={h.x + (i % 2 === 0 ? -50 * hAtomMove : 50 * hAtomMove)} 
                  cy={h.y} r={3 + 4 * hAtomAccumulate} fill="#d0523f" />
        ))}
        <line x1={175} y1={50} x2={175} y2={170} stroke="#e0b44c" strokeWidth={3} strokeDasharray="6 4" />
        <line x1={205} y1={180} x2={205} y2={280} stroke="#e0b44c" strokeWidth={3} strokeDasharray="6 4" />
        <line x1={50} y1={175} x2={200} y2={175} stroke="#e0b44c" strokeWidth={3} strokeDasharray="6 4" />
        <text x={200} y={350} fill="#e9f2f6" fontSize={16} textAnchor="middle" opacity={progress}>
          {p.title || "Wasserstoff an Korngrenzen"}
        </text>
        <text x={20} y={380} fill="#e0b44c" fontSize={12}>Korngrenze (Diffusionspfad)</text>
        <circle cx={10} cy={376} r={4} fill="#d0523f" />
        <text x={25} y={395} fill="#d0523f" fontSize={12}>H-Atom</text>
      </svg>
    </AbsoluteFill>
  );
};