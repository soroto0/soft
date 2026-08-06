import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const PipeCrossSectionBuildupScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  // 1. Mineral scale growth animation
  const growth = interpolate(frame, [0, span * 0.85], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // 2. Simulated water flow velocity increase due to constriction
  const flowVel = interpolate(frame, [span * 0.1, span * 0.9], [1.0, 4.2], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // 3. Timeline progression in simulated years
  const timelineVal = interpolate(frame, [0, span * 0.85], [0, 15], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // 4. Subtle caption slide entrance
  const titleY = interpolate(frame, [0, span * 0.2], [12, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  // Geometry dimensions
  const outerRadius = 115;
  const pipeInnerRadius = 100;
  const maxScaleThickness = 72;
  const scaleThickness = maxScaleThickness * growth;
  const currentLumenRadius = pipeInnerRadius - scaleThickness;

  const flowAreaPct = Math.max(
    5,
    Math.round(((currentLumenRadius * currentLumenRadius) / (pipeInnerRadius * pipeInnerRadius)) * 100)
  );

  const yearsTicks = [
    { year: 0, label: '0 YRS', x: 80 },
    { year: 5, label: '5 YRS', x: 180 },
    { year: 10, label: '10 YRS', x: 280 },
    { year: 15, label: '15 YRS', x: 380 },
  ];

  const currentTimelineX = interpolate(growth, [0, 1], [80, 380]);

  return (
    <AbsoluteFill
      style={{
        opacity,
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: "'Courier New', Courier, monospace",
      }}
    >
      <svg width="85%" height="85%" viewBox="0 0 600 420">
        <defs>
          <radialGradient id="waterGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#81b0d2" />
            <stop offset="70%" stopColor="#4a739c" />
            <stop offset="100%" stopColor="#2c4d6f" />
          </radialGradient>

          <pattern id="scaleHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="8" stroke="#e0b44c" strokeWidth="1.5" opacity="0.4" />
          </pattern>
        </defs>

        {/* Outer Copper Pipe Body */}
        <circle cx="210" cy="180" r={outerRadius} fill="none" stroke="#b86d4b" strokeWidth="12" />
        <circle cx="210" cy="180" r={outerRadius + 6} fill="none" stroke="#e9f2f6" strokeWidth="1" opacity="0.3" />
        <circle cx="210" cy="180" r={pipeInnerRadius} fill="none" stroke="#e9f2f6" strokeWidth="1.5" />

        {/* Primary Mineral Scale Layer (Outer Hard Deposit) */}
        {scaleThickness > 0 && (
          <circle
            cx="210"
            cy="180"
            r={pipeInnerRadius}
            fill="none"
            stroke="#a3823d"
            strokeWidth={scaleThickness}
            opacity="0.85"
          />
        )}

        {/* Secondary Crystalline Deposit Layer */}
        {scaleThickness > 10 && (
          <circle
            cx="210"
            cy="180"
            r={pipeInnerRadius - scaleThickness * 0.35}
            fill="none"
            stroke="url(#scaleHatch)"
            strokeWidth={scaleThickness * 0.65}
          />
        )}

        {/* Narrowing Water Lumen Path */}
        <circle cx="210" cy="180" r={Math.max(1, currentLumenRadius)} fill="url(#waterGrad)" />
        <circle
          cx="210"
          cy="180"
          r={Math.max(1, currentLumenRadius)}
          fill="none"
          stroke="#d0523f"
          strokeWidth="2"
          strokeDasharray="4 3"
        />

        {/* Lumen Center Axis Marks */}
        <line
          x1={210 - currentLumenRadius}
          y1="180"
          x2={210 + currentLumenRadius}
          y2="180"
          stroke="#e9f2f6"
          strokeWidth="1"
          strokeDasharray="2 2"
          opacity="0.7"
        />

        {/* Schematic Leader Lines & Annotations */}
        {/* Leader 1: Copper Wall */}
        <path d="M 315,110 L 370,90 L 440,90" fill="none" stroke="#e9f2f6" strokeWidth="1" />
        <circle cx="315" cy="110" r="3" fill="#b86d4b" />
        <text x="445" y="88" fill="#e9f2f6" fontSize="11" fontWeight="bold">
          COPPER WALL (22mm OD)
        </text>
        <text x="445" y="100" fill="#e9f2f6" fontSize="9" opacity="0.7">
          Structural Exterior
        </text>

        {/* Leader 2: Mineral Scale */}
        <path d="M 280,150 L 370,150 L 440,150" fill="none" stroke="#e0b44c" strokeWidth="1" />
        <circle cx="280" cy="150" r="3" fill="#e0b44c" />
        <text x="445" y="148" fill="#e0b44c" fontSize="11" fontWeight="bold">
          CALCITE SCALE (CaCO₃)
        </text>
        <text x="445" y="160" fill="#e0b44c" fontSize="9" opacity="0.9">
          Thickness: {(scaleThickness * 0.15).toFixed(1)} mm
        </text>

        {/* Leader 3: Restricted Lumen */}
        <path
          d={`M ${210 + currentLumenRadius * 0.7},${180 + currentLumenRadius * 0.7} L 370,210 L 440,210`}
          fill="none"
          stroke="#d0523f"
          strokeWidth="1"
        />
        <circle cx={210 + currentLumenRadius * 0.7} cy={180 + currentLumenRadius * 0.7} r="3" fill="#d0523f" />
        <text x="445" y="208" fill="#d0523f" fontSize="11" fontWeight="bold">
          WATER FLOW PATH
        </text>
        <text x="445" y="220" fill="#e9f2f6" fontSize="9" opacity="0.8">
          Clear Area: {flowAreaPct}%
        </text>

        {/* Telemetry Display Panel */}
        <rect x="440" y="245" width="135" height="65" fill="#141c22" stroke="#e9f2f6" strokeWidth="0.8" rx="3" opacity="0.85" />
        <text x="450" y="262" fill="#e9f2f6" fontSize="9" opacity="0.6">
          FLOW VELOCITY INDEX
        </text>
        <text x="450" y="282" fill="#e0b44c" fontSize="16" fontWeight="bold">
          {flowVel.toFixed(2)}x
        </text>
        <text x="450" y="298" fill="#d0523f" fontSize="9">
          {flowAreaPct < 25 ? 'CRITICAL RESTRICTION' : 'PROGRESSIVE BUILDUP'}
        </text>

        {/* Timeline Axis */}
        <g transform="translate(40, 330)">
          <text x="40" y="-10" fill="#e9f2f6" fontSize="10" opacity="0.8" letterSpacing="1">
            EXPOSURE TIMELINE (SIMULATED YEARS)
          </text>
          <line x1="80" y1="10" x2="380" y2="10" stroke="#e9f2f6" strokeWidth="1.5" opacity="0.6" />

          {yearsTicks.map((t) => (
            <g key={t.year} transform={`translate(${t.x}, 10)`}>
              <line x1="0" y1="0" x2="0" y2="6" stroke="#e9f2f6" strokeWidth="1" />
              <text x="0" y="20" fill="#e9f2f6" fontSize="10" textAnchor="middle">
                {t.label}
              </text>
            </g>
          ))}

          {/* Active timeline cursor */}
          <line x1={currentTimelineX} y1="0" x2={currentTimelineX} y2="16" stroke="#d0523f" strokeWidth="2" />
          <circle cx={currentTimelineX} cy="10" r="4" fill="#d0523f" />
          <text x={currentTimelineX} y="-8" fill="#d0523f" fontSize="11" textAnchor="middle" fontWeight="bold">
            {timelineVal.toFixed(1)} YRS
          </text>
        </g>
      </svg>

      {/* On-screen caption */}
      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: 24,
            transform: `translateY(${titleY}px)`,
            fontFamily: "'Segoe UI', Arial, sans-serif",
            fontSize: 22,
            letterSpacing: '3px',
            textTransform: 'uppercase',
            color: '#e9f2f6',
            backgroundColor: 'rgba(15, 22, 28, 0.8)',
            padding: '6px 20px',
            borderRadius: 4,
            border: '1px solid rgba(233, 242, 246, 0.2)',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};