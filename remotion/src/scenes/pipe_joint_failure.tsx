import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const PipeJointFailureScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const { width, height, fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const slip = interpolate(frame, [span * 0.2, span * 0.5], [0, 25], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const leak = interpolate(frame, [span * 0.45, span * 0.8], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const reveal = interpolate(frame, [0, span * 0.15], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const soilLayers = [
    { y: 0, h: 140, name: 'SUELO COMPACTADO', fill: '#3a444d' },
    { y: 310, h: 140, name: 'CAMA DE APOYO', fill: '#2a343d' },
  ];

  const leakLines = [-40, -20, 0, 20, 40];

  return (
    <AbsoluteFill style={{ opacity, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={width * 0.8} height={height * 0.7} viewBox="0 0 800 450">
        <defs>
          <pattern id="hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="10" stroke="#5d6a73" strokeWidth="0.5" />
          </pattern>
        </defs>

        {/* Soil Layers */}
        {soilLayers.map((layer) => (
          <g key={layer.name} opacity={reveal * 0.4}>
            <rect x="50" y={layer.y} width="700" height={layer.h} fill="url(#hatch)" />
            <text x="60" y={layer.y + 20} fill="#e9f2f6" fontSize="12" fontFamily="monospace">{layer.name}</text>
          </g>
        ))}

        {/* Pipe 1 (Fixed) */}
        <g opacity={reveal}>
          <rect x="50" y="170" width="300" height="110" fill="none" stroke="#e9f2f6" strokeWidth="2" />
          <rect x="50" y="180" width="300" height="90" fill="#5d6a73" opacity="0.3" />
          <text x="60" y="225" fill="#e9f2f6" fontSize="14" fontWeight="bold">HDPE Ø 1.200 mm</text>
        </g>

        {/* Pipe 2 (Slipping) */}
        <g transform={`translate(${slip}, 0)`} opacity={reveal}>
          <rect x="350" y="170" width="350" height="110" fill="none" stroke="#e9f2f6" strokeWidth="2" />
          <rect x="350" y="180" width="350" height="90" fill="#5d6a73" opacity="0.3" />
          <line x1="350" y1="170" x2="350" y2="280" stroke="#e0b44c" strokeWidth="3" strokeDasharray="4 2" />
        </g>

        {/* Mechanical Coupling */}
        <g opacity={reveal}>
          <rect x="320" y="160" width="60" height="130" fill="none" stroke="#e0b44c" strokeWidth="2" />
          <rect x="320" y="160" width="60" height="10" fill="#e0b44c" />
          <rect x="320" y="280" width="60" height="10" fill="#e0b44c" />
          <text x="350" y="150" fill="#e0b44c" fontSize="12" textAnchor="middle">JUNTA MECÁNICA</text>
        </g>

        {/* Failure Indicators */}
        {slip > 5 && (
          <g opacity={leak}>
            <line x1="350" y1="295" x2={350 + slip} y2="295" stroke="#d0523f" strokeWidth="2" />
            <line x1="350" y1="290" x2="350" y2="300" stroke="#d0523f" strokeWidth="2" />
            <line x1={350 + slip} y1="290" x2={350 + slip} y2="300" stroke="#d0523f" strokeWidth="2" />
            <text x={350 + slip / 2} y="315" fill="#d0523f" fontSize="12" textAnchor="middle" fontWeight="bold">
              FALLO: 15 mm
            </text>
          </g>
        )}

        {/* Leak Vectors */}
        {leakLines.map((offset, i) => (
          <g key={i} opacity={leak}>
            <path
              d={`M ${350 + slip / 2} ${225 + offset} L ${350 + slip / 2 + 40 * leak} ${225 + offset + (offset > 0 ? 20 : -20) * leak}`}
              stroke="#d0523f"
              strokeWidth="2"
              fill="none"
              markerEnd="url(#arrowhead)"
            />
            <circle cx={350 + slip / 2} cy={225 + offset} r="2" fill="#d0523f" />
          </g>
        ))}

        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#d0523f" />
          </marker>
        </defs>

        {/* Technical Annotations */}
        <line x1="700" y1="170" x2="720" y2="170" stroke="#e9f2f6" strokeWidth="1" />
        <line x1="700" y1="280" x2="720" y2="280" stroke="#e9f2f6" strokeWidth="1" />
        <line x1="715" y1="170" x2="715" y2="280" stroke="#e9f2f6" strokeWidth="1" />
        <text x="725" y="230" fill="#e9f2f6" fontSize="10" transform="rotate(90, 725, 230)">DN 1200</text>
      </svg>

      {p.title ? (
        <div style={{
          marginTop: 40,
          color: '#e9f2f6',
          fontSize: 42,
          fontFamily: 'monospace',
          letterSpacing: 4,
          borderBottom: '2px solid #d0523f',
          paddingBottom: 8,
          opacity: reveal
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};