import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const FoundationRedesignComparisonScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const opacity = p.enter * p.exit;

  const draw = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const reveal = interpolate(frame, [span * 0.3, span * 0.7], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shift = interpolate(frame, [span * 0.5, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.back(1)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const depthTicks = [
    { y: 100, label: '0m' },
    { y: 180, label: '-8m' },
    { y: 260, label: '-16m' },
    { y: 340, label: '-24m' },
    { y: 420, label: '-32m' },
  ];

  const piles = [80, 140, 200, 260, 320];
  const footings = [480, 540, 600, 660, 720];

  return (
    <AbsoluteFill style={{ opacity, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <svg
        width={width * 0.8}
        height={height * 0.7}
        viewBox="0 0 800 500"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <pattern id="sandPattern" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="0.8" fill="#e0b44c" opacity="0.6" />
            <circle cx="7" cy="6" r="0.5" fill="#e0b44c" opacity="0.4" />
          </pattern>
          <linearGradient id="soilGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e9f2f6" stopOpacity="0.05" />
            <stop offset="0.5" stopColor="#e9f2f6" stopOpacity="0.1" />
            <stop offset="1" stopColor="#e9f2f6" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Soil Layers */}
        <rect x="40" y="100" width="720" height="320" fill="url(#soilGrad)" stroke="#e9f2f6" strokeWidth="0.5" opacity={draw} />
        <line x1="40" y1="220" x2="760" y2="220" stroke="#e9f2f6" strokeWidth="0.5" strokeDasharray="4 4" opacity={draw * 0.5} />
        <line x1="40" y1="340" x2="760" y2="340" stroke="#e9f2f6" strokeWidth="0.5" strokeDasharray="4 4" opacity={draw * 0.5} />

        {/* Depth Axis */}
        <line x1="40" y1="100" x2="40" y2="420" stroke="#e9f2f6" strokeWidth="1.5" opacity={draw} />
        {depthTicks.map((tick) => (
          <g key={tick.label} opacity={draw}>
            <line x1="35" y1={tick.y} x2="45" y2={tick.y} stroke="#e9f2f6" strokeWidth="1.5" />
            <text x="28" y={tick.y + 4} fill="#e9f2f6" fontSize="12" textAnchor="end" fontFamily="monospace">
              {tick.label}
            </text>
          </g>
        ))}

        {/* Left Side: Original Project (Piles) */}
        <g opacity={1 - reveal * 0.5}>
          <text x="200" y="80" fill="#8a949b" fontSize="16" textAnchor="middle" fontWeight="bold">PROYECTO ORIGINAL</text>
          {piles.map((x) => (
            <rect
              key={`pile-${x}`}
              x={x}
              y={100}
              width="12"
              height={320 * draw}
              fill="#8a949b"
              stroke="#e9f2f6"
              strokeWidth="0.5"
            />
          ))}
          <text x="200" y="450" fill="#8a949b" fontSize="12" textAnchor="middle">80 PILOTES PROFUNDOS (32m)</text>
        </g>

        {/* Center Divider */}
        <line x1="400" y1="60" x2="400" y2="460" stroke="#e9f2f6" strokeWidth="1" strokeDasharray="10 5" opacity={draw} />

        {/* Right Side: Final Construction (Footings + Sand) */}
        <g opacity={reveal}>
          <text x="600" y="80" fill="#e0b44c" fontSize="16" textAnchor="middle" fontWeight="bold">OBRA EJECUTADA</text>
          
          {/* Sand Embankment */}
          <rect x="440" y="100" width="320" height={60 * reveal} fill="url(#sandPattern)" opacity={0.8} />
          <rect x="440" y="100" width="320" height={60 * reveal} fill="#e0b44c" opacity={0.1} />
          <text x="765" y="135" fill="#e0b44c" fontSize="10" textAnchor="start">TERRAPLÉN DE ARENA</text>

          {/* Footings (Zapatas) */}
          {footings.map((x) => (
            <rect
              key={`zapata-${x}`}
              x={x - 15}
              y={100}
              width="42"
              height={25 * reveal}
              fill="#e0b44c"
              stroke="#e9f2f6"
              strokeWidth="1"
            />
          ))}
          <text x="600" y="450" fill="#e0b44c" fontSize="12" textAnchor="middle">ZAPATAS AISLADAS SUPERFICIALES</text>
        </g>

        {/* Comparison Labels */}
        <g transform={`translate(0, ${20 - 20 * shift})`} opacity={shift}>
          <path d="M 380 260 L 420 130" stroke="#d0523f" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)" />
          <text x="400" y="200" fill="#d0523f" fontSize="14" textAnchor="middle" transform="rotate(-72, 400, 200)">
            REDISEÑO DE CIMENTACIÓN
          </text>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            width: '100%',
            textAlign: 'center',
            color: '#e9f2f6',
            fontFamily: 'sans-serif',
            fontSize: 32,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            opacity: draw,
            transform: `translateY(${(1 - shift) * 20}px)`,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};