import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const AsymmetricLoadScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const drawProgress = interpolate(frame, [0, span * 0.25], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const heatIntensity = interpolate(frame, [span * 0.2, span * 0.55], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const eccentricity = interpolate(frame, [span * 0.15, span * 0.85], [50, 72], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const massReadout = interpolate(frame, [0, span * 0.8], [0, 196.8], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleY = interpolate(frame, [0, span * 0.3], [15, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const gridLines = [1, 2, 3, 4, 5, 6, 7];
  const rafters = [200, 250, 300, 350, 400, 450, 500, 550, 600];
  const legendTicks = [0, 1, 2, 3, 4];

  const cgX = 150 + 500 * (eccentricity / 100);

  return (
    <AbsoluteFill
      style={{
        opacity,
        width,
        height,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <svg
        width="75%"
        viewBox="0 0 800 500"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="snowHeat" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#e9f2f6" stopOpacity={0.05} />
            <stop offset={`${eccentricity - 20}%`} stopColor="#e0b44c" stopOpacity={0.4 * heatIntensity} />
            <stop offset={`${eccentricity}%`} stopColor="#d0523f" stopOpacity={0.85 * heatIntensity} />
            <stop offset={`${eccentricity + 15}%`} stopColor="#e0b44c" stopOpacity={0.3 * heatIntensity} />
            <stop offset="100%" stopColor="#e9f2f6" stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="legendGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#e9f2f6" stopOpacity={0.2} />
            <stop offset="50%" stopColor="#e0b44c" stopOpacity={0.6} />
            <stop offset="100%" stopColor="#d0523f" stopOpacity={0.9} />
          </linearGradient>
        </defs>

        {/* Background Grid */}
        {gridLines.map((g) => (
          <line
            key={`grid-${g}`}
            x1={g * 100}
            y1={50}
            x2={g * 100}
            y2={410}
            stroke="#e9f2f6"
            strokeWidth={0.5}
            opacity={0.12 * drawProgress}
          />
        ))}

        {/* Roof Plan Outline */}
        <rect
          x={150}
          y={100}
          width={500}
          height={260}
          fill="none"
          stroke="#e9f2f6"
          strokeWidth={1.5}
          opacity={drawProgress}
        />

        {/* Rafters / Structural Lines */}
        {rafters.map((r) => (
          <line
            key={`rafter-${r}`}
            x1={r}
            y1={100}
            x2={r}
            y2={360}
            stroke="#e9f2f6"
            strokeWidth={0.8}
            opacity={0.25 * drawProgress}
          />
        ))}

        {/* Ridge Line */}
        <line
          x1={150}
          y1={230}
          x2={650}
          y2={230}
          stroke="#e9f2f6"
          strokeWidth={2}
          strokeDasharray="5 5"
          opacity={drawProgress}
        />

        {/* Heatmap Overlay */}
        <rect
          x={150}
          y={100}
          width={500}
          height={260}
          fill="url(#snowHeat)"
          opacity={drawProgress}
        />

        {/* Center of Gravity (Schwerpunkt) Marker */}
        <line
          x1={cgX}
          y1={80}
          x2={cgX}
          y2={380}
          stroke="#d0523f"
          strokeWidth={1.5}
          strokeDasharray="3 3"
          opacity={heatIntensity}
        />
        <circle
          cx={cgX}
          cy={230}
          r={8}
          fill="#d0523f"
          stroke="#e9f2f6"
          strokeWidth={1.5}
          opacity={heatIntensity}
        />
        <text
          x={cgX}
          y={70}
          fill="#d0523f"
          fontSize={10}
          textAnchor="middle"
          fontFamily="monospace"
          opacity={heatIntensity}
        >
          SCHWERPUNKT (S)
        </text>

        {/* Dynamic Mass Readout */}
        <text
          x={400}
          y={50}
          fill="#e9f2f6"
          fontSize={16}
          textAnchor="middle"
          fontFamily="monospace"
          fontWeight="bold"
          opacity={drawProgress}
        >
          GESAMTLAST: {massReadout.toFixed(1)} t
        </text>

        {/* Side Labels */}
        <text
          x={130}
          y={235}
          fill="#e9f2f6"
          fontSize={11}
          textAnchor="end"
          fontFamily="monospace"
          opacity={drawProgress}
        >
          WESTFLANKE (MIN)
        </text>
        <text
          x={670}
          y={235}
          fill="#d0523f"
          fontSize={11}
          textAnchor="start"
          fontFamily="monospace"
          opacity={drawProgress}
        >
          OSTFLANKE (MAX)
        </text>

        {/* Legend */}
        <rect
          x={250}
          y={410}
          width={300}
          height={10}
          fill="url(#legendGradient)"
          stroke="#e9f2f6"
          strokeWidth={0.5}
          opacity={drawProgress}
        />
        <text
          x={240}
          y={419}
          fill="#e9f2f6"
          fontSize={9}
          textAnchor="end"
          fontFamily="monospace"
          opacity={drawProgress}
        >
          MIN
        </text>
        <text
          x={560}
          y={419}
          fill="#d0523f"
          fontSize={9}
          textAnchor="start"
          fontFamily="monospace"
          opacity={drawProgress}
        >
          MAX LOAD
        </text>

        {legendTicks.map((t) => {
          const tx = 250 + t * 75;
          return (
            <g key={`tick-${t}`} opacity={drawProgress}>
              <line
                x1={tx}
                y1={420}
                x2={tx}
                y2={425}
                stroke="#e9f2f6"
                strokeWidth={1}
              />
              <text
                x={tx}
                y={438}
                fill="#e9f2f6"
                fontSize={9}
                textAnchor="middle"
                fontFamily="monospace"
              >
                {t * 2} kN/m²
              </text>
            </g>
          );
        })}
      </svg>

      {p.title ? (
        <div
          style={{
            marginTop: 20,
            transform: `translateY(${titleY}px)`,
            fontFamily: "'Segoe UI', Arial, sans-serif",
            fontSize: 32,
            fontWeight: 600,
            color: '#e9f2f6',
            letterSpacing: '2px',
            textTransform: 'uppercase',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};