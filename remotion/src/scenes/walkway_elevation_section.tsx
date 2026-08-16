import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const WalkwayElevationSectionScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const drawProgress = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const expandProgress = interpolate(frame, [span * 0.3, span * 0.7], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelOpacity = interpolate(frame, [span * 0.6, span * 0.9], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const levels = [
    { y: 160, label: '3. STOCKWERK', sub: 'PASSAGE', color: '#e0b44c', thickness: 24 },
    { y: 260, label: '4. STOCKWERK', sub: 'OBERE BRÜCKE', color: '#e9f2f6', thickness: 12 },
    { y: 380, label: '2. ETAGE', sub: 'UNTERE BRÜCKE', color: '#e9f2f6', thickness: 12 },
  ];

  const trusses = [200, 400, 600];
  const dimensionLines = [
    { y1: 160, y2: 260, label: '10.0m' },
    { y1: 260, y2: 380, label: '12.0m' },
  ];

  return (
    <AbsoluteFill style={{ opacity }}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 800 600"
        fill="none"
        style={{ overflow: 'visible' }}
      >
        {/* Roof Trusses */}
        <g opacity={drawProgress}>
          <path
            d="M 100 80 L 700 80"
            stroke="#5d6a73"
            strokeWidth="2"
            strokeDasharray="4 4"
          />
          {trusses.map((tx) => (
            <path
              key={`truss-${tx}`}
              d={`M ${tx - 40} 80 L ${tx} 40 L ${tx + 40} 80`}
              stroke="#5d6a73"
              strokeWidth="2"
              fill="none"
            />
          ))}
        </g>

        {/* Suspension Rods */}
        <line
          x1="300"
          y1="80"
          x2="300"
          y2={80 + 320 * drawProgress}
          stroke="#e9f2f6"
          strokeWidth="1"
          strokeDasharray="2 2"
        />
        <line
          x1="500"
          y1="80"
          x2="500"
          y2={80 + 320 * drawProgress}
          stroke="#e9f2f6"
          strokeWidth="1"
          strokeDasharray="2 2"
        />

        {/* Walkways */}
        {levels.map((lvl) => {
          const w = 400 * expandProgress;
          return (
            <g key={lvl.label}>
              <rect
                x={400 - w / 2}
                y={lvl.y - lvl.thickness / 2}
                width={w}
                height={lvl.thickness}
                fill={lvl.color}
                fillOpacity={0.15}
                stroke={lvl.color}
                strokeWidth="1.5"
              />
              <text
                x={620}
                y={lvl.y + 4}
                fill={lvl.color}
                fontSize="12"
                fontFamily="monospace"
                opacity={labelOpacity}
              >
                {lvl.label} — {lvl.sub}
              </text>
            </g>
          );
        })}

        {/* Dimension Lines */}
        {dimensionLines.map((dim, i) => (
          <g key={`dim-${i}`} opacity={labelOpacity}>
            <line
              x1="220"
              y1={dim.y1}
              x2="220"
              y2={dim.y2}
              stroke="#5d6a73"
              strokeWidth="1"
            />
            <line x1="215" y1={dim.y1} x2="225" y2={dim.y1} stroke="#5d6a73" strokeWidth="1" />
            <line x1="215" y1={dim.y2} x2="225" y2={dim.y2} stroke="#5d6a73" strokeWidth="1" />
            <text
              x="210"
              y={(dim.y1 + dim.y2) / 2}
              fill="#5d6a73"
              fontSize="10"
              textAnchor="end"
              dominantBaseline="middle"
              fontFamily="monospace"
            >
              {dim.label}
            </text>
          </g>
        ))}

        {/* Caption */}
        {p.title ? (
          <text
            x="400"
            y="540"
            fill="#e9f2f6"
            fontSize="24"
            fontFamily="serif"
            textAnchor="middle"
            letterSpacing="2"
            opacity={labelOpacity}
          >
            {p.title.toUpperCase()}
          </text>
        ) : null}
      </svg>
    </AbsoluteFill>
  );
};

export default WalkwayElevationSectionScene;