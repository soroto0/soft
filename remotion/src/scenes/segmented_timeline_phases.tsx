import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const SegmentedTimelinePhasesScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = (p.dur || 6) * fps;

  const progress = interpolate(frame, [0, duration], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const reveal = interpolate(frame, [0, duration * 0.5], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pulse = interpolate(frame, [0, duration], [0.8, 1.2], {
    easing: Easing.inOut(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const stages = [
    { label: 'Infancia', val: '0-20', color: '#e9f2f6' },
    { label: 'Juventud', val: '20-40', color: '#e0b44c' },
    { label: 'Madurez', val: '40-60', color: '#d0523f' },
    { label: 'Vejez', val: '60-80', color: '#5b7f9c' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 800 400">
        <defs>
          <linearGradient id="phaseGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#e9f2f6" />
            <stop offset="0.33" stopColor="#e0b44c" />
            <stop offset="0.66" stopColor="#d0523f" />
            <stop offset="1" stopColor="#5b7f9c" />
          </linearGradient>
        </defs>

        <rect x={100} y={190} width={600 * progress} height={20} fill="url(#phaseGrad)" opacity={reveal} />
        
        {stages.map((stage, i) => {
          const x = 100 + i * 200;
          const isActive = progress > (i * 0.25);
          return (
            <g key={stage.label} opacity={isActive ? 1 : 0.2}>
              <line x1={x} y1={170} x2={x} y2={190} stroke="#e9f2f6" strokeWidth={2} />
              <text x={x} y={150} fill={stage.color} fontSize={24} textAnchor="middle" fontWeight="bold">
                {stage.label}
              </text>
              <text x={x} y={240} fill="#e9f2f6" fontSize={18} textAnchor="middle">
                {stage.val} años
              </text>
              <rect x={x - 5} y={190} width={10} height={20} fill={stage.color} transform={`scale(${isActive ? pulse : 1})`} transform-origin={`${x} 200`} />
            </g>
          );
        })}

        <line x1={100} y1={210} x2={700} y2={210} stroke="#e9f2f6" strokeWidth={1} strokeDasharray="4 4" />
        <text x={400} y={350} fill="#e9f2f6" fontSize={32} textAnchor="middle" style={{ letterSpacing: '2px' }}>
          {p.title}
        </text>
      </svg>
    </AbsoluteFill>
  );
};