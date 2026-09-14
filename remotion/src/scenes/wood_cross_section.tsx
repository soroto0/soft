import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const WoodCrossSectionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 4) * fps));

  const opacity = p.enter * p.exit;

  const split = interpolate(frame, [span * 0.1, span * 0.9], [0, 1], {
    easing: Easing.bezier(0.22, 1, 0.36, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const vibration = interpolate(frame, [span * 0.2, span * 0.8], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelAlpha = interpolate(frame, [span * 0.4, span * 0.7], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { y: 50, h: 40, fill: '#e0b44c', name: 'SAPWOOD', opacity: 0.3 },
    { y: 90, h: 100, fill: '#e0b44c', name: 'HEARTWOOD', opacity: 0.6 },
    { y: 190, h: 40, fill: '#e0b44c', name: 'GROWTH RING', opacity: 0.4 },
  ];

  const fiberCount = 30;
  const fibers = Array.from({ length: fiberCount }).map((_, i) => ({
    x: 60 + (i * 10),
    offset: (i % 3) * 5,
  }));

  const ticks = [
    { val: '0"', y: 50 },
    { val: '2"', y: 115 },
    { val: '4"', y: 180 },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 300" style={{ overflow: 'visible' }}>
        {/* Wood Layers */}
        {layers.map((layer) => (
          <rect
            key={layer.name}
            x={50}
            y={layer.y}
            width={300}
            height={layer.h}
            fill={layer.fill}
            opacity={layer.opacity}
            stroke="#e9f2f6"
            strokeWidth={0.5}
          />
        ))}

        {/* Vertical Fibers */}
        {fibers.map((f) => {
          const distToCenter = Math.abs(f.x - 200);
          const isNearGouge = distToCenter < 40;
          const bend = isNearGouge ? (40 - distToCenter) * split * 0.8 : 0;
          const direction = f.x < 200 ? -1 : 1;
          const shake = isNearGouge ? Math.sin(frame * 1.5 + f.x) * vibration * 2 : 0;

          return (
            <path
              key={f.x}
              d={`M ${f.x + shake} 50 Q ${f.x + bend * direction + shake} 115 ${f.x + shake} 180`}
              stroke={isNearGouge && split > 0.2 ? "#e9f2f6" : "#e0b44c"}
              strokeWidth={isNearGouge ? 1.5 : 0.8}
              fill="none"
              opacity={0.6}
            />
          );
        })}

        {/* The Gouge Path */}
        <path
          d={`M 195 50 L 200 ${50 + 130 * split} L 205 50`}
          fill="none"
          stroke="#d0523f"
          strokeWidth={2}
          strokeLinejoin="round"
        />
        
        {/* Jagged Splinters */}
        {split > 0.5 && (
          <g opacity={split}>
            <path d="M 198 120 L 185 110 M 202 140 L 215 130 M 197 160 L 180 155" 
                  stroke="#e9f2f6" strokeWidth={1.5} />
          </g>
        )}

        {/* Force Arrows */}
        <g opacity={split * (1 - vibration * 0.5)}>
          <line x1={180} y1={100} x2={140} y2={100} stroke="#d0523f" strokeWidth={2} />
          <polygon points="140,100 150,95 150,105" fill="#d0523f" />
          <line x1={220} y1={100} x2={260} y2={100} stroke="#d0523f" strokeWidth={2} />
          <polygon points="260,100 250,95 250,105" fill="#d0523f" />
          <text x={200} y={90} fill="#d0523f" fontSize={8} textAnchor="middle">LATERAL TENSION</text>
        </g>

        {/* Labels and Scale */}
        {layers.map((layer) => (
          <text
            key={`label-${layer.name}`}
            x={355}
            y={layer.y + layer.h / 2}
            fill="#e9f2f6"
            fontSize={7}
            opacity={labelAlpha}
            alignmentBaseline="middle"
          >
            {layer.name}
          </text>
        ))}

        {ticks.map((tick) => (
          <g key={tick.val} opacity={0.8}>
            <line x1={40} y1={tick.y} x2={50} y2={tick.y} stroke="#e9f2f6" strokeWidth={1} />
            <text x={35} y={tick.y} fill="#e9f2f6" fontSize={8} textAnchor="end" alignmentBaseline="middle">
              {tick.val}
            </text>
          </g>
        ))}
        
        <text x={50} y={40} fill="#e9f2f6" fontSize={9} fontWeight="bold">GRAIN AXIS (VERTICAL)</text>
        <text x={200} y={195} fill="#d0523f" fontSize={10} textAnchor="middle" opacity={split}>
          STRUCTURAL FAILURE POINT
        </text>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            fontFamily: 'monospace',
            fontSize: 28,
            color: '#e9f2f6',
            letterSpacing: '2px',
            borderLeft: '4px solid #d0523f',
            paddingLeft: '16px',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};