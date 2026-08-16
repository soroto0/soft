import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const HiddenDisplacementDimensionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const opacity = p.enter * p.exit;

  const intro = interpolate(frame, [0, span * 0.15], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const displacement = interpolate(frame, [span * 0.2, span * 0.7], [0, 32], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const measureAlpha = interpolate(frame, [span * 0.5, span * 0.8], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const hatch = [0, 1, 2, 3, 4, 5, 6, 7];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 600 400" style={{ overflow: 'visible' }}>
        <defs>
          <clipPath id="concreteClip">
            <rect x="100" y="40" width="400" height="120" />
          </clipPath>
        </defs>

        {/* Concrete Structure Layer */}
        <rect x="100" y="40" width="400" height="120" fill="#5d6a73" opacity={intro} />
        <g clipPath="url(#concreteClip)">
          {hatch.map((i) => (
            <line
              key={`hatch-${i}`}
              x1={80 + i * 60}
              y1="40"
              x2={140 + i * 60}
              y2="160"
              stroke="#e9f2f6"
              strokeWidth={0.5}
              opacity={intro * 0.3}
            />
          ))}
        </g>
        <text x="110" y="60" fill="#e9f2f6" fontSize={12} fontWeight="bold" opacity={intro}>
          BETONSTRUKTUR (DECKENPLATTE)
        </text>

        {/* Anchor Bolt */}
        <g opacity={intro}>
          {/* Bolt Shaft */}
          <rect x="294" y="80" width="12" height={160 + displacement} fill="#e9f2f6" />
          {/* Anchor Head / Washer */}
          <rect
            x="270"
            y={160 + displacement}
            width="60"
            height="12"
            fill="#e9f2f6"
            stroke="#5d6a73"
            strokeWidth={1}
          />
        </g>

        {/* Suspended Ceiling Panel */}
        <rect
          x="100"
          y={240 + displacement}
          width="400"
          height="25"
          fill="#8a949b"
          opacity={intro}
        />
        <text
          x="110"
          y={257 + displacement}
          fill="#e9f2f6"
          fontSize={11}
          opacity={intro}
        >
          ABGEHÄNGTE VERKLEIDUNG
        </text>

        {/* Dimension Chain (Maßkette) */}
        <g opacity={measureAlpha}>
          <line
            x1="350"
            y1="160"
            x2="350"
            y2={160 + displacement}
            stroke="#e0b44c"
            strokeWidth={2}
          />
          <line x1="340" y1="160" x2="360" y2="160" stroke="#e0b44c" strokeWidth={2} />
          <line
            x1="340"
            y1={160 + displacement}
            x2="360"
            y2={160 + displacement}
            stroke="#e0b44c"
            strokeWidth={2}
          />
          <text
            x="370"
            y={160 + displacement / 2 + 5}
            fill="#e0b44c"
            fontSize={18}
            fontWeight="bold"
            fontFamily="monospace"
          >
            {displacement > 0 ? '> 6.0 mm' : ''}
          </text>
          <text x="370" y={160 + displacement / 2 + 22} fill="#e0b44c" fontSize={10}>
            DEFORMATION (VERDECKT)
          </text>
        </g>

        {/* Leader lines for clarity */}
        <line
          x1="270"
          y1={166 + displacement}
          x2="200"
          y2={166 + displacement}
          stroke="#e9f2f6"
          strokeWidth={1}
          strokeDasharray="4 2"
          opacity={intro * 0.5}
        />
        <text x="135" y={170 + displacement} fill="#e9f2f6" fontSize={10} opacity={intro * 0.8}>
          ANKERKOPF
        </text>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            width: '100%',
            textAlign: 'center',
            fontFamily: 'sans-serif',
            fontSize: 42,
            fontWeight: 'bold',
            color: '#e9f2f6',
            letterSpacing: '0.1em',
            opacity: intro,
            transform: `translateY(${(1 - intro) * 20}px)`,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};