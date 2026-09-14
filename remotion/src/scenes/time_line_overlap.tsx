import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const TimeLineOverlapScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = (p.dur || 6) * fps;
  const opacity = p.enter * p.exit;

  const progress = interpolate(frame, [0, duration], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const erosion = interpolate(frame, [0, duration], [1, 0.2], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shift = interpolate(frame, [0, duration], [0, 50], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const years = [0, 1, 2, 3, 4, 5, 6, 7];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 800 300">
        <defs>
          <linearGradient id="timeGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#e9f2f6" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#d0523f" />
          </linearGradient>
        </defs>
        <line x1={50} y1={150} x2={750} y2={150} stroke="#e9f2f6" strokeWidth={2} />
        <rect x={50} y={140} width={700 * progress} height={20} fill="url(#timeGrad)" />
        {years.map((y) => (
          <g key={y}>
            <line x1={50 + y * 100} y1={140} x2={50 + y * 100} y2={160} stroke="#e9f2f6" strokeWidth={1} />
            <text x={50 + y * 100} y={180} fill="#e9f2f6" fontSize={12} textAnchor="middle">
              {y}y
            </text>
            <circle
              cx={50 + y * 100}
              cy={150}
              r={15 * erosion}
              fill="none"
              stroke="#d0523f"
              strokeWidth={2}
              opacity={progress > y / 7 ? 1 : 0}
            />
          </g>
        ))}
        <text x={400} y={250} fill="#e9f2f6" fontSize={24} textAnchor="middle" style={{ transform: `translateY(${shift}px)` }}>
          {p.title}
        </text>
        <text x={50} y={120} fill="#e9f2f6" fontSize={14}>INICIO</text>
        <text x={750} y={120} fill="#d0523f" fontSize={14} textAnchor="end">FIN</text>
      </svg>
    </AbsoluteFill>
  );
};