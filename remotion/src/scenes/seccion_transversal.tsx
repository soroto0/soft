import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const SeccionTransversalScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const retract = interpolate(frame, [span * 0.15, span * 0.75], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const silverPercent = interpolate(frame, [span * 0.15, span * 0.75], [100, 79], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const captionY = interpolate(frame, [0, span * 0.2], [15, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  // Coin parameters
  const centerX = 280;
  const centerY = 220;
  const outerRadius = 130;
  const silverRadius = outerRadius - 27 * retract;

  return (
    <AbsoluteFill
      style={{
        opacity,
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: "'Segoe UI', Arial, sans-serif",
        width,
        height,
      }}
    >
      <svg
        width={width * 0.85}
        height={height * 0.75}
        viewBox="0 0 800 450"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="silverGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="40%" stopColor="#e9f2f6" />
            <stop offset="100%" stopColor="#a3b1b8" />
          </linearGradient>
          <linearGradient id="stoneGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#423a38" />
            <stop offset="50%" stopColor="#2d2522" />
            <stop offset="100%" stopColor="#1a1513" />
          </linearGradient>
          <linearGradient id="copperGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#d0523f" />
            <stop offset="100%" stopColor="#8c3022" />
          </linearGradient>
          <linearGradient id="rimGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e0b44c" />
            <stop offset="50%" stopColor="#b08522" />
            <stop offset="100%" stopColor="#5e440f" />
          </linearGradient>
        </defs>

        {/* Outer Rim of the Coin */}
        <circle
          cx={centerX}
          cy={centerY}
          r={outerRadius + 8}
          fill="none"
          stroke="url(#rimGrad)"
          strokeWidth={12}
        />

        {/* Base Metal / Stone Fill (revealed as silver retracts) */}
        <circle
          cx={centerX}
          cy={centerY}
          r={outerRadius}
          fill="url(#stoneGrad)"
        />
        
        {/* Copper/Base Metal Inner Ring to show degradation material */}
        <circle
          cx={centerX}
          cy={centerY}
          r={outerRadius}
          fill="none"
          stroke="url(#copperGrad)"
          strokeWidth={27 * retract}
          opacity={retract}
        />

        {/* Silver Core */}
        <circle
          cx={centerX}
          cy={centerY}
          r={silverRadius}
          fill="url(#silverGrad)"
          stroke="#ffffff"
          strokeWidth={1}
        />

        {/* Leader Lines & Labels */}
        {/* 1. Silver Core Label */}
        <path
          d={`M ${centerX - 40} ${centerY - 20} L ${centerX - 120} ${centerY - 100} L 80 ${centerY - 100}`}
          fill="none"
          stroke="#e9f2f6"
          strokeWidth={1}
          opacity={0.8}
        />
        <text
          x={80}
          y={centerY - 110}
          fill="#e9f2f6"
          fontSize={12}
          fontWeight="bold"
          letterSpacing={1}
        >
          NÚCLEO DE PLATA
        </text>
        <text
          x={80}
          y={centerY - 85}
          fill="#a3b1b8"
          fontSize={11}
        >
          {`Contenido: ${silverPercent.toFixed(0)}%`}
        </text>

        {/* 2. Degraded Gap Label */}
        <path
          d={`M ${centerX + outerRadius - 10} ${centerY} L ${centerX + 180} ${centerY - 40} L 540 ${centerY - 40}`}
          fill="none"
          stroke="#d0523f"
          strokeWidth={1}
          opacity={retract}
        />
        <text
          x={540}
          y={centerY - 50}
          fill="#d0523f"
          fontSize={12}
          fontWeight="bold"
          letterSpacing={1}
          opacity={retract}
        >
          PÉRDIDA / COBRE (-21%)
        </text>
        <text
          x={540}
          y={centerY - 25}
          fill="#a3b1b8"
          fontSize={11}
          opacity={retract}
        >
          Textura de piedra y metal base
        </text>

        {/* 3. Outer Rim Label */}
        <path
          d={`M ${centerX - outerRadius - 4} ${centerY + 40} L ${centerX - 160} ${centerY + 120} L 80 ${centerY + 120}`}
          fill="none"
          stroke="#e0b44c"
          strokeWidth={1}
          opacity={0.8}
        />
        <text
          x={80}
          y={centerY + 110}
          fill="#e0b44c"
          fontSize={12}
          fontWeight="bold"
          letterSpacing={1}
        >
          BORDE DEL DENARIO
        </text>
        <text
          x={80}
          y={centerY + 135}
          fill="#a3b1b8"
          fontSize={11}
        >
          Diámetro exterior intacto
        </text>

        {/* Right Side: Silver Content Gauge / Comparison Bar */}
        <g transform="translate(620, 100)">
          {/* Gauge Background */}
          <rect
            x={0}
            y={0}
            width={30}
            height={220}
            fill="#2d2522"
            stroke="#8a949b"
            strokeWidth={1}
          />
          {/* Gauge Active Silver Fill */}
          <rect
            x={2}
            y={220 - 220 * (silverPercent / 100)}
            width={26}
            height={220 * (silverPercent / 100)}
            fill="url(#silverGrad)"
          />
          {/* Gauge Lost Fill */}
          <rect
            x={2}
            y={0}
            width={26}
            height={220 * (1 - silverPercent / 100)}
            fill="url(#copperGrad)"
            opacity={retract}
          />

          {/* Ticks and Labels */}
          {/* 100% Tick */}
          <line x1={-5} y1={0} x2={35} y2={0} stroke="#e9f2f6" strokeWidth={1} />
          <text x={45} y={5} fill="#e9f2f6" fontSize={11}>100% (Plata pura)</text>

          {/* 79% Tick */}
          <line
            x1={-5}
            y1={220 * 0.21}
            x2={35}
            y2={220 * 0.21}
            stroke="#d0523f"
            strokeWidth={1.5}
            opacity={retract}
          />
          <text
            x={45}
            y={220 * 0.21 + 4}
            fill="#d0523f"
            fontSize={11}
            fontWeight="bold"
            opacity={retract}
          >
            79% (Caída del 21%)
          </text>

          {/* 50% Tick */}
          <line x1={-5} y1={110} x2={15} y2={110} stroke="#8a949b" strokeWidth={1} />
          <text x={-12} y={114} fill="#8a949b" fontSize={10} textAnchor="end">50%</text>

          {/* 0% Tick */}
          <line x1={-5} y1={220} x2={35} y2={220} stroke="#e9f2f6" strokeWidth={1} />
          <text x={45} y={224} fill="#e9f2f6" fontSize={11}>0%</text>

          {/* Title of the Gauge */}
          <text
            x={15}
            y={-20}
            fill="#e9f2f6"
            fontSize={12}
            fontWeight="bold"
            textAnchor="middle"
            letterSpacing={1}
          >
            LEY DE PLATA
          </text>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            marginTop: 10,
            transform: `translateY(${captionY}px)`,
            fontSize: 28,
            color: '#e9f2f6',
            letterSpacing: 2,
            fontWeight: 300,
            textTransform: 'uppercase',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};