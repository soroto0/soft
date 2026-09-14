import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const TemperaturTiefenprofilScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  // 1. Animation for the initial drawing of the diagram
  const reveal = interpolate(frame, [0, span * 0.2], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // 2. Animation for the time-based oscillation (phase)
  const phase = interpolate(frame, [0, span], [0, Math.PI * 6], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // 3. Animation for labels and indicators appearing
  const labelsFade = interpolate(frame, [span * 0.3, span * 0.5], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // 4. Animation for the depth line highlight
  const depthHighlight = interpolate(frame, [span * 0.5, span * 0.8], [0, 1], {
    easing: Easing.inOut(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const tempTicks = [0, 10, 20, 30, 40];
  const depthTicks = [0, 0.5, 1, 1.5, 2];

  const chartWidth = 400;
  const chartHeight = 300;
  const chartX = 200;
  const chartY = 100;

  const getX = (temp: number) => chartX + (temp * (chartWidth / 40));
  const getY = (depth: number) => chartY + (depth * (chartHeight / 2));

  // Generate the temperature profile path
  // x = averageTemp + oscillation * damping
  const points = Array.from({ length: 41 }).map((_, i) => {
    const d = (i / 40) * 2; // depth from 0 to 2m
    const y = getY(d);
    const damping = Math.exp(-d * 2.5); // Thermal damping factor
    const oscillation = Math.sin(phase - d * 6) * 15;
    const temp = 10 + (15 * damping) + (oscillation * damping);
    return `${getX(temp)},${y}`;
  });

  const pathData = `M ${points.join(' L ')}`;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ width, height, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <svg width="800" height="500" viewBox="0 0 800 500" fill="none">
          <defs>
            <linearGradient id="soilGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#d0523f" stopOpacity={0.2} />
              <stop offset="0.5" stopColor="#e0b44c" stopOpacity={0.1} />
              <stop offset="1" stopColor="#5b7f9c" stopOpacity={0.2} />
            </linearGradient>
          </defs>

          {/* Soil Cross-Section Background */}
          <rect
            x={chartX}
            y={chartY}
            width={chartWidth}
            height={chartHeight * reveal}
            fill="url(#soilGrad)"
            stroke="#e9f2f6"
            strokeWidth={0.5}
            opacity={0.3}
          />

          {/* Axes */}
          <line
            x1={chartX}
            y1={chartY}
            x2={chartX}
            y2={chartY + chartHeight * reveal}
            stroke="#e9f2f6"
            strokeWidth={2}
          />
          <line
            x1={chartX}
            y1={chartY}
            x2={chartX + chartWidth * reveal}
            y2={chartY}
            stroke="#e9f2f6"
            strokeWidth={2}
          />

          {/* Temperature Ticks (X-Axis) */}
          {tempTicks.map((t) => (
            <g key={`t-${t}`} opacity={labelsFade}>
              <line
                x1={getX(t)}
                y1={chartY - 5}
                x2={getX(t)}
                y2={chartY + 5}
                stroke="#e9f2f6"
                strokeWidth={1}
              />
              <text
                x={getX(t)}
                y={chartY - 15}
                fill="#e9f2f6"
                fontSize="12"
                textAnchor="middle"
                fontFamily="monospace"
              >
                {t}°C
              </text>
            </g>
          ))}

          {/* Depth Ticks (Y-Axis) */}
          {depthTicks.map((d) => (
            <g key={`d-${d}`} opacity={labelsFade}>
              <line
                x1={chartX - 5}
                y1={getY(d)}
                x2={chartX + 5}
                y2={getY(d)}
                stroke="#e9f2f6"
                strokeWidth={1}
              />
              <text
                x={chartX - 45}
                y={getY(d) + 5}
                fill="#e9f2f6"
                fontSize="12"
                textAnchor="start"
                fontFamily="monospace"
              >
                {d.toFixed(1)}m
              </text>
            </g>
          ))}

          {/* 2m Depth Highlight Line */}
          <line
            x1={chartX}
            y1={getY(2)}
            x2={chartX + chartWidth}
            y2={getY(2)}
            stroke="#e0b44c"
            strokeWidth={1.5}
            strokeDasharray="5 5"
            opacity={depthHighlight * 0.6}
          />
          <text
            x={chartX + chartWidth + 10}
            y={getY(2) + 5}
            fill="#e0b44c"
            fontSize="14"
            opacity={depthHighlight}
            fontFamily="sans-serif"
          >
            STABIL (8-12°C)
          </text>

          {/* Surface Highlight */}
          <circle
            cx={getX(10 + 15 + Math.sin(phase) * 15)}
            cy={chartY}
            r={4}
            fill="#d0523f"
            opacity={reveal}
          />
          <text
            x={chartX + chartWidth + 10}
            y={chartY + 5}
            fill="#d0523f"
            fontSize="14"
            opacity={labelsFade}
            fontFamily="sans-serif"
          >
            OBERFLÄCHE (bis 40°C)
          </text>

          {/* The Temperature Profile Curve */}
          <path
            d={pathData}
            stroke="#e9f2f6"
            strokeWidth={2.5}
            fill="none"
            strokeDasharray="1000"
            strokeDashoffset={1000 * (1 - reveal)}
          />

          {/* Labels for materials */}
          <text x={chartX + 10} y={chartY + 40} fill="#e9f2f6" fontSize="10" opacity={labelsFade * 0.5}>HUMUS / OBERBODEN</text>
          <text x={chartX + 10} y={chartY + 150} fill="#e9f2f6" fontSize="10" opacity={labelsFade * 0.5}>MINERALISCHER BODEN</text>
          <text x={chartX + 10} y={chartY + 260} fill="#e9f2f6" fontSize="10" opacity={labelsFade * 0.5}>TIEFENGESTEIN / GRUNDWASSERBEREICH</text>
        </svg>

        {p.title ? (
          <div
            style={{
              marginTop: 40,
              color: '#e9f2f6',
              fontSize: 32,
              fontFamily: 'sans-serif',
              fontWeight: 300,
              letterSpacing: '0.05em',
              opacity: labelsFade,
              transform: `translateY(${(1 - labelsFade) * 20}px)`,
            }}
          >
            {p.title}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};