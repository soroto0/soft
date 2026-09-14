import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const StabilitatsGrenzeScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const drawAxes = interpolate(frame, [0, span * 0.25], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const curveProgress = interpolate(frame, [span * 0.18, span * 0.55], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const alertAnim = interpolate(frame, [span * 0.48, span * 0.75], [0, 1], {
    easing: Easing.out(Easing.back(1.4)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pulse = Math.sin((frame / fps) * 7) * 0.5 + 0.5;

  const titleRise = interpolate(frame, [span * 0.1, span * 0.4], [16, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const xTicks = [
    { deg: 0, x: 90 },
    { deg: 30, x: 202.5 },
    { deg: 60, x: 315 },
    { deg: 73, x: 363.75, highlight: true },
    { deg: 90, x: 427.5 },
    { deg: 120, x: 540 },
  ];

  const yTicks = [
    { val: '+0.6 m', y: 130 },
    { val: '+0.4 m', y: 180 },
    { val: '+0.2 m', y: 230 },
    { val: '0.0 m', y: 280 },
    { val: '-0.2 m', y: 330 },
  ];

  const curveLength = 620;
  const strokeOffset = curveLength * (1 - curveProgress);

  return (
    <AbsoluteFill
      style={{
        opacity,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <svg width="74%" viewBox="0 0 680 400" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="dangerFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d0523f" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#d0523f" stopOpacity={0.02} />
          </linearGradient>
          <pattern
            id="hatchPattern"
            width="8"
            height="8"
            patternTransform="rotate(45 0 0)"
            patternUnits="userSpaceOnUse"
          >
            <line x1="0" y1="0" x2="0" y2="8" stroke="#d0523f" strokeWidth="1.2" opacity="0.35" />
          </pattern>
        </defs>

        {/* Coordinate Grid Lines */}
        {yTicks.map((tick) => (
          <g key={tick.val} opacity={drawAxes * 0.45}>
            <line
              x1={90}
              y1={tick.y}
              x2={570}
              y2={tick.y}
              stroke="#e9f2f6"
              strokeWidth={tick.y === 280 ? 1.5 : 0.6}
              strokeDasharray={tick.y === 280 ? undefined : '3 4'}
            />
            <text
              x={80}
              y={tick.y + 3.5}
              fill="#e9f2f6"
              fontSize={8.5}
              textAnchor="end"
              fontFamily="monospace"
              opacity={0.8}
            >
              {tick.val}
            </text>
          </g>
        ))}

        {/* X Ticks & Labels */}
        {xTicks.map((tick) => (
          <g key={tick.deg} opacity={drawAxes}>
            <line
              x1={tick.x}
              y1={276}
              x2={tick.x}
              y2={286}
              stroke={tick.highlight ? '#d0523f' : '#e9f2f6'}
              strokeWidth={tick.highlight ? 1.8 : 0.8}
            />
            <text
              x={tick.x}
              y={302}
              fill={tick.highlight ? '#e0b44c' : '#e9f2f6'}
              fontSize={tick.highlight ? 10 : 8.5}
              fontWeight={tick.highlight ? 'bold' : 'normal'}
              textAnchor="middle"
              fontFamily="monospace"
            >
              {tick.deg}°
            </text>
          </g>
        ))}

        {/* Danger Area Hatching after 73° */}
        <g opacity={alertAnim * 0.85}>
          <rect x={363.75} y={100} width={180} height={230} fill="url(#hatchPattern)" />
          <rect x={363.75} y={100} width={180} height={230} fill="url(#dangerFill)" />
          <text
            x={453.75}
            y={120}
            fill="#d0523f"
            fontSize={8.5}
            textAnchor="middle"
            fontFamily="monospace"
            letterSpacing="1.5"
          >
            GEFAHRENZONE (KENTERUNG)
          </text>
        </g>

        {/* Nominal Reference Curve (Kiel Unten / Normal) */}
        <g opacity={drawAxes * 0.35}>
          <path
            d="M 90 280 C 150 140, 240 100, 310 115 C 380 130, 470 210, 520 280"
            fill="none"
            stroke="#e9f2f6"
            strokeWidth={1.2}
            strokeDasharray="4 4"
          />
          <text
            x={480}
            y={180}
            fill="#e9f2f6"
            fontSize={7.5}
            fontFamily="monospace"
          >
            Kiel abgesenkt (Standard &gt;100°)
          </text>
        </g>

        {/* Active Degraded Curve: Kiel Hochgezogen */}
        <path
          d="M 90 280 C 150 185, 210 170, 260 190 C 310 215, 340 255, 363.75 280 C 390 308, 415 340, 440 348"
          fill="none"
          stroke="#e0b44c"
          strokeWidth={2.4}
          strokeDasharray={curveLength}
          strokeDashoffset={strokeOffset}
          strokeLinecap="round"
        />

        {/* Critical Point Marker at 73° */}
        <g opacity={alertAnim}>
          {/* Vertical Drop Line to 73° */}
          <line
            x1={363.75}
            y1={90}
            x2={363.75}
            y2={280}
            stroke="#d0523f"
            strokeWidth={1.5}
            strokeDasharray="3 3"
          />

          {/* Pulse Target Circle */}
          <circle
            cx={363.75}
            cy={280}
            r={6 + pulse * 4}
            fill="none"
            stroke="#d0523f"
            strokeWidth={1}
            opacity={0.8 - pulse * 0.4}
          />
          <circle cx={363.75} cy={280} r={4.5} fill="#d0523f" stroke="#e9f2f6" strokeWidth={1} />

          {/* Callout Pointer & Badge */}
          <line x1={363.75} y1={280} x2={415} y2={235} stroke="#d0523f" strokeWidth={1.2} />
          <line x1={415} y1={235} x2={525} y2={235} stroke="#d0523f" strokeWidth={1.2} />

          <rect x={415} y={202} width={130} height={30} fill="#141c22" stroke="#d0523f" strokeWidth={1} />
          <text x={422} y={216} fill="#d0523f" fontSize={8} fontWeight="bold" fontFamily="monospace">
            STABILITÄTSVERLUST
          </text>
          <text x={422} y={227} fill="#e0b44c" fontSize={9.5} fontWeight="bold" fontFamily="monospace">
            KRITISCH: 73.0°
          </text>
        </g>

        {/* Axes Structure Lines */}
        <g opacity={drawAxes}>
          {/* X Axis */}
          <line x1={90} y1={280} x2={575} y2={280} stroke="#e9f2f6" strokeWidth={1.4} />
          <polygon points="575,277 583,280 575,283" fill="#e9f2f6" />

          {/* Y Axis */}
          <line x1={90} y1={345} x2={90} y2={85} stroke="#e9f2f6" strokeWidth={1.4} />
          <polygon points="87,85 90,77 93,85" fill="#e9f2f6" />

          {/* Axis Titles */}
          <text x={585} y={284} fill="#e9f2f6" fontSize={8.5} fontFamily="monospace">
            φ [°]
          </text>
          <text x={90} y={68} fill="#e9f2f6" fontSize={8.5} textAnchor="middle" fontFamily="monospace">
            GZ (HEBELARM)
          </text>
        </g>

        {/* Legend */}
        <g opacity={drawAxes * 0.9} transform="translate(100, 95)">
          <line x1={0} y1={0} x2={22} y2={0} stroke="#e0b44c" strokeWidth={2} />
          <text x={28} y={3.5} fill="#e9f2f6" fontSize={8} fontFamily="monospace">
            Kiel hochgezogen (Reststabilität)
          </text>

          <line x1={0} y1={14} x2={22} y2={14} stroke="#e9f2f6" strokeWidth={1.2} strokeDasharray="3 3" opacity={0.6} />
          <text x={28} y={17.5} fill="#e9f2f6" fontSize={8} opacity={0.6} fontFamily="monospace">
            Kiel voll abgesenkt
          </text>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            marginTop: 18,
            transform: `translateY(${titleRise}px)`,
            fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
            fontSize: 26,
            fontWeight: 500,
            letterSpacing: '0.04em',
            color: '#e9f2f6',
            textTransform: 'uppercase',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};