import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const DamDimensionsScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const draw = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const dims = interpolate(frame, [span * 0.3, span * 0.7], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labels = interpolate(frame, [span * 0.6, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const steelGray = '#8a949b';
  const offWhite = '#e9f2f6';
  const amber = '#e0b44c';

  const ticks = [0, 250, 500, 750, 980];
  const hatching = Array.from({ length: 32 }).map((_, i) => i);

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width={width * 0.8} height={height * 0.8} viewBox="0 0 1000 600">
        <defs>
          <linearGradient id="damFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5d6a73" />
            <stop offset="1" stopColor="#3a444a" />
          </linearGradient>
          <mask id="drawMask">
            <rect x="0" y="0" width={1000 * draw} height="600" fill="white" />
          </mask>
        </defs>

        {/* Foundation Hatching */}
        <g opacity={draw * 0.5}>
          {hatching.map((i) => (
            <line
              key={i}
              x1={50 + i * 30}
              y1={450}
              x2={30 + i * 30}
              y2={475}
              stroke={steelGray}
              strokeWidth={1}
            />
          ))}
          <line x1={50} y1={450} x2={950} y2={450} stroke={steelGray} strokeWidth={2} />
        </g>

        {/* Dam Body */}
        <path
          d="M 100 200 L 900 200 L 950 450 L 50 450 Z"
          fill="url(#damFill)"
          stroke={steelGray}
          strokeWidth={2}
          mask="url(#drawMask)"
        />

        {/* Crest Detail */}
        <line
          x1={100}
          y1={200}
          x2={100 + 800 * draw}
          y2={200}
          stroke={offWhite}
          strokeWidth={1.5}
          opacity={0.8}
        />

        {/* Height Dimension Line */}
        <g opacity={dims}>
          <line x1={970} y1={200} x2={970} y2={200 + 250 * dims} stroke={steelGray} strokeWidth={1.5} />
          <line x1={960} y1={200} x2={980} y2={200} stroke={steelGray} strokeWidth={1.5} />
          <line x1={960} y1={450} x2={980} y2={450} stroke={steelGray} strokeWidth={1.5} />
          {/* Arrows */}
          <path d="M 965 210 L 970 200 L 975 210" fill="none" stroke={steelGray} strokeWidth={1.5} />
          <path d="M 965 440 L 970 450 L 975 440" fill="none" stroke={steelGray} strokeWidth={1.5} />
        </g>

        {/* Length Dimension Line */}
        <g opacity={dims}>
          <line x1={100} y1={150} x2={100 + 800 * dims} y2={150} stroke={steelGray} strokeWidth={1.5} />
          <line x1={100} y1={140} x2={100} y2={160} stroke={steelGray} strokeWidth={1.5} />
          <line x1={900} y1={140} x2={900} y2={160} stroke={steelGray} strokeWidth={1.5} />
          {/* Arrows */}
          <path d="M 110 145 L 100 150 L 110 155" fill="none" stroke={steelGray} strokeWidth={1.5} />
          <path d="M 890 145 L 900 150 L 890 155" fill="none" stroke={steelGray} strokeWidth={1.5} />
        </g>

        {/* Ticks and Scale */}
        <g opacity={labels}>
          {ticks.map((t) => (
            <g key={t} transform={`translate(${100 + (t / 980) * 800}, 150)`}>
              <line x1={0} y1={0} x2={0} y2={-10} stroke={steelGray} strokeWidth={1} />
              <text y={-15} fill={offWhite} fontSize={12} textAnchor="middle" fontFamily="monospace">
                {t}m
              </text>
            </g>
          ))}
        </g>

        {/* Labels */}
        <g opacity={labels}>
          <text x={985} y={325} fill={amber} fontSize={24} fontWeight="bold" fontFamily="sans-serif">
            93 m
          </text>
          <text x={985} y={350} fill={steelGray} fontSize={14} fontFamily="sans-serif">
            DAMMHÖHE
          </text>

          <text x={500} y={130} fill={amber} fontSize={24} fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
            980 m
          </text>
          <text x={500} y={105} fill={steelGray} fontSize={14} textAnchor="middle" fontFamily="sans-serif">
            KRONENLÄNGE
          </text>
        </g>

        {/* Water Level Indicator */}
        <g opacity={draw * 0.6}>
          <line x1={50} y1={230} x2={112} y2={230} stroke={offWhite} strokeWidth={1} strokeDasharray="5 5" />
          <path d="M 70 230 L 80 215 L 90 230 Z" fill={offWhite} />
          <text x={120} y={235} fill={offWhite} fontSize={12} fontFamily="sans-serif">MAX. STAUZIEL</text>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            color: offWhite,
            fontFamily: 'sans-serif',
            fontSize: 42,
            letterSpacing: '0.2em',
            opacity: labels,
            transform: `translateY(${interpolate(labels, [0, 1], [20, 0])}px)`,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};