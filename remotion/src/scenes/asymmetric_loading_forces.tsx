import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const AsymmetricLoadingForcesScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const fillHeight = interpolate(frame, [span * 0.05, span * 0.45], [0, 55], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const forceScale = interpolate(frame, [span * 0.35, span * 0.65], [0, 1], {
    easing: Easing.out(Easing.back(1.2)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const tilt = interpolate(frame, [span * 0.45, span * 0.85], [0, 5], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  return (
    <AbsoluteFill
      style={{
        opacity,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
      }}
    >
      <svg width="70%" viewBox="0 0 500 320" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="concreteGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#5d6a73" />
            <stop offset="100%" stopColor="#8a949b" />
          </linearGradient>
          <pattern id="hatch" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="10" stroke="#e9f2f6" strokeWidth={0.8} opacity={0.3} />
          </pattern>
        </defs>

        {/* Ground Line */}
        <line x1="50" y1="260" x2="450" y2="260" stroke="#e9f2f6" strokeWidth={2} opacity={0.6} />
        <path d="M 50,260 L 40,270 M 100,260 L 90,270 M 150,260 L 140,270 M 200,260 L 190,270 M 250,260 L 240,270 M 300,260 L 290,270 M 350,260 L 340,270 M 400,260 L 390,270 M 450,260 L 440,270" stroke="#e9f2f6" strokeWidth={1} opacity={0.3} />

        {/* Main Animated Group (Tilts from the bottom center pivot) */}
        <g transform={`rotate(${tilt}, 250, 260)`}>
          {/* Scaffolding (Gerüst) Structure */}
          {/* Vertical standards */}
          <line x1="150" y1="140" x2="150" y2="260" stroke="#e9f2f6" strokeWidth={1.5} />
          <line x1="250" y1="140" x2="250" y2="260" stroke="#e9f2f6" strokeWidth={1.5} />
          <line x1="350" y1="140" x2="350" y2="260" stroke="#e9f2f6" strokeWidth={1.5} />

          {/* Horizontal ledgers */}
          <line x1="150" y1="140" x2="350" y2="140" stroke="#e9f2f6" strokeWidth={1.5} />
          <line x1="150" y1="200" x2="350" y2="200" stroke="#e9f2f6" strokeWidth={1.5} />

          {/* Diagonal bracing */}
          <line x1="150" y1="200" x2="250" y2="140" stroke="#e9f2f6" strokeWidth={1} strokeDasharray="2 2" opacity={0.8} />
          <line x1="250" y1="200" x2="350" y2="140" stroke="#e9f2f6" strokeWidth={1} strokeDasharray="2 2" opacity={0.8} />
          <line x1="150" y1="260" x2="250" y2="200" stroke="#e9f2f6" strokeWidth={1} strokeDasharray="2 2" opacity={0.8} />
          <line x1="250" y1="260" x2="350" y2="200" stroke="#e9f2f6" strokeWidth={1} strokeDasharray="2 2" opacity={0.8} />

          {/* Formwork (Schalung) Outer Frame */}
          <rect x="140" y="70" width="220" height="70" fill="none" stroke="#e9f2f6" strokeWidth={2} />
          {/* Center Divider */}
          <line x1="250" y1="70" x2="250" y2="140" stroke="#e9f2f6" strokeWidth={2} />

          {/* Concrete Fill (Left Chamber Only) */}
          <rect
            x="145"
            y={135 - fillHeight}
            width="100"
            height={fillHeight}
            fill="url(#concreteGrad)"
            stroke="#e9f2f6"
            strokeWidth={0.5}
          />
          <rect
            x="145"
            y={135 - fillHeight}
            width="100"
            height={fillHeight}
            fill="url(#hatch)"
          />

          {/* Labels for Chambers */}
          <text x="195" y="105" fill="#e9f2f6" fontSize={8} textAnchor="middle" opacity={0.9}>
            {fillHeight > 10 ? 'BEFÜLLT' : ''}
          </text>
          <text x="300" y="105" fill="#e9f2f6" fontSize={8} textAnchor="middle" opacity={0.4}>
            LEER
          </text>

          {/* Technical Dimension Lines */}
          <line x1="140" y1="60" x2="250" y2="60" stroke="#e9f2f6" strokeWidth={0.5} opacity={0.5} />
          <line x1="140" y1="57" x2="140" y2="63" stroke="#e9f2f6" strokeWidth={0.5} opacity={0.5} />
          <line x1="250" y1="57" x2="250" y2="63" stroke="#e9f2f6" strokeWidth={0.5} opacity={0.5} />
          <text x="195" y="53" fill="#e9f2f6" fontSize={7} textAnchor="middle" opacity={0.5}>50%</text>

          <line x1="250" y1="60" x2="360" y2="60" stroke="#e9f2f6" strokeWidth={0.5} opacity={0.5} />
          <line x1="360" y1="57" x2="360" y2="63" stroke="#e9f2f6" strokeWidth={0.5} opacity={0.5} />
          <text x="305" y="53" fill="#e9f2f6" fontSize={7} textAnchor="middle" opacity={0.5}>50%</text>
        </g>

        {/* Force Vectors (Do not rotate, to show they push horizontally relative to the world) */}
        <g opacity={forceScale}>
          {/* Upper Force Arrow */}
          <g transform={`translate(${100 + forceScale * 25}, 105)`}>
            <line x1="-40" y1="0" x2="10" y2="0" stroke="#d0523f" strokeWidth={3} />
            <polygon points="10,-6 22,0 10,6" fill="#d0523f" />
          </g>
          {/* Lower Force Arrow */}
          <g transform={`translate(${100 + forceScale * 25}, 135)`}>
            <line x1="-40" y1="0" x2="10" y2="0" stroke="#d0523f" strokeWidth={3} />
            <polygon points="10,-6 22,0 10,6" fill="#d0523f" />
          </g>
          {/* Force Label */}
          <text x="70" y="90" fill="#d0523f" fontSize={10} fontWeight="bold" textAnchor="middle">
            HORIZONTALKRAFT
          </text>
        </g>

        {/* Tilt Angle Indicator Arc */}
        {tilt > 1 && (
          <g opacity={(tilt - 1) / 4}>
            <path d="M 350,230 A 30,30 0 0,1 355,231" fill="none" stroke="#e0b44c" strokeWidth={1.5} />
            <text x="370" y="225" fill="#e0b44c" fontSize={9}>
              SCHIEFLAGE
            </text>
          </g>
        )}
      </svg>

      {p.title ? (
        <div
          style={{
            marginTop: 20,
            fontFamily: "'Segoe UI', Arial, sans-serif",
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: '0.1em',
            color: '#e9f2f6',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};