import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ChemicalInjectionFlowScene: React.FC<SceneProps> = (p) => {
  const { width, height, fps } = useVideoConfig();
  const frame = useCurrentFrame();

  const totalFrames = p.dur * fps;
  const opacity = p.enter * p.exit;

  // Animation 1: Gas flow dash offset
  const dashOffset = interpolate(frame, [0, fps], [0, -40], {
    extrapolateRight: 'extend',
  });

  // Animation 2: Rising bubbles (deterministic loop)
  const bubbleProgress = (i: number) => {
    const startFrame = (i * (totalFrames / 5)) % totalFrames;
    return interpolate((frame - startFrame + totalFrames) % totalFrames, [0, totalFrames * 0.4], [0, 1], {
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.quad),
    });
  };

  // Animation 3: Reaction pulse intensity
  const reactionPulse = interpolate(
    Math.sin((frame / fps) * Math.PI * 2),
    [-1, 1],
    [0.3, 0.9]
  );

  const vWidth = width * 0.25;
  const vHeight = height * 0.6;
  const vX = (width - vWidth) / 2;
  const vY = (height - vHeight) / 2;

  const nozzleX = vX + vWidth / 2;
  const nozzleY = vY + vHeight * 0.75;

  return (
    <AbsoluteFill style={{ opacity }}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ fill: 'none' }}
      >
        {/* Vessel Outline */}
        <rect
          x={vX}
          y={vY}
          width={vWidth}
          height={vHeight}
          rx={vWidth * 0.1}
          stroke="#e9f2f6"
          strokeWidth="2"
        />

        {/* Acid Bath */}
        <rect
          x={vX + 2}
          y={vY + vHeight * 0.3}
          width={vWidth - 4}
          height={vHeight * 0.7 - 2}
          rx={vWidth * 0.05}
          fill="#e9f2f6"
          fillOpacity="0.15"
        />

        {/* Ammonia Injection Pipe */}
        <path
          d={`M ${vX - 40} ${vY + 100} L ${nozzleX} ${vY + 100} L ${nozzleX} ${nozzleY}`}
          stroke="#e9f2f6"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Moving Gas Stream inside pipe */}
        <path
          d={`M ${vX - 40} ${vY + 100} L ${nozzleX} ${vY + 100} L ${nozzleX} ${nozzleY}`}
          stroke="#e0b44c"
          strokeWidth="2"
          strokeDasharray="10 10"
          strokeDashoffset={dashOffset}
        />

        {/* Reaction Zone */}
        <circle
          cx={nozzleX}
          cy={nozzleY}
          r={25}
          fill="#d0523f"
          fillOpacity={reactionPulse * 0.4}
        />
        <circle
          cx={nozzleX}
          cy={nozzleY}
          r={10}
          fill="#d0523f"
          fillOpacity={reactionPulse}
        />

        {/* Rising Ammonia Bubbles */}
        {[0, 1, 2, 3, 4].map((i) => {
          const progress = bubbleProgress(i);
          const bY = nozzleY - progress * (vHeight * 0.4);
          const bX = nozzleX + Math.sin(i + progress * 5) * 20;
          const bOpacity = interpolate(progress, [0, 0.1, 0.8, 1], [0, 1, 1, 0]);
          return (
            <circle
              key={i}
              cx={bX}
              cy={bY}
              r={4 + i}
              fill="#e0b44c"
              fillOpacity={bOpacity}
            />
          );
        })}

        {/* Labels */}
        <text
          x={vX + vWidth + 20}
          y={vY + 40}
          fill="#e9f2f6"
          fontSize="14"
          fontFamily="monospace"
        >
          VESSEL 83-D
        </text>
        <text
          x={vX + vWidth + 20}
          y={vY + 60}
          fill="#e9f2f6"
          fontSize="10"
          fontFamily="monospace"
          opacity="0.6"
        >
          STAINLESS STEEL 316L
        </text>
      </svg>

      {p.title && (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            width: '100%',
            textAlign: 'center',
            color: '#e9f2f6',
            fontFamily: 'monospace',
            fontSize: 24,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
          }}
        >
          {p.title}
        </div>
      )}
    </AbsoluteFill>
  );
};