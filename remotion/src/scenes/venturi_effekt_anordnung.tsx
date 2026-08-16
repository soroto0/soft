import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const VenturiEffektAnordnungScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const flow = interpolate(frame, [0, span], [0, 100], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pressure = interpolate(frame, [span * 0.2, span * 0.8], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleShift = interpolate(frame, [0, span * 0.2], [20, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const towers = [
    { x: 200, y: 100 }, { x: 200, y: 300 },
    { x: 450, y: 100 }, { x: 450, y: 300 },
  ];

  const streamPaths = [
    { d: 'M 50 150 C 150 150, 250 180, 600 180', color: '#e9f2f6' },
    { d: 'M 50 250 C 150 250, 250 220, 600 220', color: '#e9f2f6' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 700 400">
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#8faec2" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#d0523f" />
          </linearGradient>
        </defs>
        {towers.map((t, i) => (
          <rect key={i} x={t.x} y={t.y} width={60} height={60} fill="#5d6a73" stroke="#e9f2f6" strokeWidth={2} />
        ))}
        {streamPaths.map((s, i) => (
          <path key={i} d={s.d} stroke="url(#grad)" strokeWidth={4} fill="none" strokeDasharray="10 5" strokeDashoffset={flow * 2} />
        ))}
        <ellipse cx={260} cy={200} rx={40 * pressure} ry={80 * pressure} fill="#d0523f" opacity={0.3 * pressure} />
        <text x={260} y={150} fill="#d0523f" fontSize={14} opacity={pressure}>UNTERDRUCK</text>
        <line x1={50} y1={380} x2={650} y2={380} stroke="#e9f2f6" strokeWidth={1} />
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i}>
            <line x1={50 + i * 150} y1={380} x2={50 + i * 150} y2={390} stroke="#e9f2f6" strokeWidth={1} />
            <text x={50 + i * 150} y={370} fill="#e9f2f6" fontSize={10} textAnchor="middle">{i * 10}m</text>
          </g>
        ))}
      </svg>
      {p.title ? (
        <div style={{ marginTop: 40, transform: `translateY(${titleShift}px)`, fontFamily: 'sans-serif', fontSize: 32, color: '#e9f2f6', fontWeight: 'bold' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};