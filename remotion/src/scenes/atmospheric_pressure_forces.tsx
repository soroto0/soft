import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const AtmosphericPressureForcesScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const draw = interpolate(frame, [0, span * 0.15], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const columnHeight = interpolate(frame, [span * 0.2, span * 0.8], [0, 160], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const flow = interpolate(frame % 30, [0, 30], [0, 20], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pressureLines = [80, 105, 130, 270, 295, 320];
  const scaleTicks = [0, 20, 40, 60, 80, 100, 120, 140, 160];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="60%" viewBox="0 0 400 300" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="mercuryGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e9f2f6" />
            <stop offset="50%" stopColor="#8a949b" />
            <stop offset="100%" stopColor="#5d6a73" />
          </linearGradient>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#e0b44c" />
          </marker>
        </defs>

        {/* Bowl of Mercury */}
        <path
          d="M 60 220 L 340 220 L 320 270 L 80 270 Z"
          fill="url(#mercuryGrad)"
          stroke="#e9f2f6"
          strokeWidth="1"
          opacity={draw}
        />
        
        {/* Glass Tube */}
        <rect
          x="175"
          y="40"
          width="50"
          height="200"
          fill="none"
          stroke="#e9f2f6"
          strokeWidth="1.5"
          opacity={draw}
        />
        
        {/* Mercury Column inside Tube */}
        <rect
          x="176"
          y={240 - columnHeight}
          width="48"
          height={columnHeight}
          fill="url(#mercuryGrad)"
          opacity={draw}
        />

        {/* Vacuum Label */}
        <text
          x="200"
          y="35"
          fill="#e9f2f6"
          fontSize="10"
          textAnchor="middle"
          opacity={columnHeight > 100 ? 1 : 0}
        >
          VACÍO
        </text>

        {/* Pressure Force Lines (The "Heavy Air") */}
        {pressureLines.map((x) => (
          <g key={x} opacity={draw * 0.8}>
            <line
              x1={x}
              y1={20 + flow}
              x2={x}
              y2={210 + flow}
              stroke="#e0b44c"
              strokeWidth="0.5"
              strokeDasharray="4 4"
            />
            <line
              x1={x}
              y1={190}
              x2={x}
              y2={215}
              stroke="#e0b44c"
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
            />
          </g>
        ))}

        {/* Measurement Scale */}
        <g transform="translate(235, 240)" opacity={draw}>
          {scaleTicks.map((tick) => (
            <g key={tick}>
              <line x1="0" y1={-tick} x2="5" y2={-tick} stroke="#e9f2f6" strokeWidth="0.5" />
              {tick % 40 === 0 && (
                <text x="8" y={-tick + 3} fill="#e9f2f6" fontSize="8">
                  {tick * 4.75} mmHg
                </text>
              )}
            </g>
          ))}
          <line x1="0" y1="0" x2="0" y2="-170" stroke="#e9f2f6" strokeWidth="0.5" />
        </g>

        {/* Labels for components */}
        <text x="70" y="285" fill="#8a949b" fontSize="9" opacity={draw}>
          CUBETA DE MERCURIO
        </text>
        <text x="200" y="235" fill="#e0b44c" fontSize="10" textAnchor="middle" opacity={draw}>
          P_atm
        </text>
        
        {/* Force Resultant Arrow */}
        <line
          x1="200"
          y1="260"
          x2="200"
          y2={245}
          stroke="#d0523f"
          strokeWidth="2"
          markerEnd="url(#arrowhead)"
          opacity={columnHeight / 160}
        />
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
            borderTop: '1px solid #e0b44c',
            paddingTop: '10px',
            opacity: draw,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};