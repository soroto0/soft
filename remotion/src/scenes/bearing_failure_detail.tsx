import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const BearingFailureDetailScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const deform = interpolate(frame, [span * 0.15, span * 0.85], [0, 80], {
    easing: Easing.bezier(0.33, 1, 0.68, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const stress = interpolate(frame, [span * 0.2, span * 0.7], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const boltX = interpolate(frame, [span * 0.15, span * 0.85], [0, 65], {
    easing: Easing.bezier(0.33, 1, 0.68, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleY = interpolate(frame, [0, span * 0.2], [20, 0], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ticks = [0, 1, 2, 3, 4, 5];
  const forceArrows = [0, 1, 2];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width={width * 0.8} height={height * 0.7} viewBox="0 0 800 450">
        <defs>
          <linearGradient id="stressGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#e0b44c" stopOpacity={0} />
            <stop offset="50%" stopColor="#e0b44c" stopOpacity={0.6} />
            <stop offset="100%" stopColor="#d0523f" />
          </linearGradient>
          <mask id="holeMask">
            <rect x="0" y="0" width="800" height="450" fill="white" />
            <path
              d={`M 340,225 
                 m -60,0 
                 a 60,60 0 1,1 120,0 
                 l ${deform},0 
                 a 60,60 0 1,1 -120,0 
                 z`}
              fill="black"
            />
          </mask>
        </defs>

        {/* Steel Plate */}
        <rect
          x="100"
          y="100"
          width="600"
          height="250"
          fill="#c9d3d9"
          mask="url(#holeMask)"
          stroke="#e9f2f6"
          strokeWidth="2"
        />

        {/* Stress Zone */}
        <path
          d={`M ${400 + deform},165 
             a 60,60 0 0,1 0,120 
             l -${deform * 0.5},0 
             a 60,60 0 0,0 0,-120 
             z`}
          fill="url(#stressGrad)"
          opacity={stress}
        />

        {/* Deformed Perimeter Highlight */}
        <path
          d={`M 340,165 
             L ${340 + deform},165 
             A 60,60 0 0,1 ${340 + deform},285 
             L 340,285`}
          fill="none"
          stroke="#e0b44c"
          strokeWidth="3"
          strokeDasharray="10 5"
          opacity={stress}
        />

        {/* Bolt */}
        <circle
          cx={340 + boltX}
          cy={225}
          r={58}
          fill="#8a949b"
          stroke="#e9f2f6"
          strokeWidth="2"
        />

        {/* Force Arrows */}
        {forceArrows.map((i) => (
          <g key={i} transform={`translate(${200 + boltX}, ${185 + i * 40})`}>
            <line
              x1="0"
              y1="0"
              x2={60 * stress}
              y2="0"
              stroke="#d0523f"
              strokeWidth="4"
            />
            <path
              d={`M ${60 * stress - 5},-5 L ${60 * stress + 5},0 L ${60 * stress - 5},5 Z`}
              fill="#d0523f"
              opacity={stress}
            />
          </g>
        ))}

        {/* Labels and Measurements */}
        <text x="110" y="125" fill="#5d6a73" fontSize="14" fontWeight="bold">
          STAHLPLATTE S235
        </text>
        <text x={340 + boltX} y={225} fill="#e9f2f6" fontSize="12" textAnchor="middle">
          BOLZEN
        </text>

        {/* Scale / Ruler */}
        <g transform="translate(100, 380)">
          <line x1="0" y1="0" x2="600" y2="0" stroke="#e9f2f6" strokeWidth="1" />
          {ticks.map((t) => (
            <g key={t} transform={`translate(${t * 120}, 0)`}>
              <line x1="0" y1="0" x2="0" y2="10" stroke="#e9f2f6" strokeWidth="1" />
              <text x="0" y="25" fill="#e9f2f6" fontSize="10" textAnchor="middle">
                {t * 10}mm
              </text>
            </g>
          ))}
        </g>

        {/* Stress Legend */}
        <g transform="translate(500, 50)">
          <rect x="0" y="0" width="150" height="10" fill="url(#stressGrad)" />
          <text x="0" y="-5" fill="#e9f2f6" fontSize="10">0 MPa</text>
          <text x="150" y="-5" fill="#e9f2f6" fontSize="10" textAnchor="end">460 MPa</text>
          <text x="75" y="25" fill="#e0b44c" fontSize="10" textAnchor="middle">SPANNUNGSVERLAUF</text>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            color: '#e9f2f6',
            fontSize: 48,
            fontFamily: 'sans-serif',
            fontWeight: 'bold',
            letterSpacing: '0.1em',
            transform: `translateY(${titleY}px)`,
            textShadow: '0 4px 10px rgba(0,0,0,0.3)',
          }}
        >
          {p.title.toUpperCase()}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};