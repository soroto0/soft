import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ChemicalBondSabotageScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const progress = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const sugarEntry = interpolate(frame, [span * 0.1, span * 0.6], [0, 1], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const bondDisruption = interpolate(frame, [span * 0.4, span * 0.8], [1, 0], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const captionRise = interpolate(frame, [0, span * 0.2], [20, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const sulfurNodes = [
    { id: 's1a', x: 100, y: 80, label: 'S' },
    { id: 's1b', x: 300, y: 80, label: 'S' },
    { id: 's2a', x: 100, y: 150, label: 'S' },
    { id: 's2b', x: 300, y: 150, label: 'S' },
    { id: 's3a', x: 100, y: 220, label: 'S' },
    { id: 's3b', x: 300, y: 220, label: 'S' },
  ];

  const sugars = [
    { id: 'sugar1', x: 200, y: 80 },
    { id: 'sugar2', x: 200, y: 150 },
    { id: 'sugar3', x: 200, y: 220 },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ width: width * 0.8, height: height * 0.7, position: 'relative' }}>
        <svg viewBox="0 0 400 300" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Connection Lines (Bonds) */}
          {[0, 1, 2].map((i) => (
            <g key={`bond-${i}`}>
              <line
                x1={120}
                y1={80 + i * 70}
                x2={280}
                y2={80 + i * 70}
                stroke="#e9f2f6"
                strokeWidth={2}
                strokeDasharray={i === 0 ? "0" : "4 4"}
                opacity={i === 0 ? 1 : bondDisruption}
              />
              {i > 0 && (
                <path
                  d={`M ${180} ${70 + i * 70} L ${220} ${90 + i * 70} M ${180} ${90 + i * 70} L ${220} ${70 + i * 70}`}
                  stroke="#d0523f"
                  strokeWidth={3}
                  opacity={sugarEntry}
                />
              )}
            </g>
          ))}

          {/* Sulfur Atoms */}
          {sulfurNodes.map((node) => (
            <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
              <circle
                r={18}
                fill="#e0b44c"
                stroke="#e9f2f6"
                strokeWidth={1.5}
                filter="url(#glow)"
              />
              <text
                dy="0.35em"
                textAnchor="middle"
                fill="#1a1a1a"
                fontSize={14}
                fontWeight="bold"
                fontFamily="monospace"
              >
                {node.label}
              </text>
            </g>
          ))}

          {/* Sugar Obstacles */}
          {sugars.map((sugar, i) => {
            const yPos = sugar.y - (1 - sugarEntry) * 150;
            const rotation = progress * 120 + i * 45;
            return (
              <g key={sugar.id} transform={`translate(${sugar.x}, ${yPos}) rotate(${rotation})`} opacity={sugarEntry}>
                <polygon
                  points="0,-22 19,-11 19,11 0,22 -19,11 -19,-11"
                  fill="#d0523f"
                  stroke="#e9f2f6"
                  strokeWidth={1}
                />
                <text
                  y={35}
                  textAnchor="middle"
                  fill="#d0523f"
                  fontSize={8}
                  fontFamily="sans-serif"
                  transform={`rotate(${-rotation})`}
                >
                  AZÚCAR
                </text>
              </g>
            );
          })}

          {/* Legend */}
          <g transform="translate(50, 280)">
            <circle r={6} fill="#e0b44c" />
            <text x={12} y={4} fill="#e9f2f6" fontSize={10}>AZUFRE (S)</text>
            <rect x={100} y={-6} width={12} height={12} fill="#d0523f" />
            <text x={118} y={4} fill="#e9f2f6" fontSize={10}>INTERFERENCIA</text>
          </g>
        </svg>

        {p.title && (
          <div
            style={{
              position: 'absolute',
              bottom: -40,
              width: '100%',
              textAlign: 'center',
              color: '#e9f2f6',
              fontFamily: 'Helvetica, Arial, sans-serif',
              fontSize: 32,
              fontWeight: 300,
              letterSpacing: '0.1em',
              transform: `translateY(${captionRise}px)`,
              opacity: progress > 0.1 ? 1 : 0,
            }}
          >
            {p.title.toUpperCase()}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};