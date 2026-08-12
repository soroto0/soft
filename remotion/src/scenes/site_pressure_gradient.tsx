import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const SitePressureGradientScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const opacity = p.enter * p.exit;

  const terrainProgress = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const forceProgress = interpolate(frame, [span * 0.3, span * 0.8], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelOpacity = interpolate(frame, [span * 0.5, span * 0.7], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { id: 'l1', h: 40, fill: '#8a949b', label: 'OBERBODEN' },
    { id: 'l2', h: 80, fill: '#5d6a73', label: 'SEDIMENT' },
    { id: 'l3', h: 100, fill: '#3d4a53', label: 'FELS' },
  ];

  const groundY = 160;
  const northH = 80; // 10m equivalent
  const southD = 37; // 4.6m equivalent

  // Terrain path points
  const p1 = { x: 50, y: groundY - northH * terrainProgress };
  const p2 = { x: 180, y: groundY - northH * terrainProgress };
  const p3 = { x: 220, y: groundY };
  const p4 = { x: 280, y: groundY };
  const p5 = { x: 320, y: groundY + southD * terrainProgress };
  const p6 = { x: 450, y: groundY + southD * terrainProgress };

  const terrainPath = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y} L ${p4.x} ${p4.y} L ${p5.x} ${p5.y} L ${p6.x} ${p6.y}`;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="75%" viewBox="0 0 500 350" style={{ overflow: 'visible' }}>
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#e0b44c" />
          </marker>
          <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="#e9f2f6" strokeWidth="0.5" opacity="0.3" />
          </pattern>
        </defs>

        {/* Geological Layers */}
        {layers.map((layer, i) => {
          const yOffset = groundY + (i * 40);
          return (
            <g key={layer.id} opacity={terrainProgress * 0.6}>
              <rect x="50" y={yOffset} width="400" height={layer.h} fill={layer.fill} stroke="#e9f2f6" strokeWidth="0.5" />
              <rect x="50" y={yOffset} width="400" height={layer.h} fill="url(#hatch)" />
              <text x="55" y={yOffset + 15} fill="#e9f2f6" fontSize="7" fontWeight="bold" opacity={labelOpacity}>
                {layer.label}
              </text>
            </g>
          );
        })}

        {/* Terrain Profile Line */}
        <path d={terrainPath} fill="none" stroke="#e9f2f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Dimensioning North (10m) */}
        <g opacity={labelOpacity}>
          <line x1="40" y1={groundY} x2="60" y2={groundY} stroke="#e9f2f6" strokeWidth="1" />
          <line x1="40" y1={groundY - northH} x2="60" y2={groundY - northH} stroke="#e9f2f6" strokeWidth="1" />
          <line x1="45" y1={groundY} x2="45" y2={groundY - northH} stroke="#e9f2f6" strokeWidth="1" />
          <text x="35" y={groundY - northH / 2} fill="#e9f2f6" fontSize="10" textAnchor="end" dominantBaseline="middle">10m</text>
          <text x="115" y={groundY - northH - 10} fill="#e9f2f6" fontSize="9" textAnchor="middle">AUFSCHÜTTUNG (NORD)</text>
        </g>

        {/* Dimensioning South (4.6m) */}
        <g opacity={labelOpacity}>
          <line x1="440" y1={groundY} x2="460" y2={groundY} stroke="#e9f2f6" strokeWidth="1" />
          <line x1="440" y1={groundY + southD} x2="460" y2={groundY + southD} stroke="#e9f2f6" strokeWidth="1" />
          <line x1="455" y1={groundY} x2="455" y2={groundY + southD} stroke="#e9f2f6" strokeWidth="1" />
          <text x="465" y={groundY + southD / 2} fill="#e9f2f6" fontSize="10" textAnchor="start" dominantBaseline="middle">4,6m</text>
          <text x="385" y={groundY + southD + 15} fill="#e9f2f6" fontSize="9" textAnchor="middle">BAUGRUBE (SÜD)</text>
        </g>

        {/* Pressure Vector (Hebelwirkung) */}
        <g opacity={forceProgress}>
          <line 
            x1="115" 
            y1={groundY + 20} 
            x2={115 + 250 * forceProgress} 
            y2={groundY + 20} 
            stroke="#e0b44c" 
            strokeWidth="4" 
            markerEnd="url(#arrowhead)" 
          />
          <text x="240" y={groundY + 45} fill="#e0b44c" fontSize="12" fontWeight="bold" textAnchor="middle">
            HORIZONTALER DRUCKVEKTOR
          </text>
          <circle cx="115" cy={groundY + 20} r="4" fill="#d0523f" />
        </g>

        {/* Reference Axis */}
        <line x1="50" y1={groundY} x2="450" y2={groundY} stroke="#e9f2f6" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.5" />
      </svg>

      {p.title ? (
        <div style={{
          position: 'absolute',
          bottom: '10%',
          width: '100%',
          textAlign: 'center',
          fontFamily: 'monospace',
          fontSize: 28,
          letterSpacing: '0.2em',
          color: '#e9f2f6',
          opacity: labelOpacity
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};