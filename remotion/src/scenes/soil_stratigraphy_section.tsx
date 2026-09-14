import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const SoilStratigraphySectionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const opacity = p.enter * p.exit;

  const reveal = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textAnim = interpolate(frame, [span * 0.3, span * 0.6], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const waterPulse = interpolate(
    Math.sin((frame / fps) * 2),
    [-1, 1],
    [0.4, 0.7],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const layers = [
    { 
      id: 'sand', 
      depth: 1.5, 
      color: '#e0b44c', 
      label: 'FEINSAND (Labil)', 
      hatch: 'dots',
      desc: 'Kornfraktion 0.063-0.2mm'
    },
    { 
      id: 'silt', 
      depth: 2.5, 
      color: '#5b7f9c', 
      label: 'SCHLUFF (Wassergesättigt)', 
      hatch: 'waves',
      desc: 'Hoher Porenwasserdruck'
    },
    { 
      id: 'clay', 
      depth: 2.0, 
      color: '#8a949b', 
      label: 'TON / BASIS', 
      hatch: 'lines',
      desc: 'Tragfähiger Horizont'
    },
  ];

  const totalDepth = layers.reduce((acc, l) => acc + l.depth, 0);
  const svgWidth = 600;
  const svgHeight = 400;
  const margin = 60;
  const chartWidth = svgWidth - margin * 2;
  const chartHeight = svgHeight - margin * 2;

  let currentY = 0;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg
        width={width * 0.7}
        height={height * 0.7}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        style={{ overflow: 'visible' }}
      >
        <defs>
          <pattern id="dots" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#e9f2f6" opacity="0.4" />
            <circle cx="7" cy="6" r="0.8" fill="#e9f2f6" opacity="0.3" />
          </pattern>
          <pattern id="lines" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="10" stroke="#e9f2f6" strokeWidth="1" opacity="0.3" />
          </pattern>
          <pattern id="waves" x="0" y="0" width="20" height="10" patternUnits="userSpaceOnUse">
            <path d="M0 5 Q 5 0, 10 5 T 20 5" fill="none" stroke="#e9f2f6" strokeWidth="0.5" opacity="0.4" />
          </pattern>
          <clipPath id="revealClip">
            <rect x="0" y="0" width={svgWidth} height={svgHeight * reveal} />
          </clipPath>
        </defs>

        <g transform={`translate(${margin}, ${margin})`} clipPath="url(#revealClip)">
          {layers.map((layer, i) => {
            const layerHeight = (layer.depth / totalDepth) * chartHeight;
            const yPos = currentY;
            currentY += layerHeight;

            return (
              <g key={layer.id}>
                <rect
                  x="0"
                  y={yPos}
                  width={chartWidth}
                  height={layerHeight}
                  fill={layer.color}
                  fillOpacity={layer.id === 'silt' ? waterPulse : 0.6}
                  stroke="#e9f2f6"
                  strokeWidth="1"
                />
                <rect
                  x="0"
                  y={yPos}
                  width={chartWidth}
                  height={layerHeight}
                  fill={`url(#${layer.hatch})`}
                />
                
                {/* Leader lines and labels */}
                <g opacity={textAnim}>
                  <line
                    x1={chartWidth}
                    y1={yPos + layerHeight / 2}
                    x2={chartWidth + 30}
                    y2={yPos + layerHeight / 2}
                    stroke="#e9f2f6"
                    strokeWidth="1"
                  />
                  <text
                    x={chartWidth + 35}
                    y={yPos + layerHeight / 2 - 5}
                    fill="#e9f2f6"
                    fontSize="12"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {layer.label}
                  </text>
                  <text
                    x={chartWidth + 35}
                    y={yPos + layerHeight / 2 + 10}
                    fill="#e9f2f6"
                    fontSize="9"
                    fontFamily="monospace"
                    opacity="0.7"
                  >
                    {layer.desc}
                  </text>
                </g>
              </g>
            );
          })}

          {/* Vertical Dimension Line */}
          <g>
            <line x1="-15" y1="0" x2="-15" y2={chartHeight} stroke="#e9f2f6" strokeWidth="1.5" />
            {[0, 1.5, 4.0, 6.0].map((d, i) => {
              const y = (d / 6.0) * chartHeight;
              return (
                <g key={i}>
                  <line x1="-20" y1={y} x2="-10" y2={y} stroke="#e9f2f6" strokeWidth="1.5" />
                  <text
                    x="-45"
                    y={y + 4}
                    fill="#e9f2f6"
                    fontSize="10"
                    fontFamily="monospace"
                    textAnchor="end"
                  >
                    -{d.toFixed(1)}m
                  </text>
                </g>
              );
            })}
          </g>
        </g>

        {/* Technical annotations */}
        <g transform={`translate(${margin}, ${svgHeight - 20})`} opacity={textAnim}>
          <text fill="#e0b44c" fontSize="10" fontFamily="monospace">
            DIN 4022: Geotechnische Bodenbeschreibung
          </text>
          <text x={chartWidth} y="0" fill="#e9f2f6" fontSize="10" fontFamily="monospace" textAnchor="end">
            Schnitt A-A' | Maßstab 1:50
          </text>
        </g>
      </svg>

      {p.title && (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            color: '#e9f2f6',
            fontFamily: 'monospace',
            fontSize: 28,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            borderLeft: '4px solid #e0b44c',
            paddingLeft: 20,
            opacity: textAnim,
          }}
        >
          {p.title}
        </div>
      )}
    </AbsoluteFill>
  );
};