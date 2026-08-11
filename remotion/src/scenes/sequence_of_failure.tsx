import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const SequenceOfFailureScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const s1 = interpolate(frame, [span * 0.1, span * 0.3], [1, 0], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const s2 = interpolate(frame, [span * 0.4, span * 0.6], [1, 0], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const s3 = interpolate(frame, [span * 0.7, span * 0.9], [1, 0], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { id: 1, y: 80, color: '#e0b44c', label: 'DEFINICIÓN A PRIORI' },
    { id: 2, y: 130, color: '#d0523f', label: 'PREMISA LÓGICA' },
    { id: 3, y: 180, color: '#e9f2f6', label: 'VALOR ABSOLUTO' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 400 300">
        <text x="200" y="30" fill="#e9f2f6" fontSize="20" textAnchor="middle" style={{ fontWeight: 'bold' }}>
          {p.title}
        </text>
        
        <g stroke="#e9f2f6" strokeWidth="1" strokeDasharray="2 2">
          <line x1="100" y1="70" x2="100" y2="240" />
          <line x1="300" y1="70" x2="300" y2="240" />
        </g>
        <text x="100" y="260" fill="#e9f2f6" fontSize="10" textAnchor="middle">INICIO</text>
        <text x="300" y="260" fill="#e9f2f6" fontSize="10" textAnchor="middle">FINAL</text>

        {layers.map((layer, i) => {
          const v = i === 0 ? s1 : i === 1 ? s2 : s3;
          return (
            <g key={layer.id} opacity={v}>
              <rect x="100" y={layer.y} width="200" height="40" fill={layer.color} fillOpacity={0.2} stroke={layer.color} strokeWidth="2" />
              <text x="200" y={layer.y + 25} fill={layer.color} fontSize="12" textAnchor="middle" style={{ fontWeight: 'bold' }}>
                {layer.label}
              </text>
              <line x1="50" y1={layer.y + 20} x2="100" y2={layer.y + 20} stroke="#e9f2f6" strokeWidth="1" />
              <text x="45" y={layer.y + 24} fill="#e9f2f6" fontSize="10" textAnchor="end">RÉPLICA {layer.id}</text>
            </g>
          );
        })}

        <rect x="190" y="70" width="20" height="170" fill="none" stroke="#e9f2f6" strokeWidth="1" strokeDasharray="4 4" />
        <text x="200" y="160" fill="#e9f2f6" fontSize="10" textAnchor="middle" opacity={s3}>NÚCLEO</text>
        <text x="200" y="175" fill="#e9f2f6" fontSize="10" textAnchor="middle" opacity={s3}>VACÍO</text>
      </svg>
    </AbsoluteFill>
  );
};