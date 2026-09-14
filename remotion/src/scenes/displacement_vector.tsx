import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const DisplacementVectorScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const slide = interpolate(frame, [span * 0.1, span * 0.9], [0, 60], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const arrowOpacity = interpolate(frame, [span * 0.2, span * 0.4], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelRise = interpolate(frame, [0, span], [20, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const strutPoints = `100,200 300,100 310,120 110,220`;
  const basePoints = `80,220 320,220 320,250 80,250`;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 400 300">
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#d0523f" />
          </marker>
        </defs>

        <polygon points={basePoints} fill="#5d6a73" stroke="#e9f2f6" strokeWidth={1} />
        <text x={200} y={240} fill="#e9f2f6" fontSize={12} textAnchor="middle">Basis</text>

        <g style={{ transform: `translate(${-slide * 0.8}px, ${-slide * 0.4}px)` }}>
          <polygon points={strutPoints} fill="#8a949b" stroke="#e9f2f6" strokeWidth={1} />
          <text x={200} y={170} fill="#e9f2f6" fontSize={12} textAnchor="middle" transform="rotate(-26.5 200 170)">Strebe</text>
        </g>

        <line 
          x1={200} y1={150} 
          x2={200 - slide * 0.8} y2={150 - slide * 0.4} 
          stroke="#d0523f" strokeWidth={6} 
          markerEnd="url(#arrowhead)" 
          opacity={arrowOpacity} 
        />

        <text x={150} y={120} fill="#d0523f" fontSize={14} fontWeight="bold" opacity={arrowOpacity}>
          Verschiebung
        </text>

        <line x1={80} y1={220} x2={320} y2={220} stroke="#e9f2f6" strokeWidth={2} strokeDasharray="4 4" />
        <text x={80} y={210} fill="#e9f2f6" fontSize={10}>Kontaktfläche</text>
      </svg>

      {p.title ? (
        <div style={{ 
          marginTop: 20, 
          transform: `translateY(${labelRise}px)`,
          fontFamily: "'Segoe UI', Arial, sans-serif",
          fontSize: 32, 
          color: '#e9f2f6',
          textAlign: 'center'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};