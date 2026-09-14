import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const MaterialDensityProjectionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const gridProgress = interpolate(frame, [0, span * 0.25], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const sliceProgress = interpolate(frame, [span * 0.2, span * 0.6], [0, 1], {
    easing: Easing.out(Easing.back(1.2)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const loadPulse = interpolate(frame, [span * 0.5, span * 0.9], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textRise = interpolate(frame, [0, span * 0.2], [15, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const gridLines = [-4, -3, -2, -1, 0, 1, 2, 3, 4];
  const spacing = 40;
  const centerX = 250;
  const centerY = 180;
  const panRadius = 165;

  // Pre-calculated coordinates for slices within the pan radius
  const sliceCoords = [
    { x: 0, y: 0 },
    { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
    { x: 1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: -1, y: -1 },
    { x: 2, y: 0 }, { x: -2, y: 0 }, { x: 0, y: 2 }, { x: 0, y: -2 },
    { x: 2, y: 1 }, { x: 2, y: -1 }, { x: -2, y: 1 }, { x: -2, y: -1 },
    { x: 1, y: 2 }, { x: 1, y: -2 }, { x: -1, y: 2 }, { x: -1, y: -2 },
    { x: 3, y: 0 }, { x: -3, y: 0 }, { x: 0, y: 3 }, { x: 0, y: -3 },
    { x: 2, y: 2 }, { x: 2, y: -2 }, { x: -2, y: 2 }, { x: -2, y: -2 },
    { x: 3, y: 1 }, { x: 3, y: -1 }, { x: -3, y: 1 }, { x: -3, y: -1 },
    { x: 1, y: 3 }, { x: 1, y: -3 }, { x: -1, y: 3 }, { x: -1, y: -3 }
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 500 400" fill="none">
        {/* Pan Base Outline */}
        <circle
          cx={centerX}
          cy={centerY}
          r={panRadius}
          stroke="#e9f2f6"
          strokeWidth={2}
          strokeDasharray="4 4"
          opacity={gridProgress * 0.5}
        />
        
        <circle
          cx={centerX}
          cy={centerY}
          r={panRadius + 10}
          stroke="#e9f2f6"
          strokeWidth={1}
          opacity={gridProgress * 0.3}
        />

        {/* Engineering Grid */}
        <g opacity={gridProgress * 0.2}>
          {gridLines.map((l) => (
            <React.Fragment key={`grid-${l}`}>
              <line
                x1={centerX - 180}
                y1={centerY + l * spacing}
                x2={centerX + 180}
                y2={centerY + l * spacing}
                stroke="#e9f2f6"
                strokeWidth={0.5}
              />
              <line
                x1={centerX + l * spacing}
                y1={centerY - 180}
                x2={centerX + l * spacing}
                y2={centerY + 180}
                stroke="#e9f2f6"
                strokeWidth={0.5}
              />
            </React.Fragment>
          ))}
        </g>

        {/* Potato Slices (Load Support) */}
        {sliceCoords.map((coord, i) => {
          const x = centerX + coord.x * spacing;
          const y = centerY + coord.y * spacing;
          const delay = (Math.abs(coord.x) + Math.abs(coord.y)) * 0.05;
          const individualProgress = interpolate(sliceProgress, [delay, delay + 0.3], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });

          return (
            <g key={`slice-${i}`} opacity={individualProgress}>
              {/* Potato Slice */}
              <circle
                cx={x}
                cy={y}
                r={16}
                fill="#e0b44c"
                fillOpacity={0.15}
                stroke="#e0b44c"
                strokeWidth={1}
              />
              {/* Load Vector Dot */}
              <circle
                cx={x}
                cy={y}
                r={2 * loadPulse}
                fill="#d0523f"
              />
              {/* Support Force Arrows (Schematic) */}
              <line
                x1={x}
                y1={y - 8}
                x2={x}
                y2={y - 14 * loadPulse}
                stroke="#d0523f"
                strokeWidth={1.5}
                opacity={loadPulse}
              />
            </g>
          );
        })}

        {/* Annotations */}
        <g opacity={gridProgress}>
          <text x={centerX + panRadius + 15} y={centerY} fill="#e9f2f6" fontSize={10} fontFamily="monospace">
            R = 165mm
          </text>
          <text x={centerX - 180} y={centerY - 160} fill="#e9f2f6" fontSize={10} fontFamily="monospace">
            GRID_UNIT: 40mm
          </text>
          <text x={centerX - 180} y={centerY - 145} fill="#e0b44c" fontSize={10} fontFamily="monospace">
            LOAD_POINTS: {sliceCoords.length}
          </text>
          
          {/* Dimension Line */}
          <line x1={centerX} y1={centerY} x2={centerX + panRadius} y2={centerY} stroke="#e9f2f6" strokeWidth={1} />
          <path d={`M ${centerX + panRadius - 5} ${centerY - 3} L ${centerX + panRadius} ${centerY} L ${centerX + panRadius - 5} ${centerY + 3}`} stroke="#e9f2f6" strokeWidth={1} fill="none" />
        </g>

        {/* Uniformity Indicator */}
        <rect
          x={centerX - 100}
          y={centerY + panRadius + 20}
          width={200}
          height={4}
          fill="#e9f2f6"
          opacity={0.2}
        />
        <rect
          x={centerX - 100}
          y={centerY + panRadius + 20}
          width={200 * loadPulse}
          height={4}
          fill="#e0b44c"
        />
        <text
          x={centerX}
          y={centerY + panRadius + 40}
          fill="#e9f2f6"
          fontSize={9}
          textAnchor="middle"
          fontFamily="monospace"
          opacity={loadPulse}
        >
          DISTRIBUCIÓN: NOMINAL 100%
        </text>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            transform: `translateY(${textRise}px)`,
            fontFamily: 'sans-serif',
            fontSize: 32,
            fontWeight: 600,
            color: '#e9f2f6',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};