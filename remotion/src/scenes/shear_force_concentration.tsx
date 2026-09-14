import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ShearForceConcentrationScene: React.FC<SceneProps> = (p) => {
  const { width, height, fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const flow = interpolate(frame, [0, span], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const stress = interpolate(frame, [span * 0.2, span * 0.7], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const crack = interpolate(frame, [span * 0.6, span], [0, 1], {
    easing: Easing.bezier(0.33, 1, 0.68, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const slide = interpolate(frame, [0, span * 0.2], [40, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const arrowIndices = [0, 1, 2];
  const boltIndices = [0, 1];

  return (
    <AbsoluteFill
      style={{
        opacity,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <svg
        width={width * 0.8}
        height={height * 0.7}
        viewBox="0 0 600 400"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="0"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#e0b44c" />
          </marker>
          <linearGradient id="weldGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8a949b" />
            <stop offset={`${stress * 100}%`} stopColor="#d0523f" />
            <stop offset="100%" stopColor="#e0b44c" />
          </linearGradient>
        </defs>

        {/* Concrete Slab */}
        <rect
          x="50"
          y="50"
          width="500"
          height="80"
          fill="#8a949b"
          stroke="#e9f2f6"
          strokeWidth="2"
        />
        <text x="60" y="75" fill="#e9f2f6" fontSize="14" fontWeight="bold">
          BETONPLATTE (C30/37)
        </text>

        {/* Steel Beam */}
        <rect
          x="150"
          y="180"
          width="300"
          height="150"
          fill="#5d6a73"
          stroke="#e9f2f6"
          strokeWidth="2"
        />
        <text x="160" y="205" fill="#e9f2f6" fontSize="14" fontWeight="bold">
          STAHLTRÄGER (S355)
        </text>

        {/* Ineffective Bolts */}
        {boltIndices.map((i) => (
          <g key={`bolt-${i}`} opacity={0.3}>
            <rect
              x={220 + i * 140}
              y="110"
              width="20"
              height="90"
              fill="#c9d3d9"
            />
            <line
              x1={230 + i * 140}
              y1="110"
              x2={230 + i * 140}
              y2="200"
              stroke="#d0523f"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
          </g>
        ))}

        {/* Weld Seam - The focus point */}
        <path
          d="M 150 130 L 180 130 L 150 180 Z"
          fill="url(#weldGrad)"
          stroke="#e9f2f6"
          strokeWidth="1"
        />
        <path
          d="M 450 130 L 420 130 L 450 180 Z"
          fill="url(#weldGrad)"
          stroke="#e9f2f6"
          strokeWidth="1"
        />
        
        {/* Crack lines on weld */}
        <path
          d="M 155 145 l 10 5 l -5 10 l 8 5"
          fill="none"
          stroke="#e9f2f6"
          strokeWidth="2"
          strokeOpacity={crack}
          strokeDasharray="100"
          strokeDashoffset={100 - crack * 100}
        />

        {/* Force Arrows moving from plate to weld */}
        {arrowIndices.map((i) => {
          const xStart = 100 + i * 150;
          const xEnd = 155;
          const yStart = 90;
          const yEnd = 145;
          const currentX = interpolate(flow, [0, 1], [xStart, xEnd]);
          const currentY = interpolate(flow, [0, 1], [yStart, yEnd]);
          
          return (
            <g key={`force-${i}`}>
              <line
                x1={xStart}
                y1={yStart}
                x2={currentX}
                y2={currentY}
                stroke="#e0b44c"
                strokeWidth="4"
                markerEnd="url(#arrowhead)"
                opacity={0.8}
              />
              <text
                x={xStart}
                y={yStart - 10}
                fill="#e0b44c"
                fontSize="12"
                textAnchor="middle"
                opacity={stress}
              >
                τ_shear
              </text>
            </g>
          );
        })}

        {/* Labels */}
        <line x1="150" y1="155" x2="80" y2="250" stroke="#e9f2f6" strokeWidth="1" />
        <text x="80" y="270" fill="#e9f2f6" fontSize="12" textAnchor="middle">
          SCHWEISSNAHT (KRITISCH)
        </text>
        
        <text
          x="300"
          y="370"
          fill="#d0523f"
          fontSize="16"
          textAnchor="middle"
          opacity={stress}
          fontWeight="bold"
        >
          SPANNUNGSKONZENTRATION: {(stress * 450).toFixed(0)} MPa
        </text>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            transform: `translateY(${slide}px)`,
            fontFamily: 'sans-serif',
            fontSize: 40,
            color: '#e9f2f6',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            borderLeft: '4px solid #d0523f',
            paddingLeft: '20px',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};