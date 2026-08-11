import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const SpatialHallucinationScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const abyssCut = interpolate(frame, [0, span * 0.5], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const depthShift = interpolate(frame, [0, span], [0, 40], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pulse = interpolate(frame, [span * 0.2, span * 0.8], [0.8, 1.2], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const rise = interpolate(frame, [0, span * 0.4], [15, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const rightStrata = [
    { y: 160, h: 25, fill: '#6b7882', label: 'SUPERFICIE' },
    { y: 185, h: 35, fill: '#485460', label: 'ESTRATO BASTIÓN' },
    { y: 220, h: 40, fill: '#2d3742', label: 'ROCA MADRE' },
  ];

  const depthTicks = [
    { depth: '-100 m', offset: 30 },
    { depth: '-500 m', offset: 60 },
    { depth: '-2000 m', offset: 90 },
    { depth: '- ∞', offset: 115 },
  ];

  const voidLines = [-160, -120, -80, -40];

  const abyssWidth = 190 * abyssCut;
  const voidX = 250 - abyssWidth;

  return (
    <AbsoluteFill
      style={{
        opacity,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <svg width="75%" viewBox="0 0 500 320" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="abyssGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d0523f" stopOpacity={0.8} />
            <stop offset="35%" stopColor="#1f2933" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#080c10" stopOpacity={0.98} />
          </linearGradient>
        </defs>

        {/* ABYSS VOID (LEFT SIDE) */}
        <rect
          x={voidX}
          y={160}
          width={abyssWidth}
          height={130}
          fill="url(#abyssGrad)"
          stroke="#d0523f"
          strokeWidth={1}
          strokeDasharray="4 2"
          opacity={abyssCut}
        />

        {/* Falling depth particles / vectors in the abyss */}
        {voidLines.map((xOffset, idx) => {
          const lineX = 250 + xOffset * abyssCut;
          if (lineX < voidX) return null;
          const yPos = 160 + ((depthShift + idx * 25) % 110);
          return (
            <line
              key={idx}
              x1={lineX}
              y1={yPos}
              x2={lineX}
              y2={Math.min(290, yPos + 18)}
              stroke="#d0523f"
              strokeWidth={1}
              strokeDasharray="2 3"
              opacity={0.6 * abyssCut}
            />
          );
        })}

        {/* Depth ticks on left edge */}
        {depthTicks.map((tick, i) => (
          <g key={i} opacity={abyssCut}>
            <line
              x1={voidX}
              y1={160 + tick.offset}
              x2={voidX + 8}
              y2={160 + tick.offset}
              stroke="#e0b44c"
              strokeWidth={1}
            />
            <text
              x={Math.max(10, voidX - 6)}
              y={163 + tick.offset}
              fill="#e0b44c"
              fontSize={8}
              textAnchor="end"
              fontFamily="sans-serif"
            >
              {tick.depth}
            </text>
          </g>
        ))}

        {/* SOLID GROUND (RIGHT SIDE) */}
        {rightStrata.map((s, idx) => (
          <g key={idx}>
            <rect
              x={250}
              y={s.y}
              width={190}
              height={s.h}
              fill={s.fill}
              stroke="#e9f2f6"
              strokeWidth={0.5}
            />
            <text
              x={430}
              y={s.y + s.h / 2 + 3}
              fill="#e9f2f6"
              fontSize={7}
              textAnchor="end"
              fontFamily="sans-serif"
              opacity={0.8}
            >
              {s.label}
            </text>
          </g>
        ))}

        {/* Ground Baseline */}
        <line
          x1={voidX}
          y1={160}
          x2={440}
          y2={160}
          stroke="#e9f2f6"
          strokeWidth={1.5}
        />

        {/* Abrupt Shear Cliff Edge at Center */}
        <line
          x1={250}
          y1={160}
          x2={250}
          y2={290}
          stroke="#d0523f"
          strokeWidth={2}
        />

        {/* OBSERVER MARKER (PASCAL) */}
        <line
          x1={250}
          y1={80}
          x2={250}
          y2={160}
          stroke="#e0b44c"
          strokeWidth={1}
          strokeDasharray="3 3"
        />

        <circle
          cx={250}
          cy={160}
          r={6 * pulse}
          fill="#e0b44c"
          stroke="#e9f2f6"
          strokeWidth={1.5}
        />
        <circle
          cx={250}
          cy={160}
          r={12 * pulse}
          fill="none"
          stroke="#e0b44c"
          strokeWidth={0.8}
          opacity={0.5}
        />

        {/* Observer Tag */}
        <rect
          x={185}
          y={95}
          width={130}
          height={22}
          fill="#1c242b"
          stroke="#e0b44c"
          strokeWidth={0.8}
          rx={2}
        />
        <text
          x={250}
          y={110}
          fill="#e9f2f6"
          fontSize={8}
          textAnchor="middle"
          fontFamily="sans-serif"
          fontWeight="bold"
        >
          POSICIÓN DEL FILÓSOFO
        </text>

        {/* Vector pointing to Left Abyss */}
        <g opacity={abyssCut}>
          <line
            x1={235}
            y1={140}
            x2={160}
            y2={140}
            stroke="#d0523f"
            strokeWidth={1.2}
          />
          <polygon points="160,137 153,140 160,143" fill="#d0523f" />
          <text
            x={195}
            y={134}
            fill="#d0523f"
            fontSize={8}
            textAnchor="middle"
            fontFamily="sans-serif"
            fontWeight="bold"
          >
            ABISMO A SU IZQUIERDA
          </text>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            marginTop: 20,
            transform: `translateY(${rise}px)`,
            fontFamily: "'Segoe UI', Arial, sans-serif",
            fontSize: 32,
            color: '#e9f2f6',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};