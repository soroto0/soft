import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const VergleichDruckfestigkeitScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const opacity = p.enter * p.exit;

  const growSoll = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const growIst = interpolate(frame, [span * 0.2, span * 0.6], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const deficitAlpha = interpolate(frame, [span * 0.5, span * 0.8], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelSlide = interpolate(frame, [0, span * 0.3], [20, 0], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ticks = [0, 10, 20, 30, 40];
  const chartBase = 240;
  const chartLeft = 100;
  const scale = 4.5; // pixels per N/mm2

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 450 320" style={{ overflow: 'visible' }}>
        <defs>
          <pattern
            id="hatchPattern"
            width="8"
            height="8"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line x1="0" y1="0" x2="0" y2="8" stroke="#e0b44c" strokeWidth="3" />
          </pattern>
        </defs>

        {/* Y-Axis */}
        <line
          x1={chartLeft}
          y1={chartBase}
          x2={chartLeft}
          y2={chartBase - 200}
          stroke="#e9f2f6"
          strokeWidth={1.5}
        />
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={chartLeft - 5}
              y1={chartBase - t * scale}
              x2={chartLeft}
              y2={chartBase - t * scale}
              stroke="#e9f2f6"
              strokeWidth={1}
            />
            <text
              x={chartLeft - 12}
              y={chartBase - t * scale + 4}
              fill="#e9f2f6"
              fontSize={12}
              textAnchor="end"
              fontFamily="monospace"
            >
              {t}
            </text>
          </g>
        ))}
        <text
          x={chartLeft - 45}
          y={chartBase - 210}
          fill="#e9f2f6"
          fontSize={10}
          fontFamily="sans-serif"
        >
          N/mm²
        </text>

        {/* SOLL Column */}
        <g>
          <rect
            x={chartLeft + 40}
            y={chartBase - 30 * scale * growSoll}
            width={60}
            height={30 * scale * growSoll}
            fill="#e9f2f6"
            fillOpacity={0.2}
            stroke="#e9f2f6"
            strokeWidth={1}
          />
          <text
            x={chartLeft + 70}
            y={chartBase + 25}
            fill="#e9f2f6"
            fontSize={14}
            textAnchor="middle"
            fontWeight="bold"
            opacity={growSoll}
          >
            SOLL
          </text>
          <text
            x={chartLeft + 70}
            y={chartBase + 45}
            fill="#e9f2f6"
            fontSize={12}
            textAnchor="middle"
            opacity={growSoll}
          >
            C30/37
          </text>
        </g>

        {/* IST Column */}
        <g>
          <rect
            x={chartLeft + 160}
            y={chartBase - 18 * scale * growIst}
            width={60}
            height={18 * scale * growIst}
            fill="#d0523f"
            stroke="#d0523f"
            strokeWidth={1}
          />
          {/* Deficit Area */}
          <rect
            x={chartLeft + 160}
            y={chartBase - 30 * scale}
            width={60}
            height={12 * scale}
            fill="url(#hatchPattern)"
            opacity={deficitAlpha}
            stroke="#e0b44c"
            strokeWidth={1}
          />
          <text
            x={chartLeft + 190}
            y={chartBase + 25}
            fill="#d0523f"
            fontSize={14}
            textAnchor="middle"
            fontWeight="bold"
            opacity={growIst}
          >
            IST
          </text>
          <text
            x={chartLeft + 190}
            y={chartBase + 45}
            fill="#d0523f"
            fontSize={12}
            textAnchor="middle"
            opacity={growIst}
          >
            18 N/mm²
          </text>
        </g>

        {/* Deficit Label */}
        <g opacity={deficitAlpha}>
          <line
            x1={chartLeft + 225}
            y1={chartBase - 30 * scale}
            x2={chartLeft + 250}
            y2={chartBase - 30 * scale}
            stroke="#e0b44c"
            strokeWidth={1}
          />
          <line
            x1={chartLeft + 225}
            y1={chartBase - 18 * scale}
            x2={chartLeft + 250}
            y2={chartBase - 18 * scale}
            stroke="#e0b44c"
            strokeWidth={1}
          />
          <line
            x1={chartLeft + 245}
            y1={chartBase - 30 * scale}
            x2={chartLeft + 245}
            y2={chartBase - 18 * scale}
            stroke="#e0b44c"
            strokeWidth={1}
          />
          <text
            x={chartLeft + 255}
            y={chartBase - 24 * scale + 5}
            fill="#e0b44c"
            fontSize={12}
            fontWeight="bold"
          >
            DEFIZIT: -40%
          </text>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            fontFamily: 'sans-serif',
            fontSize: 32,
            fontWeight: 700,
            color: '#e9f2f6',
            letterSpacing: '0.1em',
            transform: `translateY(${labelSlide}px)`,
            opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateLeft: 'clamp' }),
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};