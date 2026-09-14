import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const BiomechanicalPivotShiftScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const progress = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const jawRotation = interpolate(progress, [0, 1], [0, 15]);
  const muscleShiftX = interpolate(progress, [0, 1], [0, 60]);
  const muscleShiftY = interpolate(progress, [0, 1], [0, 40]);

  const drawSkull = (x: number, y: number, opacityVal: number) => (
    <g opacity={opacityVal} stroke="#e9f2f6" strokeWidth="2" fill="none">
      <path d={`M ${x} ${y} q 50 -80 120 -20 q 30 20 20 60 q -40 30 -80 0 z`} />
      <path d={`M ${x + 120} ${y + 40} l 60 ${jawRotation} l -40 50 l -80 -20`} />
      <circle cx={x + 120} cy={y + 40} r="4" fill="#e0b44c" />
    </g>
  );

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 600 300">
        <defs>
          <linearGradient id="muscleGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d0523f" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#5b7f9c" />
          </linearGradient>
        </defs>

        {drawSkull(50, 100, 0.4)}
        {drawSkull(350, 100, 1)}

        <line x1={100} y1={80} x2={130} y2={140} stroke="url(#muscleGrad)" strokeWidth="10" strokeLinecap="round" />
        <line x1={400 + muscleShiftX} y1={80 + muscleShiftY} x2={430} y2={140 + jawRotation} stroke="url(#muscleGrad)" strokeWidth="10" strokeLinecap="round" />

        <path d="M 150 160 l 50 0" stroke="#e9f2f6" strokeWidth="2" markerEnd="url(#arrow)" />
        <text x="175" y="150" fill="#e9f2f6" fontSize="14" textAnchor="middle">Evolution</text>

        <text x="110" y="250" fill="#e9f2f6" fontSize="12" textAnchor="middle">Frühform</text>
        <text x="450" y="250" fill="#e9f2f6" fontSize="12" textAnchor="middle">Spätform</text>
        
        <g stroke="#e9f2f6" strokeWidth="1">
          <line x1="50" y1="260" x2="550" y2="260" />
          <line x1="50" y1="255" x2="50" y2="265" />
          <line x1="550" y1="255" x2="550" y2="265" />
        </g>
      </svg>

      {p.title ? (
        <div style={{ 
          marginTop: 20, 
          fontFamily: "'Segoe UI', sans-serif", 
          fontSize: 32, 
          color: '#e9f2f6',
          fontWeight: 'bold'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};