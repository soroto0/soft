import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const StructuralDisplacementScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const move = interpolate(frame, [span * 0.15, span * 0.85], [0, 80], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const arrowScale = interpolate(frame, [span * 0.1, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.back(1.2)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textFade = interpolate(frame, [span * 0.5, span * 0.8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ticks = [0, 20, 40, 60, 80];
  const svgW = 800;
  const svgH = 500;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg
        width={width * 0.8}
        height={height * 0.8}
        viewBox={`0 0 ${svgW} ${svgH}`}
        fill="none"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="memberGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#e0b44c" />
            <stop offset="50%" stopColor="#f2d184" />
            <stop offset="100%" stopColor="#e0b44c" />
          </linearGradient>
        </defs>

        {/* Foundation / Basis */}
        <rect x={100} y={380} width={600} height={40} fill="#5d6a73" rx={4} />
        <text x={110} y={410} fill="#e9f2f6" fontSize={14} fontFamily="monospace">REF: BASIS_STRUKTUR</text>

        {/* Original Position (Ghost) */}
        <rect
          x={360}
          y={80}
          width={80}
          height={300}
          stroke="#8a949b"
          strokeWidth={2}
          strokeDasharray="8 4"
          opacity={0.6}
        />
        <text x={350} y={70} fill="#8a949b" fontSize={12} textAnchor="end">IST-ZUSTAND (0mm)</text>

        {/* Displacement Ruler */}
        <line x1={440} y1={360} x2={540} y2={360} stroke="#e9f2f6" strokeWidth={1} />
        {ticks.map((t) => (
          <g key={t} opacity={textFade}>
            <line x1={440 + t} y1={360} x2={440 + t} y2={370} stroke="#e9f2f6" strokeWidth={1} />
            <text x={440 + t} y={385} fill="#e9f2f6" fontSize={10} textAnchor="middle">{t}</text>
          </g>
        ))}

        {/* Moving Member */}
        <g transform={`translate(${move}, 0)`}>
          <rect
            x={360}
            y={80}
            width={80}
            height={300}
            fill="url(#memberGrad)"
            stroke="#e9f2f6"
            strokeWidth={1}
          />
          <text x={450} y={120} fill="#e0b44c" fontSize={14} fontWeight="bold" opacity={textFade}>
            DEFORMATION: +{move.toFixed(1)}mm
          </text>
        </g>

        {/* Force Arrow */}
        <g transform={`scale(${arrowScale})`} style={{ transformOrigin: '300px 230px' }}>
          <path
            d="M 220 230 L 340 230"
            stroke="#d0523f"
            strokeWidth={6}
            markerEnd="url(#arrowhead)"
          />
          <path d="M 340 230 L 325 220 L 325 240 Z" fill="#d0523f" />
          <text x={220} y={215} fill="#d0523f" fontSize={16} fontWeight="bold">DRUCKKRAFT</text>
        </g>

        {/* Structural Cracks at base */}
        <path
          d={`M ${360 + move} 380 L ${355 + move} 370 M ${370 + move} 380 L ${375 + move} 365`}
          stroke="#d0523f"
          strokeWidth={2}
          opacity={move / 80}
        />
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            width: '100%',
            textAlign: 'center',
            color: '#e9f2f6',
            fontSize: 42,
            fontFamily: 'sans-serif',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            opacity: textFade,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};