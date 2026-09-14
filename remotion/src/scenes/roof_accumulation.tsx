import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const RoofAccumulationScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const opacity = p.enter * p.exit;

  const gravelProgress = interpolate(frame, [span * 0.15, span * 0.5], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const bitumenProgress = interpolate(frame, [span * 0.55, span * 0.85], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const weightValue = interpolate(frame, [span * 0.15, span * 0.9], [0, 142], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const slideUp = interpolate(frame, [0, span * 0.2], [40, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { y: 220, h: 40, fill: '#5d6a73', label: 'BETONTRÄGER' },
    { y: 190, h: 30, fill: '#8a949b', label: 'DÄMMUNG' },
    { y: 180, h: 10, fill: '#3d464d', label: 'BESTAND' },
  ];

  const ticks = [0, 50, 100, 150];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg
        width={width * 0.8}
        height={height * 0.7}
        viewBox="0 0 600 400"
        style={{ overflow: 'visible' }}
      >
        {/* Static Base Layers */}
        {layers.map((layer) => (
          <g key={layer.label}>
            <rect
              x="100"
              y={layer.y}
              width="400"
              height={layer.h}
              fill={layer.fill}
              stroke="#e9f2f6"
              strokeWidth="0.5"
            />
            <text
              x="90"
              y={layer.y + layer.h / 2 + 4}
              fill="#8a949b"
              fontSize="10"
              textAnchor="end"
              fontFamily="monospace"
            >
              {layer.label}
            </text>
          </g>
        ))}

        {/* The Depression (Senkung) Visualized as a curve */}
        <path
          d="M 100 180 Q 300 215 500 180"
          fill="none"
          stroke="#e9f2f6"
          strokeWidth="1"
          strokeDasharray="4 2"
        />

        {/* Gravel Fill (Kies) */}
        <path
          d={`M 100 180 Q 300 ${180 + 35 * gravelProgress} 500 180 L 500 180 Q 300 180 100 180 Z`}
          fill="#e0b44c"
          opacity={0.8}
        />
        <text
          x="300"
          y="205"
          fill="#e0b44c"
          fontSize="12"
          textAnchor="middle"
          opacity={gravelProgress}
          fontFamily="sans-serif"
          fontWeight="bold"
        >
          KIESFÜLLUNG
        </text>

        {/* New Bitumen Layer */}
        <rect
          x="100"
          y={170}
          width={400 * bitumenProgress}
          height="6"
          fill="#d0523f"
          opacity={0.9}
        />
        <text
          x="510"
          y="175"
          fill="#d0523f"
          fontSize="10"
          opacity={bitumenProgress}
          fontFamily="monospace"
        >
          BITUMEN NEU
        </text>

        {/* Weight Scale Axis */}
        <line x1="520" y1="260" x2="520" y2="100" stroke="#e9f2f6" strokeWidth="1" />
        {ticks.map((t) => (
          <g key={t}>
            <line x1="520" y1={260 - t} x2="528" y2={260 - t} stroke="#e9f2f6" strokeWidth="1" />
            <text
              x="535"
              y={260 - t + 4}
              fill="#e9f2f6"
              fontSize="9"
              fontFamily="monospace"
            >
              {t}
            </text>
          </g>
        ))}

        {/* Dynamic Weight Indicator */}
        <g transform={`translate(520, ${260 - weightValue})`}>
          <path d="M 0 0 L -15 -5 L -15 5 Z" fill="#d0523f" />
          <text
            x="-20"
            y="5"
            fill="#d0523f"
            fontSize="16"
            textAnchor="end"
            fontFamily="monospace"
            fontWeight="bold"
          >
            {Math.round(weightValue)} kg/m²
          </text>
        </g>

        {/* Dimension Lines */}
        <line x1="100" y1="270" x2="500" y2="270" stroke="#8a949b" strokeWidth="0.5" />
        <line x1="100" y1="265" x2="100" y2="275" stroke="#8a949b" strokeWidth="0.5" />
        <line x1="500" y1="265" x2="500" y2="275" stroke="#8a949b" strokeWidth="0.5" />
        <text x="300" y="285" fill="#8a949b" fontSize="10" textAnchor="middle" fontFamily="monospace">
          REPARATURBEREICH: 4.00m
        </text>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            transform: `translateY(${slideUp}px)`,
            color: '#e9f2f6',
            fontSize: 42,
            fontFamily: 'sans-serif',
            fontWeight: 300,
            letterSpacing: '0.1em',
            borderLeft: '4px solid #d0523f',
            paddingLeft: 20,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};