import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const FoundationSettlementKnicklaengeScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const opacity = p.enter * p.exit;

  const settlement = interpolate(frame, [span * 0.2, span * 0.7], [0, 40], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const highlight = interpolate(frame, [span * 0.5, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const intro = interpolate(frame, [0, span * 0.15], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const soilLayers = [
    { y: 350, h: 100, fill: '#3a444a', name: 'AUFFÜLLUNG' },
    { y: 450, h: 150, fill: '#2a3236', name: 'GESCHIEBEMERGEL' },
    { y: 600, h: 200, fill: '#1a1f22', name: 'HORIZONT B' },
  ];

  const colX = width * 0.5;
  const colWidth = 40;
  const initialBaseY = 400;
  const currentBaseY = initialBaseY + settlement;
  const topY = 100;

  return (
    <AbsoluteFill style={{ opacity, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <svg width={width * 0.8} height={height * 0.8} viewBox="0 0 800 600" style={{ overflow: 'visible' }}>
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#e9f2f6" />
          </marker>
          <marker id="arrowhead-amber" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#e0b44c" />
          </marker>
          <pattern id="hatch" patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="10" stroke="#e9f2f6" strokeWidth="1" opacity="0.3" />
          </pattern>
        </defs>

        {/* Soil Layers */}
        {soilLayers.map((layer, i) => (
          <g key={layer.name} opacity={intro}>
            <rect
              x={100}
              y={layer.y + (i < 2 ? settlement * 0.5 : 0)}
              width={600}
              height={layer.h}
              fill={layer.fill}
              stroke="#e9f2f6"
              strokeWidth="0.5"
              opacity="0.4"
            />
            <text x={110} y={layer.y + 20 + (i < 2 ? settlement * 0.5 : 0)} fill="#e9f2f6" fontSize="12" opacity="0.6">
              {layer.name}
            </text>
          </g>
        ))}

        {/* Foundation */}
        <g transform={`translate(0, ${settlement})`} opacity={intro}>
          <rect
            x={colX - 80}
            y={initialBaseY}
            width={160}
            height={60}
            fill="url(#hatch)"
            stroke="#e9f2f6"
            strokeWidth="2"
          />
          <rect x={colX - 80} y={initialBaseY} width={160} height={60} fill="#e9f2f6" opacity="0.1" />
          <text x={colX} y={initialBaseY + 85} fill="#e9f2f6" fontSize="14" textAnchor="middle">
            EINZELFUNDAMENT
          </text>
        </g>

        {/* Column */}
        <g opacity={intro}>
          <rect
            x={colX - colWidth / 2}
            y={topY}
            width={colWidth}
            height={currentBaseY - topY}
            fill="#8a949b"
            stroke="#e9f2f6"
            strokeWidth="2"
          />
          <line
            x1={colX}
            y1={topY}
            x2={colX}
            y2={currentBaseY}
            stroke="#e0b44c"
            strokeWidth="2"
            strokeDasharray="8 4"
            opacity={highlight}
          />
        </g>

        {/* Ground Line / Nullpunkt */}
        <g transform={`translate(0, ${settlement})`}>
          <line x1={100} y1={initialBaseY} x2={700} y2={initialBaseY} stroke="#e9f2f6" strokeWidth="1" strokeDasharray="4 4" />
          <text x={710} y={initialBaseY + 5} fill="#e9f2f6" fontSize="12">±0.00 (SETZUNG)</text>
        </g>

        {/* Dimensioning - Initial */}
        <g opacity={0.4}>
          <line x1={colX - 120} y1={topY} x2={colX - 120} y2={initialBaseY} stroke="#e9f2f6" strokeWidth="1.5" />
          <line x1={colX - 130} y1={topY} x2={colX - 110} y2={topY} stroke="#e9f2f6" strokeWidth="1.5" />
          <line x1={colX - 130} y1={initialBaseY} x2={colX - 110} y2={initialBaseY} stroke="#e9f2f6" strokeWidth="1.5" />
          <text x={colX - 140} y={(topY + initialBaseY) / 2} fill="#e9f2f6" fontSize="16" textAnchor="end">L₀ = 4.50m</text>
        </g>

        {/* Dimensioning - New (Amber) */}
        <g opacity={highlight}>
          <line x1={colX + 120} y1={topY} x2={colX + 120} y2={currentBaseY} stroke="#e0b44c" strokeWidth="2.5" />
          <line x1={colX + 110} y1={topY} x2={colX + 130} y2={topY} stroke="#e0b44c" strokeWidth="2.5" />
          <line x1={colX + 110} y1={currentBaseY} x2={colX + 130} y2={currentBaseY} stroke="#e0b44c" strokeWidth="2.5" />
          <text x={colX + 140} y={(topY + currentBaseY) / 2} fill="#e0b44c" fontSize="18" fontWeight="bold">
            Lₖ = 4.95m (+10%)
          </text>
        </g>

        {/* Settlement Indicator Arrow */}
        <g opacity={highlight}>
          <line
            x1={colX + 60}
            y1={initialBaseY}
            x2={colX + 60}
            y2={currentBaseY - 5}
            stroke="#d0523f"
            strokeWidth="3"
            markerEnd="url(#arrowhead-amber)"
          />
          <text x={colX + 70} y={currentBaseY} fill="#d0523f" fontSize="14" fontWeight="bold">Δs</text>
        </g>

        {/* Axis Ticks */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <line
            key={t}
            x1={colX - 5}
            y1={topY + t * (currentBaseY - topY)}
            x2={colX + 5}
            y2={topY + t * (currentBaseY - topY)}
            stroke="#e9f2f6"
            strokeWidth="1"
            opacity={intro * 0.5}
          />
        ))}
      </svg>

      {p.title && (
        <div
          style={{
            position: 'absolute',
            bottom: 60,
            width: '100%',
            textAlign: 'center',
            fontFamily: 'monospace',
            fontSize: 32,
            color: '#e9f2f6',
            letterSpacing: '2px',
            opacity: intro,
            transform: `translateY(${interpolate(frame, [0, span], [20, 0])}px)`,
          }}
        >
          {p.title}
        </div>
      )}
    </AbsoluteFill>
  );
};