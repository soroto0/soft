import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const CondensationFlushCoverageScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const flow = interpolate(frame, [0, span * 0.8], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const residue = interpolate(frame, [span * 0.2, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const captionRise = interpolate(frame, [0, span * 0.2], [20, 0], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const coilHeight = 300;
  const coilWidth = 100;
  const centerX = 210;
  const centerY = 125;

  const fins = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 420 350">
        <defs>
          <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5b7f9c" />
            <stop offset="1" stopColor="#89c2d9" />
          </linearGradient>
        </defs>

        <rect x={centerX} y={centerY} width={coilWidth} height={coilHeight} fill="#2a3238" stroke="#e9f2f6" strokeWidth={2} />
        
        {fins.map((i) => (
          <line key={i} x1={centerX} y1={centerY + i * 30} x2={centerX + coilWidth} y2={centerY + i * 30} stroke="#e9f2f6" strokeWidth={1} opacity={0.3} />
        ))}

        <rect x={centerX} y={centerY + coilHeight * 0.7} width={coilWidth} height={coilHeight * 0.3} fill="url(#water)" opacity={0.8} />
        
        <path d={`M ${centerX + 50} ${centerY + coilHeight * 0.7} v ${60 * flow}`} stroke="#89c2d9" strokeWidth={4} fill="none" strokeDasharray="4 4" />

        <rect x={centerX} y={centerY} width={coilWidth} height={coilHeight * 0.7} fill="#d0523f" opacity={0.4 * residue} />

        <line x1={centerX - 20} y1={centerY + coilHeight * 0.7} x2={centerX - 50} y2={centerY + coilHeight * 0.7} stroke="#e9f2f6" strokeWidth={1} />
        <text x={centerX - 55} y={centerY + coilHeight * 0.7 + 4} fill="#e9f2f6" fontSize={12} textAnchor="end">30% Flush</text>
        
        <line x1={centerX - 20} y1={centerY + coilHeight * 0.35} x2={centerX - 50} y2={centerY + coilHeight * 0.35} stroke="#d0523f" strokeWidth={1} />
        <text x={centerX - 55} y={centerY + coilHeight * 0.35 + 4} fill="#d0523f" fontSize={12} textAnchor="end">70% Residue</text>

        <text x={centerX + coilWidth / 2} y={centerY + coilHeight + 40} fill="#e9f2f6" fontSize={14} textAnchor="middle" fontWeight="bold">COIL ASSEMBLY</text>
      </svg>

      {p.title ? (
        <div style={{ 
          marginTop: 20, 
          transform: `translateY(${captionRise}px)`,
          fontFamily: "'Segoe UI', Arial, sans-serif",
          fontSize: 28, 
          color: '#e0b44c',
          textTransform: 'uppercase',
          letterSpacing: 2
        }}>{p.title}</div>
      ) : null}
    </AbsoluteFill>
  );
};