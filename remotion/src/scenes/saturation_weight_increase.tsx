import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const SaturationWeightIncreaseScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const barGrow = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const waterFill = interpolate(frame, [span * 0.3, span * 0.7], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [span * 0.5, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const chartHeight = 220;
  const maxVal = 3000;
  const dryWeight = 1600;
  const waterWeight = 1000;

  const getY = (val: number) => 250 - (val / maxVal) * chartHeight;
  const ticks = [0, 1000, 2000, 3000];

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
      <svg width="60%" viewBox="0 0 400 300" style={{ overflow: 'visible' }}>
        {/* Y-Axis Grid and Ticks */}
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={60}
              y1={getY(t)}
              x2={360}
              y2={getY(t)}
              stroke="#e9f2f6"
              strokeWidth={0.5}
              strokeDasharray="2 4"
              opacity={0.3}
            />
            <text
              x={50}
              y={getY(t) + 3}
              fill="#e9f2f6"
              fontSize={10}
              textAnchor="end"
              fontFamily="monospace"
            >
              {t}
            </text>
          </g>
        ))}

        {/* Bar 1: Trockener Kies */}
        <g>
          <rect
            x={100}
            y={getY(dryWeight * barGrow)}
            width={60}
            height={(dryWeight / maxVal) * chartHeight * barGrow}
            fill="#8a949b"
            stroke="#e9f2f6"
            strokeWidth={0.5}
          />
          <text
            x={130}
            y={270}
            fill="#e9f2f6"
            fontSize={10}
            textAnchor="middle"
            opacity={barGrow}
          >
            TROCKEN
          </text>
          <text
            x={130}
            y={getY(dryWeight * barGrow) - 8}
            fill="#e9f2f6"
            fontSize={11}
            textAnchor="middle"
            opacity={labelFade}
          >
            1600 kg/m³
          </text>
        </g>

        {/* Bar 2: Gesättigter Kies */}
        <g>
          {/* Base Gravel Part */}
          <rect
            x={240}
            y={getY(dryWeight * barGrow)}
            width={60}
            height={(dryWeight / maxVal) * chartHeight * barGrow}
            fill="#8a949b"
            stroke="#e9f2f6"
            strokeWidth={0.5}
          />
          {/* Water Saturation Part */}
          <rect
            x={240}
            y={getY(dryWeight * barGrow + waterWeight * waterFill)}
            width={60}
            height={(waterWeight / maxVal) * chartHeight * waterFill}
            fill="#e0b44c"
            stroke="#e9f2f6"
            strokeWidth={0.5}
          />
          <text
            x={270}
            y={270}
            fill="#e9f2f6"
            fontSize={10}
            textAnchor="middle"
            opacity={barGrow}
          >
            GESÄTTIGT
          </text>
          <text
            x={270}
            y={getY(dryWeight * barGrow + waterWeight * waterFill) - 8}
            fill="#e0b44c"
            fontSize={11}
            fontWeight="bold"
            textAnchor="middle"
            opacity={labelFade}
          >
            2600 kg/m³
          </text>
          {/* Leader line for water contribution */}
          <line
            x1={305}
            y1={getY(dryWeight)}
            x2={320}
            y2={getY(dryWeight)}
            stroke="#e0b44c"
            strokeWidth={1}
            opacity={waterFill}
          />
          <line
            x1={305}
            y1={getY(dryWeight + waterWeight)}
            x2={320}
            y2={getY(dryWeight + waterWeight)}
            stroke="#e0b44c"
            strokeWidth={1}
            opacity={waterFill}
          />
          <line
            x1={315}
            y1={getY(dryWeight)}
            x2={315}
            y2={getY(dryWeight + waterWeight)}
            stroke="#e0b44c"
            strokeWidth={1}
            opacity={waterFill}
          />
          <text
            x={325}
            y={getY(dryWeight + waterWeight / 2) + 4}
            fill="#e0b44c"
            fontSize={9}
            opacity={waterFill}
          >
            +1000 (H₂O)
          </text>
        </g>

        {/* Main Axis Line */}
        <line
          x1={60}
          y1={250}
          x2={360}
          y2={250}
          stroke="#e9f2f6"
          strokeWidth={1}
        />
      </svg>

      {p.title ? (
        <div
          style={{
            marginTop: 40,
            fontFamily: 'monospace',
            fontSize: 28,
            letterSpacing: '2px',
            color: '#e9f2f6',
            opacity: labelFade,
            borderTop: '1px solid #e9f2f6',
            paddingTop: 10,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
