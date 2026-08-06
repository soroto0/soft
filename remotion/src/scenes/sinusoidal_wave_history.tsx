import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const SinusoidalWaveHistoryScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const durationInFrames = (p.dur || 6) * fps;

  const progress = interpolate(frame, [0, durationInFrames], [0, 1], {
    easing: Easing.linear,
  });

  const waveShift = interpolate(frame, [0, durationInFrames], [0, Math.PI * 4], {
    easing: Easing.linear,
  });

  const fade = interpolate(frame, [0, 30, durationInFrames - 30, durationInFrames], [0, 1, 1, 0], {
    easing: Easing.linear,
  });

  const opacity = p.enter * p.exit * fade;

  const cultures = [
    { freq: 0.02, amp: 40, color: '#e9f2f6', label: 'Cultura A' },
    { freq: 0.04, amp: 60, color: '#e0b44c', label: 'Cultura B' },
    { freq: 0.06, amp: 30, color: '#d0523f', label: 'Cultura C' },
  ];

  const timeAxis = [0, 0.25, 0.5, 0.75, 1];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width={width * 0.8} height={height * 0.6} viewBox="0 0 800 400">
        <defs>
          <linearGradient id="gridGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e9f2f6" stopOpacity="0.1" />
            <stop offset="0.5" stopColor="#e9f2f6" stopOpacity="0.05" />
            <stop offset="1" stopColor="#e9f2f6" stopOpacity="0" />
          </linearGradient>
        </defs>

        <line x1="50" y1="350" x2="750" y2="350" stroke="#e9f2f6" strokeWidth="2" />
        <text x="750" y="380" fill="#e9f2f6" fontSize="14" textAnchor="end">Tiempo (Siglos)</text>

        {timeAxis.map((t) => (
          <g key={t}>
            <line x1={50 + t * 700} y1="350" x2={50 + t * 700} y2="360" stroke="#e9f2f6" strokeWidth="1" />
            <text x={50 + t * 700} y="380" fill="#e9f2f6" fontSize="12" textAnchor="middle">{Math.round(t * 1000)}</text>
          </g>
        ))}

        {cultures.map((c, i) => (
          <g key={i}>
            <path
              d={`M 50 ${200 + Math.sin(waveShift + 0) * c.amp} ${Array.from({ length: 100 }).map((_, j) => {
                const x = 50 + j * 7;
                const y = 200 + Math.sin(waveShift + j * 0.1) * c.amp * (0.5 + 0.5 * Math.sin(progress * Math.PI));
                return `L ${x} ${y}`;
              }).join(' ')}`}
              fill="none"
              stroke={c.color}
              strokeWidth="3"
            />
            <rect x={600} y={50 + i * 40} width="20" height="10" fill={c.color} />
            <text x={630} y={60 + i * 40} fill="#e9f2f6" fontSize="16">{c.label}</text>
          </g>
        ))}
      </svg>

      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: 'sans-serif', fontSize: 48, color: '#e9f2f6', fontWeight: 'bold' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};