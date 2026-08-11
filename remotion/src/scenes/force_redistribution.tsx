import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ForceRedistributionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const pulse = interpolate(frame, [0, span * 0.5, span], [1, 1.2, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const arrowLength = interpolate(frame, [0, span * 0.7], [20, 80], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const stress = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shoulderPoints = [
    { x: 160, y: 100, label: 'L' },
    { x: 260, y: 100, label: 'R' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="60%" viewBox="0 0 420 300">
        <defs>
          <linearGradient id="forceGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#d0523f" />
          </linearGradient>
        </defs>
        
        <g transform={`scale(${pulse})`} transform-origin="210 150">
          <path d="M 160 100 L 260 100 L 240 250 L 180 250 Z" fill="#e9f2f6" opacity="0.1" stroke="#e9f2f6" strokeWidth="2" />
          <circle cx="160" cy="100" r="15" fill="none" stroke="#e0b44c" strokeWidth="2" />
          <circle cx="260" cy="100" r="15" fill="none" stroke="#e0b44c" strokeWidth="2" />
        </g>

        {shoulderPoints.map((pt) => (
          <g key={pt.label}>
            <line x1={pt.x} y1={pt.y - 20} x2={pt.x} y2={pt.y - 20 - arrowLength} 
                  stroke="url(#forceGrad)" strokeWidth="4" strokeLinecap="round" />
            <polygon points={`${pt.x},${pt.y - 20 - arrowLength} ${pt.x - 5},${pt.y - 10 - arrowLength} ${pt.x + 5},${pt.y - 10 - arrowLength}`} 
                     fill="#d0523f" />
            <text x={pt.x} y={pt.y - 30 - arrowLength} fill="#e9f2f6" fontSize="12" textAnchor="middle">F={Math.round(stress * 100)}N</text>
          </g>
        ))}

        {[0, 1, 2, 3, 4, 5].map((i) => (
          <line key={i} x1={180 + i * 10} y1={250} x2={180 + i * 10} y2={260 + (i % 2) * 5} stroke="#e9f2f6" strokeWidth="1" />
        ))}
        
        <text x="210" y="280" fill="#e9f2f6" fontSize="14" textAnchor="middle" letterSpacing="1">TENDON LOAD DISTRIBUTION</text>
      </svg>
      
      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: 'sans-serif', fontSize: 24, color: '#e9f2f6', fontWeight: 'bold' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};