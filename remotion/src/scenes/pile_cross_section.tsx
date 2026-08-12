import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const PileCrossSectionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const opacity = p.enter * p.exit;

  const draw = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const dims = interpolate(frame, [span * 0.3, span * 0.7], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labels = interpolate(frame, [span * 0.5, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleRise = interpolate(frame, [span * 0.6, span * 0.95], [20, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const tendons = [0, 45, 90, 135, 180, 225, 270, 315];
  const centerX = 250;
  const centerY = 220;
  const outerR = 150;
  const innerR = 90;
  const tendonR = 120;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 500 500" style={{ overflow: 'visible' }}>
        <defs>
          <pattern id="hatch" patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="10" stroke="#e9f2f6" strokeWidth="0.5" opacity="0.3" />
          </pattern>
        </defs>

        {/* Main Pile Body */}
        <g opacity={draw}>
          <path
            d={`M ${centerX} ${centerY - outerR} 
               A ${outerR} ${outerR} 0 1 1 ${centerX - 0.01} ${centerY - outerR} 
               Z 
               M ${centerX} ${centerY - innerR} 
               A ${innerR} ${innerR} 0 1 0 ${centerX + 0.01} ${centerY - innerR} 
               Z`}
            fill="#5d6a73"
            stroke="#e9f2f6"
            strokeWidth="2"
          />
          <path
            d={`M ${centerX} ${centerY - outerR} 
               A ${outerR} ${outerR} 0 1 1 ${centerX - 0.01} ${centerY - outerR} 
               Z 
               M ${centerX} ${centerY - innerR} 
               A ${innerR} ${innerR} 0 1 0 ${centerX + 0.01} ${centerY - innerR} 
               Z`}
            fill="url(#hatch)"
          />
        </g>

        {/* Steel Tendons */}
        {tendons.map((angle, i) => {
          const rad = (angle * Math.PI) / 180;
          const tx = centerX + Math.cos(rad) * tendonR;
          const ty = centerY + Math.sin(rad) * tendonR;
          return (
            <circle
              key={i}
              cx={tx}
              cy={ty}
              r={4 * draw}
              fill="#e0b44c"
              stroke="#e9f2f6"
              strokeWidth="0.5"
            />
          );
        })}

        {/* Dimension Lines: Outer Diameter */}
        <g opacity={dims}>
          <line x1={centerX - outerR} y1={centerY + outerR + 30} x2={centerX + outerR} y2={centerY + outerR + 30} stroke="#e9f2f6" strokeWidth="1.5" />
          <line x1={centerX - outerR} y1={centerY + outerR + 20} x2={centerX - outerR} y2={centerY + outerR + 40} stroke="#e9f2f6" strokeWidth="1.5" />
          <line x1={centerX + outerR} y1={centerY + outerR + 20} x2={centerX + outerR} y2={centerY + outerR + 40} stroke="#e9f2f6" strokeWidth="1.5" />
          <text x={centerX} y={centerY + outerR + 55} fill="#e9f2f6" fontSize="14" textAnchor="middle" fontFamily="monospace">Ø 400 mm</text>
        </g>

        {/* Dimension Lines: Wall Thickness */}
        <g opacity={dims}>
          <line x1={centerX + innerR} y1={centerY - 10} x2={centerX + outerR} y2={centerY - 10} stroke="#e0b44c" strokeWidth="1.5" />
          <line x1={centerX + innerR} y1={centerY - 20} x2={centerX + innerR} y2={centerY} stroke="#e0b44c" strokeWidth="1.5" />
          <line x1={centerX + outerR} y1={centerY - 20} x2={centerX + outerR} y2={centerY} stroke="#e0b44c" strokeWidth="1.5" />
          <text x={centerX + (innerR + outerR) / 2} y={centerY - 25} fill="#e0b44c" fontSize="12" textAnchor="middle" fontFamily="monospace">80 mm</text>
        </g>

        {/* Leader Lines & Labels */}
        <g opacity={labels}>
          {/* Concrete Label */}
          <line x1={centerX + 110} y1={centerY - 110} x2={centerX + 180} y2={centerY - 180} stroke="#e9f2f6" strokeWidth="1" />
          <text x={centerX + 185} y={centerY - 180} fill="#e9f2f6" fontSize="12" dominantBaseline="middle">BETON C80/95</text>
          
          {/* Steel Label */}
          <line x1={centerX + 85} y1={centerY + 85} x2={centerX + 180} y2={centerY + 140} stroke="#e9f2f6" strokeWidth="1" />
          <text x={centerX + 185} y={centerY + 140} fill="#e0b44c" fontSize="12" dominantBaseline="middle">VORSPANNSTAHL</text>

          {/* Hollow Core Label */}
          <line x1={centerX} y1={centerY} x2={centerX - 180} y2={centerY - 100} stroke="#e9f2f6" strokeWidth="1" />
          <text x={centerX - 185} y={centerY - 100} fill="#e9f2f6" fontSize="12" textAnchor="end" dominantBaseline="middle">HOHLKERN (Ø 240 mm)</text>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            fontFamily: 'sans-serif',
            fontSize: 42,
            fontWeight: 'bold',
            color: '#e9f2f6',
            letterSpacing: '0.1em',
            opacity: labels,
            transform: `translateY(${titleRise}px)`,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};