import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ProgressiveScaffoldCollapseScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = (p.dur || 6) * fps;

  const opacity = p.enter * p.exit;

  const progress = interpolate(frame, [0, duration], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const loadIndicator = interpolate(frame, [0, duration], [100, 500], {
    easing: Easing.in(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shake = interpolate(frame, [0, duration], [0, 5], {
    easing: Easing.bezier(0.5, 0, 0.5, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const anchors = [0, 1, 2, 3, 4, 5];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 500 400">
        <defs>
          <linearGradient id="loadGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e9f2f6" />
            <stop offset="50%" stopColor="#e0b44c" />
            <stop offset="100%" stopColor="#d0523f" />
          </linearGradient>
        </defs>

        <rect x="150" y="50" width="200" height="300" fill="#1a252d" stroke="#e9f2f6" strokeWidth="1" />
        
        {anchors.map((i) => {
          const trigger = i * 0.15;
          const isPopped = interpolate(progress, [trigger, trigger + 0.1], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          
          const xOffset = isPopped * 100;
          const yPos = 80 + i * 50;

          return (
            <g key={i} transform={`translate(${isPopped * shake}, 0)`}>
              <line x1="350" y1={yPos} x2={380 + xOffset} y2={yPos} stroke={isPopped > 0.1 ? '#d0523f' : '#e0b44c'} strokeWidth="4" />
              <circle cx={380 + xOffset} cy={yPos} r={6} fill={isPopped > 0.1 ? '#d0523f' : '#e9f2f6'} />
            </g>
          );
        })}

        <line x1="450" y1="50" x2="450" y2="350" stroke="url(#loadGrad)" strokeWidth="6" />
        <text x="460" y="60" fill="#e9f2f6" fontSize="12">100%</text>
        <text x="460" y="350" fill="#d0523f" fontSize="12">{Math.floor(loadIndicator)}%</text>
        
        <text x="250" y="380" fill="#e9f2f6" fontSize="16" textAnchor="middle" style={{ letterSpacing: '1px' }}>
          {p.title || "Progressive Failure Sequence"}
        </text>
      </svg>
    </AbsoluteFill>
  );
};