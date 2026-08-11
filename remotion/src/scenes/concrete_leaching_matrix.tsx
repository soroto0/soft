import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ConcreteLeachingMatrixScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const matrixAppear = interpolate(frame, [0, span * 0.2], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const leachingProgress = interpolate(frame, [span * 0.15, span * 0.85], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const fluidFlow = interpolate(frame, [0, span], [0, 120], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const porosityValue = interpolate(frame, [span * 0.15, span * 0.85], [7.5, 26.8], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleY = interpolate(frame, [0, span * 0.25], [15, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const crystals = [
    { cx: 130, cy: 120, r: 16, label: 'Ca(OH)₂' },
    { cx: 220, cy: 200, r: 20, label: '' },
    { cx: 330, cy: 130, r: 18, label: '' },
    { cx: 170, cy: 300, r: 17, label: '' },
    { cx: 290, cy: 310, r: 22, label: '' },
    { cx: 390, cy: 240, r: 15, label: '' },
  ];

  const flowPaths = [
    'M 40 100 Q 120 110 170 150 T 290 310 T 460 320',
    'M 40 220 Q 170 300 220 200 T 390 240 T 460 190',
    'M 110 40 Q 130 120 220 200 T 330 130 T 460 90',
  ];

  const aggregates = [
    { points: '70,160 110,140 130,180 90,210', label: 'FINE AGGREGATE' },
    { points: '250,60 310,45 340,85 280,105', label: '' },
    { points: '350,330 430,300 450,360 380,390', label: 'COARSE AGGREGATE' },
    { points: '80,310 130,330 110,380 60,350', label: '' },
  ];

  const porosityTicks = [5, 15, 25, 35];
  const currentGraphX = 560 + 200 * leachingProgress;
  const currentGraphY = 310 - ((porosityValue - 5) / 30) * 180;

  return (
    <AbsoluteFill
      style={{
        opacity,
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      <svg width="82%" height="72%" viewBox="0 0 820 460">
        <defs>
          <linearGradient id="voidGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#d0523f" stopOpacity={0.8} />
            <stop offset="100%" stopColor="#101726" stopOpacity={0.9} />
          </linearGradient>
          <linearGradient id="matrixBg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2a3545" />
            <stop offset="100%" stopColor="#1c2430" />
          </linearGradient>
        </defs>

        {/* Matrix Cross-Section Outer Frame */}
        <g opacity={matrixAppear}>
          <rect
            x={40}
            y={40}
            width={420}
            height={380}
            fill="url(#matrixBg)"
            stroke="#e9f2f6"
            strokeWidth={1.5}
            rx={4}
          />

          {/* Aggregates */}
          {aggregates.map((ag, i) => (
            <g key={`ag-${i}`}>
              <polygon points={ag.points} fill="#475569" stroke="#64748b" strokeWidth={1} />
              {ag.label ? (
                <text x={ag.points.split(' ')[0].split(',')[0]} y={parseInt(ag.points.split(' ')[0].split(',')[1], 10) - 8} fill="#94a3b8" fontSize={9} fontWeight="600">
                  {ag.label}
                </text>
              ) : null}
            </g>
          ))}

          {/* Dissolving Ca(OH)2 Particles & Expanding Micro-Voids */}
          {crystals.map((c, i) => {
            const voidRadius = c.r * (0.4 + leachingProgress * 0.9);
            const crystalRadius = Math.max(0, c.r * (1 - leachingProgress * 0.85));
            const crystalOpacity = Math.max(0, 1 - leachingProgress * 0.9);

            return (
              <g key={`crystal-${i}`}>
                {/* Micro-void expanding line */}
                <circle
                  cx={c.cx}
                  cy={c.cy}
                  r={voidRadius}
                  fill="url(#voidGradient)"
                  stroke="#d0523f"
                  strokeWidth={1.2}
                  strokeDasharray="3 2"
                />
                {/* Dissolving Calcium Hydroxide particle */}
                {crystalRadius > 0 ? (
                  <circle
                    cx={c.cx}
                    cy={c.cy}
                    r={crystalRadius}
                    fill="#e0b44c"
                    opacity={crystalOpacity}
                  />
                ) : null}
              </g>
            );
          })}

          {/* Fluid Flow Paths */}
          {flowPaths.map((pathD, i) => (
            <g key={`flow-${i}`}>
              <path
                d={pathD}
                fill="none"
                stroke="#50b4e6"
                strokeWidth={2.5}
                strokeDasharray="8 6"
                strokeDashoffset={-fluidFlow}
                opacity={0.85}
              />
            </g>
          ))}

          {/* Matrix Material Labels and Leader Lines */}
          <path d="M 130 120 L 80 70 L 20 70" fill="none" stroke="#e0b44c" strokeWidth={1} />
          <text x={20} y={62} fill="#e0b44c" fontSize={10} fontWeight="600">
            Ca(OH)₂ CRYSTAL (DISSOLVING)
          </text>

          <path d="M 290 310 L 330 380 L 360 380" fill="none" stroke="#d0523f" strokeWidth={1} />
          <text x={365} y={383} fill="#d0523f" fontSize={10} fontWeight="600">
            EXPANDING MICRO-VOID
          </text>

          <path d="M 250 220 L 200 170 L 170 170" fill="none" stroke="#50b4e6" strokeWidth={1} />
          <text x={170} y={163} fill="#50b4e6" fontSize={10} fontWeight="600" textAnchor="end">
            FLUID LEACHING PATH
          </text>

          <text x={50} y={410} fill="#e9f2f6" fontSize={11} letterSpacing="1">
            C-S-H GEL MATRIX CROSS-SECTION
          </text>
        </g>

        {/* Right Panel: Porosity Timeline Graph */}
        <g opacity={matrixAppear}>
          {/* Graph Axes */}
          <line x1={560} y1={310} x2={760} y2={310} stroke="#e9f2f6" strokeWidth={1.5} />
          <line x1={560} y1={130} x2={560} y2={310} stroke="#e9f2f6" strokeWidth={1.5} />

          <text x={560} y={110} fill="#e9f2f6" fontSize={11} fontWeight="bold" letterSpacing="0.5">
            INTERNAL VOID RATIO (%)
          </text>

          {/* Grid Lines & Y Ticks */}
          {porosityTicks.map((val) => {
            const y = 310 - ((val - 5) / 30) * 180;
            return (
              <g key={`tick-${val}`}>
                <line x1={555} y1={y} x2={760} y2={y} stroke="#475569" strokeWidth={0.8} strokeDasharray="2 2" />
                <text x={548} y={y + 3} fill="#94a3b8" fontSize={9} textAnchor="end">
                  {val}%
                </text>
              </g>
            );
          })}

          <text x={560} y={326} fill="#94a3b8" fontSize={9}>
            t₀ (INITIAL)
          </text>
          <text x={760} y={326} fill="#94a3b8" fontSize={9} textAnchor="end">
            EXPOSURE TIME
          </text>

          {/* Plotted Porosity Curve */}
          <path
            d={`M 560 295 Q ${560 + 100 * leachingProgress} ${295 - 40 * leachingProgress} ${currentGraphX} ${currentGraphY}`}
            fill="none"
            stroke="#d0523f"
            strokeWidth={2.5}
          />

          {/* Current Value Marker */}
          <circle cx={currentGraphX} cy={currentGraphY} r={4} fill="#d0523f" stroke="#e9f2f6" strokeWidth={1} />
          <rect
            x={currentGraphX - 25}
            y={currentGraphY - 26}
            width={50}
            height={18}
            fill="#d0523f"
            rx={2}
          />
          <text
            x={currentGraphX}
            y={currentGraphY - 13}
            fill="#e9f2f6"
            fontSize={10}
            fontWeight="bold"
            textAnchor="middle"
          >
            {porosityValue.toFixed(1)}%
          </text>

          {/* Legend Box */}
          <rect x={560} y={350} width={200} height={65} fill="#1c2430" stroke="#475569" strokeWidth={1} rx={3} />
          <circle cx={575} cy={370} r={5} fill="#e0b44c" />
          <text x={588} y={373} fill="#e9f2f6" fontSize={9}>
            CH Phase (Calcium Hydroxide)
          </text>

          <circle cx={575} cy={395} r={5} fill="#101726" stroke="#d0523f" strokeWidth={1} />
          <text x={588} y={398} fill="#e9f2f6" fontSize={9}>
            Microscopic Void Network
          </text>
        </g>
      </svg>

      {/* On-Screen Caption */}
      {p.title ? (
        <div
          style={{
            marginTop: 16,
            transform: `translateY(${titleY}px)`,
            fontFamily: "'Segoe UI', Arial, sans-serif",
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: 2,
            color: '#e9f2f6',
            textTransform: 'uppercase',
            borderBottom: '2px solid #d0523f',
            paddingBottom: 4,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};