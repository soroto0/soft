import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const CalculationErrorScaleScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const opacity = p.enter * p.exit;

  const ghostAnim = interpolate(frame, [0, span * 0.2], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const switchAnim = interpolate(frame, [span * 0.4, span * 0.6], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textAnim = interpolate(frame, [span * 0.55, span * 0.8], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ghosts = [0, 1, 2, 3, 4, 5];
  const caption = p.title || "BERECHNUNGSFEHLER FAKTOR 6";

  // Truss joint path: a triangular bracket with a central plate and bolt holes
  const jointPath = "M -40 30 L 0 -40 L 40 30 Z M 0 -10 A 8 8 0 1 0 0.1 -10 Z";
  const boltPositions = [
    { x: -20, y: 15 },
    { x: 20, y: 15 },
    { x: 0, y: -25 },
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
          <linearGradient id="orangeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e0b44c" />
            <stop offset="100%" stopColor="#d0523f" />
          </linearGradient>
        </defs>

        {/* Ghost Grid (The 6x Overestimation) */}
        <g opacity={ghostAnim * (1 - switchAnim)}>
          {ghosts.map((i) => {
            const row = Math.floor(i / 3);
            const col = i % 3;
            const x = 200 + col * 200;
            const y = 150 + row * 150;
            return (
              <g key={i} transform={`translate(${x}, ${y})`}>
                <path
                  d={jointPath}
                  fill="none"
                  stroke="#8a949b"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                />
                {boltPositions.map((b, bi) => (
                  <circle key={bi} cx={b.x} cy={b.y} r="3" fill="#8a949b" />
                ))}
                <text y="60" fill="#8a949b" fontSize="12" textAnchor="middle" fontFamily="monospace">
                  JOINT_REF_{i + 101}
                </text>
              </g>
            );
          })}
          <text x="400" y="50" fill="#8a949b" fontSize="18" textAnchor="middle" fontWeight="bold">
            PROJEKTIERTE FESTIGKEIT (FAKTOR 6)
          </text>
        </g>

        {/* The Actual Single Joint */}
        <g transform={`translate(400, 225) scale(${interpolate(switchAnim, [0, 1], [0.8, 1.5])})`} opacity={switchAnim}>
          <path
            d={jointPath}
            fill="url(#orangeGrad)"
            stroke="#e9f2f6"
            strokeWidth="2"
          />
          {boltPositions.map((b, bi) => (
            <circle key={bi} cx={b.x} cy={b.y} r="4" fill="#e9f2f6" />
          ))}
          <text y="60" fill="#e0b44c" fontSize="14" textAnchor="middle" fontWeight="bold">
            TATSÄCHLICHE BELASTBARKEIT
          </text>
        </g>

        {/* Scale / Comparison UI */}
        <g opacity={textAnim}>
          <line x1="100" y1="400" x2="700" y2="400" stroke="#e9f2f6" strokeWidth="1" />
          {[0, 1, 2, 3, 4, 5, 6].map((t) => (
            <g key={t} transform={`translate(${100 + t * 100}, 400)`}>
              <line y1="0" y2="10" stroke="#e9f2f6" strokeWidth="1" />
              <text y="25" fill="#e9f2f6" fontSize="12" textAnchor="middle">
                {t}x
              </text>
            </g>
          ))}
          <rect
            x="100"
            y="390"
            width={interpolate(switchAnim, [0, 1], [600, 100])}
            height="5"
            fill={switchAnim > 0.5 ? "#d0523f" : "#8a949b"}
            opacity="0.4"
          />
        </g>
      </svg>

      {/* Caption */}
      <div
        style={{
          position: 'absolute',
          bottom: height * 0.1,
          width: '100%',
          textAlign: 'center',
          fontFamily: 'Helvetica, Arial, sans-serif',
          fontSize: 42,
          fontWeight: 'bold',
          color: '#e9f2f6',
          letterSpacing: '2px',
          opacity: textAnim,
          transform: `translateY(${interpolate(textAnim, [0, 1], [20, 0])}px)`,
        }}
      >
        {caption}
      </div>
    </AbsoluteFill>
  );
};