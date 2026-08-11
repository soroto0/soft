import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const InfiniteStaircaseScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const duration = (p.dur || 6) * fps;
  const opacity = p.enter * p.exit;

  const scroll = interpolate(frame, [0, duration], [0, 100], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const fade = interpolate(frame, [0, duration * 0.2], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const scale = interpolate(frame, [0, duration], [1, 0.5], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const steps = Array.from({ length: 12 }).map((_, i) => ({
    id: i,
    y: 400 - i * 60 + scroll,
    width: 200 - i * 10,
    label: `ℵ_${i}`,
  }));

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width={width * 0.8} height={height * 0.8} viewBox="0 0 400 500">
        <defs>
          <linearGradient id="stairGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e0b44c" />
            <stop offset="0.5" stopColor="#d0523f" />
            <stop offset="1" stopColor="#5b7f9c" />
          </linearGradient>
        </defs>
        <g style={{ opacity: fade, transform: `scale(${scale})` }}>
          {steps.map((step) => (
            <g key={step.id}>
              <rect
                x={200 - step.width / 2}
                y={step.y}
                width={step.width}
                height={20}
                fill="url(#stairGrad)"
                stroke="#e9f2f6"
                strokeWidth={1}
              />
              <text
                x={200}
                y={step.y + 14}
                fill="#e9f2f6"
                fontSize={12}
                textAnchor="middle"
                fontFamily="monospace"
              >
                {step.label}
              </text>
              <line
                x1={200}
                y1={step.y + 20}
                x2={200}
                y2={step.y + 60}
                stroke="#e9f2f6"
                strokeWidth={0.5}
                strokeDasharray="2 2"
              />
            </g>
          ))}
        </g>
        <text x={20} y={40} fill="#e9f2f6" fontSize={24} fontWeight="bold">
          {p.title}
        </text>
        <line x1={20} y1={50} x2={380} y2={50} stroke="#e0b44c" strokeWidth={2} />
      </svg>
    </AbsoluteFill>
  );
};