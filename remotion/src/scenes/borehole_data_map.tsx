import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const BoreholeDataMapScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const draw = interpolate(frame, [0, span * 0.5], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const highlight = interpolate(frame, [span * 0.4, span * 0.9], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shift = interpolate(frame, [span * 0.5, span * 0.9], [0, 10], {
    easing: Easing.elastic(1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const soilLayers = [
    { depth: 0, height: 40, label: 'Topsoil', color: '#8b7355' },
    { depth: 40, height: 60, label: 'Sand', color: '#d2b48c' },
    { depth: 100, height: 40, label: 'Blue Clay', color: '#5b7f9c' },
    { depth: 140, height: 100, label: 'Bedrock', color: '#4a4a4a' },
  ];

  const depthTicks = [0, 5, 10, 15, 20, 25];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="60%" viewBox="0 0 400 400">
        <defs>
          <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="#e9f2f6" strokeWidth="1" opacity="0.2" />
          </pattern>
        </defs>
        
        <rect x="120" y="20" width="160" height={240 * draw} fill="#2a2a2a" stroke="#e9f2f6" strokeWidth="2" />
        
        {soilLayers.map((layer, i) => (
          <g key={layer.label}>
            <rect x="120" y={20 + layer.depth * 1.2} width="160" height={layer.height * 1.2 * draw} fill={layer.color} />
            <line x1="120" y1={20 + layer.depth * 1.2} x2="280" y2={20 + layer.depth * 1.2} stroke="#e9f2f6" strokeWidth="1" />
          </g>
        ))}

        <rect x="115" y={140} width="170" height="48" fill="none" stroke="#d0523f" strokeWidth={2 * highlight} strokeDasharray="6 4" />
        
        <line x1="290" y1="164" x2="330" y2="164" stroke="#e0b44c" strokeWidth="2" />
        <text x="335" y="168" fill="#e0b44c" fontSize="14" fontWeight="bold">16m: Soft Blue Clay</text>

        {depthTicks.map((t) => (
          <g key={t}>
            <line x1="110" y1={20 + t * 12} x2="120" y2={20 + t * 12} stroke="#e9f2f6" strokeWidth="1" />
            <text x="100" y={25 + t * 12} fill="#e9f2f6" fontSize="10" textAnchor="end">{t * 1.25}m</text>
          </g>
        ))}
      </svg>
      
      {p.title ? (
        <div style={{ 
          marginTop: 40 + shift, 
          fontFamily: 'sans-serif', 
          fontSize: 32, 
          color: '#e9f2f6',
          textTransform: 'uppercase',
          letterSpacing: '2px'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};