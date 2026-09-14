import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ComponentModificationScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const opacity = p.enter * p.exit;

  const beamDraw = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.bezier(0.22, 1, 0.36, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const cutProgress = interpolate(frame, [span * 0.35, span * 0.55], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [span * 0.5, span * 0.7], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const beamWidth = 800;
  const cutX = 100 + beamWidth * 0.65; // Cut at ~11m of 17m
  const beamY = 200;
  const beamHeight = 40;

  const ticks = [0, 4.25, 8.5, 12.75, 17];

  return (
    <AbsoluteFill
      style={{
        opacity,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <svg
        width="80%"
        viewBox="0 0 1000 500"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Main Beam Body (I-Beam Side View) */}
        <rect
          x={100}
          y={beamY}
          width={beamWidth * beamDraw}
          height={beamHeight}
          stroke="#e9f2f6"
          strokeWidth={2}
        />
        <rect
          x={100}
          y={beamY - 8}
          width={beamWidth * beamDraw}
          height={8}
          fill="#e9f2f6"
          opacity={0.3}
        />
        <rect
          x={100}
          y={beamY + beamHeight}
          width={beamWidth * beamDraw}
          height={8}
          fill="#e9f2f6"
          opacity={0.3}
        />

        {/* Dimension Line */}
        <g opacity={beamDraw}>
          <line
            x1={100}
            y1={320}
            x2={100 + beamWidth}
            y2={320}
            stroke="#e9f2f6"
            strokeWidth={1}
          />
          <line x1={100} y1={310} x2={100} y2={330} stroke="#e9f2f6" strokeWidth={1} />
          <line
            x1={100 + beamWidth}
            y1={310}
            x2={100 + beamWidth}
            y2={330}
            stroke="#e9f2f6"
            strokeWidth={1}
          />
          <text
            x={100 + beamWidth / 2}
            y={350}
            fill="#e9f2f6"
            fontSize={16}
            textAnchor="middle"
            fontFamily="monospace"
          >
            17.00 m (TOTAL SPAN)
          </text>
        </g>

        {/* Meter Ticks */}
        {ticks.map((m, i) => (
          <g key={i} opacity={beamDraw * 0.5}>
            <line
              x1={100 + (m / 17) * beamWidth}
              y1={beamY + beamHeight + 15}
              x2={100 + (m / 17) * beamWidth}
              y2={beamY + beamHeight + 25}
              stroke="#e9f2f6"
              strokeWidth={1}
            />
            <text
              x={100 + (m / 17) * beamWidth}
              y={beamY + beamHeight + 45}
              fill="#e9f2f6"
              fontSize={12}
              textAnchor="middle"
            >
              {m}m
            </text>
          </g>
        ))}

        {/* The Secret Modification (Cut) */}
        <g opacity={cutProgress}>
          <line
            x1={cutX}
            y1={140}
            x2={cutX}
            y2={280}
            stroke="#e0b44c"
            strokeWidth={3}
            strokeDasharray="10 6"
          />
          <circle cx={cutX} cy={beamY + beamHeight / 2} r={6} fill="#e0b44c" />
          
          <g opacity={labelFade}>
            <text
              x={cutX + 15}
              y={160}
              fill="#e0b44c"
              fontSize={18}
              fontWeight="bold"
              fontFamily="sans-serif"
            >
              MODIFICATION POINT
            </text>
            <text
              x={cutX + 15}
              y={185}
              fill="#d0523f"
              fontSize={14}
              fontFamily="monospace"
            >
              UNAUTHORIZED TRANSPORT CUT
            </text>
            
            {/* Force Indicators (Static Calculation Warning) */}
            <path
              d={`M ${cutX - 40} 120 L ${cutX} 140 L ${cutX + 40} 120`}
              stroke="#d0523f"
              strokeWidth={2}
              fill="none"
            />
            <text
              x={cutX}
              y={110}
              fill="#d0523f"
              fontSize={12}
              textAnchor="middle"
            >
              STRESS CONCENTRATION
            </text>
          </g>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            color: '#e9f2f6',
            fontSize: 42,
            fontFamily: 'sans-serif',
            letterSpacing: '0.1em',
            fontWeight: 300,
            opacity: labelFade,
            transform: `translateY(${interpolate(labelFade, [0, 1], [20, 0])}px)`,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};