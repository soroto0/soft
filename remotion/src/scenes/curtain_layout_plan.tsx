import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const CurtainLayoutPlanScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const drawFootprint = interpolate(frame, [0, span * 0.2], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const drawHoles = interpolate(frame, [span * 0.15, span * 0.7], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const drawCurtain = interpolate(frame, [span * 0.5, span * 0.9], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textRise = interpolate(frame, [0, span * 0.2], [20, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const curtainAlpha = interpolate(frame, [span * 0.6, span * 0.95], [0, 0.25], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const rows = [
    { id: 'A', y: 120, label: 'REIHE A (STROMALF)' },
    { id: 'B', y: 160, label: 'REIHE B (ZENTRAL)' },
    { id: 'C', y: 200, label: 'REIHE C (STROMLAB)' },
  ];

  const holeIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const scaleTicks = [0, 10, 20, 30, 40, 50];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg
        width={width * 0.8}
        height={height * 0.7}
        viewBox="0 0 800 400"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <pattern id="hatch" width="8" height="8" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="8" stroke="#e0b44c" strokeWidth="1" />
          </pattern>
        </defs>

        {/* Dam Footprint Outline */}
        <rect
          x="80"
          y="60"
          width="640"
          height="280"
          fill="none"
          stroke="#e9f2f6"
          strokeWidth="1.5"
          strokeDasharray="8 4"
          opacity={drawFootprint * 0.4}
        />
        <text x="85" y="55" fill="#e9f2f6" fontSize="12" opacity={drawFootprint * 0.6}>
          GRUNDRISS DAMMFUSS (PROJEKTIERT)
        </text>

        {/* Grout Curtain Shading */}
        <rect
          x="120"
          y="120"
          width={560 * drawCurtain}
          height="80"
          fill="url(#hatch)"
          opacity={curtainAlpha}
        />

        {/* Injection Rows */}
        {rows.map((row, rIdx) => (
          <g key={row.id}>
            <line
              x1="120"
              y1={row.y}
              x2={120 + 560 * drawHoles}
              y2={row.y}
              stroke="#e9f2f6"
              strokeWidth="0.5"
              strokeDasharray="2 2"
              opacity={0.5}
            />
            <text
              x="110"
              y={row.y + 4}
              fill="#e9f2f6"
              fontSize="10"
              textAnchor="end"
              opacity={drawHoles}
            >
              {row.label}
            </text>
            {holeIndices.map((hIdx) => {
              const holeDelay = (rIdx * 0.1) + (hIdx * 0.04);
              const hOp = interpolate(drawHoles, [holeDelay, holeDelay + 0.1], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              });
              return (
                <circle
                  key={hIdx}
                  cx={120 + hIdx * 50.9}
                  cy={row.y}
                  r="4"
                  fill={hOp > 0.8 ? "#e0b44c" : "none"}
                  stroke="#e9f2f6"
                  strokeWidth="1"
                  opacity={hOp}
                />
              );
            })}
          </g>
        ))}

        {/* Scale Axis */}
        <g transform="translate(120, 320)">
          <line x1="0" y1="0" x2="560" y2="0" stroke="#e9f2f6" strokeWidth="1" />
          {scaleTicks.map((tick) => (
            <g key={tick} transform={`translate(${tick * 11.2}, 0)`}>
              <line x1="0" y1="0" x2="0" y2="8" stroke="#e9f2f6" strokeWidth="1" />
              <text y="22" fill="#e9f2f6" fontSize="10" textAnchor="middle" opacity={0.7}>
                {tick}m
              </text>
            </g>
          ))}
          <text x="565" y="4" fill="#e9f2f6" fontSize="10" opacity={0.7}>LÄNGE</text>
        </g>

        {/* Technical Annotations */}
        <g opacity={drawCurtain}>
          <line x1="700" y1="120" x2="700" y2="200" stroke="#e0b44c" strokeWidth="1" />
          <line x1="695" y1="120" x2="705" y2="120" stroke="#e0b44c" strokeWidth="1" />
          <line x1="695" y1="200" x2="705" y2="200" stroke="#e0b44c" strokeWidth="1" />
          <text x="715" y="165" fill="#e0b44c" fontSize="11" transform="rotate(90, 715, 165)">
            SCHLEIERBREITE: 8.50m
          </text>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '8%',
            width: '100%',
            textAlign: 'center',
            fontFamily: 'monospace',
            fontSize: 32,
            letterSpacing: '2px',
            color: '#e9f2f6',
            opacity: drawFootprint,
            transform: `translateY(${textRise}px)`,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};