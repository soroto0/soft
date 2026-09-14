import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const QuerschnittBewehrungKiesnestScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const opacity = p.enter * p.exit;

  const draw = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const grid = interpolate(frame, [span * 0.2, span * 0.5], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const voids = interpolate(frame, [span * 0.4, span * 0.8], [0, 1], {
    easing: Easing.inOut(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textAnim = interpolate(frame, [span * 0.6, span * 0.9], [20, 0], {
    easing: Easing.out(Easing.back(1.2)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const vRebar = [280, 320, 360, 400, 440, 480];
  const hRebar = [140, 180, 220, 260, 300, 340];
  const pockets = [
    { x: 340, y: 160, r: 28, id: 'k1', label: 'KIESNEST' },
    { x: 420, y: 260, r: 38, id: 'k2', label: 'HOHLRAUM' },
    { x: 300, y: 320, r: 22, id: 'k3', label: 'GEFÜGESTÖRUNG' },
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
          <pattern id="concreteHatch" patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="10" stroke="#8a949b" strokeWidth="0.5" opacity="0.3" />
          </pattern>
          <linearGradient id="voidGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e0b44c" />
            <stop offset="50%" stopColor="#d0523f" />
            <stop offset="100%" stopColor="#e0b44c" />
          </linearGradient>
        </defs>

        {/* Console Body */}
        <path
          d="M 200,100 L 600,100 L 600,400 L 450,400 L 200,250 Z"
          fill="url(#concreteHatch)"
          stroke="#e9f2f6"
          strokeWidth="2"
          strokeDasharray="1500"
          strokeDashoffset={1500 * (1 - draw)}
        />

        {/* Reinforcement Grid */}
        <g opacity={grid}>
          {vRebar.map((x) => (
            <line
              key={`v-${x}`}
              x1={x}
              y1={105}
              x2={x}
              y2={x > 450 ? 395 : 100 + (x - 200) * 0.6 + 140}
              stroke="#8a949b"
              strokeWidth="3"
            />
          ))}
          {hRebar.map((y) => (
            <line
              key={`h-${y}`}
              x1={205 + (y > 250 ? (y - 250) * 1.6 : 0)}
              y1={y}
              x2={595}
              y2={y}
              stroke="#8a949b"
              strokeWidth="3"
            />
          ))}
        </g>

        {/* Gravel Pockets (Voids) */}
        {pockets.map((pock, i) => (
          <g key={pock.id} opacity={voids}>
            <circle
              cx={pock.x}
              cy={pock.y}
              r={pock.r}
              fill="url(#voidGradient)"
              fillOpacity="0.8"
              stroke="#d0523f"
              strokeWidth="1.5"
            />
            {/* Internal "Gravel" particles */}
            {[0, 1, 2, 3].map((dot) => (
              <circle
                key={dot}
                cx={pock.x + (dot - 1.5) * 8}
                cy={pock.y + (Math.sin(dot) * 10)}
                r="3"
                fill="#e9f2f6"
                opacity="0.6"
              />
            ))}
            {/* Leader Lines */}
            <line
              x1={pock.x + pock.r * 0.7}
              y1={pock.y - pock.r * 0.7}
              x2={pock.x + 60}
              y2={pock.y - 60}
              stroke="#e9f2f6"
              strokeWidth="1"
              opacity={voids}
            />
            <text
              x={pock.x + 65}
              y={pock.y - 65}
              fill="#e0b44c"
              fontSize="12"
              fontFamily="monospace"
              opacity={voids}
            >
              {pock.label}
            </text>
          </g>
        ))}

        {/* Labels for materials */}
        <g opacity={draw}>
          <text x="210" y="90" fill="#e9f2f6" fontSize="14" fontWeight="bold">BETONKONSOLE (C30/37)</text>
          <text x="500" y="430" fill="#8a949b" fontSize="12" textAnchor="end">BEWEHRUNG B500B</text>
        </g>

        {/* Scale Ticks */}
        {[0, 100, 200, 300, 400].map((tick) => (
          <line
            key={tick}
            x1={200 + tick}
            y1="410"
            x2={200 + tick}
            y2="420"
            stroke="#e9f2f6"
            strokeWidth="1"
            opacity={draw * 0.5}
          />
        ))}
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            color: '#e9f2f6',
            fontSize: 42,
            fontFamily: 'sans-serif',
            fontWeight: 300,
            letterSpacing: '0.1em',
            transform: `translateY(${textAnim}px)`,
            opacity: voids,
            textAlign: 'center',
            width: '100%',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};