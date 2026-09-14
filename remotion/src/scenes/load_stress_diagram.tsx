import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const LoadStressDiagramScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const intro = interpolate(frame, [0, span * 0.2], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shear = interpolate(frame, [span * 0.2, span * 0.5], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const failure = interpolate(frame, [span * 0.6, span * 0.8], [0, 1], {
    easing: Easing.elastic(1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const rebarCount = [0, 1, 2, 3, 4, 5];
  const shearForceCount = [0, 1, 2, 3];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 600 450" style={{ overflow: 'visible' }}>
        <defs>
          <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="#e9f2f6" strokeWidth="0.5" opacity="0.3" />
          </pattern>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#e9f2f6" />
          </marker>
          <marker id="failhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#d0523f" />
          </marker>
        </defs>

        {/* Brückenplatte (Slab) */}
        <g opacity={intro}>
          <rect x="100" y="80" width="400" height="60" fill="none" stroke="#e9f2f6" strokeWidth="1.5" />
          <rect x="100" y="80" width="400" height="60" fill="url(#hatch)" />
          <text x="510" y="115" fill="#e9f2f6" fontSize="12" fontFamily="monospace">BRÜCKENPLATTE (C35/45)</text>
        </g>

        {/* Diagonal Pillar 11 */}
        <g opacity={intro}>
          <path 
            d="M 250 140 L 400 140 L 250 350 L 100 350 Z" 
            fill="none" 
            stroke="#e9f2f6" 
            strokeWidth="1.5" 
          />
          <path 
            d="M 250 140 L 400 140 L 250 350 L 100 350 Z" 
            fill="url(#hatch)" 
            opacity="0.6"
          />
          <text x="120" y="380" fill="#e9f2f6" fontSize="12" fontFamily="monospace">PFEILER 11 (DIAGONAL)</text>
        </g>

        {/* Construction Joint (Arbeitsfuge) */}
        <line 
          x1="250" y1="140" x2="400" y2="140" 
          stroke="#e0b44c" 
          strokeWidth="3" 
          strokeDasharray="5 3" 
          opacity={intro}
        />
        <text x="410" y="155" fill="#e0b44c" fontSize="10" fontFamily="monospace" opacity={intro}>GLATTE ARBEITSFUGE</text>

        {/* Reinforcement (Bewehrung) */}
        {rebarCount.map((i) => (
          <line 
            key={`rebar-${i}`}
            x1={270 + i * 22} y1={110} 
            x2={270 + i * 22} y2={170} 
            stroke="#8a949b" 
            strokeWidth="2" 
            opacity={intro * 0.8}
          />
        ))}

        {/* Shear Force Vectors */}
        {shearForceCount.map((i) => (
          <g key={`shear-${i}`} opacity={shear}>
            <line 
              x1={260 + i * 40} y1={130} 
              x2={(260 + i * 40) + (30 * shear)} y2={130} 
              stroke="#e9f2f6" 
              strokeWidth="2" 
              markerEnd="url(#arrowhead)" 
            />
            <line 
              x1={280 + i * 40} y1={150} 
              x2={(280 + i * 40) - (30 * shear)} y2={150} 
              stroke="#e9f2f6" 
              strokeWidth="2" 
              markerEnd="url(#arrowhead)" 
            />
          </g>
        ))}
        <text x="325" y="185" fill="#e9f2f6" fontSize="11" textAnchor="middle" opacity={shear}>
          WIRKENDE SCHERKRÄFTE (V_u)
        </text>

        {/* Failure Marker */}
        <g opacity={failure}>
          <line 
            x1="450" y1="220" 
            x2="335" y2="145" 
            stroke="#d0523f" 
            strokeWidth="3" 
            markerEnd="url(#failhead)" 
          />
          <circle cx="325" cy="140" r="8" fill="none" stroke="#d0523f" strokeWidth="2">
            <animate attributeName="r" values="8;12;8" dur="1s" repeatCount="indefinite" />
          </circle>
          <text x="460" y="235" fill="#d0523f" fontSize="14" fontWeight="bold" fontFamily="monospace">
            PUNKT DES VERSAGENS
          </text>
          <text x="460" y="255" fill="#d0523f" fontSize="10" fontFamily="monospace">
            KAPAZITÄT ÜBERSCHRITTEN
          </text>
        </g>
      </svg>

      {p.title && (
        <div style={{
          position: 'absolute',
          bottom: '10%',
          color: '#e9f2f6',
          fontFamily: 'monospace',
          fontSize: 28,
          borderLeft: '4px solid #d0523f',
          paddingLeft: 20,
          opacity: intro
        }}>
          {p.title}
        </div>
      )}
    </AbsoluteFill>
  );
};