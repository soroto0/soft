import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ActualSurfaceConditionScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const { width, height, fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const reveal = interpolate(frame, [0, span * 0.15], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shift = interpolate(frame, [span * 0.3, span * 0.9], [0, 30], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const highlight = interpolate(frame, [span * 0.4, span * 0.7], [0, 1], {
    easing: Easing.bezier(0.33, 1, 0.68, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const captionRise = interpolate(frame, [0, span * 0.2], [20, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const aggregates = [
    { x: 80, y: 160, r: 5 },
    { x: 120, y: 185, r: 8 },
    { x: 200, y: 155, r: 4 },
    { x: 280, y: 175, r: 6 },
    { x: 150, y: 60, r: 7 },
    { x: 220, y: 85, r: 5 },
    { x: 100, y: 45, r: 4 },
    { x: 300, y: 55, r: 6 },
  ];

  const scaleTicks = [0, 1, 2, 3, 4];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ width: width * 0.8, height: height * 0.7, position: 'relative' }}>
        <svg width="100%" height="100%" viewBox="0 0 400 240" style={{ overflow: 'visible' }}>
          <defs>
            <clipPath id="clip-top">
              <rect x="50" y="20" width="300" height="100" />
            </clipPath>
            <pattern id="concrete-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="0.5" fill="#e9f2f6" opacity="0.3" />
              <circle cx="12" cy="15" r="0.5" fill="#e9f2f6" opacity="0.3" />
            </pattern>
          </defs>

          {/* Precast Element (Bottom Layer) */}
          <g opacity={reveal}>
            <rect x="50" y="120" width="300" height="100" fill="#5d6a73" stroke="#e9f2f6" strokeWidth="1" />
            <rect x="50" y="120" width="300" height="100" fill="url(#concrete-pattern)" />
            {aggregates.filter(a => a.y > 120).map((a, i) => (
              <circle key={`bot-${i}`} cx={a.x} cy={a.y} r={a.r} fill="#8a949b" stroke="#e9f2f6" strokeWidth="0.5" />
            ))}
            <text x="55" y="210" fill="#e9f2f6" fontSize="8" fontWeight="bold">FERTIGTEIL (BESTAND)</text>
          </g>

          {/* Cast-in-place Concrete (Top Layer) */}
          <g opacity={reveal} transform={`translate(${shift}, 0)`}>
            <rect x="50" y="20" width="300" height="100" fill="#8a949b" stroke="#e9f2f6" strokeWidth="1" />
            <rect x="50" y="20" width="300" height="100" fill="url(#concrete-pattern)" />
            {aggregates.filter(a => a.y < 120).map((a, i) => (
              <circle key={`top-${i}`} cx={a.x} cy={a.y} r={a.r} fill="#c9d3d9" stroke="#e9f2f6" strokeWidth="0.5" />
            ))}
            <text x="55" y="35" fill="#e9f2f6" fontSize="8" fontWeight="bold">ORTBETON (NEU)</text>
          </g>

          {/* The Smooth Interface */}
          <line 
            x1="50" y1="120" x2="350" y2="120" 
            stroke="#e0b44c" 
            strokeWidth={2 * highlight + 0.5} 
            opacity={reveal}
          />

          {/* Labels and Leader Lines */}
          <g opacity={highlight}>
            <line x1="200" y1="120" x2="230" y2="145" stroke="#e0b44c" strokeWidth="1" />
            <text x="235" y="150" fill="#e0b44c" fontSize="9" fontWeight="bold">GLATTE ZEMENTHAUT</text>
            
            <line x1="150" y1="120" x2="120" y2="95" stroke="#d0523f" strokeWidth="1" />
            <text x="115" y="90" fill="#d0523f" fontSize="9" textAnchor="end" fontWeight="bold">KEINE VERZAHNUNG</text>
          </g>

          {/* Scale Axis */}
          <g opacity={reveal * 0.7}>
            <line x1="50" y1="230" x2="150" y2="230" stroke="#e9f2f6" strokeWidth="1" />
            {scaleTicks.map(t => (
              <line key={t} x1={50 + t * 25} y1={227} x2={50 + t * 25} y2={233} stroke="#e9f2f6" strokeWidth="1" />
            ))}
            <text x="50" y="242" fill="#e9f2f6" fontSize="7">0 mm</text>
            <text x="150" y="242" fill="#e9f2f6" fontSize="7" textAnchor="end">100 mm</text>
          </g>
        </svg>

        {p.title && (
          <div style={{
            position: 'absolute',
            bottom: -40,
            width: '100%',
            textAlign: 'center',
            color: '#e9f2f6',
            fontFamily: 'sans-serif',
            fontSize: 28,
            letterSpacing: '0.05em',
            opacity: reveal,
            transform: `translateY(${captionRise}px)`
          }}>
            {p.title}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};