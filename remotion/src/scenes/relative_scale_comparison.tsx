import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const RelativeScaleComparisonScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const b6Progress = interpolate(frame, [0, span * 0.35], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const b22Progress = interpolate(frame, [span * 0.15, span * 0.65], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const limitProgress = interpolate(frame, [span * 0.4, span * 0.75], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const dangerOpacity = interpolate(frame, [span * 0.6, span * 0.9], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const sixFloors = [0, 1, 2, 3, 4, 5];
  const twentyTwoFloors = [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
  ];

  const ticks = [
    { storey: 0, label: '0m (Ground)' },
    { storey: 6, label: '18m (6 Storeys)' },
    { storey: 12, label: '36m' },
    { storey: 18, label: '54m' },
    { storey: 22, label: '66m (22 Storeys)' },
  ];

  const baseY = 370;
  const floorH = 11;
  const limitY = baseY - 6 * floorH;

  return (
    <AbsoluteFill
      style={{
        opacity,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <svg width="82%" height="78%" viewBox="0 0 800 440">
        <defs>
          <linearGradient id="dangerFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d0523f" stopOpacity={0.45 * dangerOpacity} />
            <stop offset="100%" stopColor="#d0523f" stopOpacity={0.05 * dangerOpacity} />
          </linearGradient>
        </defs>

        {/* Height Axis Line */}
        <line
          x1={150}
          y1={baseY}
          x2={150}
          y2={baseY - 22 * floorH - 15}
          stroke="#e9f2f6"
          strokeWidth={1}
          strokeOpacity={0.4}
        />

        {/* Ticks and Labels */}
        {ticks.map((t) => {
          const y = baseY - t.storey * floorH;
          return (
            <g key={t.storey}>
              <line
                x1={144}
                y1={y}
                x2={150}
                y2={y}
                stroke="#e9f2f6"
                strokeWidth={1}
                strokeOpacity={0.6}
              />
              <text
                x={138}
                y={y + 3}
                fill="#e9f2f6"
                fontSize={10}
                textAnchor="end"
                opacity={0.8}
                fontFamily="sans-serif"
              >
                {t.label}
              </text>
            </g>
          );
        })}

        {/* Ground Line */}
        <line x1={120} y1={baseY} x2={720} y2={baseY} stroke="#e9f2f6" strokeWidth={1.5} />

        {/* 6-Storey Building (Original Design) */}
        <g>
          {sixFloors.map((i) => {
            const floorY = baseY - (i + 1) * floorH;
            const isVisible = (i + 1) / 6 <= b6Progress;
            return (
              <rect
                key={i}
                x={210}
                y={floorY}
                width={130}
                height={floorH - 1}
                fill="#e0b44c"
                fillOpacity={isVisible ? 0.75 : 0}
                stroke="#1a242c"
                strokeWidth={0.5}
              />
            );
          })}
          <text
            x={275}
            y={baseY + 22}
            fill="#e0b44c"
            fontSize={12}
            fontWeight="600"
            textAnchor="middle"
            fontFamily="sans-serif"
          >
            DANISH DESIGN LIMIT
          </text>
          <text
            x={275}
            y={baseY + 38}
            fill="#e9f2f6"
            fontSize={10}
            textAnchor="middle"
            opacity={0.7}
            fontFamily="sans-serif"
          >
            Max 6 Storeys (18m)
          </text>
        </g>

        {/* 22-Storey Building (Ronan Point) */}
        <g>
          {twentyTwoFloors.map((i) => {
            const floorY = baseY - (i + 1) * floorH;
            const isVisible = (i + 1) / 22 <= b22Progress;
            const isAboveLimit = i >= 6;
            const fillColor = isAboveLimit ? '#d0523f' : '#e9f2f6';
            return (
              <rect
                key={i}
                x={480}
                y={floorY}
                width={130}
                height={floorH - 1}
                fill={fillColor}
                fillOpacity={isVisible ? (isAboveLimit ? 0.85 : 0.65) : 0}
                stroke="#1a242c"
                strokeWidth={0.5}
              />
            );
          })}
          <text
            x={545}
            y={baseY + 22}
            fill="#d0523f"
            fontSize={12}
            fontWeight="600"
            textAnchor="middle"
            fontFamily="sans-serif"
          >
            RONAN POINT
          </text>
          <text
            x={545}
            y={baseY + 38}
            fill="#e9f2f6"
            fontSize={10}
            textAnchor="middle"
            opacity={0.7}
            fontFamily="sans-serif"
          >
            22 Storeys (66m) — Scaled Up
          </text>
        </g>

        {/* Danger Zone Box on Ronan Point above Floor 6 */}
        <rect
          x={475}
          y={baseY - 22 * floorH}
          width={140}
          height={16 * floorH}
          fill="url(#dangerFill)"
          stroke="#d0523f"
          strokeWidth={1}
          strokeDasharray="3 3"
          opacity={dangerOpacity}
        />

        {/* Design Limit Line */}
        <line
          x1={180}
          y1={limitY}
          x2={180 + 470 * limitProgress}
          y2={limitY}
          stroke="#e0b44c"
          strokeWidth={2}
          strokeDasharray="5 3"
        />

        <text
          x={345}
          y={limitY - 7}
          fill="#e0b44c"
          fontSize={10}
          fontWeight="bold"
          letterSpacing="0.5"
          opacity={limitProgress}
          fontFamily="sans-serif"
        >
          INTENDED SYSTEM LIMIT (6 STOREYS)
        </text>

        {/* Danger Label */}
        <text
          x={630}
          y={limitY - 50}
          fill="#d0523f"
          fontSize={11}
          fontWeight="bold"
          opacity={dangerOpacity}
          fontFamily="sans-serif"
        >
          ▲ UNTESTED SCALE ZONE
        </text>
        <text
          x={630}
          y={limitY - 36}
          fill="#e9f2f6"
          fontSize={9}
          opacity={dangerOpacity * 0.8}
          fontFamily="sans-serif"
        >
          System load exceeds design intent
        </text>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: 30,
            fontFamily: "'Segoe UI', Arial, sans-serif",
            fontSize: 32,
            fontWeight: 600,
            color: '#e9f2f6',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};