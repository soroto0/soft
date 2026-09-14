import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const WallGeometryReductionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const drawGravity = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const drawPiles = interpolate(frame, [span * 0.3, span * 0.7], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelAlpha = interpolate(frame, [span * 0.5, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const soilLayers = [
    { y: 80, h: 60, fill: '#3d4449', name: 'RELLENO' },
    { y: 140, h: 80, fill: '#2a2f33', name: 'ARCILLA LIMOSA' },
    { y: 220, h: 80, fill: '#1a1d20', name: 'SUELO FIRME' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg
        width={width * 0.8}
        height={height * 0.7}
        viewBox="0 0 500 300"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="#8a949b" strokeWidth="1" />
          </pattern>
        </defs>

        {/* Soil Strata */}
        {soilLayers.map((layer, i) => (
          <g key={layer.name} opacity={0.4}>
            <rect x="50" y={layer.y} width="400" height={layer.h} fill={layer.fill} />
            <text
              x="60"
              y={layer.y + 15}
              fill="#8a949b"
              fontSize="8"
              fontFamily="monospace"
            >
              {layer.name}
            </text>
            {i < soilLayers.length - 1 && (
              <line
                x1="50"
                y1={layer.y + layer.h}
                x2="450"
                y2={layer.y + layer.h}
                stroke="#e9f2f6"
                strokeWidth="0.5"
                strokeDasharray="2 2"
              />
            )}
          </g>
        ))}

        {/* Gravity Wall (Projected) */}
        <g opacity={drawGravity * 0.5}>
          <path
            d="M 180,80 L 260,80 L 320,220 L 120,220 Z"
            fill="url(#hatch)"
            stroke="#8a949b"
            strokeWidth="1.5"
            strokeDasharray="4 2"
          />
          <rect x="100" y="220" width="240" height="30" fill="none" stroke="#8a949b" strokeWidth="1.5" strokeDasharray="4 2" />
          <line x1="100" y1="235" x2="80" y2="260" stroke="#8a949b" strokeWidth="1" />
          <text x="75" y="275" fill="#8a949b" fontSize="10" textAnchor="middle">CIMENTACIÓN PROFUNDA</text>
        </g>

        {/* Pile Wall (Actual) */}
        <g opacity={drawPiles}>
          <rect
            x="215"
            y="80"
            width="10"
            height={180 * drawPiles}
            fill="#d0523f"
            stroke="#e9f2f6"
            strokeWidth="0.5"
          />
          {[215, 225].map((x) => (
            <line
              key={x}
              x1={x}
              y1="260"
              x2={x}
              y2={260 + 20 * drawPiles}
              stroke="#d0523f"
              strokeWidth="1"
            />
          ))}
          <text x="230" y="150" fill="#e0b44c" fontSize="10" fontWeight="bold">
            CORTINA DE ESTACAS
          </text>
        </g>

        {/* Comparison Annotations */}
        <g opacity={labelAlpha}>
          <line x1="180" y1="70" x2="260" y2="70" stroke="#e9f2f6" strokeWidth="1" />
          <text x="220" y="65" fill="#e9f2f6" fontSize="9" textAnchor="middle">8.0m (PROYECTADO)</text>
          
          <line x1="215" y1="95" x2="225" y2="95" stroke="#d0523f" strokeWidth="1" />
          <text x="220" y="108" fill="#d0523f" fontSize="9" textAnchor="middle">0.6m (REAL)</text>

          <path d="M 350,80 L 370,80 M 360,80 L 360,220 M 350,220 L 370,220" stroke="#8a949b" strokeWidth="1" />
          <text x="375" y="155" fill="#8a949b" fontSize="9">H = 14.0m</text>
        </g>
      </svg>

      {p.title && (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            color: '#e9f2f6',
            fontSize: 32,
            fontFamily: 'sans-serif',
            letterSpacing: '0.1em',
            opacity: labelAlpha,
            transform: `translateY(${interpolate(labelAlpha, [0, 1], [20, 0])}px)`,
          }}
        >
          {p.title}
        </div>
      )}
    </AbsoluteFill>
  );
};