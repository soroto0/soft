import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const UnmonitoredZoneSectionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const opacity = p.enter * p.exit;

  const draw = interpolate(frame, [0, span * 0.2], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pressure = interpolate(frame, [span * 0.2, span * 0.8], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const alert = interpolate(frame, [span * 0.6, span * 0.9], [0, 1], {
    easing: Easing.elastic(1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const rockLayers = [
    { id: 'l1', y: 320, h: 40, fill: '#70808a', name: 'RHYOLITH (VERWITTERT)' },
    { id: 'l2', y: 360, h: 60, fill: '#5d6a73', name: 'RHYOLITH (KLÜFTIG)' },
    { id: 'l3', y: 420, h: 80, fill: '#4a555c', name: 'BASISGESTEIN' },
  ];

  const pressureTicks = [0, 1, 2, 3, 4];

  return (
    <AbsoluteFill style={{ width, height, opacity, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="80%" height="70%" viewBox="0 0 800 500" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="pressureGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5b7f9c" stopOpacity={0.2} />
            <stop offset="50%" stopColor="#e0b44c" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#d0523f" stopOpacity={0.8} />
          </linearGradient>
          <pattern id="hatch" patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="4" stroke="#e9f2f6" strokeWidth="0.5" opacity="0.3" />
          </pattern>
        </defs>

        {/* Rock Layers */}
        {rockLayers.map((layer, i) => (
          <g key={layer.id} opacity={draw}>
            <rect x="100" y={layer.y} width="600" height={layer.h} fill={layer.fill} stroke="#e9f2f6" strokeWidth="0.5" />
            <rect x="100" y={layer.y} width="600" height={layer.h} fill="url(#hatch)" />
            <line x1="700" y1={layer.y + layer.h / 2} x2="720" y2={layer.y + layer.h / 2} stroke="#e9f2f6" strokeWidth="1" />
            <text x="725" y={layer.y + layer.h / 2 + 4} fill="#e9f2f6" fontSize="10" fontFamily="monospace">{layer.name}</text>
          </g>
        ))}

        {/* Dam Structure */}
        <path
          d="M 250,320 L 320,100 L 480,100 L 550,320 Z"
          fill="#8a949b"
          stroke="#e9f2f6"
          strokeWidth="2"
          opacity={draw}
        />
        <text x="400" y="220" fill="#e9f2f6" fontSize="14" textAnchor="middle" opacity={draw} fontWeight="bold">BETONKERN</text>

        {/* Hydrostatic Pressure Visualization */}
        <g opacity={pressure}>
          <rect x="150" y={320 - 220 * pressure} width="100" height={220 * pressure} fill="url(#pressureGrad)" />
          <text x="140" y="320" fill="#d0523f" fontSize="10" textAnchor="end">12 bar</text>
          <text x="140" y={320 - 220 * pressure} fill="#5b7f9c" fontSize="10" textAnchor="end">0 bar</text>
          
          {pressureTicks.map((t) => (
            <line 
              key={t} 
              x1="250" 
              y1={320 - (t * 55 * pressure)} 
              x2={250 + (t * 15 * pressure)} 
              y2={320 - (t * 55 * pressure)} 
              stroke="#d0523f" 
              strokeWidth="2" 
              markerEnd="url(#arrowhead)"
            />
          ))}
        </g>

        {/* Unmonitored Zone Callout */}
        <g opacity={alert}>
          <circle cx="400" cy="380" r={40 * alert} fill="none" stroke="#e0b44c" strokeWidth="2" strokeDasharray="4 2" />
          <text x="400" y="395" fill="#e0b44c" fontSize="48" textAnchor="middle" fontWeight="bold">?</text>
          
          <line x1="400" y1="420" x2="400" y2="470" stroke="#e0b44c" strokeWidth="1.5" />
          <rect x="320" y="470" width="160" height="25" fill="#d0523f" />
          <text x="400" y="487" fill="#e9f2f6" fontSize="12" textAnchor="middle" fontWeight="bold">KEINE SENSORIK</text>
        </g>

        {/* Pressure Scale Axis */}
        <g opacity={draw}>
          <line x1="145" y1="100" x2="145" y2="320" stroke="#e9f2f6" strokeWidth="1" />
          {pressureTicks.map((t) => (
            <line key={`tick-${t}`} x1="140" y1={320 - t * 55} x2="145" y2={320 - t * 55} stroke="#e9f2f6" strokeWidth="1" />
          ))}
        </g>
      </svg>

      {p.title ? (
        <div style={{
          position: 'absolute',
          bottom: '10%',
          fontFamily: 'Helvetica, Arial, sans-serif',
          fontSize: 42,
          fontWeight: 'bold',
          color: '#e9f2f6',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          opacity: interpolate(frame, [span * 0.1, span * 0.3], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};