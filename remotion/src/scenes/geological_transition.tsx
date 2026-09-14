import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const GeologicalTransitionScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const reveal = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const stress = interpolate(frame, [span * 0.3, span * 0.8], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [span * 0.5, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const mittagongLayers = Array.from({ length: 14 }).map((_, i) => ({
    y: 60 + i * 10,
    height: 10,
    type: i % 2 === 0 ? 'sandstone' : 'claystone',
  }));

  const stressArrows = [
    { x: 380, y: 115 },
    { x: 420, y: 115 },
    { x: 460, y: 115 },
    { x: 380, y: 185 },
    { x: 420, y: 185 },
    { x: 460, y: 185 },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="75%" viewBox="0 0 600 300" style={{ overflow: 'visible' }}>
        {/* Hawkesbury Sandstone Section */}
        <g clipPath="url(#revealClip)">
          <rect x="50" y="60" width="250" height="140" fill="#e9f2f6" opacity={0.2} stroke="#e9f2f6" strokeWidth={0.5} />
          <text x="175" y="50" fill="#e9f2f6" fontSize={10} textAnchor="middle" opacity={labelFade}>HAWKESBURY-SANDSTEIN (HOMOGEN)</text>
          
          {/* Mittagong Formation Section */}
          <g transform="translate(300, 0)">
            {mittagongLayers.map((layer, i) => (
              <rect
                key={i}
                x="0"
                y={layer.y}
                width="250"
                height={layer.height}
                fill={layer.type === 'sandstone' ? '#e0b44c' : '#5d6a73'}
                opacity={layer.type === 'sandstone' ? 0.4 : 0.6}
                stroke="#e9f2f6"
                strokeWidth={0.2}
              />
            ))}
            <text x="125" y="50" fill="#e0b44c" fontSize={10} textAnchor="middle" opacity={labelFade}>MITTAGONG-FORMATION (GESCHICHTET)</text>
          </g>

          {/* Tunnel Path */}
          <path
            d="M 50 150 L 550 150"
            stroke="#d0523f"
            strokeWidth={32}
            strokeLinecap="round"
            fill="none"
            opacity={0.15}
          />
          <path
            d="M 50 150 L 550 150"
            stroke="#e9f2f6"
            strokeWidth={1}
            strokeDasharray="4 4"
            fill="none"
          />
          <text x="50" y="153" fill="#e9f2f6" fontSize={9} dy={-20}>TUNNELACHSE</text>

          {/* Stress Vectors */}
          {stressArrows.map((arrow, i) => (
            <g key={i} opacity={stress} transform={`translate(${arrow.x}, ${arrow.y})`}>
              <line
                x1={-20 * stress}
                y1="0"
                x2="0"
                y2="0"
                stroke="#e0b44c"
                strokeWidth={2}
              />
              <path
                d="M -5 -4 L 2 0 L -5 4"
                fill="none"
                stroke="#e0b44c"
                strokeWidth={1.5}
              />
            </g>
          ))}
          
          <text x="420" y="230" fill="#e0b44c" fontSize={10} textAnchor="middle" opacity={stress}>
            HORIZONTALE SPANNUNGSKONZENTRATION
          </text>
        </g>

        <defs>
          <clipPath id="revealClip">
            <rect x="0" y="0" width={600 * reveal} height="300" />
          </clipPath>
        </defs>

        {/* Scale Axis */}
        <line x1="50" y1="260" x2="550" y2="260" stroke="#e9f2f6" strokeWidth={1} />
        {[0, 100, 200, 300, 400, 500].map((tick) => (
          <g key={tick} transform={`translate(${50 + tick}, 260)`}>
            <line x1="0" y1="0" x2="0" y2="5" stroke="#e9f2f6" strokeWidth={1} />
            <text y="18" fill="#e9f2f6" fontSize={8} textAnchor="middle">{tick}m</text>
          </g>
        ))}
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            width: '100%',
            textAlign: 'center',
            fontFamily: 'sans-serif',
            fontSize: 28,
            fontWeight: 300,
            letterSpacing: '0.1em',
            color: '#e9f2f6',
            opacity: labelFade,
            transform: `translateY(${(1 - labelFade) * 10}px)`,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};