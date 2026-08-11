import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const HiddenOverlapViewScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const peel = interpolate(frame, [span * 0.15, span * 0.55], [0, 1], {
    easing: Easing.bezier(0.33, 1, 0.68, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const rotIntensity = interpolate(frame, [span * 0.4, span * 0.85], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const slide = interpolate(frame, [0, span * 0.2], [40, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const layers = [
    { id: 'deck', y: 220, h: 15, fill: '#5d6a73', label: 'PLYWOOD DECK' },
    { id: 'felt', y: 212, h: 4, fill: '#8a949b', label: 'UNDERLAYMENT' },
    { id: 'shingle-b', y: 185, h: 12, x: 50, w: 300, fill: '#e9f2f6', label: 'BOTTOM SHINGLE' },
  ];

  const spores = Array.from({ length: 14 }).map((_, i) => ({
    x: 180 + (i * 14),
    y: 182 + (i % 3) * 3,
    r: 1.5 + (i % 2),
    delay: i * 0.02,
  }));

  const moistureNodes = Array.from({ length: 8 }).map((_, i) => ({
    x: 170 + (i * 25),
    y: 184,
  }));

  return (
    <AbsoluteFill style={{ 
      opacity, 
      display: 'flex', 
      flexDirection: 'column', 
      justifyContent: 'center', 
      alignItems: 'center' 
    }}>
      <svg 
        width={width * 0.8} 
        height={height * 0.6} 
        viewBox="0 0 500 300" 
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="rotGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e0b44c" stopOpacity={0.8} />
            <stop offset="100%" stopColor="#d0523f" stopOpacity={0.9} />
          </linearGradient>
        </defs>

        {/* Base Layers */}
        {layers.map((layer) => (
          <g key={layer.id}>
            <rect 
              x={layer.x || 50} 
              y={layer.y} 
              width={layer.w || 400} 
              height={layer.h} 
              fill={layer.fill} 
              stroke="#e9f2f6" 
              strokeWidth={0.5}
              opacity={0.8}
            />
            <line 
              x1={layer.x || 50} 
              y1={layer.y + layer.h / 2} 
              x2={30} 
              y2={layer.y + layer.h / 2} 
              stroke="#e9f2f6" 
              strokeWidth={0.5} 
            />
            <text 
              x={25} 
              y={layer.y + layer.h / 2 + 3} 
              fill="#e9f2f6" 
              fontSize={8} 
              textAnchor="end"
              fontFamily="monospace"
            >
              {layer.label}
            </text>
          </g>
        ))}

        {/* Hidden Overlap Zone - Rot and Moisture */}
        <g opacity={rotIntensity}>
          <rect 
            x={160} 
            y={178} 
            width={200} 
            height={12} 
            fill="url(#rotGradient)" 
            rx={2}
          />
          {spores.map((s, i) => (
            <circle 
              key={i} 
              cx={s.x} 
              cy={s.y} 
              r={s.r} 
              fill="#d0523f" 
              opacity={interpolate(rotIntensity, [s.delay, 1], [0, 1], { extrapolateLeft: 'clamp' })}
            />
          ))}
          {moistureNodes.map((m, i) => (
            <path
              key={`m-${i}`}
              d={`M ${m.x} ${m.y} q 5 8 10 0`}
              stroke="#e9f2f6"
              strokeWidth={1}
              fill="none"
              opacity={rotIntensity * 0.6}
            />
          ))}
          <text x={260} y={172} fill="#e0b44c" fontSize={10} textAnchor="middle" fontWeight="bold">
            FUNGAL SPORES & MOISTURE TRAP
          </text>
        </g>

        {/* Top Shingle - Peeling */}
        <g transform={`rotate(${peel * -35}, 450, 185)`}>
          <rect 
            x={150} 
            y={170} 
            width={300} 
            height={15} 
            fill="#e9f2f6" 
            stroke="#8a949b" 
            strokeWidth={1}
            fillOpacity={0.9}
          />
          <line x1={150} y1={177} x2={130} y2={140} stroke="#e9f2f6" strokeWidth={0.5} />
          <text x={125} y={135} fill="#e9f2f6" fontSize={9} textAnchor="end">TOP SHINGLE (ASPHALT)</text>
          
          {/* Hatching on shingle side */}
          {Array.from({ length: 10 }).map((_, i) => (
            <line 
              key={i}
              x1={160 + i * 28} y1={170} 
              x2={170 + i * 28} y2={185} 
              stroke="#5d6a73" 
              strokeWidth={0.5} 
            />
          ))}
        </g>

        {/* Scale Axis */}
        <line x1={50} y1={260} x2={450} y2={260} stroke="#e9f2f6" strokeWidth={1} />
        {[0, 100, 200, 300, 400].map((tick) => (
          <g key={tick}>
            <line x1={50 + tick} y1={260} x2={50 + tick} y2={265} stroke="#e9f2f6" strokeWidth={1} />
            <text x={50 + tick} y={278} fill="#e9f2f6" fontSize={7} textAnchor="middle">{tick}mm</text>
          </g>
        ))}
      </svg>

      {p.title && (
        <div style={{
          marginTop: 40,
          color: '#e9f2f6',
          fontSize: 42,
          fontFamily: 'Georgia, serif',
          letterSpacing: '0.05em',
          transform: `translateY(${slide}px)`,
          borderTop: '1px solid #e0b44c',
          paddingTop: 10,
          textTransform: 'uppercase'
        }}>
          {p.title}
        </div>
      )}
    </AbsoluteFill>
  );
};