import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ReducedContactAreaScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const sphereScale = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.back(1.2)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const hatchAlpha = interpolate(frame, [span * 0.3, span * 0.6], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [span * 0.5, span * 0.8], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const grid = [0, 1, 2, 3];
  const sphereRadius = 45;
  const spacing = 100;
  const offset = 50;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg
        width={width * 0.8}
        height={height * 0.7}
        viewBox="0 0 500 400"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <pattern
            id="hatchPattern"
            patternUnits="userSpaceOnUse"
            width="8"
            height="8"
            patternTransform="rotate(45)"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="8"
              stroke="#e0b44c"
              strokeWidth="2"
            />
          </pattern>
          <mask id="sphereMask">
            <rect x="0" y="0" width="500" height="400" fill="white" />
            {grid.map((i) =>
              grid.map((j) => (
                <circle
                  key={`mask-${i}-${j}`}
                  cx={offset + i * spacing}
                  cy={offset + j * spacing}
                  r={sphereRadius * sphereScale}
                  fill="black"
                />
              ))
            )}
          </mask>
        </defs>

        {/* The Concrete Area (Hatched) */}
        <rect
          x="0"
          y="0"
          width="400"
          height="400"
          fill="url(#hatchPattern)"
          mask="url(#sphereMask)"
          opacity={hatchAlpha}
        />

        {/* The Spheres */}
        {grid.map((i) =>
          grid.map((j) => (
            <g key={`sphere-${i}-${j}`} opacity={sphereScale}>
              <circle
                cx={offset + i * spacing}
                cy={offset + j * spacing}
                r={sphereRadius}
                fill="#5d6a73"
                stroke="#e9f2f6"
                strokeWidth="1"
                opacity={0.4}
              />
              <circle
                cx={offset + i * spacing}
                cy={offset + j * spacing}
                r={sphereRadius * 0.8}
                fill="none"
                stroke="#e9f2f6"
                strokeWidth="0.5"
                strokeDasharray="2 2"
              />
            </g>
          ))
        )}

        {/* Labels and Annotations */}
        <g opacity={labelFade}>
          <line x1={250} y1={150} x2={320} y2={120} stroke="#e9f2f6" strokeWidth="1.5" />
          <text x={325} y={115} fill="#e9f2f6" fontSize="14" fontFamily="sans-serif">
            Hohlkugel (Verdrängung)
          </text>

          <line x1={150} y1={150} x2={110} y2={180} stroke="#e0b44c" strokeWidth="1.5" />
          <text x={105} y={195} fill="#e0b44c" fontSize="14" fontFamily="sans-serif" textAnchor="end">
            Betonsteg (Kraftübertragung)
          </text>

          {/* Dimension indicators */}
          <line x1={0} y1={410} x2={400} y2={410} stroke="#e9f2f6" strokeWidth="1" />
          <line x1={0} y1={405} x2={0} y2={415} stroke="#e9f2f6" strokeWidth="1" />
          <line x1={400} y1={405} x2={400} y2={415} stroke="#e9f2f6" strokeWidth="1" />
          <text x={200} y={430} fill="#e9f2f6" fontSize="12" textAnchor="middle" fontFamily="sans-serif">
            Fugenquerschnitt (Draufsicht)
          </text>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            width: '100%',
            textAlign: 'center',
            color: '#e9f2f6',
            fontSize: 42,
            fontFamily: 'sans-serif',
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