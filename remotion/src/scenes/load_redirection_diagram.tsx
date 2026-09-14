import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const LoadRedirectionDiagramScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const verticalProgress = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const horizontalProgress = interpolate(frame, [span * 0.4, span * 0.8], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const beamScale = interpolate(frame, [span * 0.4, span * 0.6, span * 0.8], [1, 1.2, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const walls = [
    { x: 100, label: 'WAND A' },
    { x: 360, label: 'WAND B' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 500 300">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#d0523f" />
          </marker>
        </defs>

        {walls.map((w) => (
          <g key={w.label}>
            <rect x={w.x} y={120} width={40} height={130} fill="#5d6a73" stroke="#e9f2f6" strokeWidth={2} />
            <text x={w.x + 20} y={270} fill="#e9f2f6" fontSize={12} textAnchor="middle">{w.label}</text>
          </g>
        ))}

        <rect x={140} y={110} width={220} height={15} fill="#e0b44c" transform={`scale(${beamScale}, 1)`} transform-origin="250 117.5" />
        <text x={250} y={100} fill="#e0b44c" fontSize={12} textAnchor="middle">STAHLTRÄGER</text>

        <line x1={250} y1={20} x2={250} y2={110 * verticalProgress} stroke="#d0523f" strokeWidth={8} markerEnd="url(#arrow)" />
        
        <line x1={250} y1={117.5} x2={250 - 110 * horizontalProgress} y2={117.5} stroke="#d0523f" strokeWidth={8} markerEnd="url(#arrow)" />
        <line x1={250} y1={117.5} x2={250 + 110 * horizontalProgress} y2={117.5} stroke="#d0523f" strokeWidth={8} markerEnd="url(#arrow)" />

        <text x={250} y={40} fill="#d0523f" fontSize={14} textAnchor="middle" opacity={verticalProgress}>LAST</text>
      </svg>
      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: 32, color: '#e9f2f6', textAlign: 'center' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};