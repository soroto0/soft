import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const AuflagerGeometrieVersagenScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 4) * fps));

  const slide = interpolate(frame, [span * 0.1, span * 0.9], [0, 220], {
    easing: Easing.bezier(0.45, 0, 0.55, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const contactValue = interpolate(frame, [span * 0.1, span * 0.9], [220, 0], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const alertAlpha = interpolate(frame, [span * 0.7, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const beamX = 150 + slide;
  const consoleRight = 370;

  return (
    <AbsoluteFill
      style={{
        opacity,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <svg
        width={width * 0.8}
        height={height * 0.7}
        viewBox="0 0 800 450"
        fill="none"
      >
        <defs>
          <pattern
            id="concrete-hatch"
            patternUnits="userSpaceOnUse"
            width="10"
            height="10"
            patternTransform="rotate(45)"
          >
            <line x1="0" y1="0" x2="0" y2="10" stroke="#e9f2f6" strokeWidth="0.5" opacity="0.3" />
            <circle cx="2" cy="2" r="0.5" fill="#e9f2f6" opacity="0.5" />
          </pattern>
        </defs>

        {/* Console (Fixed) */}
        <path
          d="M 50 400 L 370 400 L 370 250 L 50 250 Z"
          fill="url(#concrete-hatch)"
          stroke="#e9f2f6"
          strokeWidth="2"
        />
        <text x="60" y="380" fill="#e9f2f6" fontSize="14" fontWeight="300">
          KONSOLE (STB)
        </text>

        {/* Critical Zone Highlight */}
        <rect
          x={beamX}
          y="245"
          width={Math.max(0, consoleRight - beamX)}
          height="10"
          fill="#d0523f"
          opacity={alertAlpha * 0.6}
        />

        {/* Concrete Beam (Moving) */}
        <g transform={`translate(${slide}, 0)`}>
          <rect
            x="150"
            y="130"
            width="550"
            height="120"
            fill="url(#concrete-hatch)"
            stroke="#e9f2f6"
            strokeWidth="2"
          />
          <text x="170" y="160" fill="#e9f2f6" fontSize="16" fontWeight="bold">
            BETONBINDER (QUERTRÄGER)
          </text>
          
          {/* Arrow indicating movement */}
          <line
            x1="650"
            y1="190"
            x2="720"
            y2="190"
            stroke="#e0b44c"
            strokeWidth="3"
            markerEnd="url(#arrowhead)"
          />
        </g>

        {/* Dimension Chain */}
        <g opacity={contactValue > 0 ? 1 : 0.3}>
          <line
            x1={beamX}
            y1="110"
            x2={consoleRight}
            y2="110"
            stroke="#e0b44c"
            strokeWidth="1.5"
          />
          <line x1={beamX} y1="100" x2={beamX} y2="120" stroke="#e0b44c" strokeWidth="1.5" />
          <line x1={consoleRight} y1="100" x2={consoleRight} y2="120" stroke="#e0b44c" strokeWidth="1.5" />
          <text
            x={(beamX + consoleRight) / 2}
            y="95"
            fill="#e0b44c"
            fontSize="18"
            textAnchor="middle"
            fontFamily="monospace"
          >
            {contactValue.toFixed(1)} mm
          </text>
          <text
            x={(beamX + consoleRight) / 2}
            y="75"
            fill="#e9f2f6"
            fontSize="10"
            textAnchor="middle"
          >
            KONTAKTFLÄCHE
          </text>
        </g>

        {/* Failure Marker */}
        {contactValue <= 5 && (
          <g opacity={alertAlpha}>
            <circle cx={consoleRight} cy="250" r="15" stroke="#d0523f" strokeWidth="2">
              <animate attributeName="r" values="15;25;15" dur="1s" repeatCount="indefinite" />
            </circle>
            <text x={consoleRight + 25} y="255" fill="#d0523f" fontSize="14" fontWeight="bold">
              STRUKTURELLES VERSAGEN
            </text>
          </g>
        )}

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
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            width: '100%',
            textAlign: 'center',
            color: '#e9f2f6',
            fontFamily: 'sans-serif',
            fontSize: 28,
            letterSpacing: '0.1em',
            fontWeight: 300,
            textTransform: 'uppercase',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};