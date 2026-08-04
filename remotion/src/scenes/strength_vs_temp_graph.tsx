import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const StrengthVsTempGraphScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  const totalFrames = p.dur * fps;
  const sceneOpacity = p.enter * p.exit;

  // Animations
  const progress = interpolate(frame, [0, totalFrames], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const temp = interpolate(frame, [0, totalFrames], [20, 82], {
    easing: Easing.out(Easing.quad),
  });

  const strength = interpolate(frame, [totalFrames * 0.1, totalFrames * 0.9], [450, 120], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.4, 0, 0.2, 1),
  });

  // Layout Constants
  const chartX = width * 0.15;
  const chartY = height * 0.25;
  const chartW = width * 0.5;
  const chartH = height * 0.5;

  const thermX = width * 0.75;
  const thermY = height * 0.25;
  const thermW = width * 0.04;
  const thermH = height * 0.5;

  const testPressureValue = 250;
  const testPressureY = chartY + chartH * (1 - testPressureValue / 500);

  // Path Construction
  let pathD = '';
  for (let i = 0; i <= 50; i++) {
    const stepProgress = (i / 50) * progress;
    const px = chartX + stepProgress * chartW;
    const pStrength = interpolate(stepProgress, [0.1, 0.9], [450, 120], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    });
    const py = chartY + chartH * (1 - pStrength / 500);
    pathD += `${i === 0 ? 'M' : 'L'} ${px} ${py} `;
  }

  const currentX = chartX + progress * chartW;
  const currentY = chartY + chartH * (1 - strength / 500);
  const thermometerFillHeight = (temp / 100) * thermH;

  const isCritical = strength < testPressureValue;

  return (
    <AbsoluteFill
      style={{
        opacity: sceneOpacity,
        fontFamily: 'monospace',
        color: '#e9f2f6',
      }}
    >
      <svg width={width} height={height} style={{ position: 'absolute' }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((v) => (
          <line
            key={`grid-${v}`}
            x1={chartX}
            y1={chartY + chartH * v}
            x2={chartX + chartW}
            y2={chartY + chartH * v}
            stroke="#1c2530"
            strokeWidth={1}
          />
        ))}

        {/* Test Pressure Line */}
        <line
          x1={chartX}
          y1={testPressureY}
          x2={chartX + chartW}
          y2={testPressureY}
          stroke="#e9f2f6"
          strokeWidth={2}
          strokeDasharray="8 4"
          opacity={0.4}
        />
        <text
          x={chartX + 10}
          y={testPressureY - 10}
          fill="#e9f2f6"
          fontSize={height * 0.015}
          opacity={0.6}
        >
          TARGET TEST PRESSURE (250 MPa)
        </text>

        {/* Strength Curve */}
        <path
          d={pathD}
          fill="none"
          stroke={isCritical ? '#d0523f' : '#e9f2f6'}
          strokeWidth={3}
        />

        {/* Current Strength Point */}
        <circle
          cx={currentX}
          cy={currentY}
          r={5}
          fill={isCritical ? '#d0523f' : '#e9f2f6'}
        />
        <text
          x={currentX + 10}
          y={currentY - 10}
          fill={isCritical ? '#d0523f' : '#e9f2f6'}
          fontSize={height * 0.02}
          fontWeight="bold"
        >
          {Math.round(strength)} MPa
        </text>
        <text
          x={chartX}
          y={chartY - 20}
          fill="#e9f2f6"
          fontSize={height * 0.018}
          letterSpacing={2}
        >
          MATERIAL YIELD STRENGTH
        </text>

        {/* Thermometer */}
        <rect
          x={thermX}
          y={thermY}
          width={thermW}
          height={thermH}
          fill="none"
          stroke="#e9f2f6"
          strokeWidth={2}
        />
        <rect
          x={thermX + 4}
          y={thermY + thermH - thermometerFillHeight}
          width={thermW - 8}
          height={thermometerFillHeight}
          fill="#e0b44c"
        />
        
        {/* Thermometer Labels */}
        {[0, 20, 40, 60, 80, 100].map((tLabel) => (
          <line
            key={`t-${tLabel}`}
            x1={thermX + thermW}
            y1={thermY + thermH - (tLabel / 100) * thermH}
            x2={thermX + thermW + 10}
            y2={thermY + thermH - (tLabel / 100) * thermH}
            stroke="#e9f2f6"
            strokeWidth={1}
          />
        ))}
        
        <text
          x={thermX}
          y={thermY - 20}
          fill="#e0b44c"
          fontSize={height * 0.018}
          letterSpacing={2}
        >
          TEMP: {temp.toFixed(1)}°C
        </text>

        {/* Failure Warning */}
        {isCritical && (
          <text
            x={chartX + chartW / 2}
            y={chartY + chartH + 50}
            fill="#d0523f"
            fontSize={height * 0.025}
            textAnchor="middle"
            fontWeight="bold"
          >
            CRITICAL: STRENGTH BELOW OPERATING PRESSURE
          </text>
        )}
      </svg>

      {p.title && (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            width: '100%',
            textAlign: 'center',
            fontSize: height * 0.04,
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
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