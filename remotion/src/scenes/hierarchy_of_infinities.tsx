import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const HierarchyOfInfinitiesScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = (p.dur || 6) * fps;

  const grow = interpolate(frame, [0, duration * 0.8], [0, 1], {
    easing: Easing.out(Easing.exp),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const reveal = interpolate(frame, [0, duration * 0.5], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shift = interpolate(frame, [duration * 0.2, duration], [0, -20], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const levels = [
    { label: 'ℕ (Naturales)', size: 1, color: '#e9f2f6' },
    { label: 'ℝ (Reales)', size: 4, color: '#e9f2f6' },
    { label: 'ℵ₁ (Continuo)', size: 16, color: '#e0b44c' },
    { label: 'ℵ₂ (Potencia)', size: 64, color: '#e0b44c' },
    { label: 'Ω (Absoluto)', size: 256, color: '#d0523f' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="60%" viewBox="0 0 400 500" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d0523f" />
            <stop offset="50%" stopColor="#e0b44c" />
            <stop offset="100%" stopColor="#e9f2f6" />
          </linearGradient>
        </defs>
        
        <line x1="200" y1="450" x2="200" y2="50" stroke="#e9f2f6" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
        
        {levels.map((lvl, i) => {
          const height = lvl.size * grow;
          const yPos = 450 - (i * 80) - (height / 2);
          return (
            <g key={lvl.label} opacity={reveal}>
              <rect
                x={200 - (lvl.size / 2)}
                y={yPos}
                width={lvl.size}
                height={height}
                fill="url(#grad)"
                stroke={lvl.color}
                strokeWidth="0.5"
              />
              <text
                x={200 + (lvl.size / 2) + 10}
                y={yPos + height / 2 + 4}
                fill={lvl.color}
                fontSize="12"
                fontFamily="monospace"
              >
                {lvl.label}
              </text>
              <line x1="200" y1={yPos + height / 2} x2="200 + (lvl.size / 2) + 8" y2={yPos + height / 2} stroke={lvl.color} strokeWidth="0.5" />
            </g>
          );
        })}
      </svg>
      {p.title ? (
        <div style={{
          marginTop: 40,
          transform: `translateY(${shift}px)`,
          fontFamily: 'serif',
          fontSize: 28,
          color: '#e9f2f6',
          letterSpacing: '0.05em'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};