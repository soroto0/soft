import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const RockFractureSchematicScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const draw = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const crackOpen = interpolate(frame, [span * 0.4, span * 0.8], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [span * 0.6, span * 0.9], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const matrixLayers = [
    { y: 50, h: 40, label: 'GLASIGE KRUSTE' },
    { y: 90, h: 80, label: 'RHYOLITH-MATRIX' },
    { y: 170, h: 50, label: 'BASIS-GESTEIN' },
  ];

  const gridLines = [0, 1, 2, 3, 4, 5, 6];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 300">
        <defs>
          <linearGradient id="rockGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5d6a73" />
            <stop offset="0.5" stopColor="#8a949b" />
            <stop offset="1" stopColor="#c9d3d9" />
          </linearGradient>
        </defs>

        {matrixLayers.map((layer, i) => (
          <g key={layer.label}>
            <rect x={50} y={layer.y} width={300 * draw} height={layer.h} fill="url(#rockGrad)" stroke="#e9f2f6" strokeWidth={0.5} />
            <text x={40} y={layer.y + layer.h / 2 + 4} fill="#e9f2f6" fontSize={8} textAnchor="end" opacity={draw}>{layer.label}</text>
            <line x1={50 + 300 * draw} y1={layer.y + layer.h / 2} x2={370} y2={layer.y + layer.h / 2} stroke="#e9f2f6" strokeWidth={0.5} strokeDasharray="2 2" />
          </g>
        ))}

        {gridLines.map((g) => (
          <line key={g} x1={50 + g * 50} y1={50} x2={50 + g * 50} y2={220} stroke="#e9f2f6" strokeWidth={0.2} opacity={0.3 * draw} />
        ))}

        <path d={`M 200 50 L 200 ${50 + 170 * draw} L ${200 + 10 * crackOpen} ${50 + 170 * draw} L ${200 + 10 * crackOpen} 50 Z`} fill="#d0523f" />
        
        <line x1={200} y1={40} x2={210 + 10 * crackOpen} y2={40} stroke="#e0b44c" strokeWidth={1} />
        <text x={205 + 5 * crackOpen} y={35} fill="#e0b44c" fontSize={10} textAnchor="middle" opacity={labelFade}>0.5m FISSURE</text>
      </svg>

      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: 'sans-serif', fontSize: 28, color: '#e9f2f6', fontWeight: 'bold', letterSpacing: '0.05em' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};