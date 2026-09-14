import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const LiquidDropModelScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const deformation = interpolate(frame, [0, span * 0.5, span], [0, 1, 0], {
    easing: Easing.inOut(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const elongation = interpolate(deformation, [0, 1], [1, 0.4], {
    easing: Easing.inOut(Easing.quad),
  });

  const verticalStretch = interpolate(deformation, [0, 1], [1, 1.8], {
    easing: Easing.inOut(Easing.quad),
  });

  const points = Array.from({ length: 40 }).map((_, i) => {
    const angle = (i / 40) * Math.PI * 2;
    const x = Math.cos(angle) * 100 * elongation;
    const y = Math.sin(angle) * 100 * verticalStretch;
    return { x, y };
  });

  const forceArrows = [
    { x: 0, y: -120, label: 'F1' },
    { x: 0, y: 120, label: 'F2' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="-150 -150 300 300">
        <defs>
          <radialGradient id="dropGrad">
            <stop offset="0%" stopColor="#e0b44c" />
            <stop offset="50%" stopColor="#d0523f" />
            <stop offset="100%" stopColor="#5b7f9c" />
          </radialGradient>
        </defs>
        
        {points.map((pt, i) => (
          <circle key={i} cx={pt.x} cy={pt.y} r={2.5} fill="#e9f2f6" />
        ))}

        <ellipse cx={0} cy={0} rx={100 * elongation} ry={100 * verticalStretch} 
                 fill="url(#dropGrad)" opacity={0.2} />

        {forceArrows.map((arrow, i) => (
          <g key={i}>
            <line x1={arrow.x} y1={arrow.y * (1 - deformation * 0.3)} 
                  x2={arrow.x} y2={arrow.y * (0.5 + deformation * 0.2)} 
                  stroke="#d0523f" strokeWidth={2} />
            <text x={arrow.x + 10} y={arrow.y * 0.8} fill="#d0523f" fontSize={12}>
              {arrow.label}
            </text>
          </g>
        ))}

        <text x={0} y={145} fill="#e9f2f6" fontSize={12} textAnchor="middle" 
              style={{ letterSpacing: '0.1em' }}>
          ELECTRIC POTENTIAL: {Math.round(deformation * 100)}%
        </text>
      </svg>

      {p.title ? (
        <div style={{ 
          marginTop: 40, 
          fontFamily: "'Segoe UI', Arial, sans-serif", 
          fontSize: 28, 
          color: '#e9f2f6',
          textTransform: 'uppercase'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};