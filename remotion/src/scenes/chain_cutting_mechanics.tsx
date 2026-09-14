import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ChainCuttingMechanicsScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const cutDepth = interpolate(frame, [0, span], [0, 45], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const friction = interpolate(
    Math.sin((frame / fps) * 15),
    [-1, 1],
    [-8, 8]
  );

  const heatIntensity = interpolate(
    frame % 20,
    [0, 10, 20],
    [0.6, 1, 0.6],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  const titleRise = interpolate(frame, [0, span * 0.2], [20, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { name: 'BESCHICHTUNG', width: 12, fill: '#5b7f9c', label: '800µm' },
    { name: 'SCHIFFSSTAHL', width: 60, fill: '#8a949b', label: '25mm' },
    { name: 'INNENSTRUKTUR', width: 20, fill: '#c9d3d9', label: 'VERSTEIFUNG' },
  ];

  const arrows = [
    { x: 80, dir: -1, label: 'ZUGKRAFT F1' },
    { x: 320, dir: 1, label: 'ZUGKRAFT F2' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="75%" viewBox="0 0 400 300" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="heatGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#d0523f" />
            <stop offset="50%" stopColor="#e0b44c" />
            <stop offset="100%" stopColor="#d0523f" />
          </linearGradient>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#e0b44c" />
          </marker>
        </defs>

        {/* Ship Hull Cross-Section */}
        <g transform="translate(150, 50)">
          {layers.map((layer, i) => {
            const prevWidths = layers.slice(0, i).reduce((acc, l) => acc + l.width, 0);
            return (
              <g key={layer.name}>
                <rect
                  x={prevWidths}
                  y={0}
                  width={layer.width}
                  height={200}
                  fill={layer.fill}
                  stroke="#1e262c"
                  strokeWidth={0.5}
                />
                {/* Cutting Notch */}
                <rect
                  x={prevWidths - 1}
                  y={95}
                  width={layer.width + 2}
                  height={10}
                  fill="#000"
                  opacity={cutDepth / 45}
                />
                <text
                  x={prevWidths + layer.width / 2}
                  y={215}
                  fill="#e9f2f6"
                  fontSize={6}
                  textAnchor="middle"
                  opacity={0.8}
                >
                  {layer.name}
                </text>
                <text
                  x={prevWidths + layer.width / 2}
                  y={225}
                  fill="#8a949b"
                  fontSize={5}
                  textAnchor="middle"
                >
                  {layer.label}
                </text>
              </g>
            );
          })}
        </g>

        {/* The Chain */}
        <g transform={`translate(${200 + friction}, 100)`}>
          <rect
            x={-150}
            y={-4}
            width={300}
            height={8}
            rx={4}
            fill="#e9f2f6"
            stroke="#1e262c"
            strokeWidth={1}
          />
          {/* Chain Links Detail */}
          {[...Array(12)].map((_, i) => (
            <ellipse
              key={i}
              cx={-140 + i * 25}
              cy={0}
              rx={8}
              ry={3}
              fill="none"
              stroke="#8a949b"
              strokeWidth={0.5}
            />
          ))}
        </g>

        {/* Thermal Zone */}
        <rect
          x={145}
          y={92}
          width={70}
          height={16}
          fill="url(#heatGrad)"
          opacity={0.6 * heatIntensity}
          style={{ filter: 'blur(4px)' }}
        />

        {/* Tension Arrows */}
        {arrows.map((arrow) => (
          <g key={arrow.label} transform={`translate(${arrow.x}, 100)`}>
            <path
              d={`M 0 0 L ${40 * arrow.dir} 0`}
              stroke="#e0b44c"
              strokeWidth={2}
              markerEnd="url(#arrowhead)"
            />
            <text
              x={20 * arrow.dir}
              y={-10}
              fill="#e0b44c"
              fontSize={8}
              textAnchor="middle"
              fontWeight="bold"
            >
              {arrow.label}
            </text>
          </g>
        ))}

        {/* Temperature Labels */}
        <g transform="translate(250, 80)">
          <line x1={0} y1={20} x2={20} y2={0} stroke="#e9f2f6" strokeWidth={0.5} />
          <text x={25} y={0} fill="#d0523f" fontSize={9} fontWeight="bold">
            ~1200°C
          </text>
          <text x={25} y={10} fill="#e9f2f6" fontSize={7}>
            REAKTIONSZONE
          </text>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            color: '#e9f2f6',
            fontSize: 32,
            fontFamily: 'sans-serif',
            letterSpacing: '0.1em',
            transform: `translateY(${titleRise}px)`,
            borderLeft: '4px solid #e0b44c',
            paddingLeft: '16px',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};