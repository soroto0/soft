import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const HydraulicFracturingScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const opacity = p.enter * p.exit;

  const wedgeX = interpolate(frame, [0, span * 0.8], [width * 0.15, width * 0.75], {
    easing: Easing.bezier(0.33, 1, 0.68, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const gap = interpolate(frame, [span * 0.1, span * 0.9], [2, 70], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const forceAlpha = interpolate(frame, [span * 0.4, span * 0.7], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const arrowPositions = [0.3, 0.45, 0.6];
  const pores = [
    { x: 0.25, y: 0.35 }, { x: 0.4, y: 0.3 }, { x: 0.55, y: 0.38 }, { x: 0.7, y: 0.32 },
    { x: 0.25, y: 0.65 }, { x: 0.4, y: 0.7 }, { x: 0.55, y: 0.62 }, { x: 0.7, y: 0.68 }
  ];

  return (
    <AbsoluteFill style={{ opacity }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id="fluidGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#e0b44c" stopOpacity="0.8" />
            <stop offset="80%" stopColor="#d0523f" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#e9f2f6" stopOpacity="1" />
          </linearGradient>
          <pattern id="porePattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#e9f2f6" opacity="0.2" />
          </pattern>
        </defs>

        {/* Top Layer (Schluff) */}
        <rect
          x={width * 0.1}
          y={height * 0.5 - 220 - gap / 2}
          width={width * 0.8}
          height={220}
          fill="#5d6a73"
          stroke="#e9f2f6"
          strokeWidth="1"
        />
        <rect
          x={width * 0.1}
          y={height * 0.5 - 220 - gap / 2}
          width={width * 0.8}
          height={220}
          fill="url(#porePattern)"
        />

        {/* Bottom Layer (Schluff) */}
        <rect
          x={width * 0.1}
          y={height * 0.5 + gap / 2}
          width={width * 0.8}
          height={220}
          fill="#5d6a73"
          stroke="#e9f2f6"
          strokeWidth="1"
        />
        <rect
          x={width * 0.1}
          y={height * 0.5 + gap / 2}
          width={width * 0.8}
          height={220}
          fill="url(#porePattern)"
        />

        {/* Hydraulic Wedge / Fluid */}
        <path
          d={`M ${width * 0.1} ${height * 0.5 - gap / 2} 
             L ${wedgeX} ${height * 0.5} 
             L ${width * 0.1} ${height * 0.5 + gap / 2} Z`}
          fill="url(#fluidGrad)"
          stroke="#e0b44c"
          strokeWidth="2"
        />

        {/* Force Arrows */}
        {arrowPositions.map((pos, i) => (
          <g key={i} opacity={forceAlpha}>
            {/* Upward Force */}
            <line
              x1={width * pos}
              y1={height * 0.5 - gap / 2 - 5}
              x2={width * pos}
              y2={height * 0.5 - gap / 2 - 40}
              stroke="#d0523f"
              strokeWidth="3"
            />
            <path d={`M ${width * pos - 6} ${height * 0.5 - gap / 2 - 34} L ${width * pos} ${height * 0.5 - gap / 2 - 42} L ${width * pos + 6} ${height * 0.5 - gap / 2 - 34}`} fill="none" stroke="#d0523f" strokeWidth="3" />
            
            {/* Downward Force */}
            <line
              x1={width * pos}
              y1={height * 0.5 + gap / 2 + 5}
              x2={width * pos}
              y2={height * 0.5 + gap / 2 + 40}
              stroke="#d0523f"
              strokeWidth="3"
            />
            <path d={`M ${width * pos - 6} ${height * 0.5 + gap / 2 + 34} L ${width * pos} ${height * 0.5 + gap / 2 + 42} L ${width * pos + 6} ${height * 0.5 + gap / 2 + 34}`} fill="none" stroke="#d0523f" strokeWidth="3" />
          </g>
        ))}

        {/* Microscopic Pores being pushed */}
        {pores.map((p, i) => (
          <circle
            key={i}
            cx={width * p.x}
            cy={height * p.y + (p.y < 0.5 ? -gap / 2 : gap / 2)}
            r="3"
            fill="#e9f2f6"
            opacity={0.6}
          />
        ))}

        {/* Labels */}
        <text x={width * 0.12} y={height * 0.5 - 180 - gap / 2} fill="#e9f2f6" fontSize="14" fontFamily="monospace">SCHLUFFSCHICHT (SILT)</text>
        <text x={width * 0.12} y={height * 0.5 + 200 + gap / 2} fill="#e9f2f6" fontSize="14" fontFamily="monospace">PORÖSES MEDIUM</text>
        
        <line x1={wedgeX} y1={height * 0.5} x2={wedgeX + 40} y2={height * 0.5 - 60} stroke="#e9f2f6" strokeWidth="1" opacity={forceAlpha} />
        <text x={wedgeX + 45} y={height * 0.5 - 65} fill="#e0b44c" fontSize="16" fontWeight="bold" opacity={forceAlpha}>FLUIDDRUCK</text>

        {/* Scale Ticks */}
        {[0, 1, 2, 3, 4].map((t) => (
          <line
            key={t}
            x1={width * 0.1 + t * (width * 0.2)}
            y1={height * 0.85}
            x2={width * 0.1 + t * (width * 0.2)}
            y2={height * 0.85 + 10}
            stroke="#e9f2f6"
            strokeWidth="1"
          />
        ))}
      </svg>

      {p.title ? (
        <div style={{
          position: 'absolute',
          bottom: height * 0.1,
          width: '100%',
          textAlign: 'center',
          color: '#e9f2f6',
          fontSize: 42,
          fontFamily: 'sans-serif',
          fontWeight: 'bold',
          letterSpacing: '0.1em',
          textTransform: 'uppercase'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};