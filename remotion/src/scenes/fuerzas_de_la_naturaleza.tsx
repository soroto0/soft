import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const FuerzasDeLaNaturalezaScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const tension = interpolate(frame, [0, span / 4, span / 2, (3 * span) / 4, span], [0, 15, -15, 15, 0], {
    easing: Easing.inOut(Easing.quad),
  });

  const pull = interpolate(frame, [0, span], [0, 100], {
    easing: Easing.inOut(Easing.cubic),
  });

  const lifeProgress = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.linear,
  });

  const ticks = [0, 1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 800 400">
        <defs>
          <linearGradient id="lifeLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#e9f2f6" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#d0523f" />
          </linearGradient>
        </defs>

        <line x1={100} y1={200} x2={700} y2={200} stroke="#e9f2f6" strokeWidth={1} strokeDasharray="4 4" />
        
        {ticks.map((t) => (
          <g key={t}>
            <line x1={100 + t * 75} y1={190} x2={100 + t * 75} y2={210} stroke="#e9f2f6" strokeWidth={1} />
            <text x={100 + t * 75} y={230} fill="#e9f2f6" fontSize={10} textAnchor="middle">{t * 12.5}%</text>
          </g>
        ))}

        <line x1={100} y1={200} x2={100 + 600 * lifeProgress} y2={200} stroke="url(#lifeLine)" strokeWidth={4} />

        <g transform={`translate(${-pull + tension}, 0)`}>
          <circle cx={100} cy={200} r={20} fill="#7a9e7e" fillOpacity={0.6} stroke="#e9f2f6" strokeWidth={2} />
          <text x={100} y={160} fill="#e9f2f6" fontSize={14} textAnchor="middle">DESEO</text>
        </g>

        <g transform={`translate(${pull + tension}, 0)`}>
          <circle cx={700} cy={200} r={20} fill="#7a9e7e" fillOpacity={0.6} stroke="#e9f2f6" strokeWidth={2} />
          <text x={700} y={160} fill="#e9f2f6" fontSize={14} textAnchor="middle">TERROR</text>
        </g>

        <path d={`M 100 200 Q 400 ${200 + tension} 700 200`} fill="none" stroke="#e9f2f6" strokeWidth={1} />

        <text x={400} y={320} fill="#e9f2f6" fontSize={32} textAnchor="middle" style={{ fontFamily: 'sans-serif', fontWeight: 'bold' }}>
          {p.title}
        </text>
      </svg>
    </AbsoluteFill>
  );
};