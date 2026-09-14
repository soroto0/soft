import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const TensionRedistributionModelScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const bow = interpolate(frame, [0, span * 0.7], [0, 70], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pull = interpolate(frame, [span * 0.2, span * 0.9], [0, 140], {
    easing: Easing.out(Easing.exp),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const stress = interpolate(frame, [span * 0.4, span], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const bolts = [-20, -8, 8, 20];
  const forceLines = [0, 1, 2];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg 
        width={width * 0.8} 
        height={height * 0.8} 
        viewBox="0 0 800 500" 
        fill="none"
      >
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#e0b44c" />
          </marker>
          <linearGradient id="stressGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#e9f2f6" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#d0523f" stopOpacity={stress} />
            <stop offset="100%" stopColor="#e9f2f6" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* Main Beam Structure */}
        <path
          d={`M 100 200 Q 400 ${200 + bow * 2} 700 200`}
          stroke="#8a949b"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d={`M 100 230 Q 400 ${230 + bow * 2} 700 230`}
          stroke="#8a949b"
          strokeWidth="4"
          strokeLinecap="round"
          opacity="0.6"
        />

        {/* Stress Zone Highlight */}
        <rect 
          x={350} 
          y={180 + bow * 2} 
          width={100} 
          height={70} 
          fill="url(#stressGrad)" 
          opacity={stress * 0.5}
        />

        {/* Central Splice Plate / Joint */}
        <rect
          x={370}
          y={190 + bow * 2}
          width={60}
          height={50}
          fill="#5d6a73"
          stroke="#e9f2f6"
          strokeWidth="1"
        />

        {/* Bolts */}
        {bolts.map((bx) => (
          <circle
            key={bx}
            cx={400 + bx}
            cy={215 + bow * 2}
            r={4}
            fill={stress > 0.8 ? '#d0523f' : '#e9f2f6'}
            stroke="#e9f2f6"
            strokeWidth="0.5"
          />
        ))}

        {/* Force Vectors (Horizontal Pull) */}
        <g transform={`translate(400, ${215 + bow * 2})`}>
          {/* Left Pull */}
          <line
            x1={-30}
            y1={0}
            x2={-30 - pull}
            y2={0}
            stroke="#e0b44c"
            strokeWidth={2 + stress * 3}
            markerEnd="url(#arrowhead)"
            opacity={pull > 10 ? 1 : 0}
          />
          {/* Right Pull */}
          <line
            x1={30}
            y1={0}
            x2={30 + pull}
            y2={0}
            stroke="#e0b44c"
            strokeWidth={2 + stress * 3}
            markerEnd="url(#arrowhead)"
            opacity={pull > 10 ? 1 : 0}
          />
          
          {/* Tension Detail Lines */}
          {forceLines.map((i) => (
            <React.Fragment key={i}>
              <line 
                x1={-40 - pull * 0.3} 
                y1={-15 + i * 15} 
                x2={-60 - pull * 0.6} 
                y2={-15 + i * 15} 
                stroke="#e0b44c" 
                strokeWidth="1" 
                opacity={stress * 0.7} 
              />
              <line 
                x1={40 + pull * 0.3} 
                y1={-15 + i * 15} 
                x2={60 + pull * 0.6} 
                y2={-15 + i * 15} 
                stroke="#e0b44c" 
                strokeWidth="1" 
                opacity={stress * 0.7} 
              />
            </React.Fragment>
          ))}
        </g>

        {/* Labels */}
        <text x={120} y={180} fill="#8a949b" fontSize="12" fontFamily="monospace">TRÄGERSTRUKTUR</text>
        <text x={400} y={170 + bow * 2} fill="#e9f2f6" fontSize="14" textAnchor="middle" fontWeight="bold">
          {stress > 0.5 ? "MAXIMALE ZUGKRAFT" : "SPANNUNGSZENTRUM"}
        </text>
        <text x={400 - pull - 40} y={245 + bow * 2} fill="#e0b44c" fontSize="10" textAnchor="end">F_tension</text>
        <text x={400 + pull + 40} y={245 + bow * 2} fill="#e0b44c" fontSize="10" textAnchor="start">F_tension</text>

        {/* Stress Gauge Axis */}
        <g transform="translate(100, 400)">
          <line x1="0" y1="0" x2="600" y2="0" stroke="#e9f2f6" strokeWidth="1" opacity="0.3" />
          <rect x="0" y="-5" width={600 * stress} height="10" fill="#d0523f" opacity="0.8" />
          <text x="0" y="25" fill="#e9f2f6" fontSize="10">0% LAST</text>
          <text x="600" y="25" fill="#d0523f" fontSize="10" textAnchor="end">100% SCHERKRÄFTE</text>
        </g>
      </svg>

      {p.title ? (
        <div style={{
          position: 'absolute',
          bottom: '10%',
          color: '#e9f2f6',
          fontSize: 32,
          fontFamily: 'sans-serif',
          letterSpacing: '0.1em',
          borderTop: '1px solid #e9f2f6',
          paddingTop: '10px',
          opacity: interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};