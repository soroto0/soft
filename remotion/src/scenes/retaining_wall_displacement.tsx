import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const RetainingWallDisplacementScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const pressureProgress = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const tiltProgress = interpolate(frame, [span * 0.25, span * 0.75], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const dimProgress = interpolate(frame, [span * 0.55, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const tiltPx = tiltProgress * 24;

  const pressureArrows = [
    { y: 150, maxLen: 20 },
    { y: 200, maxLen: 40 },
    { y: 250, maxLen: 60 },
    { y: 300, maxLen: 80 },
    { y: 350, maxLen: 100 },
  ];

  const sensors = [
    { y: 170, label: 'SEN-N01' },
    { y: 250, label: 'SEN-N02' },
    { y: 330, label: 'SEN-N03' },
  ];

  const elevationTicks = [
    { y: 110, label: '+15.0m' },
    { y: 190, label: '+10.0m' },
    { y: 270, label: '+5.0m' },
    { y: 350, label: '0.0m' },
  ];

  const soilHatch = [0, 1, 2, 3, 4, 5, 6, 7];

  return (
    <AbsoluteFill
      style={{
        opacity,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg viewBox="0 0 800 480" style={{ width: '75%', height: 'auto', overflow: 'visible' }}>
        <defs>
          <linearGradient id="soilGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#2a3642" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#1e2730" stopOpacity="0.4" />
          </linearGradient>

          <linearGradient id="waterPressure" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#5b7f9c" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#5b7f9c" stopOpacity="0.45" />
          </linearGradient>

          <pattern id="concreteHatch" width="12" height="12" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#e9f2f6" opacity="0.25" />
            <circle cx="8" cy="8" r="1.2" fill="#e9f2f6" opacity="0.2" />
            <line x1="0" y1="12" x2="12" y2="0" stroke="#e9f2f6" strokeWidth="0.5" opacity="0.1" />
          </pattern>
        </defs>

        {/* Ground / Bedrock Foundation */}
        <rect x="180" y="380" width="460" height="40" fill="#18222d" stroke="#3a4854" strokeWidth="1" />
        <path d="M 180,390 L 640,390 M 180,405 L 640,405" stroke="#2c3947" strokeWidth="1" strokeDasharray="6 6" />
        <text x="190" y="412" fill="#7a8b9e" fontSize="9" fontFamily="'Courier New', monospace">
          ESTRATO DE CIMENTACIÓN / BEDROCK
        </text>

        {/* Retained Soil (Backfill) */}
        <polygon points="430,110 600,110 600,380 450,380" fill="url(#soilGrad)" />
        {soilHatch.map((i) => (
          <line
            key={i}
            x1={450 + i * 18}
            y1={120}
            x2={430 + i * 18}
            y2={370}
            stroke="#3a4854"
            strokeWidth="1"
            opacity="0.3"
          />
        ))}
        <text x="510" y="140" fill="#7a8b9e" fontSize="10" fontFamily="sans-serif" letterSpacing="1">
          RELLENO POSTERIOR
        </text>
        <text x="510" y="154" fill="#5b7f9c" fontSize="9" fontFamily="sans-serif">
          (PRESSIÓN HIDRÁULICA)
        </text>

        {/* Hydraulic Pressure Triangle */}
        <polygon
          points={`430,110 430,380 ${430 + 110 * pressureProgress},380`}
          fill="url(#waterPressure)"
          stroke="#5b7f9c"
          strokeWidth="0.8"
          strokeDasharray="3 2"
          opacity={pressureProgress}
        />

        {/* Hydrostatic Pressure Force Arrows */}
        {pressureArrows.map((arrow, idx) => {
          const currentLen = arrow.maxLen * pressureProgress;
          return (
            <g key={idx} opacity={pressureProgress}>
              <line
                x1={430 + currentLen}
                y1={arrow.y}
                x2={430}
                y2={arrow.y}
                stroke="#e0b44c"
                strokeWidth="1.5"
              />
              <polygon
                points={`430,${arrow.y} ${430 + 6},${arrow.y - 3} ${430 + 6},${arrow.y + 3}`}
                fill="#e0b44c"
              />
            </g>
          );
        })}
        <text
          x="480"
          y="372"
          fill="#e0b44c"
          fontSize="9"
          fontFamily="sans-serif"
          opacity={pressureProgress}
        >
          EMPUJE HIDROSTÁTICO (P_h)
        </text>

        {/* Plumb Line (Reference Axis Y - Original Position) */}
        <line
          x1="330"
          y1="80"
          x2="330"
          y2="380"
          stroke="#8a949b"
          strokeWidth="1.2"
          strokeDasharray="4 4"
        />
        <text x="325" y="72" fill="#8a949b" fontSize="9" textAnchor="end" fontFamily="'Courier New', monospace">
          PLOMADA VERTICAL (EJE Y)
        </text>

        {/* Concrete Retaining Wall Footing (Base) */}
        <polygon
          points="250,380 450,380 450,350 250,350"
          fill="#3a4854"
          stroke="#e9f2f6"
          strokeWidth="1"
        />
        <rect x="250" y="350" width="200" height="30" fill="url(#concreteHatch)" />

        {/* Tilted / Displaced Wall Stem */}
        {/* Rotation/Tilt pivot at heel/toe base (350,350) */}
        <g transform={`translate(${tiltPx}, 0)`}>
          <polygon
            points="330,110 430,110 450,350 350,350"
            fill="#2c3947"
            stroke="#e9f2f6"
            strokeWidth="1.5"
          />
          <polygon points="330,110 430,110 450,350 350,350" fill="url(#concreteHatch)" />

          {/* Wall Label inside cross-section */}
          <text
            x="385"
            y="230"
            fill="#e9f2f6"
            fontSize="10"
            fontWeight="bold"
            fontFamily="sans-serif"
            textAnchor="middle"
            transform="rotate(-88 385 230)"
            letterSpacing="2"
            opacity="0.8"
          >
            MURO DE HORMIGÓN 15m
          </text>

          {/* Pressure Sensors Installed on Wall Face */}
          {sensors.map((sensor, idx) => (
            <g key={idx}>
              <circle cx="340" cy={sensor.y} r="4" fill="#d0523f" />
              <circle cx="340" cy={sensor.y} r="7" stroke="#d0523f" strokeWidth="0.8" fill="none" opacity="0.6" />
              <line x1="336" y1={sensor.y} x2="290" y2={sensor.y} stroke="#d0523f" strokeWidth="0.8" strokeDasharray="2 2" />
              <rect x="235" y={sensor.y - 7} width="52" height="14" fill="#18222d" stroke="#d0523f" strokeWidth="0.8" rx="2" />
              <text x="261" y={sensor.y + 3} fill="#e9f2f6" fontSize="8" textAnchor="middle" fontFamily="'Courier New', monospace">
                {sensor.label}
              </text>
            </g>
          ))}
        </g>

        {/* Displacement Indicator Dimension Line (at Top) */}
        <g opacity={dimProgress}>
          {/* Top extension lines */}
          <line x1="330" y1="110" x2="330" y2="92" stroke="#8a949b" strokeWidth="0.8" />
          <line x1={330 + tiltPx} y1="110" x2={330 + tiltPx} y2="92" stroke="#d0523f" strokeWidth="0.8" />

          {/* Dimension Arrow Line */}
          <line x1="330" y1="96" x2={330 + tiltPx} y2="96" stroke="#d0523f" strokeWidth="1.5" />
          <polygon points={`330,96 334,94 334,98`} fill="#d0523f" />
          <polygon points={`${330 + tiltPx},96 ${326 + tiltPx},94 ${326 + tiltPx},98`} fill="#d0523f" />

          {/* Callout Tag */}
          <rect x={330 + tiltPx + 10} y="84" width="95" height="24" fill="#d0523f" rx="3" />
          <text x={330 + tiltPx + 16} y="96" fill="#e9f2f6" fontSize="9" fontWeight="bold" fontFamily="sans-serif">
            DESPLAZAMIENTO
          </text>
          <text x={330 + tiltPx + 16} y="105" fill="#e9f2f6" fontSize="9" fontWeight="bold" fontFamily="'Courier New', monospace">
            ΔY = 2.0 cm
          </text>
        </g>

        {/* Elevation Axis Line & Ticks (Left side) */}
        <line x1="180" y1="110" x2="180" y2="350" stroke="#7a8b9e" strokeWidth="1" />
        {elevationTicks.map((tick, i) => (
          <g key={i}>
            <line x1="175" y1={tick.y} x2="180" y2={tick.y} stroke="#7a8b9e" strokeWidth="1" />
            <text x="170" y={tick.y + 3} fill="#7a8b9e" fontSize="9" textAnchor="end" fontFamily="'Courier New', monospace">
              {tick.label}
            </text>
          </g>
        ))}
        <text
          x="142"
          y="235"
          fill="#7a8b9e"
          fontSize="9"
          fontFamily="sans-serif"
          transform="rotate(-90 142 235)"
          textAnchor="middle"
          letterSpacing="1"
        >
          ELEVACIÓN (METROS)
        </text>
      </svg>

      {/* Screen Caption Overlay */}
      <div
        style={{
          marginTop: 12,
          padding: '8px 20px',
          backgroundColor: 'rgba(24, 34, 45, 0.85)',
          border: '1px solid #3a4854',
          borderRadius: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <span
          style={{
            fontFamily: "'Segoe UI', Arial, sans-serif",
            fontSize: 20,
            fontWeight: 700,
            color: '#e9f2f6',
            letterSpacing: 1.5,
            textTransform: 'uppercase',
          }}
        >
          {p.title || 'DESPLAZAMIENTO DE MURO (EJE Y)'}
        </span>
        <span
          style={{
            fontFamily: "'Courier New', monospace",
            fontSize: 12,
            color: '#e0b44c',
            letterSpacing: 1,
          }}
        >
          SECCIÓN TRANSVERSAL NORTE • MONITOREO DE PRESIÓN
        </span>
      </div>
    </AbsoluteFill>
  );
};