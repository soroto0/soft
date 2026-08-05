import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const UnderpinningProcessScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const draw = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const jack = interpolate(frame, [span * 0.4, span * 0.8], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const lift = interpolate(frame, [span * 0.4, span * 0.9], [0, -25], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;
  const piers = [0, 1, 2, 3];
  const layers = [
    { y: 60, h: 40, label: 'STRUCTURE', fill: '#8a949b' },
    { y: 100, h: 90, label: 'SOIL', fill: '#5d6a73' },
    { y: 190, h: 30, label: 'BEDROCK', fill: '#c9d3d9' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 500 300">
        <defs>
          <linearGradient id="forceGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#d0523f" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#e9f2f6" />
          </linearGradient>
        </defs>
        {layers.map((l, i) => (
          <rect key={i} x={50} y={l.y} width={400} height={l.h} fill={l.fill} opacity={0.2} />
        ))}
        {piers.map((i) => (
          <g key={i}>
            <rect x={80 + i * 110} y={130} width={30} height={60 * draw} fill="#e0b44c" />
            <line x1={95 + i * 110} y1={130} x2={95 + i * 110} y2={130 - jack * 30} stroke="url(#forceGrad)" strokeWidth={6} strokeLinecap="round" />
            <path d={`M ${95 + i * 110 - 5} ${130 - jack * 30} L ${95 + i * 110} ${130 - jack * 30 - 8} L ${95 + i * 110 + 5} ${130 - jack * 30}`} fill="#d0523f" />
          </g>
        ))}
        <rect x={50} y={60 + lift} width={400} height={40} fill="#e9f2f6" stroke="#e0b44c" strokeWidth={2} />
        {layers.map((l, i) => (
          <text key={i} x={460} y={l.y + l.h / 2 + 5} fill="#e9f2f6" fontSize={12} textAnchor="start" fontFamily="sans-serif">{l.label}</text>
        ))}
        <line x1={40} y1={130} x2={40} y2={190} stroke="#e9f2f6" strokeWidth={1} />
        <text x={30} y={165} fill="#e9f2f6" fontSize={10} textAnchor="end" fontFamily="sans-serif">54 ft</text>
        <text x={250} y={280} fill="#d0523f" fontSize={14} textAnchor="middle" fontFamily="sans-serif" fontWeight="bold">UPWARD JACKING FORCE</text>
      </svg>
      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: 'sans-serif', fontSize: 32, color: '#e9f2f6', letterSpacing: '1px' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};