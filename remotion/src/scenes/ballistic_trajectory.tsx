import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const BallisticTrajectoryScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const EO = {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  } as const;

  const push = interpolate(frame, [0, span], [1.0, 1.04], EO);
  const groundBase = interpolate(frame, [0, span * 0.16], [0, 1], EO);
  const gridAlpha = interpolate(frame, [span * 0.05, span * 0.2], [0, 0.35], EO);

  // Parabolic flight progression (linear for physics travel, settled by 0.54)
  const flightT = interpolate(frame, [span * 0.2, span * 0.54], [0, 1], EO);
  const distCount = interpolate(frame, [span * 0.2, span * 0.54], [0, 640], EO);

  // Trajectory arc length and dash
  const ARC_LEN = 435;
  const arcOffset = ARC_LEN * (1 - flightT);

  // Coordinates along parabola: P0(80, 205), Ppeak(260, 65), Pland(440, 205)
  const fragX = 80 + 360 * flightT;
  const fragY = 205 - 560 * flightT * (1 - flightT);

  // Landing impact spring
  const landImpact = spring({
    frame: frame - Math.round(span * 0.54),
    fps,
    config: { damping: 11, stiffness: 190, mass: 0.6 },
  });

  // Callout timing: marker -> leader -> plate -> text
  const calloutLine = interpolate(frame, [span * 0.32, span * 0.46], [0, 1], EO);
  const titleRise = interpolate(frame, [span * 0.15, span * 0.35], [14, 0], EO);

  const LEAD_LEN = Math.hypot(55, -35);

  const waterTicks = [160, 200, 240, 280, 320];
  const heightRungs = [0.25, 0.5, 0.75];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="68%" viewBox="0 0 520 280">
        <g transform={`translate(260 140) scale(${push}) translate(-260 -140)`}>
          {/* Grid lines behind data */}
          {heightRungs.map((k) => (
            <line
              key={k}
              x1={60}
              y1={205 - 130 * k}
              x2={460}
              y2={205 - 130 * k}
              stroke="#8a949b"
              strokeWidth={0.8}
              strokeDasharray="4 4"
              opacity={gridAlpha}
            />
          ))}

          {/* Plant structure base (West shore) */}
          <rect x={60} y={170} width={28} height={35} fill="#3d4952" stroke="#8a949b" strokeWidth={1} />
          <line x1={74} y1={148} x2={74} y2={170} stroke="#8a949b" strokeWidth={1.5} />
          <text x={74} y={142} fill="#8a949b" fontSize={7.5} textAnchor="middle" letterSpacing="0.06em">
            ANLAGE
          </text>

          {/* Schuylkill River water basin */}
          <rect x={140} y={205} width={210} height={12} fill="#202c39" opacity={0.6} />
          {waterTicks.map((wx, i) => (
            <line
              key={wx}
              x1={wx}
              y1={209}
              x2={wx + 22}
              y2={209}
              stroke="#5d6a73"
              strokeWidth={1}
              strokeDasharray="3 3"
              opacity={gridAlpha * (1 - i * 0.05)}
            />
          ))}
          <text x={245} y={214} fill="#8a949b" fontSize={8} textAnchor="middle" letterSpacing="0.1em">
            SCHUYLKILL RIVER
          </text>

          {/* Ground baseline */}
          <line
            x1={50}
            y1={205}
            x2={470}
            y2={205}
            stroke="#e9f2f6"
            strokeWidth={1.8}
            transform={`translate(50 0) scale(${groundBase} 1) translate(-50 0)`}
          />
          <text x={440} y={222} fill="#8a949b" fontSize={7.5} textAnchor="middle">
            OSTUFER
          </text>

          {/* Flight trajectory arc */}
          <path
            d="M 80 205 Q 260 65 440 205"
            fill="none"
            stroke="#e0b44c"
            strokeWidth={2}
            strokeDasharray={ARC_LEN}
            strokeDashoffset={arcOffset}
          />

          {/* Dimension line 640m */}
          <line x1={80} y1={236} x2={440} y2={236} stroke="#8a949b" strokeWidth={1} />
          <line x1={80} y1={231} x2={80} y2={241} stroke="#8a949b" strokeWidth={1} />
          <line x1={440} y1={231} x2={440} y2={241} stroke="#8a949b" strokeWidth={1} />
          <rect x={220} y={227} width={80} height={17} rx={3} fill="#0d1117" stroke="#3d4952" strokeWidth={0.8} />
          <text x={260} y={239} fill="#e9f2f6" fontSize={9.5} textAnchor="middle" fontWeight="bold">
            {Math.round(distCount)} m
          </text>

          {/* Flying fragment with truck silhouette inside */}
          <g transform={`translate(${fragX} ${fragY})`}>
            {/* Outer steel fragment hull */}
            <polygon
              points="-18,-9 -4,-15 17,-8 19,8 3,14 -16,10"
              fill="#1b242c"
              stroke="#e0b44c"
              strokeWidth={1.4}
            />
            {/* Embedded truck silhouette representing 15t mass */}
            <g fill="#e9f2f6" opacity={0.85} transform="scale(0.68) translate(-10 -8)">
              {/* Truck cab */}
              <path d="M 14 3 L 20 7 L 20 13 L 14 13 Z" />
              {/* Truck trailer/load */}
              <rect x="0" y="2" width="13" height="11" rx="0.5" />
              {/* Wheels */}
              <circle cx="4" cy="14" r="2" fill="#e0b44c" />
              <circle cx="10" cy="14" r="2" fill="#e0b44c" />
              <circle cx="17" cy="14" r="2" fill="#e0b44c" />
            </g>
          </g>

          {/* Callout leader on fragment mass */}
          <g transform={`translate(${fragX} ${fragY})`}>
            <circle cx={0} cy={0} r={2.5} fill="#e0b44c" />
            <path
              d="M 0 0 L 45 -28 L 85 -28"
              fill="none"
              stroke="#e0b44c"
              strokeWidth={1}
              strokeDasharray={LEAD_LEN + 40}
              strokeDashoffset={(LEAD_LEN + 40) * (1 - calloutLine)}
            />
            <g opacity={calloutLine}>
              <rect x={88} y={-38} width={88} height={19} rx={3} fill="#16202b" stroke="#3d4952" strokeWidth={0.8} />
              <text x={94} y={-26} fill="#e0b44c" fontSize={8} fontWeight="bold">
                FRAGMENT 15 t
              </text>
              <text x={94} y={-21} fill="#8a949b" fontSize={5.5}>
                LKW-ÄQUIVALENT
              </text>
            </g>
          </g>

          {/* Impact burst accent landing last */}
          <g transform={`translate(440 205) scale(${landImpact}) translate(-440 -205)`} opacity={landImpact}>
            <path d="M 432 205 L 424 196 M 440 201 L 440 188 M 448 205 L 456 195" stroke="#d0523f" strokeWidth={1.8} />
            <circle cx={440} cy={205} r={4.5} fill="none" stroke="#d0523f" strokeWidth={1.2} />
          </g>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            marginTop: 18,
            transform: `translateY(${titleRise}px)`,
            fontFamily: "'Segoe UI', Arial, sans-serif",
            fontSize: 28,
            letterSpacing: '0.08em',
            color: '#e9f2f6',
            fontWeight: 600,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};