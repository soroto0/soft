import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const CosmicBoundaryScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const scaleIn = interpolate(frame, [0, span * 0.45], [0.75, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const atmosphereFade = interpolate(frame, [span * 0.2, span * 0.85], [1, 0.25], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const boundaryPulse = interpolate(frame, [0, span], [0, 80], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelAlpha = interpolate(frame, [span * 0.3, span * 0.65], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { r: 45, label: 'TIERRA', opacity: 0.9 },
    { r: 85, label: 'TROPOSFERA / ESTRATOSFERA', opacity: 0.6 },
    { r: 130, label: 'LÍMITE DE KÁRMÁN', opacity: 0.4 },
    { r: 195, label: 'EXOSFERA', opacity: 0.2 },
    { r: 270, label: 'VACÍO ABSOLUTO', opacity: 0.05 },
  ];

  const ticks = [
    { x: 445, val: '0 km' },
    { x: 485, val: '50 km' },
    { x: 530, val: '100 km' },
    { x: 595, val: '1,000 km' },
    { x: 670, val: 'VACÍO' },
  ];

  return (
    <AbsoluteFill
      style={{
        opacity,
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      <svg
        width="80%"
        height="80%"
        viewBox="0 0 800 600"
        style={{ transform: `scale(${scaleIn})`, overflow: 'visible' }}
      >
        <defs>
          <radialGradient id="atmoGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#5b7f9c" stopOpacity="0.9" />
            <stop offset="20%" stopColor="#e0b44c" stopOpacity={0.7 * atmosphereFade} />
            <stop offset="45%" stopColor="#b5a895" stopOpacity={0.4 * atmosphereFade} />
            <stop offset="70%" stopColor="#b5a895" stopOpacity={0.1 * atmosphereFade} />
            <stop offset="100%" stopColor="#1e293b" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="pressureGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#e0b44c" />
            <stop offset="40%" stopColor="#b5a895" />
            <stop offset="100%" stopColor="#5b7f9c" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* Outer void space indicator grid */}
        <circle cx={400} cy={300} r={320} fill="none" stroke="#e9f2f6" strokeWidth={0.5} strokeDasharray="2 6" opacity={0.2} />
        <circle cx={400} cy={300} r={370} fill="none" stroke="#e9f2f6" strokeWidth={0.5} strokeDasharray="1 8" opacity={0.15} />

        {/* Atmospheric Glow Volume */}
        <circle cx={400} cy={300} r={280} fill="url(#atmoGlow)" />

        {/* Dynamic boundary pulse concentric rings */}
        <circle
          cx={400}
          cy={300}
          r={130}
          fill="none"
          stroke="#b5a895"
          strokeWidth={1.5}
          strokeDasharray="6 4"
          strokeDashoffset={-boundaryPulse}
          opacity={0.8}
        />
        <circle
          cx={400}
          cy={300}
          r={195}
          fill="none"
          stroke="#b5a895"
          strokeWidth={1}
          strokeDasharray="4 6"
          strokeDashoffset={boundaryPulse * 0.5}
          opacity={0.4 * atmosphereFade}
        />

        {/* Concentric distance boundary lines */}
        {layers.map((layer) => (
          <circle
            key={layer.label}
            cx={400}
            cy={300}
            r={layer.r}
            fill="none"
            stroke="#e9f2f6"
            strokeWidth={0.7}
            opacity={layer.opacity}
          />
        ))}

        {/* Earth sphere (Center) */}
        <circle cx={400} cy={300} r={45} fill="#1e293b" stroke="#e9f2f6" strokeWidth={1.5} />
        <circle cx={400} cy={300} r={41} fill="#2a3a4e" />
        <path d="M 380 280 Q 395 270 410 285 T 425 310" fill="none" stroke="#5b7f9c" strokeWidth={2} opacity={0.8} />
        <path d="M 370 305 Q 385 320 405 315" fill="none" stroke="#5b7f9c" strokeWidth={2} opacity={0.8} />

        {/* Horizontal Axis for Altitude & Pressure */}
        <line x1={400} y1={300} x2={680} y2={300} stroke="#e9f2f6" strokeWidth={1} strokeDasharray="2 2" opacity={0.6} />

        {/* Pressure drop exponential curve visualization */}
        <path
          d="M 445 230 Q 480 295 670 299"
          fill="none"
          stroke="url(#pressureGrad)"
          strokeWidth={2}
          opacity={0.85}
        />

        {/* Ticks and Axis Labels */}
        {ticks.map((t) => (
          <g key={t.val}>
            <line x1={t.x} y1={295} x2={t.x} y2={305} stroke="#e9f2f6" strokeWidth={1} opacity={0.7} />
            <text x={t.x} y={320} fill="#e9f2f6" fontSize={9} textAnchor="middle" opacity={0.8}>
              {t.val}
            </text>
          </g>
        ))}

        {/* Schematic Leader Lines & Annotations */}
        <g opacity={labelAlpha}>
          {/* Earth label */}
          <line x1={360} y1={270} x2={310} y2={230} stroke="#e9f2f6" strokeWidth={0.8} />
          <line x1={310} y1={230} x2={230} y2={230} stroke="#e9f2f6" strokeWidth={0.8} />
          <text x={225} y={226} fill="#e9f2f6" fontSize={11} textAnchor="end" fontWeight="600">
            TIERRA
          </text>
          <text x={225} y={240} fill="#8a949b" fontSize={9} textAnchor="end">
            r = 6,371 km
          </text>

          {/* Atmosphere limit label */}
          <line x1={490} y1={210} x2={530} y2={170} stroke="#e0b44c" strokeWidth={0.8} />
          <line x1={530} y1={170} x2={620} y2={170} stroke="#e0b44c" strokeWidth={0.8} />
          <text x={625} y={166} fill="#e0b44c" fontSize={11} textAnchor="start" fontWeight="600">
            LÍMITE ATMOSFÉRICO
          </text>
          <text x={625} y={180} fill="#b5a895" fontSize={9} textAnchor="start">
            Frontera con el vacío (~100 km)
          </text>

          {/* Vacuum space indicator */}
          <text x={660} y={260} fill="#d0523f" fontSize={10} textAnchor="middle" letterSpacing={1.5}>
            ESPACIO VACÍO
          </text>
          <text x={660} y={274} fill="#8a949b" fontSize={8} textAnchor="middle">
            P ≈ 0 Pa
          </text>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            color: '#e9f2f6',
            fontSize: 32,
            fontWeight: 300,
            letterSpacing: 2,
            fontFamily: "'Segoe UI', Roboto, sans-serif",
            textTransform: 'uppercase',
            opacity: labelAlpha,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};