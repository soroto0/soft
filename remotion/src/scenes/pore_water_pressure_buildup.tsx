import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const PoreWaterPressureBuildupScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const load = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pressure = interpolate(frame, [span * 0.2, span * 0.85], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const friction = interpolate(frame, [span * 0.4, span * 0.9], [1, 0.2], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleRise = interpolate(frame, [0, span * 0.15], [20, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const particles = [0, 1, 2].flatMap((y) =>
    [0, 1, 2].map((x) => ({
      x: 120 + x * 80,
      y: 150 + y * 65,
    }))
  );

  const hArrows = [0, 1].flatMap((x) =>
    [0, 1, 2].map((y) => ({
      x: 160 + x * 80,
      y: 150 + y * 65,
    }))
  );

  const vArrows = [0, 1, 2].flatMap((x) =>
    [0, 1].map((y) => ({
      x: 120 + x * 80,
      y: 182.5 + y * 65,
    }))
  );

  return (
    <AbsoluteFill
      style={{
        opacity,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <svg width="70%" viewBox="0 0 400 380" style={{ overflow: 'visible' }}>
        <defs>
          <marker
            id="arrowhead-amber"
            markerWidth="6"
            markerHeight="6"
            refX="5"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 6 3, 0 6" fill="#e0b44c" />
          </marker>
          <marker
            id="arrowhead-white"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="5"
            orient="auto"
          >
            <polygon points="0 0, 10 5, 0 10" fill="#e9f2f6" />
          </marker>
        </defs>

        {/* Concrete Slab */}
        <rect
          x={80}
          y={40}
          width={240}
          height={40 * load}
          fill="#8a949b"
          stroke="#e9f2f6"
          strokeWidth={1}
        />
        <text x={200} y={30} fill="#e9f2f6" fontSize={12} textAnchor="middle" opacity={load}>
          BETONLAST (TONNEN)
        </text>
        <line
          x1={200}
          y1={40}
          x2={200}
          y2={40 + 60 * load}
          stroke="#e9f2f6"
          strokeWidth={2}
          markerEnd="url(#arrowhead-white)"
          opacity={load}
        />

        {/* Soil Particles */}
        {particles.map((pPos, i) => (
          <circle
            key={`part-${i}`}
            cx={pPos.x}
            cy={pPos.y}
            r={28}
            fill="#5d6a73"
            stroke="#e9f2f6"
            strokeWidth={0.5}
          />
        ))}

        {/* Friction Contact Points */}
        {hArrows.map((a, i) => (
          <circle
            key={`fric-h-${i}`}
            cx={a.x}
            cy={a.y}
            r={4}
            fill="#d0523f"
            opacity={friction * 0.8}
          />
        ))}
        {vArrows.map((a, i) => (
          <circle
            key={`fric-v-${i}`}
            cx={a.x}
            cy={a.y}
            r={4}
            fill="#d0523f"
            opacity={friction * 0.8}
          />
        ))}

        {/* Pore Water Pressure Arrows (Horizontal) */}
        {hArrows.map((a, i) => (
          <g key={`arrow-h-${i}`} opacity={pressure}>
            <line
              x1={a.x - 5}
              y1={a.y}
              x2={a.x - 5 - 20 * pressure}
              y2={a.y}
              stroke="#e0b44c"
              strokeWidth={2}
              markerEnd="url(#arrowhead-amber)"
            />
            <line
              x1={a.x + 5}
              y1={a.y}
              x2={a.x + 5 + 20 * pressure}
              y2={a.y}
              stroke="#e0b44c"
              strokeWidth={2}
              markerEnd="url(#arrowhead-amber)"
            />
          </g>
        ))}

        {/* Pore Water Pressure Arrows (Vertical) */}
        {vArrows.map((a, i) => (
          <g key={`arrow-v-${i}`} opacity={pressure}>
            <line
              x1={a.x}
              y1={a.y - 5}
              x2={a.x}
              y2={a.y - 5 - 15 * pressure}
              stroke="#e0b44c"
              strokeWidth={2}
              markerEnd="url(#arrowhead-amber)"
            />
            <line
              x1={a.x}
              y1={a.y + 5}
              x2={a.x}
              y2={a.y + 5 + 15 * pressure}
              stroke="#e0b44c"
              strokeWidth={2}
              markerEnd="url(#arrowhead-amber)"
            />
          </g>
        ))}

        {/* Labels */}
        <g opacity={pressure}>
          <line x1={310} y1={150} x2={340} y2={130} stroke="#e9f2f6" strokeWidth={0.5} />
          <text x={345} y={130} fill="#e0b44c" fontSize={10} alignmentBaseline="middle">
            PORENWASSERDRUCK
          </text>
        </g>
        <g opacity={friction}>
          <line x1={160} y1={150} x2={180} y2={110} stroke="#e9f2f6" strokeWidth={0.5} />
          <text x={185} y={110} fill="#d0523f" fontSize={10} alignmentBaseline="middle">
            KORNREIBUNG
          </text>
        </g>
        <text x={80} y={340} fill="#8a949b" fontSize={9} opacity={0.7}>
          UNTERGRUND-QUERSCHNITT (SCHEMATISCH)
        </text>
      </svg>

      {p.title ? (
        <div
          style={{
            marginTop: 40,
            transform: `translateY(${titleRise}px)`,
            fontFamily: 'monospace',
            fontSize: 28,
            color: '#e9f2f6',
            letterSpacing: '2px',
            borderTop: '1px solid #e9f2f6',
            paddingTop: 10,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};