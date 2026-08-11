import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const CrossSectionComparisonScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const grow = interpolate(frame, [0, span * 0.5], [0, 1], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shift = interpolate(frame, [span * 0.3, span * 0.8], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [span * 0.4, span * 0.6], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const circles = [
    { id: 'soll', r: 100, color: '#c9d3d9', label: 'Soll: 25.0 mm', y: -60 },
    { id: 'ist', r: 79.2, color: '#d0523f', label: 'Ist: 19.8 mm', y: 60 },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 600 400">
        <defs>
          <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="#e9f2f6" strokeWidth="1" />
          </pattern>
        </defs>
        
        {circles.map((c, i) => (
          <g key={c.id} transform={`translate(300, 200)`}>
            <circle cx="0" cy={c.y} r={c.r * grow} fill="none" stroke={c.color} strokeWidth="4" />
            <circle cx="0" cy={c.y} r={c.r * grow - 10} fill="url(#hatch)" opacity={0.3} />
            <line x1="0" y1={c.y} x2={120 + i * 20} y2={c.y} stroke="#e9f2f6" strokeWidth="1" strokeDasharray="4 4" />
            <text x={130 + i * 20} y={c.y + 5} fill={c.color} fontSize="18" opacity={labelFade} fontWeight="bold">
              {c.label}
            </text>
          </g>
        ))}

        <path d={`M 300 140 L 300 260`} stroke="#e0b44c" strokeWidth="2" strokeDasharray="2 2" 
              transform={`translate(${shift * 20}, 0)`} />
        <text x="310" y="200" fill="#e0b44c" fontSize="14" opacity={labelFade}>-20% Fläche</text>
      </svg>

      {p.title ? (
        <div style={{
          marginTop: 40,
          fontFamily: "'Segoe UI', Arial, sans-serif",
          fontSize: 32,
          color: '#e9f2f6',
          textTransform: 'uppercase',
          letterSpacing: '0.1em'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};