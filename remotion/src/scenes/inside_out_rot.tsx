import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const InsideOutRotScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const growth = interpolate(frame, [span * 0.1, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const flow = interpolate(frame, [0, span], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const slide = interpolate(frame, [0, span * 0.2], [30, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { id: 'steel', label: 'STEEL ALLOY', color: '#5d6a73', x: 140, w: 120 },
    { id: 'rot', label: 'OXIDATION LAYER', color: 'url(#rotGrad)', x: 125, w: 15 },
    { id: 'shell', label: 'OUTER COATING', color: '#e9f2f6', x: 110, w: 15 },
  ];

  const depthTicks = [0, 5, 10, 15, 20];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 300" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="rotGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d0523f" />
            <stop offset="50%" stopColor="#e0b44c" />
            <stop offset="100%" stopColor="#d0523f" />
          </linearGradient>
          <pattern id="moisturePattern" x="0" y={flow} width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="10" cy="10" r="1.5" fill="#e9f2f6" opacity="0.4" />
          </pattern>
        </defs>

        {/* Cross-section layers */}
        {layers.map((layer, i) => (
          <g key={layer.id}>
            <rect
              x={layer.x}
              y={60}
              width={layer.w * (layer.id === 'rot' ? growth : 1)}
              height={180}
              fill={layer.color}
              stroke="#e9f2f6"
              strokeWidth="0.5"
              opacity={layer.id === 'rot' ? growth : 1}
            />
            {/* Leader Lines */}
            <line
              x1={layer.x + layer.w / 2}
              y1={60}
              x2={layer.x + layer.w / 2}
              y2={40 - i * 15}
              stroke="#e9f2f6"
              strokeWidth="0.5"
              opacity={0.6}
            />
            <text
              x={layer.x + layer.w / 2}
              y={35 - i * 15}
              fill="#e9f2f6"
              fontSize="8"
              textAnchor="middle"
              fontFamily="monospace"
            >
              {layer.label}
            </text>
          </g>
        ))}

        {/* Moisture overlay in the rot pocket */}
        <rect
          x={125}
          y={60}
          width={15 * growth}
          height={180}
          fill="url(#moisturePattern)"
          pointerEvents="none"
        />

        {/* Depth Axis */}
        <g transform="translate(110, 250)">
          <line x1="0" y1="0" x2="150" y2="0" stroke="#e9f2f6" strokeWidth="1" />
          {depthTicks.map((tick) => (
            <g key={tick} transform={`translate(${tick * 7.5}, 0)`}>
              <line x1="0" y1="0" x2="0" y2="5" stroke="#e9f2f6" strokeWidth="1" />
              <text y="15" fill="#e9f2f6" fontSize="7" textAnchor="middle" fontFamily="monospace">
                {tick}mm
              </text>
            </g>
          ))}
          <text x="75" y="28" fill="#e9f2f6" fontSize="8" textAnchor="middle" opacity="0.7">
            PENETRATION DEPTH
          </text>
        </g>

        {/* Warning indicators */}
        <circle cx={132} cy={120} r={3 * growth} fill="#d0523f">
          <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx={132} cy={180} r={3 * growth} fill="#d0523f">
          <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite" />
        </circle>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            color: '#e9f2f6',
            fontFamily: 'monospace',
            fontSize: '2.2rem',
            letterSpacing: '0.1em',
            transform: `translateY(${slide}px)`,
            borderLeft: '4px solid #d0523f',
            paddingLeft: '1rem',
            textTransform: 'uppercase',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};