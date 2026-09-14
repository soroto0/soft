import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const LoadRedistributionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const collapse = interpolate(frame, [0, span * 0.4], [1, 0], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shift = interpolate(frame, [span * 0.3, span * 0.9], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pulse = interpolate(frame, [0, span], [0, 10], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const struts = [
    { id: 'east', x: 260, label: 'OST' },
    { id: 'west', x: 140, label: 'WEST' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 300">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#e0b44c" />
          </marker>
        </defs>

        <rect x={190} y={50} width={20} height={100} fill="#c9d3d9" />
        <text x={200} y={40} fill="#e9f2f6" fontSize={12} textAnchor="middle">MAST</text>

        {struts.map((s) => (
          <g key={s.id}>
            <line x1={200} y1={150} x2={s.x} y2={220} stroke="#e9f2f6" strokeWidth={4} opacity={s.id === 'east' ? collapse : 1} />
            <text x={s.x} y={240} fill="#e9f2f6" fontSize={10} textAnchor="middle">{s.label}</text>
          </g>
        ))}

        <line x1={260} y1={185} x2={260} y2={220} stroke="#d0523f" strokeWidth={4 * collapse} strokeDasharray="4 2" />
        
        <line x1={140} y1={185} x2={140} y2={220 + (20 * shift)} stroke="#e0b44c" strokeWidth={4 + (8 * shift)} markerEnd="url(#arrow)" />
        
        {[0, 1, 2, 3].map((i) => (
          <line key={i} x1={200} y1={150} x2={140} y2={220} stroke="#e0b44c" strokeWidth={1} opacity={shift * 0.5} strokeDasharray="2 2" />
        ))}

        <text x={140} y={260} fill="#e0b44c" fontSize={12} textAnchor="middle" style={{ fontWeight: 'bold' }}>
          LAST: {Math.round(100 + 150 * shift)}%
        </text>

        <text x={260} y={260} fill="#d0523f" fontSize={12} textAnchor="middle" opacity={collapse}>
          VERSAGEN
        </text>
      </svg>
      {p.title ? (
        <div style={{ marginTop: 20, fontFamily: 'sans-serif', fontSize: 32, color: '#e9f2f6', letterSpacing: 1 + (pulse % 1) }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};