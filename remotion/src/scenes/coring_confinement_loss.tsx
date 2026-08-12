import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const CoringConfinementLossScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const augerLift = interpolate(frame, [span * 0.1, span * 0.7], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const confinement = interpolate(frame, [span * 0.2, span * 0.8], [1, 0.2], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const settlement = interpolate(frame, [span * 0.4, span * 0.9], [0, 25], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { y: 120, h: 80, fill: '#2a353d', name: 'RELLENO COMPACTADO' },
    { y: 200, h: 220, fill: '#1e262c', name: 'ARCILLA BLANDA (SATURADA)' },
    { y: 420, h: 80, fill: '#141a1f', name: 'SUSTRATO ROCOSO' },
  ];

  const lateralDepths = [240, 280, 320, 360, 400];
  const surfacePoints = [320, 360, 400, 520, 560, 600];
  const depthMarkers = [0, 2, 4, 6, 8];

  const centerX = 460;
  const casingWidth = 90;
  const augerY = 420 - augerLift * 300;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg
        width={width * 0.8}
        height={height * 0.8}
        viewBox="0 0 920 540"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <marker id="arrowhead-danger" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#d0523f" />
          </marker>
          <marker id="arrowhead-amber" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#e0b44c" />
          </marker>
          <linearGradient id="augerGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8a949b" />
            <stop offset="0.5" stopColor="#5d6a73" />
            <stop offset="1" stopColor="#3a4b5c" />
          </linearGradient>
        </defs>

        {/* Soil Layers */}
        {layers.map((layer) => (
          <g key={layer.name}>
            <rect
              x={100}
              y={layer.y}
              width={720}
              height={layer.h}
              fill={layer.fill}
              stroke="#3a4b5c"
              strokeWidth={1}
            />
            <text
              x={110}
              y={layer.y + 20}
              fill="#8a949b"
              fontSize={12}
              fontWeight="bold"
              style={{ letterSpacing: 1 }}
            >
              {layer.name}
            </text>
          </g>
        ))}

        {/* Depth Axis */}
        {depthMarkers.map((m, i) => (
          <g key={m}>
            <line x1={80} y1={120 + i * 55} x2={95} y2={120 + i * 55} stroke="#e9f2f6" strokeWidth={1} />
            <text x={45} y={125 + i * 55} fill="#e9f2f6" fontSize={12}>{m}.0m</text>
          </g>
        ))}

        {/* Excavated Hole / Casing Area */}
        <rect
          x={centerX - casingWidth / 2}
          y={120}
          width={casingWidth}
          height={300}
          fill="#0a0e12"
        />

        {/* Auger Representation */}
        <g transform={`translate(${centerX - 35}, ${augerY})`}>
          {[0, 1, 2, 3, 4].map((i) => (
            <path
              key={i}
              d={`M 0 ${i * 30} L 70 ${i * 30 + 15} L 0 ${i * 30 + 30} Z`}
              fill="url(#augerGrad)"
              stroke="#e9f2f6"
              strokeWidth={0.5}
              opacity={1 - augerLift * 0.5}
            />
          ))}
          <rect x={32} y={-100} width={6} height={250} fill="#8a949b" />
        </g>

        {/* Lateral Confinement Arrows (Collapsing) */}
        {lateralDepths.map((d) => (
          <g key={d}>
            {/* Left side */}
            <line
              x1={centerX - 180}
              y1={d}
              x2={centerX - 50 - (1 - confinement) * 40}
              y2={d}
              stroke="#d0523f"
              strokeWidth={2}
              markerEnd="url(#arrowhead-danger)"
              opacity={confinement}
            />
            {/* Right side */}
            <line
              x1={centerX + 180}
              y1={d}
              x2={centerX + 50 + (1 - confinement) * 40}
              y2={d}
              stroke="#d0523f"
              strokeWidth={2}
              markerEnd="url(#arrowhead-danger)"
              opacity={confinement}
            />
            <text x={centerX - 190} y={d + 4} fill="#d0523f" fontSize={10} textAnchor="end">σ_h</text>
          </g>
        ))}

        {/* Settlement Arrows (Signal Orange) */}
        {surfacePoints.map((sx) => (
          <g key={sx}>
            <line
              x1={sx}
              y1={110}
              x2={sx}
              y2={110 + settlement}
              stroke="#e0b44c"
              strokeWidth={3}
              markerEnd="url(#arrowhead-amber)"
              opacity={settlement / 25}
            />
          </g>
        ))}

        {/* Steel Casing Lines */}
        <line x1={centerX - casingWidth / 2} y1={120} x2={centerX - casingWidth / 2} y2={420} stroke="#e9f2f6" strokeWidth={2} strokeDasharray="5 5" />
        <line x1={centerX + casingWidth / 2} y1={120} x2={centerX + casingWidth / 2} y2={420} stroke="#e9f2f6" strokeWidth={2} strokeDasharray="5 5" />

        {/* Labels for forces */}
        <text x={centerX} y={460} fill="#e9f2f6" fontSize={14} textAnchor="middle" opacity={augerLift}>
          EXTRACCIÓN DE SUELO Y PÉRDIDA DE PRESIÓN DE POROS
        </text>
        
        <text x={centerX + 150} y={100} fill="#e0b44c" fontSize={12} textAnchor="start" opacity={settlement / 25}>
          ASENTAMIENTO LOCALIZADO
        </text>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: 60,
            width: '100%',
            textAlign: 'center',
            fontFamily: 'sans-serif',
            fontSize: 32,
            fontWeight: 300,
            color: '#e9f2f6',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};