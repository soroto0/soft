import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const WeldShearStressScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = (p.dur || 6) * fps;
  const opacity = p.enter * p.exit;

  const loadProgress = interpolate(frame, [0, duration * 0.6], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const stressPulse = interpolate(frame, [duration * 0.5, duration * 0.6, duration * 0.9], [1, 2, 1], {
    easing: Easing.elastic(1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const arrowOffset = interpolate(frame, [0, duration * 0.5], [0, 20], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { id: 'base', y: 120, h: 40, fill: '#5d6a73', label: 'TRÄGER' },
    { id: 'weld', y: 160, h: 20, fill: '#8a949b', label: 'SCHWEISSNAHT' },
    { id: 'plate', y: 180, h: 40, fill: '#c9d3d9', label: 'FLANSCH' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg viewBox="0 0 400 300" width="80%">
        <defs>
          <linearGradient id="stressGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5b7f9c" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#d0523f" />
          </linearGradient>
        </defs>

        {layers.map((l, i) => (
          <g key={l.id}>
            <rect x={100} y={l.y} width={200} height={l.h} fill={l.fill} stroke="#e9f2f6" strokeWidth={1} />
            <text x={90} y={l.y + l.h / 2 + 4} fill="#e9f2f6" fontSize={10} textAnchor="end">{l.label}</text>
            <line x1={95} y1={l.y + l.h / 2} x2={100} y2={l.y + l.h / 2} stroke="#e9f2f6" strokeWidth={1} />
          </g>
        ))}

        {[0, 1, 2, 3].map((i) => (
          <line key={i} x1={120 + i * 50} y1={80 + arrowOffset} x2={120 + i * 50} y2={120} stroke="#e9f2f6" strokeWidth={2} markerEnd="url(#arrow)" />
        ))}

        <g transform={`scale(${stressPulse})`} style={{ transformOrigin: '200px 170px' }}>
          <path d="M 180 160 L 220 160 L 200 180 Z" fill="#d0523f" />
          <text x={200} y={155} fill="#d0523f" fontSize={12} textAnchor="middle" fontWeight="bold">MAX</text>
        </g>

        <rect x={320} y={100} width={20} height={100} fill="url(#stressGrad)" />
        <text x={345} y={105} fill="#e9f2f6" fontSize={8}>100%</text>
        <text x={345} y={205} fill="#e9f2f6" fontSize={8}>0%</text>
      </svg>

      {p.title && (
        <div style={{ marginTop: 40, color: '#e9f2f6', fontSize: 32, fontFamily: 'sans-serif', textAlign: 'center', opacity: loadProgress }}>
          {p.title}
        </div>
      )}
    </AbsoluteFill>
  );
};