import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const UnitAttritionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  // Interpolation 1: Overlap distance (from 240px apart to 98.2px apart)
  // 98.2px is approx 1.228 * R (where R = 80), leaving exactly 50% area visible
  const overlapDist = interpolate(frame, [0, span * 0.85], [240, 98.2], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Interpolation 2: Strength percentage (100% down to 50%)
  const strengthPercent = interpolate(frame, [0, span * 0.85], [100, 50], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Interpolation 3: Timeline progress (0 to 3 weeks)
  const weeksProgress = interpolate(frame, [0, span * 0.85], [0, 3], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Interpolation 4: Title vertical offset
  const titleY = interpolate(frame, [0, span * 0.4], [15, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const gridLinesX = [80, 160, 240, 320, 400, 480, 560];
  const gridLinesY = [60, 120, 180, 240, 300];
  const timelineTicks = [0, 1, 2, 3];

  return (
    <AbsoluteFill
      style={{
        opacity,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
      }}
    >
      <svg width="65%" viewBox="0 0 640 360" style={{ overflow: 'visible' }}>
        {/* Technical Grid */}
        {gridLinesX.map((x) => (
          <line
            key={`grid-x-${x}`}
            x1={x}
            y1={40}
            x2={x}
            y2={320}
            stroke="#e9f2f6"
            strokeWidth={0.5}
            strokeOpacity={0.08}
          />
        ))}
        {gridLinesY.map((y) => (
          <line
            key={`grid-y-${y}`}
            x1={40}
            y1={y}
            x2={600}
            y2={y}
            stroke="#e9f2f6"
            strokeWidth={0.5}
            strokeOpacity={0.08}
          />
        ))}

        {/* Legend */}
        <g transform="translate(60, 40)">
          {/* Indigo Circle Legend */}
          <rect x={0} y={0} width={12} height={12} fill="#3b529a" fillOpacity={0.6} stroke="#3b529a" strokeWidth={1} />
          <text x={20} y={10} fill="#e9f2f6" fontSize={10} fontFamily="monospace" letterSpacing="1px">LEGIO X GEMINA (10,000 Hombres)</text>

          {/* Dusty Green Circle Legend */}
          <rect x={300} y={0} width={12} height={12} fill="#5c7a67" fillOpacity={0.7} stroke="#5c7a67" strokeWidth={1} />
          <text x={320} y={10} fill="#e9f2f6" fontSize={10} fontFamily="monospace" letterSpacing="1px">PESTE ANTONINA (Contagio)</text>
        </g>

        {/* Overlapping Circles Drawing */}
        <g transform="translate(0, 20)">
          {/* Indigo Circle (Legion) */}
          <circle
            cx={200}
            cy={160}
            r={80}
            fill="#3b529a"
            fillOpacity={0.4}
            stroke="#3b529a"
            strokeWidth={2}
          />
          {/* Center point indicator */}
          <circle cx={200} cy={160} r={2} fill="#e9f2f6" />
          <text x={200} y={255} fill="#3b529a" fontSize={10} textAnchor="middle" fontFamily="monospace">NÚCLEO DE LA LEGIO</text>

          {/* Dusty Green Circle (Peste) */}
          <circle
            cx={200 + overlapDist}
            cy={160}
            r={80}
            fill="#5c7a67"
            fillOpacity={0.65}
            stroke="#e0b44c"
            strokeWidth={1.5}
            strokeDasharray="4 2"
          />
          {/* Center point indicator */}
          <circle cx={200 + overlapDist} cy={160} r={2} fill="#e0b44c" />
          <text x={200 + overlapDist} y={255} fill="#5c7a67" fontSize={10} textAnchor="middle" fontFamily="monospace">FRENTE DE INFECCIÓN</text>

          {/* Dimension line between centers */}
          <line
            x1={200}
            y1={160}
            x2={200 + overlapDist}
            y2={160}
            stroke="#e9f2f6"
            strokeWidth={1}
            strokeDasharray="2 2"
            strokeOpacity={0.5}
          />
        </g>

        {/* Right Side: Status Panel & Attrition Gauge */}
        <g transform="translate(440, 90)">
          {/* Background Panel */}
          <rect x={0} y={0} width={160} height={140} fill="#1a2430" fillOpacity={0.4} stroke="#e9f2f6" strokeWidth={0.5} />
          
          <text x={15} y={25} fill="#e9f2f6" fontSize={11} fontFamily="monospace" fontWeight="bold">ESTADO DE FUERZA</text>
          
          {/* Progress Bar Container */}
          <rect x={15} y={40} width={130} height={12} fill="none" stroke="#e9f2f6" strokeWidth={1} strokeOpacity={0.3} />
          {/* Progress Bar Fill */}
          <rect x={15} y={40} width={130 * (strengthPercent / 100)} height={12} fill="#d0523f" />
          
          {/* Percentage Text */}
          <text x={15} y={72} fill="#e9f2f6" fontSize={18} fontFamily="monospace" fontWeight="bold">
            {strengthPercent.toFixed(1)}%
          </text>
          <text x={15} y={88} fill="#8a949b" fontSize={9} fontFamily="monospace">EFECTIVOS RESTANTES</text>

          {/* Absolute numbers */}
          <text x={15} y={112} fill="#e9f2f6" fontSize={11} fontFamily="monospace">
            {Math.round(100 * strengthPercent)} / 10,000
          </text>
          <text x={15} y={124} fill="#d0523f" fontSize={9} fontFamily="monospace">BAJAS: {Math.round(10000 - 100 * strengthPercent)}</text>
        </g>

        {/* Bottom Timeline */}
        <g transform="translate(120, 300)">
          {/* Timeline axis */}
          <line x1={0} y1={0} x2={400} y2={0} stroke="#e9f2f6" strokeWidth={1} />
          
          {timelineTicks.map((tick) => {
            const xPos = tick * 133.3;
            return (
              <g key={`tick-${tick}`} transform={`translate(${xPos}, 0)`}>
                <line x1={0} y1={0} x2={0} y2={6} stroke="#e9f2f6" strokeWidth={1} />
                <text x={0} y={18} fill="#e9f2f6" fontSize={9} textAnchor="middle" fontFamily="monospace">
                  {tick === 0 ? 'INICIO' : `SEM. ${tick}`}
                </text>
              </g>
            );
          })}

          {/* Moving timeline indicator */}
          <g transform={`translate(${weeksProgress * 133.3}, 0)`}>
            <polygon points="0,-8 -5,-15 5,-15" fill="#e0b44c" />
            <line x1={0} y1={-8} x2={0} y2={10} stroke="#e0b44c" strokeWidth={1.5} />
            <text x={0} y={-20} fill="#e0b44c" fontSize={10} textAnchor="middle" fontFamily="monospace" fontWeight="bold">
              DÍA {Math.round(weeksProgress * 7)}
            </text>
          </g>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            marginTop: 20,
            transform: `translateY(${titleY}px)`,
            fontFamily: "'Courier New', Courier, monospace",
            fontSize: 24,
            fontWeight: 'bold',
            color: '#e9f2f6',
            letterSpacing: '2px',
            textTransform: 'uppercase',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};