import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const HydrostaticLoadDiagramScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const opacity = p.enter * p.exit;

  const damGrow = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const waterRise = interpolate(frame, [span * 0.2, span * 0.7], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const loadActive = interpolate(frame, [span * 0.4, span * 0.95], [0, 1], {
    easing: Easing.out(Easing.poly(2)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const svgW = 600;
  const svgH = 400;
  const baseY = 350;
  const topY = 100;
  const damHeight = (baseY - topY) * damGrow;
  const currentTopY = baseY - damHeight;

  const arrowCount = 12;
  const arrows = Array.from({ length: arrowCount }).map((_, i) => {
    const step = i / (arrowCount - 1);
    const y = topY + step * (baseY - topY);
    const maxLength = 120 * step;
    return { y, length: maxLength };
  });

  const damLayers = [
    { name: 'STÜTZKÖRPER', x1: 100, x2: 220, x3: 250, x4: 150, fill: '#8a949b' },
    { name: 'FILTER', x1: 220, x2: 240, x3: 270, x4: 250, fill: '#c9d3d9' },
    { name: 'DAMMKERN', x1: 240, x2: 260, x3: 290, x4: 270, fill: '#e0b44c' },
    { name: 'STÜTZKÖRPER', x1: 260, x2: 450, x3: 550, x4: 290, fill: '#8a949b' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ width: width * 0.8, height: height * 0.8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#d0523f" />
            </marker>
            <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#5b7f9c" stopOpacity="0.8" />
              <stop offset="1" stopColor="#5b7f9c" stopOpacity="0.2" />
            </linearGradient>
          </defs>

          {/* Ground Line */}
          <line x1="50" y1={baseY} x2="550" y2={baseY} stroke="#e9f2f6" strokeWidth="2" opacity={damGrow} />

          {/* Dam Layers */}
          {damLayers.map((layer, idx) => (
            <g key={idx} opacity={damGrow}>
              <polygon
                points={`${layer.x1},${baseY} ${layer.x2},${currentTopY} ${layer.x3},${currentTopY} ${layer.x4},${baseY}`}
                fill={layer.fill}
                stroke="#e9f2f6"
                strokeWidth="0.5"
              />
              {idx === 2 && (
                <text
                  x={(layer.x2 + layer.x3) / 2}
                  y={currentTopY - 10}
                  fill="#e9f2f6"
                  fontSize="10"
                  textAnchor="middle"
                  opacity={damGrow}
                >
                  {layer.name}
                </text>
              )}
            </g>
          ))}

          {/* Water Body */}
          <path
            d={`M 50,${baseY} L 180,${baseY} L ${180 + (220 - 180) * (1 - waterRise)},${baseY - (baseY - topY) * waterRise} L 50,${baseY - (baseY - topY) * waterRise} Z`}
            fill="url(#waterGrad)"
            opacity={waterRise * 0.6}
          />

          {/* Pressure Arrows (Triangular Load) */}
          {arrows.map((arrow, i) => {
            const currentLen = arrow.length * loadActive;
            const startX = 150 - currentLen;
            const endX = 150;
            const isVisible = arrow.y >= (baseY - (baseY - topY) * waterRise);
            
            return (
              <g key={i} opacity={isVisible ? loadActive : 0}>
                <line
                  x1={startX}
                  y1={arrow.y}
                  x2={endX}
                  y2={arrow.y}
                  stroke="#d0523f"
                  strokeWidth="2"
                  markerEnd="url(#arrowhead)"
                />
                {i === arrowCount - 1 && loadActive > 0.8 && (
                  <text x={startX - 10} y={arrow.y + 4} fill="#d0523f" fontSize="12" textAnchor="end">
                    P = ρ·g·h
                  </text>
                )}
              </g>
            );
          })}

          {/* Load Envelope Line */}
          <line
            x1={150 - arrows[0].length * loadActive}
            y1={arrows[0].y}
            x2={150 - arrows[arrowCount - 1].length * loadActive}
            y2={arrows[arrowCount - 1].y}
            stroke="#d0523f"
            strokeWidth="1"
            strokeDasharray="4 2"
            opacity={loadActive}
          />

          {/* Depth Axis */}
          <g opacity={damGrow}>
            <line x1="40" y1={topY} x2="40" y2={baseY} stroke="#e9f2f6" strokeWidth="1" />
            {[0, 0.5, 1].map((t) => (
              <g key={t}>
                <line x1="35" y1={topY + t * (baseY - topY)} x2="45" y2={topY + t * (baseY - topY)} stroke="#e9f2f6" strokeWidth="1" />
                <text x="30" y={topY + t * (baseY - topY) + 4} fill="#e9f2f6" fontSize="10" textAnchor="end">
                  {Math.round(t * 40)}m
                </text>
              </g>
            ))}
          </g>
        </svg>

        {p.title && (
          <div
            style={{
              marginTop: 40,
              fontFamily: 'sans-serif',
              fontSize: 32,
              fontWeight: 300,
              letterSpacing: '0.1em',
              color: '#e9f2f6',
              opacity: interpolate(frame, [span * 0.5, span * 0.8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
              transform: `translateY(${interpolate(frame, [span * 0.5, span * 0.8], [20, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}px)`,
            }}
          >
            {p.title}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};