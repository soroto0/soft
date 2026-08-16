import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const PipingPrinzipScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const pipeProgress = interpolate(frame, [span * 0.1, span * 0.8], [0, 1], {
    easing: Easing.bezier(0.4, 0, 0.2, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const flowAnim = interpolate(frame % 40, [0, 40], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelAlpha = interpolate(frame, [span * 0.05, span * 0.2], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pipeWidth = pipeProgress * 350;
  const particles = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const layers = [
    { y: 320, h: 80, fill: '#8a949b', name: 'FUNDAMENT' },
    { y: 120, h: 200, fill: '#c9d3d9', name: 'DAMMKÖRPER' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width={width * 0.8} height={height * 0.8} viewBox="0 0 800 450">
        <defs>
          <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5b7f9c" stopOpacity="0.7" />
            <stop offset="1" stopColor="#5b7f9c" stopOpacity="0.2" />
          </linearGradient>
          <clipPath id="damClip">
            <path d="M 150 320 L 300 120 L 500 120 L 650 320 Z" />
          </clipPath>
        </defs>

        {/* Geological Layers */}
        {layers.map((layer, i) => (
          <g key={layer.name} opacity={0.4}>
            <rect x="50" y={layer.y} width="700" height={layer.h} fill={layer.fill} stroke="#e9f2f6" strokeWidth={0.5} />
            <text x="60" y={layer.y + 20} fill="#e9f2f6" fontSize={10}>{layer.name}</text>
          </g>
        ))}

        {/* Dam Structure */}
        <path
          d="M 150 320 L 300 120 L 500 120 L 650 320 Z"
          fill="#e9f2f6"
          fillOpacity={0.1}
          stroke="#e9f2f6"
          strokeWidth={2}
        />

        {/* Reservoir */}
        <path
          d="M 50 150 L 275 150 L 150 320 L 50 320 Z"
          fill="url(#waterGrad)"
          stroke="#5b7f9c"
          strokeWidth={1}
        />
        <text x="80" y="140" fill="#5b7f9c" fontSize={14} fontWeight="bold" opacity={labelAlpha}>RESERVOIR</text>

        {/* The Pipe (Growing backwards from right to left) */}
        <g clipPath="url(#damClip)">
          <path
            d={`M ${650 - pipeWidth} 310 L 650 310 L 660 325 L 640 325 Z`}
            fill="#d0523f"
            fillOpacity={0.3}
          />
          <path
            d={`M 650 315 L ${650 - pipeWidth} 315`}
            stroke="#d0523f"
            strokeWidth={8}
            strokeLinecap="round"
            fill="none"
          />
          {/* Erosion Front */}
          <circle cx={650 - pipeWidth} cy={315} r={6} fill="#d0523f" />
        </g>

        {/* Moving Particles (Eroded Material) */}
        {particles.map((i) => {
          const pOffset = ((i / 10) + flowAnim) % 1;
          const px = 650 - (pipeWidth * (1 - pOffset));
          return (
            <circle
              key={i}
              cx={px}
              cy={315 + (i % 2 === 0 ? 2 : -2)}
              r={2}
              fill="#e0b44c"
              opacity={pipeProgress > 0.1 ? 0.8 : 0}
            />
          );
        })}

        {/* Labels and Annotations */}
        <g opacity={labelAlpha}>
          <text x="650" y="350" fill="#e9f2f6" fontSize={12} textAnchor="middle">AUSTRITTSPUNKT</text>
          <path d="M 650 340 L 650 325" stroke="#e9f2f6" strokeWidth={1} markerEnd="url(#arrow)" />
          
          <text x={650 - pipeWidth / 2} y={295} fill="#d0523f" fontSize={12} textAnchor="middle" opacity={pipeProgress}>
            PIPING-KANAL
          </text>
          
          <text x="400" y="380" fill="#e0b44c" fontSize={11} textAnchor="middle">
            RÜCKREITENDE EROSION (VAKUUM-EFFEKT)
          </text>
          
          {/* Flow Arrows */}
          {[0, 1, 2].map((i) => (
            <path
              key={i}
              d={`M ${200 + i * 20} 315 L ${240 + i * 20} 315`}
              stroke="#5b7f9c"
              strokeWidth={2}
              opacity={0.6}
              markerEnd="url(#arrow)"
            />
          ))}
        </g>

        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#e9f2f6" />
          </marker>
        </defs>
      </svg>

      {p.title ? (
        <div style={{
          position: 'absolute',
          bottom: '10%',
          fontFamily: 'monospace',
          fontSize: 28,
          color: '#e9f2f6',
          letterSpacing: '2px',
          borderLeft: '4px solid #d0523f',
          paddingLeft: '15px'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};