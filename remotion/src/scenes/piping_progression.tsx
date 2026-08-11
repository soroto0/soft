import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const PipingProgressionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const progress = interpolate(frame, [span * 0.1, span * 0.9], [0, 1], {
    easing: Easing.bezier(0.4, 0, 0.2, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const erosionHeight = interpolate(frame, [span * 0.2, span * 0.9], [4, 32], {
    easing: Easing.in(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pressureValue = interpolate(frame, [span * 0.1, span * 0.9], [580, 125], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { x: 150, w: 150, fill: '#5d6a73', label: 'UPSTREAM SHELL' },
    { x: 300, w: 400, fill: '#8a949b', label: 'IMPERVIOUS CORE' },
    { x: 700, w: 150, fill: '#5d6a73', label: 'DOWNSTREAM SHELL' },
  ];

  const psiTicks = [
    { offset: 0, label: '580 PSI' },
    { offset: 0.33, label: '420 PSI' },
    { offset: 0.66, label: '290 PSI' },
    { offset: 1, label: '125 PSI' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg
        width={width * 0.8}
        height={height * 0.8}
        viewBox="0 0 1000 600"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="pipingGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#d0523f" />
            <stop offset="1" stopColor="#e0b44c" />
          </linearGradient>
          <pattern id="soilPattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="0.5" fill="#e9f2f6" opacity="0.3" />
            <line x1="0" y1="10" x2="5" y2="10" stroke="#e9f2f6" strokeWidth="0.5" opacity="0.2" />
          </pattern>
        </defs>

        {/* Dam Layers */}
        {layers.map((layer) => (
          <g key={layer.label}>
            <rect
              x={layer.x}
              y={150}
              width={layer.w}
              height={300}
              fill={layer.fill}
              stroke="#e9f2f6"
              strokeWidth="1"
            />
            <rect x={layer.x} y={150} width={layer.w} height={300} fill="url(#soilPattern)" />
            <text
              x={layer.x + layer.w / 2}
              y={475}
              fill="#e9f2f6"
              fontSize="14"
              textAnchor="middle"
              fontFamily="monospace"
              letterSpacing="1"
            >
              {layer.label}
            </text>
          </g>
        ))}

        {/* Reservoir Water Level */}
        <path
          d="M 50 200 L 150 200 L 150 450 L 50 450 Z"
          fill="#5b7f9c"
          opacity="0.4"
          stroke="#e9f2f6"
          strokeWidth="1"
        />
        <text x="100" y="190" fill="#e9f2f6" fontSize="12" textAnchor="middle">RESERVOIR</text>

        {/* The Piping Channel (The Void) */}
        <rect
          x={300}
          y={300 - erosionHeight / 2}
          width={400 * progress}
          height={erosionHeight}
          fill="url(#pipingGrad)"
          rx={erosionHeight / 4}
        />

        {/* Pressure Labels along the pipe */}
        {psiTicks.map((tick) => {
          const tickX = 300 + 400 * tick.offset;
          const isVisible = progress >= tick.offset;
          return (
            <g key={tick.label} opacity={isVisible ? 1 : 0}>
              <line
                x1={tickX}
                y1={290}
                x2={tickX}
                y2={310}
                stroke="#e9f2f6"
                strokeWidth="1"
              />
              <text
                x={tickX}
                y={280}
                fill="#e0b44c"
                fontSize="12"
                textAnchor="middle"
                fontFamily="monospace"
              >
                {tick.label}
              </text>
            </g>
          );
        })}

        {/* Dynamic Tip Label */}
        <g transform={`translate(${300 + 400 * progress}, 330)`}>
          <text
            fill="#d0523f"
            fontSize="18"
            fontWeight="bold"
            textAnchor="start"
            fontFamily="monospace"
          >
            {Math.round(pressureValue)} PSI
          </text>
          <path d="M 0 0 L -10 -10 M 0 0 L -10 10" stroke="#d0523f" strokeWidth="2" />
        </g>

        {/* Flow Indicators */}
        {[0, 1, 2, 3].map((i) => {
          const xPos = 320 + (i * 100) + ((frame * 2) % 100);
          const isInside = xPos > 300 && xPos < 300 + 400 * progress;
          return (
            <circle
              key={i}
              cx={xPos}
              cy={300}
              r="2"
              fill="#e9f2f6"
              opacity={isInside ? 0.8 : 0}
            />
          );
        })}
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            width: '100%',
            textAlign: 'center',
            fontFamily: 'Helvetica, Arial, sans-serif',
            fontSize: 42,
            fontWeight: 300,
            color: '#e9f2f6',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};