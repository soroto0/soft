import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const StructuralPerimeterFailureScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const pressure = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const rupture = interpolate(frame, [span * 0.35, span * 0.5], [0, 1], {
    easing: Easing.in(Easing.ease),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const leak = interpolate(frame, [span * 0.45, span * 0.95], [0, 1], {
    easing: Easing.out(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleY = interpolate(frame, [0, span * 0.2], [20, 0], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const directions = [
    { x: 1, y: 0 },
    { x: 0.707, y: 0.707 },
    { x: 0, y: 1 },
    { x: -0.707, y: 0.707 },
    { x: -1, y: 0 },
    { x: -0.707, y: -0.707 },
    { x: 0, y: -1 },
    { x: 0.707, y: -0.707 },
  ];

  const centerX = 400;
  const centerY = 280;
  const radius = 120;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width={width * 0.8} height={height * 0.8} viewBox="0 0 800 600">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Table surface */}
        <line x1={100} y1={520} x2={700} y2={520} stroke="#8a949b" strokeWidth={2} />
        <text x={100} y={540} fill="#8a949b" fontSize={12} fontFamily="monospace">REF: PLANO DE APOYO</text>

        {/* Leakage Torrente */}
        <path
          d={`M ${centerX + radius} ${centerY} 
             Q ${centerX + radius + 40} ${centerY}, ${centerX + radius + 20 + 60 * leak} ${centerY + 240 * leak}
             L ${centerX + radius - 20 - 60 * leak} ${centerY + 240 * leak}
             Q ${centerX + radius - 40} ${centerY}, ${centerX + radius} ${centerY} Z`}
          fill="#e0b44c"
          opacity={rupture}
        />

        {/* Tortilla Core */}
        <circle cx={centerX} cy={centerY} r={radius} fill="#e0b44c" opacity={0.9} />
        
        {/* Internal Pressure Arrows */}
        {directions.map((d, i) => (
          <g key={i} opacity={pressure * (1 - rupture * 0.8)}>
            <line
              x1={centerX + d.x * (radius - 40)}
              y1={centerY + d.y * (radius - 40)}
              x2={centerX + d.x * (radius - 10 + 30 * pressure)}
              y2={centerY + d.y * (radius - 10 + 30 * pressure)}
              stroke="#d0523f"
              strokeWidth={3}
            />
            <path
              d={`M ${centerX + d.x * (radius + 25 * pressure)} ${centerY + d.y * (radius + 25 * pressure)} 
                 L ${centerX + d.x * (radius + 15 * pressure) + d.y * 5} ${centerY + d.y * (radius + 15 * pressure) - d.x * 5}
                 L ${centerX + d.x * (radius + 15 * pressure) - d.y * 5} ${centerY + d.y * (radius + 15 * pressure) + d.x * 5} Z`}
              fill="#d0523f"
            />
          </g>
        ))}

        {/* Crust (Outer Wall) */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius}
          fill="none"
          stroke="#e9f2f6"
          strokeWidth={6}
          strokeDasharray={rupture > 0.1 ? "700 100" : "1000 0"}
          strokeDashoffset={-50}
        />

        {/* Crack Detail */}
        <path
          d={`M ${centerX + radius - 5} ${centerY - 20} L ${centerX + radius + 5} ${centerY} L ${centerX + radius - 5} ${centerY + 20}`}
          stroke="#d0523f"
          strokeWidth={4 * rupture}
          fill="none"
          opacity={rupture}
        />

        {/* Dimension 2mm */}
        <g transform={`translate(${centerX + radius + 20}, ${centerY - 60})`}>
          <line x1={0} y1={0} x2={0} y2={15} stroke="#e9f2f6" strokeWidth={1} />
          <line x1={6} y1={0} x2={6} y2={15} stroke="#e9f2f6" strokeWidth={1} />
          <line x1={0} y1={7.5} x2={6} y2={7.5} stroke="#e9f2f6" strokeWidth={0.5} />
          <text x={10} y={12} fill="#e9f2f6" fontSize={10} fontFamily="monospace">2 mm</text>
          <text x={10} y={25} fill="#8a949b" fontSize={8} fontFamily="monospace">ESPESOR NOMINAL</text>
        </g>

        {/* Labels */}
        <text x={centerX} y={centerY - 20} fill="#e9f2f6" fontSize={12} textAnchor="middle" fontFamily="monospace" opacity={0.7}>NÚCLEO LÍQUIDO</text>
        <text x={centerX - radius - 10} y={centerY - radius - 10} fill="#e9f2f6" fontSize={12} textAnchor="end" fontFamily="monospace">CORTEZA PERIMETRAL</text>
        <line x1={centerX - radius - 5} y1={centerY - radius - 5} x2={centerX - radius + 10} y2={centerY - radius + 10} stroke="#e9f2f6" strokeWidth={1} />

        {/* Pressure Gauge */}
        <rect x={100} y={100} width={150} height={10} fill="#1a1a1a" stroke="#8a949b" />
        <rect x={100} y={100} width={150 * pressure} height={10} fill={pressure > 0.8 ? "#d0523f" : "#e0b44c"} />
        <text x={100} y={90} fill="#e9f2f6" fontSize={10} fontFamily="monospace">PRESIÓN INTERNA: {(pressure * 100).toFixed(0)} kPa</text>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: 60,
            color: '#e9f2f6',
            fontSize: 42,
            fontFamily: 'monospace',
            letterSpacing: 4,
            transform: `translateY(${titleY}px)`,
            borderLeft: '4px solid #d0523f',
            paddingLeft: 20,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};