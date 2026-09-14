import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ResonanceChartScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const progress = interpolate(frame, [0, duration], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const currentFreq = progress * 10;
  const resonancePeak = 5;
  const resonanceWidth = 0.8;
  
  const amplitude = 1 / (1 + Math.pow((currentFreq - resonancePeak) / resonanceWidth, 2));
  
  const lineDraw = interpolate(frame, [0, duration * 0.8], [0, 400], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [duration * 0.5, duration * 0.9], [0, 1], {
    easing: Easing.ease,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ticks = [0, 2.5, 5, 7.5, 10];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 450 300">
        <defs>
          <linearGradient id="resGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#e9f2f6" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#d0523f" />
          </linearGradient>
        </defs>
        <line x1="25" y1="250" x2="425" y2="250" stroke="#e9f2f6" strokeWidth="2" />
        <line x1="25" y1="250" x2="25" y2="20" stroke="#e9f2f6" strokeWidth="2" />
        
        <path d={`M 25 250 ${Array.from({ length: 50 }).map((_, i) => {
          const x = (i / 49) * lineDraw;
          const f = (x / 400) * 10;
          const y = 250 - (1 / (1 + Math.pow((f - resonancePeak) / resonanceWidth, 2))) * 200;
          return `L ${25 + x} ${y}`;
        }).join(' ')}`} fill="none" stroke="url(#resGrad)" strokeWidth="4" />

        <circle cx={25 + (currentFreq / 10) * 400} cy={250 - amplitude * 200} r="8" fill="#d0523f" />
        
        {ticks.map((t) => (
          <g key={t}>
            <line x1={25 + (t / 10) * 400} y1="250" x2={25 + (t / 10) * 400} y2="260" stroke="#e9f2f6" strokeWidth="1" />
            <text x={25 + (t / 10) * 400} y="280" fill="#e9f2f6" fontSize="12" textAnchor="middle">{t}</text>
          </g>
        ))}
        
        <line x1={25 + (resonancePeak / 10) * 400} y1="250" x2={25 + (resonancePeak / 10) * 400} y2="50" stroke="#e0b44c" strokeDasharray="4 4" />
        <text x={25 + (resonancePeak / 10) * 400} y="40" fill="#e0b44c" fontSize="12" textAnchor="middle" opacity={labelFade}>Eigenfrequenz</text>
        
        <text x="225" y="298" fill="#e9f2f6" fontSize="14" textAnchor="middle">Frequenz (Hz)</text>
        <text x="10" y="150" fill="#e9f2f6" fontSize="14" textAnchor="middle" transform="rotate(-90 10 150)">Amplitude</text>
      </svg>
      {p.title ? (
        <div style={{ marginTop: 20, fontFamily: 'sans-serif', fontSize: 32, color: '#e9f2f6', fontWeight: 'bold', textTransform: 'uppercase' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};