import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const InternalDecompositionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const seep = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.bezier(0.4, 0, 0.2, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const decay = interpolate(frame, [span * 0.2, span], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const float = interpolate(frame, [0, span], [0, 15], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const particles = [
    { x: 120, y: 100, r: 8 },
    { x: 180, y: 115, r: 10 },
    { x: 240, y: 95, r: 7 },
    { x: 300, y: 110, r: 9 },
    { x: 360, y: 105, r: 8 },
    { x: 140, y: 150, r: 9 },
    { x: 210, y: 165, r: 11 },
    { x: 280, y: 145, r: 8 },
    { x: 340, y: 155, r: 10 },
    { x: 170, y: 135, r: 7 },
  ];

  const layers = [
    { y: 50, h: 25, name: 'GRANULE LAYER', color: '#5d6a73' },
    { y: 75, h: 125, name: 'ASPHALT MATRIX', color: 'rgba(233, 242, 246, 0.1)' },
    { y: 200, h: 10, name: 'FIBERGLASS MAT', color: '#8a949b' },
  ];

  const seepageLines = [150, 250, 350];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 500 300" style={{ overflow: 'visible' }}>
        <defs>
          <filter id="sludgeBlur">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
          </filter>
          <linearGradient id="liquidGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5b7f9c" stopOpacity="0" />
            <stop offset="0.5" stopColor="#5b7f9c" stopOpacity="0.8" />
            <stop offset="1" stopColor="#5b7f9c" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Layers */}
        {layers.map((layer) => (
          <g key={layer.name}>
            <rect
              x={80}
              y={layer.y}
              width={340}
              height={layer.h}
              fill={layer.color}
              stroke="#e9f2f6"
              strokeWidth={0.5}
              strokeOpacity={0.3}
            />
            <text
              x={70}
              y={layer.y + layer.h / 2 + 4}
              fill="#e9f2f6"
              fontSize={8}
              textAnchor="end"
              opacity={0.6}
            >
              {layer.name}
            </text>
          </g>
        ))}

        {/* Seepage Lines */}
        {seepageLines.map((x, i) => (
          <line
            key={i}
            x1={x}
            y1={50}
            x2={x}
            y2={50 + 150 * seep}
            stroke="url(#liquidGrad)"
            strokeWidth={2}
            strokeDasharray="5 5"
          />
        ))}

        {/* Particles / Sludge */}
        {particles.map((p, i) => {
          const particleDecay = Math.max(0, Math.min(1, decay * 1.5 - i * 0.1));
          return (
            <g key={i} transform={`translate(0, ${float * (i % 2 === 0 ? 1 : -1) * 0.2})`}>
              {/* Original Limestone */}
              <circle
                cx={p.x}
                cy={p.y}
                r={p.r * (1 - particleDecay * 0.5)}
                fill="#c9d3d9"
                opacity={1 - particleDecay}
                stroke="#e9f2f6"
                strokeWidth={0.5}
              />
              {/* Dissolving Sludge */}
              <circle
                cx={p.x}
                cy={p.y}
                r={p.r * (1 + particleDecay * 0.8)}
                fill="#76a04d"
                opacity={particleDecay * 0.7}
                filter="url(#sludgeBlur)"
              />
              {/* Sludge Core */}
              <circle
                cx={p.x}
                cy={p.y}
                r={p.r * 0.4}
                fill="#e0b44c"
                opacity={particleDecay * 0.4}
              />
            </g>
          );
        })}

        {/* Labels and Annotations */}
        <g opacity={seep}>
          <line x1={430} y1={100} x2={460} y2={80} stroke="#e9f2f6" strokeWidth={0.5} />
          <text x={465} y={75} fill="#e9f2f6" fontSize={10}>LIMESTONE FILLER</text>
          <text x={465} y={88} fill="#8a949b" fontSize={8}>(CaCO3)</text>
        </g>

        <g opacity={decay}>
          <line x1={430} y1={160} x2={460} y2={180} stroke="#d0523f" strokeWidth={0.5} />
          <text x={465} y={185} fill="#d0523f" fontSize={10}>GELATINOUS DECAY</text>
          <text x={465} y={198} fill="#76a04d" fontSize={8}>PHASE TRANSITION</text>
        </g>

        {/* Scale Axis */}
        <line x1={80} y1={230} x2={420} y2={230} stroke="#e9f2f6" strokeWidth={1} />
        {[0, 0.5, 1].map((t) => (
          <g key={t}>
            <line x1={80 + t * 340} y1={230} x2={80 + t * 340} y2={235} stroke="#e9f2f6" strokeWidth={1} />
            <text x={80 + t * 340} y={248} fill="#e9f2f6" fontSize={8} textAnchor="middle">
              {t * 500} μm
            </text>
          </g>
        ))}
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            fontFamily: 'monospace',
            fontSize: 28,
            color: '#e9f2f6',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            borderBottom: '1px solid #e0b44c',
            paddingBottom: '4px',
            opacity: interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};