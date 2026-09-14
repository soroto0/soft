import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ProgressiveFailureSequenceScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const failPhase = interpolate(frame, [span * 0.1, span * 0.25], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const loadShift = interpolate(frame, [span * 0.3, span * 0.65], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const chainReaction = interpolate(frame, [span * 0.6, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const captionRise = interpolate(frame, [0, span * 0.15], [20, 0], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const nodes = [
    { x: 300, y: 600 }, { x: 433, y: 600 }, { x: 566, y: 600 }, { x: 700, y: 600 },
    { x: 366, y: 450 }, { x: 500, y: 450 }, { x: 633, y: 450 }
  ];

  const bars = [
    { f: 0, t: 1, id: 'b0', neighbor: false },
    { f: 1, t: 2, id: 'b1', neighbor: true },
    { f: 2, t: 3, id: 'b2', neighbor: false },
    { f: 4, t: 5, id: 'b3', neighbor: true },
    { f: 5, t: 6, id: 'b4', neighbor: true },
    { f: 0, t: 4, id: 'b5', neighbor: false },
    { f: 4, t: 1, id: 'b6', neighbor: true },
    { f: 1, t: 5, id: 'fail', neighbor: false },
    { f: 5, t: 2, id: 'b8', neighbor: true },
    { f: 2, t: 6, id: 'b9', neighbor: false },
    { f: 6, t: 3, id: 'b10', neighbor: false }
  ];

  const arrows = [
    { x: 500, y: 615, angle: 0, neighbor: true, label: 'b1' },
    { x: 433, y: 435, angle: 0, neighbor: true, label: 'b3' },
    { x: 566, y: 435, angle: 0, neighbor: true, label: 'b4' },
    { x: 385, y: 525, angle: 45, neighbor: true, label: 'b6' },
    { x: 545, y: 525, angle: 45, neighbor: true, label: 'b8' }
  ];

  const loadVal = Math.round(interpolate(loadShift, [0, 1], [85, 242]));

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width={width} height={height} viewBox="0 0 1000 1000">
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#e9f2f6" />
          </marker>
          <marker id="arrowhead-red" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#d0523f" />
          </marker>
        </defs>

        {/* Grid Bars */}
        {bars.map((b) => {
          const n1 = nodes[b.f];
          const n2 = nodes[b.t];
          let color = '#e9f2f6';
          let strokeWidth = 2;
          let dash = '0';

          if (b.id === 'fail') {
            color = interpolate(failPhase, [0, 1], [0, 1]) > 0 ? '#e0b44c' : '#e9f2f6';
            strokeWidth = interpolate(failPhase, [0.8, 1], [3, 1]);
            dash = failPhase > 0.9 ? '4 4' : '0';
          } else if (b.neighbor) {
            color = interpolate(chainReaction, [0, 1], [0, 1]) > 0.5 ? '#d0523f' : '#e9f2f6';
            strokeWidth = 2 + loadShift * 2;
          }

          return (
            <line
              key={b.id}
              x1={n1.x}
              y1={n1.y}
              x2={n2.x}
              y2={n2.y}
              stroke={color}
              strokeWidth={strokeWidth}
              strokeDasharray={dash}
            />
          );
        })}

        {/* Load Arrows */}
        {arrows.map((a, i) => {
          const thickness = 1 + loadShift * 5;
          const color = chainReaction > 0.5 ? '#d0523f' : '#e9f2f6';
          const marker = chainReaction > 0.5 ? 'url(#arrowhead-red)' : 'url(#arrowhead)';
          return (
            <g key={i} transform={`translate(${a.x}, ${a.y}) rotate(${a.angle})`}>
              <line
                x1="-20"
                y1="0"
                x2="20"
                y2="0"
                stroke={color}
                strokeWidth={thickness}
                markerEnd={marker}
              />
              {loadShift > 0.1 && (
                <text
                  y="-15"
                  fill={color}
                  fontSize={14}
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  {loadVal}kN
                </text>
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {nodes.map((n, i) => (
          <circle key={i} cx={n.x} cy={n.y} r={4} fill="#e9f2f6" />
        ))}

        {/* Annotations */}
        <text x="500" y="350" fill="#e9f2f6" fontSize={18} textAnchor="middle" opacity={0.7}>
          STATISCHES SYSTEM: FACHWERKTRÄGER
        </text>
        
        {failPhase > 0 && (
          <g opacity={failPhase}>
            <line x1="450" y1="500" x2="400" y2="480" stroke="#e0b44c" strokeWidth={1} />
            <text x="390" y="475" fill="#e0b44c" fontSize={16} textAnchor="end">
              PRIMÄRAUSFALL
            </text>
          </g>
        )}

        {chainReaction > 0.2 && (
          <g opacity={chainReaction}>
            <rect x="680" y="430" width="120" height="30" fill="#d0523f" opacity={0.2} />
            <text x="685" y="450" fill="#d0523f" fontSize={16} fontWeight="bold">
              ÜBERLASTUNG
            </text>
          </g>
        )}
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: 80,
            transform: `translateY(${captionRise}px)`,
            fontFamily: 'sans-serif',
            fontSize: 42,
            fontWeight: 700,
            color: '#e9f2f6',
            letterSpacing: '0.1em',
            textShadow: '0 4px 12px rgba(0,0,0,0.5)',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};