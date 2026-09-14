import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ProgressiveCollapseMechanicsScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const colFail = interpolate(frame, [span * 0.15, span * 0.38], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const loadTransfer = interpolate(frame, [span * 0.32, span * 0.65], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const overloadFlash = interpolate(frame, [span * 0.6, span * 0.95], [0, 1], {
    easing: Easing.inOut(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleRise = interpolate(frame, [0, span * 0.25], [16, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const groundY = 350;
  const roofY = 190;
  const colWidth = 24;

  const columns = [
    { id: 0, x: 170, label: 'STÜTZE 1', baseLoad: 100, role: 'outer' },
    { id: 1, x: 310, label: 'STÜTZE 2', baseLoad: 100, role: 'neighbor' },
    { id: 2, x: 450, label: 'ZENTRAL 3', baseLoad: 100, role: 'center' },
    { id: 3, x: 590, label: 'STÜTZE 4', baseLoad: 100, role: 'neighbor' },
    { id: 4, x: 730, label: 'STÜTZE 5', baseLoad: 100, role: 'outer' },
  ];

  const sagOffset = colFail * 24;
  const neighborLoadMultiplier = 1 + loadTransfer * 1.65;
  const centerLoadMultiplier = Math.max(0, 1 - colFail * 1.1);

  const beamPath = `M 150 ${roofY} L 310 ${roofY + sagOffset * 0.35} Q 450 ${roofY + sagOffset} 590 ${roofY + sagOffset * 0.35} L 750 ${roofY}`;

  return (
    <AbsoluteFill
      style={{
        opacity,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <svg width="86%" height="86%" viewBox="0 0 900 520">
        <defs>
          <linearGradient id="gradRed" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d0523f" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#e0b44c" stopOpacity={0.4} />
          </linearGradient>
          <linearGradient id="gradAmber" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e0b44c" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#e0b44c" stopOpacity={0.2} />
          </linearGradient>
          <pattern id="gridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="20" y2="0" stroke="#e9f2f6" strokeWidth={0.3} opacity={0.15} />
            <line x1="0" y1="0" x2="0" y2="20" stroke="#e9f2f6" strokeWidth={0.3} opacity={0.15} />
          </pattern>
        </defs>

        {/* Structural Grid Background in bounds */}
        <rect x="130" y="60" width="640" height="360" fill="url(#gridPattern)" />

        {/* Axis & Reference Grid Lines */}
        <line x1="130" y1={groundY} x2="770" y2={groundY} stroke="#e9f2f6" strokeWidth={2.5} />
        <line x1="130" y1={groundY + 12} x2="770" y2={groundY + 12} stroke="#e9f2f6" strokeWidth={0.8} opacity={0.4} />

        {/* Foundation Footings */}
        {columns.map((c) => (
          <g key={`footing-${c.id}`}>
            <rect
              x={c.x - 22}
              y={groundY}
              width={44}
              height={12}
              fill="#5b7f9c"
              opacity={0.35}
              stroke="#e9f2f6"
              strokeWidth={0.8}
            />
            <line x1={c.x - 28} y1={groundY + 12} x2={c.x + 28} y2={groundY + 12} stroke="#e9f2f6" strokeWidth={1.5} opacity={0.6} />
            {[-18, -9, 0, 9, 18].map((dx, idx) => (
              <line
                key={`hatch-${idx}`}
                x1={c.x + dx}
                y1={groundY + 12}
                x2={c.x + dx - 6}
                y2={groundY + 22}
                stroke="#e9f2f6"
                strokeWidth={0.8}
                opacity={0.3}
              />
            ))}
          </g>
        ))}

        {/* Load Redistribution Vectors (Curved transfer arrows from center to neighbors) */}
        <g opacity={loadTransfer}>
          <path
            d="M 430 150 C 390 120, 340 120, 310 135"
            fill="none"
            stroke="#e0b44c"
            strokeWidth={2}
            strokeDasharray="5 3"
          />
          <polygon points="310,135 320,126 322,138" fill="#e0b44c" />
          <path
            d="M 470 150 C 510 120, 560 120, 590 135"
            fill="none"
            stroke="#e0b44c"
            strokeWidth={2}
            strokeDasharray="5 3"
          />
          <polygon points="590,135 578,138 580,126" fill="#e0b44c" />
          <text x="450" y="115" fill="#e0b44c" fontSize="11" textAnchor="middle" letterSpacing="1">
            LASTUMLAGERUNG (ΔF +165%)
          </text>
        </g>

        {/* Secondary Bracing Truss */}
        {[0, 1, 2, 3].map((bayIdx) => {
          const x1 = columns[bayIdx].x;
          const x2 = columns[bayIdx + 1].x;
          const y1 = bayIdx === 1 ? roofY + sagOffset * 0.35 : bayIdx === 2 ? roofY + sagOffset : roofY;
          const y2 = bayIdx === 0 ? roofY : bayIdx === 1 ? roofY + sagOffset : roofY + sagOffset * 0.35;
          return (
            <g key={`truss-${bayIdx}`} opacity={0.25}>
              <line x1={x1} y1={groundY} x2={x2} y2={y2} stroke="#e9f2f6" strokeWidth={0.8} strokeDasharray="3 3" />
              <line x1={x1} y1={y1} x2={x2} y2={groundY} stroke="#e9f2f6" strokeWidth={0.8} strokeDasharray="3 3" />
            </g>
          );
        })}

        {/* Columns & Load Arrows */}
        {columns.map((c) => {
          const isCenter = c.role === 'center';
          const isNeighbor = c.role === 'neighbor';

          const currentMultiplier = isCenter
            ? centerLoadMultiplier
            : isNeighbor
            ? neighborLoadMultiplier
            : 1.0;

          const currentLoadValue = Math.round(c.baseLoad * currentMultiplier);
          const arrowLen = 35 * currentMultiplier;
          const arrowWidth = isNeighbor ? 3 + loadTransfer * 3 : 3;

          const cRoofY = isCenter
            ? roofY + sagOffset
            : isNeighbor
            ? roofY + sagOffset * 0.35
            : roofY;

          const actualColHeight = groundY - cRoofY;

          return (
            <g key={`col-group-${c.id}`}>
              {/* Column Core */}
              <rect
                x={c.x - colWidth / 2}
                y={cRoofY}
                width={colWidth}
                height={actualColHeight}
                fill="#2c3842"
                stroke="#e9f2f6"
                strokeWidth={1}
              />

              {/* Central Column Failure Fill & Buckling Graphic */}
              {isCenter && (
                <g opacity={colFail}>
                  <rect
                    x={c.x - colWidth / 2}
                    y={cRoofY}
                    width={colWidth}
                    height={actualColHeight}
                    fill="url(#gradAmber)"
                  />
                  {/* Buckling Crack Lines */}
                  <path
                    d={`M ${c.x - colWidth / 2} ${cRoofY + actualColHeight * 0.4} L ${c.x + 4} ${cRoofY + actualColHeight * 0.5} L ${c.x - 2} ${cRoofY + actualColHeight * 0.58} L ${c.x + colWidth / 2} ${cRoofY + actualColHeight * 0.65}`}
                    fill="none"
                    stroke="#d0523f"
                    strokeWidth={2}
                  />
                  <line
                    x1={c.x - 14}
                    y1={cRoofY + actualColHeight * 0.5}
                    x2={c.x + 14}
                    y2={cRoofY + actualColHeight * 0.5}
                    stroke="#d0523f"
                    strokeWidth={1.5}
                    strokeDasharray="2 2"
                  />
                </g>
              )}

              {/* Neighbor Columns Overload Warning Overlays */}
              {isNeighbor && (
                <g opacity={loadTransfer}>
                  <rect
                    x={c.x - colWidth / 2}
                    y={cRoofY}
                    width={colWidth}
                    height={actualColHeight}
                    fill="url(#gradRed)"
                    opacity={0.3 + overloadFlash * 0.5}
                  />
                  {/* Stress concentration marks */}
                  <line x1={c.x - 16} y1={cRoofY + 10} x2={c.x + 16} y2={cRoofY + 10} stroke="#d0523f" strokeWidth={2} />
                  <line x1={c.x - 16} y1={cRoofY + 20} x2={c.x + 16} y2={cRoofY + 20} stroke="#e0b44c" strokeWidth={1.5} strokeDasharray="3 2" />
                </g>
              )}

              {/* Load Force Vector Arrow Above Column */}
              {currentMultiplier > 0.05 && (
                <g>
                  {/* Arrow Shaft */}
                  <line
                    x1={c.x}
                    y1={cRoofY - 12 - arrowLen}
                    x2={c.x}
                    y2={cRoofY - 12}
                    stroke={isNeighbor && loadTransfer > 0.3 ? '#d0523f' : isCenter && colFail > 0 ? '#e0b44c' : '#e9f2f6'}
                    strokeWidth={arrowWidth}
                  />
                  {/* Arrowhead */}
                  <polygon
                    points={`${c.x},${cRoofY - 8} ${c.x - 6 - (isNeighbor ? loadTransfer * 3 : 0)},${cRoofY - 18} ${c.x + 6 + (isNeighbor ? loadTransfer * 3 : 0)},${cRoofY - 18}`}
                    fill={isNeighbor && loadTransfer > 0.3 ? '#d0523f' : isCenter && colFail > 0 ? '#e0b44c' : '#e9f2f6'}
                  />
                  {/* Load Text */}
                  <text
                    x={c.x}
                    y={cRoofY - 18 - arrowLen}
                    fill={isNeighbor && loadTransfer > 0.3 ? '#d0523f' : isCenter && colFail > 0 ? '#e0b44c' : '#e9f2f6'}
                    fontSize="11"
                    fontFamily="monospace"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {`${currentLoadValue} kN`}
                  </text>
                </g>
              )}

              {/* Status / Label Below Column */}
              <text x={c.x} y={groundY + 38} fill="#8a9ba8" fontSize="10" fontFamily="sans-serif" textAnchor="middle">
                {c.label}
              </text>
              <text
                x={c.x}
                y={groundY + 52}
                fill={
                  isCenter && colFail > 0.5
                    ? '#d0523f'
                    : isNeighbor && overloadFlash > 0.4
                    ? '#e0b44c'
                    : '#8a9ba8'
                }
                fontSize="9"
                fontFamily="sans-serif"
                fontWeight="bold"
                textAnchor="middle"
              >
                {isCenter
                  ? colFail > 0.5
                    ? 'VERSAGT [0 kN]'
                    : 'INTAKT'
                  : isNeighbor
                  ? loadTransfer > 0.5
                    ? 'ÜBERLAST (265%)'
                    : '100% LAST'
                  : '100% LAST'}
              </text>
            </g>
          );
        })}

        {/* Deformed Upper Beam / Floor Slab */}
        <path
          d={beamPath}
          fill="none"
          stroke="#e9f2f6"
          strokeWidth={6}
          strokeLinecap="round"
        />
        <path
          d={beamPath}
          fill="none"
          stroke={colFail > 0.2 ? '#e0b44c' : '#5b7f9c'}
          strokeWidth={2}
          strokeDasharray="6 3"
        />

        {/* Legend / Diagnostic Readout Panel */}
        <g transform="translate(140, 75)">
          <rect x="0" y="0" width="180" height="68" fill="#152028" stroke="#e9f2f6" strokeWidth={0.8} opacity={0.85} />
          <text x="12" y="18" fill="#e9f2f6" fontSize="10" fontWeight="bold" letterSpacing="0.5">
            STATUS: SPANNUNGSVERTEILUNG
          </text>
          <line x1="12" y1="24" x2="168" y2="24" stroke="#e9f2f6" strokeWidth={0.5} opacity={0.3} />
          <circle cx="20" cy="38" r="4" fill={colFail > 0.5 ? '#d0523f' : '#e0b44c'} />
          <text x="32" y="41" fill="#e9f2f6" fontSize="9">
            {colFail > 0.5 ? 'Tragelement 3 gebrochen' : 'Primärstütze intakt'}
          </text>
          <circle cx="20" cy="54" r="4" fill={overloadFlash > 0.3 ? '#d0523f' : '#5b7f9c'} />
          <text x="32" y="57" fill="#e9f2f6" fontSize="9">
            {overloadFlash > 0.3 ? 'Kritische Überlast Stützen 2 & 4' : 'Lastverteilung stabil'}
          </text>
        </g>
      </svg>

      {/* Screen Title */}
      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '7%',
            transform: `translateY(${titleRise}px)`,
            fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
            fontSize: 26,
            fontWeight: 600,
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            color: '#e9f2f6',
            backgroundColor: 'rgba(15, 23, 30, 0.75)',
            padding: '8px 24px',
            borderLeft: '4px solid #e0b44c',
            borderRight: '1px solid rgba(233, 242, 246, 0.2)',
            borderTop: '1px solid rgba(233, 242, 246, 0.2)',
            borderBottom: '1px solid rgba(233, 242, 246, 0.2)',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
