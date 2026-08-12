import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const GeologicalStratigraphySectionScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const scanProgress = interpolate(frame, [0, span * 0.75], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelsProgress = interpolate(frame, [span * 0.2, span * 0.85], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleRise = interpolate(frame, [0, span * 0.4], [16, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const currentDepth = Math.round(scanProgress * 76);
  const scanY = 60 + 360 * scanProgress;

  const strata = [
    {
      id: 'mud',
      name: 'LODO SUPERFICIAL',
      desc: 'Capa inicial de sedimento',
      y: 60,
      h: 20,
      fill: '#3d484e',
      pattern: 'mudPattern',
      labelY: 70,
    },
    {
      id: 'clay',
      name: 'YOUNG BAY MUD',
      desc: 'Arcilla blanda (25m de espesor)',
      y: 80,
      h: 120,
      fill: '#2b3b45',
      pattern: 'clayPattern',
      labelY: 140,
    },
    {
      id: 'colma',
      name: 'FORMACIÓN COLMA',
      desc: 'Arena densa y grava',
      y: 200,
      h: 100,
      fill: '#4a3f2c',
      pattern: 'sandPattern',
      labelY: 250,
    },
    {
      id: 'bedrock',
      name: 'BLOQUE FRANCISCANO',
      desc: 'Roca sólida basal',
      y: 300,
      h: 120,
      fill: '#1f262b',
      pattern: 'rockPattern',
      labelY: 360,
    },
  ];

  const depthTicks = [
    { depth: '0m', y: 60 },
    { depth: '-3m', y: 80 },
    { depth: '-28m', y: 200 },
    { depth: '-50m', y: 300 },
    { depth: '-76m', y: 420 },
  ];

  return (
    <AbsoluteFill
      style={{
        opacity,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <svg width="80%" height="80%" viewBox="0 0 800 480" style={{ overflow: 'visible' }}>
        <defs>
          <pattern id="mudPattern" width="10" height="10" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#6c7a82" />
            <circle cx="7" cy="7" r="1" fill="#6c7a82" />
          </pattern>
          <pattern id="clayPattern" width="20" height="8" patternUnits="userSpaceOnUse">
            <line x1="0" y1="4" x2="12" y2="4" stroke="#5b7f9c" strokeWidth="0.8" />
          </pattern>
          <pattern id="sandPattern" width="8" height="8" patternUnits="userSpaceOnUse">
            <circle cx="4" cy="4" r="1.2" fill="#e0b44c" opacity="0.6" />
          </pattern>
          <pattern id="rockPattern" width="12" height="12" patternUnits="userSpaceOnUse">
            <path d="M 0 12 L 12 0 M 6 12 L 12 6 M 0 6 L 6 0" stroke="#7a8b96" strokeWidth="0.8" />
          </pattern>

          <clipPath id="scanClip">
            <rect x="220" y="60" width="300" height={360 * scanProgress} />
          </clipPath>
        </defs>

        {/* Outer Grid & Structural Borders */}
        <rect
          x="220"
          y="60"
          width="300"
          height="360"
          fill="none"
          stroke="#4e5a62"
          strokeWidth="1"
          strokeDasharray="2 4"
        />

        {/* Stratigraphy Layers revealing under scanClip */}
        <g clipPath="url(#scanClip)">
          {strata.map((s) => (
            <g key={s.id}>
              <rect x="220" y={s.y} width="300" height={s.h} fill={s.fill} />
              <rect x="220" y={s.y} width="300" height={s.h} fill={`url(#${s.pattern})`} />
              <line
                x1="220"
                y1={s.y}
                x2="520"
                y2={s.y}
                stroke="#e9f2f6"
                strokeWidth="1"
                opacity="0.4"
              />
            </g>
          ))}
        </g>

        {/* Depth Ruler / Left Dimension Axis */}
        <line x1="170" y1="60" x2="170" y2="420" stroke="#e9f2f6" strokeWidth="1.5" />
        {depthTicks.map((tick) => (
          <g key={tick.depth}>
            <line
              x1="162"
              y1={tick.y}
              x2="178"
              y2={tick.y}
              stroke="#e9f2f6"
              strokeWidth="1.2"
            />
            <text
              x="152"
              y={tick.y + 4}
              fill="#e9f2f6"
              fontSize="12"
              fontFamily="monospace"
              textAnchor="end"
            >
              {tick.depth}
            </text>
          </g>
        ))}

        {/* Highlight Dimension Arrow for Young Bay Mud (25m) */}
        <g opacity={labelsProgress}>
          <line
            x1="200"
            y1="80"
            x2="200"
            y2="200"
            stroke="#e0b44c"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
          <path d="M 200 80 L 196 88 L 204 88 Z" fill="#e0b44c" />
          <path d="M 200 200 L 196 192 L 204 192 Z" fill="#e0b44c" />
          <text
            x="195"
            y="144"
            fill="#e0b44c"
            fontSize="11"
            fontFamily="sans-serif"
            textAnchor="end"
            transform="rotate(-90 195 144)"
          >
            25 METROS
          </text>
        </g>

        {/* Active Scanning Line and Depth Marker */}
        <g>
          <line
            x1="150"
            y1={scanY}
            x2="530"
            y2={scanY}
            stroke="#e0b44c"
            strokeWidth="2"
          />
          <circle cx="170" cy={scanY} r="4" fill="#e0b44c" />
          <rect
            x="535"
            y={scanY - 10}
            width="60"
            height="20"
            fill="#e0b44c"
            rx="2"
          />
          <text
            x="565"
            y={scanY + 4}
            fill="#12181b"
            fontSize="11"
            fontWeight="bold"
            fontFamily="monospace"
            textAnchor="middle"
          >
            -{currentDepth}m
          </text>
        </g>

        {/* Right Leader Lines and Labels */}
        {strata.map((s) => (
          <g key={`label-${s.id}`} opacity={labelsProgress}>
            <line
              x1="520"
              y1={s.labelY}
              x2="560"
              y2={s.labelY}
              stroke="#e9f2f6"
              strokeWidth="1"
              strokeDasharray="2 2"
              opacity="0.7"
            />
            <circle cx="520" cy={s.labelY} r="2.5" fill="#e9f2f6" />
            <text
              x="570"
              y={s.labelY - 2}
              fill={s.id === 'bedrock' ? '#e0b44c' : '#e9f2f6'}
              fontSize="13"
              fontWeight="bold"
              fontFamily="sans-serif"
            >
              {s.name}
            </text>
            <text
              x="570"
              y={s.labelY + 13}
              fill="#9ab0bd"
              fontSize="10"
              fontFamily="sans-serif"
            >
              {s.desc}
            </text>
          </g>
        ))}

        {/* Bottom Accent Line for Franciscan Bedrock Target (-76m) */}
        <line
          x1="220"
          y1="420"
          x2="520"
          y2="420"
          stroke="#d0523f"
          strokeWidth="2"
          strokeDasharray="4 2"
          opacity={scanProgress > 0.95 ? 1 : 0.3}
        />
      </svg>

      {/* Frame Caption */}
      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: 30,
            transform: `translateY(${titleRise}px)`,
            fontFamily: "'Segoe UI', Roboto, sans-serif",
            fontSize: 26,
            fontWeight: 600,
            letterSpacing: '0.12em',
            color: '#e9f2f6',
            textTransform: 'uppercase',
            textShadow: '0 2px 4px rgba(0,0,0,0.5)',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};