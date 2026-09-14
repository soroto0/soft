import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const RoofLayersScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const explode = interpolate(frame, [0, span * 0.6], [0, 1], {
    easing: Easing.bezier(0.33, 1, 0.68, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelAlpha = interpolate(frame, [span * 0.4, span * 0.8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleY = interpolate(frame, [0, span * 0.3], [20, 0], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { name: 'STAHLBETONDECKE', h: 15, color: '#5d6a73', gap: 0 },
    { name: 'ABDICHTUNGSLAGE', h: 4, color: '#d0523f', gap: 35 },
    { name: 'WÄRMEDÄMMUNG', h: 20, color: '#c9d3d9', gap: 70 },
    { name: 'DRAINAGE-ELEMENTE', h: 12, color: '#e0b44c', gap: 110 },
    { name: 'FILTERVLIES', h: 2, color: '#e9f2f6', gap: 145 },
    { name: 'VEGETATIONSSUBSTRAT', h: 30, color: '#5b7f9c', gap: 180 },
    { name: 'BETONSTEINBELAG', h: 10, color: '#8a949b', gap: 240 },
  ];

  const pebbles = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const specks = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
  const stones = [0, 1, 2, 3, 4, 5];

  const baseY = 380;
  const rectWidth = 280;
  const startX = 100;

  return (
    <AbsoluteFill style={{ 
      opacity, 
      justifyContent: 'center', 
      alignItems: 'center' 
    }}>
      <svg 
        width={width * 0.85} 
        height={height * 0.85} 
        viewBox="0 0 800 500" 
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="soilGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5b7f9c" />
            <stop offset="1" stopColor="#3a566e" />
          </linearGradient>
        </defs>

        {layers.map((layer, i) => {
          const yPos = baseY - layer.gap * explode - layer.h;
          return (
            <g key={layer.name}>
              {/* Main Layer Rect */}
              <rect
                x={startX}
                y={yPos}
                width={rectWidth}
                height={layer.h}
                fill={layer.name === 'VEGETATIONSSUBSTRAT' ? 'url(#soilGrad)' : layer.color}
                stroke="#e9f2f6"
                strokeWidth={0.5}
              />

              {/* Texture for Drainage */}
              {layer.name === 'DRAINAGE-ELEMENTE' && pebbles.map((p) => (
                <circle
                  key={p}
                  cx={startX + 15 + p * 23}
                  cy={yPos + 6}
                  r={3}
                  fill="#e9f2f6"
                  opacity={0.4}
                />
              ))}

              {/* Texture for Soil */}
              {layer.name === 'VEGETATIONSSUBSTRAT' && specks.map((s) => (
                <rect
                  key={s}
                  x={startX + 10 + (s * 17) % (rectWidth - 20)}
                  y={yPos + 5 + (s * 7) % 20}
                  width={2}
                  height={2}
                  fill="#e9f2f6"
                  opacity={0.2}
                />
              ))}

              {/* Texture for Paving Stones */}
              {layer.name === 'BETONSTEINBELAG' && stones.map((s) => (
                <line
                  key={s}
                  x1={startX + (s + 1) * (rectWidth / 6)}
                  y1={yPos}
                  x2={startX + (s + 1) * (rectWidth / 6)}
                  y2={yPos + layer.h}
                  stroke="#e9f2f6"
                  strokeWidth={1}
                />
              ))}

              {/* Callout Leaders */}
              <line
                x1={startX + rectWidth + 10}
                y1={yPos + layer.h / 2}
                x2={startX + rectWidth + 60}
                y2={yPos + layer.h / 2}
                stroke="#e9f2f6"
                strokeWidth={1}
                opacity={labelAlpha}
              />
              
              {/* Labels */}
              <text
                x={startX + rectWidth + 70}
                y={yPos + layer.h / 2 + 4}
                fill="#e9f2f6"
                fontSize={12}
                fontFamily="monospace"
                opacity={labelAlpha}
              >
                {layer.name}
              </text>
              
              {/* Index Number */}
              <text
                x={startX - 25}
                y={yPos + layer.h / 2 + 4}
                fill={layer.color}
                fontSize={10}
                fontWeight="bold"
                opacity={explode}
              >
                0{layers.length - i}
              </text>
            </g>
          );
        })}

        {/* Vertical Axis Line */}
        <line
          x1={startX - 10}
          y1={baseY + 10}
          x2={startX - 10}
          y2={baseY - 260 * explode}
          stroke="#e9f2f6"
          strokeWidth={1}
          strokeDasharray="4 2"
          opacity={0.5}
        />
      </svg>

      {p.title ? (
        <div style={{
          position: 'absolute',
          bottom: height * 0.12,
          color: '#e9f2f6',
          fontSize: 32,
          fontWeight: 300,
          letterSpacing: '0.1em',
          fontFamily: 'sans-serif',
          transform: `translateY(${titleY}px)`,
          opacity: labelAlpha,
          borderLeft: '4px solid #e0b44c',
          paddingLeft: 20
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};