import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const VerticalLoadDistributionScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round(p.dur * fps));

  const build = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const piles = interpolate(frame, [span * 0.2, span * 0.5], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const forces = interpolate(frame, [span * 0.4, span * 0.9], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textAnim = interpolate(frame, [span * 0.1, span * 0.4], [20, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const floors = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const pileX = [260, 350, 450, 540];
  const labels = [
    { y: 310, txt: 'WEICHER BODEN', color: '#e9f2f6' },
    { y: 460, txt: 'TRAGFÄHIGER FELS', color: '#e0b44c' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg
        width={width * 0.8}
        height={height * 0.8}
        viewBox="0 0 800 600"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <pattern
            id="hatchPattern"
            width="12"
            height="12"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="12"
              stroke="#e9f2f6"
              strokeWidth="1.5"
              opacity="0.2"
            />
          </pattern>
        </defs>

        {/* Soil Layers */}
        <rect x="150" y="240" width="500" height="140" fill="#e9f2f6" opacity="0.05" />
        <rect x="150" y="380" width="500" height="140" fill="#e9f2f6" opacity="0.15" />
        <rect x="150" y="380" width="500" height="140" fill="url(#hatchPattern)" />
        <line x1="150" y1="380" x2="650" y2="380" stroke="#e9f2f6" strokeWidth="1" strokeDasharray="5 5" />

        {/* Labels for Soil */}
        {labels.map((l) => (
          <text
            key={l.txt}
            x="660"
            y={l.y}
            fill={l.color}
            fontSize="12"
            fontFamily="monospace"
            opacity={build * 0.7}
          >
            {l.txt}
          </text>
        ))}

        {/* Building Structure */}
        <g opacity={build}>
          <rect
            x="220"
            y={240 - 156 * build}
            width="360"
            height={156 * build}
            fill="none"
            stroke="#e9f2f6"
            strokeWidth="2"
          />
          {floors.map((f) => (
            <line
              key={f}
              x1="220"
              y1={240 - (f + 1) * 12}
              x2="580"
              y2={240 - (f + 1) * 12}
              stroke="#e9f2f6"
              strokeWidth="0.5"
              opacity="0.4"
            />
          ))}
          <text x="400" y={240 - 165} fill="#e9f2f6" fontSize="14" textAnchor="middle" fontFamily="monospace">
            13 STOCKWERKE
          </text>
        </g>

        {/* Foundation Piles */}
        {pileX.map((x) => (
          <g key={`pile-${x}`}>
            <rect
              x={x - 6}
              y="240"
              width="12"
              height={240 * piles}
              fill="#e9f2f6"
              opacity="0.3"
            />
            <line
              x1={x}
              y1="240"
              x2={x}
              y2={240 + 240 * piles}
              stroke="#e9f2f6"
              strokeWidth="1"
            />
            
            {/* Load Arrows */}
            <g transform={`translate(${x}, ${100 + 380 * forces})`} opacity={forces > 0 ? 1 : 0}>
              <line x1="0" y1="-40" x2="0" y2="0" stroke="#e0b44c" strokeWidth="3" />
              <path d="M -8 -10 L 0 0 L 8 -10" fill="none" stroke="#e0b44c" strokeWidth="3" />
              <circle cx="0" cy="-40" r="3" fill="#d0523f" />
            </g>
          </g>
        ))}

        {/* Annotations */}
        <text x="400" y="540" fill="#e9f2f6" fontSize="10" textAnchor="middle" opacity={piles * 0.6} fontFamily="monospace">
          BOHRPFÄHLE (TIEFENGRÜNDUNG)
        </text>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            transform: `translateY(${textAnim}px)`,
            opacity: build,
            color: '#e9f2f6',
            fontSize: 32,
            fontFamily: 'sans-serif',
            letterSpacing: '0.1em',
            borderTop: '1px solid #e0b44c',
            paddingTop: '10px',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};