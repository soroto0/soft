import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const MaterialVolumeAnomalyScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, fps * (p.dur || 1));

  const opacity = p.enter * p.exit;

  const sollH = interpolate(frame, [0, span * 0.9], [0, 250], {
    easing: Easing.bezier(0.33, 1, 0.68, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const istH = interpolate(frame, [0, span * 0.4, span * 0.9], [0, 100, 105], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const leak = interpolate(frame, [span * 0.35, span * 0.9], [0, 1], {
    easing: Easing.inOut(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleY = interpolate(frame, [0, fps * 0.8], [30, 0], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const soilLayers = [
    { y: 70, h: 80, fill: '#3a444a', name: 'AUFFÜLLUNG' },
    { y: 150, h: 90, fill: '#2a3035', name: 'TON / SCHLICK' },
    { y: 240, h: 80, fill: '#1a1e22', name: 'KIESFÜHREND' },
  ];

  const ticks = [0, 5, 10, 15, 20];

  return (
    <AbsoluteFill
      style={{
        opacity,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        width,
        height,
      }}
    >
      <svg width="80%" viewBox="0 0 800 450" style={{ overflow: 'visible' }}>
        <defs>
          <pattern
            id="hatch-anomaly"
            width="10"
            height="10"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line x1="0" y1="0" x2="0" y2="10" stroke="#e0b44c" strokeWidth={2} />
          </pattern>
        </defs>

        {/* Soil Background */}
        {soilLayers.map((layer) => (
          <rect
            key={layer.name}
            x={50}
            y={layer.y}
            width={700}
            height={layer.h}
            fill={layer.fill}
            stroke="#111"
            strokeWidth={1}
          />
        ))}

        {/* Anomaly Area */}
        <path
          d="M 530 240 Q 650 240 680 280 Q 650 320 530 320 Z"
          fill="url(#hatch-anomaly)"
          fillOpacity={0.3}
          stroke="#e0b44c"
          strokeWidth={2}
          strokeDasharray="5 3"
        />
        <text x={600} y={230} fill="#e0b44c" fontSize={12} fontWeight="bold">
          KIES-ANOMALIE (VERLUSTZONE)
        </text>

        {/* Left Slot: SOLL */}
        <g transform="translate(150, 0)">
          <rect x={-30} y={70} width={60} height={250} fill="none" stroke="#e9f2f6" strokeWidth={2} />
          <rect x={-28} y={320 - sollH} width={56} height={sollH} fill="#8a949b" />
          <text x={0} y={60} fill="#e9f2f6" fontSize={14} textAnchor="middle" fontWeight="bold">
            SOLL (THEORETISCH)
          </text>
          <text x={0} y={340} fill="#8a949b" fontSize={12} textAnchor="middle">
            V = {(sollH * 0.4).toFixed(1)} m³
          </text>
        </g>

        {/* Right Slot: IST */}
        <g transform="translate(450, 0)">
          <rect x={-30} y={70} width={60} height={250} fill="none" stroke="#e9f2f6" strokeWidth={2} />
          <rect x={-28} y={320 - istH} width={56} height={istH} fill="#8a949b" />
          
          {/* Leakage Flow */}
          <path
            d={`M 28 ${320 - 80} L ${28 + 80 * leak} ${320 - 80 + 10 * leak} L ${28 + 80 * leak} ${320 - 60 + 10 * leak} L 28 ${320 - 60} Z`}
            fill="#8a949b"
            opacity={leak}
          />
          
          <text x={0} y={60} fill="#d0523f" fontSize={14} textAnchor="middle" fontWeight="bold">
            IST (REALER PEGEL)
          </text>
          <text x={0} y={340} fill="#d0523f" fontSize={12} textAnchor="middle">
            PEGELSTILLSTAND BEI -16.5m
          </text>
        </g>

        {/* Depth Ticks */}
        {ticks.map((t, i) => (
          <g key={t} transform={`translate(50, ${70 + i * 62.5})`}>
            <line x1={0} y1={0} x2={10} y2={0} stroke="#e9f2f6" strokeWidth={1} />
            <text x={-10} y={5} fill="#e9f2f6" fontSize={10} textAnchor="end">
              -{t}m
            </text>
          </g>
        ))}

        {/* Labels for Soil */}
        {soilLayers.map((layer) => (
          <text
            key={`label-${layer.name}`}
            x={740}
            y={layer.y + layer.h / 2}
            fill="#e9f2f6"
            fontSize={9}
            opacity={0.5}
            textAnchor="start"
          >
            {layer.name}
          </text>
        ))}

        <text x={400} y={20} fill="#e9f2f6" fontSize={18} textAnchor="middle" letterSpacing={2}>
          LAMELLE 11 — QUERSCHNITT
        </text>
      </svg>

      {p.title ? (
        <div
          style={{
            marginTop: 40,
            transform: `translateY(${titleY}px)`,
            fontFamily: 'monospace',
            fontSize: 38,
            color: '#e9f2f6',
            borderTop: '2px solid #d0523f',
            paddingTop: 10,
            backgroundColor: 'rgba(0,0,0,0.2)',
            padding: '10px 20px',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};