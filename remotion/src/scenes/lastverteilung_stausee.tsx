import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const LastverteilungStauseeScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const waterLevel = interpolate(frame, [0, span * 0.6], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pressureGrow = interpolate(frame, [span * 0.3, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelAlpha = interpolate(frame, [span * 0.5, span * 0.8], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Dam Geometry
  const yBase = 450;
  const yTop = 100;
  const hDam = yBase - yTop;
  const xUpBase = 220;
  const xUpTop = 380;
  const xDownBase = 650;
  const xDownTop = 440;

  // Water Geometry
  const currentWaterY = yBase - (hDam * 0.95 * waterLevel);
  const xAtWaterY = xUpBase + (xUpTop - xUpBase) * ((yBase - currentWaterY) / hDam);

  const arrows = [0.2, 0.4, 0.6, 0.8, 1.0];
  const ticks = [
    { y: yBase, label: '0m' },
    { y: yBase - hDam * 0.5, label: '50m' },
    { y: yBase - hDam, label: '100m' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg
        width={width * 0.8}
        height={height * 0.8}
        viewBox="0 0 800 500"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="pressureGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#e0b44c" stopOpacity={0} />
            <stop offset="100%" stopColor="#d0523f" stopOpacity={0.6} />
          </linearGradient>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#d0523f" />
          </marker>
        </defs>

        {/* Water Body */}
        <path
          d={`M ${xUpBase} ${yBase} L ${xAtWaterY} ${currentWaterY} L 50 ${currentWaterY} L 50 ${yBase} Z`}
          fill="#5b7f9c"
          fillOpacity={0.3}
          stroke="#5b7f9c"
          strokeWidth={1}
        />

        {/* Dam Shell */}
        <polygon
          points={`${xUpBase},${yBase} ${xDownBase},${yBase} ${xDownTop},${yTop} ${xUpTop},${yTop}`}
          fill="#c9d3d9"
          stroke="#e9f2f6"
          strokeWidth={2}
        />

        {/* Dam Core */}
        <polygon
          points={`${xUpBase + 150},${yBase} ${xDownBase - 180},${yBase} ${xDownTop - 20},${yTop} ${xUpTop + 20},${yTop}`}
          fill="#8a949b"
          stroke="#e9f2f6"
          strokeWidth={1}
        />
        <text x={410} y={yTop - 15} fill="#e9f2f6" fontSize={12} textAnchor="middle" opacity={labelAlpha}>DAMMKERN</text>

        {/* Pressure Triangle */}
        <path
          d={`M ${xAtWaterY} ${currentWaterY} L ${xUpBase} ${yBase} L ${xUpBase - 180 * pressureGrow} ${yBase} Z`}
          fill="url(#pressureGrad)"
          stroke="#d0523f"
          strokeWidth={1.5}
          opacity={pressureGrow}
        />

        {/* Pressure Arrows */}
        {arrows.map((a) => {
          const yPos = currentWaterY + (yBase - currentWaterY) * a;
          const xOnFace = xUpBase + (xUpTop - xUpBase) * ((yBase - yPos) / hDam);
          const pWidth = 180 * pressureGrow * a;
          return (
            <line
              key={a}
              x1={xOnFace - pWidth}
              y1={yPos}
              x2={xOnFace - 5}
              y2={yPos}
              stroke="#d0523f"
              strokeWidth={2}
              markerEnd="url(#arrowhead)"
              opacity={pressureGrow}
            />
          );
        })}

        {/* Height Ticks */}
        {ticks.map((t) => (
          <g key={t.label} opacity={labelAlpha}>
            <line x1={xDownBase + 10} y1={t.y} x2={xDownBase + 30} y2={t.y} stroke="#e9f2f6" strokeWidth={1} />
            <text x={xDownBase + 35} y={t.y + 5} fill="#e9f2f6" fontSize={14}>{t.label}</text>
          </g>
        ))}

        {/* Labels */}
        <text x={100} y={currentWaterY - 10} fill="#5b7f9c" fontSize={14} opacity={waterLevel}>RESERVOIR</text>
        <text x={xUpBase - 100} y={yBase + 30} fill="#d0523f" fontSize={14} textAnchor="middle" opacity={pressureGrow}>HYDROSTAT. LAST</text>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            width: '100%',
            textAlign: 'center',
            fontFamily: 'sans-serif',
            fontSize: 42,
            fontWeight: 'bold',
            color: '#e9f2f6',
            letterSpacing: '0.1em',
            textShadow: '0 2px 10px rgba(0,0,0,0.3)',
            opacity: labelAlpha,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};