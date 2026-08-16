import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const HydraulicWedgePropagationScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const flowProgress = interpolate(frame, [0, span * 0.45], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const crackOpen = interpolate(frame, [span * 0.25, span * 0.85], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const forceScale = interpolate(frame, [span * 0.35, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.back(1.2)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textRise = interpolate(frame, [0, span * 0.3], [16, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const flowOffset = (frame * 4) % 30;

  const openDelta = crackOpen * 22;
  const tipX = 520 + crackOpen * 60;

  const topForces = [
    { x: 140, yBase: 168, len: 42 },
    { x: 230, yBase: 180, len: 36 },
    { x: 320, yBase: 195, len: 30 },
    { x: 410, yBase: 208, len: 24 },
    { x: 480, yBase: 216, len: 18 },
  ];

  const botForces = [
    { x: 140, yBase: 282, len: 42 },
    { x: 230, yBase: 270, len: 36 },
    { x: 320, yBase: 255, len: 30 },
    { x: 410, yBase: 242, len: 24 },
    { x: 480, yBase: 234, len: 18 },
  ];

  const flowLines = [
    { y: 212, dash: '8 6' },
    { y: 225, dash: '12 5' },
    { y: 238, dash: '8 6' },
  ];

  const currentPressure = (12.4 * forceScale).toFixed(1);

  return (
    <AbsoluteFill
      style={{
        opacity,
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
      }}
    >
      <svg width="78%" viewBox="0 0 800 450" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="waterFlowGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#2b82c9" stopOpacity={0.9} />
            <stop offset="70%" stopColor="#00d2ff" stopOpacity={0.95} />
            <stop offset="100%" stopColor="#e9f2f6" stopOpacity={1} />
          </linearGradient>

          <linearGradient id="steelGradTop" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2a3540" />
            <stop offset="100%" stopColor="#1c242c" />
          </linearGradient>

          <linearGradient id="steelGradBot" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1c242c" />
            <stop offset="100%" stopColor="#2a3540" />
          </linearGradient>

          <marker
            id="forceArrowUp"
            viewBox="0 0 10 10"
            refX="5"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 10 L 5 0 L 10 10 Z" fill="#d0523f" />
          </marker>

          <marker
            id="forceArrowDown"
            viewBox="0 0 10 10"
            refX="5"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 5 10 L 10 0 Z" fill="#d0523f" />
          </marker>
        </defs>

        {/* Top Steel Plate */}
        <path
          d={`M 50,40 L 750,40 L 750,225 L ${tipX},225 L 300,${180 - openDelta} L 50,${160 - openDelta} Z`}
          fill="url(#steelGradTop)"
          stroke="#4a5a6a"
          strokeWidth="1.5"
        />

        {/* Bottom Steel Plate */}
        <path
          d={`M 50,410 L 750,410 L 750,225 L ${tipX},225 L 300,${270 + openDelta} L 50,${290 + openDelta} Z`}
          fill="url(#steelGradBot)"
          stroke="#4a5a6a"
          strokeWidth="1.5"
        />

        {/* Steel Grain Structural Markings */}
        {[80, 180, 280, 380, 480, 580, 680].map((gx) => (
          <g key={gx} opacity={0.25}>
            <line x1={gx} y1={55} x2={gx + 40} y2={110} stroke="#8ea3b5" strokeWidth="1" strokeDasharray="3 3" />
            <line x1={gx} y1={395} x2={gx + 40} y2={340} stroke="#8ea3b5" strokeWidth="1" strokeDasharray="3 3" />
          </g>
        ))}

        {/* Pressurized Water Body entering Crack */}
        <clipPath id="flowClip">
          <rect x="50" y="40" width={40 + 710 * flowProgress} height="370" />
        </clipPath>

        <g clipPath="url(#flowClip)">
          <path
            d={`M 50,${160 - openDelta} L 300,${180 - openDelta} L ${tipX},225 L 300,${270 + openDelta} L 50,${290 + openDelta} Z`}
            fill="url(#waterFlowGrad)"
          />

          {/* Animated Water Velocity Vectors */}
          {flowLines.map((fl, i) => (
            <line
              key={i}
              x1="50"
              y1={fl.y}
              x2={tipX - 15}
              y2={225 + (fl.y - 225) * 0.2}
              stroke="#ffffff"
              strokeWidth="2"
              strokeDasharray={fl.dash}
              strokeDashoffset={-flowOffset}
              opacity={0.85}
            />
          ))}
        </g>

        {/* Outward Hydrostatic Wedge Forces (Prying Steel Apart) */}
        {topForces.map((tf, i) => {
          const currentLen = tf.len * forceScale;
          const startY = tf.yBase - openDelta;
          return (
            <g key={`tf-${i}`} opacity={forceScale}>
              <line
                x1={tf.x}
                y1={startY}
                x2={tf.x}
                y2={startY - currentLen}
                stroke="#d0523f"
                strokeWidth="2.5"
                markerEnd="url(#forceArrowUp)"
              />
            </g>
          );
        })}

        {botForces.map((bf, i) => {
          const currentLen = bf.len * forceScale;
          const startY = bf.yBase + openDelta;
          return (
            <g key={`bf-${i}`} opacity={forceScale}>
              <line
                x1={bf.x}
                y1={startY}
                x2={bf.x}
                y2={startY + currentLen}
                stroke="#d0523f"
                strokeWidth="2.5"
                markerEnd="url(#forceArrowDown)"
              />
            </g>
          );
        })}

        {/* Crack Tip Stress Concentration Peak Ring */}
        <circle
          cx={tipX}
          cy={225}
          r={6 + forceScale * 8}
          fill="none"
          stroke="#d0523f"
          strokeWidth="1.5"
          strokeDasharray="3 2"
          opacity={forceScale}
        />
        <circle
          cx={tipX}
          cy={225}
          r="2.5"
          fill="#e0b44c"
        />

        {/* Reference Grid & Dimensioning */}
        <line x1="50" y1="225" x2="750" y2="225" stroke="#e9f2f6" strokeWidth="0.5" strokeDasharray="2 4" opacity={0.4} />

        {/* On-screen Technical Data Annotations */}
        {/* Steel Material Label */}
        <text x="60" y="75" fill="#e9f2f6" fontSize="11" fontWeight="600" letterSpacing="1">
          ESTRUCTURA DE ACERO (FISURADA)
        </text>

        {/* Water Flow Velocity Tag */}
        <g transform="translate(70, 120)">
          <rect x="0" y="0" width="135" height="24" rx="3" fill="#1c242c" stroke="#2b82c9" strokeWidth="1" />
          <text x="10" y="16" fill="#00d2ff" fontSize="11" fontWeight="bold">
            FLUJO v = 12.0 m/s
          </text>
        </g>

        {/* Hydrostatic Pressure Gauge */}
        <g transform="translate(290, 80)">
          <rect x="0" y="0" width="180" height="28" rx="3" fill="#1c242c" stroke="#d0523f" strokeWidth="1" opacity={forceScale} />
          <text x="10" y="18" fill="#e9f2f6" fontSize="11" fontWeight="bold" opacity={forceScale}>
            PRESIÓN WEDGE: {currentPressure} MPa
          </text>
        </g>

        {/* Crack Tip Callout */}
        <g transform={`translate(${Math.min(tipX + 15, 620)}, 215)`} opacity={forceScale}>
          <line x1="0" y1="10" x2="35" y2="-20" stroke="#e0b44c" strokeWidth="1" />
          <line x1="35" y1="-20" x2="110" y2="-20" stroke="#e0b44c" strokeWidth="1" />
          <text x="40" y="-26" fill="#e0b44c" fontSize="10" fontWeight="bold">
            PUNTA DE FISURA
          </text>
          <text x="40" y="-8" fill="#e9f2f6" fontSize="9">
            TENSION CUÑA HIDRÁULICA
          </text>
        </g>
      </svg>

      {/* Main Title Caption */}
      {p.title ? (
        <div
          style={{
            marginTop: 20,
            transform: `translateY(${textRise}px)`,
            fontFamily: "'Segoe UI', Roboto, Arial, sans-serif",
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: '1.5px',
            color: '#e9f2f6',
            textShadow: '0 2px 8px rgba(0,0,0,0.6)',
            textAlign: 'center',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};