import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const CrossSectionCutScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const draw = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const tension = interpolate(frame, [span * 0.3, span * 0.7], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pulse = interpolate(frame, [0, span], [1, 1.05], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { r: 80, fill: '#5d6a73', label: 'Core' },
    { r: 60, fill: '#8a949b', label: 'Strands' },
    { r: 30, fill: '#c9d3d9', label: 'Center' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 500 400">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#e0b44c" />
          </marker>
        </defs>

        <g transform={`scale(${pulse})`} style={{ transformOrigin: '250px 150px' }}>
          {layers.map((l, i) => (
            <circle key={l.label} cx={250} cy={150} r={l.r * draw} fill={l.fill} stroke="#e9f2f6" strokeWidth={1} />
          ))}
          <line x1={250} y1={150} x2={330} y2={150} stroke="#e9f2f6" strokeWidth={1} />
          <text x={335} y={154} fill="#e9f2f6" fontSize={12}>Ø 150mm</text>
        </g>

        <line x1={150} y1={250} x2={350} y2={250} stroke="#e9f2f6" strokeWidth={2} />
        <text x={250} y={280} fill="#e9f2f6" fontSize={14} textAnchor="middle">Bodenanker</text>

        {[0, 1, 2, 3].map((i) => (
          <line key={i} x1={180 + i * 50} y1={180} x2={180 + i * 50} y2={250 - 20 * tension} 
                stroke="#e0b44c" strokeWidth={3} markerEnd="url(#arrow)" opacity={tension} />
        ))}

        <text x={250} y={350} fill="#e0b44c" fontSize={16} textAnchor="middle" opacity={tension}>
          Vorspannung: {Math.round(tension * 5000)} Tonnen
        </text>
      </svg>
      {p.title ? (
        <div style={{ marginTop: 20, fontFamily: 'sans-serif', fontSize: 24, color: '#e9f2f6' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};