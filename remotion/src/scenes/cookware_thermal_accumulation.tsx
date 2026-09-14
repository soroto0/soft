import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const CookwareThermalAccumulationScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const fireFade = interpolate(frame, [span * 0.3, span * 0.45], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const heatLevel = interpolate(frame, [0, span * 0.3, span], [0.2, 1, 0.8], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const arrowPos = interpolate(frame % 30, [0, 30], [0, -40], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { y: 140, h: 4, fill: '#c9d3d9', name: 'ACERO INOX' },
    { y: 144, h: 12, fill: '#e0b44c', name: 'NÚCLEO TÉRMICO 3mm' },
    { y: 156, h: 4, fill: '#8a949b', name: 'BASE INDUCCIÓN' },
  ];

  const arrows = [0, 1, 2, 3, 4, 5];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 500 350" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="coreGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e0b44c" stopOpacity={0.2} />
            <stop offset="0.5" stopColor="#d0523f" stopOpacity={heatLevel} />
            <stop offset="1" stopColor="#e0b44c" stopOpacity={0.2} />
          </linearGradient>
        </defs>

        {/* Heat Vectors (Persist after fire) */}
        {arrows.map((i) => (
          <g key={i} transform={`translate(${100 + i * 60}, ${130 + arrowPos})`} opacity={heatLevel * 0.7}>
            <path
              d="M 0 0 L 0 -20 M -5 -12 L 0 -20 L 5 -12"
              fill="none"
              stroke="#e0b44c"
              strokeWidth={2}
              strokeLinecap="round"
            />
          </g>
        ))}

        {/* Pan Base Cross-Section */}
        {layers.map((layer) => (
          <g key={layer.name}>
            <rect
              x={60}
              y={layer.y}
              width={380}
              height={layer.h}
              fill={layer.name.includes('NÚCLEO') ? 'url(#coreGradient)' : layer.fill}
              stroke="#e9f2f6"
              strokeWidth={0.5}
            />
            <text
              x={450}
              y={layer.y + layer.h / 2 + 3}
              fill="#e9f2f6"
              fontSize={8}
              fontFamily="monospace"
            >
              {layer.name}
            </text>
          </g>
        ))}

        {/* Fire Source (Disappears) */}
        <g opacity={fireFade}>
          <path
            d="M 220 220 Q 250 180 280 220 Q 250 240 220 220"
            fill="#d0523f"
            opacity={0.6}
          />
          <path
            d="M 235 215 Q 250 195 265 215 Q 250 225 235 215"
            fill="#e0b44c"
          />
          <text
            x={250}
            y={250}
            fill="#d0523f"
            fontSize={10}
            textAnchor="middle"
            fontFamily="sans-serif"
            letterSpacing={1}
          >
            FUENTE DE CALOR ACTIVADA
          </text>
          <line x1={200} y1={180} x2={300} y2={180} stroke="#d0523f" strokeWidth={1} strokeDasharray="4 2" />
        </g>

        {/* Temperature Indicators */}
        <g transform="translate(60, 140)">
          <line x1={-10} y1={0} x2={-10} y2={20} stroke="#e9f2f6" strokeWidth={1} />
          <text x={-15} y={5} fill="#e9f2f6" fontSize={9} textAnchor="end">220°C</text>
          <text x={-15} y={20} fill="#e9f2f6" fontSize={9} textAnchor="end">180°C</text>
        </g>

        {/* Energy Injection Label */}
        <text
          x={250}
          y={80}
          fill="#e0b44c"
          fontSize={12}
          textAnchor="middle"
          fontFamily="sans-serif"
          style={{ opacity: heatLevel }}
        >
          INYECCIÓN DE ENERGÍA RESIDUAL
        </text>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: 60,
            width: '100%',
            textAlign: 'center',
            fontFamily: 'sans-serif',
            fontSize: 28,
            color: '#e9f2f6',
            letterSpacing: 2,
            textTransform: 'uppercase',
            fontWeight: 300,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};