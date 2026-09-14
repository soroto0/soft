import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const EccentricLoadPathScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const draw = interpolate(frame, [0, span * 0.25], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shift = interpolate(frame, [span * 0.35, span * 0.65], [0, 50], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const infoOpacity = interpolate(frame, [span * 0.6, span * 0.8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { id: 'core', name: 'STAHLKERN S355', fill: '#8a949b', w: 140 },
    { id: 'prime', name: 'GRUNDIERUNG', fill: '#5d6a73', w: 150 },
    { id: 'coat', name: 'BESCHICHTUNG', fill: '#c9d3d9', w: 160 },
  ];

  const bolts = [
    { x: 160, y: 80 }, { x: 240, y: 80 },
    { x: 160, y: 140 }, { x: 240, y: 140 },
    { x: 160, y: 200 }, { x: 240, y: 200 },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 500 400" style={{ overflow: 'visible' }}>
        {/* Structural Layers (Cross-section detail) */}
        {layers.reverse().map((layer, i) => (
          <rect
            key={layer.id}
            x={250 - (layer.w / 2) * draw}
            y={50}
            width={layer.w * draw}
            height={250}
            fill={layer.fill}
            stroke="#e9f2f6"
            strokeWidth={0.5}
            opacity={0.8 - i * 0.1}
          />
        ))}

        {/* Bolt Group */}
        {bolts.map((bolt, i) => (
          <g key={`bolt-${i}`} opacity={draw}>
            <circle cx={bolt.x} cy={bolt.y} r={8} fill="#4a555e" stroke="#e9f2f6" strokeWidth={1} />
            <line x1={bolt.x - 12} y1={bolt.y} x2={bolt.x + 12} y2={bolt.y} stroke="#e9f2f6" strokeWidth={0.5} />
            <line x1={bolt.x} y1={bolt.y - 12} x2={bolt.x} y2={bolt.y + 12} stroke="#e9f2f6" strokeWidth={0.5} />
          </g>
        ))}

        {/* Centroid Axis (System Center) */}
        <line
          x1={200}
          y1={30}
          x2={200}
          y2={320}
          stroke="#e9f2f6"
          strokeWidth={1.5}
          strokeDasharray="8 4"
          opacity={draw * 0.6}
        />
        <text x={200} y={25} fill="#e9f2f6" fontSize={10} textAnchor="middle" opacity={infoOpacity}>
          SYSTEMACHSE
        </text>

        {/* Load Axis (Moving Orange Line) */}
        <g transform={`translate(${shift}, 0)`}>
          <line
            x1={200}
            y1={10}
            x2={200}
            y2={340}
            stroke="#e0b44c"
            strokeWidth={3}
          />
          <path d="M 195 340 L 200 355 L 205 340 Z" fill="#e0b44c" />
          <text x={205} y={370} fill="#e0b44c" fontSize={12} fontWeight="bold" opacity={draw}>
            LASTACHSE (F)
          </text>
        </g>

        {/* Eccentricity Dimension */}
        {shift > 5 ? (
          <g opacity={infoOpacity}>
            <line x1={200} y1={300} x2={200 + shift} y2={300} stroke="#d0523f" strokeWidth={1} />
            <line x1={200} y1={295} x2={200} y2={305} stroke="#d0523f" strokeWidth={1} />
            <line x1={200 + shift} y1={295} x2={200 + shift} y2={305} stroke="#d0523f" strokeWidth={1} />
            <text x={200 + shift / 2} y={290} fill="#d0523f" fontSize={14} textAnchor="middle">
              e
            </text>
          </g>
        ) : null}

        {/* Material Labels */}
        {layers.map((layer, i) => (
          <g key={`label-${layer.id}`} opacity={infoOpacity}>
            <line
              x1={250 + layer.w / 2}
              y1={70 + i * 30}
              x2={380}
              y2={70 + i * 30}
              stroke="#e9f2f6"
              strokeWidth={0.5}
            />
            <text x={385} y={74 + i * 30} fill="#e9f2f6" fontSize={9}>
              {layer.name}
            </text>
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
            fontWeight: 700,
            color: '#e9f2f6',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            opacity: infoOpacity,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};