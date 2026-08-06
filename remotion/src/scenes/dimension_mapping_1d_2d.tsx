import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const DimensionMapping1d2dScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = (p.dur || 6) * fps;

  const progress = interpolate(frame, [0, duration], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const lineExpand = interpolate(frame, [0, duration * 0.4], [0, 1], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const gridReveal = interpolate(frame, [duration * 0.3, duration * 0.9], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;
  const points = Array.from({ length: 12 }, (_, i) => i / 11);

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 600 400">
        <text x="300" y="30" fill="#e9f2f6" fontSize="24" textAnchor="middle" style={{ fontFamily: 'sans-serif' }}>
          {p.title}
        </text>

        <g transform="translate(50, 150)">
          <line x1="0" y1="0" x2={500 * lineExpand} y2="0" stroke="#e0b44c" strokeWidth="2" />
          {points.map((val) => (
            <circle key={`l-${val}`} cx={500 * val * lineExpand} cy="0" r="4" fill="#e0b44c" />
          ))}
          <text x="250" y="30" fill="#e0b44c" fontSize="14" textAnchor="middle">Línea (1D)</text>
        </g>

        <g transform="translate(350, 150)" opacity={gridReveal}>
          <rect x="0" y="0" width="200" height="200" fill="none" stroke="#d0523f" strokeWidth="2" />
          {points.map((valX) =>
            points.map((valY) => (
              <circle 
                key={`p-${valX}-${valY}`} 
                cx={valX * 200} 
                cy={valY * 200} 
                r="2" 
                fill="#d0523f" 
              />
            ))
          )}
          <text x="100" y="230" fill="#d0523f" fontSize="14" textAnchor="middle">Plano (2D)</text>
        </g>

        <path 
          d={`M ${50 + 500 * progress} 150 Q 300 100 350 250`} 
          fill="none" 
          stroke="#e9f2f6" 
          strokeWidth="1" 
          strokeDasharray="4 4"
          opacity={gridReveal}
        />
        
        <g transform="translate(100, 350)">
          <text x="0" y="0" fill="#e9f2f6" fontSize="12">0.0</text>
          <text x="400" y="0" fill="#e9f2f6" fontSize="12" textAnchor="end">1.0</text>
          <line x1="10" y1="-5" x2="390" y2="-5" stroke="#e9f2f6" strokeWidth="1" />
          <text x="200" y="20" fill="#e9f2f6" fontSize="10" textAnchor="middle">Coordenada Normalizada</text>
        </g>
      </svg>
    </AbsoluteFill>
  );
};