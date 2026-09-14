import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const WeldPenetrationCutScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const opacity = p.enter * p.exit;

  const draw = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const weld = interpolate(frame, [span * 0.2, span * 0.6], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const alert = interpolate(frame, [span * 0.5, span * 0.8], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labels = [
    { x: 100, y: 220, text: 'GRUNDWERKSTOFF S235', delay: 0.1 },
    { x: 120, y: 110, text: 'SOLL-EINBRAND (3mm)', delay: 0.4 },
    { x: 280, y: 110, text: 'IST-ZUSTAND (0.2mm)', delay: 0.6 },
    { x: 200, y: 60, text: 'KEHLNAHT-QUERSCHNITT', delay: 0.2 },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 300" fill="none">
        <defs>
          <clipPath id="clip-weld">
            <rect x="0" y="0" width="400" height={300 * draw} />
          </clipPath>
        </defs>

        {/* Base Plates */}
        <rect x="50" y="180" width="300" height="20" fill="#5d6a73" stroke="#e9f2f6" strokeWidth="1" opacity={draw} />
        <rect x="190" y="80" width="20" height="100" fill="#5d6a73" stroke="#e9f2f6" strokeWidth="1" opacity={draw} />

        {/* Heat Affected Zone (HAZ) - Correct Side */}
        <path
          d="M 190 180 Q 175 180 175 165 L 190 150 Z"
          fill="#8a949b"
          opacity={weld * 0.5}
        />
        
        {/* Correct Weld Bead (Left) */}
        <path
          d="M 190 180 L 150 180 Q 150 140 190 140 Z"
          fill="#e9f2f6"
          fillOpacity="0.2"
          stroke="#e9f2f6"
          strokeWidth="1.5"
          strokeDasharray="200"
          strokeDashoffset={200 * (1 - weld)}
        />
        <circle cx="185" cy="175" r="8" fill="#e9f2f6" opacity={weld * 0.3} />

        {/* Deficient Weld Bead (Right - Orange) */}
        <path
          d="M 210 180 L 250 180 Q 250 140 210 140 Z"
          fill="#e0b44c"
          fillOpacity={0.2 + alert * 0.4}
          stroke="#e0b44c"
          strokeWidth="1.5"
          strokeDasharray="200"
          strokeDashoffset={200 * (1 - weld)}
        />
        {/* The "Gap" showing lack of penetration */}
        <line x1="210" y1="180" x2="210" y2="170" stroke="#d0523f" strokeWidth="2" opacity={alert} />
        <line x1="210" y1="180" x2="220" y2="180" stroke="#d0523f" strokeWidth="2" opacity={alert} />

        {/* Leader Lines */}
        <g opacity={alert}>
          <line x1="185" y1="175" x2="140" y2="120" stroke="#e9f2f6" strokeWidth="0.5" />
          <circle cx="185" cy="175" r="2" fill="#e9f2f6" />
          
          <line x1="211" y1="179" x2="260" y2="120" stroke="#e0b44c" strokeWidth="0.5" />
          <circle cx="211" cy="179" r="2" fill="#e0b44c" />
        </g>

        {/* Labels */}
        {labels.map((label, i) => {
          const labelShow = interpolate(frame, [span * label.delay, span * (label.delay + 0.2)], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          return (
            <text
              key={i}
              x={label.x}
              y={label.y}
              fill={label.text.includes('IST') ? '#e0b44c' : '#e9f2f6'}
              fontSize="10"
              fontFamily="monospace"
              textAnchor="middle"
              opacity={labelShow}
            >
              {label.text}
            </text>
          );
        })}

        {/* Warning Indicator */}
        <g transform="translate(320, 100)" opacity={alert}>
          <path d="M 0 -10 L 10 10 L -10 10 Z" fill="#d0523f" />
          <text y="25" fill="#d0523f" fontSize="8" textAnchor="middle" fontWeight="bold">MANGEL</text>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            color: '#e9f2f6',
            fontSize: 42,
            fontFamily: 'sans-serif',
            letterSpacing: '0.05em',
            opacity: interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: 'clamp' }),
          }}
        >
          {p.title.toUpperCase()}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};