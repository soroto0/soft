import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const VolumeComparisonChartScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  // 1. Grid and axis lines reveal
  const gridProgress = interpolate(frame, [0, span * 0.2], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // 2. Planned (SOLL) volume bar grows
  const sollProgress = interpolate(frame, [span * 0.15, span * 0.5], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // 3. Actual (IST) base volume bar grows (up to the planned level)
  const istProgress = interpolate(frame, [span * 0.3, span * 0.65], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // 4. Excess volume (IST excess) grows and highlights in signal-orange
  const excessProgress = interpolate(frame, [span * 0.55, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const ticks = [
    { value: '600.000 SACK', y: 60 },
    { value: '450.000 SACK', y: 120 },
    { value: '300.000 SACK', y: 180 },
    { value: '150.000 SACK', y: 240 },
    { value: '0', y: 300 },
  ];

  return (
    <AbsoluteFill
      style={{
        opacity,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
      }}
    >
      <svg
        width="75%"
        viewBox="0 0 600 360"
        style={{ overflow: 'visible', fontFamily: "'Courier New', Courier, monospace" }}
      >
        <defs>
          {/* Technical hatch pattern for standard planned volume */}
          <pattern
            id="hatch-soll"
            width="12"
            height="12"
            patternTransform="rotate(45 0 0)"
            patternUnits="userSpaceOnUse"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="12"
              stroke="#e9f2f6"
              strokeWidth={1.2}
              opacity={0.35}
            />
          </pattern>

          {/* Technical hatch pattern for excess volume (signal-orange) */}
          <pattern
            id="hatch-excess"
            width="8"
            height="8"
            patternTransform="rotate(45 0 0)"
            patternUnits="userSpaceOnUse"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="8"
              stroke="#d0523f"
              strokeWidth={1.8}
              opacity={0.9}
            />
          </pattern>
        </defs>

        {/* Outer schematic frame */}
        <rect
          x={10}
          y={10}
          width={580}
          height={340}
          fill="none"
          stroke="#e9f2f6"
          strokeWidth={1}
          opacity={gridProgress * 0.15}
        />

        {/* Grid Lines & Y-Axis Ticks */}
        {ticks.map((tick) => (
          <g key={tick.value} opacity={gridProgress}>
            <line
              x1={110}
              y1={tick.y}
              x2={490}
              y2={tick.y}
              stroke="#e9f2f6"
              strokeWidth={0.5}
              strokeDasharray="4 4"
              opacity={0.2}
            />
            <text
              x={95}
              y={tick.y + 4}
              fill="#e9f2f6"
              fontSize={10}
              textAnchor="end"
              opacity={0.6}
            >
              {tick.value}
            </text>
          </g>
        ))}

        {/* Vertical Axis Line */}
        <line
          x1={110}
          y1={50}
          x2={110}
          y2={310}
          stroke="#e9f2f6"
          strokeWidth={1}
          opacity={gridProgress * 0.5}
        />

        {/* Baseline */}
        <line
          x1={110}
          y1={300}
          x2={490}
          y2={300}
          stroke="#e9f2f6"
          strokeWidth={1.5}
          opacity={gridProgress * 0.8}
        />

        {/* ================= LEFT BAR: SOLL (PLANNED) ================= */}
        {/* Height representing 285,000 sacks (half of 570,000) */}
        {/* 285k / 600k * 240px = 114px height */}
        <g opacity={sollProgress}>
          {/* Background solid tint */}
          <rect
            x={160}
            y={300 - 114 * sollProgress}
            width={80}
            height={114 * sollProgress}
            fill="#e9f2f6"
            opacity={0.05}
          />
          {/* Hatch Fill */}
          <rect
            x={160}
            y={300 - 114 * sollProgress}
            width={80}
            height={114 * sollProgress}
            fill="url(#hatch-soll)"
          />
          {/* Outer Border */}
          <rect
            x={160}
            y={300 - 114 * sollProgress}
            width={80}
            height={114 * sollProgress}
            fill="none"
            stroke="#e9f2f6"
            strokeWidth={1}
            opacity={0.5}
          />
          {/* Label */}
          <text
            x={200}
            y={320}
            fill="#e9f2f6"
            fontSize={11}
            textAnchor="middle"
            opacity={0.8}
          >
            SOLL
          </text>
          <text
            x={200}
            y={290 - 114 * sollProgress}
            fill="#e9f2f6"
            fontSize={11}
            fontWeight="bold"
            textAnchor="middle"
          >
            285.000
          </text>
        </g>

        {/* ================= RIGHT BAR: IST (ACTUAL) ================= */}
        {/* Base part (up to 285,000 sacks) */}
        <g opacity={istProgress}>
          <rect
            x={300}
            y={300 - 114 * istProgress}
            width={80}
            height={114 * istProgress}
            fill="#e9f2f6"
            opacity={0.05}
          />
          <rect
            x={300}
            y={300 - 114 * istProgress}
            width={80}
            height={114 * istProgress}
            fill="url(#hatch-soll)"
          />
          <rect
            x={300}
            y={300 - 114 * istProgress}
            width={80}
            height={114 * istProgress}
            fill="none"
            stroke="#e9f2f6"
            strokeWidth={1}
            opacity={0.3}
          />
          <text
            x={340}
            y={320}
            fill="#e9f2f6"
            fontSize={11}
            textAnchor="middle"
            opacity={0.8}
          >
            IST
          </text>
        </g>

        {/* Excess part (from 285,000 to 570,000 sacks) */}
        {/* Height: 114px, starting at Y=186 */}
        <g opacity={excessProgress}>
          <rect
            x={300}
            y={186 - 114 * excessProgress}
            width={80}
            height={114 * excessProgress}
            fill="#d0523f"
            opacity={0.1}
          />
          <rect
            x={300}
            y={186 - 114 * excessProgress}
            width={80}
            height={114 * excessProgress}
            fill="url(#hatch-excess)"
          />
          <rect
            x={300}
            y={186 - 114 * excessProgress}
            width={80}
            height={114 * excessProgress}
            fill="none"
            stroke="#d0523f"
            strokeWidth={1.5}
          />
          {/* Divider line between planned and excess */}
          <line
            x1={300}
            y1={186}
            x2={380}
            y2={186}
            stroke="#d0523f"
            strokeWidth={1.5}
            strokeDasharray="3 2"
          />
          {/* Value Label */}
          <text
            x={340}
            y={172 - 114 * excessProgress}
            fill="#d0523f"
            fontSize={12}
            fontWeight="bold"
            textAnchor="middle"
          >
            570.000
          </text>
        </g>

        {/* ================= TECHNICAL CALLOUTS & BRACKETS ================= */}
        {/* Excess Bracket */}
        <g opacity={excessProgress}>
          <path
            d={`M 395,186 L 405,186 L 405,${186 - 114 * excessProgress} L 395,${186 - 114 * excessProgress}`}
            fill="none"
            stroke="#d0523f"
            strokeWidth={1.2}
          />
          <text
            x={415}
            y={190 - 57 * excessProgress}
            fill="#d0523f"
            fontSize={10}
            fontWeight="bold"
            textAnchor="start"
          >
            +100% (EXZESS)
          </text>
          <text
            x={415}
            y={204 - 57 * excessProgress}
            fill="#e9f2f6"
            fontSize={9}
            textAnchor="start"
            opacity={0.7}
          >
            +285.000 SACK
          </text>
        </g>

        {/* Legend */}
        <g opacity={gridProgress} transform="translate(420, 45)">
          <rect x={0} y={0} width={12} height={12} fill="url(#hatch-soll)" stroke="#e9f2f6" strokeWidth={0.5} />
          <text x={18} y={10} fill="#e9f2f6" fontSize={9} opacity={0.7}>KALKULIERT</text>

          <rect x={0} y={18} width={12} height={12} fill="url(#hatch-excess)" stroke="#d0523f" strokeWidth={0.5} />
          <text x={18} y={28} fill="#d0523f" fontSize={9} fontWeight="bold">MEHRVERBRAUCH</text>
        </g>
      </svg>

      {/* Title Caption */}
      {p.title ? (
        <div
          style={{
            marginTop: 20,
            fontFamily: "'Courier New', Courier, monospace",
            fontSize: 22,
            fontWeight: 'bold',
            letterSpacing: '2px',
            color: '#e9f2f6',
            opacity: gridProgress,
            borderBottom: '1px solid rgba(233, 242, 246, 0.3)',
            paddingBottom: '6px',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};