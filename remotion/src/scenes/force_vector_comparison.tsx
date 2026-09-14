import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ForceVectorComparisonScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const opacity = p.enter * p.exit;

  const intro = interpolate(frame, [0, span * 0.15], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shearScale = interpolate(frame, [span * 0.2, span * 0.45], [0, 1], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const tensionScale = interpolate(frame, [span * 0.5, span * 0.8], [0, 1], {
    easing: Easing.out(Easing.elastic(1)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const tensionPulse = interpolate(frame, [span * 0.7, span], [0, 10], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const plates = [
    { y: 135, h: 25, fill: '#5d6a73', label: 'PLATE ALPHA' },
    { y: 160, h: 25, fill: '#4a555e', label: 'PLATE BETA' },
  ];

  const ticks = [0, 1, 2, 3, 4];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="65%" viewBox="0 0 400 400" style={{ overflow: 'visible' }}>
        <defs>
          <marker id="arrow-grey" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#8a949b" />
          </marker>
          <marker id="arrow-orange" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M 0 0 L 8 4 L 0 8 z" fill="#e0b44c" />
          </marker>
          <linearGradient id="boltShine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#8a949b" />
            <stop offset="0.5" stopColor="#e9f2f6" />
            <stop offset="1" stopColor="#8a949b" />
          </linearGradient>
        </defs>

        {/* Reference Grid Ticks */}
        {ticks.map((t) => (
          <line
            key={t}
            x1={340}
            y1={100 + t * 50}
            x2={350}
            y2={100 + t * 50}
            stroke="#e9f2f6"
            strokeWidth={1}
            opacity={intro * 0.3}
          />
        ))}

        {/* Plates being joined */}
        {plates.map((plate, i) => (
          <g key={i} opacity={intro}>
            <rect
              x={80}
              y={plate.y}
              width={240}
              height={plate.h}
              fill={plate.fill}
              stroke="#e9f2f6"
              strokeWidth={1}
            />
            <text x={90} y={plate.y + 16} fill="#e9f2f6" fontSize={8} opacity={0.5} letterSpacing={1}>
              {plate.label}
            </text>
          </g>
        ))}

        {/* The Bolt */}
        <g opacity={intro}>
          {/* Shank */}
          <rect x={192} y={100} width={16} height={120} fill="url(#boltShine)" stroke="#e9f2f6" strokeWidth={0.5} />
          {/* Head */}
          <rect x={175} y={85} width={50} height={15} rx={2} fill="#8a949b" stroke="#e9f2f6" strokeWidth={1} />
          {/* Washer Top */}
          <rect x={170} y={130} width={60} height={4} fill="#c9d3d9" />
          {/* Nut */}
          <rect x={175} y={220} width={50} height={15} rx={2} fill="#8a949b" stroke="#e9f2f6" strokeWidth={1} />
          {/* Threading detail */}
          {[0, 1, 2, 3].map((n) => (
            <line key={n} x1={192} y1={205 + n * 4} x2={208} y2={207 + n * 4} stroke="#4a555e" strokeWidth={1} />
          ))}
        </g>

        {/* Intended Shear Forces (Grey Arrows) */}
        <g opacity={shearScale}>
          <line
            x1={60}
            y1={147}
            x2={140}
            y2={147}
            stroke="#8a949b"
            strokeWidth={3}
            markerEnd="url(#arrow-grey)"
          />
          <line
            x1={340}
            y1={172}
            x2={260}
            y2={172}
            stroke="#8a949b"
            strokeWidth={3}
            markerEnd="url(#arrow-grey)"
          />
          <text x={60} y={135} fill="#8a949b" fontSize={10} fontWeight="bold">SCHERUNG</text>
        </g>

        {/* Unintended Tension Force (Large Orange Arrow) */}
        <g opacity={tensionScale}>
          <path
            d={`M 200,320 L 200,${250 - tensionPulse}`}
            stroke="#e0b44c"
            strokeWidth={8}
            markerEnd="url(#arrow-orange)"
            fill="none"
          />
          <path
            d={`M 200,40 L 200,${70 + tensionPulse}`}
            stroke="#e0b44c"
            strokeWidth={8}
            markerEnd="url(#arrow-orange)"
            fill="none"
          />
          <rect x={215} y={260} width={100} height={40} fill="rgba(224, 180, 76, 0.1)" stroke="#e0b44c" strokeWidth={1} />
          <text x={222} y={278} fill="#e0b44c" fontSize={12} fontWeight="bold">ZUG-</text>
          <text x={222} y={292} fill="#e0b44c" fontSize={12} fontWeight="bold">BELASTUNG</text>
          
          {/* Stress indicators */}
          <circle cx={200} cy={135} r={4 + tensionPulse * 0.2} fill="#d0523f" opacity={0.6} />
          <circle cx={200} cy={185} r={4 + tensionPulse * 0.2} fill="#d0523f" opacity={0.6} />
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            color: '#e9f2f6',
            fontSize: 42,
            fontFamily: 'sans-serif',
            fontWeight: 'bold',
            letterSpacing: '0.1em',
            opacity: intro,
            transform: `translateY(${(1 - intro) * 20}px)`,
            borderLeft: '4px solid #e0b44c',
            paddingLeft: 20,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};