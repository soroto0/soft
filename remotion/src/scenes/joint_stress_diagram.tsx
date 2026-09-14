import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const JointStressDiagramScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const draw = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const stress = interpolate(frame, [span * 0.25, span * 0.75], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const crack = interpolate(frame, [span * 0.55, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.ease),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const gridLines = [100, 150, 200, 250, 300, 350];
  const chartTicks = [
    { val: 0, y: 320 },
    { val: 200, y: 260 },
    { val: 400, y: 200 },
    { val: 600, y: 140 },
  ];

  return (
    <AbsoluteFill
      style={{
        opacity,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <svg
        width={width * 0.8}
        height={height * 0.75}
        viewBox="0 0 800 450"
        style={{ overflow: 'visible' }}
      >
        {/* Technical Grid Background */}
        {gridLines.map((line) => (
          <g key={`grid-${line}`}>
            <line
              x1={100}
              y1={line}
              x2={700}
              y2={line}
              stroke="#e9f2f6"
              strokeOpacity={0.05}
              strokeWidth={1}
            />
            <line
              x1={line * 1.8}
              y1={80}
              x2={line * 1.8}
              y2={380}
              stroke="#e9f2f6"
              strokeOpacity={0.05}
              strokeWidth={1}
            />
          </g>
        ))}

        {/* Base Plate (Horizontal) */}
        <rect
          x={150}
          y={280}
          width={360}
          height={25}
          fill="#5d6a73"
          stroke="#e9f2f6"
          strokeWidth={1}
          opacity={draw}
        />
        <text
          x={160}
          y={296}
          fill="#8a949b"
          fontSize={9}
          fontFamily="'SF Mono', Monaco, monospace"
          opacity={draw}
        >
          S355J2+N (BASE)
        </text>

        {/* Vertical Plate */}
        <rect
          x={315}
          y={100}
          width={30}
          height={180}
          fill="#717e87"
          stroke="#e9f2f6"
          strokeWidth={1}
          opacity={draw}
        />
        <text
          x={330}
          y={120}
          fill="#8a949b"
          fontSize={9}
          fontFamily="'SF Mono', Monaco, monospace"
          textAnchor="middle"
          opacity={draw}
        >
          t = 30mm
        </text>

        {/* Left Weld Bead (Fillet) */}
        <path
          d="M 315 280 L 285 280 Q 300 265 315 250 Z"
          fill="#e9f2f6"
          fillOpacity={0.85}
          stroke="#e9f2f6"
          strokeWidth={1}
          opacity={draw}
        />
        <path
          d="M 315 280 L 295 280 Q 305 270 315 260 Z"
          fill="none"
          stroke="#e0b44c"
          strokeWidth={1}
          strokeDasharray="2 2"
          opacity={draw * 0.7}
        />

        {/* Right Weld Bead (Fillet) */}
        <path
          d="M 345 280 L 375 280 Q 360 265 345 250 Z"
          fill="#e9f2f6"
          fillOpacity={0.85}
          stroke="#e9f2f6"
          strokeWidth={1}
          opacity={draw}
        />

        {/* Weld Dimension Lines */}
        <g opacity={draw * 0.8}>
          <line x1={345} y1={295} x2={375} y2={295} stroke="#8a949b" strokeWidth={0.8} />
          <line x1={345} y1={292} x2={345} y2={298} stroke="#8a949b" strokeWidth={0.8} />
          <line x1={375} y1={292} x2={375} y2={298} stroke="#8a949b" strokeWidth={0.8} />
          <text
            x={360}
            y={308}
            fill="#8a949b"
            fontSize={8}
            fontFamily="'SF Mono', Monaco, monospace"
            textAnchor="middle"
          >
            a = 21mm
          </text>
        </g>

        {/* Theoretical Force Vector (Amber) */}
        <g opacity={stress}>
          <path
            d={`M 330 100 L 330 ${100 - 50 * stress}`}
            stroke="#e0b44c"
            strokeWidth={2}
            fill="none"
          />
          <path
            d={`M 326 ${105 - 50 * stress} L 330 ${100 - 50 * stress} L 334 ${105 - 50 * stress}`}
            stroke="#e0b44c"
            strokeWidth={2}
            fill="none"
          />
          <text
            x={340}
            y={75}
            fill="#e0b44c"
            fontSize={10}
            fontFamily="'SF Mono', Monaco, monospace"
          >
            F_SOLL: 400 kN
          </text>
        </g>

        {/* Actual Force Vector (Danger Red - Exceeding and Angled) */}
        <g opacity={stress}>
          <path
            d={`M 330 100 L ${330 + 40 * stress} ${100 - 75 * stress}`}
            stroke="#d0523f"
            strokeWidth={2.5}
            strokeDasharray="4 2"
            fill="none"
          />
          <path
            d={`M ${324 + 40 * stress} ${103 - 75 * stress} L ${330 + 40 * stress} ${100 - 75 * stress} L ${333 + 40 * stress} ${108 - 75 * stress}`}
            stroke="#d0523f"
            strokeWidth={2.5}
            fill="none"
          />
          <text
            x={380}
            y={45}
            fill="#d0523f"
            fontSize={11}
            fontWeight="bold"
            fontFamily="'SF Mono', Monaco, monospace"
          >
            F_IST: 580 kN (EXCESS)
          </text>
        </g>

        {/* Crack Propagation (Actual Failure) */}
        <path
          d="M 346 279 L 352 272 L 349 266 L 358 258 L 355 252"
          fill="none"
          stroke="#d0523f"
          strokeWidth={1.5 + crack * 2}
          strokeDasharray={crack > 0 ? "none" : "4 4"}
          opacity={crack}
        />

        {/* Failure Warning Box */}
        {crack > 0.1 && (
          <g opacity={crack}>
            <rect
              x={385}
              y={235}
              width={115}
              height={22}
              fill="#d0523f"
              rx={2}
            />
            <text
              x={442}
              y={249}
              fill="#e9f2f6"
              fontSize={9}
              fontWeight="bold"
              fontFamily="'SF Mono', Monaco, monospace"
              textAnchor="middle"
              letterSpacing={1}
            >
              GEFÜGE-RISS
            </text>
          </g>
        )}

        {/* Comparison Chart (Right Side) */}
        <g opacity={draw}>
          {/* Chart Frame */}
          <line x1={580} y1={120} x2={580} y2={320} stroke="#8a949b" strokeWidth={1} />
          <line x1={580} y1={320} x2={710} y2={320} stroke="#8a949b" strokeWidth={1} />

          {/* Y-Axis Ticks */}
          {chartTicks.map((tick) => (
            <g key={`tick-${tick.val}`}>
              <line x1={575} y1={tick.y} x2={580} y2={tick.y} stroke="#8a949b" strokeWidth={1} />
              <text
                x={568}
                y={tick.y + 3}
                fill="#8a949b"
                fontSize={8}
                fontFamily="'SF Mono', Monaco, monospace"
                textAnchor="end"
              >
                {tick.val}
              </text>
            </g>
          ))}
          <text
            x={550}
            y={105}
            fill="#8a949b"
            fontSize={8}
            fontFamily="'SF Mono', Monaco, monospace"
          >
            (kN)
          </text>

          {/* Bar 1: Soll-Tragfähigkeit (Theoretical Capacity) */}
          <rect
            x={600}
            y={320 - 120 * draw}
            width={30}
            height={120 * draw}
            fill="#e0b44c"
            fillOpacity={0.4}
            stroke="#e0b44c"
            strokeWidth={1}
          />
          <text
            x={615}
            y={335}
            fill="#e0b44c"
            fontSize={8}
            fontFamily="'SF Mono', Monaco, monospace"
            textAnchor="middle"
          >
            SOLL
          </text>

          {/* Bar 2: Ist-Belastung (Actual Load) */}
          <rect
            x={650}
            y={320 - 174 * stress}
            width={30}
            height={174 * stress}
            fill="#d0523f"
            fillOpacity={0.8}
            stroke="#d0523f"
            strokeWidth={1}
          />
          <text
            x={665}
            y={335}
            fill="#e9f2f6"
            fontSize={8}
            fontFamily="'SF Mono', Monaco, monospace"
            textAnchor="middle"
          >
            IST
          </text>

          {/* Limit Threshold Line */}
          <line
            x1={580}
            y1={200}
            x2={710}
            y2={200}
            stroke="#e0b44c"
            strokeWidth={1}
            strokeDasharray="3 3"
            opacity={stress}
          />
          <text
            x={715}
            y={203}
            fill="#e0b44c"
            fontSize={8}
            fontFamily="'SF Mono', Monaco, monospace"
            opacity={stress}
          >
            LIMIT
          </text>
        </g>
      </svg>

      {/* Caption */}
      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            fontFamily: "'SF Mono', Monaco, Consolas, monospace",
            fontSize: 22,
            color: '#e9f2f6',
            letterSpacing: 2,
            textTransform: 'uppercase',
            borderLeft: '3px solid #d0523f',
            paddingLeft: 16,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};