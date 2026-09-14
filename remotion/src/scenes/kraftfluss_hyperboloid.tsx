import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const KraftflussHyperboloidScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const draw = interpolate(frame, [0, span * 0.2], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const flow = interpolate(frame % (fps * 2), [0, fps * 2], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textReveal = interpolate(frame, [span * 0.15, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const numGenerators = 16;
  const generators = Array.from({ length: numGenerators }).map((_, i) => {
    const angle = (i / numGenerators) * Math.PI * 2;
    const twist = Math.PI / 2.5;
    const rTop = 70;
    const rBottom = 130;
    const yTop = 120;
    const yBottom = 400;
    
    return {
      x1: 200 + rTop * Math.cos(angle),
      y1: yTop + 20 * Math.sin(angle),
      x2: 200 + rBottom * Math.cos(angle + twist),
      y2: yBottom + 35 * Math.sin(angle + twist),
    };
  });

  return (
    <AbsoluteFill style={{ opacity }}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 400 550"
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
            <polygon points="0 0, 10 3.5, 0 7" fill="#e0b44c" />
          </marker>
        </defs>

        {/* Foundation Ring */}
        <ellipse
          cx={200}
          cy={400}
          rx={130}
          ry={35}
          fill="none"
          stroke="#d0523f"
          strokeWidth={4 * draw}
          strokeDasharray="8 4"
        />
        <text
          x={340}
          y={410}
          fill="#d0523f"
          fontSize={12}
          opacity={textReveal}
          fontFamily="monospace"
        >
          RINGFUNDAMENT
        </text>
        <line x1={335} y1={405} x2={280} y2={405} stroke="#d0523f" strokeWidth={1} opacity={textReveal} />

        {/* Hyperboloid Surface (Generators) */}
        {generators.map((g, i) => (
          <g key={i}>
            <line
              x1={g.x1}
              y1={g.y1}
              x2={g.x2}
              y2={g.y2}
              stroke="#e9f2f6"
              strokeWidth={0.8}
              opacity={0.3 * draw}
            />
            {/* Pressure Vectors */}
            {[0, 0.5].map((offset) => {
              const t = (flow + offset) % 1;
              const vx1 = g.x1 + (g.x2 - g.x1) * t;
              const vy1 = g.y1 + (g.y2 - g.y1) * t;
              const vx2 = g.x1 + (g.x2 - g.x1) * (t + 0.08);
              const vy2 = g.y1 + (g.y2 - g.y1) * (t + 0.08);
              return (
                <line
                  key={offset}
                  x1={vx1}
                  y1={vy1}
                  x2={vx2}
                  y2={vy2}
                  stroke="#e0b44c"
                  strokeWidth={2.5}
                  markerEnd="url(#arrowhead)"
                  opacity={draw * (1 - Math.abs(t - 0.5) * 2)}
                />
              );
            })}
          </g>
        ))}

        {/* Top Ring */}
        <ellipse
          cx={200}
          cy={120}
          rx={70}
          ry={20}
          fill="none"
          stroke="#e9f2f6"
          strokeWidth={2 * draw}
        />
        <text
          x={60}
          y={110}
          fill="#e9f2f6"
          fontSize={12}
          opacity={textReveal}
          fontFamily="monospace"
          textAnchor="end"
        >
          TURMSPITZE
        </text>
        <line x1={65} y1={110} x2={130} y2={110} stroke="#e9f2f6" strokeWidth={1} opacity={textReveal} />

        {/* Labels for Physics */}
        <g opacity={textReveal}>
          <text x={200} y={260} fill="#e0b44c" fontSize={10} textAnchor="middle" fontFamily="monospace">
            DRUCKSPANNUNG (σ)
          </text>
          <path d="M 180 265 L 150 300" stroke="#e0b44c" strokeWidth={0.5} fill="none" />
          <path d="M 220 265 L 250 300" stroke="#e0b44c" strokeWidth={0.5} fill="none" />
        </g>

        {/* Caption */}
        {p.title && (
          <text
            x={200}
            y={500}
            fill="#e9f2f6"
            fontSize={18}
            textAnchor="middle"
            fontFamily="serif"
            fontStyle="italic"
            opacity={textReveal}
          >
            {p.title}
          </text>
        )}
      </svg>
    </AbsoluteFill>
  );
};