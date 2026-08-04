import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const EnergyStorageComparisonScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const opacity = p.enter * p.exit;

  // Animation 1: Gauge needle movement (0 to 30% of duration)
  const gaugeRotation = interpolate(frame, [0, span * 0.3], [-120, 60], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Animation 2: Water energy bar growth (10% to 40% of duration)
  const waterHeight = interpolate(frame, [span * 0.1, span * 0.4], [0, 4], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Animation 3: Gas energy bar growth (20% to 90% of duration)
  const gasHeight = interpolate(frame, [span * 0.2, span * 0.9], [0, 176], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Animation 4: Text and labels fade in (60% to 85% of duration)
  const labelOpacity = interpolate(frame, [span * 0.6, span * 0.85], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const chartWidth = 400;
  const chartHeight = 300;
  const baselineY = 260;

  return (
    <AbsoluteFill
      style={{
        opacity,
        justifyContent: 'center',
        alignItems: 'center',
        color: '#e9f2f6',
        fontFamily: 'monospace',
      }}
    >
      <div
        style={{
          width: width * 0.8,
          height: height * 0.8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          style={{ width: '100%', height: 'auto', overflow: 'visible' }}
        >
          {/* Gauge Background */}
          <path
            d="M 150 100 A 60 60 0 0 1 250 100"
            fill="none"
            stroke="#e9f2f6"
            strokeWidth="2"
            opacity="0.3"
          />
          <text
            x="200"
            y="120"
            textAnchor="middle"
            fill="#e9f2f6"
            fontSize="10"
            opacity="0.6"
          >
            PRESSURE GAUGE
          </text>

          {/* Gauge Needle */}
          <line
            x1="200"
            y1="100"
            x2={200 + 50 * Math.cos((gaugeRotation * Math.PI) / 180)}
            y2={100 + 50 * Math.sin((gaugeRotation * Math.PI) / 180)}
            stroke="#d0523f"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Comparison Bars */}
          {/* Water (Hydrostatic) */}
          <rect
            x="130"
            y={baselineY - waterHeight}
            width="40"
            height={waterHeight}
            fill="#e9f2f6"
          />
          <text
            x="150"
            y={baselineY + 20}
            textAnchor="middle"
            fill="#e9f2f6"
            fontSize="12"
            opacity={labelOpacity}
          >
            WATER
          </text>

          {/* Gas (Pneumatic) */}
          <rect
            x="230"
            y={baselineY - gasHeight}
            width="40"
            height={gasHeight}
            fill="#e0b44c"
          />
          <text
            x="250"
            y={baselineY + 20}
            textAnchor="middle"
            fill="#e0b44c"
            fontSize="12"
            opacity={labelOpacity}
          >
            GAS
          </text>

          {/* Multiplier Label */}
          <text
            x="280"
            y={baselineY - gasHeight / 2}
            fill="#e0b44c"
            fontSize="18"
            fontWeight="bold"
            opacity={labelOpacity}
          >
            44x
          </text>

          {/* Baseline */}
          <line
            x1="100"
            y1={baselineY}
            x2="300"
            y2={baselineY}
            stroke="#e9f2f6"
            strokeWidth="1"
            opacity="0.5"
          />
        </svg>

        {p.title ? (
          <div
            style={{
              marginTop: 40,
              fontSize: 32,
              letterSpacing: 2,
              textTransform: 'uppercase',
              borderTop: '1px solid #e9f2f6',
              paddingTop: 10,
              opacity: labelOpacity,
            }}
          >
            {p.title}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};