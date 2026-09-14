import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const BallastTankErrorScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const opacity = p.enter * p.exit;

  const drawProgress = interpolate(frame, [0, span * 0.25], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const errorReveal = interpolate(frame, [span * 0.3, span * 0.7], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [span * 0.5, span * 0.8], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const tanks = [1, 2, 3, 4, 5];
  const tankWidth = 120;
  const tankHeight = 140;
  const startX = 100;
  const baseY = 280;
  const assumedLevelY = baseY - 100;
  const actualLevelY = baseY - 40;

  return (
    <AbsoluteFill
      style={{
        opacity,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <svg
        width="80%"
        viewBox="0 0 800 450"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5b7f9c" stopOpacity="0.6" />
            <stop offset="1" stopColor="#5b7f9c" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="errorGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e0b44c" stopOpacity="0.8" />
            <stop offset="1" stopColor="#e0b44c" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        {/* Hull Bottom Line */}
        <path
          d={`M ${startX - 40} ${baseY + 20} L ${startX + 640} ${baseY + 20}`}
          stroke="#e9f2f6"
          strokeWidth="2"
          fill="none"
          strokeDasharray={800}
          strokeDashoffset={800 * (1 - drawProgress)}
        />

        {/* Tanks Loop */}
        {tanks.map((t, i) => {
          const x = startX + i * tankWidth;
          return (
            <g key={t}>
              {/* Tank Structure */}
              <rect
                x={x}
                y={baseY - tankHeight}
                width={tankWidth}
                height={tankHeight}
                fill="none"
                stroke="#e9f2f6"
                strokeWidth="1.5"
                opacity={drawProgress}
              />
              
              {/* Actual Water Level */}
              <rect
                x={x + 2}
                y={actualLevelY}
                width={tankWidth - 4}
                height={baseY - actualLevelY}
                fill="url(#waterGrad)"
                opacity={drawProgress}
              />

              {/* Missing Volume (Orange) */}
              <rect
                x={x + 2}
                y={assumedLevelY}
                width={tankWidth - 4}
                height={(actualLevelY - assumedLevelY) * errorReveal}
                fill="url(#errorGrad)"
                opacity={errorReveal}
              />

              {/* Tank Label */}
              <text
                x={x + tankWidth / 2}
                y={baseY + 50}
                fill="#e9f2f6"
                fontSize="14"
                textAnchor="middle"
                fontFamily="monospace"
                opacity={labelFade}
              >
                TANK {t}
              </text>
            </g>
          );
        })}

        {/* Assumed Level Line (Dashed Gray) */}
        <line
          x1={startX - 20}
          y1={assumedLevelY}
          x2={startX + 620}
          y2={assumedLevelY}
          stroke="#8a949b"
          strokeWidth="2"
          strokeDasharray="8 6"
          opacity={drawProgress}
        />

        {/* Annotations */}
        <g opacity={labelFade}>
          <line
            x1={startX + 630}
            y1={assumedLevelY}
            x2={startX + 660}
            y2={assumedLevelY}
            stroke="#e9f2f6"
            strokeWidth="1"
          />
          <text
            x={startX + 665}
            y={assumedLevelY + 5}
            fill="#e9f2f6"
            fontSize="12"
            fontFamily="sans-serif"
          >
            ANGENOMMENER STAND
          </text>

          <line
            x1={startX + 630}
            y1={actualLevelY}
            x2={startX + 660}
            y2={actualLevelY}
            stroke="#e9f2f6"
            strokeWidth="1"
          />
          <text
            x={startX + 665}
            y={actualLevelY + 5}
            fill="#e9f2f6"
            fontSize="12"
            fontFamily="sans-serif"
          >
            TATSÄCHLICHER STAND
          </text>

          {/* Error Indicator Arrow */}
          <path
            d={`M ${startX - 30} ${assumedLevelY} L ${startX - 30} ${actualLevelY}`}
            stroke="#d0523f"
            strokeWidth="2"
            markerEnd="url(#arrowhead)"
          />
          <text
            x={startX - 40}
            y={(assumedLevelY + actualLevelY) / 2}
            fill="#d0523f"
            fontSize="14"
            textAnchor="end"
            fontWeight="bold"
            transform={`rotate(-90, ${startX - 40}, ${(assumedLevelY + actualLevelY) / 2})`}
          >
            FEHLMENGE
          </text>
        </g>

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
      </svg>

      {p.title ? (
        <div
          style={{
            marginTop: 40,
            fontFamily: 'sans-serif',
            fontSize: 42,
            fontWeight: 300,
            letterSpacing: '0.1em',
            color: '#e9f2f6',
            opacity: labelFade,
            borderTop: '1px solid #e9f2f6',
            paddingTop: 20,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};