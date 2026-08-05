import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const MaterialMoistureSeepageScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const progress = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const moleculeFlow = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textEntrance = interpolate(frame, [0, 20], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;
  
  const woodPores = [
    "M 100,120 L 180,125 L 250,115 L 320,128 L 400,120 L 400,140 L 310,135 L 240,145 L 170,132 L 100,140 Z",
    "M 100,160 L 190,155 L 260,165 L 340,158 L 400,162 L 400,182 L 330,175 L 250,185 L 180,172 L 100,180 Z",
    "M 100,200 L 200,205 L 280,195 L 350,208 L 400,200 L 400,220 L 340,215 L 270,225 L 190,212 L 100,220 Z"
  ];

  const gypsumPores = [
    "M 100,300 Q 150,290 200,305 T 300,300 T 400,310 L 400,330 Q 350,340 300,325 T 200,330 T 100,320 Z",
    "M 100,350 Q 160,365 220,345 T 320,355 T 400,345 L 400,365 Q 340,375 280,355 T 180,365 T 100,355 Z"
  ];

  const ticks = [0, 1, 2, 3, 4];
  const moleculeCount = 12;

  return (
    <AbsoluteFill style={{ 
      opacity, 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center' 
    }}>
      <svg 
        width={width * 0.8} 
        height={height * 0.7} 
        viewBox="0 0 500 450"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="moistureGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#5b7f9c" />
            <stop offset="100%" stopColor="#5b7f9c" stopOpacity="0.2" />
          </linearGradient>
          <mask id="woodMask">
            {woodPores.map((d, i) => (
              <path key={`wm-${i}`} d={d} fill="white" />
            ))}
          </mask>
          <mask id="gypsumMask">
            {gypsumPores.map((d, i) => (
              <path key={`gm-${i}`} d={d} fill="white" />
            ))}
          </mask>
        </defs>

        {/* Wood Section */}
        <g opacity={textEntrance}>
          <text x="100" y="95" fill="#e9f2f6" fontSize="12" fontWeight="bold">POROUS WOOD SASH</text>
          {woodPores.map((d, i) => (
            <path key={`wb-${i}`} d={d} fill="#e9f2f6" fillOpacity="0.1" stroke="#e9f2f6" strokeWidth="0.5" />
          ))}
          <rect 
            x="100" y="110" 
            width={300 * progress} 
            height="120" 
            fill="url(#moistureGrad)" 
            mask="url(#woodMask)" 
          />
        </g>

        {/* Gypsum Section */}
        <g opacity={textEntrance}>
          <text x="100" y="280" fill="#e9f2f6" fontSize="12" fontWeight="bold">GYPSUM DRYWALL</text>
          {gypsumPores.map((d, i) => (
            <path key={`gb-${i}`} d={d} fill="#e9f2f6" fillOpacity="0.1" stroke="#e9f2f6" strokeWidth="0.5" />
          ))}
          <rect 
            x="100" y="290" 
            width={300 * progress} 
            height="100" 
            fill="url(#moistureGrad)" 
            mask="url(#gypsumMask)" 
          />
        </g>

        {/* Molecules */}
        {Array.from({ length: moleculeCount }).map((_, i) => {
          const yPos = 120 + (i * 25);
          const xOffset = (i * 40) % 100;
          const x = 100 + xOffset + (moleculeFlow * 200);
          return (
            <circle 
              key={i} 
              cx={x} 
              cy={yPos} 
              r="2" 
              fill="#5b7f9c" 
              opacity={x > 100 + 300 * progress ? 0 : 0.8} 
            />
          );
        })}

        {/* Axis */}
        <line x1="100" y1="420" x2="400" y2="420" stroke="#e9f2f6" strokeWidth="1" />
        {ticks.map((t) => (
          <g key={t} transform={`translate(${100 + t * 75}, 420)`}>
            <line y2="5" stroke="#e9f2f6" strokeWidth="1" />
            <text y="20" fill="#e9f2f6" fontSize="10" textAnchor="middle">
              {t * 2.5}mm
            </text>
          </g>
        ))}
        <text x="250" y="450" fill="#e0b44c" fontSize="10" textAnchor="middle" opacity={textEntrance}>
          PENETRATION DEPTH (SUB-SURFACE)
        </text>

        {/* Legend */}
        <rect x="420" y="120" width="10" height="10" fill="#5b7f9c" />
        <text x="435" y="129" fill="#e9f2f6" fontSize="9">MOISTURE</text>
        <rect x="420" y="140" width="10" height="10" fill="#e9f2f6" fillOpacity="0.2" stroke="#e9f2f6" strokeWidth="0.5" />
        <text x="435" y="149" fill="#e9f2f6" fontSize="9">SUBSTRATE</text>
      </svg>

      {p.title ? (
        <div style={{ 
          marginTop: 40,
          fontFamily: 'monospace',
          fontSize: 28,
          color: '#e9f2f6',
          letterSpacing: '2px',
          borderTop: '1px solid #e0b44c',
          paddingTop: 10,
          opacity: textEntrance
        }}>
          {p.title.toUpperCase()}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};