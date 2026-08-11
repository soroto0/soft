import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const RelativeScaleScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const expand = interpolate(frame, [0, span * 0.85], [0.15, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const flicker = interpolate(frame, [0, span * 0.25, span * 0.5, span * 0.75, span], [1, 0.7, 1.15, 0.8, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const gridFade = interpolate(frame, [0, span * 0.4], [0, 0.8], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleRise = interpolate(frame, [span * 0.2, span * 0.7], [16, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const cosmicRings = [
    { r: 40, label: '10⁶ m' },
    { r: 85, label: '10¹² m' },
    { r: 130, label: '10¹⁸ m' },
    { r: 175, label: '10²⁴ m' },
    { r: 220, label: '10²⁶ m' },
  ];

  const radialAngles = [0, 45, 90, 135, 180, 225, 270, 315];

  const scaleTicks = [
    { x: 100, label: '10⁻¹⁵ m', desc: 'Subatómico', main: false },
    { x: 250, label: '10⁰ m', desc: 'RAZÓN / FÓSFORO', main: true },
    { x: 400, label: '10⁹ m', desc: 'Orbital', main: false },
    { x: 550, label: '10²¹ m', desc: 'Galáctico', main: false },
    { x: 700, label: '10²⁶ m', desc: 'Cosmológico', main: false },
  ];

  return (
    <AbsoluteFill
      style={{
        opacity,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <svg width="85%" height="80%" viewBox="0 0 800 500">
        <defs>
          <radialGradient id="matchGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#86efac" stopOpacity="0.9" />
            <stop offset="40%" stopColor="#86efac" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#86efac" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Outer Reticle Frame */}
        <rect
          x="30"
          y="30"
          width="740"
          height="440"
          fill="none"
          stroke="#5b7f9c"
          strokeWidth="0.8"
          strokeDasharray="4 4"
          opacity={gridFade}
        />

        {/* Frame Corner Accents */}
        <path d="M 40 60 L 40 40 L 60 40" fill="none" stroke="#e9f2f6" strokeWidth="1.2" opacity={gridFade} />
        <path d="M 760 60 L 760 40 L 740 40" fill="none" stroke="#e9f2f6" strokeWidth="1.2" opacity={gridFade} />
        <path d="M 40 440 L 40 460 L 60 460" fill="none" stroke="#e9f2f6" strokeWidth="1.2" opacity={gridFade} />
        <path d="M 760 440 L 760 460 L 740 460" fill="none" stroke="#e9f2f6" strokeWidth="1.2" opacity={gridFade} />

        {/* Center Target Crosshairs */}
        <line x1="400" y1="40" x2="400" y2="440" stroke="#5b7f9c" strokeWidth="0.5" opacity={gridFade * 0.4} />
        <line x1="40" y1="240" x2="760" y2="240" stroke="#5b7f9c" strokeWidth="0.5" opacity={gridFade * 0.4} />

        {/* Concentric Cosmic Scale Circles */}
        <g opacity={gridFade}>
          {cosmicRings.map((ring) => {
            const currentR = ring.r * expand;
            return (
              <g key={ring.r}>
                <circle
                  cx="400"
                  cy="240"
                  r={currentR}
                  fill="none"
                  stroke="#5b7f9c"
                  strokeWidth="0.8"
                  strokeDasharray="3 3"
                  opacity={0.6}
                />
                <text
                  x={400 + currentR * 0.707 + 4}
                  y={240 - currentR * 0.707 - 4}
                  fill="#8a949b"
                  fontSize="9"
                  fontFamily="sans-serif"
                >
                  {ring.label}
                </text>
              </g>
            );
          })}
        </g>

        {/* Radial Axis Rays */}
        <g opacity={gridFade * 0.35}>
          {radialAngles.map((angle) => {
            const rad = (angle * Math.PI) / 180;
            const x2 = 400 + Math.cos(rad) * 230 * expand;
            const y2 = 240 + Math.sin(rad) * 230 * expand;
            return (
              <line
                key={angle}
                x1="400"
                y1="240"
                x2={x2}
                y2={y2}
                stroke="#8a949b"
                strokeWidth="0.5"
              />
            );
          })}
        </g>

        {/* Logarithmic Scale Bar at Bottom */}
        <g opacity={gridFade}>
          <line x1="80" y1="410" x2="720" y2="410" stroke="#e9f2f6" strokeWidth="1" />
          {scaleTicks.map((tick) => (
            <g key={tick.x}>
              <line
                x1={tick.x}
                y1="405"
                x2={tick.x}
                y2="415"
                stroke={tick.main ? '#86efac' : '#e9f2f6'}
                strokeWidth={tick.main ? 2 : 1}
              />
              <text
                x={tick.x}
                y="428"
                fill={tick.main ? '#86efac' : '#e9f2f6'}
                fontSize="10"
                fontWeight={tick.main ? 'bold' : 'normal'}
                textAnchor="middle"
                fontFamily="sans-serif"
              >
                {tick.label}
              </text>
              <text
                x={tick.x}
                y="442"
                fill={tick.main ? '#86efac' : '#8a949b'}
                fontSize="8"
                textAnchor="middle"
                fontFamily="sans-serif"
              >
                {tick.desc}
              </text>
            </g>
          ))}
        </g>

        {/* Ratio Comparison Legend / Box */}
        <g opacity={gridFade}>
          <rect x="50" y="50" width="160" height="42" fill="#000000" fillOpacity="0.4" stroke="#5b7f9c" strokeWidth="0.6" />
          <text x="60" y="66" fill="#8a949b" fontSize="8" fontFamily="sans-serif">
            ESCALA RELATIVA DE CONOCIMIENTO
          </text>
          <text x="60" y="82" fill="#e0b44c" fontSize="11" fontWeight="bold" fontFamily="sans-serif">
            1 : 10²⁶ (INFINITO)
          </text>
        </g>

        {/* The Tiny Green Dot (La Razón Pura / Fósforo) at Center */}
        <g transform="translate(400, 240)">
          {/* Flame Glow Aura */}
          <circle
            cx="0"
            cy="0"
            r={18 * flicker}
            fill="url(#matchGlow)"
          />
          {/* Flame Inner Core Pulse */}
          <circle
            cx="0"
            cy="0"
            r={6 * flicker}
            fill="#86efac"
            opacity="0.5"
          />
          {/* Tiny Pale Green Match Flame Dot */}
          <circle
            cx="0"
            cy="0"
            r="2.5"
            fill="#86efac"
          />

          {/* Pointer Leader Line to the Dot */}
          <line x1="0" y1="0" x2="-60" y2="-60" stroke="#86efac" strokeWidth="0.8" opacity={0.8} />
          <line x1="-60" y1="-60" x2="-120" y2="-60" stroke="#86efac" strokeWidth="0.8" opacity={0.8} />
          <text x="-118" y="-66" fill="#86efac" fontSize="9" fontWeight="bold" fontFamily="sans-serif">
            FÓSFORO EN EL ABISMO
          </text>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            marginTop: 18,
            transform: `translateY(${titleRise}px)`,
            fontFamily: "'Segoe UI', Arial, sans-serif",
            fontSize: 32,
            letterSpacing: '0.08em',
            color: '#e9f2f6',
            fontWeight: 500,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};