import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const LastumleitungHorizontalScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const beamAppear = interpolate(frame, [0, span * 0.2], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const loadProgress = interpolate(frame, [span * 0.2, span * 0.5], [0, 1], {
    easing: Easing.bezier(0.33, 1, 0.68, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const redirectProgress = interpolate(frame, [span * 0.45, span * 0.85], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleRise = interpolate(frame, [0, span * 0.2], [20, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const wallX = [120, 620];
  const wallWidth = 60;
  const beamY = 240;
  const beamHeight = 24;
  const beamWidth = wallX[1] - wallX[0] + wallWidth;

  const verticalLoads = [300, 400, 500];

  return (
    <AbsoluteFill
      style={{
        opacity,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg
        width={width * 0.8}
        height={height * 0.7}
        viewBox="0 0 800 450"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="beamGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e0b44c" />
            <stop offset="0.5" stopColor="#c0942c" />
            <stop offset="1" stopColor="#e0b44c" />
          </linearGradient>
        </defs>

        {/* Side Walls */}
        {wallX.map((x, i) => (
          <g key={`wall-${i}`}>
            <rect
              x={x}
              y={100}
              width={wallWidth}
              height={300}
              fill="#5d6a73"
              stroke="#e9f2f6"
              strokeWidth={1}
            />
            <text
              x={x + wallWidth / 2}
              y={420}
              fill="#e9f2f6"
              fontSize={14}
              textAnchor="middle"
              fontFamily="monospace"
            >
              WAND
            </text>
          </g>
        ))}

        {/* Horizontal Steel Beam */}
        <rect
          x={wallX[0]}
          y={beamY}
          width={beamWidth * beamAppear}
          height={beamHeight}
          fill="url(#beamGrad)"
          stroke="#e9f2f6"
          strokeWidth={1.5}
        />
        <text
          x={400}
          y={beamY + 45}
          fill="#e0b44c"
          fontSize={16}
          fontWeight="bold"
          textAnchor="middle"
          opacity={beamAppear}
          fontFamily="sans-serif"
        >
          STAHLTRÄGER (HEB)
        </text>

        {/* Vertical Load Arrows */}
        {verticalLoads.map((x, i) => {
          const yEnd = beamY;
          const yStart = 50;
          const currentY = yStart + (yEnd - yStart) * loadProgress;
          return (
            <g key={`load-${i}`} opacity={loadProgress}>
              <line
                x1={x}
                y1={yStart}
                x2={x}
                y2={currentY}
                stroke="#d0523f"
                strokeWidth={3}
              />
              <polygon
                points={`${x - 6},${currentY - 10} ${x + 6},${currentY - 10} ${x},${currentY}`}
                fill="#d0523f"
              />
            </g>
          );
        })}
        <text
          x={400}
          y={40}
          fill="#d0523f"
          fontSize={18}
          textAnchor="middle"
          opacity={loadProgress}
          fontFamily="sans-serif"
        >
          VERTIKALE LAST
        </text>

        {/* Horizontal Redirection Arrows */}
        {[
          { start: 400, end: wallX[0] + wallWidth, dir: -1 },
          { start: 400, end: wallX[1], dir: 1 },
        ].map((arrow, i) => {
          const currentX = arrow.start + (arrow.end - arrow.start) * redirectProgress;
          return (
            <g key={`redirect-${i}`} opacity={redirectProgress}>
              <line
                x1={arrow.start}
                y1={beamY + beamHeight / 2}
                x2={currentX}
                y2={beamY + beamHeight / 2}
                stroke="#e9f2f6"
                strokeWidth={4}
                strokeDasharray="8 4"
              />
              <polygon
                points={`${currentX},${beamY + beamHeight / 2 - 8} ${currentX},${beamY + beamHeight / 2 + 8} ${currentX + 12 * arrow.dir},${beamY + beamHeight / 2}`}
                fill="#e9f2f6"
              />
            </g>
          );
        })}
      </svg>

      {p.title ? (
        <div
          style={{
            marginTop: 40,
            fontFamily: 'sans-serif',
            fontSize: 42,
            fontWeight: 700,
            color: '#e9f2f6',
            letterSpacing: '0.1em',
            transform: `translateY(${titleRise}px)`,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};