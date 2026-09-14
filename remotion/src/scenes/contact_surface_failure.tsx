import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ContactSurfaceFailureScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const { width, height, fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const tilt = interpolate(frame, [0, span * 0.5, span], [-0.4, 0.4, -0.4], {
    easing: Easing.inOut(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pressure = interpolate(frame, [span * 0.1, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pulse = interpolate(frame, [0, span * 0.5, span], [0.9, 1.1, 0.9], {
    easing: Easing.inOut(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const forceY = interpolate(frame, [0, span * 0.5, span], [0, 5, 0], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const forceArrows = [100, 200, 300];

  return (
    <AbsoluteFill style={{ opacity, width, height, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 300" style={{ overflow: 'visible' }}>
        <defs>
          <pattern id="hatch" patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="4" stroke="#e9f2f6" strokeWidth="0.5" opacity="0.3" />
          </pattern>
          <radialGradient id="pressureGlow">
            <stop offset="0%" stopColor="#d0523f" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#d0523f" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Lower Surface (Foundation) */}
        <g>
          <path
            d="M 40,202 L 195,202 L 200,198 L 205,202 L 360,202 L 360,280 L 40,280 Z"
            fill="#5d6a73"
            stroke="#e9f2f6"
            strokeWidth="1"
          />
          <path
            d="M 40,202 L 195,202 L 200,198 L 205,202 L 360,202 L 360,280 L 40,280 Z"
            fill="url(#hatch)"
          />
          <text x="45" y="270" fill="#e9f2f6" fontSize="8" fontWeight="bold">FUNDAMENT (BETON)</text>
        </g>

        {/* Upper Surface (Transition Piece) */}
        <g style={{ transform: `rotate(${tilt}deg)`, transformOrigin: '200px 198px' }}>
          <rect
            x="40"
            y="80"
            width="320"
            height="118"
            fill="#e0b44c"
            fillOpacity="0.8"
            stroke="#e9f2f6"
            strokeWidth="1"
          />
          <text x="200" y="145" fill="#e9f2f6" fontSize="10" textAnchor="middle" fontWeight="bold">
            ÜBERGANGSSTÜCK (STAHL)
          </text>
          <text x="200" y="160" fill="#e9f2f6" fontSize="7" textAnchor="middle">
            MASSE: 42.000 kg
          </text>

          {/* Force Arrows */}
          {forceArrows.map((x) => (
            <g key={x} transform={`translate(${x}, ${60 + forceY})`}>
              <line x1="0" y1="0" x2="0" y2="30" stroke="#e9f2f6" strokeWidth="2" />
              <path d="M -4,22 L 0,30 L 4,22" fill="none" stroke="#e9f2f6" strokeWidth="2" />
            </g>
          ))}
          <text x="200" y="50" fill="#e9f2f6" fontSize="9" textAnchor="middle">VERTIKALE LAST (F)</text>
        </g>

        {/* Pressure Point Highlight */}
        <circle
          cx="200"
          cy="198"
          r={12 * pressure * pulse}
          fill="url(#pressureGlow)"
          opacity={pressure}
        />
        <circle
          cx="200"
          cy="198"
          r={2 * pressure}
          fill="#d0523f"
        />

        {/* Labels and Scale */}
        <g opacity={pressure}>
          <line x1="200" y1="198" x2="260" y2="230" stroke="#d0523f" strokeWidth="1" />
          <text x="265" y="234" fill="#d0523f" fontSize="9" fontWeight="bold">
            MAX. PRESSUNG
          </text>
        </g>

        <g transform="translate(300, 260)">
          <line x1="0" y1="0" x2="40" y2="0" stroke="#e9f2f6" strokeWidth="1" />
          <line x1="0" y1="-3" x2="0" y2="3" stroke="#e9f2f6" strokeWidth="1" />
          <line x1="40" y1="-3" x2="40" y2="3" stroke="#e9f2f6" strokeWidth="1" />
          <text x="20" y="12" fill="#e9f2f6" fontSize="7" textAnchor="middle">500 µm</text>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            width: '100%',
            textAlign: 'center',
            fontFamily: 'sans-serif',
            fontSize: 32,
            fontWeight: 800,
            color: '#e9f2f6',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};