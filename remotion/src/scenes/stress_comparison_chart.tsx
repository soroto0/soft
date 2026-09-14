import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const StressComparisonChartScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const barGrow = interpolate(frame, [0, span * 0.5], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const breakPointPulse = interpolate(frame, [span * 0.5, span * 0.8], [1, 1.5], {
    easing: Easing.elastic(1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const captionRise = interpolate(frame, [span * 0.1, span * 0.3], [20, 0], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const data = [
    { label: 'Nenntragfähigkeit', value: 400, color: '#e9f2f6' },
    { label: 'Tatsächliche Last', value: 175, color: '#e0b44c' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 500 300">
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5b7f9c" />
            <stop offset="0.5" stopColor="#8a949b" />
            <stop offset="1" stopColor="#c9d3d9" />
          </linearGradient>
        </defs>
        
        <line x1="50" y1="250" x2="450" y2="250" stroke="#e9f2f6" strokeWidth="2" />
        
        {data.map((item, i) => (
          <g key={item.label}>
            <rect
              x={100 + i * 200}
              y={250 - (item.value * 0.5 * barGrow)}
              width={80}
              height={item.value * 0.5 * barGrow}
              fill={i === 0 ? 'url(#barGrad)' : '#e0b44c'}
              stroke="#e9f2f6"
              strokeWidth="1"
            />
            <text x={140 + i * 200} y={275} fill="#e9f2f6" fontSize="14" textAnchor="middle">
              {item.label}
            </text>
            <text x={140 + i * 200} y={240 - (item.value * 0.5 * barGrow)} fill="#e9f2f6" fontSize="12" textAnchor="middle">
              {Math.round(item.value * barGrow)} kN
            </text>
          </g>
        ))}

        <circle 
          cx={300} 
          cy={250 - (175 * 0.5)} 
          r={10 * breakPointPulse} 
          fill="#d0523f" 
          stroke="#e9f2f6" 
          strokeWidth="2" 
        />
        <text x={300} y={130} fill="#d0523f" fontSize="12" textAnchor="middle" fontWeight="bold">
          BRUCHPUNKT
        </text>
      </svg>

      {p.title ? (
        <div style={{
          marginTop: 40,
          transform: `translateY(${captionRise}px)`,
          fontFamily: 'sans-serif',
          fontSize: 42,
          color: '#e9f2f6',
          textTransform: 'uppercase',
          letterSpacing: '2px'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};