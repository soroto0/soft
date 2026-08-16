import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const PolymerChainSlidingScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const slide = interpolate(frame, [0, span], [0, 80], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const straighten = interpolate(frame, [0, span * 0.8], [1, 0.1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const arrowPop = interpolate(frame, [0, span * 0.2], [0, 1], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const captionRise = interpolate(frame, [0, span * 0.1], [20, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const topChains = [80, 105, 130];
  const bottomChains = [170, 195, 220];
  const forceArrows = [
    { x: 100, y: 50, dir: -1 },
    { x: 300, y: 50, dir: -1 },
    { x: 100, y: 250, dir: 1 },
    { x: 300, y: 250, dir: 1 },
  ];
  const ticks = [0, 1, 2, 3, 4];

  return (
    <AbsoluteFill
      style={{
        opacity,
        justifyContent: 'center',
        alignItems: 'center',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <svg
        width="75%"
        viewBox="0 0 400 300"
        style={{ overflow: 'visible' }}
      >
        {/* Force Arrows */}
        {forceArrows.map((a, i) => (
          <g key={`arrow-${i}`} opacity={arrowPop} transform={`translate(${a.x}, ${a.y})`}>
            <line
              x1={0}
              y1={0}
              x2={0}
              y2={20 * a.dir}
              stroke="#e0b44c"
              strokeWidth={2}
            />
            <path
              d={`M -5 ${12 * a.dir} L 0 ${20 * a.dir} L 5 ${12 * a.dir}`}
              fill="none"
              stroke="#e0b44c"
              strokeWidth={2}
            />
          </g>
        ))}

        {/* Top Chains (Moving Right) */}
        {topChains.map((y, i) => (
          <path
            key={`top-${i}`}
            d={`M ${-100 + slide} ${y} Q ${-75 + slide} ${y - 15 * straighten} ${-50 + slide} ${y} T ${slide} ${y} T ${50 + slide} ${y} T ${100 + slide} ${y} T ${150 + slide} ${y} T ${200 + slide} ${y} T ${250 + slide} ${y} T ${300 + slide} ${y} T ${350 + slide} ${y} T ${400 + slide} ${y} T ${450 + slide} ${y} T ${500 + slide} ${y}`}
            fill="none"
            stroke="#e9f2f6"
            strokeWidth={1.5}
            opacity={0.8}
          />
        ))}

        {/* Bottom Chains (Moving Left) */}
        {bottomChains.map((y, i) => (
          <path
            key={`bottom-${i}`}
            d={`M ${-100 - slide} ${y} Q ${-75 - slide} ${y + 15 * straighten} ${-50 - slide} ${y} T ${-slide} ${y} T ${50 - slide} ${y} T ${100 - slide} ${y} T ${150 - slide} ${y} T ${200 - slide} ${y} T ${250 - slide} ${y} T ${300 - slide} ${y} T ${350 - slide} ${y} T ${400 - slide} ${y} T ${450 - slide} ${y} T ${500 - slide} ${y}`}
            fill="none"
            stroke="#e9f2f6"
            strokeWidth={1.5}
            opacity={0.6}
          />
        ))}

        {/* Sliding Interface Indicator */}
        <line
          x1={50}
          y1={150}
          x2={350}
          y2={150}
          stroke="#d0523f"
          strokeWidth={1}
          strokeDasharray="4 4"
          opacity={0.5}
        />

        {/* Measurement Scale */}
        <line x1={50} y1={280} x2={350} y2={280} stroke="#e9f2f6" strokeWidth={0.5} />
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={50 + t * 75}
              y1={280}
              x2={50 + t * 75}
              y2={285}
              stroke="#e9f2f6"
              strokeWidth={0.5}
            />
            <text
              x={50 + t * 75}
              y={295}
              fill="#e9f2f6"
              fontSize={6}
              textAnchor="middle"
              fontFamily="monospace"
            >
              {t * 25}nm
            </text>
          </g>
        ))}
        <text
          x={355}
          y={275}
          fill="#e9f2f6"
          fontSize={7}
          textAnchor="end"
          fontFamily="monospace"
        >
          DEFORMATION ΔL
        </text>
      </svg>

      {p.title ? (
        <div
          style={{
            marginTop: 40,
            color: '#e9f2f6',
            fontSize: 28,
            fontFamily: 'Helvetica, Arial, sans-serif',
            letterSpacing: '0.15em',
            transform: `translateY(${captionRise}px)`,
            opacity: arrowPop,
            borderTop: '1px solid #e0b44c',
            paddingTop: 10,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};