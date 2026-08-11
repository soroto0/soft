import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const LineToSquareMappingScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const lineAnim = interpolate(frame, [0, span * 0.2], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const squareAnim = interpolate(frame, [span * 0.15, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const mapAnim = interpolate(frame, [span * 0.3, span * 0.85], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textAnim = interpolate(frame, [span * 0.5, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const points = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  return (
    <AbsoluteFill style={{ opacity }}>
      <svg width={width} height={height} viewBox="0 0 1000 1000">
        {/* 1D Segment */}
        <line
          x1={200}
          y1={200}
          x2={200 + 600 * lineAnim}
          y2={200}
          stroke="#e9f2f6"
          strokeWidth={3}
        />
        {ticks.map((t) => (
          <g key={`tick-${t}`} opacity={lineAnim}>
            <line
              x1={200 + t * 600}
              y1={190}
              x2={200 + t * 600}
              y2={210}
              stroke="#e9f2f6"
              strokeWidth={2}
            />
            <text
              x={200 + t * 600}
              y={175}
              fill="#e9f2f6"
              fontSize={18}
              textAnchor="middle"
              fontFamily="serif"
            >
              {t}
            </text>
          </g>
        ))}
        <text
          x={500}
          y={140}
          fill="#e9f2f6"
          fontSize={22}
          textAnchor="middle"
          opacity={lineAnim}
          fontFamily="serif"
          fontStyle="italic"
        >
          Segmento L = 1
        </text>

        {/* 2D Square */}
        <rect
          x={350}
          y={450}
          width={300}
          height={300}
          stroke="#e9f2f6"
          strokeWidth={2}
          fill="none"
          opacity={squareAnim * 0.3}
        />
        {gridLines.map((g) => (
          <React.Fragment key={`grid-${g}`}>
            <line
              x1={350}
              y1={450 + g * 300}
              x2={650}
              y2={450 + g * 300}
              stroke="#e9f2f6"
              strokeWidth={1}
              opacity={squareAnim * 0.2}
            />
            <line
              x1={350 + g * 300}
              y1={450}
              x2={350 + g * 300}
              y2={750}
              stroke="#e9f2f6"
              strokeWidth={1}
              opacity={squareAnim * 0.2}
            />
          </React.Fragment>
        ))}
        <text
          x={500}
          y={790}
          fill="#e9f2f6"
          fontSize={22}
          textAnchor="middle"
          opacity={squareAnim}
          fontFamily="serif"
          fontStyle="italic"
        >
          Área A = 1
        </text>

        {/* Mapping Threads */}
        {points.map((i) => {
          const sourceX = 200 + (i / 19) * 600;
          const sourceY = 200;
          
          // Schematic Cantor mapping: interleave bits/positions
          // We'll map them to a 4x5 grid in the square
          const row = Math.floor(i / 4);
          const col = i % 4;
          const targetX = 350 + (col / 3) * 300;
          const targetY = 450 + (row / 4) * 300;

          const currentX = interpolate(mapAnim, [0, 1], [sourceX, targetX]);
          const currentY = interpolate(mapAnim, [0, 1], [sourceY, targetY]);

          return (
            <g key={`thread-${i}`}>
              <line
                x1={sourceX}
                y1={sourceY}
                x2={currentX}
                y2={currentY}
                stroke="#e0b44c"
                strokeWidth={1}
                opacity={mapAnim * 0.6}
              />
              <circle
                cx={currentX}
                cy={currentY}
                r={3}
                fill="#d0523f"
                opacity={mapAnim}
              />
            </g>
          );
        })}

        {/* Mathematical Notation */}
        <text
          x={500}
          y={400}
          fill="#e0b44c"
          fontSize={28}
          textAnchor="middle"
          opacity={textAnim}
          fontFamily="serif"
        >
          ƒ: [0, 1] → [0, 1]²
        </text>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: 80,
            width: '100%',
            textAlign: 'center',
            color: '#e9f2f6',
            fontSize: 42,
            fontFamily: 'serif',
            opacity: textAnim,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};