import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const NeutralAxisStressesScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const growth = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const stress = interpolate(frame, [span * 0.2, span * 0.7], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labels = interpolate(frame, [span * 0.5, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const arrowIndices = [0, 1, 2, 3, 4];
  const steelPositions = [80, 120, 160, 200, 240];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 300" style={{ overflow: 'visible' }}>
        {/* Concrete Cross-Section */}
        <rect
          x="60"
          y="50"
          width="200"
          height="150"
          fill="#c9d3d9"
          stroke="#e9f2f6"
          strokeWidth="1"
          opacity={growth}
        />

        {/* Neutral Zone Band */}
        <rect
          x="60"
          y={120}
          width="200"
          height="10"
          fill="#8a949b"
          opacity={growth * 0.6}
        />

        {/* Reinforcement Bars (Steel) */}
        {steelPositions.map((pos, i) => (
          <circle
            key={`steel-${i}`}
            cx={60 + (pos * 200) / 320}
            cy="185"
            r="4"
            fill="#5d6a73"
            stroke="#e9f2f6"
            strokeWidth="0.5"
            opacity={growth}
          />
        ))}

        {/* Stress Distribution Diagram Base Line */}
        <line
          x1="320"
          y1="50"
          x2="320"
          y2="200"
          stroke="#e9f2f6"
          strokeWidth="1.5"
          opacity={growth}
        />

        {/* Stress Distribution Shape (Butterfly) */}
        <path
          d={`M 320 125 L ${320 - 60 * stress} 50 L 320 50 Z`}
          fill="#d0523f"
          fillOpacity="0.3"
          stroke="#d0523f"
          strokeWidth="1"
          opacity={stress}
        />
        <path
          d={`M 320 125 L ${320 + 60 * stress} 200 L 320 200 Z`}
          fill="#e0b44c"
          fillOpacity="0.3"
          stroke="#e0b44c"
          strokeWidth="1"
          opacity={stress}
        />

        {/* Compression Vectors (Top) */}
        {arrowIndices.map((i) => {
          const y = 50 + i * 15;
          const length = interpolate(y, [50, 125], [60, 0]) * stress;
          return (
            <g key={`comp-${i}`} opacity={stress}>
              <line
                x1={320 - length}
                y1={y}
                x2={318}
                y2={y}
                stroke="#d0523f"
                strokeWidth="1.5"
              />
              <path d={`M 320 ${y} L 315 ${y - 2} L 315 ${y + 2} Z`} fill="#d0523f" />
            </g>
          );
        })}

        {/* Tension Vectors (Bottom) */}
        {arrowIndices.map((i) => {
          const y = 140 + i * 15;
          const length = interpolate(y, [125, 200], [0, 60]) * stress;
          return (
            <g key={`tens-${i}`} opacity={stress}>
              <line
                x1="322"
                y1={y}
                x2={320 + length}
                y2={y}
                stroke="#e0b44c"
                strokeWidth="1.5"
              />
              <path d={`M ${320 + length} ${y} L ${315 + length} ${y - 2} L ${315 + length} ${y + 2} Z`} fill="#e0b44c" />
            </g>
          );
        })}

        {/* Labels and Leader Lines */}
        <g opacity={labels}>
          <line x1="160" y1="125" x2="320" y2="125" stroke="#e9f2f6" strokeWidth="0.5" strokeDasharray="4 2" />
          <text x="50" y="128" fill="#8a949b" fontSize="8" textAnchor="end">NEUTRALE ZONE</text>
          
          <text x="330" y="45" fill="#d0523f" fontSize="9" fontWeight="bold">DRUCK (-σ)</text>
          <text x="330" y="215" fill="#e0b44c" fontSize="9" fontWeight="bold">ZUG (+σ)</text>
          
          <line x1="160" y1="185" x2="160" y2="220" stroke="#5d6a73" strokeWidth="0.5" />
          <text x="160" y="232" fill="#5d6a73" fontSize="8" textAnchor="middle">BEWEHRUNG</text>
          
          <text x="160" y="40" fill="#e9f2f6" fontSize="10" textAnchor="middle">BETONQUERSCHNITT</text>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            fontFamily: 'sans-serif',
            fontSize: 32,
            color: '#e9f2f6',
            opacity: labels,
            transform: `translateY(${interpolate(labels, [0, 1], [20, 0])}px)`,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};