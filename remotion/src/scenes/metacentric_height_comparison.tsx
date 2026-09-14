import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const MetacentricHeightComparisonScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const drawHull = interpolate(frame, [0, span * 0.25], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const drawCalcGM = interpolate(frame, [span * 0.2, span * 0.55], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const drawRealGM = interpolate(frame, [span * 0.45, span * 0.8], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const drawDeficit = interpolate(frame, [span * 0.65, span * 0.95], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ticks = [
    { label: '0.00 m (K)', y: 480 },
    { label: '1.00 m', y: 380 },
    { label: '2.00 m', y: 280 },
    { label: '3.00 m', y: 180 },
    { label: '4.00 m', y: 80 },
  ];

  const captionText = p.title || 'METAZENTRISCHE HÖHE (GM)';

  return (
    <AbsoluteFill
      style={{
        opacity,
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: "'Segoe UI', Arial, sans-serif",
      }}
    >
      <svg width="80%" viewBox="0 0 1000 580">
        <defs>
          <linearGradient id="deficitGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d0523f" stopOpacity={0.8} />
            <stop offset="100%" stopColor="#e0b44c" stopOpacity={0.8} />
          </linearGradient>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="5"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#e9f2f6" />
          </marker>
          <marker
            id="arrowDeficit"
            viewBox="0 0 10 10"
            refX="5"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#d0523f" />
          </marker>
        </defs>

        {/* Background Grid Ticks */}
        {ticks.map((t) => (
          <g key={t.label} opacity={drawHull * 0.5}>
            <line
              x1={120}
              y1={t.y}
              x2={880}
              y2={t.y}
              stroke="#5d6a73"
              strokeWidth={0.8}
              strokeDasharray="4 4"
            />
            <text x={105} y={t.y + 4} fill="#8a949b" fontSize={11} textAnchor="end">
              {t.label}
            </text>
          </g>
        ))}

        {/* Vessel Hull Cross-Section Outline */}
        <g opacity={drawHull}>
          <path
            d="M 220 200 L 250 440 Q 500 500 750 440 L 780 200"
            fill="none"
            stroke="#8a949b"
            strokeWidth={1.5}
          />
          {/* Waterline */}
          <line
            x1={180}
            y1={260}
            x2={820}
            y2={260}
            stroke="#5b7f9c"
            strokeWidth={1.5}
            strokeDasharray="8 4"
          />
          <text x={830} y={264} fill="#5b7f9c" fontSize={12}>
            WL
          </text>

          {/* Center Line Axis */}
          <line
            x1={500}
            y1={60}
            x2={500}
            y2={500}
            stroke="#e9f2f6"
            strokeWidth={1}
            strokeDasharray="6 3"
            opacity={0.4}
          />

          {/* Keel Baseline K */}
          <circle cx={500} cy={480} r={4} fill="#e9f2f6" />
          <text x={515} y={484} fill="#e9f2f6" fontSize={12} fontWeight="bold">
            K (Kiel)
          </text>

          {/* Center of Buoyancy B */}
          <circle cx={500} cy={410} r={5} fill="#5b7f9c" />
          <text x={515} y={414} fill="#5b7f9c" fontSize={12} fontWeight="bold">
            B (FormSchwerpunkt)
          </text>

          {/* Center of Gravity G */}
          <circle cx={500} cy={310} r={6} fill="#e9f2f6" />
          <text x={515} y={314} fill="#e9f2f6" fontSize={13} fontWeight="bold">
            G (Schwerpunkt)
          </text>
        </g>

        {/* Calculated GM Dimension (Left / Cyan-Offwhite) */}
        <g opacity={drawCalcGM}>
          {/* Reference Line from G to M_calc */}
          <line x1={310} y1={310} x2={490} y2={310} stroke="#e9f2f6" strokeWidth={0.8} strokeDasharray="2 2" />
          <line x1={310} y1={121} x2={490} y2={121} stroke="#e0b44c" strokeWidth={0.8} strokeDasharray="2 2" />

          {/* Dimension Line G -> M_calc */}
          <line
            x1={340}
            y1={310}
            x2={340}
            y2={310 - 189 * drawCalcGM}
            stroke="#e0b44c"
            strokeWidth={2}
            markerStart="url(#arrow)"
            markerEnd="url(#arrow)"
          />

          {/* Point M_calc */}
          <circle cx={500} cy={121} r={6} fill="#e0b44c" />
          <text x={515} y={115} fill="#e0b44c" fontSize={12} fontWeight="bold">
            M (GALS-Berechnung: 1,89 m)
          </text>

          {/* Dimension Text Card */}
          <rect x={210} y={190} width={120} height={42} fill="#1a232a" rx={4} stroke="#e0b44c" strokeWidth={1} />
          <text x={270} y={208} fill="#e0b44c" fontSize={10} textAnchor="middle">
            BERECHNET (GALS)
          </text>
          <text x={270} y={224} fill="#e9f2f6" fontSize={14} fontWeight="bold" textAnchor="middle">
            GM = 1.89 m
          </text>
        </g>

        {/* Real GM Dimension (Right / Amber) */}
        <g opacity={drawRealGM}>
          {/* Reference Line from G to M_real */}
          <line x1={510} y1={190} x2={690} y2={190} stroke="#d0523f" strokeWidth={0.8} strokeDasharray="2 2" />

          {/* Dimension Line G -> M_real */}
          <line
            x1={660}
            y1={310}
            x2={660}
            y2={310 - 120 * drawRealGM}
            stroke="#e9f2f6"
            strokeWidth={2}
            markerStart="url(#arrow)"
            markerEnd="url(#arrow)"
          />

          {/* Point M_real */}
          <circle cx={500} cy={190} r={6} fill="#d0523f" />
          <text x={515} y={194} fill="#d0523f" fontSize={12} fontWeight="bold">
            M (Reale Stabilität: 1,20 m)
          </text>

          {/* Dimension Text Card */}
          <rect x={675} y={230} width={120} height={42} fill="#1a232a" rx={4} stroke="#d0523f" strokeWidth={1} />
          <text x={735} y={248} fill="#d0523f" fontSize={10} textAnchor="middle">
            REALE STABILITÄT
          </text>
          <text x={735} y={264} fill="#e9f2f6" fontSize={14} fontWeight="bold" textAnchor="middle">
            GM = 1.20 m
          </text>
        </g>

        {/* Deficit Highlight (Gap between M_calc and M_real) */}
        <g opacity={drawDeficit}>
          {/* Filled Deficit Zone */}
          <rect
            x={485}
            y={121}
            width={30}
            height={69 * drawDeficit}
            fill="url(#deficitGrad)"
            rx={2}
          />

          {/* Deficit Dimension Line */}
          <line
            x1={420}
            y1={121}
            x2={420}
            y2={121 + 69 * drawDeficit}
            stroke="#d0523f"
            strokeWidth={2.5}
            markerStart="url(#arrowDeficit)"
            markerEnd="url(#arrowDeficit)"
          />
          <line x1={340} y1={121} x2={430} y2={121} stroke="#d0523f" strokeWidth={0.8} strokeDasharray="2 2" />
          <line x1={500} y1={190} x2={430} y2={190} stroke="#d0523f" strokeWidth={0.8} strokeDasharray="2 2" />

          {/* Deficit Callout Box */}
          <rect x={325} y={138} width={90} height={32} fill="#d0523f" rx={3} />
          <text x={370} y={152} fill="#ffffff" fontSize={9} fontWeight="bold" textAnchor="middle">
            DEFIZIT
          </text>
          <text x={370} y={164} fill="#ffffff" fontSize={12} fontWeight="bold" textAnchor="middle">
            - 0.69 m
          </text>
        </g>
      </svg>

      {/* Caption Banner */}
      <div
        style={{
          marginTop: 16,
          padding: '8px 24px',
          backgroundColor: 'rgba(26, 35, 42, 0.85)',
          border: '1px solid #5d6a73',
          borderRadius: 4,
          fontSize: 22,
          fontWeight: 600,
          color: '#e9f2f6',
          letterSpacing: '0.08em',
        }}
      >
        {captionText}
      </div>
    </AbsoluteFill>
  );
};