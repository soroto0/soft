import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const HorizontalSoilPressureScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const reveal = interpolate(frame, [0, span * 0.2], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pressure = interpolate(frame, [span * 0.2, span * 0.8], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelsFade = interpolate(frame, [span * 0.6, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const arrowIndices = [0, 1, 2, 3, 4, 5, 6, 7];
  const soilBands = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg
        width={width * 0.8}
        height={height * 0.8}
        viewBox="0 0 800 450"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="pressureGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#d0523f" />
            <stop offset="50%" stopColor="#e0b44c" />
            <stop offset="100%" stopColor="#e9f2f6" />
          </linearGradient>
          <clipPath id="revealClip">
            <rect x="0" y="0" width={800 * reveal} height="450" />
          </clipPath>
        </defs>

        <g clipPath="url(#revealClip)">
          {/* Bedrock Layer */}
          <rect x="50" y="320" width="700" height="80" fill="#3d4a53" stroke="#e9f2f6" strokeWidth="1" />
          <text x="60" y="340" fill="#e9f2f6" fontSize="12" fontWeight="bold">FELS / STABILER BODEN</text>

          {/* Soft Silt Layer (Schlickboden) */}
          <rect x="50" y="180" width="700" height="140" fill="#e0b44c" fillOpacity="0.15" stroke="#e0b44c" strokeWidth="1" strokeDasharray="4 2" />
          {soilBands.map((i) => (
            <line
              key={`band-${i}`}
              x1={50 + i * 70}
              y1={180}
              x2={50 + i * 70}
              y2={320}
              stroke="#e0b44c"
              strokeWidth="0.5"
              strokeOpacity="0.3"
            />
          ))}

          {/* Foundation / Hill Side */}
          <path d="M 50 180 L 350 180 L 350 100 L 50 100 Z" fill="#5d6a73" stroke="#e9f2f6" strokeWidth="2" />
          <text x="60" y="130" fill="#e9f2f6" fontSize="14" fontWeight="bold">FUNDAMENT / LAST</text>

          {/* Excavation Pit (Baugrube) */}
          <path d="M 550 180 L 750 180 L 750 400 L 550 400 Z" fill="none" stroke="#e9f2f6" strokeWidth="2" strokeDasharray="8 4" />
          <text x="560" y="170" fill="#e9f2f6" fontSize="14" opacity={labelsFade}>BAUGRUBE (P = 0)</text>

          {/* Pressure Arrows */}
          {arrowIndices.map((i) => {
            const xPos = 100 + i * 60;
            const arrowLen = interpolate(pressure, [0, 1], [0, 80 - i * 8], { extrapolateRight: 'clamp' });
            return (
              <g key={`arrow-${i}`} opacity={pressure}>
                <line
                  x1={xPos}
                  y1={250}
                  x2={xPos + arrowLen}
                  y2={250}
                  stroke="#d0523f"
                  strokeWidth="3"
                />
                <path
                  d={`M ${xPos + arrowLen} 245 L ${xPos + arrowLen + 8} 250 L ${xPos + arrowLen} 255 Z`}
                  fill="#d0523f"
                />
              </g>
            );
          })}

          {/* Labels and Leader Lines */}
          <g opacity={labelsFade}>
            <line x1="200" y1="250" x2="200" y2="40" stroke="#e9f2f6" strokeWidth="1" />
            <text x="200" y="30" fill="#e9f2f6" fontSize="16" textAnchor="middle">HORIZONTALER DRUCK (σ_h)</text>
            
            <line x1="400" y1="280" x2="400" y2="310" stroke="#e0b44c" strokeWidth="1" />
            <text x="400" y="305" fill="#e0b44c" fontSize="14" textAnchor="middle">WEICHER SCHLICKBODEN</text>
          </g>

          {/* Pressure Gradient Scale */}
          <g transform="translate(100, 410)" opacity={pressure}>
            <rect width="600" height="10" fill="url(#pressureGrad)" />
            <text x="0" y="25" fill="#d0523f" fontSize="10">MAX DRUCK (P_max)</text>
            <text x="600" y="25" fill="#e9f2f6" fontSize="10" textAnchor="end">0 kN/m²</text>
            <line x1="0" y1="0" x2="0" y2="15" stroke="#e9f2f6" strokeWidth="1" />
            <line x1="300" y1="0" x2="300" y2="15" stroke="#e9f2f6" strokeWidth="1" />
            <line x1="600" y1="0" x2="600" y2="15" stroke="#e9f2f6" strokeWidth="1" />
          </g>
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
            fontSize: 42,
            color: '#e9f2f6',
            opacity: labelsFade,
            transform: `translateY(${interpolate(labelsFade, [0, 1], [20, 0])}px)`,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};