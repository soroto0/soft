import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const OriginalBoxBeamDetailScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const beamGrow = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const rodReveal = interpolate(frame, [span * 0.2, span * 0.5], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const vectorOffset = interpolate(frame, [span * 0.3, span * 0.9], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [span * 0.5, span * 0.7], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const slateGrey = '#708090';
  const offWhite = '#e9f2f6';
  const amber = '#e0b44c';

  const uProfiles = [
    { id: 'top', d: `M 150 100 H 250 V 140 H 240 V 110 H 160 V 140 H 150 Z`, label: 'U-PROFIL (OBEN)', ly: 90 },
    { id: 'bottom', d: `M 150 180 H 250 V 140 H 240 V 170 H 160 V 140 H 150 Z`, label: 'U-PROFIL (UNTEN)', ly: 195 },
  ];

  const vectors = [0, 1, 2];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg
        width={width * 0.8}
        height={height * 0.8}
        viewBox="0 0 400 300"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="0"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill={slateGrey} />
          </marker>
        </defs>

        {/* U-Profiles */}
        {uProfiles.map((u) => (
          <g key={u.id} opacity={beamGrow}>
            <path
              d={u.d}
              fill="none"
              stroke={offWhite}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <text
              x="260"
              y={u.ly}
              fill={offWhite}
              fontSize="8"
              fontFamily="monospace"
              opacity={labelFade}
            >
              {u.label}
            </text>
            <line
              x1="250"
              y1={u.ly - 3}
              x2="258"
              y2={u.ly - 3}
              stroke={offWhite}
              strokeWidth="0.5"
              opacity={labelFade}
            />
          </g>
        ))}

        {/* Welds */}
        <circle cx="150" cy="140" r="3" fill={amber} opacity={beamGrow * 0.8} />
        <circle cx="250" cy="140" r="3" fill={amber} opacity={beamGrow * 0.8} />
        <text
          x="140"
          y="143"
          fill={amber}
          fontSize="7"
          fontFamily="monospace"
          textAnchor="end"
          opacity={labelFade}
        >
          SCHWEISSNAHT
        </text>

        {/* Continuous Rod */}
        <rect
          x="196"
          y={140 - 100 * rodReveal}
          width="8"
          height={200 * rodReveal}
          fill="#4a555c"
          stroke={offWhite}
          strokeWidth="0.5"
          opacity={rodReveal}
        />
        <text
          x="210"
          y="70"
          fill={offWhite}
          fontSize="8"
          fontFamily="monospace"
          opacity={labelFade}
        >
          DURCHGEHENDE STANGE
        </text>

        {/* Load Vectors passing through */}
        {vectors.map((v) => {
          const yPos = ((vectorOffset + v * 40) % 120) + 80;
          return (
            <line
              key={v}
              x1="200"
              y1={yPos}
              x2="200"
              y2={yPos + 20}
              stroke={slateGrey}
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
              opacity={rodReveal * 0.6}
            />
          );
        })}

        {/* Load indicators */}
        <text
          x="200"
          y="50"
          fill={slateGrey}
          fontSize="10"
          fontFamily="monospace"
          textAnchor="middle"
          opacity={rodReveal}
        >
          LASTFLUSS (P)
        </text>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            width: '100%',
            textAlign: 'center',
            fontFamily: 'sans-serif',
            fontSize: 28,
            color: offWhite,
            letterSpacing: '0.1em',
            opacity: labelFade,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};