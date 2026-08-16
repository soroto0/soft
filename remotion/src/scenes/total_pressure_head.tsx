import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const TotalPressureHeadScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));
  const opacity = p.enter * p.exit;

  const draw = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const measure = interpolate(frame, [span * 0.25, span * 0.5], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const force = interpolate(frame, [span * 0.45, span * 0.85], [0, 1], {
    easing: Easing.bezier(0.33, 1, 0.68, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const slide = interpolate(frame, [0, span], [0, -15], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { id: 'l1', h: 60, fill: '#8a949b', name: 'OBERBODEN' },
    { id: 'l2', h: 140, fill: '#5d6a73', name: 'TON / SCHLICK' },
    { id: 'l3', h: 100, fill: '#c9d3d9', name: 'TRAGFÄHIGER GRUND' },
  ];

  const piles = [520, 560, 600, 640];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" height="80%" viewBox="0 0 800 500" style={{ overflow: 'visible' }}>
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#d0523f" />
          </marker>
          <marker id="dimhead" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <circle cx="3" cy="3" r="2" fill="#e9f2f6" />
          </marker>
        </defs>

        {/* Terrain and Layers */}
        <g opacity={draw} transform={`translate(${slide}, 0)`}>
          {layers.map((layer, i) => {
            const yOffset = layers.slice(0, i).reduce((acc, curr) => acc + curr.h, 0);
            return (
              <g key={layer.id}>
                <path
                  d={`M 100 ${100 + yOffset} 
                     L 350 ${100 + yOffset} 
                     L 550 ${320 + yOffset} 
                     L 750 ${320 + yOffset} 
                     L 750 ${100 + yOffset + layer.h} 
                     L 550 ${320 + yOffset + layer.h} 
                     L 350 ${100 + yOffset + layer.h} 
                     L 100 ${100 + yOffset + layer.h} Z`}
                  fill={layer.fill}
                  stroke="#e9f2f6"
                  strokeWidth="0.5"
                  opacity={0.8}
                />
                <text x="110" y={120 + yOffset} fill="#e9f2f6" fontSize="10" opacity={0.6}>
                  {layer.name}
                </text>
              </g>
            );
          })}
        </g>

        {/* Piles */}
        {piles.map((x, i) => (
          <rect
            key={i}
            x={x}
            y={320}
            width="12"
            height={160 * draw}
            fill="#e0b44c"
            stroke="#e9f2f6"
            strokeWidth="1"
            opacity={draw}
          />
        ))}
        <text x="580" y="495" fill="#e0b44c" fontSize="12" textAnchor="middle" opacity={draw}>
          BETONPFÄHLE (BIEGEBEANSPRUCHUNG)
        </text>

        {/* Vertical Dimension Chain */}
        <g opacity={measure}>
          <line x1="320" y1="100" x2="320" y2="320" stroke="#e9f2f6" strokeWidth="1.5" markerStart="url(#dimhead)" markerEnd="url(#dimhead)" />
          <line x1="300" y1="100" x2="330" y2="100" stroke="#e9f2f6" strokeWidth="1" />
          <line x1="300" y1="320" x2="540" y2="320" stroke="#e9f2f6" strokeWidth="1" strokeDasharray="4 4" />
          <rect x="265" y="195" width="50" height="30" fill="#1a1a1a" rx="4" />
          <text x="290" y="215" fill="#e9f2f6" fontSize="16" fontWeight="bold" textAnchor="middle">
            14,6 m
          </text>
        </g>

        {/* Pressure Vector */}
        <g opacity={force}>
          <line
            x1="380"
            y1="280"
            x2={380 + 120 * force}
            y2="280"
            stroke="#d0523f"
            strokeWidth="8"
            markerEnd="url(#arrowhead)"
          />
          <text x="440" y="265" fill="#d0523f" fontSize="14" fontWeight="bold" textAnchor="middle">
            LATERALER ERDDRUCK (F_total)
          </text>
          
          {/* Stress indicators on piles */}
          {piles.map((x, i) => (
            <circle
              key={`stress-${i}`}
              cx={x + 6}
              cy={340}
              r={4 * force}
              fill="#d0523f"
              opacity={force * 0.8}
            />
          ))}
        </g>

        {/* Scale Ticks */}
        {[0, 5, 10, 15].map((m) => (
          <g key={m} transform={`translate(80, ${320 - (m / 14.6) * 220})`}>
            <line x1="0" x2="10" y1="0" y2="0" stroke="#e9f2f6" strokeWidth="1" />
            <text x="-5" y="4" fill="#e9f2f6" fontSize="10" textAnchor="end">{m}m</text>
          </g>
        ))}
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: 42,
            fontWeight: 800,
            color: '#e9f2f6',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            opacity: measure,
            transform: `translateY(${(1 - measure) * 20}px)`,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};