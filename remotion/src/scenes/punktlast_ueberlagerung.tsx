import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const PunktlastUeberlagerungScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const opacity = p.enter * p.exit;

  const intro = interpolate(frame, [0, span * 0.2], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const palletCount = interpolate(frame, [span * 0.2, span * 0.6], [0, 4], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const loadScale = interpolate(frame, [span * 0.4, span * 0.8], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const alertPulse = interpolate(
    frame % 30,
    [0, 15, 30],
    [0.3, 0.8, 0.3],
    { easing: Easing.inOut(Easing.quad) }
  );

  const pallets = [0, 1, 2, 3];
  const vectors = [-40, -20, 0, 20, 40];

  return (
    <AbsoluteFill
      style={{
        opacity,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <svg
        width={width * 0.8}
        height={height * 0.8}
        viewBox="0 0 800 600"
        fill="none"
      >
        <defs>
          <radialGradient id="warningGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#e0b44c" stopOpacity={0.6} />
            <stop offset="100%" stopColor="#e0b44c" stopOpacity={0} />
          </radialGradient>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="0"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#8a949b" />
          </marker>
        </defs>

        {/* Support Column */}
        <rect
          x="385"
          y="320"
          width="30"
          height="180"
          fill="#5d6a73"
          opacity={intro}
        />
        <line
          x1="385"
          y1="320"
          x2="385"
          y2="500"
          stroke="#e9f2f6"
          strokeWidth="0.5"
          opacity={intro}
        />

        {/* Ceiling Slab (Perspective) */}
        <path
          d="M 150,320 L 650,320 L 700,260 L 200,260 Z"
          fill="#c9d3d9"
          stroke="#e9f2f6"
          strokeWidth="1"
          opacity={intro}
        />
        <path
          d="M 150,320 L 150,335 L 650,335 L 650,320"
          fill="#8a949b"
          stroke="#e9f2f6"
          strokeWidth="1"
          opacity={intro}
        />

        {/* Weak Point Highlight */}
        <ellipse
          cx="400"
          cy="290"
          rx="60"
          ry="30"
          fill="url(#warningGlow)"
          opacity={intro * alertPulse}
        />
        <ellipse
          cx="400"
          cy="290"
          rx="15"
          ry="8"
          fill="#e0b44c"
          opacity={intro}
        />

        {/* Pallets Stacking */}
        {pallets.map((i) => {
          const pOpacity = interpolate(palletCount, [i, i + 0.5], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          const yPos = 245 - i * 18;
          return (
            <g key={i} opacity={pOpacity}>
              <rect
                x="360"
                y={yPos}
                width="80"
                height="15"
                fill="#e9f2f6"
                stroke="#8a949b"
                strokeWidth="0.5"
              />
              {/* Gypsum layers detail */}
              {[2, 5, 8, 11].map((lineY) => (
                <line
                  key={lineY}
                  x1="362"
                  y1={yPos + lineY}
                  x2="438"
                  y2={yPos + lineY}
                  stroke="#8a949b"
                  strokeWidth="0.2"
                />
              ))}
            </g>
          );
        })}

        {/* Load Vectors */}
        {vectors.map((v, i) => (
          <g key={i} opacity={loadScale}>
            <line
              x1={400 + v}
              y1="260"
              x2={400 + v}
              y2={260 + 50 * loadScale}
              stroke="#8a949b"
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
            />
          </g>
        ))}

        {/* Labels */}
        <g opacity={intro}>
          <text x="425" y="450" fill="#e9f2f6" fontSize="12" fontFamily="sans-serif">
            KRITISCHE STÜTZE
          </text>
          <text x="450" y="230" fill="#e9f2f6" fontSize="12" fontFamily="sans-serif">
            GIPSKARTON-PALETTEN
          </text>
          <text
            x="400"
            y="310"
            fill="#d0523f"
            fontSize="10"
            fontWeight="bold"
            textAnchor="middle"
            fontFamily="sans-serif"
            opacity={loadScale}
          >
            AKUT LEBENSBEDROHLICH
          </text>
          <line x1="400" y1="315" x2="400" y2="340" stroke="#d0523f" strokeWidth="1" opacity={loadScale} />
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            width: '100%',
            textAlign: 'center',
            fontFamily: 'Helvetica, Arial, sans-serif',
            fontSize: 32,
            fontWeight: 300,
            letterSpacing: '0.1em',
            color: '#e9f2f6',
            opacity: intro,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};