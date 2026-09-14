import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const SafetyMarginChartScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const growSoll = interpolate(frame, [span * 0.1, span * 0.45], [0, 400], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const growIst = interpolate(frame, [span * 0.25, span * 0.6], [0, 200], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelAlpha = interpolate(frame, [span * 0.5, span * 0.75], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const markerAnim = interpolate(frame, [span * 0.55, span * 0.7], [0, 1], {
    easing: Easing.elastic(1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ticks = [0, 25, 50, 75, 100];
  const chartX = 50;
  const chartY = 180;

  return (
    <AbsoluteFill
      style={{
        opacity,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        width,
        height,
      }}
    >
      <svg
        width={width * 0.8}
        height={height * 0.6}
        viewBox="0 0 500 300"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="failGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#d0523f" />
            <stop offset="50%" stopColor="#e0b44c" />
            <stop offset="100%" stopColor="#d0523f" />
          </linearGradient>
        </defs>

        {/* X-Axis */}
        <line
          x1={chartX}
          y1={chartY}
          x2={chartX + 400}
          y2={chartY}
          stroke="#e9f2f6"
          strokeWidth={1.5}
        />

        {/* Ticks and Labels */}
        {ticks.map((t) => (
          <g key={t} opacity={0.6}>
            <line
              x1={chartX + t * 4}
              y1={chartY}
              x2={chartX + t * 4}
              y2={chartY + 8}
              stroke="#e9f2f6"
              strokeWidth={1}
            />
            <text
              x={chartX + t * 4}
              y={chartY + 24}
              fill="#e9f2f6"
              fontSize={10}
              textAnchor="middle"
              fontFamily="monospace"
            >
              {t}%
            </text>
          </g>
        ))}

        {/* Soll-Last Bar */}
        <g>
          <rect
            x={chartX}
            y={chartY - 80}
            width={growSoll}
            height={24}
            fill="#8a949b"
            opacity={0.4}
          />
          <text
            x={chartX + 5}
            y={chartY - 88}
            fill="#e9f2f6"
            fontSize={11}
            fontFamily="sans-serif"
            fontWeight="bold"
            opacity={labelAlpha}
          >
            SOLL-MAXIMALLAST (100%)
          </text>
        </g>

        {/* Ist-Versagen Bar */}
        <g>
          <rect
            x={chartX}
            y={chartY - 40}
            width={growIst}
            height={24}
            fill="url(#failGrad)"
          />
          <text
            x={chartX + 5}
            y={chartY - 48}
            fill="#d0523f"
            fontSize={11}
            fontFamily="sans-serif"
            fontWeight="bold"
            opacity={labelAlpha}
          >
            IST-VERSAGEN (50%)
          </text>
        </g>

        {/* Failure Marker */}
        <g opacity={markerAnim}>
          <line
            x1={chartX + 200}
            y1={chartY - 100}
            x2={chartX + 200}
            y2={chartY}
            stroke="#d0523f"
            strokeWidth={2}
            strokeDasharray="4 2"
          />
          <path
            d={`M ${chartX + 190} ${chartY - 110} L ${chartX + 210} ${chartY - 110} L ${chartX + 200} ${chartY - 95} Z`}
            fill="#d0523f"
          />
          <text
            x={chartX + 205}
            y={chartY - 115}
            fill="#d0523f"
            fontSize={12}
            fontFamily="sans-serif"
            fontWeight="bold"
          >
            BRUCHPUNKT
          </text>
        </g>

        {/* Load Arrow */}
        <g opacity={labelAlpha}>
          <line
            x1={chartX}
            y1={chartY + 50}
            x2={chartX + 400}
            y2={chartY + 50}
            stroke="#e0b44c"
            strokeWidth={1}
            markerEnd="url(#arrowhead)"
          />
          <text
            x={chartX + 200}
            y={chartY + 65}
            fill="#e0b44c"
            fontSize={9}
            textAnchor="middle"
            fontFamily="monospace"
          >
            LASTSTEIGERUNG →
          </text>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            marginTop: 40,
            color: '#e9f2f6',
            fontSize: 38,
            fontFamily: 'sans-serif',
            fontWeight: 300,
            letterSpacing: '0.1em',
            borderTop: '1px solid #e9f2f6',
            paddingTop: 10,
            opacity: labelAlpha,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};