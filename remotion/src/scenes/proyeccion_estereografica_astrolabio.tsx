import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ProyeccionEstereograficaAstrolabioScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const progress = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const sphereScale = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const projection = interpolate(frame, [span * 0.3, span * 0.8], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const gridLines = [0, 1, 2, 3, 4, 5];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 400 400">
        <defs>
          <linearGradient id="stoneGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e9f2f6" />
            <stop offset="0.5" stopColor="#c9d3d9" />
            <stop offset="1" stopColor="#8a949b" />
          </linearGradient>
        </defs>
        
        <circle cx="200" cy="120" r={60 * sphereScale} fill="none" stroke="#e9f2f6" strokeWidth="1" />
        
        {gridLines.map((i) => (
          <g key={i}>
            <line 
              x1={200 - 50 + i * 20} y1={120} 
              x2={200 - 50 + i * 20} y2={120 + 150 * projection} 
              stroke="#e0b44c" strokeWidth="0.5" strokeDasharray="2 2" />
            <circle cx={200 - 50 + i * 20} cy={270} r={2 * projection} fill="#d0523f" />
          </g>
        ))}

        <rect x="50" y="270" width="300" height="10" fill="#2d5a27" />
        <text x="200" y="300" fill="#e9f2f6" fontSize="12" textAnchor="middle" opacity={progress}>
          PLANO DE PROYECCIÓN
        </text>
        
        <line x1="200" y1="60" x2="200" y2="270" stroke="#e9f2f6" strokeWidth="0.5" />
        <text x="210" y="80" fill="#e9f2f6" fontSize="10">POLO</text>
      </svg>

      {p.title ? (
        <div style={{ 
          marginTop: 40, 
          fontFamily: "'Segoe UI', Arial, sans-serif", 
          fontSize: 24, 
          color: '#e9f2f6',
          textAlign: 'center' 
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};