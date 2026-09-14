import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const HeatConductionVelocityScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  // 0.4 mm/s constant velocity. 
  // Let's define 1mm = 100px in our SVG coordinate system.
  const mmScale = 100;
  const velocityMmPerSec = 0.4;
  const totalDistanceMm = (p.dur || 6) * velocityMmPerSec;
  const totalDistancePx = totalDistanceMm * mmScale;

  const heatAdvance = interpolate(frame, [0, span], [0, totalDistancePx], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const intro = interpolate(frame, [0, 25], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const captionRise = interpolate(frame, [0, span], [20, 0], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pulse = Math.sin(frame * 0.1) * 0.5 + 0.5;

  const majorTicks = [0, 1, 2, 3, 4, 5];
  const microTicks = Array.from({ length: 51 }, (_, i) => i * 0.1);

  return (
    <AbsoluteFill
      style={{
        opacity,
        justifyContent: 'center',
        alignItems: 'center',
        color: '#e9f2f6',
        fontFamily: 'monospace',
      }}
    >
      <svg
        width={width * 0.8}
        height={height * 0.7}
        viewBox="0 0 800 500"
        fill="none"
      >
        <defs>
          <linearGradient id="heatGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#d0523f" />
            <stop offset="60%" stopColor="#e0b44c" />
            <stop offset="100%" stopColor="#5b7f9c" />
          </linearGradient>
          <pattern id="hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="10" stroke="#e9f2f6" strokeWidth="0.5" opacity="0.2" />
          </pattern>
        </defs>

        {/* Main Mass Cross-Section */}
        <rect x="100" y="120" width="600" height="200" fill="url(#hatch)" stroke="#e9f2f6" strokeWidth="1" opacity={intro} />
        
        {/* Heat Zone */}
        <rect 
          x="100" 
          y="120" 
          width={heatAdvance} 
          height="200" 
          fill="url(#heatGrad)" 
          opacity={0.7 * intro} 
        />

        {/* Heat Front Line */}
        <line 
          x1={100 + heatAdvance} 
          y1="110" 
          x2={100 + heatAdvance} 
          y2="330" 
          stroke="#e0b44c" 
          strokeWidth="2" 
          strokeDasharray="5 3"
          opacity={intro}
        />
        
        {/* Front Label */}
        <g transform={`translate(${100 + heatAdvance}, 100)`}>
          <text fill="#e0b44c" fontSize="12" textAnchor="middle" opacity={intro}>
            FRONT DE AVANCE (0.4 mm/s)
          </text>
          <path d="M -5 5 L 0 15 L 5 5" fill="#e0b44c" opacity={pulse * intro} />
        </g>

        {/* Ruler */}
        <g transform="translate(100, 360)">
          <line x1="0" y1="0" x2="550" y2="0" stroke="#e9f2f6" strokeWidth="1.5" opacity={intro} />
          {microTicks.map((t) => (
            <line 
              key={`micro-${t}`}
              x1={t * mmScale} 
              y1="0" 
              x2={t * mmScale} 
              y2="5" 
              stroke="#e9f2f6" 
              strokeWidth="0.5" 
              opacity={0.4 * intro}
            />
          ))}
          {majorTicks.map((t) => (
            <g key={`major-${t}`} transform={`translate(${t * mmScale}, 0)`}>
              <line x1="0" y1="0" x2="0" y2="12" stroke="#e9f2f6" strokeWidth="1.5" opacity={intro} />
              <text y="28" fill="#e9f2f6" fontSize="14" textAnchor="middle" opacity={intro}>
                {t} mm
              </text>
            </g>
          ))}
        </g>

        {/* Material Labels */}
        <text x="110" y="145" fill="#e9f2f6" fontSize="10" opacity={0.6 * intro}>SUPERFICIE DE CONTACTO</text>
        <text x="690" y="145" fill="#e9f2f6" fontSize="10" textAnchor="end" opacity={0.6 * intro}>NÚCLEO FRÍO</text>
        
        {/* Temperature Indicators */}
        <text x="110" y="310" fill="#d0523f" fontSize="14" fontWeight="bold" opacity={intro}>850°C</text>
        <text x="690" y="310" fill="#5b7f9c" fontSize="14" fontWeight="bold" textAnchor="end" opacity={intro}>22°C</text>

        {/* Velocity Vector */}
        <g transform={`translate(${120 + heatAdvance}, 220)`}>
          <line x1="0" y1="0" x2="40" y2="0" stroke="#e9f2f6" strokeWidth="2" opacity={intro} />
          <path d="M 35 -5 L 45 0 L 35 5" fill="#e9f2f6" opacity={intro} />
          <text x="50" y="5" fill="#e9f2f6" fontSize="10" opacity={intro}>v = 0.4 mm/s</text>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.15,
            fontSize: 32,
            letterSpacing: '0.1em',
            transform: `translateY(${captionRise}px)`,
            opacity: intro,
            borderLeft: '4px solid #e0b44c',
            paddingLeft: 20,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};