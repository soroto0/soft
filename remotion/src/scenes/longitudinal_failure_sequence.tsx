import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const LongitudinalFailureSequenceScene: React.FC<SceneProps> = (p) => {
  const { width, height, fps } = useVideoConfig();
  const frame = useCurrentFrame();

  const durInFrames = p.dur * fps;
  const startFrame = durInFrames * 0.2;
  const crackEndFrame = durInFrames * 0.35;
  const totalExpansionEnd = durInFrames * 0.9;

  // Animation 1: Fracture propagation (Top to Bottom)
  const crackProgress = interpolate(
    frame,
    [startFrame, crackEndFrame],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    }
  );

  // Animation 2: Structural separation (Unzipping)
  const separation = interpolate(
    frame,
    [startFrame + 5, totalExpansionEnd],
    [0, 45],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.quad),
    }
  );

  // Animation 3: High-frequency stress vibration
  const vibration = interpolate(
    Math.sin(frame * 0.8),
    [-1, 1],
    [-1.5, 1.5]
  );

  const vesselWidth = width * 0.25;
  const vesselHeight = height * 0.6;
  const centerX = width / 2;
  const centerY = height / 2;

  const topY = centerY - vesselHeight / 2;
  const bottomY = centerY + vesselHeight / 2;

  const sceneOpacity = p.enter * p.exit;

  const containerStyle: React.CSSProperties = {
    backgroundColor: '#07090c',
    color: '#e9f2f6',
    fontFamily: 'monospace',
    opacity: sceneOpacity,
  };

  const lineStyle: React.CSSProperties = {
    fill: 'none',
    strokeWidth: 2,
  };

  const crackY = topY + (vesselHeight * crackProgress);

  return (
    <AbsoluteFill style={containerStyle}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ filter: 'drop-shadow(0 0 10px rgba(208, 82, 63, 0.2))' }}
      >
        {/* Left Half of Vessel */}
        <path
          d={`
            M ${centerX - separation + vibration} ${topY}
            L ${centerX - vesselWidth - separation + vibration} ${topY}
            L ${centerX - vesselWidth - separation + vibration} ${bottomY}
            L ${centerX - separation + vibration} ${bottomY}
          `}
          stroke="#e9f2f6"
          fill="none"
          strokeWidth="2"
        />

        {/* Right Half of Vessel */}
        <path
          d={`
            M ${centerX + separation - vibration} ${topY}
            L ${centerX + vesselWidth + separation - vibration} ${topY}
            L ${centerX + vesselWidth + separation - vibration} ${bottomY}
            L ${centerX + separation - vibration} ${bottomY}
          `}
          stroke="#e9f2f6"
          fill="none"
          strokeWidth="2"
        />

        {/* Longitudinal Weld Seam (Fading) */}
        <line
          x1={centerX}
          y1={topY}
          x2={centerX}
          y2={bottomY}
          stroke="#e0b44c"
          strokeDasharray="4 4"
          strokeWidth="1"
          opacity={interpolate(crackProgress, [0, 0.5], [0.6, 0])}
        />

        {/* The Failure Path (The "Unzipping" Crack) */}
        {crackProgress > 0 && (
          <>
            {/* Main Crack Line */}
            <line
              x1={centerX}
              y1={topY}
              x2={centerX}
              y2={crackY}
              stroke="#d0523f"
              strokeWidth="3"
              style={lineStyle}
            />
            {/* Inner Glow */}
            <line
              x1={centerX}
              y1={topY}
              x2={centerX}
              y2={crackY}
              stroke="#d0523f"
              strokeWidth="8"
              opacity="0.3"
              style={lineStyle}
            />
          </>
        )}

        {/* Schematic Annotations */}
        <g opacity={0.4} style={{ fontSize: 14, textAnchor: 'middle' }}>
          <text x={centerX - vesselWidth - 40} y={centerY} transform={`rotate(-90, ${centerX - vesselWidth - 40}, ${centerY})`}>
            PRESSURE BOUNDARY
          </text>
          <text x={centerX + vesselWidth + 40} y={centerY} transform={`rotate(90, ${centerX + vesselWidth + 40}, ${centerY})`}>
            LONGITUDINAL AXIS
          </text>
        </g>
      </svg>

      {p.title && (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            width: '100%',
            textAlign: 'center',
            fontSize: 32,
            fontWeight: 300,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: '#e9f2f6',
            opacity: interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: 'clamp' }),
          }}
        >
          {p.title}
        </div>
      )}
    </AbsoluteFill>
  );
};