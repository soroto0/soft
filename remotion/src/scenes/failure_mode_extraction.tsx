import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const FailureModeExtractionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const pullOut = interpolate(frame, [span * 0.15, span * 0.85], [0, 240], {
    easing: Easing.bezier(0.33, 1, 0.68, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const distValue = interpolate(frame, [span * 0.15, span * 0.85], [0, 165], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelAlpha = interpolate(frame, [0, span * 0.1], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;
  
  const hatch = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const threads = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="50%" viewBox="0 0 500 700" style={{ overflow: 'visible' }}>
        <defs>
          <pattern id="concreteHatch" patternUnits="userSpaceOnUse" width="20" height="20" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="20" stroke="#e9f2f6" strokeWidth="0.5" opacity="0.3" />
          </pattern>
          <linearGradient id="rodGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#7a848b" />
            <stop offset="0.5" stopColor="#aab4bb" />
            <stop offset="1" stopColor="#7a848b" />
          </linearGradient>
        </defs>

        {/* Concrete Substrate */}
        <path
          d="M 50,50 L 450,50 L 450,400 L 310,400 L 310,120 L 190,120 L 190,400 L 50,400 Z"
          fill="none"
          stroke="#e9f2f6"
          strokeWidth="2"
        />
        <path
          d="M 50,50 L 450,50 L 450,400 L 310,400 L 310,120 L 190,120 L 190,400 L 50,400 Z"
          fill="url(#concreteHatch)"
        />
        
        {hatch.map((i) => (
          <circle key={`c-${i}`} cx={100 + (i * 30) % 300} cy={70 + (i * 25) % 300} r="1.5" fill="#e9f2f6" opacity="0.4" />
        ))}

        <text x="60" y="80" fill="#e9f2f6" fontSize="12" opacity={labelAlpha} fontWeight="bold">BETON C25/30</text>

        {/* Moving Assembly: Rod + Epoxy */}
        <g transform={`translate(0, ${pullOut})`}>
          {/* Epoxy Resin Plug */}
          <rect x="195" y="120" width="110" height="250" fill="#e0b44c" opacity="0.8" />
          <text x="315" y="250" fill="#e0b44c" fontSize="11" opacity={labelAlpha}>EPOXIDHARZ-VERBUND</text>
          
          {/* Threaded Rod */}
          <rect x="235" y="100" width="30" height="450" fill="url(#rodGrad)" />
          {threads.map((t) => (
            <line
              key={`t-${t}`}
              x1="235"
              y1={110 + t * 22}
              x2="265"
              y2={105 + t * 22}
              stroke="#5d6a73"
              strokeWidth="1.5"
            />
          ))}
          <text x="250" y="570" fill="#8a949b" fontSize="11" textAnchor="middle" opacity={labelAlpha}>GEWINDESTANGE M24</text>
          
          {/* Failure Indicator */}
          <path d="M 195,120 L 305,120" stroke="#d0523f" strokeWidth="3" strokeDasharray="4 2" />
        </g>

        {/* Dimension Lines */}
        <g opacity={pullOut > 10 ? 1 : 0}>
          <line x1="160" y1="120" x2="160" y2={120 + pullOut} stroke="#d0523f" strokeWidth="1.5" />
          <line x1="150" y1="120" x2="170" y2="120" stroke="#d0523f" strokeWidth="1.5" />
          <line x1="150" y1={120 + pullOut} x2="170" y2={120 + pullOut} stroke="#d0523f" strokeWidth="1.5" />
          
          <path
            d={`M 160,120 l -3,8 m 3,-8 l 3,8 M 160,${120 + pullOut} l -3,-8 m 3,8 l 3,-8`}
            fill="none"
            stroke="#d0523f"
            strokeWidth="1.5"
          />
          
          <text
            x="145"
            y={120 + pullOut / 2}
            fill="#d0523f"
            fontSize="16"
            textAnchor="end"
            dominantBaseline="middle"
            fontFamily="monospace"
          >
            {distValue.toFixed(1)} mm
          </text>
        </g>

        {/* Labels for static context */}
        <line x1="190" y1="120" x2="190" y2="400" stroke="#e9f2f6" strokeWidth="1" strokeDasharray="5 5" />
        <line x1="310" y1="120" x2="310" y2="400" stroke="#e9f2f6" strokeWidth="1" strokeDasharray="5 5" />
        <text x="250" y="110" fill="#e9f2f6" fontSize="10" textAnchor="middle" opacity={0.5}>URSPRÜNGLICHE BOHRFLUCHT</text>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            width: '100%',
            textAlign: 'center',
            fontFamily: 'Helvetica, Arial, sans-serif',
            fontSize: 42,
            fontWeight: 'bold',
            color: '#e9f2f6',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};