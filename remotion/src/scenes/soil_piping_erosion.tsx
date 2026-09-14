import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const SoilPipingErosionScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const erosion = interpolate(frame, [span * 0.1, span * 0.9], [0, 1], {
    easing: Easing.bezier(0.4, 0, 0.2, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const flow = interpolate(frame % 60, [0, 60], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textFade = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const cavityPaths = [
    "M 150,140 Q 180,160 210,140",
    "M 300,140 Q 350,180 400,140",
    "M 550,140 Q 600,170 650,140",
  ];

  const particles = [0, 1, 2, 3, 4, 5, 6, 7];

  return (
    <AbsoluteFill style={{ opacity, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={width * 0.8} height={height * 0.7} viewBox="0 0 800 450" style={{ overflow: 'visible' }}>
        <defs>
          <pattern id="soilPattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="0.5" fill="#e9f2f6" opacity="0.3" />
            <circle cx="10" cy="12" r="0.8" fill="#e9f2f6" opacity="0.2" />
          </pattern>
          <linearGradient id="slabGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8a949b" />
            <stop offset="1" stopColor="#5d6a73" />
          </linearGradient>
        </defs>

        {/* Soil Layer */}
        <rect x="50" y="140" width="700" height="260" fill="url(#soilPattern)" stroke="#e9f2f6" strokeWidth="1" opacity="0.4" />
        <text x="60" y="380" fill="#e9f2f6" fontSize="12" fontWeight="300">SUELO FILTRANTE (ARENAS FINAS)</text>

        {/* Cavities (The Voids) */}
        {cavityPaths.map((path, i) => (
          <path
            key={`cavity-${i}`}
            d={path}
            fill="#e0b44c"
            opacity={erosion * 0.6}
            transform={`scale(${1 + erosion * 0.2}) translate(${-erosion * 20}, 0)`}
          />
        ))}

        {/* Concrete Slab */}
        <rect x="50" y="80" width="700" height="60" fill="url(#slabGrad)" stroke="#e9f2f6" strokeWidth="2" />
        <text x="400" y="115" fill="#e9f2f6" fontSize="16" textAnchor="middle" fontWeight="bold" letterSpacing="2">LOSA DE HORMIGÓN</text>

        {/* Water Flow Lines */}
        {[180, 220, 260].map((y, i) => (
          <g key={`flow-${i}`}>
            <path
              d={`M 50,${y} C 200,${y + 20} 400,${y - 20} 750,${y}`}
              fill="none"
              stroke="#5b7f9c"
              strokeWidth="1.5"
              strokeDasharray="10 15"
              strokeDashoffset={flow}
              opacity="0.6"
            />
            {/* Particles being carried away */}
            {particles.map((pIdx) => {
              const pProgress = ((frame + pIdx * 40) % (span * 0.5)) / (span * 0.5);
              const px = 100 + pProgress * 600;
              const py = y + Math.sin(pProgress * 10) * 15;
              return (
                <circle
                  key={`p-${i}-${pIdx}`}
                  cx={px}
                  cy={py}
                  r="2"
                  fill="#e0b44c"
                  opacity={erosion * (1 - pProgress)}
                />
              );
            })}
          </g>
        ))}

        {/* Labels and Arrows */}
        <g opacity={erosion}>
          <line x1="200" y1="160" x2="180" y2="200" stroke="#d0523f" strokeWidth="1" />
          <text x="170" y="220" fill="#d0523f" fontSize="12">SOCAVACIÓN INCIPIENTE</text>
          
          <path d="M 700,200 L 730,200 L 720,190 M 730,200 L 720,210" fill="none" stroke="#e9f2f6" strokeWidth="1" />
          <text x="740" y="205" fill="#e9f2f6" fontSize="10" textAnchor="start">ARRASTRE DE FINOS</text>
        </g>

        {/* Scale Axis */}
        <line x1="50" y1="420" x2="750" y2="420" stroke="#e9f2f6" strokeWidth="0.5" />
        {[0, 0.5, 1.0].map((tick) => (
          <g key={tick} transform={`translate(${50 + tick * 700}, 420)`}>
            <line y2="5" stroke="#e9f2f6" strokeWidth="0.5" />
            <text y="20" fill="#e9f2f6" fontSize="10" textAnchor="middle">{tick}m</text>
          </g>
        ))}
      </svg>

      {p.title && (
        <div
          style={{
            marginTop: 40,
            color: '#e9f2f6',
            fontSize: 42,
            fontFamily: 'monospace',
            fontWeight: 'bold',
            opacity: textFade,
            letterSpacing: '4px',
            borderBottom: '2px solid #d0523f',
            paddingBottom: '8px'
          }}
        >
          {p.title}
        </div>
      )}
    </AbsoluteFill>
  );
};