import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ForceVectorAnalysisScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const boltShow = interpolate(frame, [0, span * 0.15], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shearShow = interpolate(frame, [span * 0.15, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const tensionShow = interpolate(frame, [span * 0.35, span * 0.9], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const captionSlide = interpolate(frame, [0, span * 0.25], [30, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const threads = [0, 1, 2, 3, 4];
  const offWhite = '#e9f2f6';
  const amber = '#e0b44c';
  const grey = '#8a949b';
  const danger = '#d0523f';

  return (
    <AbsoluteFill
      style={{
        opacity,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <svg
        width="70%"
        viewBox="0 0 400 300"
        style={{ overflow: 'visible' }}
      >
        {/* Centerline */}
        <line
          x1="200"
          y1="40"
          x2="200"
          y2="260"
          stroke={grey}
          strokeWidth="0.5"
          strokeDasharray="4 4"
          opacity={boltShow * 0.5}
        />

        {/* Bolt Head */}
        <rect
          x="165"
          y="60"
          width="70"
          height="20"
          fill="none"
          stroke={offWhite}
          strokeWidth="1.5"
          opacity={boltShow}
        />

        {/* Bolt Shaft */}
        <rect
          x="185"
          y="80"
          width="30"
          height="140"
          fill="none"
          stroke={offWhite}
          strokeWidth="1.5"
          opacity={boltShow}
        />

        {/* Threads */}
        {threads.map((i) => (
          <line
            key={i}
            x1="185"
            y1={180 + i * 8}
            x2="215"
            y2={185 + i * 8}
            stroke={offWhite}
            strokeWidth="1"
            opacity={boltShow}
          />
        ))}

        {/* Nut */}
        <rect
          x="175"
          y="190"
          width="50"
          height="25"
          fill="none"
          stroke={offWhite}
          strokeWidth="1.5"
          opacity={boltShow}
        />

        {/* Shear Force Vector (Small Grey) */}
        <g opacity={shearShow}>
          <path
            d="M 140 130 L 185 130"
            stroke={grey}
            strokeWidth="2"
            fill="none"
          />
          <path d="M 185 130 L 178 126 L 178 134 Z" fill={grey} />
          <text
            x="140"
            y="120"
            fill={grey}
            fontSize="10"
            fontFamily="monospace"
          >
            F_shear (DESIGN)
          </text>
        </g>

        {/* Tension Force Vector (Massive Orange) */}
        <g opacity={tensionShow}>
          {/* Top pulling up */}
          <path
            d={`M 200 60 L 200 ${60 - 50 * tensionShow}`}
            stroke={amber}
            strokeWidth={4 + 12 * tensionShow}
            fill="none"
          />
          <path
            d={`M 200 ${60 - 55 * tensionShow} L ${200 - 8 * tensionShow} ${60 - 45 * tensionShow} L ${200 + 8 * tensionShow} ${60 - 45 * tensionShow} Z`}
            fill={amber}
          />
          
          {/* Bottom pulling down */}
          <path
            d={`M 200 215 L 200 ${215 + 50 * tensionShow}`}
            stroke={amber}
            strokeWidth={4 + 12 * tensionShow}
            fill="none"
          />
          <path
            d={`M 200 ${215 + 55 * tensionShow} L ${200 - 8 * tensionShow} ${215 + 45 * tensionShow} L ${200 + 8 * tensionShow} ${215 + 45 * tensionShow} Z`}
            fill={amber}
          />

          <text
            x="220"
            y={250}
            fill={danger}
            fontSize="12"
            fontWeight="bold"
            fontFamily="monospace"
          >
            F_tension (CRITICAL)
          </text>
        </g>

        {/* Dimension Markers */}
        <line x1="160" y1="60" x2="150" y2="60" stroke={grey} strokeWidth="0.5" opacity={boltShow} />
        <line x1="160" y1="215" x2="150" y2="215" stroke={grey} strokeWidth="0.5" opacity={boltShow} />
        <line x1="155" y1="60" x2="155" y2="215" stroke={grey} strokeWidth="0.5" opacity={boltShow} />
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            fontFamily: 'sans-serif',
            fontSize: 38,
            fontWeight: 300,
            color: offWhite,
            letterSpacing: '0.1em',
            transform: `translateY(${captionSlide}px)`,
            opacity: boltShow,
            textAlign: 'center',
            width: '100%',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};