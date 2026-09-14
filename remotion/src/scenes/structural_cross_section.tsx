import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const StructuralCrossSectionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const reveal = interpolate(frame, [0, span * 0.15], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const defectAlpha = interpolate(frame, [span * 0.2, span * 0.4], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const scanLineY = interpolate(frame, [span * 0.1, span * 0.8], [60, 190], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const aggregates = [
    { x: 80, y: 80, r: 3 }, { x: 100, y: 150, r: 4 }, { x: 280, y: 90, r: 3 },
    { x: 310, y: 170, r: 5 }, { x: 250, y: 70, r: 2 }, { x: 70, y: 180, r: 4 }
  ];

  const sandLayers = [115, 122, 130, 138];
  const gravel = [
    { x: 155, y: 118 }, { x: 170, y: 125 }, { x: 162, y: 140 },
    { x: 185, y: 135 }, { x: 195, y: 122 }, { x: 210, y: 145 }
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 280" style={{ overflow: 'visible' }}>
        {/* Main Concrete Structure */}
        <rect
          x="50"
          y="60"
          width="300"
          height="130"
          fill="#8a949b"
          stroke="#e9f2f6"
          strokeWidth="1.5"
          opacity={reveal}
        />

        {/* Homogeneous Aggregates */}
        {aggregates.map((a, i) => (
          <circle
            key={`agg-${i}`}
            cx={a.x}
            cy={a.y}
            r={a.r}
            fill="#5d6a73"
            opacity={reveal * 0.6}
          />
        ))}

        {/* Defect Window (Fehlstelle) */}
        <g opacity={defectAlpha}>
          <rect
            x="140"
            y="105"
            width="100"
            height="60"
            fill="none"
            stroke="#e0b44c"
            strokeWidth="2.5"
            strokeDasharray="4 2"
          />
          
          {/* Sand Layers */}
          {sandLayers.map((y, i) => (
            <line
              key={`sand-${i}`}
              x1="145"
              y1={y}
              x2="235"
              y2={y + (i % 2 === 0 ? 2 : -2)}
              stroke="#e0b44c"
              strokeWidth="1"
              opacity={0.8}
            />
          ))}

          {/* Loose Gravel */}
          {gravel.map((g, i) => (
            <circle
              key={`gravel-${i}`}
              cx={g.x}
              cy={g.y}
              r="2"
              fill="#e9f2f6"
            />
          ))}

          {/* Massive Rock Block */}
          <path
            d="M 210 110 L 235 115 L 230 140 L 205 135 Z"
            fill="#5d6a73"
            stroke="#e9f2f6"
            strokeWidth="1"
          />
        </g>

        {/* Labels and Leader Lines */}
        <g opacity={reveal}>
          <line x1="50" y1="60" x2="30" y2="40" stroke="#e9f2f6" strokeWidth="0.5" />
          <text x="25" y="35" fill="#e9f2f6" fontSize="10" textAnchor="end">LAMELLE 11 (NORMAL)</text>
          
          <line x1="190" y1="105" x2="190" y2="85" stroke="#e0b44c" strokeWidth="1" opacity={defectAlpha} />
          <text x="190" y="78" fill="#e0b44c" fontSize="10" textAnchor="middle" opacity={defectAlpha}>FEHLSTELLE: SAND / KIES</text>
          
          <line x1="225" y1="125" x2="260" y2="125" stroke="#e9f2f6" strokeWidth="0.5" opacity={defectAlpha} />
          <text x="265" y="128" fill="#e9f2f6" fontSize="9" textAnchor="start" opacity={defectAlpha}>GESTEINSBLOCK</text>
        </g>

        {/* Scan Line Animation */}
        <line
          x1="45"
          y1={scanLineY}
          x2="355"
          y2={scanLineY}
          stroke="#d0523f"
          strokeWidth="1"
          strokeDasharray="2 2"
          opacity={reveal * 0.8}
        />
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            fontFamily: 'monospace',
            fontSize: 28,
            color: '#e9f2f6',
            letterSpacing: '2px',
            borderLeft: '4px solid #d0523f',
            paddingLeft: '16px',
            opacity: reveal,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};