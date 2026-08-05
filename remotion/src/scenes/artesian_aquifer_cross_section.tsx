import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ArtesianAquiferCrossSectionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const drillDepth = interpolate(frame, [0, span * 0.6], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pressurePulse = interpolate(frame, [span * 0.5, span * 0.9], [0, 1], {
    easing: Easing.elastic(1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const captionRise = interpolate(frame, [0, span * 0.2], [20, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const layers = [
    { y: 0, h: 60, fill: '#5d6a73', label: 'Topsoil' },
    { y: 60, h: 80, fill: '#8a949b', label: 'Clay Cap' },
    { y: 140, h: 40, fill: '#e0b44c', label: 'Aquifer' },
    { y: 180, h: 40, fill: '#c9d3d9', label: 'Bedrock' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 300">
        <defs>
          <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5b7f9c" />
            <stop offset="0.5" stopColor="#8bb0ce" />
            <stop offset="1" stopColor="#5b7f9c" />
          </linearGradient>
        </defs>

        {layers.map((l, i) => (
          <g key={l.label}>
            <rect x={50} y={l.y} width={300} height={l.h} fill={l.fill} stroke="#e9f2f6" strokeWidth={0.5} />
            <text x={40} y={l.y + l.h / 2 + 4} fill="#e9f2f6" fontSize={10} textAnchor="end">{l.label}</text>
            <line x1={45} y1={l.y + l.h / 2} x2={50} y2={l.y + l.h / 2} stroke="#e9f2f6" strokeWidth={0.5} />
          </g>
        ))}

        <rect x={180} y={0} width={40} height={140 * drillDepth} fill="#d0523f" />
        
        <line x1={200} y1={140} x2={200} y2={140 + 20 * pressurePulse} stroke="#e0b44c" strokeWidth={4} strokeDasharray="2 2" />
        
        <text x={200} y={130} fill="#d0523f" fontSize={12} textAnchor="middle" fontWeight="bold">DRILL</text>
        
        <text x={250} y={165} fill="#e9f2f6" fontSize={9}>P: 4.2 MPa</text>
        <text x={250} y={175} fill="#e9f2f6" fontSize={9}>T: 12°C</text>
      </svg>

      {p.title ? (
        <div style={{ 
          marginTop: 40, 
          opacity: captionRise,
          fontFamily: 'sans-serif', 
          fontSize: 32, 
          color: '#e9f2f6',
          letterSpacing: '0.05em'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};