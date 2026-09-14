import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const FinancialBreakdownGraphScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const barGrowth = interpolate(frame, [0, span * 0.6], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [span * 0.4, span * 0.7], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleRise = interpolate(frame, [0, span * 0.3], [20, 0], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const data = [
    { label: 'Entsorgung', value: 42, color: '#e0b44c' },
    { label: 'Demontage', value: 65, color: '#d0523f' },
    { label: 'Versicherung', value: 35, color: '#e9f2f6' },
  ];


  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 500 300">
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e9f2f6" />
            <stop offset="50%" stopColor="#e0b44c" />
            <stop offset="100%" stopColor="#d0523f" />
          </linearGradient>
        </defs>

        <line x1="50" y1="250" x2="450" y2="250" stroke="#e9f2f6" strokeWidth="2" />
        
        {[0, 20, 40, 60, 80, 100, 120, 140].map((tick) => (
          <g key={tick}>
            <line x1={50 + (tick / 140) * 400} y1="250" x2={50 + (tick / 140) * 400} y2="260" stroke="#e9f2f6" strokeWidth="1" />
            <text x={50 + (tick / 140) * 400} y="275" fill="#e9f2f6" fontSize="10" textAnchor="middle">{tick}M</text>
          </g>
        ))}

        {data.map((item, i) => (
          <g key={item.label}>
            <rect
              x="50"
              y={50 + i * 60}
              width={(item.value / 140) * 400 * barGrowth}
              height="30"
              fill={item.color}
              stroke="#e9f2f6"
              strokeWidth="0.5"
            />
            <text x="45" y={70 + i * 60} fill="#e9f2f6" fontSize="12" textAnchor="end" opacity={labelFade}>
              {item.label}
            </text>
            <text x={55 + (item.value / 140) * 400 * barGrowth} y={70 + i * 60} fill={item.color} fontSize="12" opacity={labelFade}>
              {item.value}M €
            </text>
          </g>
        ))}

        <rect x="350" y="20" width="100" height="10" fill="url(#barGrad)" opacity={labelFade} />
        <text x="350" y="45" fill="#e9f2f6" fontSize="8" opacity={labelFade}>0M €</text>
        <text x="450" y="45" fill="#e9f2f6" fontSize="8" textAnchor="end" opacity={labelFade}>142M €</text>
      </svg>

      {p.title ? (
        <div style={{
          marginTop: 40,
          transform: `translateY(${titleRise}px)`,
          fontFamily: 'sans-serif',
          fontSize: 32,
          color: '#e9f2f6',
          fontWeight: 'bold',
          textAlign: 'center'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
