import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const GeographicEscapeRouteScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const orcaAppear = interpolate(frame, [0, span * 0.2], [0, 1], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const sharkEscape = interpolate(frame, [span * 0.25, span * 0.7], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pathFade = interpolate(frame, [span * 0.6, span * 0.9], [1, 0], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const grid = [0, 1, 2, 3, 4];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 500 300">
        <defs>
          <linearGradient id="ocean" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5b7f9c" />
            <stop offset="0.5" stopColor="#3a5a75" />
            <stop offset="1" stopColor="#1e2d3a" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="500" height="300" fill="url(#ocean)" rx="4" />
        <path d="M 0 100 Q 100 80 150 150 T 300 200 T 500 150" fill="none" stroke="#e9f2f6" strokeWidth="2" />
        <text x="10" y="280" fill="#e9f2f6" fontSize="12" opacity="0.6">SÜDAFRIKA KÜSTE</text>
        
        <circle cx="120" cy="130" r={6 * orcaAppear} fill="#d0523f" />
        <text x="120" y="115" fill="#d0523f" fontSize="10" opacity={orcaAppear} textAnchor="middle">ORCA</text>

        <line x1="150" y1="150" x2={150 + 300 * sharkEscape} y2={150 - 50 * sharkEscape} 
              stroke="#e0b44c" strokeWidth="3" strokeDasharray="6 4" opacity={pathFade} />
        
        <circle cx={150 + 300 * sharkEscape} cy={150 - 50 * sharkEscape} r="4" fill="#e0b44c" />
        
        {grid.map((i) => (
          <g key={i}>
            <line x1={50 + i * 100} y1="290" x2={50 + i * 100} y2="300" stroke="#e9f2f6" strokeWidth="1" />
            <text x={50 + i * 100} y="285" fill="#e9f2f6" fontSize="8" textAnchor="middle">{i * 50}km</text>
          </g>
        ))}
      </svg>
      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: 32, color: '#e9f2f6', fontWeight: 'bold' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};