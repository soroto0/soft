import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const AsymmetricLoadMapScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const draw = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shift = interpolate(frame, [span * 0.4, span * 0.8], [0, 40], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const rise = interpolate(frame, [span * 0.1, span * 0.9], [20, 0], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const points = [
    { id: 0, x: 210, y: 80, label: 'A' },
    { id: 1, x: 120, y: 200, label: 'B' },
    { id: 2, x: 300, y: 200, label: 'C' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 420 300">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#e0b44c" />
          </marker>
        </defs>
        <polygon points="210,80 120,200 300,200" fill="none" stroke="#e9f2f6" strokeWidth="2" strokeDasharray="6 4" opacity={0.5 * draw} />
        {points.map((pt, i) => {
          const isPointA = i === 0;
          const magnitude = isPointA ? 60 + shift : 60;
          return (
            <g key={pt.id}>
              <circle cx={pt.x} cy={pt.y} r={6 * draw} fill="#e9f2f6" />
              <line x1={pt.x} y1={pt.y} x2={pt.x} y2={pt.y - magnitude * draw} 
                    stroke="#e0b44c" strokeWidth={4} markerEnd="url(#arrow)" />
              <text x={pt.x} y={pt.y + 20} fill="#e9f2f6" fontSize={12} textAnchor="middle">{pt.label}</text>
              <text x={pt.x} y={pt.y - magnitude * draw - 10} fill="#e0b44c" fontSize={10} textAnchor="middle" opacity={draw}>
                {Math.round(magnitude)}kN
              </text>
            </g>
          );
        })}
        <text x={210} y={260} fill="#e9f2f6" fontSize={14} textAnchor="middle" style={{ letterSpacing: 1 }}>
          Draufsicht Ankerpunkte
        </text>
      </svg>
      {p.title ? (
        <div style={{ marginTop: 40, transform: `translateY(${rise}px)`, fontFamily: 'sans-serif', fontSize: 32, color: '#e0b44c', fontWeight: 'bold' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};