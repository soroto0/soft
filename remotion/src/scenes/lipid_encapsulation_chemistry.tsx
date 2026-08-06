import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const LipidEncapsulationChemistryScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const envelope = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const sink = interpolate(frame, [span * 0.3, span * 0.9], [0, 160], {
    easing: Easing.in(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const arrow = interpolate(frame, [span * 0.5, span * 0.8], [0, 1], {
    easing: Easing.in(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const surfactantPositions = [
    { x: 220, y: 100 }, { x: 240, y: 110 }, { x: 260, y: 130 },
    { x: 260, y: 170 }, { x: 240, y: 190 }, { x: 220, y: 200 },
    { x: 200, y: 190 }, { x: 180, y: 170 }, { x: 180, y: 130 }, { x: 200, y: 110 }
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 440 300">
        <defs>
          <linearGradient id="crystalGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e9f2f6" />
            <stop offset="0.5" stopColor="#c9d3d9" />
            <stop offset="1" stopColor="#8a949b" />
          </linearGradient>
        </defs>

        <line x1={40} y1={50} x2={40} y2={280} stroke="#e9f2f6" strokeWidth={1} />
        <text x={35} y={60} fill="#e9f2f6" fontSize={10} textAnchor="end">WATER</text>
        <text x={35} y={280} fill="#e9f2f6" fontSize={10} textAnchor="end">BOTTOM</text>

        <g style={{ transform: `translateY(${sink}px)` }}>
          <rect x={190} y={120} width={60} height={60} fill="url(#crystalGrad)" stroke="#e9f2f6" strokeWidth={2} />
          {surfactantPositions.map((s, i) => (
            <g key={i} opacity={envelope}>
              <circle cx={s.x} cy={s.y} r={5} fill="#e0b44c" />
              <line x1={s.x} y1={s.y} x2={220} y2={150} stroke="#d0523f" strokeWidth={2} />
            </g>
          ))}
          <path d={`M 220 190 L 220 ${190 + 30 * arrow}`} stroke="#d0523f" strokeWidth={3} markerEnd="url(#arrowhead)" />
        </g>

        <line x1={50} y1={285} x2={390} y2={285} stroke="#d0523f" strokeWidth={2} strokeDasharray="4 4" />
        <text x={220} y={298} fill="#d0523f" fontSize={12} textAnchor="middle">SEDIMENTATION LAYER</text>

        <g transform="translate(300, 50)">
          <circle cx={0} cy={0} r={6} fill="#e0b44c" />
          <text x={15} y={4} fill="#e9f2f6" fontSize={10}>Surfactant Head</text>
          <line x1={0} y1={15} x2={0} y2={30} stroke="#d0523f" strokeWidth={2} />
          <text x={15} y={34} fill="#e9f2f6" fontSize={10}>Lipid Tail</text>
        </g>
      </svg>

      {p.title ? (
        <div style={{ marginTop: 20, fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: 28, color: '#e9f2f6' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};