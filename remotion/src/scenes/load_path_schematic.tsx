import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const LoadPathSchematicScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const opacity = p.enter * p.exit;

  const draw = interpolate(frame, [0, span * 0.15], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const load = interpolate(frame, [span * 0.1, span * 0.5], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const stress = interpolate(frame, [span * 0.4, span * 0.9], [0, 1], {
    easing: Easing.bezier(0.33, 1, 0.68, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const flowOffset = interpolate(frame, [0, span], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const forceLines = [-60, -30, 0, 30, 60];
  const resinTicks = [0, 1, 2, 3, 4, 5, 6];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 500 400" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="stressGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e9f2f6" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#e0b44c" stopOpacity={0.4 + stress * 0.6} />
            <stop offset="100%" stopColor="#d0523f" stopOpacity={stress} />
          </linearGradient>
          <mask id="boltMask">
            <rect x="210" y="100" width="80" height="220" fill="white" />
          </mask>
        </defs>

        {/* Concrete Slab (Top) */}
        <g opacity={draw}>
          <rect x="50" y="40" width="400" height="60" fill="#c9d3d9" stroke="#e9f2f6" strokeWidth="1" />
          <text x="60" y="30" fill="#e9f2f6" fontSize="10" fontWeight="bold">BETONPLATTE (2.5t)</text>
        </g>

        {/* Anchor Bolt */}
        <g opacity={draw}>
          <rect x="210" y="100" width="80" height="220" fill="#8a949b" stroke="#e9f2f6" strokeWidth="1" />
          <text x="300" y="150" fill="#e9f2f6" fontSize="10">STAHLBOLZEN Ø 32mm</text>
        </g>

        {/* Resin Layer (The Critical Interface) */}
        <g opacity={draw}>
          <rect x="205" y="100" width="5" height="220" fill="#e0b44c" opacity={0.3 + stress * 0.7} />
          <rect x="290" y="100" width="5" height="220" fill="#e0b44c" opacity={0.3 + stress * 0.7} />
          {resinTicks.map((t) => (
            <line key={t} x1="195" y1={110 + t * 30} x2="205" y2={110 + t * 30} stroke="#e9f2f6" strokeWidth="0.5" />
          ))}
          <text x="140" y="210" fill="#e0b44c" fontSize="9" textAnchor="end">KLEBESCHICHT (EPOXID)</text>
          <line x1="145" y1="207" x2="205" y2="207" stroke="#e0b44c" strokeWidth="0.5" strokeDasharray="2 2" />
        </g>

        {/* Load Path Visualization (Narrowing) */}
        <path
          d={`M 100 70 L 210 100 L 290 100 L 400 70 Z`}
          fill="url(#stressGradient)"
          opacity={load * 0.5}
        />
        
        {/* Concentrated Stress Path */}
        <path
          d={`M 210 100 Q 250 150 250 320 L 250 320 Q 250 150 290 100 Z`}
          fill="#d0523f"
          opacity={stress * 0.4}
        />

        {/* Moving Force Vectors */}
        <g opacity={load}>
          {forceLines.map((offset) => (
            <path
              key={offset}
              d={`M ${250 + offset * 2} 50 L ${250 + offset * 0.5} 100 L ${250 + offset * 0.2} 300`}
              fill="none"
              stroke={stress > 0.5 ? "#d0523f" : "#e0b44c"}
              strokeWidth="1.5"
              strokeDasharray="10 15"
              strokeDashoffset={-flowOffset}
              opacity={0.6}
            />
          ))}
        </g>

        {/* Stress Indicators at Resin */}
        <g opacity={stress}>
          <circle cx="207.5" cy="180" r={4 + stress * 6} fill="#d0523f" opacity={0.4} />
          <circle cx="292.5" cy="240" r={4 + stress * 6} fill="#d0523f" opacity={0.4} />
          <text x="250" y="350" fill="#d0523f" fontSize="11" textAnchor="middle" fontWeight="bold">
            {stress > 0.8 ? "BINDUNGSVERSAGEN" : "MAX. SCHERSPANNUNG"}
          </text>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            fontFamily: 'monospace',
            fontSize: 42,
            color: '#e9f2f6',
            letterSpacing: '4px',
            borderLeft: '4px solid #d0523f',
            paddingLeft: '20px',
            opacity: draw,
            transform: `translateX(${interpolate(draw, [0, 1], [-20, 0])}px)`,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};