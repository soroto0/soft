import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const HoleOvalizationDetailScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, (p.dur || 1) * fps);

  const draw = interpolate(frame, [0, span * 0.2], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const flow = interpolate(frame, [span * 0.25, span * 0.85], [0, 45], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelAlpha = interpolate(frame, [span * 0.5, span * 0.7], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const hatching = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const indicators = [-1, 1];

  return (
    <AbsoluteFill
      style={{
        opacity,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <svg
        width={width * 0.8}
        height={height * 0.8}
        viewBox="0 0 400 400"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="metalGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e9f2f6" stopOpacity={0.05} />
            <stop offset="100%" stopColor="#e9f2f6" stopOpacity={0.15} />
          </linearGradient>
        </defs>

        {/* Metal Plate Representation */}
        <rect
          x={40}
          y={40}
          width={320}
          height={320}
          fill="url(#metalGrad)"
          stroke="#e9f2f6"
          strokeWidth={1}
          opacity={draw * 0.4}
        />

        {/* Hatching to indicate solid material */}
        {hatching.map((i) => (
          <line
            key={i}
            x1={40}
            y1={60 + i * 30}
            x2={360}
            y2={60 + i * 30}
            stroke="#e9f2f6"
            strokeWidth={0.5}
            opacity={draw * 0.1}
          />
        ))}

        {/* Original Hole Reference */}
        <circle
          cx={200}
          cy={200}
          r={70}
          fill="none"
          stroke="#8a949b"
          strokeWidth={2}
          strokeDasharray="8 6"
          opacity={draw}
        />
        <text
          x={200}
          y={120}
          fill="#8a949b"
          fontSize={10}
          textAnchor="middle"
          opacity={draw}
        >
          NOMINAL: Ø 140mm
        </text>

        {/* Deformed Oval (The "Flowing" Metal) */}
        <ellipse
          cx={200}
          cy={200}
          rx={70}
          ry={70 + flow}
          fill="none"
          stroke="#e0b44c"
          strokeWidth={3}
          opacity={draw}
        />

        {/* Stress Force Arrows */}
        {indicators.map((dir) => (
          <g key={dir} opacity={draw}>
            <path
              d={`M 200 ${200 + dir * 90} L 200 ${200 + dir * 150}`}
              stroke="#d0523f"
              strokeWidth={2}
              markerEnd="url(#arrowhead)"
            />
            <path
              d={`M 190 ${200 + dir * 140} L 200 ${200 + dir * 155} L 210 ${200 + dir * 140}`}
              fill="none"
              stroke="#d0523f"
              strokeWidth={2}
            />
          </g>
        ))}
        <text
          x={215}
          y={60}
          fill="#d0523f"
          fontSize={12}
          fontWeight="bold"
          opacity={draw}
        >
          F (Zuglast)
        </text>

        {/* Dimension Ticks for Elongation */}
        <line
          x1={280}
          y1={200 - 70}
          x2={300}
          y2={200 - 70}
          stroke="#e9f2f6"
          strokeWidth={1}
          opacity={labelAlpha}
        />
        <line
          x1={280}
          y1={200 + 70 + flow}
          x2={300}
          y2={200 + 70 + flow}
          stroke="#e9f2f6"
          strokeWidth={1}
          opacity={labelAlpha}
        />
        <line
          x1={290}
          y1={200 - 70}
          x2={290}
          y2={200 + 70 + flow}
          stroke="#e0b44c"
          strokeWidth={1}
          opacity={labelAlpha}
        />
        <text
          x={305}
          y={200 + flow / 2}
          fill="#e0b44c"
          fontSize={11}
          opacity={labelAlpha}
        >
          +{flow.toFixed(1)}mm
        </text>

        {/* Annotations */}
        <text
          x={60}
          y={340}
          fill="#e9f2f6"
          fontSize={10}
          opacity={labelAlpha}
        >
          MATERIAL: S235JR
        </text>
        <text
          x={340}
          y={340}
          fill="#e0b44c"
          fontSize={10}
          textAnchor="end"
          opacity={labelAlpha}
        >
          PLASTISCHE VERFORMUNG
        </text>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            color: '#e9f2f6',
            fontSize: 42,
            fontFamily: 'sans-serif',
            letterSpacing: '0.1em',
            opacity: labelAlpha,
            textTransform: 'uppercase',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};