import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const AbstractQuantityScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const opacity = p.enter * p.exit;

  const progress = interpolate(frame, [span * 0.1, span * 0.9], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const captionRise = interpolate(frame, [0, span * 0.15], [20, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const ticks = [0, 2, 4, 6, 8, 10];

  const axisStart = 150;
  const axisEnd = 650;
  const axisY = 300;

  const markerX = interpolate(progress, [0, 1], [axisStart, axisEnd]);

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
        width="70%"
        viewBox="0 0 800 450"
        style={{ overflow: 'visible' }}
      >
        {/* Data Layers (The "Ban" units stacking) */}
        {layers.map((i) => {
          const layerVisibility = interpolate(
            progress,
            [i * 0.08, (i + 1) * 0.08 + 0.1],
            [0, 1],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          );
          return (
            <rect
              key={i}
              x={250 + i * 4}
              y={120 - i * 4}
              width={300}
              height={120}
              fill="#8da399"
              opacity={layerVisibility * 0.15}
              stroke="#e9f2f6"
              strokeWidth={0.5}
            />
          );
        })}

        {/* Main Axis */}
        <line
          x1={axisStart}
          y1={axisY}
          x2={axisEnd}
          y2={axisY}
          stroke="#e9f2f6"
          strokeWidth={2}
          strokeLinecap="round"
        />

        {/* Ticks and Labels */}
        {ticks.map((t) => {
          const x = axisStart + (t / 10) * (axisEnd - axisStart);
          return (
            <g key={t}>
              <line
                x1={x}
                y1={axisY - 5}
                x2={x}
                y2={axisY + 5}
                stroke="#e9f2f6"
                strokeWidth={1.5}
              />
              <text
                x={x}
                y={axisY + 25}
                fill="#e9f2f6"
                fontSize={12}
                textAnchor="middle"
                fontFamily="monospace"
              >
                {t}
              </text>
            </g>
          );
        })}

        {/* Endpoints */}
        <text
          x={axisStart - 10}
          y={axisY + 5}
          fill="#d0523f"
          fontSize={14}
          textAnchor="end"
          fontFamily="serif"
          fontStyle="italic"
        >
          AZAR
        </text>
        <text
          x={axisEnd + 10}
          y={axisY + 5}
          fill="#e0b44c"
          fontSize={14}
          textAnchor="start"
          fontFamily="serif"
          fontStyle="italic"
        >
          CERTEZA
        </text>

        {/* The Marker */}
        <g transform={`translate(${markerX}, ${axisY})`}>
          <line
            x1={0}
            y1={-60}
            x2={0}
            y2={0}
            stroke="#e0b44c"
            strokeWidth={3}
          />
          <path
            d="M -6 -70 L 6 -70 L 0 -55 Z"
            fill="#e0b44c"
          />
          <text
            x={0}
            y={-80}
            fill="#e0b44c"
            fontSize={16}
            textAnchor="middle"
            fontWeight="bold"
          >
            {Math.round(progress * 10)} BAN
          </text>
        </g>

        {/* Schematic Label */}
        <text
          x={400}
          y={80}
          fill="#e9f2f6"
          fontSize={10}
          textAnchor="middle"
          letterSpacing={2}
          opacity={0.6}
        >
          CUANTIFICACIÓN DE LA INFORMACIÓN (1940)
        </text>
      </svg>

      {p.title ? (
        <div
          style={{
            marginTop: 40,
            transform: `translateY(${captionRise}px)`,
            fontFamily: "'Segoe UI', Arial, sans-serif",
            fontSize: 32,
            color: '#e9f2f6',
            letterSpacing: '0.05em',
            borderTop: '1px solid #e9f2f633',
            paddingTop: 10,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};