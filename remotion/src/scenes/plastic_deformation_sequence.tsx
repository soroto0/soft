import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const PlasticDeformationSequenceScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const progress = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const stages = [
    {
      id: 1,
      label: 'ELASTISCH',
      color: '#e9f2f6',
      displacement: '0.0 mm',
      path: 'M 0,0 L 0,140',
      tension: 0,
    },
    {
      id: 2,
      label: 'FLIEẞGRENZE',
      color: '#e0b44c',
      displacement: '1.2 mm',
      path: 'M 0,0 C 8,35 -8,105 0,140',
      tension: 0.5,
    },
    {
      id: 3,
      label: 'PLASTISCH',
      color: '#d0523f',
      displacement: '4.8 mm',
      path: 'M 0,0 C 22,35 -22,105 0,140',
      tension: 1,
    },
  ];

  const yOffset = interpolate(progress, [0, 1], [0, 15]);
  const dashOffset = interpolate(frame, [0, span], [0, -40]);

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg
        width={width * 0.8}
        height={height * 0.7}
        viewBox="0 0 800 400"
        fill="none"
        style={{ overflow: 'visible' }}
      >
        {/* Ceiling Structure Cross-Section */}
        <line x1="50" y1="80" x2="750" y2="80" stroke="#8a949b" strokeWidth="2" />
        <line x1="50" y1="110" x2="750" y2="110" stroke="#8a949b" strokeWidth="2" strokeDasharray="8 4" />
        <text x="50" y="70" fill="#8a949b" fontSize="12" fontFamily="monospace">BETONDECKE (C25/30)</text>

        {stages.map((stage, i) => {
          const xPos = 150 + i * 250;
          const stageReveal = interpolate(progress, [i * 0.2, i * 0.2 + 0.3], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });

          return (
            <g key={stage.id} opacity={stageReveal} transform={`translate(${xPos}, 110)`}>
              {/* Bolt Head / Anchor */}
              <rect x="-20" y="-30" width="40" height="30" fill="#5d6a73" stroke="#e9f2f6" strokeWidth="1" />
              
              {/* Bolt Body with Deformation */}
              <path
                d={stage.path}
                stroke={stage.color}
                strokeWidth="12"
                strokeLinecap="round"
                fill="none"
                transform={`translate(0, ${i === 2 ? yOffset : 0})`}
              />
              
              {/* Force Arrows */}
              <g transform={`translate(0, ${150 + (i === 2 ? yOffset : 0)})`}>
                <line x1="0" y1="0" x2="0" y2="30" stroke="#d0523f" strokeWidth="2" />
                <path d="M -5,22 L 0,32 L 5,22" stroke="#d0523f" strokeWidth="2" fill="none" />
                <text x="10" y="25" fill="#d0523f" fontSize="10" fontFamily="monospace">F_tens</text>
              </g>

              {/* Measurement Ticks */}
              <line x1="30" y1="0" x2="50" y2="0" stroke="#8a949b" strokeWidth="1" />
              <line x1="30" y1={140 + (i === 2 ? yOffset : 0)} x2="50" y2={140 + (i === 2 ? yOffset : 0)} stroke="#8a949b" strokeWidth="1" />
              <line 
                x1="45" y1="0" x2="45" y2={140 + (i === 2 ? yOffset : 0)} 
                stroke="#e9f2f6" 
                strokeWidth="0.5" 
                strokeDasharray="2 2" 
              />
              
              {/* Labels */}
              <text x="0" y="220" fill={stage.color} fontSize="14" textAnchor="middle" fontWeight="bold" fontFamily="monospace">
                {stage.label}
              </text>
              <text x="0" y="240" fill="#8a949b" fontSize="12" textAnchor="middle" fontFamily="monospace">
                ΔL: {i === 2 ? (4.8 + (yOffset / 5)).toFixed(1) : stage.displacement}
              </text>
              
              {/* Stage Number */}
              <circle cx="0" cy="-60" r="15" stroke="#8a949b" strokeWidth="1" />
              <text x="0" y="-55" fill="#8a949b" fontSize="12" textAnchor="middle" fontFamily="monospace">{stage.id}</text>
            </g>
          );
        })}

        {/* Stress-Strain Indicator Line (Bottom) */}
        <g transform="translate(100, 360)">
          <line x1="0" y1="0" x2="600" y2="0" stroke="#5d6a73" strokeWidth="1" />
          <rect 
            x={0} y="-2" width={600 * progress} height="4" 
            fill="url(#grad1)" 
          />
          <line 
            x1={600 * progress} y1="-10" x2={600 * progress} y2="10" 
            stroke="#e9f2f6" strokeWidth="2" 
          />
          <text x="0" y="20" fill="#8a949b" fontSize="9" fontFamily="monospace">0% STRESS</text>
          <text x="600" y="20" fill="#d0523f" fontSize="9" textAnchor="end" fontFamily="monospace">100% YIELD</text>
        </g>

        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#e9f2f6" />
            <stop offset="50%" stopColor="#e0b44c" />
            <stop offset="100%" stopColor="#d0523f" />
          </linearGradient>
          <pattern id="hatch" patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="4" stroke="#8a949b" strokeWidth="0.5" />
          </pattern>
        </defs>

        {/* Moving "Millimeter" indicator */}
        <g transform={`translate(${700}, ${110 + yOffset})`}>
          <path d="M 0,0 L 20,0" stroke="#e0b44c" strokeWidth="1" strokeDasharray="2 2" strokeDashoffset={dashOffset} />
          <text x="25" y="4" fill="#e0b44c" fontSize="10" fontFamily="monospace">SLIPPAGE</text>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            width: '100%',
            textAlign: 'center',
            fontFamily: 'monospace',
            fontSize: 42,
            letterSpacing: '0.2em',
            color: '#e9f2f6',
            textShadow: '0 0 10px rgba(233, 242, 246, 0.3)',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};