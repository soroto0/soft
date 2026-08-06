import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const FaucetInternalCutawayScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const reveal = interpolate(frame, [0, span * 0.15], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const chemProgress = interpolate(frame, [span * 0.2, span * 0.55], [0, 1], {
    easing: Easing.in(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const disintegrate = interpolate(frame, [span * 0.5, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.poly(2)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shiver = interpolate(frame % 6, [0, 3, 6], [0, 2, 0]);
  const opacity = p.enter * p.exit;

  const centerX = 400;
  const centerY = 300;

  const chemicals = [
    { id: 1, delay: 0, y: -20 },
    { id: 2, delay: 0.1, y: 0 },
    { id: 3, delay: 0.2, y: 20 },
  ];

  const labels = [
    { x: 550, y: 180, text: 'BRASS HOUSING', line: { x1: 545, y1: 180, x2: 480, y2: 220 } },
    { x: 550, y: 300, text: 'VALVE STEM', line: { x1: 545, y1: 300, x2: 420, y2: 300 } },
    { x: 250, y: 420, text: 'ELASTOMERIC SEAL', line: { x1: 310, y1: 415, x2: 380, y2: 340 } },
  ];

  return (
    <AbsoluteFill style={{ opacity, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <svg
        width={width * 0.8}
        height={height * 0.8}
        viewBox="0 0 800 600"
        fill="none"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="metalGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8a949b" />
            <stop offset="50%" stopColor="#c9d3d9" />
            <stop offset="100%" stopColor="#5d6a73" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Faucet Housing Cutaway */}
        <path
          d="M 320,150 L 480,150 L 480,450 L 320,450 Z"
          stroke="#e9f2f6"
          strokeWidth="2"
          strokeDasharray="10 5"
          opacity={reveal * 0.4}
        />
        <path
          d="M 300,200 L 500,200 L 500,400 L 300,400 Z"
          stroke="#e9f2f6"
          strokeWidth="1"
          opacity={reveal * 0.2}
        />

        {/* Internal Stem */}
        <rect
          x={370}
          y={150}
          width={60}
          height={300}
          fill="url(#metalGrad)"
          opacity={reveal * 0.8}
          stroke="#e9f2f6"
          strokeWidth="0.5"
        />

        {/* The Seal (O-Ring) */}
        <g transform={`translate(${centerX}, ${centerY})`}>
          <ellipse
            cx={0}
            cy={0}
            rx={35 - disintegrate * 15 + (disintegrate > 0 ? shiver : 0)}
            ry={12 - disintegrate * 8 + (disintegrate > 0 ? shiver : 0)}
            stroke={disintegrate > 0.5 ? '#d0523f' : '#e0b44c'}
            strokeWidth={4 - disintegrate * 2}
            fill={disintegrate > 0.8 ? 'none' : '#e0b44c'}
            fillOpacity={0.3 - disintegrate * 0.3}
            opacity={reveal}
          />
          {/* Second ring for depth */}
          <ellipse
            cx={0}
            cy={15}
            rx={35 - disintegrate * 20}
            ry={12 - disintegrate * 10}
            stroke={disintegrate > 0.5 ? '#d0523f' : '#e0b44c'}
            strokeWidth={2}
            opacity={reveal * 0.6 * (1 - disintegrate)}
          />
        </g>

        {/* Chemical Ingress */}
        {chemicals.map((chem) => {
          const individualProgress = interpolate(
            chemProgress,
            [chem.delay, 1],
            [0, 1],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          );
          const chemX = interpolate(individualProgress, [0, 1], [50, centerX - 40]);
          return (
            <g key={chem.id} opacity={individualProgress * (1 - disintegrate * 0.8)}>
              <circle
                cx={chemX}
                cy={centerY + chem.y}
                r={6}
                fill="#d0523f"
                filter="url(#glow)"
              />
              <path
                d={`M ${chemX - 10} ${centerY + chem.y} L ${chemX - 30} ${centerY + chem.y}`}
                stroke="#d0523f"
                strokeWidth="2"
                opacity={0.5}
              />
            </g>
          );
        })}

        {/* Labels and Leader Lines */}
        {labels.map((label, i) => (
          <g key={i} opacity={reveal}>
            <line
              x1={label.line.x1}
              y1={label.line.y1}
              x2={label.line.x2}
              y2={label.line.y2}
              stroke="#e9f2f6"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
            <text
              x={label.x}
              y={label.y}
              fill="#e9f2f6"
              fontSize="14"
              fontFamily="monospace"
              dominantBaseline="middle"
            >
              {label.text}
            </text>
          </g>
        ))}

        {/* Chemical Warning Label */}
        <g opacity={chemProgress}>
          <text
            x={50}
            y={centerY - 40}
            fill="#d0523f"
            fontSize="12"
            fontFamily="monospace"
            fontWeight="bold"
          >
            CHEMICAL INGRESS
          </text>
          <line x1={50} y1={centerY - 30} x2={150} y2={centerY - 30} stroke="#d0523f" strokeWidth="2" />
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            width: '100%',
            textAlign: 'center',
            color: '#e9f2f6',
            fontSize: 42,
            fontFamily: 'serif',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            opacity: reveal,
            transform: `translateY(${(1 - reveal) * 20}px)`,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};