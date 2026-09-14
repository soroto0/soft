import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const TorsionDiagramScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const twist = interpolate(frame, [0, span], [0, 15], {
    easing: Easing.inOut(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const arrowPulse = interpolate(frame, [0, span / 2, span], [0.6, 1, 0.6], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [0, span * 0.2], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const nodes = [
    { id: 1, y: 50 },
    { id: 2, y: 150 },
    { id: 3, y: 250 },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="60%" viewBox="0 0 400 400">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#e0b44c" />
          </marker>
        </defs>
        
        {nodes.map((node) => (
          <g key={node.id} transform={`rotate(${twist * (node.id - 1)}, 200, ${node.y})`}>
            <rect x="150" y={node.y - 5} width="100" height="10" fill="#c9d3d9" />
            <circle cx="150" cy={node.y} r="6" fill="#e9f2f6" />
            <circle cx="250" cy={node.y} r="6" fill="#e9f2f6" />
          </g>
        ))}

        <path d="M 150 50 L 150 250 M 250 50 L 250 250" stroke="#5d6a73" strokeWidth="2" strokeDasharray="4 4" />

        <path d="M 280 120 A 40 40 0 0 1 280 180" fill="none" stroke="#e0b44c" strokeWidth="3" markerEnd="url(#arrow)" opacity={arrowPulse} />
        <path d="M 120 180 A 40 40 0 0 1 120 120" fill="none" stroke="#e0b44c" strokeWidth="3" markerEnd="url(#arrow)" opacity={arrowPulse} />

        <text x="200" y="320" fill="#e0b44c" fontSize="14" textAnchor="middle" opacity={labelFade}>TORSIONSKRAFT</text>
        <text x="200" y="340" fill="#e9f2f6" fontSize="10" textAnchor="middle" opacity={labelFade}>120m MASTSEGMENT</text>
      </svg>

      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: 'sans-serif', fontSize: 32, color: '#e9f2f6', fontWeight: 'bold' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};