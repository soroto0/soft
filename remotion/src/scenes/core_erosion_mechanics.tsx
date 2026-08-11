import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const CoreErosionMechanicsScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const pressureProgress = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const particleProgress = interpolate(frame, [span * 0.1, span * 0.95], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const erosionWidth = interpolate(frame, [span * 0.25, span * 0.9], [2, 16], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleY = interpolate(frame, [0, span * 0.25], [18, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const damLayers = [
    { name: 'UPSTREAM SHELL', color: '#2a3b47', points: '160,410 300,160 370,160 370,410' },
    { name: 'IMPERVIOUS CORE (GREY)', color: '#586670', points: '370,160 430,160 470,410 370,410' },
    { name: 'DOWNSTREAM SHELL', color: '#1f2b35', points: '430,160 490,160 660,410 470,410' },
  ];

  const pressureArrows = [
    { y: 220, len: 45, label: '30 PSI' },
    { y: 280, len: 75, label: '65 PSI' },
    { y: 340, len: 105, label: '100 PSI' },
    { y: 390, len: 135, label: '132 PSI' },
  ];

  const particles = Array.from({ length: 18 }).map((_, i) => ({
    id: i,
    offset: i / 18,
    yDev: ((i % 5) - 2) * 2.5,
  }));

  const depthTicks = [0, 100, 200, 305];

  return (
    <AbsoluteFill
      style={{
        opacity,
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      <svg width="84%" height="72%" viewBox="0 0 900 500">
        <defs>
          <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2b6b9c" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#1a3d5c" stopOpacity="0.95" />
          </linearGradient>

          <linearGradient id="turbidWater" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#d0523f" stopOpacity="0.1" />
            <stop offset="40%" stopColor="#e0b44c" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#9c602b" stopOpacity="0.9" />
          </linearGradient>

          <pattern id="hatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="8" stroke="#e9f2f6" strokeWidth="0.8" opacity="0.15" />
          </pattern>
        </defs>

        {/* Foundation Bedrock */}
        <rect x="80" y="410" width="740" height="35" fill="#141c24" stroke="#3d4d59" strokeWidth="1" />
        <rect x="80" y="410" width="740" height="35" fill="url(#hatch)" />
        <text x="95" y="432" fill="#7a8b9e" fontSize="10" letterSpacing="1">
          BEDROCK FOUNDATION
        </text>

        {/* Reservoir Water */}
        <polygon points="80,410 80,180 306,180 180,410" fill="url(#waterGrad)" />
        <line x1="80" y1="180" x2="306" y2="180" stroke="#5b9bd5" strokeWidth="1.5" strokeDasharray="4 2" />
        <text x="92" y="172" fill="#5b9bd5" fontSize="11" fontWeight="600" letterSpacing="0.5">
          80 BILLION GAL RESERVOIR
        </text>

        {/* Dam Structural Layers */}
        {damLayers.map((layer) => (
          <g key={layer.name}>
            <polygon points={layer.points} fill={layer.color} stroke="#e9f2f6" strokeWidth="0.75" />
          </g>
        ))}

        {/* Internal Erosion Seepage Channel / Pipe */}
        <path
          d="M 310,380 Q 370,375 400,378 T 470,382 L 620,395"
          fill="none"
          stroke="#1a110b"
          strokeWidth={erosionWidth + 4}
          strokeLinecap="round"
        />
        <path
          d="M 310,380 Q 370,375 400,378 T 470,382 L 620,395"
          fill="none"
          stroke="url(#turbidWater)"
          strokeWidth={erosionWidth}
          strokeLinecap="round"
        />

        {/* Sediment Particles Moving Through Core */}
        {particles.map((pt) => {
          const progress = (pt.offset + particleProgress * 1.8) % 1;
          const px = 310 + progress * 310;
          const py = 380 + Math.sin(progress * Math.PI * 2) * 4 + pt.yDev;
          const pOpacity = progress < 0.1 ? progress * 10 : progress > 0.85 ? (1 - progress) * 6.6 : 1;

          return (
            <circle
              key={pt.id}
              cx={px}
              cy={py}
              r={2 + (pt.id % 3) * 0.8}
              fill={pt.id % 2 === 0 ? '#e0b44c' : '#d0523f'}
              opacity={pOpacity * pressureProgress}
            />
          );
        })}

        {/* Outflow Muddy Plume at Downstream Toe */}
        <ellipse
          cx="625"
          cy="400"
          rx={20 + particleProgress * 35}
          ry={6 + particleProgress * 12}
          fill="#9c602b"
          opacity={0.45 * pressureProgress}
        />

        {/* Hydrostatic Pressure Vectors (Blue Arrows) */}
        {pressureArrows.map((arrow) => {
          const currentLen = arrow.len * pressureProgress;
          const startX = 240 - currentLen;
          const endX = 240;

          return (
            <g key={arrow.y}>
              <line
                x1={startX}
                y1={arrow.y}
                x2={endX}
                y2={arrow.y}
                stroke="#3a86ff"
                strokeWidth="2.5"
                opacity={pressureProgress}
              />
              <polygon
                points={`${endX},${arrow.y - 4} ${endX + 7},${arrow.y} ${endX},${arrow.y + 4}`}
                fill="#3a86ff"
                opacity={pressureProgress}
              />
              <text
                x={startX - 6}
                y={arrow.y + 3}
                fill="#8bb4f6"
                fontSize="9"
                textAnchor="end"
                opacity={pressureProgress}
              >
                {arrow.label}
              </text>
            </g>
          );
        })}

        {/* Structural Height Dimension Scale (305 FT) */}
        <g opacity={0.85}>
          <line x1="720" y1="160" x2="720" y2="410" stroke="#e9f2f6" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="712" y1="160" x2="728" y2="160" stroke="#e9f2f6" strokeWidth="1" />
          <line x1="712" y1="410" x2="728" y2="410" stroke="#e9f2f6" strokeWidth="1" />

          {depthTicks.map((d) => {
            const yPos = 410 - (d / 305) * 250;
            return (
              <g key={d}>
                <line x1="716" y1={yPos} x2="724" y2={yPos} stroke="#e9f2f6" strokeWidth="1" />
                <text x="734" y={yPos + 3} fill="#e9f2f6" fontSize="9">
                  {d} FT
                </text>
              </g>
            );
          })}
        </g>

        {/* Technical Annotations & Leader Lines */}
        {/* Core Callout */}
        <line x1="400" y1="140" x2="400" y2="200" stroke="#e9f2f6" strokeWidth="0.8" />
        <circle cx="400" cy="200" r="2.5" fill="#e9f2f6" />
        <text x="400" y="130" fill="#e9f2f6" fontSize="11" fontWeight="bold" textAnchor="middle">
          305-FT GREY CORE
        </text>

        {/* Piping Callout */}
        <path d="M 470,300 L 440,300 L 420,370" fill="none" stroke="#e0b44c" strokeWidth="0.9" />
        <circle cx="420" cy="370" r="2.5" fill="#e0b44c" />
        <rect x="474" y="288" width="160" height="24" fill="#141c24" stroke="#e0b44c" strokeWidth="0.8" rx="2" />
        <text x="482" y="304" fill="#e0b44c" fontSize="10" fontWeight="600" letterSpacing="0.5">
          SOIL TRANSPORT CHANNEL
        </text>

        {/* Discharge Callout */}
        <path d="M 620,395 L 650,350 L 670,350" fill="none" stroke="#d0523f" strokeWidth="0.9" />
        <circle cx="620" cy="395" r="2.5" fill="#d0523f" />
        <text x="676" y="353" fill="#d0523f" fontSize="10" fontWeight="600">
          BROWN EROSION OUTFLOW
        </text>

        {/* Diagram Scale / Legend */}
        <g transform="translate(80, 465)">
          <rect x="0" y="0" width="12" height="12" fill="#3a86ff" />
          <text x="18" y="10" fill="#e9f2f6" fontSize="9">
            HYDROSTATIC FORCE
          </text>

          <rect x="160" y="0" width="12" height="12" fill="#586670" />
          <text x="178" y="10" fill="#e9f2f6" fontSize="9">
            STRUCTURAL CORE
          </text>

          <rect x="310" y="0" width="12" height="12" fill="#e0b44c" />
          <text x="328" y="10" fill="#e9f2f6" fontSize="9">
            ERODED SEDIMENT
          </text>
        </g>
      </svg>

      {/* Caption Plate */}
      <div
        style={{
          marginTop: 12,
          transform: `translateY(${titleY}px)`,
          fontFamily: "'Segoe UI', Arial, sans-serif",
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: 2,
          color: '#e9f2f6',
          backgroundColor: 'rgba(20, 28, 36, 0.85)',
          padding: '8px 24px',
          borderRadius: 4,
          border: '1px solid rgba(233, 242, 246, 0.2)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        }}
      >
        {p.title || 'INTERNAL SEDIMENT TRANSPORT'}
      </div>
    </AbsoluteFill>
  );
};