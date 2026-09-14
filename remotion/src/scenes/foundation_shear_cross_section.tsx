import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const FoundationShearCrossSectionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const shear = interpolate(frame, [span * 0.2, span * 0.6], [0, 40], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const signal = interpolate(frame, [span * 0.6, span * 0.8], [0, 1], {
    easing: Easing.bounce,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelRise = interpolate(frame, [0, span], [20, 0], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { name: 'Boden', y: 0, h: 100, fill: '#3a4a54' },
    { name: 'Fundamentplatte', y: 100, h: 40, fill: '#8a949b' },
    { name: 'Pfähle', y: 140, h: 160, fill: '#5d6a73' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 400">
        <defs>
          <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="#e9f2f6" strokeWidth="1" />
          </pattern>
        </defs>

        {layers.map((l, i) => (
          <g key={l.name}>
            <rect x={100} y={l.y + (i === 2 ? shear : 0)} width={200} height={l.h} fill={l.fill} stroke="#e9f2f6" strokeWidth={1} />
            <line x1={80} y1={l.y + l.h / 2 + (i === 2 ? shear : 0)} x2={100} y2={l.y + l.h / 2 + (i === 2 ? shear : 0)} stroke="#e9f2f6" strokeWidth={1} />
            <text x={75} y={l.y + l.h / 2 + (i === 2 ? shear : 0) + 4} fill="#e9f2f6" fontSize={12} textAnchor="end">{l.name}</text>
          </g>
        ))}

        <rect x={100} y={140} width={200} height={160} fill="url(#hatch)" opacity={0.3} />

        <circle cx={200} cy={140 + shear} r={8 * signal} fill="#d0523f" stroke="#e0b44c" strokeWidth={2} />
        
        <line x1={200} y1={140 + shear} x2={240} y2={100} stroke="#e0b44c" strokeWidth={2} />
        <text x={245} y={100} fill="#e0b44c" fontSize={14} fontWeight="bold">BRUCHSTELLE</text>
      </svg>

      {p.title ? (
        <div style={{
          marginTop: 40,
          transform: `translateY(${labelRise}px)`,
          fontFamily: 'sans-serif',
          fontSize: 28,
          color: '#e9f2f6',
          textAlign: 'center'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};