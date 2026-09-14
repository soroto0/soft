import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const MomentDiagramScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const bend = interpolate(frame, [0, span * 0.8], [0, 70], {
    easing: Easing.bezier(0.33, 1, 0.68, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const loadAlpha = interpolate(frame, [span * 0.1, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const tensionAlpha = interpolate(frame, [span * 0.4, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleRise = interpolate(frame, [0, span * 0.2], [20, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const vArrows = [100, 150, 200, 250, 300];
  const beamTicks = [0, 1, 2, 3, 4, 5, 6, 7, 8];

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
        viewBox="0 0 400 300"
        fill="none"
      >
        <defs>
          <marker
            id="arrowhead-danger"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#d0523f" />
          </marker>
          <marker
            id="arrowhead-amber"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#e0b44c" />
          </marker>
        </defs>

        {/* Original Position Reference */}
        <line
          x1="50"
          y1="150"
          x2="350"
          y2="150"
          stroke="#e9f2f6"
          strokeWidth="1"
          strokeDasharray="4 4"
          opacity={0.3}
        />

        {/* Supports */}
        <path
          d="M 40 170 L 50 150 L 60 170 Z"
          stroke="#e9f2f6"
          strokeWidth="1.5"
        />
        <path
          d="M 340 170 L 350 150 L 360 170 Z"
          stroke="#e9f2f6"
          strokeWidth="1.5"
        />

        {/* Bent Beam */}
        <path
          d={`M 50 150 Q 200 ${150 + bend * 2} 350 150`}
          stroke="#e9f2f6"
          strokeWidth="8"
          strokeLinecap="round"
        />

        {/* Beam Deformation Ticks */}
        {beamTicks.map((t) => {
          const x = 50 + t * 37.5;
          const progress = (x - 50) / 300;
          const yOffset = bend * 2 * 4 * progress * (1 - progress);
          return (
            <line
              key={t}
              x1={x}
              y1={150 + yOffset - 4}
              x2={x}
              y2={150 + yOffset + 4}
              stroke="#e9f2f6"
              strokeWidth="1"
              opacity={0.6}
            />
          );
        })}

        {/* Vertical Load Arrows */}
        <g opacity={loadAlpha}>
          {vArrows.map((x) => {
            const progress = (x - 50) / 300;
            const yTarget = 150 + bend * 2 * 4 * progress * (1 - progress) - 10;
            return (
              <line
                key={x}
                x1={x}
                y1={yTarget - 40}
                x2={x}
                y2={yTarget}
                stroke="#d0523f"
                strokeWidth="2"
                markerEnd="url(#arrowhead-danger)"
              />
            );
          })}
          <text x="200" y="80" fill="#d0523f" fontSize="10" textAnchor="middle">
            VERTIKALE LAST
          </text>
        </g>

        {/* Horizontal Tension Arrows at Center */}
        <g opacity={tensionAlpha}>
          <line
            x1="200"
            y1={150 + bend * 2}
            x2="260"
            y2={150 + bend * 2}
            stroke="#e0b44c"
            strokeWidth="3"
            markerEnd="url(#arrowhead-amber)"
          />
          <line
            x1="200"
            y1={150 + bend * 2}
            x2="140"
            y2={150 + bend * 2}
            stroke="#e0b44c"
            strokeWidth="3"
            markerEnd="url(#arrowhead-amber)"
          />
          <text
            x="200"
            y={150 + bend * 2 + 25}
            fill="#e0b44c"
            fontSize="10"
            textAnchor="middle"
          >
            ZUGSPANNUNG
          </text>
        </g>

        {/* Moment Diagram Overlay (Subtle) */}
        <path
          d={`M 50 240 Q 200 ${240 + bend} 350 240`}
          stroke="#e0b44c"
          strokeWidth="1"
          strokeDasharray="2 2"
          opacity={tensionAlpha * 0.5}
        />
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            transform: `translateY(${titleRise}px)`,
            fontFamily: 'sans-serif',
            fontSize: 42,
            fontWeight: 300,
            color: '#e9f2f6',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};