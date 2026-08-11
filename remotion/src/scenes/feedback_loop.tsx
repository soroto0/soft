import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const FeedbackLoopScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 2) * fps));

  const merge = interpolate(frame, [span * 0.1, span * 0.8], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const flow = interpolate(frame, [0, span], [0, 300], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleRise = interpolate(frame, [0, span * 0.2], [15, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pulse = Math.sin((frame * Math.PI * 2) / (fps * 2)) * 3;
  const ticks = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  // Derived geometry
  const centerX = 200;
  const centerY = 150;
  const separation = 80 * (1 - merge);
  const radius = 45 + 5 * merge + pulse;

  return (
    <AbsoluteFill
      style={{
        opacity,
        width,
        height,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <svg width="70%" viewBox="0 0 400 300" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="unifyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d0523f" />
            <stop offset="50%" stopColor="#e0b44c" />
            <stop offset="100%" stopColor="#e9f2f6" />
          </linearGradient>
          <mask id="flowMask">
            <rect
              x={centerX - separation - radius - 10}
              y={centerY - radius - 10}
              width={separation * 2 + radius * 2 + 20}
              height={radius * 2 + 20}
              rx={radius}
              fill="white"
            />
          </mask>
        </defs>

        {/* Organic Shape / Metaball Container */}
        <rect
          x={centerX - separation - radius}
          y={centerY - radius}
          width={separation * 2 + radius * 2}
          height={radius * 2}
          rx={radius}
          fill="none"
          stroke="url(#unifyGrad)"
          strokeWidth={1.5}
          strokeOpacity={0.4 + 0.6 * merge}
        />

        {/* Flow Lines (Circular loops) */}
        {[0.7, 0.85, 1.0].map((scale, i) => (
          <rect
            key={i}
            x={centerX - (separation + radius) * scale}
            y={centerY - radius * scale}
            width={(separation * 2 + radius * 2) * scale}
            height={radius * 2 * scale}
            rx={radius * scale}
            fill="none"
            stroke={i === 1 ? "#e0b44c" : "#e9f2f6"}
            strokeWidth={0.8}
            strokeDasharray="10 15"
            strokeDashoffset={-flow * (1 + i * 0.2)}
            opacity={0.3 + 0.7 * merge}
          />
        ))}

        {/* Core Nodes */}
        <circle
          cx={centerX - separation}
          cy={centerY}
          r={radius * 0.4}
          fill="#d0523f"
          opacity={1 - merge * 0.5}
        />
        <circle
          cx={centerX + separation}
          cy={centerY}
          r={radius * 0.4}
          fill="#e9f2f6"
          opacity={1 - merge * 0.5}
        />

        {/* Labels */}
        <g fontSize="8" fontFamily="monospace" letterSpacing="1">
          <text
            x={centerX - 80}
            y={centerY - 70}
            fill="#d0523f"
            textAnchor="middle"
            opacity={1 - merge}
          >
            HARDWARE / EJECUCIÓN
          </text>
          <text
            x={centerX + 80}
            y={centerY - 70}
            fill="#e9f2f6"
            textAnchor="middle"
            opacity={1 - merge}
          >
            SOFTWARE / INSTRUCCIÓN
          </text>
          <text
            x={centerX}
            y={centerY + 80}
            fill="#e0b44c"
            textAnchor="middle"
            opacity={merge}
            fontSize="10"
            fontWeight="bold"
          >
            SISTEMA AUTO-MODIFICABLE
          </text>
        </g>

        {/* Real-time feedback indicators (Ticks) */}
        {ticks.map((t) => {
          const xPos = 75 + t * 25;
          const active = (frame / 5) % ticks.length > t;
          return (
            <g key={t} opacity={0.4}>
              <line
                x1={xPos}
                y1={240}
                x2={xPos}
                y2={250}
                stroke="#e9f2f6"
                strokeWidth={0.5}
              />
              <rect
                x={xPos - 2}
                y={255}
                width={4}
                height={2}
                fill={active ? "#e0b44c" : "#5d6a73"}
              />
            </g>
          );
        })}
        <text x="200" y="275" fill="#e9f2f6" fontSize="6" textAnchor="middle" opacity="0.5">
          PROCESAMIENTO EN TIEMPO REAL v.2.0.4
        </text>
      </svg>

      {p.title ? (
        <div
          style={{
            marginTop: 40,
            transform: `translateY(${titleRise}px)`,
            fontFamily: 'Helvetica, Arial, sans-serif',
            fontSize: 28,
            color: '#e9f2f6',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            borderTop: '1px solid #e0b44c',
            paddingTop: 10,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};