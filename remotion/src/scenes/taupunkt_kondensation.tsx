import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const TaupunktKondensationScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = (p.dur || 5) * fps;

  const opacity = p.enter * p.exit;
  const flow = interpolate(frame, [0, span], [0, 1]);
  const condense = interpolate(frame, [span * 0.2, span * 0.5], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const drip = interpolate(frame, [span * 0.4, span], [0, 1], {
    easing: Easing.in(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const particles = [0, 1, 2, 3, 4, 5, 6, 7];
  const ticks = [0, 1, 2, 3, 4];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 500 300" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="tempGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#5b7f9c" stopOpacity={0.6} />
            <stop offset="0.4" stopColor="#e0b44c" stopOpacity={0.4} />
            <stop offset="1" stopColor="#d0523f" stopOpacity={0.2} />
          </linearGradient>
        </defs>

        {/* Temperature Gradient Area */}
        <rect x={110} y={40} width={340} height={220} fill="url(#tempGrad)" />

        {/* Pipe Wall Cross-Section */}
        <rect x={80} y={40} width={30} fill="#8a949b" stroke="#e9f2f6" strokeWidth={1} />
        <text x={95} y={35} fill="#e9f2f6" fontSize={10} textAnchor="middle">ROHRWAND</text>
        <text x={95} y={275} fill="#5b7f9c" fontSize={12} textAnchor="middle" fontWeight="bold">8°C</text>

        {/* Dew Point Threshold Line */}
        <line x1={180} y1={40} x2={180} y2={260} stroke="#e0b44c" strokeWidth={1.5} strokeDasharray="4 4" opacity={condense} />
        <text x={185} y={55} fill="#e0b44c" fontSize={10} opacity={condense}>TAUPUNKT (14°C)</text>

        {/* Air Particles */}
        {particles.map((i) => {
          const xPos = 450 - ((i * 60 + flow * 400) % 360);
          const pOpacity = interpolate(xPos, [110, 130], [0, 1], { extrapolateLeft: 'clamp' });
          return (
            <circle
              key={`p-${i}`}
              cx={xPos}
              cy={70 + i * 25}
              r={3}
              fill="#e9f2f6"
              opacity={pOpacity}
            />
          );
        })}

        {/* Condensation Drops */}
        {particles.map((i) => {
          const dropY = 70 + i * 25 + drip * 120;
          return (
            <path
              key={`d-${i}`}
              d="M 0,0 Q 4,8 0,12 Q -4,8 0,0"
              transform={`translate(112, ${dropY}) scale(${condense * 0.8})`}
              fill="#5b7f9c"
              opacity={condense}
            />
          );
        })}

        {/* Scale/Axis */}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={110 + t * 85} y1={260} x2={110 + t * 85} y2={268} stroke="#e9f2f6" strokeWidth={1} />
            <text x={110 + t * 85} y={282} fill="#e9f2f6" fontSize={9} textAnchor="middle">
              {8 + t * 6}°C
            </text>
          </g>
        ))}
        <text x={450} y={275} fill="#d0523f" fontSize={12} textAnchor="end" fontWeight="bold">32°C LUFT</text>
      </svg>

      {p.title && (
        <div style={{
          position: 'absolute',
          bottom: '10%',
          color: '#e9f2f6',
          fontSize: 32,
          fontFamily: 'sans-serif',
          borderLeft: '4px solid #e0b44c',
          paddingLeft: 20,
          opacity: condense
        }}>
          {p.title}
        </div>
      )}
    </AbsoluteFill>
  );
};