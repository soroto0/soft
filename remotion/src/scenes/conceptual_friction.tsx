import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ConceptualFrictionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const descent = interpolate(frame, [0, span * 0.5], [0, 1], {
    easing: Easing.bezier(0.33, 1, 0.68, 1),
    extrapolateRight: 'clamp',
  });

  const stress = interpolate(frame, [span * 0.45, span * 0.8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const impact = interpolate(frame, [span * 0.48, span * 0.52, span * 0.56, span * 0.6], [0, -6, 3, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const gridY = interpolate(descent, [0, 1], [50, 230]) + impact;
  const gridLines = [0, 40, 80, 120, 160, 200];
  
  const contactPoints = [
    { x: 280, y: 330, label: 'P1: RESISTENCIA' },
    { x: 400, y: 310, label: 'P2: DISCONTINUIDAD' },
    { x: 520, y: 350, label: 'P3: FRICCIÓN' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg
        width={width * 0.8}
        height={height * 0.8}
        viewBox="0 0 800 500"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="stoneGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8a949b" stopOpacity="0.8" />
            <stop offset="1" stopColor="#5d6a73" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        {/* Irregular Surface (Rural Reality) */}
        <path
          d="M 100 450 L 100 380 Q 200 320 280 330 T 400 310 T 520 350 T 700 390 L 700 450 Z"
          fill="url(#stoneGrad)"
          stroke="#8a949b"
          strokeWidth="2"
        />
        <text x="110" y="430" fill="#8a949b" fontSize="12" fontWeight="bold">
          REALIDAD RURAL / CONTEXTO NO-ELITISTA
        </text>

        {/* The Tractatus Grid */}
        <g transform={`translate(200, ${gridY})`}>
          <rect
            width="400"
            height="200"
            fill="none"
            stroke="#e9f2f6"
            strokeWidth="1"
            opacity={0.3}
          />
          {gridLines.map((line) => (
            <React.Fragment key={`grid-${line}`}>
              <line
                x1={0}
                y1={line}
                x2={400}
                y2={line}
                stroke="#e9f2f6"
                strokeWidth="1.5"
                opacity={0.6}
              />
              <line
                x1={line * 2}
                y1={0}
                x2={line * 2}
                y2={200}
                stroke="#e9f2f6"
                strokeWidth="1.5"
                opacity={0.6}
              />
            </React.Fragment>
          ))}
          <text x="0" y="-15" fill="#e9f2f6" fontSize="14" letterSpacing="2">
            ESTRUCTURA LÓGICA (TRACTATUS)
          </text>
        </g>

        {/* Stress and Friction Points */}
        {contactPoints.map((pt, i) => (
          <g key={`stress-${i}`} opacity={stress}>
            <circle
              cx={pt.x}
              cy={pt.y}
              r={8 * stress}
              fill="none"
              stroke="#d0523f"
              strokeWidth="2"
            />
            <circle
              cx={pt.x}
              cy={pt.y}
              r={4 * stress}
              fill="#d0523f"
            />
            {/* Force Arrows */}
            <line
              x1={pt.x}
              y1={pt.y}
              x2={pt.x}
              y2={pt.y - 40 * stress}
              stroke="#e0b44c"
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
            />
            <text
              x={pt.x + 12}
              y={pt.y - 20}
              fill="#e0b44c"
              fontSize="10"
              fontFamily="monospace"
            >
              {pt.label}
            </text>
          </g>
        ))}

        {/* Arrowhead Definition */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="0"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#e0b44c" />
          </marker>
        </defs>

        {/* Measurement Ticks */}
        {[300, 350, 400].map((tick) => (
          <g key={`tick-${tick}`}>
            <line x1="80" y1={tick} x2="95" y2={tick} stroke="#8a949b" strokeWidth="1" />
            <text x="50" y={tick + 4} fill="#8a949b" fontSize="10">{450 - tick}nm</text>
          </g>
        ))}
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            width: '100%',
            textAlign: 'center',
            fontFamily: 'serif',
            fontSize: 42,
            color: '#e9f2f6',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            opacity: interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' }),
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

export default ConceptualFrictionScene;