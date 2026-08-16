import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const StatischeLastannahmeCp3Scene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const { width, height, fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const windProgress = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const steelReveal = interpolate(frame, [span * 0.3, span * 0.7], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const captionSlide = interpolate(frame, [0, span * 0.2], [40, 0], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const arrowIndices = [0, 1, 2, 3, 4, 5, 6];
  const slabX = width * 0.55;
  const slabWidth = width * 0.12;
  const slabHeight = height * 0.6;
  const slabY = height * 0.2;

  return (
    <AbsoluteFill style={{ opacity }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <pattern id="hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="10" stroke="#e9f2f6" strokeWidth="0.5" opacity="0.3" />
          </pattern>
        </defs>

        {/* Concrete Slab Section */}
        <rect
          x={slabX}
          y={slabY}
          width={slabWidth}
          height={slabHeight}
          fill="#5d6a73"
          stroke="#e9f2f6"
          strokeWidth="2"
        />
        <rect
          x={slabX}
          y={slabY}
          width={slabWidth}
          height={slabHeight}
          fill="url(#hatch)"
        />

        {/* Reinforcement Layer (Steel) */}
        <line
          x1={slabX + slabWidth / 2}
          y1={slabY + slabHeight * (1 - steelReveal)}
          x2={slabX + slabWidth / 2}
          y2={slabY + slabHeight}
          stroke="#e0b44c"
          strokeWidth="4"
          strokeDasharray="8 4"
        />

        {/* Wind Arrows (Static Pressure) */}
        {arrowIndices.map((i) => {
          const yPos = slabY + (slabHeight / (arrowIndices.length - 1)) * i;
          const arrowLength = width * 0.15;
          const startX = slabX - arrowLength - 20 + (1 - windProgress) * -30;
          const endX = slabX - 10;
          
          return (
            <g key={i} opacity={windProgress}>
              <line
                x1={startX}
                y1={yPos}
                x2={endX}
                y2={yPos}
                stroke="#e9f2f6"
                strokeWidth="3"
              />
              <path
                d={`M ${endX} ${yPos} L ${endX - 15} ${yPos - 8} L ${endX - 15} ${yPos + 8} Z`}
                fill="#e9f2f6"
              />
            </g>
          );
        })}

        {/* Labels and Leader Lines */}
        <g opacity={windProgress}>
          <text
            x={slabX - width * 0.15}
            y={slabY - 20}
            fill="#e9f2f6"
            fontSize="22"
            fontFamily="monospace"
            textAnchor="middle"
          >
            WINDLAST (101 km/h)
          </text>
          <text
            x={slabX - 20}
            y={slabY + slabHeight + 30}
            fill="#e9f2f6"
            fontSize="18"
            fontFamily="monospace"
            textAnchor="end"
          >
            LUVSEITE
          </text>
        </g>

        <g opacity={steelReveal}>
          <line
            x1={slabX + slabWidth / 2}
            y1={slabY + slabHeight / 2}
            x2={slabX + slabWidth + 60}
            y2={slabY + slabHeight / 2 - 40}
            stroke="#e0b44c"
            strokeWidth="1.5"
          />
          <text
            x={slabX + slabWidth + 70}
            y={slabY + slabHeight / 2 - 40}
            fill="#e0b44c"
            fontSize="20"
            fontFamily="monospace"
            alignmentBaseline="middle"
          >
            ZENTRALE BEWEHRUNG
          </text>
        </g>

        <text
          x={slabX + slabWidth / 2}
          y={slabY + slabHeight + 40}
          fill="#8a949b"
          fontSize="20"
          fontFamily="monospace"
          textAnchor="middle"
        >
          BETONSCHALE (CP3)
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
            fontFamily: 'sans-serif',
            fontSize: 42,
            fontWeight: 300,
            letterSpacing: '0.05em',
            transform: `translateY(${captionSlide}px)`,
            opacity: interpolate(frame, [0, span * 0.1], [0, 1], { extrapolateRight: 'clamp' }),
          }}
        >
          {p.title}
        </div>
      )}
    </AbsoluteFill>
  );
};