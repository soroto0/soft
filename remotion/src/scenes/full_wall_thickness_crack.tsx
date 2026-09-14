import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const FullWallThicknessCrackScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const crackProgress = interpolate(frame, [span * 0.1, span * 0.72], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pulse = interpolate(frame, [span * 0.55, span * 0.95], [0.3, 0.95], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textRise = interpolate(frame, [0, span * 0.3], [16, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const indicatorOpacity = interpolate(frame, [span * 0.65, span * 0.85], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const currentMm = Math.round(crackProgress * 100);

  const ticks = [
    { mm: 0, x: 200 },
    { mm: 25, x: 300 },
    { mm: 50, x: 400 },
    { mm: 75, x: 500 },
    { mm: 100, x: 600 },
  ];

  const layers = [
    { x: 200, w: 60, fill: '#1f2b37', stroke: '#3a4e63', name: 'ZONA INTERNA (15 mm)' },
    { x: 260, w: 280, fill: '#16202c', stroke: '#3a4e63', name: 'NÚCLEO DE ACERO FORJADO (70 mm)' },
    { x: 540, w: 60, fill: '#1f2b37', stroke: '#3a4e63', name: 'ZONA EXTERNA (15 mm)' },
  ];

  const crackPathD = 'M 200 225 L 240 215 L 280 238 L 330 210 L 380 242 L 430 218 L 490 234 L 540 212 L 600 225';
  const pathTotalLength = 415;
  const strokeDashoffset = pathTotalLength * (1 - crackProgress);

  const displayTitle = p.title || 'SECCIÓN TRANSMURAL DE 100 MM';

  return (
    <AbsoluteFill
      style={{
        opacity,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <svg width="80%" viewBox="0 0 800 450" style={{ overflow: 'visible' }}>
        <defs>
          <pattern id="hatchPattern" width="10" height="10" patternUnits="userSpaceOnUse">
            <line x1="0" y1="10" x2="10" y2="0" stroke="#3b4f66" strokeWidth="0.8" opacity="0.3" />
          </pattern>
          <filter id="redGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <text
          x="400"
          y="45"
          fill="#8e9dae"
          fontSize="12"
          letterSpacing="3"
          textAnchor="middle"
          fontWeight="600"
        >
          ANÁLISIS METALOGRÁFICO DE FISURACIÓN
        </text>

        {layers.map((layer) => (
          <g key={layer.name}>
            <rect
              x={layer.x}
              y={120}
              width={layer.w}
              height={200}
              fill={layer.fill}
              stroke={layer.stroke}
              strokeWidth="1.5"
            />
            <rect
              x={layer.x}
              y={120}
              width={layer.w}
              height={200}
              fill="url(#hatchPattern)"
            />
            <line
              x1={layer.x + layer.w / 2}
              y1={320}
              x2={layer.x + layer.w / 2}
              y2={345}
              stroke="#5a6e85"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
            <text
              x={layer.x + layer.w / 2}
              y={360}
              fill="#a0b0c0"
              fontSize="10"
              textAnchor="middle"
              fontFamily="sans-serif"
            >
              {layer.name}
            </text>
          </g>
        ))}

        <line x1="200" y1="105" x2="600" y2="105" stroke="#8e9dae" strokeWidth="1.5" />
        {ticks.map((tick) => (
          <g key={tick.mm}>
            <line
              x1={tick.x}
              y1={100}
              x2={tick.x}
              y2={110}
              stroke="#8e9dae"
              strokeWidth="1.5"
            />
            <text
              x={tick.x}
              y={92}
              fill="#e9f2f6"
              fontSize="11"
              textAnchor="middle"
              fontFamily="sans-serif"
              fontWeight="500"
            >
              {tick.mm} mm
            </text>
          </g>
        ))}

        <path d="M 200 115 L 200 120 L 600 120 L 600 115" fill="none" stroke="#e0b44c" strokeWidth="1" />
        <text
          x="400"
          y="114"
          fill="#e0b44c"
          fontSize="11"
          textAnchor="middle"
          fontWeight="bold"
        >
          ESPESOR TOTAL: 100 MM
        </text>

        <path
          d={crackPathD}
          fill="none"
          stroke="#d0523f"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={pathTotalLength}
          strokeDashoffset={strokeDashoffset}
          opacity={pulse * 0.6}
          filter="url(#redGlow)"
        />
        <path
          d={crackPathD}
          fill="none"
          stroke="#e0b44c"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={pathTotalLength}
          strokeDashoffset={strokeDashoffset}
        />
        <path
          d={crackPathD}
          fill="none"
          stroke="#d0523f"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={pathTotalLength}
          strokeDashoffset={strokeDashoffset}
        />

        <line
          x1={200 + crackProgress * 400}
          y1={120}
          x2={200 + crackProgress * 400}
          y2={320}
          stroke="#d0523f"
          strokeWidth="1.5"
          strokeDasharray="4 3"
          opacity={0.8}
        />

        <g transform={`translate(${Math.min(520, Math.max(200, 200 + crackProgress * 400))}, 225)`}>
          <rect
            x="-45"
            y="-28"
            width="90"
            height="22"
            fill="#0f172a"
            stroke="#d0523f"
            strokeWidth="1"
            rx="3"
            opacity="0.9"
          />
          <text
            x="0"
            y="-14"
            fill="#e9f2f6"
            fontSize="10"
            textAnchor="middle"
            fontWeight="bold"
            fontFamily="monospace"
          >
            {currentMm} / 100 mm
          </text>
        </g>

        <g opacity={indicatorOpacity}>
          <rect
            x="250"
            y="385"
            width="300"
            height="32"
            fill="#1e1014"
            stroke="#d0523f"
            strokeWidth="1.5"
            rx="4"
          />
          <text
            x="400"
            y="405"
            fill="#d0523f"
            fontSize="12"
            fontWeight="bold"
            letterSpacing="1"
            textAnchor="middle"
          >
            ⚠ CONFIRMADO: ROTURA TRANSMURAL COMPLETA
          </text>
        </g>
      </svg>

      <div
        style={{
          marginTop: 12,
          transform: `translateY(${textRise}px)`,
          fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          fontSize: 28,
          fontWeight: 700,
          color: '#e9f2f6',
          letterSpacing: 2,
          textAlign: 'center',
          textTransform: 'uppercase',
        }}
      >
        {displayTitle}
      </div>
    </AbsoluteFill>
  );
};