import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const TunnelCrossSectionLoadScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, (p.dur || 1) * fps);

  const opacity = p.enter * p.exit;

  const drawProgress = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const loadProgress = interpolate(frame, [span * 0.3, span * 0.6], [0, 1], {
    easing: Easing.bezier(0.33, 1, 0.68, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textReveal = interpolate(frame, [span * 0.5, span * 0.8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const slabY = 220;
  const slabWidth = 460;
  const slabHeight = 35;
  const centerX = 400;

  const rebarPositions = [10, 25, 40, 55, 70, 85];
  const suspensionPoints = [centerX - 180, centerX - 60, centerX + 60, centerX + 180];

  return (
    <AbsoluteFill
      style={{
        opacity,
        width,
        height,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <svg
        width="80%"
        height="70%"
        viewBox="0 0 800 600"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <pattern id="concrete" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#8a949b" opacity="0.4" />
            <circle cx="12" cy="15" r="0.8" fill="#8a949b" opacity="0.3" />
            <line x1="0" y1="20" x2="20" y2="0" stroke="#8a949b" strokeWidth="0.2" opacity="0.2" />
          </pattern>
        </defs>

        {/* Tunnel Arch */}
        <path
          d="M 100 500 A 300 250 0 0 1 700 500"
          fill="none"
          stroke="#e9f2f6"
          strokeWidth="4"
          strokeDasharray="1200"
          strokeDashoffset={1200 * (1 - drawProgress)}
        />

        {/* Concrete Slab */}
        <g opacity={drawProgress}>
          <rect
            x={centerX - slabWidth / 2}
            y={slabY}
            width={slabWidth}
            height={slabHeight}
            fill="url(#concrete)"
            stroke="#e9f2f6"
            strokeWidth="2"
          />
          {/* Rebar visualization */}
          {rebarPositions.map((pos, i) => (
            <line
              key={`rebar-${i}`}
              x1={centerX - slabWidth / 2 + 5}
              y1={slabY + (slabHeight * pos) / 100}
              x2={centerX + slabWidth / 2 - 5}
              y2={slabY + (slabHeight * pos) / 100}
              stroke="#8a949b"
              strokeWidth="0.5"
              opacity="0.6"
            />
          ))}
          <text
            x={centerX}
            y={slabY + slabHeight + 20}
            fill="#e9f2f6"
            fontSize="12"
            textAnchor="middle"
            fontFamily="monospace"
          >
            STAHLBETONPLATTE (C35/45)
          </text>
        </g>

        {/* Suspension Rods */}
        {suspensionPoints.map((pt, i) => (
          <g key={`susp-${i}`} opacity={drawProgress}>
            <line
              x1={pt}
              y1={130}
              x2={pt}
              y2={slabY}
              stroke="#e9f2f6"
              strokeWidth="2"
              strokeDasharray="5 5"
            />
            <circle cx={pt} cy={slabY} r="4" fill="#e0b44c" />
          </g>
        ))}

        {/* Load Arrows */}
        {suspensionPoints.map((pt, i) => (
          <g key={`arrow-${i}`} opacity={loadProgress}>
            <path
              d={`M ${pt} ${slabY - 80} L ${pt} ${slabY - 15}`}
              stroke="#d0523f"
              strokeWidth="6"
              markerEnd="url(#arrowhead)"
            />
            <path
              d={`M ${pt - 10} ${slabY - 25} L ${pt} ${slabY - 10} L ${pt + 10} ${slabY - 25}`}
              fill="none"
              stroke="#d0523f"
              strokeWidth="4"
            />
          </g>
        ))}

        {/* Dimension Lines */}
        <g opacity={textReveal}>
          <line
            x1={centerX - slabWidth / 2}
            y1={slabY - 40}
            x2={centerX + slabWidth / 2}
            y2={slabY - 40}
            stroke="#e9f2f6"
            strokeWidth="1"
          />
          <line x1={centerX - slabWidth / 2} y1={slabY - 50} x2={centerX - slabWidth / 2} y2={slabY - 30} stroke="#e9f2f6" strokeWidth="1" />
          <line x1={centerX + slabWidth / 2} y1={slabY - 50} x2={centerX + slabWidth / 2} y2={slabY - 30} stroke="#e9f2f6" strokeWidth="1" />
          <text x={centerX} y={slabY - 55} fill="#e9f2f6" fontSize="14" textAnchor="middle">3.85 m</text>
          
          <text x={centerX} y={slabY - 100} fill="#d0523f" fontSize="22" fontWeight="bold" textAnchor="middle">
            40.000 kg (40t)
          </text>
        </g>

        {/* Buick LeSabre Silhouette (Simplified) */}
        <g opacity={drawProgress * 0.7} transform="translate(320, 420) scale(0.8)">
          <path
            d="M 10 60 L 30 60 L 50 30 L 150 30 L 180 60 L 200 60 L 200 90 L 10 90 Z"
            fill="#e0b44c"
            stroke="#e9f2f6"
            strokeWidth="2"
          />
          <circle cx="50" cy="90" r="12" fill="#1a1a1a" stroke="#e9f2f6" strokeWidth="1" />
          <circle cx="160" cy="90" r="12" fill="#1a1a1a" stroke="#e9f2f6" strokeWidth="1" />
          <text x="105" y="115" fill="#e9f2f6" fontSize="14" textAnchor="middle" fontFamily="sans-serif">BUICK LeSABRE</text>
        </g>

        {/* Legend */}
        <g transform="translate(550, 80)" opacity={textReveal}>
          <rect width="180" height="80" fill="rgba(233, 242, 246, 0.05)" stroke="#e9f2f6" strokeWidth="0.5" />
          <line x1="10" y1="25" x2="30" y2="25" stroke="#d0523f" strokeWidth="4" />
          <text x="40" y="30" fill="#e9f2f6" fontSize="12">STATISCHE LAST</text>
          <line x1="10" y1="55" x2="30" y2="55" stroke="#e9f2f6" strokeWidth="2" strokeDasharray="3 2" />
          <text x="40" y="60" fill="#e9f2f6" fontSize="12">AUFHÄNGUNG</text>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            fontFamily: 'Helvetica, Arial, sans-serif',
            fontSize: 42,
            fontWeight: 'bold',
            color: '#e9f2f6',
            letterSpacing: '0.1em',
            opacity: textReveal,
            transform: `translateY(${interpolate(textReveal, [0, 1], [20, 0])}px)`,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};