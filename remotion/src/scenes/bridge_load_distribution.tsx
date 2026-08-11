import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const BridgeLoadDistributionScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = Math.max(1, Math.round((p.dur || 1) * fps));

  const progress = interpolate(frame, [0, duration * 0.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const heat = interpolate(frame, [duration * 0.3, duration * 0.8], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const tally = interpolate(frame, [duration * 0.1, duration * 0.9], [0, 54], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleY = interpolate(frame, [0, duration * 0.2], [15, 0], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ticks = [0, 50, 100, 155];
  const loadPoints = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
  const trussPoints = [0, 1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <AbsoluteFill
      style={{
        opacity,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <svg
        width="80%"
        height="60%"
        viewBox="0 0 800 400"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="loadHeat" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#e0b44c" stopOpacity={0} />
            <stop offset="50%" stopColor="#d0523f" stopOpacity={1} />
            <stop offset="100%" stopColor="#e0b44c" stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* X-Axis / Ground Line */}
        <line
          x1="100"
          y1="320"
          x2={100 + 600 * progress}
          y2="320"
          stroke="#e9f2f6"
          strokeWidth="2"
        />

        {/* Meter Ticks */}
        {ticks.map((m) => {
          const x = 100 + (m / 155) * 600;
          return (
            <g key={m} style={{ opacity: progress }}>
              <line x1={x} y1="320" x2={x} y2="330" stroke="#e9f2f6" strokeWidth="1" />
              <text
                x={x}
                y="350"
                fill="#e9f2f6"
                fontSize="12"
                textAnchor="middle"
                fontFamily="monospace"
              >
                {m}m
              </text>
            </g>
          );
        })}

        {/* Bridge Structure Elevation */}
        <g opacity={progress}>
          {/* Bottom Chord */}
          <line x1="100" y1="300" x2="700" y2="300" stroke="#e9f2f6" strokeWidth="3" />
          {/* Top Chord (Arch) */}
          <path
            d="M 100 300 Q 400 150 700 300"
            fill="none"
            stroke="#e9f2f6"
            strokeWidth="3"
          />
          {/* Truss Verticals/Diagonals */}
          {trussPoints.map((i) => {
            const x = 100 + i * 75;
            const archY = 300 - Math.sin((i / 8) * Math.PI) * 150;
            return (
              <line
                key={i}
                x1={x}
                y1="300"
                x2={x}
                y2={archY}
                stroke="#e9f2f6"
                strokeWidth="1"
                strokeOpacity="0.5"
              />
            );
          })}
        </g>

        {/* Heat Mapping Concentration */}
        <rect
          x="100"
          y="280"
          width="600"
          height="40"
          fill="url(#loadHeat)"
          opacity={heat * 0.6}
        />

        {/* Force Arrows */}
        {loadPoints.map((i) => {
          const x = 120 + i * 37.3;
          const intensity = Math.sin((i / 15) * Math.PI);
          const arrowLen = intensity * 60 * (tally / 54);
          return (
            <g key={i} opacity={heat}>
              <line
                x1={x}
                y1={280 - arrowLen}
                x2={x}
                y2="280"
                stroke="#d0523f"
                strokeWidth="2"
              />
              <path
                d={`M ${x - 4} 274 L ${x} 280 L ${x + 4} 274`}
                fill="none"
                stroke="#d0523f"
                strokeWidth="2"
              />
            </g>
          );
        })}

        {/* Tally Display */}
        <g transform="translate(400, 100)">
          <text
            fill="#e0b44c"
            fontSize="48"
            fontWeight="bold"
            textAnchor="middle"
            fontFamily="monospace"
          >
            {tally.toFixed(2)}
          </text>
          <text
            y="30"
            fill="#e9f2f6"
            fontSize="16"
            textAnchor="middle"
            fontFamily="monospace"
            letterSpacing="2"
          >
            METRIC TONS
          </text>
        </g>

        {/* Labels for Concentration */}
        <text
          x="400"
          y="260"
          fill="#d0523f"
          fontSize="10"
          textAnchor="middle"
          opacity={heat}
          fontFamily="monospace"
        >
          MAX CONCENTRATION ZONE
        </text>
      </svg>

      {p.title ? (
        <div
          style={{
            marginTop: 40,
            color: '#e9f2f6',
            fontSize: 28,
            fontFamily: 'Helvetica, Arial, sans-serif',
            letterSpacing: '0.15em',
            transform: `translateY(${titleY}px)`,
            borderTop: '1px solid #e9f2f6',
            paddingTop: 10,
          }}
        >
          {p.title.toUpperCase()}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};