import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const HydraulicErosionSequenceScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const opacity = p.enter * p.exit;

  // 1. Erosion progress: how much the cavity has grown
  const erosion = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.bezier(0.4, 0, 0.2, 1),
    extrapolateRight: 'clamp',
  });

  // 2. Flow animation: looping dash offset
  const flowOffset = interpolate(frame % 20, [0, 20], [40, 0]);

  // 3. Title appearance
  const titleOpacity = interpolate(frame, [0, 25], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const soilLayers = [
    { y: 220, color: '#3d4a54', label: 'AUFFÜLLUNG' },
    { y: 280, color: '#2e3941', label: 'KIES/SAND' },
    { y: 360, color: '#1f272d', label: 'TONSCHICHT' },
  ];

  const particles = [0, 1, 2, 3, 4, 5, 6, 7];

  // Cavity path: grows from the wall defect (right) towards the left
  const cavityWidth = 350 * erosion;
  const cavityPath = `
    M 650 160 
    C ${650 - cavityWidth * 0.5} 160, ${650 - cavityWidth} 180, ${650 - cavityWidth} 220
    C ${650 - cavityWidth} 260, ${650 - cavityWidth * 0.5} 280, 650 280
    Z
  `;

  return (
    <AbsoluteFill style={{ opacity }}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 800 450"
        style={{ fill: 'none', fontFamily: "'Segoe UI', Roboto, sans-serif" }}
      >
        <defs>
          <linearGradient id="soilGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2a353d" />
            <stop offset="1" stopColor="#1a2126" />
          </linearGradient>
          <clipPath id="soilClip">
            <rect x="100" y="120" width="550" height="300" />
          </clipPath>
        </defs>

        {/* Soil Background */}
        <rect x="100" y="120" width="550" height="300" fill="url(#soilGrad)" />
        
        {/* Soil Layers */}
        {soilLayers.map((layer, i) => (
          <g key={layer.y} opacity={0.4}>
            <line x1="100" y1={layer.y} x2="650" y2={layer.y} stroke="#e9f2f6" strokeWidth="0.5" strokeDasharray="4 4" />
            <text x="110" y={layer.y - 5} fill="#e9f2f6" fontSize="8" opacity={0.6}>{layer.label}</text>
          </g>
        ))}

        {/* The Growing Cavity */}
        <path d={cavityPath} fill="#000000" opacity={0.6} />
        <path d={cavityPath} stroke="#d0523f" strokeWidth="1.5" strokeDasharray="5 3" opacity={erosion} />

        {/* Floor Slab (Bodenplatte) */}
        <rect x="100" y="100" width="550" height="25" fill="#5d6a73" stroke="#e9f2f6" strokeWidth="1" />
        <text x="120" y="117" fill="#e9f2f6" fontSize="10" fontWeight="bold">BODENPLATTE (ARCHIV)</text>

        {/* Retaining Wall with Defect */}
        <rect x="650" y="50" width="20" height="110" fill="#e0b44c" />
        <rect x="650" y="280" width="20" height="120" fill="#e0b44c" />
        
        {/* Defect Highlight (Fehlstelle) */}
        <rect x="645" y="160" width="30" height="120" fill="#d0523f" opacity={0.2} />
        <line x1="650" y1="160" x2="650" y2="280" stroke="#d0523f" strokeWidth="3" />
        <text x="680" y="225" fill="#e0b44c" fontSize="10" transform="rotate(90, 680, 225)">WANDDEFEKT</text>

        {/* Flow Lines (Hydraulischer Meißel) */}
        {[180, 200, 220, 240, 260].map((y, i) => {
          const xTarget = 650 - (cavityWidth * 0.9);
          return (
            <path
              key={y}
              d={`M 750 ${y} L 650 ${y} Q ${xTarget} ${y}, ${xTarget} ${y + 20}`}
              stroke="#e9f2f6"
              strokeWidth="1.5"
              strokeDasharray="10 10"
              strokeDashoffset={flowOffset}
              opacity={0.8}
            />
          );
        })}

        {/* Moving Particles */}
        {particles.map((pIdx) => {
          const pProgress = interpolate((frame + pIdx * 12) % 60, [0, 60], [0, 1]);
          const px = 650 - (pProgress * (cavityWidth + 100));
          const py = 220 + Math.sin(pIdx + frame * 0.1) * 30;
          return (
            <circle
              key={pIdx}
              cx={px}
              cy={py}
              r="2"
              fill="#e0b44c"
              opacity={px < 650 && px > 100 ? 1 : 0}
            />
          );
        })}

        {/* Labels for Mechanism */}
        <g opacity={erosion}>
          <line x1={650 - cavityWidth} y1="220" x2={650 - cavityWidth - 40} y2="220" stroke="#e9f2f6" strokeWidth="1" />
          <text x={650 - cavityWidth - 45} y="224" fill="#e9f2f6" fontSize="10" textAnchor="end">EROSIONSFRONT</text>
          
          <path d="M 720 200 L 680 200" stroke="#e9f2f6" strokeWidth="2" markerEnd="url(#arrow)" />
          <text x="730" y="204" fill="#e9f2f6" fontSize="10">WASSERDRUCK</text>
        </g>

        {/* Arrow Marker Definition */}
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#e9f2f6" />
          </marker>
        </defs>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            width: '100%',
            textAlign: 'center',
            color: '#e9f2f6',
            fontSize: 28,
            fontFamily: 'monospace',
            letterSpacing: '2px',
            opacity: titleOpacity,
            textShadow: '0 2px 4px rgba(0,0,0,0.5)',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};