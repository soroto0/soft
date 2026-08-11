import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ForceCompositionScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const draw = interpolate(frame, [0, span * 0.6], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const rotate = interpolate(frame, [0, span], [0, 45], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pulse = interpolate(frame, [0, span * 0.5, span], [1, 1.05, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const segments = [
    { start: 0, end: 120, color: '#6e8274', label: 'LIBERTOS', val: '50%' },
    { start: 120, end: 240, color: '#e0b44c', label: 'GLADIADORES', val: '30%' },
    { start: 240, end: 360, color: '#d0523f', label: 'BANDIDOS', val: '20%' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="60%" viewBox="0 0 400 400" style={{ transform: `scale(${pulse})` }}>
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e9f2f6" />
            <stop offset="50%" stopColor="#8a949b" />
            <stop offset="100%" stopColor="#5d6a73" />
          </linearGradient>
        </defs>
        <g transform={`rotate(${rotate} 200 200)`}>
          {segments.map((s, i) => (
            <path
              key={i}
              d={`M 200 200 L ${200 + 120 * Math.cos((s.start * Math.PI) / 180)} ${200 + 120 * Math.sin((s.start * Math.PI) / 180)} A 120 120 0 0 1 ${200 + 120 * Math.cos((s.end * Math.PI) / 180)} ${200 + 120 * Math.sin((s.end * Math.PI) / 180)} Z`}
              fill={s.color}
              stroke="#e9f2f6"
              strokeWidth={2}
              opacity={draw}
            />
          ))}
          <circle cx="200" cy="200" r="120" fill="none" stroke="url(#grad)" strokeWidth={4} />
        </g>
        {segments.map((s, i) => (
          <g key={`l-${i}`} opacity={draw}>
            <line 
              x1={200 + 130 * Math.cos(((s.start + 60) * Math.PI) / 180)} 
              y1={200 + 130 * Math.sin(((s.start + 60) * Math.PI) / 180)}
              x2={200 + 160 * Math.cos(((s.start + 60) * Math.PI) / 180)}
              y2={200 + 160 * Math.sin(((s.start + 60) * Math.PI) / 180)}
              stroke="#e9f2f6" strokeWidth={1} />
            <text 
              x={200 + 170 * Math.cos(((s.start + 60) * Math.PI) / 180)} 
              y={200 + 160 * Math.sin(((s.start + 60) * Math.PI) / 180)}
              fill="#e9f2f6" fontSize={12} textAnchor="middle">{s.label} ({s.val})</text>
          </g>
        ))}
      </svg>
      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: 'sans-serif', fontSize: 32, color: '#e0b44c', textTransform: 'uppercase', letterSpacing: 2 }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};