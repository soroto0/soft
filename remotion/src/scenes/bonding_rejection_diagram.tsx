import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const BondingRejectionDiagramScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const yPos = interpolate(
    frame,
    [0, span * 0.35, span * 0.45, span * 0.6, span * 1.0],
    [-100, 140, 110, 125, 120],
    {
      easing: Easing.bezier(0.33, 1, 0.68, 1),
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  const rejectionScale = interpolate(
    frame,
    [span * 0.3, span * 0.4, span * 0.6],
    [0, 1.2, 1],
    {
      easing: Easing.out(Easing.back(1.5)),
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  const labelOpacity = interpolate(
    frame,
    [span * 0.1, span * 0.3],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  const grainLines = [195, 205, 215, 225, 235];
  const forceArrows = [100, 200, 300];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 300" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="woodGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5d6a73" />
            <stop offset="1" stopColor="#3a444a" />
          </linearGradient>
          <linearGradient id="coatGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e0b44c" stopOpacity="0.8" />
            <stop offset="1" stopColor="#e0b44c" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        {/* Wood Substrate */}
        <rect x="40" y="180" width="320" height="80" fill="url(#woodGrad)" stroke="#e9f2f6" strokeWidth="0.5" />
        {grainLines.map((y, i) => (
          <path
            key={i}
            d={`M 45 ${y} Q 120 ${y - 3} 200 ${y} T 355 ${y}`}
            fill="none"
            stroke="#e9f2f6"
            strokeWidth="0.3"
            opacity="0.4"
          />
        ))}
        <text x="45" y="275" fill="#e9f2f6" fontSize="10" fontWeight="300">WOOD SUBSTRATE (POROUS)</text>

        {/* Invisible Silicone Barrier Representation */}
        <line x1="40" y1="175" x2="360" y2="175" stroke="#d0523f" strokeWidth="1.5" strokeDasharray="4 2" opacity={0.6} />
        <text x="360" y="170" fill="#d0523f" fontSize="9" textAnchor="end" opacity={labelOpacity}>
          INVISIBLE SILICONE BARRIER
        </text>

        {/* Rejection Force Arrows */}
        {forceArrows.map((x) => (
          <g key={x} transform={`translate(${x + 50}, 170) scale(${rejectionScale})`}>
            <path d="M 0 0 L 0 -25 M -5 -20 L 0 -25 L 5 -20" fill="none" stroke="#d0523f" strokeWidth="2" />
          </g>
        ))}
        <text 
          x="200" 
          y="135" 
          fill="#d0523f" 
          fontSize="11" 
          textAnchor="middle" 
          opacity={rejectionScale}
          style={{ letterSpacing: '1px' }}
        >
          SURFACE TENSION REJECTION
        </text>

        {/* New Topcoat Layer */}
        <g transform={`translate(0, ${yPos})`}>
          <rect x="60" y="0" width="280" height="30" fill="url(#coatGrad)" stroke="#e0b44c" strokeWidth="1" />
          <text x="200" y="18" fill="#e9f2f6" fontSize="10" textAnchor="middle" fontWeight="bold">
            NEW TOPCOAT LAYER
          </text>
          <path d="M 60 30 Q 130 35 200 30 T 340 30" fill="none" stroke="#e0b44c" strokeWidth="1" />
        </g>

        {/* Measurement Axis */}
        <line x1="380" y1="50" x2="380" y2="260" stroke="#e9f2f6" strokeWidth="0.5" />
        {[50, 120, 180, 260].map((tick) => (
          <line key={tick} x1="377" y1={tick} x2="383" y2={tick} stroke="#e9f2f6" strokeWidth="0.5" />
        ))}
        <text x="385" y="55" fill="#e9f2f6" fontSize="7" transform="rotate(90 385,55)">Z-AXIS PROXIMITY</text>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            fontFamily: 'sans-serif',
            fontSize: 42,
            fontWeight: 700,
            color: '#e9f2f6',
            letterSpacing: '2px',
            textTransform: 'uppercase',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};