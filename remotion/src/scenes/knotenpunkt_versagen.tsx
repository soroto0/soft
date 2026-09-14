import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const KnotenpunktVersagenScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const draw = interpolate(frame, [0, span * 0.25], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const failure = interpolate(frame, [span * 0.25, span * 0.5], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const transfer = interpolate(frame, [span * 0.45, span * 0.85], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const nodes = [
    { id: 'NW', x: 100, y: 70, label: 'KNOTEN NW' },
    { id: 'N', x: 200, y: 70, label: 'KNOTEN N' },
    { id: 'NE', x: 300, y: 70, label: 'KNOTEN NE' },
    { id: 'W', x: 100, y: 150, label: 'KNOTEN W' },
    { id: 'C', x: 200, y: 150, label: 'KNOTEN C' },
    { id: 'E', x: 300, y: 150, label: 'KNOTEN E' },
    { id: 'SW', x: 100, y: 230, label: 'KNOTEN SW' },
    { id: 'S', x: 200, y: 230, label: 'KNOTEN S' },
    { id: 'SE', x: 300, y: 230, label: 'KNOTEN SE' },
  ];

  const beams = [
    { from: 'NW', to: 'N' },
    { from: 'N', to: 'NE' },
    { from: 'NW', to: 'W' },
    { from: 'W', to: 'SW' },
    { from: 'N', to: 'C' },
    { from: 'NE', to: 'E' },
    { from: 'W', to: 'C' },
    { from: 'C', to: 'E' },
    { from: 'SW', to: 'S' },
    { from: 'S', to: 'SE' },
    { from: 'C', to: 'S' },
    { from: 'E', to: 'SE' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 300" style={{ overflow: 'visible' }}>
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#e9f2f6" />
          </marker>
          <marker id="arrow-redist" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#e0b44c" />
          </marker>
        </defs>

        {beams.map((b, i) => {
          const nStart = nodes.find((n) => n.id === b.from)!;
          const nEnd = nodes.find((n) => n.id === b.to)!;
          const isAffected = (b.from === 'NW' && b.to === 'N') || (b.from === 'NW' && b.to === 'W');
          const strokeColor = isAffected
            ? interpolate(failure, [0, 1], [0, 1]) > 0.5 ? '#d0523f' : '#e9f2f6'
            : '#e9f2f6';
          const strokeWidth = isAffected ? 1 + 1.5 * failure : 1;

          return (
            <line
              key={i}
              x1={nStart.x}
              y1={nStart.y}
              x2={nStart.x + (nEnd.x - nStart.x) * draw}
              y2={nStart.y + (nEnd.y - nStart.y) * draw}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              opacity={0.4}
            />
          );
        })}

        {nodes.map((n) => {
          const isNW = n.id === 'NW';
          const isAdjacent = n.id === 'N' || n.id === 'W';
          const nodeColor = isNW
            ? interpolate(failure, [0, 1], [0, 1]) > 0.1 ? '#d0523f' : '#e9f2f6'
            : isAdjacent && transfer > 0.1 ? '#e0b44c' : '#e9f2f6';
          const radius = isNW ? 4 + 4 * failure : 4;

          return (
            <g key={n.id} opacity={draw}>
              <circle
                cx={n.x}
                cy={n.y}
                r={radius}
                fill={nodeColor}
                stroke="#e9f2f6"
                strokeWidth={0.5}
              />
              {isNW && failure > 0 && (
                <>
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={4 + 24 * failure}
                    fill="none"
                    stroke="#d0523f"
                    strokeWidth={1.5}
                    opacity={1 - failure}
                  />
                  <path
                    d={`M ${n.x - 12} ${n.y - 12} L ${n.x + 12} ${n.y + 12} M ${n.x + 12} ${n.y - 12} L ${n.x - 12} ${n.y + 12}`}
                    stroke="#d0523f"
                    strokeWidth={1.5}
                    opacity={failure}
                  />
                </>
              )}
              <text
                x={n.x}
                y={n.y - 10}
                fill={nodeColor}
                fontSize={7}
                textAnchor="middle"
                fontFamily="monospace"
                opacity={0.7}
              >
                {n.label}
              </text>
            </g>
          );
        })}

        <g opacity={draw * (1 - failure)}>
          <line
            x1={100}
            y1={30}
            x2={100}
            y2={60}
            stroke="#e9f2f6"
            strokeWidth={2}
            markerEnd="url(#arrow)"
          />
          <text x={100} y={25} fill="#e9f2f6" fontSize={7} textAnchor="middle" fontFamily="monospace">
            LAST
          </text>
        </g>

        <g opacity={transfer}>
          <line
            x1={200}
            y1={20}
            x2={200}
            y2={60}
            stroke="#e0b44c"
            strokeWidth={2 + 4 * transfer}
            markerEnd="url(#arrow-redist)"
          />
          <text x={200} y={15} fill="#e0b44c" fontSize={7} textAnchor="middle" fontFamily="monospace">
            +{Math.round(transfer * 150)}% LAST
          </text>

          <line
            x1={50}
            y1={150}
            x2={90}
            y2={150}
            stroke="#e0b44c"
            strokeWidth={2 + 4 * transfer}
            markerEnd="url(#arrow-redist)"
          />
          <text x={45} y={142} fill="#e0b44c" fontSize={7} textAnchor="start" fontFamily="monospace">
            +{Math.round(transfer * 150)}% LAST
          </text>
        </g>

        <g opacity={draw} transform="translate(240, 240)">
          <rect x={0} y={0} width={140} height={45} fill="#111" stroke="#e9f2f6" strokeWidth={0.5} opacity={0.8} />
          <circle cx={15} cy={15} r={4} fill="#d0523f" />
          <text x={28} y={18} fill="#e9f2f6" fontSize={7} fontFamily="monospace">VERSAGEN (NW)</text>
          <circle cx={15} cy={32} r={4} fill="#e0b44c" />
          <text x={28} y={35} fill="#e9f2f6" fontSize={7} fontFamily="monospace">UMVERTEILUNG</text>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            marginTop: 30,
            fontFamily: "'Segoe UI', Arial, sans-serif",
            fontSize: 24,
            fontWeight: 'bold',
            color: '#e9f2f6',
            letterSpacing: '0.1em',
            opacity: draw,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};