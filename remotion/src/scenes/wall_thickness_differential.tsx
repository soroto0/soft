import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const WallThicknessDifferentialScene: React.FC<SceneProps> = (p) => {
  const { width, height, fps } = useVideoConfig();
  const frame = useCurrentFrame();

  const totalFrames = fps * p.dur;
  const animStart = totalFrames * 0.2;
  const animEnd = totalFrames * 0.8;

  const progress = interpolate(frame, [animStart, animEnd], [0, 1], {
    easing: Easing.bezier(0.4, 0, 0.2, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const wallWidthPx = width * 0.4;
  const wallHeightPx = height * 0.3;
  const corrosionMaxPx = (3 / 25) * wallWidthPx;
  const currentCorrosionPx = progress * corrosionMaxPx;
  const remainingSteelPx = wallWidthPx - currentCorrosionPx;

  const centerX = width / 2;
  const centerY = height / 2;
  const wallX = centerX - wallWidthPx / 2;
  const wallY = centerY - wallHeightPx / 2;

  const textOpacity = interpolate(frame, [0, fps * 0.5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const warningOpacity = interpolate(progress, [0.7, 1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: '#07090c', opacity: p.enter * p.exit, fontFamily: 'monospace', color: '#e9f2f6' }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Nominal Outline */}
        <rect
          x={wallX}
          y={wallY}
          width={wallWidthPx}
          height={wallHeightPx}
          fill="none"
          stroke="#e9f2f6"
          strokeWidth="2"
          strokeDasharray="8 4"
          opacity={0.3}
        />

        {/* Remaining Steel */}
        <rect
          x={wallX}
          y={wallY}
          width={remainingSteelPx}
          height={wallHeightPx}
          fill="#e9f2f6"
          opacity={0.8}
        />

        {/* Acid / Corrosion Layer */}
        <rect
          x={wallX + remainingSteelPx}
          y={wallY}
          width={currentCorrosionPx}
          height={wallHeightPx}
          fill="#d0523f"
          opacity={0.6}
        />

        {/* Dimension Lines: Nominal */}
        <g opacity={textOpacity}>
          <line
            x1={wallX}
            y1={wallY - 40}
            x2={wallX + wallWidthPx}
            y2={wallY - 40}
            stroke="#e9f2f6"
            strokeWidth="2"
          />
          <line x1={wallX} y1={wallY - 50} x2={wallX} y2={wallY - 30} stroke="#e9f2f6" strokeWidth="2" />
          <line x1={wallX + wallWidthPx} y1={wallY - 50} x2={wallX + wallWidthPx} y2={wallY - 30} stroke="#e9f2f6" strokeWidth="2" />
          <text
            x={wallX + wallWidthPx / 2}
            y={wallY - 60}
            fill="#e9f2f6"
            fontSize="20"
            textAnchor="middle"
          >
            25mm NOMINAL
          </text>
        </g>

        {/* Dimension Lines: Net */}
        <g opacity={progress}>
          <line
            x1={wallX}
            y1={wallY + wallHeightPx + 40}
            x2={wallX + remainingSteelPx}
            y2={wallY + wallHeightPx + 40}
            stroke="#e0b44c"
            strokeWidth="2"
          />
          <line x1={wallX} y1={wallY + wallHeightPx + 30} x2={wallX} y2={wallY + wallHeightPx + 50} stroke="#e0b44c" strokeWidth="2" />
          <line x1={wallX + remainingSteelPx} y1={wallY + wallHeightPx + 30} x2={wallX + remainingSteelPx} y2={wallY + wallHeightPx + 50} stroke="#e0b44c" strokeWidth="2" />
          <text
            x={wallX + remainingSteelPx / 2}
            y={wallY + wallHeightPx + 70}
            fill="#e0b44c"
            fontSize="20"
            textAnchor="middle"
          >
            {interpolate(progress, [0, 1], [25, 22]).toFixed(1)}mm CALCULATED
          </text>
        </g>

        {/* Corrosion Label */}
        <text
          x={wallX + wallWidthPx - currentCorrosionPx / 2}
          y={wallY + wallHeightPx / 2}
          fill="#07090c"
          fontSize="14"
          fontWeight="bold"
          textAnchor="middle"
          transform={`rotate(90, ${wallX + wallWidthPx - currentCorrosionPx / 2}, ${wallY + wallHeightPx / 2})`}
          opacity={warningOpacity}
        >
          -3mm ACID EROSION
        </text>
      </svg>

      {p.title && (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            width: '100%',
            textAlign: 'center',
            fontSize: 32,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: '#d0523f',
            opacity: warningOpacity,
          }}
        >
          {p.title}
        </div>
      )}
    </AbsoluteFill>
  );
};