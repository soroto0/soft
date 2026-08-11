import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const FatigueCrackPropagationScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = (p.dur || 6) * fps;
  const opacity = p.enter * p.exit;

  const crackProgress = interpolate(frame, [0, duration], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const cycleCount = Math.floor(interpolate(frame, [0, duration], [0, 14000000], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  }));

  const yOffset = interpolate(frame, [0, duration], [0, 10], {
    easing: Easing.bezier(0.5, 0, 0.5, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ticks = [0, 2, 4, 6, 8, 10];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 800 400">
        <defs>
          <linearGradient id="steelGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5d6a73" />
            <stop offset="0.5" stopColor="#8a949b" />
            <stop offset="1" stopColor="#5d6a73" />
          </linearGradient>
        </defs>
        
        <rect x="50" y="100" width="700" height="200" fill="url(#steelGrad)" stroke="#e9f2f6" strokeWidth="2" />
        
        {ticks.map((t) => (
          <g key={t}>
            <line x1={50 + t * 70} y1="300" x2={50 + t * 70} y2="315" stroke="#e9f2f6" strokeWidth="2" />
            <text x={50 + t * 70} y="335" fill="#e9f2f6" fontSize="16" textAnchor="middle">{t * 1.4}M</text>
          </g>
        ))}

        <path d={`M 50 200 L ${50 + 700 * crackProgress} ${200 + Math.sin(crackProgress * 20) * yOffset}`} 
              fill="none" stroke="#d0523f" strokeWidth="6" strokeLinecap="round" />
        
        <circle cx={50 + 700 * crackProgress} cy={200 + Math.sin(crackProgress * 20) * yOffset} r="8" fill="#e0b44c" />
        
        <text x="400" y="80" fill="#e9f2f6" fontSize="24" textAnchor="middle" fontWeight="bold">
          ZYKLEN: {cycleCount.toLocaleString()}
        </text>
        
        <text x="50" y="380" fill="#e9f2f6" fontSize="14">WANDSTÄRKE: 40mm</text>
        <text x="750" y="380" fill="#e9f2f6" fontSize="14" textAnchor="end">RISS-SPITZE</text>
      </svg>

      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: 42, color: '#e9f2f6', fontWeight: 'bold' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};