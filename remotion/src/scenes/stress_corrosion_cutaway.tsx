import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const StressCorrosionCutawayScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const opacity = p.enter * p.exit;

  const intro = interpolate(frame, [0, span * 0.2], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const moistureSeep = interpolate(frame, [span * 0.25, span * 0.5], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const crackGrowth = interpolate(frame, [span * 0.45, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { id: 'arch', x: 80, w: 60, fill: '#3d4850', label: 'STRUCTURAL ARCH' },
    { id: 'plate', x: 140, w: 120, fill: '#5d6a73', label: '4" STEEL PLATE' },
    { id: 'mesh', x: 260, w: 15, fill: '#8a949b', label: 'DECORATIVE MESH' },
  ];

  const cracks = [
    { d: "M 260 100 Q 230 105 210 95 T 180 100", len: 85 },
    { d: "M 260 150 Q 240 140 220 155 T 190 145", len: 75 },
    { d: "M 260 200 Q 235 210 215 190 T 175 205", len: 90 },
  ];

  return (
    <AbsoluteFill style={{ 
      opacity, 
      width, 
      height, 
      display: 'flex', 
      flexDirection: 'column', 
      justifyContent: 'center', 
      alignItems: 'center' 
    }}>
      <svg width="70%" viewBox="0 0 450 320" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="stressGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#e9f2f6" stopOpacity={0.1} />
            <stop offset="50%" stopColor="#e0b44c" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#d0523f" stopOpacity={0.6} />
          </linearGradient>
          <pattern id="hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="4" stroke="#e9f2f6" strokeWidth="0.5" />
          </pattern>
        </defs>

        {/* Layers */}
        {layers.map((layer, i) => (
          <g key={layer.id} opacity={intro}>
            <rect
              x={layer.x}
              y={60}
              width={layer.w * intro}
              height={200}
              fill={layer.fill}
              stroke="#e9f2f6"
              strokeWidth="1"
            />
            {layer.id === 'mesh' && (
              <rect x={layer.x} y={60} width={layer.w * intro} height={200} fill="url(#hatch)" opacity={0.4} />
            )}
            <line 
              x1={layer.x + layer.w / 2} y1={60} 
              x2={layer.x + layer.w / 2} y2={45 - i * 10} 
              stroke="#e9f2f6" strokeWidth="0.5" 
            />
            <text
              x={layer.x + layer.w / 2}
              y={40 - i * 10}
              fill="#e9f2f6"
              fontSize="8"
              textAnchor="middle"
              fontFamily="monospace"
            >
              {layer.label}
            </text>
          </g>
        ))}

        {/* Moisture Trap behind Lock */}
        <path
          d="M 260 80 L 250 80 L 250 240 L 260 240 Z"
          fill="#e0b44c"
          opacity={moistureSeep * 0.8}
        />
        <text x={245} y={275} fill="#e0b44c" fontSize="7" textAnchor="end" opacity={moistureSeep}>
          TRAPPED MOISTURE (CHLORIDES)
        </text>
        <line x1={248} y1={272} x2={255} y2={240} stroke="#e0b44c" strokeWidth="0.5" opacity={moistureSeep} />

        {/* Stress Gradient Labeling */}
        <rect x={140} y={210} width={120} height={40} fill="url(#stressGrad)" opacity={intro} />
        <text x={140} y={262} fill="#e9f2f6" fontSize="6" opacity={intro}>0 ksi (BASE)</text>
        <text x={260} y={262} fill="#d0523f" fontSize="6" textAnchor="end" opacity={intro}>60 ksi (CRITICAL)</text>

        {/* Fractures */}
        {cracks.map((crack, i) => (
          <path
            key={i}
            d={crack.d}
            fill="none"
            stroke="#d0523f"
            strokeWidth="1.5"
            strokeDasharray={crack.len}
            strokeDashoffset={crack.len * (1 - crackGrowth)}
          />
        ))}

        {/* Dimension Line */}
        <g opacity={intro}>
          <line x1={140} y1={285} x2={260} y2={285} stroke="#e9f2f6" strokeWidth="0.5" />
          <line x1={140} y1={280} x2={140} y2={290} stroke="#e9f2f6" strokeWidth="0.5" />
          <line x1={260} y1={280} x2={260} y2={290} stroke="#e9f2f6" strokeWidth="0.5" />
          <text x={200} y={298} fill="#e9f2f6" fontSize="9" textAnchor="middle" fontFamily="monospace">
            4.00" NOMINAL
          </text>
        </g>

        {/* Crack Labels */}
        <g opacity={crackGrowth}>
          <text x={170} y={125} fill="#d0523f" fontSize="7" fontFamily="monospace">
            PROPAGATING FRACTURES
          </text>
          <line x1={175} y1={120} x2={185} y2={105} stroke="#d0523f" strokeWidth="0.5" />
        </g>
      </svg>

      {p.title ? (
        <div style={{
          marginTop: 40,
          color: '#e9f2f6',
          fontFamily: 'monospace',
          fontSize: 28,
          letterSpacing: 2,
          borderTop: '1px solid #e9f2f6',
          paddingTop: 10,
          opacity: intro
        }}>
          {p.title.toUpperCase()}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};