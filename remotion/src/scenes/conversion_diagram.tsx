import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ConversionDiagramScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = Math.max(1, Math.round((p.dur || 6) * fps));

  const progress = interpolate(frame, [0, duration], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const curveY = interpolate(progress, [0, 1], [50, 180], {
    easing: Easing.inOut(Easing.quad),
  });

  const gearRotation = interpolate(progress, [0, 1], [0, 360], {
    easing: Easing.linear,
  });

  const opacity = p.enter * p.exit;

  const labels = [
    { x: 50, label: 'CULTURA' },
    { x: 200, label: 'TRANSICIÓN' },
    { x: 350, label: 'CIVILIZACIÓN' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 400 250">
        <defs>
          <linearGradient id="curveGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e0b44c" />
            <stop offset="0.5" stopColor="#e9f2f6" />
            <stop offset="1" stopColor="#d0523f" />
          </linearGradient>
        </defs>

        <path d={`M 50 50 Q 200 50 350 ${curveY}`} fill="none" stroke="url(#curveGrad)" strokeWidth="3" />
        
        <line x1="50" y1="200" x2="350" y2="200" stroke="#e9f2f6" strokeWidth="1" />
        <text x="50" y="220" fill="#e9f2f6" fontSize="10" textAnchor="middle">Inicio</text>
        <text x="350" y="220" fill="#e9f2f6" fontSize="10" textAnchor="middle">Final</text>

        {labels.map((l, i) => (
          <text key={i} x={l.x} y="30" fill="#e9f2f6" fontSize="8" textAnchor="middle" opacity={0.7}>{l.label}</text>
        ))}

        <g transform={`translate(350, ${curveY}) rotate(${gearRotation})`}>
          <circle cx="0" cy="0" r="15" fill="none" stroke="#d0523f" strokeWidth="4" strokeDasharray="4 4" />
          <rect x="-2" y="-20" width="4" height="40" fill="#d0523f" />
          <rect x="-20" y="-2" width="40" height="4" fill="#d0523f" />
        </g>

        <text x="350" y={curveY + 40} fill="#d0523f" fontSize="10" textAnchor="middle" fontWeight="bold">DINERO</text>
        
        <g transform="translate(50, 50)">
          <path d="M -10 -10 L 10 -10 L 0 -30 Z" fill="#e0b44c" />
          <text x="0" y="-35" fill="#e0b44c" fontSize="10" textAnchor="middle">ESPÍRITU</text>
        </g>
      </svg>

      {p.title ? (
        <div style={{ 
          marginTop: 40, 
          fontFamily: 'sans-serif', 
          fontSize: 24, 
          color: '#e9f2f6',
          letterSpacing: '0.1em',
          textTransform: 'uppercase'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};