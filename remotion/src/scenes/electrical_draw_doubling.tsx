import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ElectricalDrawDoublingScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = Math.max(1, Math.round((p.dur || 6) * fps));

  const amperage = interpolate(frame, [0, duration], [14, 29], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const glow = interpolate(frame, [0, duration], [0.2, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const needleAngle = interpolate(amperage, [10, 30], [-90, 90], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const ticks = [10, 15, 20, 25, 30];
  const coils = [0, 1, 2];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 500 300">
        <defs>
          <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#e9f2f6" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#d0523f" />
          </linearGradient>
        </defs>

        <g transform="translate(120, 150)">
          <path d="M -80 0 A 80 80 0 0 1 80 0" fill="none" stroke="#e9f2f6" strokeWidth="2" />
          {ticks.map((t) => (
            <g key={t} transform={`rotate(${interpolate(t, [10, 30], [-90, 90])})`}>
              <line x1="0" y1="-80" x2="0" y2="-95" stroke="#e9f2f6" strokeWidth="2" />
              <text x="0" y="-105" fill="#e9f2f6" fontSize="12" textAnchor="middle">{t}A</text>
            </g>
          ))}
          <line x1="0" y1="0" x2="0" y2="-70" stroke="#d0523f" strokeWidth="4" 
                transform={`rotate(${needleAngle})`} />
          <circle cx="0" cy="0" r="6" fill="#e9f2f6" />
        </g>

        <g transform="translate(350, 150)">
          {coils.map((i) => (
            <path key={i} d={`M -40 ${i * 40 - 40} Q 0 ${i * 40 - 60} 40 ${i * 40 - 40}`} 
                  fill="none" stroke={i === 1 ? "#d0523f" : "#e9f2f6"} 
                  strokeWidth={2 + glow * 2} opacity={0.5 + glow * 0.5} />
          ))}
          <text x="0" y="80" fill="#e9f2f6" fontSize="14" textAnchor="middle">WINDING RESISTANCE</text>
        </g>
      </svg>

      {p.title ? (
        <div style={{ 
          marginTop: 40, 
          fontFamily: "'Segoe UI', Arial, sans-serif", 
          fontSize: 48, 
          fontWeight: 'bold',
          color: '#d0523f',
          textTransform: 'uppercase',
          letterSpacing: '2px'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};