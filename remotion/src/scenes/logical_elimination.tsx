import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const LogicalEliminationScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  // Animation stages
  const flow = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.bezier(0.4, 0, 0.2, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const clash = interpolate(frame, [span * 0.35, span * 0.5], [0, 1], {
    easing: Easing.ease,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const motor = interpolate(frame, [span * 0.55, span * 0.9], [0, 1], {
    easing: Easing.inOut(Easing.back(1)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const nodes = [
    { id: 'A', x: 400, y: 150 },
    { id: 'B', x: 550, y: 150 },
    { id: 'C', x: 700, y: 150 },
    { id: 'D', x: 400, y: 300 },
    { id: 'E', x: 550, y: 300 },
    { id: 'F', x: 700, y: 300 },
    { id: 'G', x: 850, y: 225 },
  ];

  const connections = [
    { from: 0, to: 1, delay: 0 },
    { from: 1, to: 2, delay: 0.1 },
    { from: 0, to: 3, delay: 0.05 },
    { from: 3, to: 4, delay: 0.15 },
    { from: 4, to: 5, delay: 0.2 },
    { from: 2, to: 6, delay: 0.25 },
    { from: 5, to: 6, delay: 0.3 },
  ];

  const rotorTicks = Array.from({ length: 12 }).map((_, i) => i);

  return (
    <AbsoluteFill style={{ opacity }}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 1080 600"
        fill="none"
        style={{ filter: 'drop-shadow(0 0 10px rgba(233, 242, 246, 0.1))' }}
      >
        {/* Rotor Mechanism (Left) */}
        <g transform={`translate(180, 225) rotate(${motor * 30})`}>
          <circle
            cx="0"
            cy="0"
            r="80"
            stroke="#e9f2f6"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            opacity={0.4}
          />
          {rotorTicks.map((t) => (
            <line
              key={t}
              x1="0"
              y1="-70"
              x2="0"
              y2="-85"
              stroke="#e9f2f6"
              strokeWidth="2"
              transform={`rotate(${t * 30})`}
            />
          ))}
          <text
            y="10"
            fill="#e9f2f6"
            fontSize="24"
            textAnchor="middle"
            fontFamily="monospace"
            style={{ transform: `rotate(${-motor * 30}deg)` }}
          >
            {motor > 0.5 ? '15' : '14'}
          </text>
        </g>
        <text x="180" y="340" fill="#e9f2f6" fontSize="12" textAnchor="middle" opacity={0.6}>
          POSICIÓN TAMBOR
        </text>

        {/* Logic Network */}
        {connections.map((conn, i) => {
          const start = nodes[conn.from];
          const end = nodes[conn.to];
          const isActive = flow > conn.delay;
          const isConflict = i === 6 && clash > 0.5;
          
          return (
            <g key={i}>
              <line
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke="#e9f2f6"
                strokeWidth="1"
                opacity={0.2}
              />
              <line
                x1={start.x}
                y1={start.y}
                x2={interpolate(flow, [conn.delay, conn.delay + 0.2], [start.x, end.x], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' })}
                y2={interpolate(flow, [conn.delay, conn.delay + 0.2], [start.y, end.y], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' })}
                stroke={isConflict ? '#d0523f' : '#e0b44c'}
                strokeWidth={isConflict ? 3 : 2}
                opacity={isActive ? 1 - (clash * 0.8) : 0}
              />
            </g>
          );
        })}

        {/* Nodes */}
        {nodes.map((node, i) => {
          const isErrorNode = i === 6 && clash > 0.2;
          return (
            <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
              <rect
                x="-15"
                y="-15"
                width="30"
                height="30"
                fill="#1a1a1a"
                stroke={isErrorNode ? '#d0523f' : '#e9f2f6'}
                strokeWidth="1"
              />
              <text
                dy="5"
                fill={isErrorNode ? '#d0523f' : '#e9f2f6'}
                fontSize="14"
                textAnchor="middle"
                fontFamily="monospace"
              >
                {node.id}
              </text>
              {isErrorNode && (
                <path
                  d="M -20 -20 L 20 20 M 20 -20 L -20 20"
                  stroke="#d0523f"
                  strokeWidth="3"
                  opacity={clash}
                />
              )}
            </g>
          );
        })}

        {/* Status Indicators */}
        <g transform="translate(400, 450)">
          <text fill="#e9f2f6" fontSize="12" fontFamily="monospace" opacity={0.5}>
            ESTADO DEL CIRCUITO:
          </text>
          <text
            x="160"
            fill={clash > 0.5 ? '#d0523f' : '#e0b44c'}
            fontSize="12"
            fontFamily="monospace"
            fontWeight="bold"
          >
            {clash > 0.5 ? 'CONTRADICCIÓN DETECTADA' : 'BUSCANDO...'}
          </text>
          <rect
            y="15"
            width={450 * flow}
            height="2"
            fill={clash > 0.5 ? '#d0523f' : '#e0b44c'}
          />
        </g>

        {/* Legend */}
        <g transform="translate(800, 50)">
          <line x1="0" y1="0" x2="20" y2="0" stroke="#e0b44c" strokeWidth="2" />
          <text x="30" y="5" fill="#e9f2f6" fontSize="10" fontFamily="monospace">FLUJO VÁLIDO</text>
          <line x1="0" y1="20" x2="20" y2="20" stroke="#d0523f" strokeWidth="2" />
          <text x="30" y="25" fill="#e9f2f6" fontSize="10" fontFamily="monospace">CORTE LÓGICO</text>
        </g>
      </svg>

      {p.title && (
        <div
          style={{
            position: 'absolute',
            bottom: 60,
            width: '100%',
            textAlign: 'center',
            color: '#e9f2f6',
            fontFamily: 'serif',
            fontSize: 32,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            opacity: interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }}
        >
          {p.title}
        </div>
      )}
    </AbsoluteFill>
  );
};