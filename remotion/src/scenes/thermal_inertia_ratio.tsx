import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ThermalInertiaRatioScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const opacity = p.enter * p.exit;

  const intro = interpolate(frame, [0, span * 0.15], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const vector = interpolate(frame, [span * 0.2, span * 0.5], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const impact = interpolate(frame, [span * 0.45, span * 0.8], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const captionRise = interpolate(frame, [0, span * 0.2], [15, 0], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ticks = [0, 1, 2, 3, 4, 5];
  const blocks = [
    { id: 'potato', x: 80, w: 40, h: 40, color: '#8a949b', label: '1.0x MASA', sub: 'PATATA' },
    { id: 'oil', x: 180, w: 120, h: 40, color: '#e0b44c', label: '3.0x MASA', sub: 'ACEITE' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 240" style={{ overflow: 'visible' }}>
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#5b7f9c" />
          </marker>
          <linearGradient id="oilGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e0b44c" />
            <stop offset="100%" stopColor="#c2943a" />
          </linearGradient>
        </defs>

        {/* Scale Axis */}
        <line x1="40" y1="200" x2="360" y2="200" stroke="#e9f2f6" strokeWidth={1.5} opacity={intro} />
        {ticks.map((t) => (
          <g key={t} opacity={intro * 0.6}>
            <line x1={40 + t * 64} y1={200} x2={40 + t * 64} y2={208} stroke="#e9f2f6" strokeWidth={1} />
            <text x={40 + t * 64} y={222} fill="#e9f2f6" fontSize={8} textAnchor="middle" fontFamily="monospace">
              {t * 20}kg
            </text>
          </g>
        ))}

        {/* Blocks */}
        {blocks.map((b) => (
          <g key={b.id} opacity={intro}>
            <rect
              x={b.x}
              y={200 - b.h * intro}
              width={b.w}
              height={b.h * intro}
              fill={b.id === 'oil' ? 'url(#oilGrad)' : b.color}
              stroke="#e9f2f6"
              strokeWidth={0.5}
            />
            <text x={b.x + b.w / 2} y={150} fill="#e9f2f6" fontSize={10} textAnchor="middle" fontWeight="bold">
              {b.label}
            </text>
            <text x={b.x + b.w / 2} y={135} fill={b.color} fontSize={8} textAnchor="middle" letterSpacing={1}>
              {b.sub}
            </text>
          </g>
        ))}

        {/* Cold Vector Arrow */}
        <g opacity={vector * (1 - impact * 0.8)}>
          <line
            x1={100 + vector * 40}
            y1={180}
            x2={160 + vector * 60}
            y2={180}
            stroke="#5b7f9c"
            strokeWidth={3}
            markerEnd="url(#arrowhead)"
          />
          <text x={130 + vector * 50} y={170} fill="#5b7f9c" fontSize={9} textAnchor="middle">
            VECTOR FRÍO
          </text>
        </g>

        {/* Thermal Flywheel Indicator (Absorption) */}
        <circle
          cx={240}
          cy={180}
          r={25 + impact * 10}
          fill="none"
          stroke="#5b7f9c"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          opacity={impact * (1 - impact * 0.5)}
          style={{ transformOrigin: '240px 180px', transform: `rotate(${impact * 90}deg)` }}
        />
        
        {/* Stability Label */}
        <text
          x={240}
          y={190}
          fill="#e9f2f6"
          fontSize={7}
          textAnchor="middle"
          opacity={impact}
          fontFamily="monospace"
        >
          ΔT ≈ 0
        </text>

        {/* Comparison Lines */}
        <path
          d={`M 100 110 L 100 100 L 240 100 L 240 110`}
          fill="none"
          stroke="#e9f2f6"
          strokeWidth={0.5}
          opacity={intro * 0.4}
        />
        <text x={170} y={95} fill="#e9f2f6" fontSize={8} textAnchor="middle" opacity={intro * 0.6}>
          RELACIÓN TÉRMICA 1:3
        </text>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            color: '#e9f2f6',
            fontSize: 32,
            fontFamily: 'sans-serif',
            letterSpacing: 2,
            textTransform: 'uppercase',
            opacity: intro,
            transform: `translateY(${captionRise}px)`,
            borderLeft: '4px solid #e0b44c',
            paddingLeft: 16,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};