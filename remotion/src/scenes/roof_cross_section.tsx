import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const RoofCrossSectionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const reveal = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const weightProgress = interpolate(frame, [span * 0.2, span * 0.8], [0, 500], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const arrowPulse = interpolate(frame, [span * 0.4, span * 0.9], [0, 1], {
    easing: Easing.elastic(1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleSlide = interpolate(frame, [0, span * 0.2], [20, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { id: 'humus', name: 'HUMUS (NASS)', height: 70, fill: '#5d6a73', weight: '320 t' },
    { id: 'insul', name: 'DÄMMUNG', height: 30, fill: '#8a949b', weight: '5 t' },
    { id: 'concrete', name: 'BETONPLATTE', height: 50, fill: '#c9d3d9', weight: '175 t' },
  ];

  const arrowPositions = [120, 200, 280, 360, 440];
  let currentY = 60;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 600 400" style={{ overflow: 'visible' }}>
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#e0b44c" />
          </marker>
          <linearGradient id="humusGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4a545a" />
            <stop offset="100%" stopColor="#5d6a73" />
          </linearGradient>
        </defs>

        {/* Vertical Axis */}
        <line x1="80" y1="60" x2="80" y2="210" stroke="#e9f2f6" strokeWidth="1" opacity={reveal * 0.5} />
        {[0, 50, 100, 150].map((tick) => (
          <g key={tick} opacity={reveal * 0.5}>
            <line x1="75" y1={60 + tick} x2="80" y2={60 + tick} stroke="#e9f2f6" strokeWidth="1" />
            <text x="70" y={65 + tick} fill="#e9f2f6" fontSize="8" textAnchor="end">{tick}cm</text>
          </g>
        ))}

        {/* Layers */}
        {layers.map((layer, i) => {
          const yPos = currentY;
          currentY += layer.height;
          return (
            <g key={layer.id}>
              <rect
                x="100"
                y={yPos}
                width={400 * reveal}
                height={layer.height}
                fill={layer.id === 'humus' ? 'url(#humusGrad)' : layer.fill}
                stroke="#e9f2f6"
                strokeWidth="0.5"
                opacity={0.9}
              />
              <line 
                x1="510" y1={yPos + layer.height / 2} 
                x2="530" y2={yPos + layer.height / 2} 
                stroke="#e9f2f6" strokeWidth="0.5" 
                opacity={reveal}
              />
              <text
                x="535"
                y={yPos + layer.height / 2 + 4}
                fill="#e9f2f6"
                fontSize="10"
                opacity={reveal}
                fontFamily="monospace"
              >
                {layer.name} ({layer.weight})
              </text>
            </g>
          );
        })}

        {/* Force Arrows */}
        {arrowPositions.map((x, i) => (
          <g key={i} opacity={arrowPulse}>
            <line
              x1={x}
              y1={20}
              x2={x}
              y2={50 + 10 * arrowPulse}
              stroke="#e0b44c"
              strokeWidth="3"
              markerEnd="url(#arrowhead)"
            />
          </g>
        ))}

        {/* Total Weight Display */}
        <g transform="translate(300, 300)" opacity={reveal}>
          <rect x="-100" y="-40" width="200" height="80" fill="rgba(208, 82, 63, 0.1)" stroke="#d0523f" strokeWidth="1" />
          <text
            y="-10"
            fill="#e9f2f6"
            fontSize="12"
            textAnchor="middle"
            fontFamily="sans-serif"
            letterSpacing="2"
          >
            GESAMTLAST
          </text>
          <text
            y="25"
            fill="#d0523f"
            fontSize="36"
            fontWeight="bold"
            textAnchor="middle"
            fontFamily="monospace"
          >
            {Math.round(weightProgress)} t
          </text>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            color: '#e9f2f6',
            fontSize: 42,
            fontFamily: 'sans-serif',
            fontWeight: 300,
            letterSpacing: '0.2em',
            transform: `translateY(${titleSlide}px)`,
            opacity: reveal,
            borderTop: '1px solid #e9f2f6',
            paddingTop: '10px',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};