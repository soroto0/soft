import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const SeismicShearStressScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const quakeX = Math.sin(frame * 0.7) * interpolate(frame, [0, span * 0.15, span * 0.85, span], [0, 12, 12, 0], {
    easing: Easing.bezier(0.33, 1, 0.68, 1),
  });

  const stressLevel = interpolate(Math.sin(frame * 0.7), [-1, 1], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const arrowPop = interpolate(frame, [span * 0.1, span * 0.25], [0, 1], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const boltPositions = [80, 160, 240, 320];
  const concreteHatch = Array.from({ length: 12 }).map((_, i) => i);

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 300" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="steelGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5d6a73" />
            <stop offset="50%" stopColor="#8a949b" />
            <stop offset="100%" stopColor="#5d6a73" />
          </linearGradient>
          <clipPath id="concreteClip">
            <rect x="40" y="40" width="320" height="60" rx="2" />
          </clipPath>
        </defs>

        {/* Concrete Slab */}
        <g transform={`translate(${quakeX}, 0)`}>
          <rect x="40" y="40" width="320" height="60" fill="#c9d3d9" rx="2" />
          <g clipPath="url(#concreteClip)">
            {concreteHatch.map((i) => (
              <line
                key={i}
                x1={40 + i * 30}
                y1="40"
                x2={70 + i * 30}
                y2="100"
                stroke="#e9f2f6"
                strokeWidth="1"
                opacity="0.5"
              />
            ))}
          </g>
          <text x="50" y="35" fill="#e9f2f6" fontSize="10" fontWeight="bold" opacity={labelFade}>
            BETONFAHRBAHN (C30/37)
          </text>
          
          {/* Upper Shear Arrows */}
          <g opacity={arrowPop}>
            <path d="M 100 85 L 60 85 L 70 80 M 60 85 L 70 90" fill="none" stroke="#e0b44c" strokeWidth="2" />
            <path d="M 340 85 L 300 85 L 310 80 M 300 85 L 310 90" fill="none" stroke="#e0b44c" strokeWidth="2" />
          </g>
        </g>

        {/* Steel Beam (I-Beam Profile) */}
        <g transform={`translate(${-quakeX * 0.3}, 0)`}>
          <path
            d="M 40 105 H 360 V 115 H 210 V 180 H 360 V 190 H 40 V 180 H 190 V 115 H 40 Z"
            fill="url(#steelGrad)"
            stroke="#e9f2f6"
            strokeWidth="0.5"
          />
          <text x="50" y="210" fill="#e9f2f6" fontSize="10" fontWeight="bold" opacity={labelFade}>
            STAHLTRÄGER (S355)
          </text>

          {/* Lower Shear Arrows */}
          <g opacity={arrowPop}>
            <path d="M 60 110 L 100 110 L 90 105 M 100 110 L 90 115" fill="none" stroke="#e0b44c" strokeWidth="2" />
            <path d="M 300 110 L 340 110 L 330 105 M 340 110 L 330 115" fill="none" stroke="#e0b44c" strokeWidth="2" />
          </g>
        </g>

        {/* Bolts / Welds */}
        {boltPositions.map((pos, idx) => (
          <g key={pos} transform={`translate(${quakeX * 0.5}, 0)`}>
            <circle
              cx={pos}
              cy="102.5"
              r={4 + stressLevel * 3}
              fill={stressLevel > 0.5 ? '#d0523f' : '#e9f2f6'}
              stroke="#e0b44c"
              strokeWidth={stressLevel * 2}
            />
            {idx === 0 && (
              <g opacity={labelFade}>
                <line x1={pos} y1="102" x2={pos - 30} y2="140" stroke="#e9f2f6" strokeWidth="0.5" />
                <text x={pos - 35} y="152" fill="#e9f2f6" fontSize="9" textAnchor="middle">
                  SCHWEISSSTELLE
                </text>
              </g>
            )}
          </g>
        ))}

        {/* Force Vectors Label */}
        <text
          x="200"
          y="145"
          fill="#e0b44c"
          fontSize="12"
          textAnchor="middle"
          opacity={arrowPop}
          style={{ letterSpacing: '1px' }}
        >
          SCHERSPANNUNG (τ)
        </text>
      </svg>

      {p.title && (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            color: '#e9f2f6',
            fontFamily: 'sans-serif',
            fontSize: 32,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            borderLeft: '4px solid #d0523f',
            paddingLeft: '16px',
            opacity: labelFade,
          }}
        >
          {p.title}
        </div>
      )}
    </AbsoluteFill>
  );
};