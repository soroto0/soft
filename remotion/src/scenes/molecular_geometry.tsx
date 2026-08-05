import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const MolecularGeometryScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const draw = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const forcePull = interpolate(frame, [span * 0.2, span * 0.8], [0, 15], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textFade = interpolate(frame, [span * 0.4, span * 0.6], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;
  const count = 16;
  const molecules = Array.from({ length: count }).map((_, i) => {
    const angle = (i / count) * Math.PI * 2;
    return {
      x: Math.cos(angle) * 100,
      y: Math.sin(angle) * 100,
      angle,
    };
  });

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 400 400">
        <defs>
          <radialGradient id="grad">
            <stop offset="0%" stopColor="#5b7f9c" />
            <stop offset="50%" stopColor="#4a6b85" />
            <stop offset="100%" stopColor="#2d3e4a" />
          </radialGradient>
          <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#e0b44c" />
          </marker>
        </defs>
        <circle cx="200" cy="200" r={100 * draw} fill="url(#grad)" stroke="#e9f2f6" strokeWidth="1" />
        {molecules.map((m, i) => (
          <g key={i}>
            <circle cx={200 + m.x} cy={200 + m.y} r={4 * draw} fill="#e9f2f6" />
            <line
              x1={200 + m.x}
              y1={200 + m.y}
              x2={200 + m.x - (20 + forcePull) * Math.cos(m.angle)}
              y2={200 + m.y - (20 + forcePull) * Math.sin(m.angle)}
              stroke="#e0b44c"
              strokeWidth="2"
              markerEnd="url(#arrow)"
              opacity={draw}
            />
          </g>
        ))}
        <text x="200" y="200" fill="#e9f2f6" fontSize="12" textAnchor="middle" opacity={textFade}>
          SURFACE TENSION
        </text>
        <text x="200" y="220" fill="#e0b44c" fontSize="10" textAnchor="middle" opacity={textFade}>
          INWARD HYDROGEN BOND PULL
        </text>
      </svg>
      {p.title ? (
        <div style={{
          marginTop: 30,
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