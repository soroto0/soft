import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const InternalPressureAnalysisScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const reveal = interpolate(frame, [0, span * 0.15], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const expand = interpolate(frame, [span * 0.1, span * 0.6], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const stressValue = interpolate(frame, [span * 0.2, span * 0.85], [0, 98.42], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { name: 'ZINK (EXT)', w: 6, fill: '#e9f2f6', x: 460 },
    { name: 'STAHL S355', w: 40, fill: '#8a949b', x: 420 },
    { name: 'ZINK (INT)', w: 6, fill: '#e9f2f6', x: 414 },
  ];

  const arrows = [80, 140, 200, 260, 320];
  const ticks = [0, 25, 50, 75, 100];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 600 400" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="stressGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#e0b44c" stopOpacity={0} />
            <stop offset="100%" stopColor="#d0523f" stopOpacity={0.8} />
          </linearGradient>
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

        {/* Silo Wall Layers */}
        {layers.map((layer) => (
          <g key={layer.name} opacity={reveal}>
            <rect
              x={layer.x}
              y={50}
              width={layer.w}
              height={300}
              fill={layer.fill}
              stroke="#e9f2f6"
              strokeWidth={0.5}
            />
            <text
              x={layer.x + layer.w / 2}
              y={40}
              fill="#e9f2f6"
              fontSize={8}
              textAnchor="middle"
              style={{ fontFamily: 'monospace' }}
            >
              {layer.name}
            </text>
          </g>
        ))}

        {/* Stress Accumulation Gradient in Steel Layer */}
        <rect
          x={420}
          y={50}
          width={40 * (stressValue / 100)}
          height={300}
          fill="url(#stressGrad)"
          opacity={reveal}
        />

        {/* Force Vectors */}
        {arrows.map((y, i) => {
          const arrowX1 = 120;
          const targetX2 = 414;
          const currentX2 = arrowX1 + (targetX2 - arrowX1) * expand;
          return (
            <g key={i}>
              <line
                x1={arrowX1}
                y1={y}
                x2={currentX2}
                y2={y}
                stroke="#e0b44c"
                strokeWidth={3}
                markerEnd={expand > 0.1 ? "url(#arrowhead)" : ""}
              />
              <text
                x={arrowX1 - 10}
                y={y + 4}
                fill="#e0b44c"
                fontSize={10}
                textAnchor="end"
                opacity={expand}
              >
                F_ring
              </text>
            </g>
          );
        })}

        {/* Pressure Scale */}
        <g transform="translate(120, 370)" opacity={reveal}>
          <line x1={0} y1={0} x2={294} y2={0} stroke="#e9f2f6" strokeWidth={1} />
          {ticks.map((t) => (
            <g key={t} transform={`translate(${(t / 100) * 294}, 0)`}>
              <line x1={0} y1={0} x2={0} y2={8} stroke="#e9f2f6" strokeWidth={1} />
              <text
                y={20}
                fill="#e9f2f6"
                fontSize={9}
                textAnchor="middle"
                style={{ fontFamily: 'monospace' }}
              >
                {t}
              </text>
            </g>
          ))}
          <text x={147} y={35} fill="#e9f2f6" fontSize={10} textAnchor="middle">
            LASTVERTEILUNG (N/mm²)
          </text>
        </g>

        {/* Live Value Display */}
        <g transform="translate(480, 200)" opacity={reveal}>
          <text
            fill="#d0523f"
            fontSize={24}
            fontWeight="bold"
            style={{ fontFamily: 'monospace' }}
          >
            {stressValue.toFixed(2)}
          </text>
          <text
            y={20}
            fill="#e9f2f6"
            fontSize={12}
            style={{ fontFamily: 'monospace' }}
          >
            N/mm²
          </text>
          <path
            d="M -10,0 L -30,-10 L -30,10 Z"
            fill="#d0523f"
            transform={`translate(0, ${-5})`}
          />
        </g>

        <text
          x={20}
          y={30}
          fill="#e9f2f6"
          fontSize={12}
          opacity={reveal * 0.7}
          style={{ fontFamily: 'monospace' }}
        >
          BASIS-SEGMENT: RING 01-04
        </text>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            width: '100%',
            textAlign: 'center',
            color: '#e9f2f6',
            fontFamily: 'sans-serif',
            fontSize: 28,
            letterSpacing: '0.1em',
            opacity: reveal,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};