import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const EnergyScaleComparisonScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const chemGrow = interpolate(frame, [span * 0.1, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const fissGrow = interpolate(frame, [span * 0.2, span * 0.7], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const reveal = interpolate(frame, [span * 0.5, span * 0.9], [0, 1], {
    easing: Easing.bezier(0.33, 1, 0.68, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ticks = [0, 1, 2, 3, 4];
  const barWidth = 60;
  const chartBottom = 240;

  return (
    <AbsoluteFill
      style={{
        opacity,
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      <svg width="70%" viewBox="0 0 500 320" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="fissionGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#d0523f" />
            <stop offset="100%" stopColor="#e0b44c" />
          </linearGradient>
        </defs>

        {/* Axis */}
        <line
          x1="40"
          y1={chartBottom}
          x2="460"
          y2={chartBottom}
          stroke="#e9f2f6"
          strokeWidth="1.5"
          opacity={0.6}
        />
        {ticks.map((t) => (
          <g key={t} opacity={0.3 * reveal}>
            <line
              x1="40"
              y1={chartBottom - t * 50}
              x2="460"
              y2={chartBottom - t * 50}
              stroke="#e9f2f6"
              strokeWidth="0.5"
              strokeDasharray="4 4"
            />
          </g>
        ))}

        {/* Chemical Energy Bar */}
        <g transform={`translate(100, ${chartBottom})`}>
          <rect
            x={-barWidth / 2}
            y={-8 * chemGrow}
            width={barWidth}
            height={8 * chemGrow}
            fill="#e0b44c"
            stroke="#e9f2f6"
            strokeWidth="1"
          />
          <text
            y={25}
            fill="#e9f2f6"
            fontSize="12"
            textAnchor="middle"
            opacity={reveal}
            fontWeight="bold"
          >
            QUÍMICA
          </text>
          <text
            y={-15}
            fill="#e0b44c"
            fontSize="14"
            textAnchor="middle"
            opacity={chemGrow}
          >
            ~5 eV
          </text>
        </g>

        {/* Fission Energy Bar */}
        <g transform={`translate(340, ${chartBottom})`}>
          <rect
            x={-barWidth / 2}
            y={-220 * fissGrow}
            width={barWidth}
            height={220 * fissGrow}
            fill="url(#fissionGrad)"
            stroke="#e9f2f6"
            strokeWidth="1"
          />
          {/* Scale Break Symbol */}
          <path
            d={`M ${-barWidth / 2 - 5} -110 L ${barWidth / 2 + 5} -130 M ${-barWidth / 2 - 5} -100 L ${barWidth / 2 + 5} -120`}
            stroke="#e9f2f6"
            strokeWidth="2"
            opacity={fissGrow > 0.6 ? 1 : 0}
          />
          <text
            y={25}
            fill="#e9f2f6"
            fontSize="12"
            textAnchor="middle"
            opacity={reveal}
            fontWeight="bold"
          >
            FISIÓN
          </text>
          <text
            y={-230 * fissGrow - 10}
            fill="#d0523f"
            fontSize="16"
            textAnchor="middle"
            opacity={fissGrow}
            fontWeight="bold"
          >
            200,000,000 eV
          </text>
        </g>

        {/* Comparison Indicator */}
        <path
          d="M 140 230 Q 220 180 300 100"
          fill="none"
          stroke="#e9f2f6"
          strokeWidth="1"
          strokeDasharray="5 5"
          opacity={reveal * 0.5}
        />
        <text
          x="220"
          y="150"
          fill="#e9f2f6"
          fontSize="14"
          fontStyle="italic"
          opacity={reveal}
          textAnchor="middle"
        >
          × 40,000,000
        </text>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            color: '#e9f2f6',
            fontSize: 42,
            fontWeight: 300,
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