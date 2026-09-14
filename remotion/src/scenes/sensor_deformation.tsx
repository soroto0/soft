import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const SensorDeformationScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const opacity = p.enter * p.exit;

  const stretch = interpolate(frame, [0, span * 0.4], [0, 40], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const snap = interpolate(frame, [span * 0.4, span * 0.45], [0, 1], {
    easing: Easing.out(Easing.exp),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const alarm = interpolate(frame, [span * 0.5, span * 0.7], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { name: 'PVC SHEATH', color: '#8a949b', thickness: 24 },
    { name: 'INSULATION', color: '#c9d3d9', thickness: 16 },
    { name: 'COPPER CORE', color: '#e0b44c', thickness: 8 },
  ];

  const graphTicks = [0, 1, 2, 3];

  return (
    <AbsoluteFill style={{ opacity, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={width * 0.8} height={height * 0.6} viewBox="0 0 800 400">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Structural Beam (Deflecting) */}
        <path
          d={`M 100 80 Q 400 ${80 + stretch * 0.5} 700 80`}
          fill="none"
          stroke="#5d6a73"
          strokeWidth="12"
        />
        <text x="100" y="65" fill="#5d6a73" fontSize="12" fontWeight="bold">CEILING STRUCTURE (STEEL)</text>
        
        {/* Force Arrows */}
        <g opacity={interpolate(frame, [0, span * 0.3], [0, 1], { extrapolateRight: 'clamp' })}>
          <path d={`M 400 ${95 + stretch * 0.5} L 400 ${130 + stretch * 0.5}`} stroke="#e0b44c" strokeWidth="2" markerEnd="url(#arrow)" />
          <text x="410" y={120 + stretch * 0.5} fill="#e0b44c" fontSize="10">MECHANICAL LOAD</text>
        </g>

        {/* Cable Cross-Section (Longitudinal) */}
        <g transform={`translate(0, ${60 + stretch * 0.5})`}>
          {layers.map((layer, i) => {
            const yPos = 150 - layer.thickness / 2;
            const isCore = layer.name === 'COPPER CORE';
            return (
              <g key={layer.name}>
                {/* Left side of cable */}
                <rect
                  x={150}
                  y={yPos}
                  width={250 - (isCore ? snap * 10 : 0)}
                  height={layer.thickness - (stretch * 0.1)}
                  fill={layer.color}
                />
                {/* Right side of cable */}
                <rect
                  x={400 + (isCore ? snap * 10 : 0)}
                  y={yPos}
                  width={250}
                  height={layer.thickness - (stretch * 0.1)}
                  fill={layer.color}
                />
                {/* Labels */}
                <line x1={150} y1={yPos + layer.thickness / 2} x2={120} y2={150 + (i - 1) * 40} stroke="#e9f2f6" strokeWidth="0.5" opacity={0.6} />
                <text x={115} y={154 + (i - 1) * 40} fill="#e9f2f6" fontSize="9" textAnchor="end">{layer.name}</text>
              </g>
            );
          })}
          
          {/* Snap Effect */}
          {snap > 0 && (
            <g opacity={snap}>
              <path d="M 395 140 L 405 160 M 390 150 L 410 150" stroke="#d0523f" strokeWidth="2" />
              <text x="400" y="130" fill="#d0523f" fontSize="10" textAnchor="middle" fontWeight="bold">FRACTURE</text>
            </g>
          )}
        </g>

        {/* Sensor Interpretation Box */}
        <g transform="translate(550, 250)" opacity={alarm}>
          <rect width="200" height="80" fill="none" stroke={alarm > 0.5 ? "#d0523f" : "#e0b44c"} strokeWidth="2" />
          <rect width="200" height="20" fill={alarm > 0.5 ? "#d0523f" : "#e0b44c"} />
          <text x="100" y="15" fill="#1a1a1a" fontSize="10" textAnchor="middle" fontWeight="bold">SYSTEM STATUS</text>
          <text x="100" y="45" fill={alarm > 0.5 ? "#d0523f" : "#e0b44c"} fontSize="12" textAnchor="middle" filter="url(#glow)">
            {alarm > 0.8 ? "ALARM: SHORT CIRCUIT" : "SIGNAL ANOMALY"}
          </text>
          <text x="100" y="65" fill="#e9f2f6" fontSize="9" textAnchor="middle" opacity={0.7}>MISINTERPRETED DATA</text>
        </g>

        {/* Graph: Strain vs Time */}
        <g transform="translate(150, 300)">
          <line x1="0" y1="0" x2="0" y2="60" stroke="#e9f2f6" strokeWidth="1" />
          <line x1="0" y1="60" x2="200" y2="60" stroke="#e9f2f6" strokeWidth="1" />
          <text x="-5" y="30" fill="#e9f2f6" fontSize="8" textAnchor="end" transform="rotate(-90, -5, 30)">STRAIN</text>
          
          {graphTicks.map((t) => (
            <g key={t}>
              <line x1={t * 60} y1="60" x2={t * 60} y2="65" stroke="#e9f2f6" strokeWidth="1" />
              <text x={t * 60} y="75" fill="#e9f2f6" fontSize="8" textAnchor="middle">T+{t}s</text>
            </g>
          ))}

          <path
            d={`M 0 60 L ${200 * (frame / span)} ${60 - (stretch * 1.2) - (snap * 20)}`}
            fill="none"
            stroke="#e0b44c"
            strokeWidth="2"
          />
        </g>

        <defs>
          <marker id="arrow" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#e0b44c" />
          </marker>
        </defs>
      </svg>

      {p.title && (
        <div style={{
          marginTop: 40,
          color: '#e9f2f6',
          fontSize: 32,
          fontFamily: 'monospace',
          letterSpacing: '2px',
          borderTop: '1px solid #e9f2f6',
          paddingTop: 10,
          opacity: interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
        }}>
          {p.title}
        </div>
      )}
    </AbsoluteFill>
  );
};