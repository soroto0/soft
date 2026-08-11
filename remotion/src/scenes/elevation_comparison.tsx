import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ElevationComparisonScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const mountain = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const columns = interpolate(frame, [span * 0.3, span * 0.7], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labels = interpolate(frame, [span * 0.6, span * 0.9], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  // Scale: 0m = 420y, 2000m = 60y (360px range)
  const seaLevelY = 420;
  const baseAlt = 400;
  const peakAlt = 1465;
  const baseY = seaLevelY - (baseAlt * 360) / 2000;
  const targetPeakY = seaLevelY - (peakAlt * 360) / 2000;
  const currentPeakY = interpolate(mountain, [0, 1], [baseY, targetPeakY]);

  const groundLayers = [
    { name: 'BASALTO', fill: '#5d6a73', offset: 60 },
    { name: 'GRANITO', fill: '#8a949b', offset: 30 },
    { name: 'SUELO', fill: '#c9d3d9', offset: 0 },
  ];

  const ticks = [0, 500, 1000, 1500, 2000];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width={width * 0.8} height={height * 0.8} viewBox="0 0 800 500">
        <defs>
          <linearGradient id="airGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#e9f2f6" stopOpacity={0.4} />
            <stop offset="0.5" stopColor="#e9f2f6" stopOpacity={0.15} />
            <stop offset="1" stopColor="#e9f2f6" stopOpacity={0} />
          </linearGradient>
          <clipPath id="mountainClip">
            <path d={`M 0 500 L 0 ${baseY} L 200 ${baseY} C 350 ${baseY} 450 ${currentPeakY} 650 ${currentPeakY} L 800 ${currentPeakY} L 800 500 Z`} />
          </clipPath>
        </defs>

        {/* Ground Layers */}
        <g clipPath="url(#mountainClip)">
          {groundLayers.map((layer, i) => (
            <rect
              key={layer.name}
              x={0}
              y={currentPeakY + layer.offset}
              width={800}
              height={500}
              fill={layer.fill}
              stroke="#e9f2f6"
              strokeWidth={0.5}
            />
          ))}
        </g>

        {/* Layer Labels */}
        {groundLayers.map((layer, i) => (
          <text
            key={`lbl-${layer.name}`}
            x={780}
            y={currentPeakY + layer.offset + 20}
            fill="#e9f2f6"
            fontSize={10}
            textAnchor="end"
            opacity={mountain * 0.6}
          >
            {layer.name}
          </text>
        ))}

        {/* Altitude Axis */}
        <line x1={80} y1={seaLevelY} x2={80} y2={60} stroke="#e9f2f6" strokeWidth={1} />
        {ticks.map((t) => (
          <g key={t} opacity={0.5}>
            <line x1={75} y1={seaLevelY - (t * 360) / 2000} x2={85} y2={seaLevelY - (t * 360) / 2000} stroke="#e9f2f6" strokeWidth={1} />
            <text x={70} y={seaLevelY - (t * 360) / 2000 + 4} fill="#e9f2f6" fontSize={10} textAnchor="end">{t}m</text>
          </g>
        ))}

        {/* Air Columns (Comparison) */}
        <rect
          x={190}
          y={60}
          width={20}
          height={(baseY - 60) * columns}
          fill="url(#airGrad)"
          stroke="#e0b44c"
          strokeWidth={1}
          opacity={columns}
        />
        <rect
          x={640}
          y={60}
          width={20}
          height={(currentPeakY - 60) * columns}
          fill="url(#airGrad)"
          stroke="#d0523f"
          strokeWidth={1}
          opacity={columns}
        />

        {/* Barometer Tubes */}
        <rect x={198} y={baseY - 30} width={4} height={30} fill="#e9f2f6" opacity={mountain} />
        <rect x={648} y={currentPeakY - 30} width={4} height={30} fill="#e9f2f6" opacity={mountain} />

        {/* Measurement Labels */}
        <g opacity={labels}>
          <text x={200} y={baseY + 25} fill="#e0b44c" fontSize={14} textAnchor="middle" fontWeight="bold">BASE: 400 m</text>
          <text x={650} y={currentPeakY - 40} fill="#d0523f" fontSize={14} textAnchor="middle" fontWeight="bold">PICO: 1465 m</text>
          
          <path d={`M 220 60 L 240 60 L 240 ${baseY} L 220 ${baseY}`} fill="none" stroke="#e9f2f6" strokeWidth={1} />
          <text x={250} y={(baseY + 60) / 2} fill="#e9f2f6" fontSize={12} transform={`rotate(-90, 250, ${(baseY + 60) / 2})`} textAnchor="middle">COLUMNA BASE</text>

          <path d={`M 670 60 L 690 60 L 690 ${currentPeakY} L 670 ${currentPeakY}`} fill="none" stroke="#e9f2f6" strokeWidth={1} />
          <text x={700} y={(currentPeakY + 60) / 2} fill="#e9f2f6" fontSize={12} transform={`rotate(-90, 700, ${(currentPeakY + 60) / 2})`} textAnchor="middle">COLUMNA PICO</text>
        </g>

        {/* Difference Indicator */}
        <line x1={210} y1={baseY} x2={640} y2={baseY} stroke="#e9f2f6" strokeWidth={1} strokeDasharray="4 4" opacity={labels * 0.5} />
        <line x1={640} y1={baseY} x2={640} y2={currentPeakY} stroke="#e0b44c" strokeWidth={2} opacity={labels} />
        <text x={630} y={(baseY + currentPeakY) / 2} fill="#e0b44c" fontSize={12} textAnchor="end" opacity={labels}>Δ 1065 m</text>
      </svg>

      {p.title ? (
        <div style={{
          position: 'absolute',
          bottom: height * 0.1,
          fontFamily: 'monospace',
          fontSize: 28,
          color: '#e9f2f6',
          letterSpacing: '2px',
          opacity: labels,
          borderTop: '1px solid #e9f2f6',
          paddingTop: '10px'
        }}>
          {p.title.toUpperCase()}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};