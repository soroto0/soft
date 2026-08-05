import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const WindowSpacerConductionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const draw = interpolate(frame, [0, span * 0.2], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const conduction = interpolate(frame, [span * 0.2, span * 0.8], [0, 1], {
    easing: Easing.inOut(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textOpacity = interpolate(frame, [span * 0.4, span * 0.6], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const glassPanes = [
    { x: 160, label: 'OUTER PANE' },
    { x: 320, label: 'INNER PANE' },
  ];

  const tempTicks = [
    { y: 260, temp: '-10°C', color: '#5b7f9c' },
    { y: 180, temp: '5°C', color: '#8a949b' },
    { y: 100, temp: '21°C', color: '#e0b44c' },
  ];

  const arrows = [0, 1, 2];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 500 400" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="coldGradient" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#5b7f9c" stopOpacity="1" />
            <stop offset="40%" stopColor="#5b7f9c" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#5b7f9c" stopOpacity="0" />
          </linearGradient>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#5b7f9c" />
          </marker>
        </defs>

        {/* Glass Panes */}
        {glassPanes.map((pane, i) => (
          <g key={i}>
            <rect
              x={pane.x}
              y={60}
              width={20}
              height={200 * draw}
              fill="rgba(233, 242, 246, 0.15)"
              stroke="#e9f2f6"
              strokeWidth="1.5"
            />
            {/* Cold Conduction Overlay */}
            <rect
              x={pane.x}
              y={260 - 160 * conduction}
              width={20}
              height={160 * conduction}
              fill="url(#coldGradient)"
              opacity={0.8}
            />
            <text
              x={pane.x + 10}
              y={50}
              fill="#e9f2f6"
              fontSize="10"
              textAnchor="middle"
              opacity={textOpacity}
              fontFamily="monospace"
            >
              {pane.label}
            </text>
          </g>
        ))}

        {/* Aluminum Spacer Bar */}
        <rect
          x={180}
          y={240}
          width={140}
          height={20 * draw}
          fill="#8a949b"
          stroke="#e9f2f6"
          strokeWidth="1"
        />
        <rect
          x={180}
          y={240}
          width={140}
          height={20 * draw}
          fill="#5b7f9c"
          opacity={conduction * 0.7}
        />
        
        {/* Spacer Label */}
        <line x1={250} y1={260} x2={250} y2={300} stroke="#e9f2f6" strokeWidth="0.5" opacity={textOpacity} />
        <text
          x={250}
          y={315}
          fill="#8a949b"
          fontSize="11"
          textAnchor="middle"
          opacity={textOpacity}
          fontFamily="monospace"
        >
          ALUMINUM SPACER (CONDUCTIVE)
        </text>

        {/* Conduction Arrows */}
        {arrows.map((a) => (
          <g key={a} opacity={conduction}>
            <line
              x1={170 + a * 80}
              y1={230}
              x2={170 + a * 80}
              y2={250}
              stroke="#5b7f9c"
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
              transform={`translate(0, ${Math.sin(frame / 5 + a) * 5})`}
            />
          </g>
        ))}

        {/* Temperature Scale */}
        <g opacity={draw}>
          <line x1={120} y1={60} x2={120} y2={260} stroke="#e9f2f6" strokeWidth="1" strokeDasharray="2 2" />
          {tempTicks.map((tick) => (
            <g key={tick.temp}>
              <line x1={115} y1={tick.y} x2={125} y2={tick.y} stroke="#e9f2f6" strokeWidth="1" />
              <text
                x={110}
                y={tick.y + 4}
                fill={tick.color}
                fontSize="10"
                textAnchor="end"
                fontFamily="monospace"
              >
                {tick.temp}
              </text>
            </g>
          ))}
          <text
            x={80}
            y={160}
            fill="#e9f2f6"
            fontSize="9"
            textAnchor="middle"
            transform="rotate(-90, 80, 160)"
            fontFamily="monospace"
          >
            THERMAL GRADIENT
          </text>
        </g>

        {/* Heat Flow Indicators */}
        <text
          x={400}
          y={160}
          fill="#d0523f"
          fontSize="12"
          opacity={textOpacity}
          fontFamily="monospace"
        >
          INTERNAL HEAT
        </text>
        <path
          d="M 380 160 Q 350 160 345 230"
          fill="none"
          stroke="#d0523f"
          strokeWidth="1.5"
          strokeDasharray="4 2"
          opacity={conduction}
        />
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            fontFamily: 'monospace',
            fontSize: 32,
            color: '#e9f2f6',
            letterSpacing: '2px',
            borderTop: '1px solid #e9f2f6',
            paddingTop: '10px',
            opacity: textOpacity,
          }}
        >
          {p.title.toUpperCase()}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};