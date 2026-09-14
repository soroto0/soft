import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const CrossSectionAnalysisScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const reveal = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const heatFlow = interpolate(frame, [span * 0.2, span * 0.8], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [span * 0.5, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const zones = [
    { id: 0, y: 50, h: 50, color: '#d0523f', label: 'Spröde Zone' },
    { id: 1, y: 100, h: 100, color: '#e0b44c', label: 'Übergang' },
    { id: 2, y: 200, h: 50, color: '#5b7f9c', label: 'Flüssig' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 300">
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d0523f" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#5b7f9c" />
          </linearGradient>
        </defs>
        
        <rect x={100} y={50} width={200} height={200 * reveal} fill="#333" stroke="#e9f2f6" strokeWidth={2} />
        
        {zones.map((z, i) => (
          <g key={z.id} opacity={heatFlow}>
            <rect x={105} y={z.y} width={190} height={z.h} fill={z.color} fillOpacity={0.6} />
            <line x1={300} y1={z.y + z.h / 2} x2={340} y2={z.y + z.h / 2} stroke="#e9f2f6" strokeWidth={1} />
            <text x={345} y={z.y + z.h / 2 + 4} fill="#e9f2f6" fontSize={12} opacity={labelFade}>
              {z.label}
            </text>
          </g>
        ))}

        <path d={`M 80 50 L 80 ${50 + 200 * heatFlow}`} stroke="#e9f2f6" strokeWidth={2} fill="none" />
        <text x={70} y={150} fill="#e9f2f6" fontSize={10} transform="rotate(-90 70 150)" opacity={labelFade}>
          Temperaturgradient
        </text>
      </svg>

      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: 32, color: '#e9f2f6', fontWeight: 'bold' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};