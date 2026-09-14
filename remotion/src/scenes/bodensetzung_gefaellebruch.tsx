import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const BodensetzungGefaellebruchScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const sag = interpolate(frame, [span * 0.2, span * 0.8], [0, 25], {
    easing: Easing.bezier(0.45, 0, 0.55, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const arrowAlpha = interpolate(frame, [span * 0.1, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const waterAlpha = interpolate(frame, [span * 0.5, span * 0.9], [0, 0.8], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { y: 0, h: 80, fill: '#5d6a73', name: 'OBERBODEN' },
    { y: 80, h: 140, fill: '#8a949b', name: 'VERFÜLLUNG / BETTUNG' },
  ];

  const arrows = [120, 180, 240, 300, 380];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 500 300" style={{ overflow: 'visible' }}>
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#e0b44c" />
          </marker>
        </defs>

        {/* Soil Layers */}
        {layers.map((layer) => (
          <rect
            key={layer.name}
            x="40"
            y={layer.y + 40}
            width="420"
            height={layer.h}
            fill={layer.fill}
            opacity={0.4}
            stroke="#e9f2f6"
            strokeWidth="0.5"
          />
        ))}

        {/* Soil Pressure Arrows */}
        {arrows.map((x) => (
          <g key={x} opacity={arrowAlpha}>
            <line
              x1={x}
              y1={50}
              x2={x}
              y2={110}
              stroke="#e0b44c"
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
            />
          </g>
        ))}
        <text x="250" y="35" fill="#e0b44c" fontSize="10" textAnchor="middle" opacity={arrowAlpha}>
          LASTDRUCK (BODENEIGENGEWICHT)
        </text>

        {/* Water accumulation in the sag */}
        <path
          d={`M 150 ${152 + sag * 0.4} Q 250 ${154 + sag} 350 ${156 + sag * 0.4} L 350 156 Q 250 154 150 152 Z`}
          fill="#5b7f9c"
          opacity={waterAlpha}
        />

        {/* Pipe - 2% slope is roughly 8 units drop over 400 units */}
        <path
          d={`M 50 150 Q 250 ${154 + sag} 450 158`}
          fill="none"
          stroke="#e9f2f6"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d={`M 50 150 Q 250 ${154 + sag} 450 158`}
          fill="none"
          stroke="#8a949b"
          strokeWidth="6"
          strokeLinecap="round"
        />

        {/* Labels and Annotations */}
        <g opacity={1}>
          <line x1="50" y1="170" x2="450" y2="178" stroke="#e9f2f6" strokeWidth="0.5" strokeDasharray="4 2" />
          <text x="50" y="185" fill="#e9f2f6" fontSize="9">GEFÄLLE 2% (SOLL)</text>
          
          <g opacity={sag / 25}>
            <line x1="250" y1="154" x2="250" y2={154 + sag} stroke="#d0523f" strokeWidth="1" />
            <text x="260" y={165 + sag} fill="#d0523f" fontSize="10">SETZUNG: 3-5 cm</text>
          </g>
        </g>

        {/* Depth Ticks */}
        {[0, 50, 100, 150].map((tick) => (
          <g key={tick}>
            <line x1="35" y1={80 + tick} x2="45" y2={80 + tick} stroke="#e9f2f6" strokeWidth="1" />
            <text x="30" y={83 + tick} fill="#e9f2f6" fontSize="8" textAnchor="end">-{tick}cm</text>
          </g>
        ))}
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            fontFamily: 'sans-serif',
            fontSize: 42,
            color: '#e9f2f6',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            borderLeft: '4px solid #d0523f',
            paddingLeft: '20px',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};