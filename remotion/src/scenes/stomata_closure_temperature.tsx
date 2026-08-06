import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const StomataClosureTemperatureScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const progress = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const gap = interpolate(progress, [0, 1], [30, 2], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const temp = interpolate(progress, [0, 1], [75, 55], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const layers = [
    { y: 0, h: 40, label: 'Cuticle', color: '#5b7f9c' },
    { y: 40, h: 40, label: 'Epidermis', color: '#8a949b' },
    { y: 80, h: 120, label: 'Mesophyll', color: '#c9d3d9' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 300">
        <defs>
          <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d0523f" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#5b7f9c" />
          </linearGradient>
        </defs>

        {layers.map((l) => (
          <g key={l.label}>
            <rect x={50} y={l.y} width={250} height={l.h} fill={l.color} opacity={0.2} stroke="#e9f2f6" strokeWidth={0.5} />
            <text x={55} y={l.y + 25} fill="#e9f2f6" fontSize={12} opacity={0.6}>{l.label}</text>
          </g>
        ))}

        <g transform="translate(175, 140)">
          <path d={`M -50 ${-gap} Q 0 ${-gap * 2} 50 ${-gap}`} fill="none" stroke="#e0b44c" strokeWidth={8} strokeLinecap="round" />
          <path d={`M -50 ${gap} Q 0 ${gap * 2} 50 ${gap}`} fill="none" stroke="#e0b44c" strokeWidth={8} strokeLinecap="round" />
          <line x1={0} y1={-gap * 2} x2={0} y2={-gap * 4} stroke="#e9f2f6" strokeWidth={1} />
          <text x={0} y={-gap * 4 - 5} fill="#e9f2f6" fontSize={10} textAnchor="middle">Guard Cell</text>
        </g>

        <rect x={340} y={50} width={20} height={150} fill="url(#tempGrad)" />
        <line x1={335} y1={200 - (temp - 55) * 7.5} x2={365} y2={200 - (temp - 55) * 7.5} stroke="#e9f2f6" strokeWidth={3} />
        <text x={370} y={200 - (temp - 55) * 7.5 + 4} fill="#e9f2f6" fontSize={10}>{Math.round(temp)}°F</text>
        
        {[80, 65, 50].map((t, i) => (
          <g key={t}>
            <line x1={330} y1={50 + i * 75} x2={340} y2={50 + i * 75} stroke="#e9f2f6" strokeWidth={1} />
            <text x={325} y={50 + i * 75 + 3} fill="#e9f2f6" fontSize={8} textAnchor="end">{t}°F</text>
          </g>
        ))}
      </svg>

      {p.title ? (
        <div style={{ marginTop: 20, fontFamily: 'sans-serif', fontSize: 24, color: '#e9f2f6', textAlign: 'center' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};