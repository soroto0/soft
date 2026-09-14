import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ConceptMapOverlapScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const opacity = p.enter * p.exit;

  const trace = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.bezier(0.4, 0, 0.2, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const expand = interpolate(frame, [span * 0.2, span * 0.6], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const populate = interpolate(frame, [span * 0.4, span * 0.9], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const captionY = interpolate(frame, [0, span * 0.15], [15, 0], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const categories = [
    { id: 'A', cx: 160, cy: 120, r: 55, label: 'CONVOLUTO A' },
    { id: 'B', cx: 240, cy: 120, r: 55, label: 'CONVOLUTO B' },
    { id: 'J', cx: 200, cy: 190, r: 55, label: 'CONVOLUTO J' },
  ];

  // Fixed coordinates for "microscopic textual points" to ensure determinism
  const points = [
    { x: 145, y: 110, c: 'A' }, { x: 170, y: 130, c: 'A' }, { x: 155, y: 140, c: 'A' },
    { x: 230, y: 115, c: 'B' }, { x: 255, y: 105, c: 'B' }, { x: 250, y: 135, c: 'B' },
    { x: 190, y: 185, c: 'J' }, { x: 210, y: 205, c: 'J' }, { x: 200, y: 175, c: 'J' },
    { x: 200, y: 135, c: 'A' }, { x: 180, y: 160, c: 'J' }, { x: 220, y: 160, c: 'J' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 300" style={{ overflow: 'visible' }}>
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Central Core Circle */}
        <circle
          cx={200}
          cy={140}
          r={30}
          fill="none"
          stroke="#e9f2f6"
          strokeWidth={0.8}
          strokeDasharray="188.5"
          strokeDashoffset={188.5 * (1 - trace)}
          opacity={0.6}
        />

        {/* Branching Lines */}
        {categories.map((cat) => {
          const lineX2 = 200 + (cat.cx - 200) * expand;
          const lineY2 = 140 + (cat.cy - 140) * expand;
          return (
            <line
              key={`line-${cat.id}`}
              x1={200}
              y1={140}
              x2={lineX2}
              y2={lineY2}
              stroke="#8a949b"
              strokeWidth={0.5}
              opacity={expand}
            />
          );
        })}

        {/* Thematic Rings */}
        {categories.map((cat) => (
          <g key={cat.id} opacity={expand}>
            <circle
              cx={cat.cx}
              cy={cat.cy}
              r={cat.r}
              fill="#8a949b"
              fillOpacity={0.05}
              stroke="#8a949b"
              strokeWidth={0.4}
            />
            <text
              x={cat.cx}
              y={cat.cy - cat.r - 8}
              fill="#e0b44c"
              fontSize={8}
              textAnchor="middle"
              fontFamily="monospace"
              letterSpacing={1}
              opacity={expand}
            >
              {cat.label}
            </text>
          </g>
        ))}

        {/* Microscopic Textual Points */}
        {points.map((pt, i) => {
          const pointProgress = interpolate(
            populate,
            [i / points.length, (i + 2) / points.length],
            [0, 1],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          );
          return (
            <g key={`pt-${i}`} opacity={pointProgress}>
              <rect
                x={pt.x}
                y={pt.y}
                width={3}
                height={0.5}
                fill="#e9f2f6"
              />
              <rect
                x={pt.x}
                y={pt.y + 1.5}
                width={2}
                height={0.5}
                fill="#e9f2f6"
                opacity={0.6}
              />
            </g>
          );
        })}

        {/* Scale Ticks */}
        {[0, 1, 2, 3].map((i) => (
          <line
            key={`tick-${i}`}
            x1={350}
            y1={240 + i * 10}
            x2={360}
            y2={240 + i * 10}
            stroke="#8a949b"
            strokeWidth={0.5}
          />
        ))}
        <text x={365} y={243} fill="#8a949b" fontSize={6} fontFamily="monospace">REF. ARCH-1927</text>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            color: '#e9f2f6',
            fontFamily: 'serif',
            fontSize: 28,
            letterSpacing: '0.05em',
            fontStyle: 'italic',
            transform: `translateY(${captionY}px)`,
            opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateLeft: 'clamp' }),
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

export default ConceptMapOverlapScene;