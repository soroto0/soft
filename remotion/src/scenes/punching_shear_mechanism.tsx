import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const PunchingShearMechanismScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const intro = interpolate(frame, [0, span * 0.15], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const crack = interpolate(frame, [span * 0.2, span * 0.6], [0, 1], {
    easing: Easing.inOut(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const stress = interpolate(frame, [span * 0.5, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleFade = interpolate(frame, [span * 0.1, span * 0.3], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labels = [
    { x: 70, y: 90, text: 'BETONPLATTE C35/45', align: 'start' },
    { x: 200, y: 220, text: 'STÜTZE', align: 'middle' },
    { x: 330, y: 115, text: 'BIEGEBEWEHRUNG', align: 'end' },
    { x: 110, y: 160, text: 'SCHUBRISS (45°)', align: 'start', color: '#d0523f' },
  ];

  const loadArrows = [80, 140, 200, 260, 320];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 300" style={{ overflow: 'visible' }}>
        <defs>
          <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="#c9d3d9" strokeWidth="0.5" />
          </pattern>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#e0b44c" />
          </marker>
          <marker id="arrowhead-danger" markerWidth="6" markerHeight="4" refX="0" refY="2" orient="auto">
            <polygon points="0 0, 6 2, 0 4" fill="#d0523f" />
          </marker>
        </defs>

        {/* Column */}
        <rect
          x={175}
          y={140}
          width={50}
          height={120 * intro}
          fill="#8a949b"
          stroke="#e9f2f6"
          strokeWidth="1"
        />

        {/* Slab */}
        <g opacity={intro}>
          <rect x={50} y={100} width={300} height={40} fill="url(#hatch)" stroke="#c9d3d9" strokeWidth="1" />
          <line x1={50} y1={105} x2={350} y2={105} stroke="#5d6a73" strokeWidth="2" />
          <line x1={50} y1={135} x2={350} y2={135} stroke="#5d6a73" strokeWidth="1" />
        </g>

        {/* Shear Cracks (45 degrees) */}
        <path
          d={`M 175 140 L ${175 - 40 * crack} ${140 - 40 * crack}`}
          stroke="#d0523f"
          strokeWidth="2"
          fill="none"
          strokeDasharray="4 2"
        />
        <path
          d={`M 225 140 L ${225 + 40 * crack} ${140 - 40 * crack}`}
          stroke="#d0523f"
          strokeWidth="2"
          fill="none"
          strokeDasharray="4 2"
        />

        {/* Load Arrows */}
        {loadArrows.map((x) => (
          <line
            key={x}
            x1={x}
            y1={40}
            x2={x}
            y2={90}
            stroke="#e0b44c"
            strokeWidth="2"
            markerEnd="url(#arrowhead)"
            opacity={stress}
          />
        ))}
        <text x={200} y={30} fill="#e0b44c" fontSize={12} textAnchor="middle" opacity={stress}>FLÄCHENLAST q</text>

        {/* Reaction Force */}
        <line
          x1={200}
          y1={240}
          x2={200}
          y2={150}
          stroke="#e9f2f6"
          strokeWidth="3"
          markerEnd="url(#arrowhead)"
          opacity={stress}
        />

        {/* Labels */}
        {labels.map((label, i) => (
          <g key={label.text} opacity={intro * (1 - i * 0.1)}>
            <text
              x={label.x}
              y={label.y}
              fill={label.color || '#e9f2f6'}
              fontSize={10}
              fontFamily="monospace"
              textAnchor={label.align as "start" | "middle" | "end"}
            >
              {label.text}
            </text>
            <circle cx={label.x + (label.align === 'end' ? -5 : 5)} cy={label.y - 3} r={1.5} fill={label.color || '#e9f2f6'} />
          </g>
        ))}

        {/* Stress Lines Indicator */}
        <path
          d="M 160 140 Q 200 160 240 140"
          stroke="#d0523f"
          strokeWidth="1"
          fill="none"
          opacity={crack * 0.5}
        />
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            fontFamily: 'sans-serif',
            fontSize: 42,
            fontWeight: 300,
            letterSpacing: '0.1em',
            color: '#e9f2f6',
            opacity: titleFade,
            transform: `translateY(${20 - 20 * titleFade}px)`,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};