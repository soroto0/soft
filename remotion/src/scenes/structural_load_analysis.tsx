import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const StructuralLoadAnalysisScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const shift = interpolate(frame, [span * 0.2, span * 0.7], [0, 45], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const force = interpolate(frame, [span * 0.4, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelAlpha = interpolate(frame, [0, span * 0.2], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const plates = [
    { y: 100, h: 40, label: 'PLATTE A (FIX)', color: '#8a949b' },
    { y: 140, h: 40, label: 'PLATTE B (TEMP)', color: '#c9d3d9' },
  ];

  const threads = [0, 1, 2, 3, 4, 5, 6, 7];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 500 350" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="boltGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#b08a30" />
            <stop offset="50%" stopColor="#e0b44c" />
            <stop offset="100%" stopColor="#b08a30" />
          </linearGradient>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#d0523f" />
          </marker>
        </defs>

        {/* Plates */}
        {plates.map((plate, i) => (
          <g key={i}>
            <rect
              x={100}
              y={plate.y}
              width={300}
              height={plate.h}
              fill={plate.color}
              stroke="#e9f2f6"
              strokeWidth={1}
            />
            <text
              x={110}
              y={plate.y + 25}
              fill="#1a1a1a"
              fontSize={10}
              fontWeight="bold"
              opacity={labelAlpha}
            >
              {plate.label}
            </text>
          </g>
        ))}

        {/* Bolt */}
        <g transform={`translate(${250}, 70)`}>
          <rect x={-20} y={0} width={40} height={140} fill="url(#boltGrad)" rx={2} />
          {threads.map((t) => (
            <line
              key={t}
              x1={-20}
              y1={20 + t * 15}
              x2={20}
              y2={25 + t * 15}
              stroke="#1a1a1a"
              strokeWidth={0.5}
              opacity={0.4}
            />
          ))}
          <text x={25} y={10} fill="#e0b44c" fontSize={9} opacity={labelAlpha}>
            BOLZEN Ø 40mm
          </text>
        </g>

        {/* Load Axis */}
        <g transform={`translate(${250 + shift}, 40)`}>
          <line
            x1={0}
            y1={0}
            x2={0}
            y2={200}
            stroke="#e9f2f6"
            strokeWidth={1.5}
            strokeDasharray="8 4"
          />
          <path d="M -10 10 L 0 0 L 10 10" fill="none" stroke="#e9f2f6" strokeWidth={2} />
          <text x={10} y={-10} fill="#e9f2f6" fontSize={12} fontWeight="bold">
            LASTACHSE
          </text>
          <text x={10} y={5} fill="#e9f2f6" fontSize={9} opacity={shift > 5 ? 1 : 0}>
            Δx = {shift.toFixed(1)}mm
          </text>
        </g>

        {/* Shear Forces */}
        {force > 0 && (
          <g>
            {/* Upper Force Arrow (Right) */}
            <line
              x1={250}
              y1={135}
              x2={250 + 80 * force}
              y2={135}
              stroke="#d0523f"
              strokeWidth={4}
              markerEnd="url(#arrowhead)"
            />
            {/* Lower Force Arrow (Left) */}
            <line
              x1={250}
              y1={145}
              x2={250 - 80 * force}
              y2={145}
              stroke="#d0523f"
              strokeWidth={4}
              markerEnd="url(#arrowhead)"
            />
            <text
              x={250 + 40}
              y={125}
              fill="#d0523f"
              fontSize={14}
              fontWeight="bold"
              textAnchor="middle"
              opacity={force}
            >
              F_shear
            </text>
          </g>
        )}

        {/* Center of Gravity Reference */}
        <circle cx={250} cy={140} r={3} fill="#e9f2f6" />
        <text x={240} y={160} fill="#e9f2f6" fontSize={8} textAnchor="end" opacity={labelAlpha}>
          SCHWERPUNKT
        </text>
      </svg>

      {p.title && (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            color: '#e9f2f6',
            fontSize: 42,
            fontFamily: 'sans-serif',
            borderLeft: '4px solid #d0523f',
            paddingLeft: 20,
            opacity: labelAlpha,
          }}
        >
          {p.title}
        </div>
      )}
    </AbsoluteFill>
  );
};