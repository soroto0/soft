import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const Node11CrossSectionScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const reveal = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const rebarAlpha = interpolate(frame, [span * 0.25, span * 0.5], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const forceProgress = interpolate(frame, [span * 0.45, span * 0.8], [0, 1], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const captionRise = interpolate(frame, [0, span * 0.2], [20, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Structural coordinates
  const jointX = 400;
  const jointY = 450;
  
  const rebarDots = [
    { x: 320, y: 430 }, { x: 350, y: 430 }, { x: 380, y: 430 }, { x: 410, y: 430 },
    { x: 320, y: 470 }, { x: 350, y: 470 }, { x: 380, y: 470 }, { x: 410, y: 470 },
    { x: 200, y: 250 }, { x: 230, y: 280 }, { x: 260, y: 310 }, { x: 290, y: 340 },
    { x: 450, y: 430 }, { x: 450, y: 470 }, { x: 450, y: 510 }, { x: 450, y: 550 },
  ];

  const forceVectors = [
    { x1: 150, y1: 150, x2: 300, y2: 300, label: 'F_diag' },
    { x1: 400, y1: 650, x2: 400, y2: 500, label: 'F_pier' },
    { x1: 100, y1: 450, x2: 250, y2: 450, label: 'F_chord' },
  ];

  return (
    <AbsoluteFill style={{ opacity }}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 800 800"
        fill="none"
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
            <polygon points="0 0, 10 3.5, 0 7" fill="#d0523f" />
          </marker>
        </defs>

        {/* Concrete Outlines */}
        <g opacity={reveal}>
          {/* Diagonal 11 */}
          <path
            d="M 100 100 L 350 350 L 450 450 L 200 200 Z"
            stroke="#e9f2f6"
            strokeWidth="2"
            fill="#e9f2f6"
            fillOpacity="0.05"
          />
          {/* Lower Chord */}
          <path
            d="M 50 400 L 500 400 L 500 500 L 50 500 Z"
            stroke="#e9f2f6"
            strokeWidth="2"
            fill="#e9f2f6"
            fillOpacity="0.05"
          />
          {/* Northern Pier */}
          <path
            d="M 400 400 L 500 400 L 500 700 L 400 700 Z"
            stroke="#e9f2f6"
            strokeWidth="2"
            fill="#e9f2f6"
            fillOpacity="0.05"
          />
        </g>

        {/* Rebar Grid */}
        <g opacity={rebarAlpha}>
          {rebarDots.map((dot, i) => (
            <circle
              key={`rebar-${i}`}
              cx={dot.x}
              cy={dot.y}
              r="3"
              fill="#e0b44c"
            />
          ))}
          <line x1="150" y1="150" x2="400" y2="400" stroke="#e0b44c" strokeWidth="1" strokeDasharray="5 5" />
          <line x1="50" y1="450" x2="500" y2="450" stroke="#e0b44c" strokeWidth="1" strokeDasharray="5 5" />
          <line x1="450" y1="400" x2="450" y2="700" stroke="#e0b44c" strokeWidth="1" strokeDasharray="5 5" />
        </g>

        {/* Interface Labels */}
        <g opacity={reveal}>
          <text x="180" y="160" fill="#e9f2f6" fontSize="14" fontFamily="monospace">DIAGONALE 11</text>
          <text x="80" y="530" fill="#e9f2f6" fontSize="14" fontFamily="monospace">UNTERGURT</text>
          <text x="510" y="650" fill="#e9f2f6" fontSize="14" fontFamily="monospace">PFEILER NORD</text>
        </g>

        {/* Force Vectors */}
        <g opacity={forceProgress}>
          {forceVectors.map((v, i) => {
            const curX2 = v.x1 + (v.x2 - v.x1) * forceProgress;
            const curY2 = v.y1 + (v.y2 - v.y1) * forceProgress;
            return (
              <g key={`force-${i}`}>
                <line
                  x1={v.x1}
                  y1={v.y1}
                  x2={curX2}
                  y2={curY2}
                  stroke="#d0523f"
                  strokeWidth="4"
                  markerEnd="url(#arrowhead)"
                />
                <text
                  x={v.x1 - 10}
                  y={v.y1 - 10}
                  fill="#d0523f"
                  fontSize="16"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {v.label}
                </text>
              </g>
            );
          })}
        </g>

        {/* Joint Marker */}
        <circle
          cx={jointX}
          cy={jointY}
          r={10 * reveal}
          stroke="#e0b44c"
          strokeWidth="2"
          fill="none"
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
            fontFamily: 'monospace',
            fontSize: 42,
            letterSpacing: '0.1em',
            transform: `translateY(${captionRise}px)`,
            opacity: reveal,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};