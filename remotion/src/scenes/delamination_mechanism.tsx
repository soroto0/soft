import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const DelaminationMechanismScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const layers = [0, 1, 2, 3, 4]; // 0 is the top-most stable rock, 4 is the lowest ceiling layer
  
  const captionMove = interpolate(frame, [0, span * 0.2], [20, 0], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const arrowAlpha = interpolate(frame, [span * 0.1, span * 0.3], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 800 500" style={{ overflow: 'visible' }}>
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#d0523f" />
          </marker>
          <pattern id="rockHatch" patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="10" stroke="#e9f2f6" strokeWidth="0.5" opacity="0.3" />
          </pattern>
        </defs>

        {/* Static Tunnel Outline */}
        <path
          d="M 50,400 L 100,400 Q 100,100 400,100 Q 700,100 700,400 L 750,400"
          fill="none"
          stroke="#e9f2f6"
          strokeWidth="1"
          strokeDasharray="4 4"
          opacity="0.4"
        />

        {/* Delaminating Layers */}
        {layers.map((i) => {
          const startFrame = span * (0.1 + i * 0.12);
          const endFrame = span * (0.5 + i * 0.1);
          
          // Each layer bends more than the one above it to create the gap
          const maxBend = i * 25; 
          const bend = interpolate(frame, [startFrame, endFrame], [0, maxBend], {
            easing: Easing.inOut(Easing.quad),
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });

          const layerY = 120 + i * 22;
          
          // Calculate previous layer's bend for the void shape
          const prevMaxBend = Math.max(0, (i - 1) * 25);
          const prevBend = interpolate(frame, [span * (0.1 + (i - 1) * 0.12), span * (0.5 + (i - 1) * 0.1)], [0, prevMaxBend], {
            easing: Easing.inOut(Easing.quad),
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });

          const voidVisibility = interpolate(frame, [startFrame, endFrame], [0, 0.6], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });

          return (
            <g key={i}>
              {/* The Void (Orange highlight between layers) */}
              {i > 0 && (
                <path
                  d={`M 150,${layerY} Q 400,${layerY + prevBend} 650,${layerY} 
                     L 650,${layerY} Q 400,${layerY + bend} 150,${layerY} Z`}
                  fill="#e0b44c"
                  opacity={voidVisibility}
                />
              )}

              {/* The Rock Layer */}
              <path
                d={`M 150,${layerY} Q 400,${layerY + bend} 650,${layerY} 
                   L 650,${layerY + 18} Q 400,${layerY + 18 + bend} 150,${layerY + 18} Z`}
                fill="url(#rockHatch)"
                stroke="#e9f2f6"
                strokeWidth="1.5"
              />

              {/* Labels for specific layers */}
              {i === 0 && (
                <text x="670" y={layerY + 12} fill="#e9f2f6" fontSize="12" fontWeight="300">
                  ANKERHORIZONT
                </text>
              )}
              {i === 4 && (
                <text x="670" y={layerY + 12 + bend} fill="#e9f2f6" fontSize="12" fontWeight="300">
                  FIRSTSCHICHT
                </text>
              )}
            </g>
          );
        })}

        {/* Gravity Force Arrows */}
        {[200, 400, 600].map((x, idx) => (
          <g key={idx} opacity={arrowAlpha}>
            <line
              x1={x}
              y1="50"
              x2={x}
              y2="90"
              stroke="#d0523f"
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
            />
            {idx === 1 && (
              <text x={x + 10} y="75" fill="#d0523f" fontSize="14" fontWeight="bold">
                G
              </text>
            )}
          </g>
        ))}

        {/* Technical Annotations */}
        <line x1="100" y1="120" x2="100" y2="230" stroke="#e9f2f6" strokeWidth="0.5" />
        <line x1="95" y1="120" x2="105" y2="120" stroke="#e9f2f6" strokeWidth="0.5" />
        <line x1="95" y1="230" x2="105" y2="230" stroke="#e9f2f6" strokeWidth="0.5" />
        <text
          x="90"
          y="175"
          fill="#e9f2f6"
          fontSize="10"
          textAnchor="end"
          transform="rotate(-90, 90, 175)"
          style={{ letterSpacing: 2 }}
        >
          SCHICHTPAKET
        </text>

        {/* Void Label */}
        <g opacity={interpolate(frame, [span * 0.6, span * 0.8], [0, 1], { extrapolateLeft: 'clamp' })}>
          <line x1="400" y1="205" x2="450" y2="280" stroke="#e0b44c" strokeWidth="1" />
          <text x="455" y="295" fill="#e0b44c" fontSize="14" fontWeight="bold">
            HOHLRAUMBILDUNG
          </text>
        </g>
      </svg>

      {p.title && (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            color: '#e9f2f6',
            fontFamily: 'Helvetica, Arial, sans-serif',
            fontSize: 32,
            letterSpacing: '0.2em',
            fontWeight: 300,
            transform: `translateY(${captionMove}px)`,
            borderTop: '1px solid #e9f2f6',
            paddingTop: '10px',
          }}
        >
          {p.title.toUpperCase()}
        </div>
      )}
    </AbsoluteFill>
  );
};
