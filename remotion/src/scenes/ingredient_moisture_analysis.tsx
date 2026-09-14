import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const IngredientMoistureAnalysisScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const grow = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const separation = interpolate(frame, [span * 0.2, span * 0.6], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelOpacity = interpolate(frame, [span * 0.5, span * 0.8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const chartHeight = 300;
  const chartWidth = 140;
  const waterRatio = 0.89;
  const solidRatio = 0.11;

  const ticks = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
  const hatchLines = [1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <AbsoluteFill
      style={{
        opacity,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width,
        height,
      }}
    >
      <svg
        width="500"
        height="500"
        viewBox="0 0 500 500"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5b7f9c" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#5b7f9c" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        {/* Y-Axis Ticks */}
        {ticks.map((t) => (
          <g key={t} opacity={grow}>
            <line
              x1="130"
              y1={400 - t * chartHeight}
              x2="145"
              y2={400 - t * chartHeight}
              stroke="#e9f2f6"
              strokeWidth="1"
            />
            <text
              x="120"
              y={405 - t * chartHeight}
              fill="#e9f2f6"
              fontSize="12"
              textAnchor="end"
              fontFamily="monospace"
            >
              {t.toFixed(1)}g
            </text>
          </g>
        ))}

        {/* Main Container Outline */}
        <rect
          x="150"
          y={400 - chartHeight * grow}
          width={chartWidth}
          height={chartHeight * grow}
          fill="none"
          stroke="#e9f2f6"
          strokeWidth="2"
          opacity="0.3"
        />

        {/* Water Volume (89%) */}
        <rect
          x="150"
          y={400 - chartHeight * waterRatio * separation}
          width={chartWidth}
          height={chartHeight * waterRatio * separation}
          fill="url(#waterGrad)"
          stroke="#5b7f9c"
          strokeWidth="1"
        />

        {/* Solid Volume (11%) */}
        <g transform={`translate(150, ${400 - chartHeight * waterRatio * separation - (chartHeight * solidRatio * separation)})`}>
          <rect
            x="0"
            y="0"
            width={chartWidth}
            height={chartHeight * solidRatio * separation}
            fill="#e0b44c"
            opacity="0.9"
          />
          {/* Hatching for Solids */}
          {hatchLines.map((line) => (
            <line
              key={line}
              x1="0"
              y1={(line * (chartHeight * solidRatio)) / 8}
              x2={chartWidth}
              y2={(line * (chartHeight * solidRatio)) / 8 - 5}
              stroke="#e9f2f6"
              strokeWidth="0.5"
              opacity={separation * 0.4}
            />
          ))}
        </g>

        {/* Labels and Leader Lines */}
        <g opacity={labelOpacity}>
          {/* Water Label */}
          <line
            x1={150 + chartWidth}
            y1={400 - (chartHeight * waterRatio) / 2}
            x2={320}
            y2={400 - (chartHeight * waterRatio) / 2}
            stroke="#e9f2f6"
            strokeWidth="1"
            strokeDasharray="4 2"
          />
          <text
            x="330"
            y={395 - (chartHeight * waterRatio) / 2}
            fill="#e9f2f6"
            fontSize="16"
            fontWeight="bold"
          >
            H2O (AGUA)
          </text>
          <text
            x="330"
            y={415 - (chartHeight * waterRatio) / 2}
            fill="#5b7f9c"
            fontSize="24"
            fontFamily="monospace"
          >
            89.0%
          </text>

          {/* Solids Label */}
          <line
            x1={150 + chartWidth}
            y1={400 - chartHeight * waterRatio - (chartHeight * solidRatio) / 2}
            x2={320}
            y2={400 - chartHeight * waterRatio - (chartHeight * solidRatio) / 2}
            stroke="#e9f2f6"
            strokeWidth="1"
            strokeDasharray="4 2"
          />
          <text
            x="330"
            y={395 - chartHeight * waterRatio - (chartHeight * solidRatio) / 2}
            fill="#e9f2f6"
            fontSize="14"
          >
            FIBRA / SÓLIDOS
          </text>
          <text
            x="330"
            y={415 - chartHeight * waterRatio - (chartHeight * solidRatio) / 2}
            fill="#e0b44c"
            fontSize="20"
            fontFamily="monospace"
          >
            11.0%
          </text>
        </g>

        {/* Unit Reference */}
        <text
          x="150"
          y="430"
          fill="#e9f2f6"
          fontSize="10"
          fontFamily="monospace"
          opacity={grow * 0.6}
        >
          MUESTRA: 1.000g CEBOLLA BLANCA
        </text>
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
            letterSpacing: '2px',
            textTransform: 'uppercase',
            opacity: labelOpacity,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};