import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const MortalityPeakScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const gridReveal = interpolate(frame, [0, span * 0.2], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const lineReveal = interpolate(frame, [span * 0.15, span * 0.55], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const peakGrowth = interpolate(frame, [span * 0.45, span * 0.85], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textReveal = interpolate(frame, [span * 0.6, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const months = [
    { name: 'Septiembre', x: 150, baseVal: 12 },
    { name: 'Octubre', x: 300, baseVal: 15 },
    { name: 'Noviembre', x: 450, baseVal: 22 },
    { name: 'Diciembre', x: 600, baseVal: 100 },
  ];

  const yTicks = [
    { val: 0, y: 350 },
    { val: 20, y: 300 },
    { val: 40, y: 250 },
    { val: 60, y: 200 },
    { val: 80, y: 150 },
    { val: 100, y: 100 },
  ];

  const decemberVal = 22 + (100 - 22) * peakGrowth;
  const decemberY = 350 - (decemberVal * 2.5);

  const pathD = `M 150 320 L 300 312.5 L 450 295 L 600 ${decemberY}`;
  const fillD = `M 150 350 L 150 320 L 300 312.5 L 450 295 L 600 ${decemberY} L 600 350 Z`;

  return (
    <AbsoluteFill
      style={{
        opacity,
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: "'Courier New', Courier, monospace",
      }}
    >
      <svg
        width="75%"
        viewBox="0 0 800 450"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d0523f" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#d0523f" stopOpacity={0.0} />
          </linearGradient>
          <clipPath id="chartClip">
            <rect x={100} y={50} width={550 * lineReveal} height={320} />
          </clipPath>
        </defs>

        {/* Archival Header */}
        <text
          x={100}
          y={65}
          fill="#8a949b"
          fontSize={11}
          letterSpacing={2}
          opacity={gridReveal}
        >
          REGISTRO DE BAJAS — AQUILEYA
        </text>

        {/* Grid Lines & Y-Axis Ticks */}
        {yTicks.map((tick) => (
          <g key={tick.val} opacity={gridReveal * 0.4}>
            <line
              x1={100}
              y1={tick.y}
              x2={680}
              y2={tick.y}
              stroke="#8a949b"
              strokeWidth={0.8}
              strokeDasharray="4 4"
            />
            <text
              x={85}
              y={tick.y + 4}
              fill="#e9f2f6"
              fontSize={10}
              textAnchor="end"
            >
              {tick.val}
            </text>
          </g>
        ))}

        {/* X-Axis Line */}
        <line
          x1={100}
          y1={350}
          x2={680}
          y2={350}
          stroke="#8a949b"
          strokeWidth={1.2}
          opacity={gridReveal}
        />

        {/* Filled Area Under Curve */}
        <path
          d={fillD}
          fill="url(#areaGrad)"
          clipPath="url(#chartClip)"
        />

        {/* Main Trend Line */}
        <path
          d={pathD}
          fill="none"
          stroke="#e9f2f6"
          strokeWidth={2}
          clipPath="url(#chartClip)"
        />

        {/* Highlight Peak Line (December Segment) */}
        <path
          d={`M 450 295 L 600 ${decemberY}`}
          fill="none"
          stroke="#d0523f"
          strokeWidth={3}
          clipPath="url(#chartClip)"
          opacity={peakGrowth}
        />

        {/* Data Points & Labels */}
        {months.map((m) => {
          const isDec = m.name === 'Diciembre';
          const currentY = isDec ? decemberY : 350 - (m.baseVal * 2.5);
          const dotColor = isDec ? '#d0523f' : '#e0b44c';
          const dotRadius = isDec ? 5 : 3.5;

          return (
            <g key={m.name}>
              {/* X-Axis Label */}
              <text
                x={m.x}
                y={375}
                fill={isDec ? '#d0523f' : '#8a949b'}
                fontSize={11}
                fontWeight={isDec ? 'bold' : 'normal'}
                textAnchor="middle"
                opacity={gridReveal}
              >
                {m.name.toUpperCase()}
              </text>

              {/* Data Dot */}
              <circle
                cx={m.x}
                cy={currentY}
                r={dotRadius}
                fill={dotColor}
                stroke="#e9f2f6"
                strokeWidth={1}
                opacity={lineReveal}
              />

              {/* Value Label above dot (except December which has a custom callout) */}
              {!isDec && (
                <text
                  x={m.x}
                  y={currentY - 12}
                  fill="#e9f2f6"
                  fontSize={10}
                  textAnchor="middle"
                  opacity={lineReveal * 0.8}
                >
                  {m.baseVal}
                </text>
              )}
            </g>
          );
        })}

        {/* December Peak Callout Box */}
        <g opacity={textReveal} transform={`translate(615, ${decemberY - 25})`}>
          <rect
            x={0}
            y={0}
            width={125}
            height={45}
            fill="#161b1d"
            stroke="#d0523f"
            strokeWidth={1.5}
            rx={3}
          />
          <text
            x={10}
            y={18}
            fill="#d0523f"
            fontSize={11}
            fontWeight="bold"
          >
            {Math.round(decemberVal)} / DÍA
          </text>
          <text
            x={10}
            y={33}
            fill="#e9f2f6"
            fontSize={9}
          >
            Tasa de mortalidad
          </text>
          <line
            x1={-15}
            y1={25}
            x2={0}
            y2={22}
            stroke="#d0523f"
            strokeWidth={1}
          />
        </g>

        {/* Horizontal Reference Line for Peak */}
        <line
          x1={100}
          y1={100}
          x2={600}
          y2={100}
          stroke="#d0523f"
          strokeWidth={1}
          strokeDasharray="3 6"
          opacity={textReveal * 0.5}
        />
      </svg>

      {/* On-screen Caption */}
      {p.title ? (
        <div
          style={{
            marginTop: 20,
            fontSize: 24,
            color: '#e9f2f6',
            letterSpacing: 3,
            textTransform: 'uppercase',
            borderBottom: '1px solid #d0523f',
            paddingBottom: 6,
            opacity: textReveal,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};