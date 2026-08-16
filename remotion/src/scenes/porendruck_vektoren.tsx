import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const PorendruckVektorenScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const pressure = interpolate(frame, [span * 0.1, span * 0.9], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const arrowScale = interpolate(frame, [span * 0.2, span * 0.85], [0, 1], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const captionY = interpolate(frame, [0, span * 0.2], [20, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const grains = [
    { x: 160, y: 100 }, { x: 220, y: 105 }, { x: 280, y: 95 }, { x: 340, y: 100 },
    { x: 155, y: 160 }, { x: 215, y: 165 }, { x: 275, y: 155 }, { x: 335, y: 160 },
    { x: 165, y: 220 }, { x: 225, y: 225 }, { x: 285, y: 215 }, { x: 345, y: 220 },
  ];

  const pores = [
    { x: 190, y: 130 }, { x: 250, y: 130 }, { x: 310, y: 130 },
    { x: 190, y: 190 }, { x: 250, y: 190 }, { x: 310, y: 190 },
  ];

  const directions = [0, 45, 90, 135, 180, 225, 270, 315];
  const ticks = [0, 1, 2, 3, 4];

  const totalStress = 100;
  const porePressureValue = pressure * 85;
  const effectiveStress = totalStress - porePressureValue;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width={width * 0.8} height={height * 0.8} viewBox="0 0 500 400">
        <defs>
          <radialGradient id="poreGrad">
            <stop offset="0%" stopColor="#e0b44c" stopOpacity={0.6 * pressure} />
            <stop offset="100%" stopColor="#e0b44c" stopOpacity={0} />
          </radialGradient>
        </defs>

        {/* Dimension Line (Depth) */}
        <line x1="80" y1="80" x2="80" y2="280" stroke="#e9f2f6" strokeWidth="1.5" />
        {ticks.map((t) => (
          <g key={`tick-${t}`}>
            <line x1="75" y1={80 + t * 50} x2="85" y2={80 + t * 50} stroke="#e9f2f6" strokeWidth="1" />
            <text x="65" y={84 + t * 50} fill="#e9f2f6" fontSize="10" textAnchor="end">
              {t * 5}m
            </text>
          </g>
        ))}
        <text x="50" y="180" fill="#e9f2f6" fontSize="12" transform="rotate(-90, 50, 180)" textAnchor="middle">
          TIEFE (z)
        </text>

        {/* Pore Water Pressure Glows */}
        {pores.map((p, i) => (
          <circle key={`glow-${i}`} cx={p.x} cy={p.y} r={30 * pressure} fill="url(#poreGrad)" />
        ))}

        {/* Soil Grains (Matrix) */}
        {grains.map((g, i) => {
          const wobbleX = Math.sin(frame * 0.15 + i) * 2 * pressure;
          const wobbleY = Math.cos(frame * 0.15 + i) * 2 * pressure;
          return (
            <circle
              key={`grain-${i}`}
              cx={g.x + wobbleX}
              cy={g.y + wobbleY}
              r="24"
              fill="#8a949b"
              stroke="#e9f2f6"
              strokeWidth="1"
            />
          );
        })}

        {/* Multi-directional Force Arrows */}
        {pores.map((p, i) => (
          <g key={`pore-arrows-${i}`}>
            {directions.map((angle) => {
              const rad = (angle * Math.PI) / 180;
              const x2 = p.x + Math.cos(rad) * 25 * arrowScale;
              const y2 = p.y + Math.sin(rad) * 25 * arrowScale;
              return (
                <line
                  key={angle}
                  x1={p.x}
                  y1={p.y}
                  x2={x2}
                  y2={y2}
                  stroke="#e0b44c"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              );
            })}
          </g>
        ))}

        {/* Stress Comparison Bars */}
        <g transform="translate(420, 100)">
          <text x="0" y="-15" fill="#e9f2f6" fontSize="10" textAnchor="middle">STRESS (kPa)</text>
          
          {/* Total Stress (Static) */}
          <rect x="-25" y={150 - totalStress} width="15" height={totalStress} fill="#8a949b" opacity={0.5} />
          <text x="-17.5" y={165} fill="#8a949b" fontSize="8" textAnchor="middle">σ_tot</text>

          {/* Pore Pressure (Rising) */}
          <rect x="-5" y={150 - porePressureValue} width="15" height={porePressureValue} fill="#e0b44c" />
          <text x="2.5" y={165} fill="#e0b44c" fontSize="8" textAnchor="middle">u</text>

          {/* Effective Stress (Shrinking) */}
          <rect x="15" y={150 - effectiveStress} width="15" height={effectiveStress} fill="#d0523f" />
          <text x="22.5" y={165} fill="#d0523f" fontSize="8" textAnchor="middle">σ'</text>
          
          <line x1="-30" y1="150" x2="40" y2="150" stroke="#e9f2f6" strokeWidth="1" />
        </g>

        {/* Labels */}
        <text x="250" y="320" fill="#e9f2f6" fontSize="12" textAnchor="middle" opacity={pressure}>
          BODENMATRIX WIRD INSTABIL (σ' → 0)
        </text>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            transform: `translateY(${captionY}px)`,
            fontFamily: 'monospace',
            fontSize: 42,
            color: '#e9f2f6',
            letterSpacing: '2px',
            borderTop: '2px solid #e0b44c',
            paddingTop: '10px',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};