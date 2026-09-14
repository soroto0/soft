import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const BeamLoadDoublingScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  // Animation 1: Downward load arrow expansion (doubling scale)
  const loadScale = interpolate(frame, [span * 0.2, span * 0.55], [1, 2], {
    easing: Easing.out(Easing.back(1.4)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Animation 2: Structural stress heatmap pulse & intensity increase
  const stressOpacity = interpolate(frame, [span * 0.25, span * 0.6], [0.2, 0.95], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Animation 3: Dynamic load gauge percentage counter (100% -> 200%)
  const gaugeVal = interpolate(frame, [span * 0.2, span * 0.6], [100, 200], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Animation 4: Downward tension displacement on suspension rod
  const rodPull = interpolate(frame, [span * 0.18, span * 0.52], [0, 10], {
    easing: Easing.inOut(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const arrowXPositions = [260, 370, 480, 590, 700];
  const ticks = [0, 50, 100, 150, 200];

  return (
    <AbsoluteFill
      style={{
        opacity,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <svg width="86%" viewBox="0 0 960 520">
        <defs>
          {/* Stress concentration gradient across the box beam */}
          <linearGradient id="stressHeat" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3a4650" />
            <stop offset="35%" stopColor="#e0b44c" />
            <stop offset="50%" stopColor="#d0523f" />
            <stop offset="65%" stopColor="#e0b44c" />
            <stop offset="100%" stopColor="#3a4650" />
          </linearGradient>

          {/* Load arrow gradient */}
          <linearGradient id="arrowGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7a8a9e" />
            <stop offset="70%" stopColor="#d0523f" />
          </linearGradient>
        </defs>

        {/* --- LEFT LOAD GAUGE COLUMN --- */}
        <g transform="translate(60, 140)">
          <text x="20" y="-15" fill="#e9f2f6" fontSize="11" textAnchor="middle" letterSpacing="1">
            LASTGRAD
          </text>
          {/* Outer Gauge Frame */}
          <rect x="0" y="0" width="40" height="200" fill="#1e252b" stroke="#7a8a9e" strokeWidth="1" rx="3" />
          {/* Active Load Fill Level */}
          <rect
            x="4"
            y={200 - (gaugeVal / 200) * 192}
            width="32"
            height={(gaugeVal / 200) * 192}
            fill={gaugeVal > 150 ? '#d0523f' : '#e0b44c'}
            opacity={0.85}
            rx="2"
          />
          {/* Ticks and values */}
          {ticks.map((t) => {
            const yPos = 200 - (t / 200) * 192;
            return (
              <g key={t}>
                <line x1="40" y1={yPos} x2="48" y2={yPos} stroke="#e9f2f6" strokeWidth="1" />
                <text x="54" y={yPos + 4} fill="#e9f2f6" fontSize="10">
                  {t}%
                </text>
              </g>
            );
          })}
          {/* Readout label */}
          <text x="20" y="230" fill={gaugeVal > 150 ? '#d0523f' : '#e0b44c'} fontSize="18" fontWeight="bold" textAnchor="middle">
            {Math.round(gaugeVal)}%
          </text>
        </g>

        {/* --- MAIN 4TH FLOOR BOX BEAM ASSEMBLY --- */}
        {/* Beam Section Title */}
        <text x="480" y="70" fill="#e9f2f6" fontSize="14" textAnchor="middle" letterSpacing="1.5">
          4. OG HOHLTRÄGER (TRÄGERBELASTUNG)
        </text>

        {/* Slate-Grey / Danger Load Arrows (Doubling in scale) */}
        {arrowXPositions.map((x) => {
          const stemLength = 35 * loadScale;
          const arrowHeadY = 160;
          const stemTopY = arrowHeadY - stemLength;

          return (
            <g key={x}>
              {/* Arrow Shaft */}
              <line
                x1={x}
                y1={stemTopY}
                x2={x}
                y2={arrowHeadY - 10}
                stroke="url(#arrowGrad)"
                strokeWidth={4 * (loadScale * 0.75)}
              />
              {/* Arrow Head */}
              <polygon
                points={`${x - 8 * loadScale},${arrowHeadY - 12} ${x + 8 * loadScale},${arrowHeadY - 12} ${x},${arrowHeadY}`}
                fill="#d0523f"
              />
              {/* Force magnitude indicator line */}
              <line
                x1={x - 12}
                y1={stemTopY}
                x2={x + 12}
                y2={stemTopY}
                stroke="#e9f2f6"
                strokeWidth="1"
                opacity={0.6}
              />
            </g>
          );
        })}

        {/* Top Flange */}
        <rect x="200" y="165" width="560" height="18" fill="#4a5660" stroke="#e9f2f6" strokeWidth="1" />

        {/* Web / Box Interior with Dynamic Stress Overlay */}
        <rect x="220" y="183" width="520" height="70" fill="#242c33" stroke="#8a949b" strokeWidth="1" />
        <rect x="221" y="184" width="518" height="68" fill="url(#stressHeat)" opacity={stressOpacity} />

        {/* Internal Stiffener Plates */}
        <line x1="340" y1="183" x2="340" y2="253" stroke="#e9f2f6" strokeWidth="1" strokeDasharray="3 3" opacity={0.5} />
        <line x1="620" y1="183" x2="620" y2="253" stroke="#e9f2f6" strokeWidth="1" strokeDasharray="3 3" opacity={0.5} />

        {/* Bottom Flange */}
        <rect x="200" y="253" width="560" height="18" fill="#4a5660" stroke="#e9f2f6" strokeWidth="1" />

        {/* --- SUSPENSION ROD & WASHER (UNCHANGED / CRITICAL POINT) --- */}
        {/* Hanger Rod through beam center (moving with tension) */}
        <g transform={`translate(0, ${rodPull})`}>
          <rect x="470" y="100" width="20" height="260" fill="#e0b44c" stroke="#e9f2f6" strokeWidth="0.8" />
          {/* Lower Hanger Connection / Bridge 2 & 1 Force Combined */}
          <rect x="450" y="320" width="60" height="14" fill="#3a4650" stroke="#e9f2f6" strokeWidth="1" />
          <text x="480" y="355" fill="#e0b44c" fontSize="10" textAnchor="middle">
            ANGEHÄNGTE BRÜCKEN (1. OG + 4. OG)
          </text>
        </g>

        {/* Washer under bottom flange (Unchanged / Small) */}
        <rect x="452" y="271" width="56" height="10" fill="#8a949b" stroke="#d0523f" strokeWidth="1.5" />

        {/* Weld Seam Markers (Unreinforced / Critical Danger Zone) */}
        <polygon points="440,253 452,253 452,271" fill="#d0523f" opacity={0.9} />
        <polygon points="508,253 520,253 508,271" fill="#d0523f" opacity={0.9} />

        {/* --- ANNOTATIONS AND TECHNICAL CALLOUTS --- */}
        {/* Weld Seam Callout */}
        <line x1="435" y1="262" x2="310" y2="310" stroke="#d0523f" strokeWidth="1.2" strokeDasharray="4 2" />
        <rect x="170" y="300" width="140" height="34" fill="#1e252b" stroke="#d0523f" strokeWidth="1" rx="2" />
        <text x="240" y="314" fill="#d0523f" fontSize="10" fontWeight="bold" textAnchor="middle">
          SCHWEIßNAHT
        </text>
        <text x="240" y="327" fill="#e9f2f6" fontSize="9" textAnchor="middle">
          UNVERSTÄRKT
        </text>

        {/* Washer Callout */}
        <line x1="510" y1="276" x2="650" y2="310" stroke="#e0b44c" strokeWidth="1.2" strokeDasharray="4 2" />
        <rect x="650" y="300" width="150" height="34" fill="#1e252b" stroke="#e0b44c" strokeWidth="1" rx="2" />
        <text x="725" y="314" fill="#e0b44c" fontSize="10" fontWeight="bold" textAnchor="middle">
          UNTERLEGSCHEIBE
        </text>
        <text x="725" y="327" fill="#e9f2f6" fontSize="9" textAnchor="middle">
          UNVERGRÖSSERT (45 mm)
        </text>

        {/* Load Doubling Dynamic Arrow Label */}
        <g transform={`translate(480, ${110 - 25 * loadScale})`}>
          <rect x="-110" y="-16" width="220" height="24" fill="#1e252b" stroke="#7a8a9e" strokeWidth="1" rx="3" />
          <text x="0" y="0" fill="#e9f2f6" fontSize="11" fontWeight="bold" textAnchor="middle">
            LAST: {loadScale < 1.5 ? '100% (EINFACH)' : '200% (DOPPELT)'}
          </text>
        </g>

        {/* Bottom Baseline / Reference Axis */}
        <line x1="120" y1="420" x2="840" y2="420" stroke="#7a8a9e" strokeWidth="1" strokeDasharray="4 4" />
        <text x="120" y="438" fill="#7a8a9e" fontSize="10">
          TRÄGERSEKTION 4. OBERGESCHOSS
        </text>
        <text x="840" y="438" fill="#7a8a9e" fontSize="10" textAnchor="end">
          STATISCHE ÜBERLASTUNG
        </text>
      </svg>

      {/* On-screen caption */}
      <div
        style={{
          position: 'absolute',
          bottom: 28,
          fontFamily: "'Segoe UI', Arial, sans-serif",
          fontSize: 28,
          fontWeight: 700,
          color: '#e9f2f6',
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          textShadow: '0 2px 8px rgba(0,0,0,0.8)',
        }}
      >
        {p.title || 'VERDOPPLUNG DER TRÄGERBELASTUNG'}
      </div>
    </AbsoluteFill>
  );
};