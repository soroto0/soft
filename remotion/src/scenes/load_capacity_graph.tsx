import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const LoadCapacityGraphScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const barGrowth = interpolate(frame, [0, span * 0.6], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const gridFade = interpolate(frame, [span * 0.2, span * 0.5], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const markerSlide = interpolate(frame, [span * 0.4, span * 0.9], [0, 320], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const data = [
    { label: 'Soll (Tragfähigkeit)', val: 320, color: '#e9f2f6' },
    { label: 'Ist (Stahlfestigkeit)', val: 180, color: '#d0523f' },
  ];

  const ticks = [0, 80, 160, 240, 320];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 500 300">
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#d0523f" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#e9f2f6" />
          </linearGradient>
        </defs>
        
        <line x1={50} y1={250} x2={450} y2={250} stroke="#e9f2f6" strokeWidth={2} />
        
        {ticks.map((t) => (
          <g key={t} opacity={gridFade}>
            <line x1={50 + t} y1={250} x2={50 + t} y2={260} stroke="#e9f2f6" strokeWidth={1} />
            <text x={50 + t} y={275} fill="#e9f2f6" fontSize={12} textAnchor="middle">{t} kN</text>
          </g>
        ))}

        {data.map((d, i) => (
          <g key={d.label}>
            <rect 
              x={50} 
              y={80 + i * 80} 
              width={d.val * barGrowth} 
              height={40} 
              fill={i === 0 ? d.color : 'url(#barGrad)'} 
              stroke="#e9f2f6" 
              strokeWidth={1}
            />
            <text 
              x={50} 
              y={70 + i * 80} 
              fill="#e9f2f6" 
              fontSize={14} 
              fontWeight="bold"
            >
              {d.label}
            </text>
          </g>
        ))}

        <line x1={50 + markerSlide} y1={50} x2={50 + markerSlide} y2={250} stroke="#e0b44c" strokeWidth={2} strokeDasharray="4 4" />
        <text x={50 + markerSlide} y={40} fill="#e0b44c" fontSize={12} textAnchor="middle">Last-Limit</text>
      </svg>

      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: 32, color: '#e9f2f6' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};