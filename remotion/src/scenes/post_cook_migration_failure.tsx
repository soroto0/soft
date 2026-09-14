import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const PostCookMigrationFailureScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const migration = interpolate(frame, [0, span * 0.7], [0, 1], {
    easing: Easing.bezier(0.4, 0, 0.2, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pressure = interpolate(frame, [span * 0.3, span * 0.8], [0, 1], {
    easing: Easing.in(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const failure = interpolate(frame, [span * 0.7, span * 0.95], [0, 1], {
    easing: Easing.out(Easing.exp),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textRise = interpolate(frame, [0, span * 0.2], [20, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const arrowIndices = [0, 1, 2, 3, 4, 5];
  const layers = [
    { id: 'core', r: 40, fill: '#5b7f9c', label: 'NÚCLEO HÚMEDO', dash: '0' },
    { id: 'med', r: 70, fill: 'none', label: 'ZONA DE TRÁNSITO', dash: '4 2' },
    { id: 'crust', r: 95, fill: 'none', label: 'COSTRA EXTERIOR', dash: '0' },
  ];

  return (
    <AbsoluteFill
      style={{
        opacity,
        justifyContent: 'center',
        alignItems: 'center',
        color: '#e9f2f6',
        fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      <svg width="70%" viewBox="0 0 500 400" style={{ overflow: 'visible' }}>
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="0"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#e0b44c" />
          </marker>
        </defs>

        {/* Tortilla Layers */}
        <rect
          x="100"
          y="100"
          width="300"
          height="180"
          rx="40"
          fill="#1a1a1a"
          stroke="#e9f2f6"
          strokeWidth="1"
          opacity={0.3}
        />

        {layers.map((layer, i) => (
          <g key={layer.id}>
            <rect
              x={250 - (150 * (layer.r / 100))}
              y={190 - (90 * (layer.r / 100))}
              width={300 * (layer.r / 100)}
              height={180 * (layer.r / 100)}
              rx={40 * (layer.r / 100)}
              fill={layer.fill}
              fillOpacity={0.15}
              stroke="#e9f2f6"
              strokeWidth={i === 2 ? 3 : 1}
              strokeDasharray={layer.dash}
              opacity={0.8}
            />
            <text
              x={250}
              y={190 + (90 * (layer.r / 100)) + 15}
              fill="#e9f2f6"
              fontSize="10"
              textAnchor="middle"
              opacity={0.6}
            >
              {layer.label}
            </text>
          </g>
        ))}

        {/* Migration Arrows */}
        {arrowIndices.map((i) => {
          const angle = (i * Math.PI * 2) / arrowIndices.length;
          const startX = 250 + Math.cos(angle) * 30;
          const startY = 190 + Math.sin(angle) * 20;
          const endX = 250 + Math.cos(angle) * (30 + 60 * migration);
          const endY = 190 + Math.sin(angle) * (20 + 40 * migration);
          return (
            <line
              key={i}
              x1={startX}
              y1={startY}
              x2={endX}
              y2={endY}
              stroke="#e0b44c"
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
              opacity={migration > 0.1 ? 1 : 0}
            />
          );
        })}

        {/* Pressure Indicators */}
        <circle
          cx="400"
          cy="190"
          r={15 * pressure}
          fill="#d0523f"
          opacity={pressure * 0.4}
        />
        <text
          x="420"
          y="180"
          fill="#d0523f"
          fontSize="12"
          fontWeight="bold"
          opacity={pressure}
        >
          P_hidro ↑
        </text>

        {/* Fatigue Failure / Crack */}
        <path
          d={`M 395 160 L 405 175 L 398 190 L 408 210 L 400 225`}
          fill="none"
          stroke="#d0523f"
          strokeWidth="4"
          strokeDasharray="100"
          strokeDashoffset={100 - 100 * failure}
          opacity={failure}
        />
        <text
          x="415"
          y="235"
          fill="#d0523f"
          fontSize="11"
          opacity={failure}
        >
          ROTURA POR FATIGA
        </text>

        {/* Scale/Legend */}
        <line x1="100" y1="320" x2="400" y2="320" stroke="#e9f2f6" strokeWidth="0.5" />
        <text x="100" y="335" fill="#e9f2f6" fontSize="9">NÚCLEO (82% H₂O)</text>
        <text x="400" y="335" fill="#e9f2f6" fontSize="9" textAnchor="end">COSTRA (12% H₂O)</text>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            fontSize: 38,
            fontWeight: 300,
            letterSpacing: '0.05em',
            transform: `translateY(${textRise}px)`,
            textAlign: 'center',
            width: '100%',
            textShadow: '0 2px 4px rgba(0,0,0,0.3)',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};