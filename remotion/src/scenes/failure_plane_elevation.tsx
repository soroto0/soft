import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const FailurePlaneElevationScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const reveal = interpolate(frame, [0, span * 0.2], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const failure = interpolate(frame, [span * 0.3, span * 0.5], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textShift = interpolate(frame, [span * 0.4, span * 0.7], [20, 0], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const piles = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
  const soilLayers = [
    { y: 80, h: 100, fill: '#5d6a73', label: 'AUFFÜLLUNG' },
    { y: 180, h: 120, fill: '#4a555e', label: 'SCHLICK' },
    { y: 300, h: 150, fill: '#3a444d', label: 'KLEI' },
  ];
  const depthTicks = [
    { depth: '0.0m', y: 80 },
    { depth: '1.0m', y: 140 },
    { depth: '2.0m', y: 200 },
    { depth: '3.0m', y: 260 },
    { depth: '4.0m', y: 320 },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" height="70%" viewBox="0 0 800 500">
        <defs>
          <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="#e9f2f6" strokeWidth="0.5" opacity="0.2" />
          </pattern>
        </defs>

        {/* Soil Layers */}
        {soilLayers.map((layer, i) => (
          <g key={i} opacity={reveal}>
            <rect x="150" y={layer.y} width="500" height={layer.h} fill={layer.fill} stroke="#e9f2f6" strokeWidth="0.5" />
            <rect x="150" y={layer.y} width="500" height={layer.h} fill="url(#hatch)" />
            <text x="640" y={layer.y + 20} fill="#e9f2f6" fontSize="10" opacity="0.6" textAnchor="end">{layer.label}</text>
          </g>
        ))}

        {/* Bodenplatte (Slab) */}
        <rect x="140" y={50} width="520" height="30" fill="#8a949b" stroke="#e9f2f6" strokeWidth="1" opacity={reveal} />
        <text x="400" y="40" fill="#e9f2f6" fontSize="12" textAnchor="middle" opacity={reveal}>BODENPLATTE (BETON)</text>

        {/* Piles (Pfähle) */}
        {piles.map((pIndex) => {
          const xPos = 180 + pIndex * 31.5;
          const breakY = 200; // 2.0m depth
          return (
            <g key={pIndex} opacity={reveal}>
              {/* Upper part of pile */}
              <rect
                x={xPos}
                y={80}
                width="8"
                height={120}
                fill="#c9d3d9"
                stroke="#e9f2f6"
                strokeWidth="0.5"
              />
              {/* Lower part of pile with slight shift on failure */}
              <rect
                x={xPos + failure * 2}
                y={breakY + failure * 3}
                width="8"
                height={200}
                fill="#c9d3d9"
                stroke="#e9f2f6"
                strokeWidth="0.5"
                opacity={1 - failure * 0.2}
              />
              {/* Failure Point Highlight */}
              <circle
                cx={xPos + 4}
                cy={breakY}
                r={failure * 5}
                fill="#d0523f"
                opacity={failure}
              />
            </g>
          );
        })}

        {/* Failure Plane Line */}
        <line
          x1="130"
          y1="200"
          x2="670"
          y2="200"
          stroke={failure > 0.1 ? "#d0523f" : "#e9f2f6"}
          strokeWidth={failure > 0.1 ? 3 : 1}
          strokeDasharray="10 5"
          opacity={reveal}
        />
        
        {/* Depth Scale */}
        {depthTicks.map((tick, i) => (
          <g key={i} opacity={reveal}>
            <line x1="120" y1={tick.y} x2="140" y2={tick.y} stroke="#e9f2f6" strokeWidth="1" />
            <text x="110" y={tick.y + 4} fill="#e9f2f6" fontSize="11" textAnchor="end">{tick.depth}</text>
          </g>
        ))}

        {/* Annotations */}
        <g opacity={failure}>
          <path d="M 670 200 L 710 170" fill="none" stroke="#e0b44c" strokeWidth="1.5" />
          <text x="715" y="165" fill="#e0b44c" fontSize="14" fontWeight="bold">BRUCHEBENE</text>
          <text x="715" y="182" fill="#e0b44c" fontSize="11">~2.0m UNTER OK</text>
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
            fontWeight: 300,
            letterSpacing: '0.05em',
            opacity: reveal,
            transform: `translateY(${textShift}px)`,
            borderLeft: '4px solid #d0523f',
            paddingLeft: '20px',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};