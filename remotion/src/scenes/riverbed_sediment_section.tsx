import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const RiverbedSedimentSectionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const reveal = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const glow = interpolate(frame, [span * 0.3, span * 0.9], [0.4, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const slide = interpolate(frame, [span * 0.1, span * 0.6], [40, 0], {
    easing: Easing.out(Easing.back(1.2)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { id: 'crust', name: 'ARMORED KEY CRUST', color: 'url(#keyGrad)', h: 50, label: 'OXIDIZED METAL' },
    { id: 'silt', name: 'ORGANIC SILT', color: '#8a949b', h: 90, label: 'FINE SEDIMENT' },
    { id: 'sand', name: 'COMPACTED SAND', color: '#5d6a73', h: 80, label: 'ALLUVIAL DEPOSIT' },
  ];

  const ticks = [0, 1, 2, 3];
  const keyIcons = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <AbsoluteFill style={{ opacity, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
      <svg width={width * 0.8} height={height * 0.7} viewBox="0 0 800 500">
        <defs>
          <linearGradient id="keyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e0b44c" />
            <stop offset="50%" stopColor="#d0523f" />
            <stop offset="100%" stopColor="#e0b44c" />
          </linearGradient>
          <pattern id="hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="10" stroke="#e9f2f6" strokeWidth="0.5" opacity="0.3" />
          </pattern>
        </defs>

        {/* Depth Axis */}
        <line x1="100" y1="50" x2="100" y2="400" stroke="#e9f2f6" strokeWidth="2" opacity={reveal} />
        {ticks.map((t) => (
          <g key={t} opacity={reveal}>
            <line x1="90" y1={50 + t * 100} x2="110" y2={50 + t * 100} stroke="#e9f2f6" strokeWidth="2" />
            <text x="80" y={55 + t * 100} fill="#e9f2f6" fontSize="14" textAnchor="end" fontFamily="monospace">
              -{t}.0m
            </text>
          </g>
        ))}

        {/* Layers */}
        <g transform="translate(150, 50)">
          {layers.map((layer, i) => {
            const prevHeights = layers.slice(0, i).reduce((acc, curr) => acc + curr.h, 0);
            return (
              <g key={layer.id}>
                <rect
                  x="0"
                  y={prevHeights}
                  width={500 * reveal}
                  height={layer.h}
                  fill={layer.color}
                  stroke="#e9f2f6"
                  strokeWidth="1"
                />
                {layer.id === 'crust' && (
                  <rect x="0" y={prevHeights} width={500 * reveal} height={layer.h} fill="url(#hatch)" />
                )}
                
                {/* Leader Lines and Labels */}
                <g opacity={reveal}>
                  <line 
                    x1={510} 
                    y1={prevHeights + layer.h / 2} 
                    x2={550 + slide} 
                    y2={prevHeights + layer.h / 2} 
                    stroke="#e9f2f6" 
                    strokeWidth="1" 
                  />
                  <text 
                    x={560 + slide} 
                    y={prevHeights + layer.h / 2 - 5} 
                    fill="#e9f2f6" 
                    fontSize="16" 
                    fontWeight="bold"
                  >
                    {layer.name}
                  </text>
                  <text 
                    x={560 + slide} 
                    y={prevHeights + layer.h / 2 + 15} 
                    fill="#8a949b" 
                    fontSize="12"
                  >
                    {layer.label}
                  </text>
                </g>

                {/* Key Icons in Crust */}
                {layer.id === 'crust' && keyIcons.map((k) => (
                  <path
                    key={k}
                    d="M 0 0 L 12 0 L 12 4 L 8 4 L 8 8 L 4 8 L 4 4 L 0 4 Z"
                    fill="#e9f2f6"
                    opacity={glow * (k % 2 === 0 ? 0.8 : 0.4)}
                    transform={`translate(${40 + k * 45}, ${15 + (k % 3) * 10}) rotate(${k * 36})`}
                  />
                ))}
              </g>
            );
          })}
        </g>

        <text x="400" y="460" fill="#e9f2f6" fontSize="12" textAnchor="middle" opacity={0.6} letterSpacing="2">
          VERTICAL SECTION: SEINE RIVERBED ARCH 4
        </text>
      </svg>

      {p.title ? (
        <div style={{
          marginTop: 20,
          color: '#e9f2f6',
          fontSize: 42,
          fontFamily: 'Helvetica, Arial, sans-serif',
          fontWeight: 300,
          letterSpacing: '0.1em',
          transform: `translateY(${slide}px)`,
          borderTop: '1px solid #e9f2f6',
          paddingTop: 10
        }}>
          {p.title.toUpperCase()}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};