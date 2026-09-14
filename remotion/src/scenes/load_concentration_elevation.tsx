import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const LoadConcentrationElevationScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = (p.dur || 6) * fps;

  const opacity = p.enter * p.exit;

  const move = interpolate(frame, [0, duration * 0.8], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const colorShift = interpolate(frame, [duration * 0.4, duration * 0.9], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [duration * 0.5, duration * 0.7], [0, 1], {
    easing: Easing.ease,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const joints = [100, 250, 400];
  const pileWidth = 80;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 500 300">
        <defs>
          <linearGradient id="pileGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8a949b" />
            <stop offset={colorShift} stopColor="#e0b44c" />
          </linearGradient>
        </defs>

        <rect x={50} y={200} width={400} height={20} fill="#5d6a73" />
        
        {joints.map((x) => (
          <g key={x}>
            <rect x={x - 5} y={150} width={10} height={50} fill="#c9d3d9" />
            <line x1={x} y1={150} x2={x} y2={220} stroke="#e9f2f6" strokeWidth={1} strokeDasharray="4 2" />
            <path d={`M ${x - pileWidth / 2} 200 L ${x} ${200 - 80 * move} L ${x + pileWidth / 2} 200 Z`} 
                  fill="url(#pileGradient)" />
            <line x1={x - 30} y1={120} x2={x + 30} y2={120} stroke="#e9f2f6" strokeWidth={2} />
            <text x={x} y={110} fill="#e9f2f6" fontSize={12} textAnchor="middle" opacity={labelFade}>
              F: 50kN
            </text>
          </g>
        ))}

        <text x={250} y={280} fill="#e9f2f6" fontSize={24} textAnchor="middle" style={{ fontWeight: 'bold' }}>
          {p.title}
        </text>
      </svg>
    </AbsoluteFill>
  );
};