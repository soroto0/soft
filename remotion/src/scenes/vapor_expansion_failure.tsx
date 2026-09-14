import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const VaporExpansionFailureScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  // Animation phases
  const expansion = interpolate(frame, [span * 0.1, span * 0.7], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pressure = interpolate(frame, [span * 0.3, span * 0.8], [0, 1], {
    easing: Easing.bezier(0.33, 1, 0.68, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const rupture = interpolate(frame, [span * 0.7, span * 0.8], [0, 1], {
    easing: Easing.elastic(1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const bubbles = [
    { x: 120, y: 160, r: 12 },
    { x: 200, y: 140, r: 18 },
    { x: 280, y: 170, r: 10 },
    { x: 160, y: 190, r: 14 },
    { x: 240, y: 185, r: 16 },
  ];

  const forceArrows = [
    { x: 150, y: 110, angle: -90 },
    { x: 200, y: 105, angle: -85 },
    { x: 250, y: 110, angle: -95 },
  ];

  const layers = [
    { y: 200, h: 60, fill: '#5b7f9c', name: 'NÚCLEO HÚMEDO', moisture: '18%' },
    { y: 140, h: 60, fill: '#8a949b', name: 'ZONA DE TRANSICIÓN', moisture: '12%' },
    { y: 100, h: 40, fill: '#c9d3d9', name: 'CORTEZA SELLADA', moisture: '3%' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg
        width={width * 0.8}
        height={height * 0.8}
        viewBox="0 0 400 300"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="moistureGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#5b7f9c" />
            <stop offset="0.5" stopColor="#8a949b" />
            <stop offset="1" stopColor="#c9d3d9" />
          </linearGradient>
        </defs>

        {/* Material Layers */}
        {layers.map((layer, i) => (
          <g key={layer.name}>
            <rect
              x="50"
              y={layer.y}
              width="300"
              height={layer.h}
              fill={layer.fill}
              stroke="#e9f2f6"
              strokeWidth="0.5"
              opacity={0.9}
            />
            <line
              x1="355"
              y1={layer.y + layer.h / 2}
              x2="370"
              y2={layer.y + layer.h / 2}
              stroke="#e9f2f6"
              strokeWidth="1"
            />
            <text
              x="375"
              y={layer.y + layer.h / 2 + 3}
              fill="#e9f2f6"
              fontSize="8"
              fontFamily="monospace"
            >
              {layer.moisture}
            </text>
            {i === 0 && (
              <text x="45" y={layer.y + 30} fill="#e9f2f6" fontSize="10" textAnchor="end">
                {layer.name}
              </text>
            )}
            {i === 2 && (
              <text x="45" y={layer.y + 20} fill="#e9f2f6" fontSize="10" textAnchor="end">
                {layer.name}
              </text>
            )}
          </g>
        ))}

        {/* Bubbles (Vapor) */}
        {bubbles.map((b, i) => (
          <circle
            key={i}
            cx={b.x}
            cy={b.y}
            r={b.r * (1 + expansion * 0.6)}
            fill="#e0b44c"
            fillOpacity={0.3 + expansion * 0.4}
            stroke="#e0b44c"
            strokeWidth="1"
          />
        ))}

        {/* Pressure Force Arrows */}
        {forceArrows.map((arrow, i) => {
          const length = 20 * pressure;
          return (
            <g
              key={i}
              transform={`translate(${arrow.x}, ${arrow.y}) rotate(${arrow.angle})`}
              opacity={pressure}
            >
              <line
                x1="0"
                y1="0"
                x2={length}
                y2="0"
                stroke="#d0523f"
                strokeWidth="2"
              />
              <path
                d={`M ${length} -4 L ${length + 6} 0 L ${length} 4 Z`}
                fill="#d0523f"
              />
            </g>
          );
        })}

        {/* Rupture Point */}
        <g transform="translate(200, 100)" opacity={rupture}>
          {/* The "Aspa Naranja" (Orange Cross) */}
          <line x1="-15" y1="-15" x2="15" y2="15" stroke="#e0b44c" strokeWidth="4" />
          <line x1="15" y1="-15" x2="-15" y2="15" stroke="#e0b44c" strokeWidth="4" />
          
          {/* Crack lines */}
          <path
            d="M 0 0 L -10 -20 M 0 0 L 10 -20 M 0 0 L 0 -25"
            fill="none"
            stroke="#d0523f"
            strokeWidth="2"
            strokeDasharray="2 2"
          />
          <text x="20" y="-20" fill="#d0523f" fontSize="10" fontWeight="bold">
            FALLA ESTRUCTURAL
          </text>
        </g>

        {/* Pressure Gauge/Indicator */}
        <rect x="50" y="270" width="300" height="4" fill="#1a1a1a" rx="2" />
        <rect
          x="50"
          y="270"
          width={300 * pressure}
          height="4"
          fill="url(#moistureGrad)"
          rx="2"
        />
        <text x="50" y="285" fill="#e9f2f6" fontSize="8">PRESIÓN INTERNA</text>
        <text x="350" y="285" fill="#e9f2f6" fontSize="8" textAnchor="end">
          {Math.round(pressure * 100)} kPa
        </text>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            fontFamily: 'sans-serif',
            fontSize: 40,
            fontWeight: 600,
            color: '#e9f2f6',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};