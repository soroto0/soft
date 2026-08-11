import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const PulleyMechanicsScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const drop = interpolate(frame, [0, span * 0.6], [0, 150], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const tension = interpolate(frame, [span * 0.6, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.elastic(1)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const arrowScale = interpolate(frame, [span * 0.6, span * 0.8], [0.5, 1.5], {
    easing: Easing.out(Easing.back(2)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const bodyY = 100 + drop;
  const ropePoints = `M 200 20 L 200 ${bodyY} M 200 20 L 300 20 L 300 250`;

  const labels = [
    { x: 180, y: 150, text: 'PESO (G)' },
    { x: 320, y: 150, text: 'TRACCIÓN' },
    { x: 200, y: 10, text: 'POLEA' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 500 400">
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#e0b44c" />
          </marker>
        </defs>
        
        <circle cx="200" cy="20" r="15" fill="none" stroke="#e9f2f6" strokeWidth="3" />
        <path d={ropePoints} fill="none" stroke="#e9f2f6" strokeWidth="2" strokeDasharray="4 2" />
        
        <rect x="180" y={bodyY} width="40" height="80" fill="#8a949b" />
        <line x1="180" y1={bodyY + 20} x2="160" y2={bodyY + 20} stroke="#d0523f" strokeWidth="4" />
        <line x1="220" y1={bodyY + 20} x2="240" y2={bodyY + 20} stroke="#d0523f" strokeWidth="4" />

        <line x1="200" y1={bodyY - 20} x2="200" y2={bodyY - 60} stroke="#e0b44c" strokeWidth="4" 
              markerEnd="url(#arrowhead)" transform={`scale(1, ${arrowScale})`} transform-origin="200 100" />
        
        <line x1="300" y1="100" x2="300" y2="200" stroke="#e0b44c" strokeWidth="4" 
              markerEnd="url(#arrowhead)" opacity={tension} />

        {labels.map((l) => (
          <text key={l.text} x={l.x} y={l.y} fill="#e9f2f6" fontSize="14" fontFamily="sans-serif">
            {l.text}
          </text>
        ))}
      </svg>
      {p.title ? (
        <div style={{ marginTop: 40, color: '#e9f2f6', fontSize: 32, fontFamily: 'sans-serif', fontWeight: 'bold' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};