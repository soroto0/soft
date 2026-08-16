import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ZugspannungsversagenBewehrungScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const tensionProgress = interpolate(frame, [0, span * 0.45], [0, 1], {
    easing: Easing.in(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const fractureProgress = interpolate(frame, [span * 0.45, span * 0.55], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const separation = interpolate(frame, [span * 0.45, span * 0.9], [0, 48], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleRise = interpolate(frame, [0, span * 0.25], [16, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const necking = 1 - tensionProgress * 0.38;
  const concreteGap = 12 + tensionProgress * 18 + separation * 0.5;
  const rebarSeparation = separation;

  const leftRibs = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  const rightRibs = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  const stressTicks = [0, 1, 2, 3, 4];

  const currentStress = frame < span * 0.45
    ? tensionProgress * 550
    : Math.max(0, 550 * (1 - fractureProgress));

  return (
    <AbsoluteFill
      style={{
        opacity,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <svg width="78%" viewBox="0 0 900 520">
        <defs>
          <linearGradient id="rebarSteel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#cfdae2" />
            <stop offset="35%" stopColor="#8d9ba6" />
            <stop offset="70%" stopColor="#5d6a74" />
            <stop offset="100%" stopColor="#3d4952" />
          </linearGradient>

          <linearGradient id="stressGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#5d6a74" />
            <stop offset="60%" stopColor="#e0b44c" />
            <stop offset="100%" stopColor="#ff5500" />
          </linearGradient>

          <pattern id="concreteHatch" width="16" height="16" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="16" stroke="#5d6a74" strokeWidth="0.8" opacity="0.3" />
            <circle cx="8" cy="8" r="1.2" fill="#7a8b96" opacity="0.4" />
          </pattern>

          <marker id="arrowL" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 9 1 L 1 5 L 9 9 z" fill="#ff5500" />
          </marker>
          <marker id="arrowR" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 1 1 L 9 5 L 1 9 z" fill="#ff5500" />
          </marker>
        </defs>

        <rect x="70" y="70" width={380 - concreteGap / 2 - 70} height="260" fill="url(#concreteHatch)" stroke="#5d6a74" strokeWidth="1" />
        <rect x={450 + concreteGap / 2} y="70" width={830 - (450 + concreteGap / 2)} height="260" fill="url(#concreteHatch)" stroke="#5d6a74" strokeWidth="1" />

        <text x="80" y="92" fill="#7a8b96" fontSize="11" fontFamily="monospace" letterSpacing="1">BETONKÖRPER (GERISSEN)</text>
        <text x="820" y="92" fill="#7a8b96" fontSize="11" fontFamily="monospace" textAnchor="end" letterSpacing="1">C30/37</text>

        <line x1="50" y1="200" x2="850" y2="200" stroke="#e0b44c" strokeWidth="0.8" strokeDasharray="6 4" opacity="0.5" />
        <text x="850" y="196" fill="#e0b44c" fontSize="10" fontFamily="monospace" textAnchor="end" opacity="0.8">HORIZONTALE ZUGACHSE</text>

        <g transform={`translate(${-rebarSeparation}, 0)`}>
          <path
            d={`M 70 186
               L ${450 - rebarSeparation * 0.1 - 40} 186
               Q ${450 - rebarSeparation * 0.1 - 10} ${200 - 14 * necking} ${450 - rebarSeparation * 0.1} ${200 - 14 * necking}
               L ${450 - rebarSeparation * 0.1} ${200 + 14 * necking}
               Q ${450 - rebarSeparation * 0.1 - 10} ${200 + 14 * necking} ${450 - rebarSeparation * 0.1 - 40} 214
               L 70 214 Z`}
            fill="url(#rebarSteel)"
            stroke="#cfdae2"
            strokeWidth="1.2"
          />
          {leftRibs.map((i) => {
            const rx = 100 + i * 36;
            return (
              <line
                key={`lrib-${i}`}
                x1={rx}
                y1="184"
                x2={rx + 8}
                y2="216"
                stroke="#cfdae2"
                strokeWidth="2.2"
                opacity="0.85"
              />
            );
          })}
          {rebarSeparation > 1 ? (
            <line
              x1={450 - rebarSeparation * 0.1}
              y1={200 - 14 * necking}
              x2={450 - rebarSeparation * 0.1}
              y2={200 + 14 * necking}
              stroke="#ff5500"
              strokeWidth="3.5"
            />
          ) : null}
        </g>

        <g transform={`translate(${rebarSeparation}, 0)`}>
          <path
            d={`M 830 186
               L ${450 + rebarSeparation * 0.1 + 40} 186
               Q ${450 + rebarSeparation * 0.1 + 10} ${200 - 14 * necking} ${450 + rebarSeparation * 0.1} ${200 - 14 * necking}
               L ${450 + rebarSeparation * 0.1} ${200 + 14 * necking}
               Q ${450 + rebarSeparation * 0.1 + 10} ${200 + 14 * necking} ${450 + rebarSeparation * 0.1 + 40} 214
               L 830 214 Z`}
            fill="url(#rebarSteel)"
            stroke="#cfdae2"
            strokeWidth="1.2"
          />
          {rightRibs.map((i) => {
            const rx = 520 + i * 36;
            return (
              <line
                key={`rrib-${i}`}
                x1={rx}
                y1="184"
                x2={rx + 8}
                y2="216"
                stroke="#cfdae2"
                strokeWidth="2.2"
                opacity="0.85"
              />
            );
          })}
          {rebarSeparation > 1 ? (
            <line
              x1={450 + rebarSeparation * 0.1}
              y1={200 - 14 * necking}
              x2={450 + rebarSeparation * 0.1}
              y2={200 + 14 * necking}
              stroke="#ff5500"
              strokeWidth="3.5"
            />
          ) : null}
        </g>

        <line
          x1={220 - tensionProgress * 40}
          y1="140"
          x2={80 - tensionProgress * 40}
          y2="140"
          stroke="#ff5500"
          strokeWidth="3.5"
          markerEnd="url(#arrowL)"
        />
        <text x={150 - tensionProgress * 40} y="130" fill="#ff5500" fontSize="13" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
          -F_zug ({Math.round(currentStress * 1.2)} kN)
        </text>

        <line
          x1={680 + tensionProgress * 40}
          y1="140"
          x2={820 + tensionProgress * 40}
          y2="140"
          stroke="#ff5500"
          strokeWidth="3.5"
          markerEnd="url(#arrowR)"
        />
        <text x={750 + tensionProgress * 40} y="130" fill="#ff5500" fontSize="13" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
          +F_zug ({Math.round(currentStress * 1.2)} kN)
        </text>

        <line x1="450" y1="60" x2="450" y2="340" stroke="#ff5500" strokeWidth="1.5" strokeDasharray="4 3" opacity={0.6 + 0.4 * fractureProgress} />
        <rect x="360" y="44" width="180" height="22" rx="3" fill="#18222a" stroke="#ff5500" strokeWidth="1.2" />
        <text x="450" y="59" fill="#ff5500" fontSize="11" fontFamily="monospace" fontWeight="bold" textAnchor="middle" letterSpacing="1">
          {fractureProgress > 0.3 ? 'GLATTE ABRISSKANTE' : 'BRUCHLINIE (SIGNAL)'}
        </text>

        <g transform="translate(100, 360)">
          <rect x="0" y="0" width="700" height="70" rx="4" fill="#141c22" stroke="#5d6a74" strokeWidth="0.8" />
          <text x="16" y="24" fill="#e9f2f6" fontSize="11" fontFamily="monospace">STAHLDEHNUNG & SPANNUNG (B500B, Ø 28 mm)</text>
          
          <rect x="16" y="36" width="460" height="14" fill="#24313a" rx="2" />
          <rect
            x="16"
            y="36"
            width={Math.min(460, (currentStress / 550) * 460)}
            height="14"
            fill="url(#stressGrad)"
            rx="2"
          />

          {stressTicks.map((t) => {
            const tx = 16 + t * 115;
            const val = t * 137.5;
            return (
              <g key={`st-${t}`}>
                <line x1={tx} y1="36" x2={tx} y2="54" stroke="#0e151b" strokeWidth="1" />
                <text x={tx} y="64" fill="#7a8b96" fontSize="9" fontFamily="monospace" textAnchor="middle">
                  {Math.round(val)} MPa
                </text>
              </g>
            );
          })}

          <text x="500" y="47" fill={fractureProgress > 0 ? '#ff5500' : '#e0b44c'} fontSize="11" fontFamily="monospace" fontWeight="bold">
            {fractureProgress > 0 ? 'STATUS: ZUGBRUCH ERFOLGT' : `σ = ${Math.round(currentStress)} N/mm²`}
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
            fontWeight: 600,
            letterSpacing: '0.5px',
            color: '#e9f2f6',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};