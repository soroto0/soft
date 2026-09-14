import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const CostTimeComparisonScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const costValue = Math.floor(
    interpolate(frame, [span * 0.1, span * 0.6], [0, 200], {
      extrapolateRight: 'clamp',
    })
  );

  const hatchProgress = interpolate(frame, [span * 0.2, span * 0.85], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateRight: 'clamp',
  });

  const entryOffset = interpolate(frame, [0, span * 0.2], [30, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateRight: 'clamp',
  });

  const costTicks = [0, 50, 100, 150, 200];
  const calendarDays = [0, 1, 2];

  return (
    <AbsoluteFill
      style={{
        opacity,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        transform: `translateY(${entryOffset}px)`,
      }}
    >
      <svg
        width={width * 0.8}
        height={height * 0.6}
        viewBox="0 0 600 300"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <pattern
            id="honeyHatch"
            patternUnits="userSpaceOnUse"
            width="10"
            height="10"
            patternTransform="rotate(45)"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="10"
              stroke="#e0b44c"
              strokeWidth="4"
            />
          </pattern>
        </defs>

        {/* Cost Section */}
        <g transform="translate(50, 50)">
          <text x="0" y="-15" fill="#e9f2f6" fontSize="14" fontWeight="bold">
            ESTIMATED COST
          </text>
          <line x1="0" y1="0" x2="0" y2="150" stroke="#e9f2f6" strokeWidth="1" />
          {costTicks.map((tick) => (
            <g key={`tick-${tick}`} transform={`translate(0, ${150 - (tick / 200) * 150})`}>
              <line x1="0" y1="0" x2="5" y2="0" stroke="#e9f2f6" strokeWidth="1" />
              <text x="-10" y="4" fill="#e9f2f6" fontSize="10" textAnchor="end">
                ${tick}
              </text>
            </g>
          ))}
          <rect
            x="10"
            y={150 - (costValue / 200) * 150}
            width="40"
            height={(costValue / 200) * 150}
            fill="#d0523f"
          />
          <text
            x="30"
            y={140 - (costValue / 200) * 150}
            fill="#d0523f"
            fontSize="24"
            fontWeight="bold"
            textAnchor="middle"
          >
            ${costValue}
          </text>
        </g>

        {/* Time Section */}
        <g transform="translate(320, 50)">
          <text x="0" y="-15" fill="#e9f2f6" fontSize="14" fontWeight="bold">
            REFINISHING DURATION
          </text>
          {calendarDays.map((day) => (
            <g key={`day-${day}`} transform={`translate(${day * 70}, 0)`}>
              <rect
                x="0"
                y="0"
                width="60"
                height="80"
                fill="none"
                stroke="#e9f2f6"
                strokeWidth="2"
              />
              <rect
                x="0"
                y="0"
                width="60"
                height="20"
                fill="#e9f2f6"
                opacity="0.2"
              />
              <text x="30" y="50" fill="#e9f2f6" fontSize="18" textAnchor="middle">
                D{day + 1}
              </text>
            </g>
          ))}
          
          {/* Hatching Overlay */}
          <rect
            x="0"
            y="0"
            width={200 * hatchProgress}
            height="80"
            fill="url(#honeyHatch)"
            style={{ mixBlendMode: 'screen' }}
          />
          
          <text x="0" y="110" fill="#e0b44c" fontSize="12">
            PHASE: {hatchProgress < 0.33 ? 'PREP' : hatchProgress < 0.66 ? 'COATING' : 'CURING'}
          </text>
          <text x="200" y="110" fill="#e9f2f6" fontSize="12" textAnchor="end">
            TOTAL: 72 HOURS
          </text>
          
          <line
            x1="0"
            y1="125"
            x2={200}
            y2="125"
            stroke="#e9f2f6"
            strokeWidth="1"
            strokeDasharray="4 2"
          />
          <circle cx={200 * hatchProgress} cy="125" r="4" fill="#e0b44c" />
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.15,
            fontFamily: 'monospace',
            fontSize: 42,
            color: '#e9f2f6',
            letterSpacing: '2px',
            borderTop: '2px solid #e9f2f6',
            paddingTop: 10,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};