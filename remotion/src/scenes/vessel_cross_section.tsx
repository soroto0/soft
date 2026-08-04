import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const VesselCrossSectionScene: React.FC<SceneProps> = (p) => {
  const { width, height, fps } = useVideoConfig();
  const frame = useCurrentFrame();

  const opacity = p.enter * p.exit;
  const vWidth = width * 0.22;
  const vHeight = height * 0.65;
  const centerX = width / 2;
  const centerY = height / 2;

  const vesselTop = centerY - vHeight / 2;
  const vesselBottom = centerY + vHeight / 2;
  const liquidLevel = vesselBottom - vHeight * 0.7;

  // Animation 1: Liquid subtle oscillation
  const liquidOscillation = interpolate(
    Math.sin((frame / fps) * 2),
    [-1, 1],
    [-2, 2]
  );

  // Animation 2: Ammonia gas flow pulse
  const gasIntensity = interpolate(
    frame % 30,
    [0, 15, 30],
    [0.4, 1, 0.4],
    { easing: Easing.bezier(0.42, 0, 0.58, 1) }
  );

  const bubbleCount = 15;
  const bubbles = Array.from({ length: bubbleCount }).map((_, i) => {
    const startFrame = (i * (p.dur * fps)) / bubbleCount;
    const duration = fps * 2;
    const progress = ((frame + startFrame) % (p.dur * fps)) / duration;
    const clampedProgress = progress > 1 ? 1 : progress;

    // Animation 3: Bubble vertical movement
    const y = interpolate(
      clampedProgress,
      [0, 1],
      [vesselBottom - 40, liquidLevel - 20],
      { extrapolateRight: 'clamp' }
    );

    const xOffset = Math.sin(i * 1.5 + clampedProgress * 5) * (vWidth * 0.3);
    const bOpacity = interpolate(clampedProgress, [0, 0.1, 0.8, 1], [0, 1, 1, 0]);
    const scale = interpolate(clampedProgress, [0, 1], [0.5, 1.2]);

    return { x: centerX + xOffset, y, bOpacity, scale, id: i };
  });

  return (
    <AbsoluteFill style={{ opacity }}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ color: '#e9f2f6' }}
      >
        {/* Vessel Shadow/Depth */}
        <path
          d={`M ${centerX - vWidth / 2} ${vesselTop + 40} L ${centerX - vWidth / 2} ${vesselBottom - 40} Q ${centerX - vWidth / 2} ${vesselBottom} ${centerX} ${vesselBottom} Q ${centerX + vWidth / 2} ${vesselBottom} ${centerX + vWidth / 2} ${vesselBottom - 40} L ${centerX + vWidth / 2} ${vesselTop + 40} Q ${centerX + vWidth / 2} ${vesselTop} ${centerX} ${vesselTop} Q ${centerX - vWidth / 2} ${vesselTop} ${centerX - vWidth / 2} ${vesselTop + 40}`}
          fill="none"
          stroke="#e9f2f6"
          strokeWidth="2"
          strokeOpacity="0.2"
        />

        {/* Acid Bath */}
        <path
          d={`M ${centerX - vWidth / 2 + 4} ${liquidLevel + liquidOscillation} L ${centerX - vWidth / 2 + 4} ${vesselBottom - 40} Q ${centerX - vWidth / 2 + 4} ${vesselBottom - 4} ${centerX} ${vesselBottom - 4} Q ${centerX + vWidth / 2 - 4} ${vesselBottom - 4} ${centerX + vWidth / 2 - 4} ${vesselBottom - 40} L ${centerX + vWidth / 2 - 4} ${liquidLevel + liquidOscillation} Z`}
          fill="#d0523f"
          fillOpacity="0.15"
        />

        {/* Vessel Outline */}
        <path
          d={`M ${centerX - vWidth / 2} ${vesselTop + 40} L ${centerX - vWidth / 2} ${vesselBottom - 40} Q ${centerX - vWidth / 2} ${vesselBottom} ${centerX} ${vesselBottom} Q ${centerX + vWidth / 2} ${vesselBottom} ${centerX + vWidth / 2} ${vesselBottom - 40} L ${centerX + vWidth / 2} ${vesselTop + 40} Q ${centerX + vWidth / 2} ${vesselTop} ${centerX} ${vesselTop} Q ${centerX - vWidth / 2} ${vesselTop} ${centerX - vWidth / 2} ${vesselTop + 40}`}
          fill="none"
          stroke="#e9f2f6"
          strokeWidth="3"
        />

        {/* Injector Pipe */}
        <path
          d={`M ${centerX - 60} ${vesselBottom + 40} L ${centerX - 20} ${vesselBottom + 40} L ${centerX - 20} ${vesselBottom - 20}`}
          fill="none"
          stroke="#e0b44c"
          strokeWidth="4"
          strokeOpacity={gasIntensity}
        />
        <path
          d={`M ${centerX + 60} ${vesselBottom + 40} L ${centerX + 20} ${vesselBottom + 40} L ${centerX + 20} ${vesselBottom - 20}`}
          fill="none"
          stroke="#e0b44c"
          strokeWidth="4"
          strokeOpacity={gasIntensity}
        />

        {/* Bubbles */}
        {bubbles.map((b) => (
          <circle
            key={b.id}
            cx={b.x}
            cy={b.y}
            r={6 * b.scale}
            fill="#e0b44c"
            fillOpacity={b.bOpacity * 0.8}
          />
        ))}

        {/* Labels */}
        <text
          x={centerX}
          y={vesselTop - 30}
          fill="#e9f2f6"
          fontSize="24"
          fontWeight="300"
          textAnchor="middle"
          style={{ letterSpacing: '2px', textTransform: 'uppercase' }}
        >
          Vessel 83-D
        </text>

        <text
          x={centerX + vWidth / 2 + 40}
          y={liquidLevel + 60}
          fill="#d0523f"
          fontSize="16"
          fontWeight="400"
          textAnchor="start"
        >
          60% NITRIC ACID
        </text>

        <text
          x={centerX}
          y={vesselBottom + 80}
          fill="#e0b44c"
          fontSize="16"
          fontWeight="400"
          textAnchor="middle"
        >
          AMMONIA GAS INJECTION (NH₃)
        </text>

        {/* Scale Indicators */}
        <line
          x1={centerX - vWidth / 2 - 40}
          y1={vesselTop}
          x2={centerX - vWidth / 2 - 40}
          y2={vesselBottom}
          stroke="#e9f2f6"
          strokeWidth="1"
          strokeOpacity="0.4"
        />
        <text
          x={centerX - vWidth / 2 - 50}
          y={centerY}
          fill="#e9f2f6"
          fontSize="14"
          textAnchor="end"
          transform={`rotate(-90, ${centerX - vWidth / 2 - 50}, ${centerY})`}
          style={{ opacity: 0.5 }}
        >
          20 FT
        </text>
      </svg>

      {/* Main Caption */}
      {p.title && (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            width: '100%',
            textAlign: 'center',
            color: '#e9f2f6',
            fontSize: 32,
            fontFamily: 'monospace',
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
          }}
        >
          {p.title}
        </div>
      )}
    </AbsoluteFill>
  );
};