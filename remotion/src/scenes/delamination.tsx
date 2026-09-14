import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const DelaminationScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const load = interpolate(frame, [0, span * 0.25], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shift = interpolate(frame, [span * 0.2, span * 0.9], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const alert = interpolate(frame, [span * 0.35, span * 0.6], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { id: 0, name: 'LAMELLE 1' },
    { id: 1, name: 'LAMELLE 2' },
    { id: 2, name: 'LAMELLE 3' },
    { id: 3, name: 'LAMELLE 4' },
    { id: 4, name: 'LAMELLE 5' },
  ];

  const arrows = [120, 200, 280];
  const joints = [1, 2, 3, 4];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 300" style={{ overflow: 'visible' }}>
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#e0b44c" />
          </marker>
        </defs>

        {/* Vertical Load Arrows */}
        {arrows.map((x) => (
          <g key={`arrow-${x}`} opacity={load}>
            <line
              x1={x}
              y1={20}
              x2={x}
              y2={75 + load * 5}
              stroke="#e0b44c"
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
            />
          </g>
        ))}
        <text x="200" y="15" fill="#e0b44c" fontSize="10" textAnchor="middle" opacity={load}>
          VERTIKALE LAST (F)
        </text>

        {/* Wooden Lamellae */}
        {layers.map((l, i) => {
          const xOffset = (i % 2 === 0 ? -1 : 1) * shift * 25;
          return (
            <g key={l.id} transform={`translate(${xOffset}, 0)`}>
              <rect
                x="100"
                y={90 + i * 22}
                width="200"
                height="20"
                fill="#5d6a73"
                stroke="#e9f2f6"
                strokeWidth="0.5"
              />
              <text
                x="105"
                y={103 + i * 22}
                fill="#e9f2f6"
                fontSize="7"
                opacity={0.6}
              >
                {l.name}
              </text>
            </g>
          );
        })}

        {/* Glue Joints / Failure Indicators */}
        {joints.map((j) => {
          const yPos = 90 + j * 22 - 2;
          return (
            <g key={`joint-${j}`} opacity={alert}>
              <line
                x1={80}
                y1={yPos}
                x2={320}
                y2={yPos}
                stroke="#d0523f"
                strokeWidth="1.5"
                strokeDasharray="4 2"
              />
              {j === 2 && (
                <text
                  x="325"
                  y={yPos + 3}
                  fill="#d0523f"
                  fontSize="9"
                  fontWeight="bold"
                >
                  BRUCHSTELLE
                </text>
              )}
            </g>
          );
        })}

        {/* Labels and Annotations */}
        <line x1="100" y1="210" x2="100" y2="230" stroke="#e9f2f6" strokeWidth="0.5" />
        <line x1="300" y1="210" x2="300" y2="230" stroke="#e9f2f6" strokeWidth="0.5" />
        <line x1="100" y1="225" x2="300" y2="225" stroke="#e9f2f6" strokeWidth="0.5" />
        <text x="200" y="240" fill="#e9f2f6" fontSize="9" textAnchor="middle">
          BSH-BINDER QUERSCHNITT
        </text>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            color: '#e9f2f6',
            fontFamily: 'sans-serif',
            fontSize: 42,
            fontWeight: 300,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            transform: `translateY(${interpolate(frame, [0, span], [20, 0])}px)`,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};