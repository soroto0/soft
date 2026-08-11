import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const GroutCurtainContinuityScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const curtainProgress = interpolate(frame, [0, span * 0.45], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const gapAlert = interpolate(frame, [span * 0.35, span * 0.75], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const seepage = interpolate(frame, [0, span], [0, 120], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleRise = interpolate(frame, [0, span * 0.3], [12, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const boreholes = [
    { id: 'BH-01', x: 180, height: 260, status: 'ok', pressure: '3.8 MPa' },
    { id: 'BH-02', x: 250, height: 270, status: 'ok', pressure: '3.5 MPa' },
    { id: 'BH-03', x: 320, height: 110, status: 'gap', pressure: '0.2 MPa' },
    { id: 'BH-04', x: 390, height: 90, status: 'gap', pressure: '0.1 MPa' },
    { id: 'BH-05', x: 460, height: 280, status: 'ok', pressure: '3.6 MPa' },
    { id: 'BH-06', x: 530, height: 100, status: 'gap', pressure: '0.3 MPa' },
    { id: 'BH-07', x: 600, height: 275, status: 'ok', pressure: '3.4 MPa' },
    { id: 'BH-08', x: 670, height: 260, status: 'ok', pressure: '3.7 MPa' },
  ];

  const gaps = [
    { x: 295, y: 260, w: 120, h: 150, label: 'CRITICAL GAP: 12.5m UNTREATED' },
    { x: 505, y: 250, w: 55, h: 160, label: 'GAP: 6.0m' },
  ];

  const depthTicks = [
    { y: 150, label: '0m (CURTAIN CAP)' },
    { y: 230, label: '-15m' },
    { y: 310, label: '-30m' },
    { y: 390, label: '-45m (BEDROCK BASE)' },
  ];

  const fractures = [
    { x1: 290, y1: 210, x2: 340, y2: 250 },
    { x1: 330, y1: 230, x2: 410, y2: 220 },
    { x1: 310, y1: 270, x2: 380, y2: 310 },
    { x1: 510, y1: 220, x2: 550, y2: 270 },
    { x1: 520, y1: 290, x2: 560, y2: 330 },
  ];

  const leakPaths = [
    'M 120 270 Q 280 260 350 290 T 750 300',
    'M 120 330 Q 300 340 380 340 T 750 350',
    'M 120 280 Q 500 270 530 310 T 750 320',
  ];

  const displayTitle = p.title || 'BARRIER DISCONTINUITY';

  return (
    <AbsoluteFill
      style={{
        opacity,
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: "'SF Pro Display', -apple-system, 'Segoe UI', sans-serif",
      }}
    >
      <svg width="84%" height="76%" viewBox="0 0 900 520">
        <defs>
          <pattern id="hatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="8" stroke="#d0523f" strokeWidth="2.5" opacity="0.6" />
          </pattern>
          <linearGradient id="damGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4a5a68" />
            <stop offset="100%" stopColor="#2c3842" />
          </linearGradient>
          <linearGradient id="rockGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1e262e" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#12171c" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        {/* Shattered Rock Bedrock Background */}
        <rect x="110" y="150" width="670" height="260" fill="url(#rockGrad)" stroke="#3a4854" strokeWidth="1" />

        {/* Shattered Fracture Lines */}
        {fractures.map((f, i) => (
          <line
            key={i}
            x1={f.x1}
            y1={f.y1}
            x2={f.x2}
            y2={f.y2}
            stroke="#e0b44c"
            strokeWidth="1.2"
            strokeDasharray="3 3"
            opacity={0.7}
          />
        ))}

        {/* Planned Dam Core Structure */}
        <polygon points="220,40 630,40 710,150 140,150" fill="url(#damGrad)" stroke="#e9f2f6" strokeWidth="1.5" />
        <text x="425" y="85" fill="#e9f2f6" fontSize="13" fontWeight="600" letterSpacing="1.5" textAnchor="middle">
          PLANNED DAM CORE EMBANKMENT
        </text>
        <line x1="140" y1="150" x2="710" y2="150" stroke="#e0b44c" strokeWidth="2" />

        {/* Untreated Gap Failure Zones */}
        {gaps.map((g, idx) => (
          <g key={idx} opacity={gapAlert}>
            <rect x={g.x} y={g.y} width={g.w} height={g.h} fill="url(#hatch)" stroke="#d0523f" strokeWidth="1.5" />
            <rect x={g.x} y={g.y} width={g.w} height={g.h} fill="#d0523f" opacity="0.15" />
            <line x1={g.x} y1={150} x2={g.x + g.w} y2={150} stroke="#d0523f" strokeWidth="3" />
          </g>
        ))}

        {/* Vertical Boreholes & Cement Grout Columns */}
        {boreholes.map((b) => {
          const currentH = b.height * curtainProgress;
          const isGap = b.status === 'gap';
          const fillCol = isGap ? '#d0523f' : '#8a9ea8';

          return (
            <g key={b.id}>
              {/* Drill Guide Centerline */}
              <line x1={b.x} y1={150} x2={b.x} y2={410} stroke="#3a4854" strokeWidth="1" strokeDasharray="2 2" />

              {/* Grout Injection Column */}
              <rect
                x={b.x - (isGap ? 6 : 14)}
                y={150}
                width={isGap ? 12 : 28}
                height={currentH}
                fill={fillCol}
                opacity={isGap ? 0.4 : 0.75}
                rx={isGap ? 0 : 4}
              />

              {/* Grout Overlap Circles */}
              {!isGap && curtainProgress > 0.5 && (
                <ellipse
                  cx={b.x}
                  cy={150 + currentH * 0.6}
                  rx="18"
                  ry="25"
                  fill="#8a9ea8"
                  opacity={0.3 * curtainProgress}
                />
              )}

              {/* Borehole Label & Slurry Pressure */}
              <text x={b.x} y={138} fill="#e9f2f6" fontSize="9" textAnchor="middle" opacity={0.8}>
                {b.id}
              </text>
              <text
                x={b.x}
                y={158 + currentH}
                fill={isGap ? '#d0523f' : '#e9f2f6'}
                fontSize="9"
                fontWeight={isGap ? '700' : '400'}
                textAnchor="middle"
                opacity={curtainProgress > 0.8 ? 1 : 0}
              >
                {b.pressure}
              </text>
            </g>
          );
        })}

        {/* Water Flow / Seepage Lines through untreated gaps */}
        {leakPaths.map((path, i) => (
          <path
            key={i}
            d={path}
            fill="none"
            stroke="#d0523f"
            strokeWidth="2"
            strokeDasharray="8 6"
            strokeDashoffset={-seepage}
            opacity={0.85 * gapAlert}
          />
        ))}

        {/* Depth Axis Markers */}
        <line x1="90" y1="150" x2="90" y2="410" stroke="#e9f2f6" strokeWidth="1" />
        {depthTicks.map((t, idx) => (
          <g key={idx}>
            <line x1="85" y1={t.y} x2="95" y2={t.y} stroke="#e9f2f6" strokeWidth="1" />
            <text x="78" y={t.y + 3} fill="#e9f2f6" fontSize="9" textAnchor="end" opacity={0.75}>
              {t.label}
            </text>
          </g>
        ))}

        {/* Failure Callout Banner */}
        <g opacity={gapAlert} transform={`translate(0, ${interpolate(gapAlert, [0, 1], [10, 0])})`}>
          <rect x="260" y="428" width="380" height="32" fill="#1c0f11" stroke="#d0523f" strokeWidth="1.5" rx="4" />
          <text x="450" y="449" fill="#d0523f" fontSize="11" fontWeight="700" letterSpacing="1" textAnchor="middle">
            NO SLURRY PRESSURE REGISTERED — UNTREATED GAPS
          </text>
        </g>

        {/* Legend */}
        <g transform="translate(110, 480)">
          <rect x="0" y="0" width="12" height="12" fill="#8a9ea8" rx="2" />
          <text x="18" y="10" fill="#e9f2f6" fontSize="10">Grout Column (Intact)</text>

          <rect x="180" y="0" width="12" height="12" fill="url(#hatch)" stroke="#d0523f" strokeWidth="1" />
          <text x="198" y="10" fill="#e9f2f6" fontSize="10">Shattered Gap (Failed Injection)</text>

          <line x1="410" y1="6" x2="430" y2="6" stroke="#d0523f" strokeWidth="2" strokeDasharray="4 3" />
          <text x="436" y="10" fill="#e9f2f6" fontSize="10">Subsurface Seepage Path</text>
        </g>
      </svg>

      {/* Caption Banner */}
      <div
        style={{
          marginTop: 16,
          transform: `translateY(${titleRise}px)`,
          fontFamily: "'SF Pro Display', -apple-system, 'Segoe UI', sans-serif",
          fontSize: 30,
          fontWeight: 700,
          letterSpacing: 2,
          color: '#e9f2f6',
          textShadow: '0 2px 8px rgba(0,0,0,0.6)',
        }}
      >
        {displayTitle}
      </div>
    </AbsoluteFill>
  );
};