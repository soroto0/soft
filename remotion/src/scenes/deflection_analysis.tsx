import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const DeflectionAnalysisScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const progress = interpolate(frame, [0, span * 0.8], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const deflection = interpolate(progress, [0, 1], [0, 40], {
    easing: Easing.bezier(0.4, 0, 0.2, 1),
  });

  const arrowScale = interpolate(progress, [0, 1], [0.5, 1], {
    easing: Easing.out(Easing.back(1.5)),
  });

  const layers = [
    { y: 100, label: 'Beton', color: '#8a949b' },
    { y: 115, label: 'Stahlbewehrung', color: '#5d6a73' },
    { y: 125, label: 'Putzschicht', color: '#c9d3d9' },
  ];

  const arrowPositions = [150, 300, 450, 600];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg viewBox="0 0 800 400" width="80%">
        <line x1="100" y1="100" x2="700" y2="100" stroke="#e9f2f6" strokeWidth="2" strokeDasharray="8 8" />
        
        <path
          d={`M 100 100 Q 400 ${100 + deflection} 700 100`}
          fill="none"
          stroke="#e9f2f6"
          strokeWidth="6"
          strokeLinecap="round"
        />

        {layers.map((l, i) => (
          <g key={l.label}>
            <line x1="50" y1={250 + i * 20} x2="150" y2={250 + i * 20} stroke={l.color} strokeWidth="4" />
            <text x="160" y={255 + i * 20} fill="#e9f2f6" fontSize="14" fontFamily="sans-serif">{l.label}</text>
          </g>
        ))}

        {arrowPositions.map((x) => (
          <g key={x} transform={`translate(${x}, ${100 + deflection * 0.5}) scale(${arrowScale})`}>
            <line x1="0" y1="-60" x2="0" y2="-10" stroke="#e0b44c" strokeWidth="4" />
            <path d="M -10 -20 L 0 -10 L 10 -20" fill="none" stroke="#e0b44c" strokeWidth="4" />
          </g>
        ))}

        <text x="400" y="350" fill="#e0b44c" fontSize="20" textAnchor="middle" fontWeight="bold">
          {Math.round(deflection * 2.5)} mm Last-Durchbiegung
        </text>
      </svg>

      {p.title ? (
        <div style={{
          marginTop: 40,
          fontFamily: "'Segoe UI', Arial, sans-serif",
          fontSize: 32,
          color: '#e9f2f6',
          textAlign: 'center',
          textTransform: 'uppercase',
          letterSpacing: '2px'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};