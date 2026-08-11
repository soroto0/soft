import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const CapillaryActionFailureScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const crack = interpolate(frame, [0, span * 0.2], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const flow = interpolate(frame, [span * 0.15, span * 0.45], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const spread = interpolate(frame, [span * 0.4, span * 0.85], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const arrowAlpha = interpolate(frame, [span * 0.55, span * 0.8], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { id: 'steel', y: 180, h: 60, fill: '#8a949b', name: 'STEEL SUBSTRATE' },
    { id: 'shell', y: 100, h: 80, fill: '#3a444d', name: 'RUBBERIZED SHELL' },
  ];

  const depthTicks = [0, 5, 10, 15];

  return (
    <AbsoluteFill style={{ opacity, width, height, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 300" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="slushGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5b7f9c" />
            <stop offset="50%" stopColor="#7ba3c2" />
            <stop offset="100%" stopColor="#e9f2f6" />
          </linearGradient>
        </defs>

        {/* Steel Layer */}
        <rect x="50" y={layers[0].y} width="300" height={layers[0].h} fill={layers[0].fill} stroke="#e9f2f6" strokeWidth="0.5" />
        
        {/* Rubber Shell - Left Side */}
        <rect 
          x="50" 
          y={layers[1].y} 
          width={148 - 4 * crack} 
          height={layers[1].h} 
          fill={layers[1].fill} 
          stroke="#e9f2f6" 
          strokeWidth="0.5" 
        />
        
        {/* Rubber Shell - Right Side */}
        <rect 
          x={202 + 4 * crack} 
          y={layers[1].y} 
          width={148 - 4 * crack} 
          height={layers[1].h} 
          fill={layers[1].fill} 
          stroke="#e9f2f6" 
          strokeWidth="0.5" 
        />

        {/* Salted Slush - Vertical Ingress */}
        <rect 
          x={200 - 3 * crack} 
          y={100} 
          width={6 * crack} 
          height={80 * flow} 
          fill="url(#slushGrad)" 
          opacity={0.9}
        />

        {/* Salted Slush - Horizontal Capillary Spread */}
        <rect 
          x={200 - 140 * spread} 
          y={177} 
          width={280 * spread} 
          height="6" 
          fill="url(#slushGrad)" 
          opacity={0.9 * flow}
        />

        {/* Depth Axis */}
        <line x1="370" y1="100" x2="370" y2="240" stroke="#e9f2f6" strokeWidth="1" />
        {depthTicks.map((t) => (
          <g key={t}>
            <line x1="370" y1={100 + t * 9.3} x2="375" y2={100 + t * 9.3} stroke="#e9f2f6" strokeWidth="1" />
            <text x="380" y={103 + t * 9.3} fill="#e9f2f6" fontSize="6">{t}mm</text>
          </g>
        ))}

        {/* Labels and Leader Lines */}
        <g opacity={crack}>
          <line x1="50" y1="210" x2="20" y2="210" stroke="#e9f2f6" strokeWidth="0.5" />
          <text x="15" y="213" fill="#e9f2f6" fontSize="8" textAnchor="end">{layers[0].name}</text>
          
          <line x1="50" y1="140" x2="20" y2="140" stroke="#e9f2f6" strokeWidth="0.5" />
          <text x="15" y="143" fill="#e9f2f6" fontSize="8" textAnchor="end">{layers[1].name}</text>

          <line x1="200" y1="100" x2="200" y2="70" stroke="#5b7f9c" strokeWidth="0.5" />
          <text x="200" y="65" fill="#5b7f9c" fontSize="8" textAnchor="middle" fontWeight="bold">SALTED SLUSH</text>
        </g>

        {/* Capillary Force Arrows */}
        <g opacity={arrowAlpha}>
          <path 
            d="M 180 165 Q 160 175 130 178" 
            fill="none" 
            stroke="#e0b44c" 
            strokeWidth="2" 
            markerEnd="url(#arrowhead)" 
          />
          <path 
            d="M 220 165 Q 240 175 270 178" 
            fill="none" 
            stroke="#e0b44c" 
            strokeWidth="2" 
            markerEnd="url(#arrowhead)" 
          />
          <text x="200" y="195" fill="#e0b44c" fontSize="7" textAnchor="middle" fontWeight="bold">CAPILLARY SUCTION</text>
          
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#e0b44c" />
            </marker>
          </defs>
        </g>

        {/* Crack Label */}
        <text 
          x="200" 
          y="130" 
          fill="#d0523f" 
          fontSize="6" 
          textAnchor="middle" 
          opacity={crack * (1 - flow)}
        >
          BRITTLE FRACTURE
        </text>
      </svg>

      {p.title ? (
        <div style={{
          position: 'absolute',
          bottom: '10%',
          fontFamily: 'monospace',
          fontSize: 42,
          color: '#e9f2f6',
          letterSpacing: '4px',
          borderTop: '2px solid #e9f2f6',
          paddingTop: '10px'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};