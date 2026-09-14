import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const PunchingShearDiagramScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const progress = interpolate(frame, [0, span * 0.8], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const columnRise = interpolate(progress, [0, 1], [0, -60], {
    easing: Easing.out(Easing.quad),
  });

  const failureConeOpacity = interpolate(progress, [0.3, 0.6], [0, 0.8], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { y: 180, h: 40, label: 'Bodenplatte', color: '#5d6a73' },
    { y: 150, h: 30, label: 'Dämmschicht', color: '#8a949b' },
    { y: 120, h: 30, label: 'Estrich', color: '#c9d3d9' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 400 300">
        <defs>
          <linearGradient id="failure" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d0523f" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#d0523f" />
          </linearGradient>
        </defs>

        {layers.map((l, i) => (
          <rect key={i} x={50} y={l.y} width={300} height={l.h} fill={l.color} stroke="#e9f2f6" strokeWidth={1} />
        ))}

        <path
          d={`M 150 220 L 250 220 L 280 120 L 120 120 Z`}
          fill="url(#failure)"
          opacity={failureConeOpacity}
        />

        <rect x={175} y={220 + columnRise} width={50} height={80} fill="#e9f2f6" />
        
        <line x1={175} y1={220 + columnRise} x2={150} y2={220} stroke="#d0523f" strokeWidth={2} />
        <line x1={225} y1={220 + columnRise} x2={250} y2={220} stroke="#d0523f" strokeWidth={2} />

        <text x={360} y={195} fill="#e9f2f6" fontSize={10} textAnchor="end">Beton</text>
        <text x={360} y={165} fill="#e9f2f6" fontSize={10} textAnchor="end">Dämmung</text>
        <text x={360} y={135} fill="#e9f2f6" fontSize={10} textAnchor="end">Estrich</text>

        <line x1={100} y1={120} x2={100} y2={220} stroke="#e9f2f6" strokeWidth={1} />
        <text x={90} y={170} fill="#e9f2f6" fontSize={10} transform="rotate(-90 90 170)">Versagenskegel</text>
      </svg>

      {p.title ? (
        <div style={{
          marginTop: 40,
          fontFamily: "'Segoe UI', Arial, sans-serif",
          fontSize: 32,
          color: '#e9f2f6',
          fontWeight: 'bold'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};