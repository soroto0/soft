import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const CrossSectionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const flow = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const moisture = interpolate(frame, [span * 0.3, span * 0.8], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const tempShift = interpolate(frame, [0, span], [0, 20], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { x: 100, w: 100, label: 'ROOM AIR', temp: 22 },
    { x: 200, w: 40, label: 'GLASS', temp: 10 },
    { x: 240, w: 30, label: 'MOISTURE', temp: 4 },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 400 300">
        <defs>
          <linearGradient id="tempGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#d0523f" />
            <stop offset="0.6" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#e9f2f6" />
          </linearGradient>
        </defs>
        
        {layers.map((l, i) => (
          <g key={l.label}>
            <rect x={l.x} y={50} width={l.w} height={200} fill={i === 0 ? 'url(#tempGrad)' : i === 1 ? '#5b7f9c' : '#e9f2f6'} opacity={i === 2 ? moisture : 0.8} />
            <line x1={l.x} y1={40} x2={l.x} y2={260} stroke="#e9f2f6" strokeWidth={1} strokeDasharray="2 2" />
            <text x={l.x + l.w / 2} y={30} fill="#e9f2f6" fontSize={12} textAnchor="middle">{l.label}</text>
            <text x={l.x + l.w / 2} y={280} fill="#e9f2f6" fontSize={10} textAnchor="middle">{l.temp - (i === 0 ? tempShift : 0)}°C</text>
          </g>
        ))}

        <path d={`M 100 150 Q 170 ${150 + Math.sin(flow * Math.PI * 2) * 20} 240 150`} fill="none" stroke="#e0b44c" strokeWidth={2} />
        
        <g opacity={moisture}>
          <circle cx={255} cy={150} r={5} fill="#e9f2f6" />
          <text x={255} y={130} fill="#e9f2f6" fontSize={8} textAnchor="middle">CONDENSATION</text>
        </g>
      </svg>

      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: 'sans-serif', fontSize: 24, color: '#e9f2f6', fontWeight: 'bold' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};