import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const SeepageFlowDiagramScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 4) * fps));

  const draw = interpolate(frame, [0, span * 0.15], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const fill = interpolate(frame, [span * 0.2, span * 0.4], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const seep = interpolate(frame, [span * 0.4, span * 0.9], [0, 1], {
    easing: Easing.bezier(0.33, 1, 0.68, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { name: 'CLEAR COAT', y: 40, h: 25, color: '#a5b4bc' },
    { name: 'BASE COLOR', y: 65, h: 25, color: '#788994' },
    { name: 'PRIMER', y: 90, h: 25, color: '#4a565e' },
    { name: 'STEEL SUBSTRATE', y: 115, h: 45, color: '#2d353b' },
  ];

  const viewBoxWidth = 400;
  const viewBoxHeight = 220;
  const centerX = viewBoxWidth / 2;
  const scratchWidth = 30;

  return (
    <AbsoluteFill
      style={{
        opacity,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          width: width * 0.8,
          height: height * 0.7,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          style={{ width: '100%', height: 'auto', overflow: 'visible' }}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="0"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#d0523f" />
            </marker>
          </defs>

          {layers.map((layer, i) => (
            <g key={layer.name} opacity={draw}>
              {/* Left Side Finish */}
              <rect
                x={0}
                y={layer.y}
                width={centerX - scratchWidth / 2}
                height={layer.h}
                fill={layer.color}
                stroke="#e9f2f6"
                strokeWidth={0.5}
              />
              {/* Right Side Finish */}
              <rect
                x={centerX + scratchWidth / 2}
                y={layer.y}
                width={centerX - scratchWidth / 2}
                height={layer.h}
                fill={layer.color}
                stroke="#e9f2f6"
                strokeWidth={0.5}
              />
              {/* Layer Label */}
              <text
                x={5}
                y={layer.y + layer.h / 2 + 3}
                fill="#e9f2f6"
                fontSize={6}
                fontFamily="monospace"
                opacity={0.6}
              >
                {layer.name}
              </text>
            </g>
          ))}

          {/* The Scratch / Gap */}
          <rect
            x={centerX - scratchWidth / 2}
            y={40}
            width={scratchWidth}
            height={120}
            fill="none"
            stroke="#e9f2f6"
            strokeWidth={1}
            strokeDasharray="2 2"
            opacity={draw}
          />

          {/* Silicone Filling the Scratch */}
          <rect
            x={centerX - (scratchWidth / 2) + 2}
            y={160 - 120 * fill}
            width={scratchWidth - 4}
            height={120 * fill}
            fill="#d0523f"
            opacity={0.8}
          />

          {/* Lateral Seepage Lines */}
          {[65, 90, 115].map((yPos) => (
            <g key={`seep-${yPos}`} opacity={fill}>
              {/* Left Seep */}
              <rect
                x={centerX - scratchWidth / 2 - (120 * seep)}
                y={yPos - 1.5}
                width={120 * seep}
                height={3}
                fill="#d0523f"
              />
              {/* Right Seep */}
              <rect
                x={centerX + scratchWidth / 2}
                y={yPos - 1.5}
                width={120 * seep}
                height={3}
                fill="#d0523f"
              />
              {/* Arrows */}
              <line
                x1={centerX - scratchWidth / 2 - 10}
                y1={yPos}
                x2={centerX - scratchWidth / 2 - 10 - 40 * seep}
                y2={yPos}
                stroke="#d0523f"
                strokeWidth={2}
                markerEnd="url(#arrowhead)"
                opacity={seep}
              />
              <line
                x1={centerX + scratchWidth / 2 + 10}
                y1={yPos}
                x2={centerX + scratchWidth / 2 + 10 + 40 * seep}
                y2={yPos}
                stroke="#d0523f"
                strokeWidth={2}
                markerEnd="url(#arrowhead)"
                opacity={seep}
              />
            </g>
          ))}

          {/* Scale Axis */}
          <g opacity={draw}>
            <line x1={0} y1={180} x2={viewBoxWidth} y2={180} stroke="#e9f2f6" strokeWidth={1} />
            {[0, 100, 200, 300, 400].map((tick) => (
              <g key={tick}>
                <line x1={tick} y1={180} x2={tick} y2={185} stroke="#e9f2f6" strokeWidth={1} />
                <text x={tick} y={195} fill="#e9f2f6" fontSize={7} textAnchor="middle">
                  {tick}μm
                </text>
              </g>
            ))}
          </g>
        </svg>

        {p.title ? (
          <div
            style={{
              marginTop: 40,
              fontFamily: 'Helvetica, Arial, sans-serif',
              fontSize: 32,
              fontWeight: 300,
              letterSpacing: '0.1em',
              color: '#e9f2f6',
              borderTop: '1px solid #e9f2f6',
              paddingTop: 10,
              opacity: interpolate(frame, [span * 0.1, span * 0.3], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
            }}
          >
            {p.title.toUpperCase()}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};