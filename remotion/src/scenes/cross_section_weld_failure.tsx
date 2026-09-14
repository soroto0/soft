import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const CrossSectionWeldFailureScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dur = (p.dur || 6) * fps;
  const opacity = p.enter * p.exit;

  const crack = interpolate(frame, [dur * 0.6, dur * 0.9], [0, 1], { easing: Easing.bezier(0.6, 0, 0.4, 1) });
  const force = interpolate(frame, [0, dur * 0.5], [0, 1], { easing: Easing.out(Easing.quad) });

  const layers = [
    { y: 100, h: 40, label: 'FLANGE', color: '#8a949b' },
    { y: 140, h: 20, label: 'WELD', color: '#e0b44c' },
    { y: 160, h: 80, label: 'WEB', color: '#5d6a73' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 300">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d0523f" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#5d6a73" />
          </linearGradient>
        </defs>
        {layers.map((l, i) => (
          <g key={l.label}>
            <rect x={100} y={l.y} width={200} height={l.h} fill={l.color} stroke="#e9f2f6" strokeWidth={1} />
            <text x={90} y={l.y + l.h / 2 + 4} fill="#e9f2f6" fontSize={10} textAnchor="end">{l.label}</text>
            {i === 1 && (
              <path d={`M 100 150 L ${100 + 200 * crack} 150`} stroke="#d0523f" strokeWidth={4 * crack} strokeLinecap="round" />
            )}
          </g>
        ))}
        {[0, 1, 2].map((i) => (
          <g key={i} opacity={force}>
            <line x1={120 + i * 80} y1={60} x2={120 + i * 80} y2={130} stroke="#e0b44c" strokeWidth={2} />
            <polygon points={`${120 + i * 80},130 ${115 + i * 80},120 ${125 + i * 80},120`} fill="#e0b44c" />
          </g>
        ))}
        <text x={200} y={280} fill="#e9f2f6" fontSize={12} textAnchor="middle" style={{ letterSpacing: 1 }}>
          {p.title || 'DETAIL: SCHWEISSNAHT-QUERSCHNITT'}
        </text>
      </svg>
    </AbsoluteFill>
  );
};
