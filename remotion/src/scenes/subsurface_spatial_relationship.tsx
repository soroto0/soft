import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const SubsurfaceSpatialRelationshipScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const opacity = p.enter * p.exit;

  const draw = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const excavation = interpolate(frame, [span * 0.2, span * 0.9], [0, 280], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [span * 0.5, span * 0.7], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { h: 80, fill: '#5d6a73', name: 'AUFFÜLLUNG', depth: '0-4m' },
    { h: 120, fill: '#8a949b', name: 'KIES / SAND', depth: '4-12m' },
    { h: 200, fill: '#4a545c', name: 'TERTIÄRSAND', depth: '12-35m' },
  ];

  const ticks = [0, 10, 20, 28, 35];

  return (
    <AbsoluteFill style={{ opacity }}>
      <div style={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <svg 
          width={width * 0.8} 
          height={height * 0.7} 
          viewBox="0 0 800 500" 
          style={{ overflow: 'visible' }}
        >
          <defs>
            <linearGradient id="pitGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#d0523f" stopOpacity="0.4" />
              <stop offset="1" stopColor="#d0523f" stopOpacity="0.1" />
            </linearGradient>
            <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="8" stroke="#e9f2f6" strokeWidth="0.5" opacity="0.3" />
            </pattern>
          </defs>

          {/* Soil Layers */}
          <g opacity={draw}>
            {layers.reduce((acc, layer, i) => {
              const prevHeight = layers.slice(0, i).reduce((sum, l) => sum + l.h, 0);
              acc.push(
                <g key={layer.name}>
                  <rect 
                    x="50" 
                    y={100 + prevHeight} 
                    width="700" 
                    height={layer.h} 
                    fill={layer.fill} 
                    opacity="0.2" 
                  />
                  <text 
                    x="60" 
                    y={115 + prevHeight} 
                    fill="#e9f2f6" 
                    fontSize="10" 
                    opacity="0.4"
                  >
                    {layer.name} ({layer.depth})
                  </text>
                </g>
              );
              return acc;
            }, [] as React.ReactNode[])}
          </g>

          {/* Depth Axis */}
          <g opacity={draw}>
            <line x1="50" y1="100" x2="50" y2="450" stroke="#e9f2f6" strokeWidth="1" />
            {ticks.map((t) => (
              <g key={t} transform={`translate(0, ${100 + t * 10})`}>
                <line x1="45" y1="0" x2="50" y2="0" stroke="#e9f2f6" strokeWidth="1" />
                <text x="35" y="4" fill="#e9f2f6" fontSize="12" textAnchor="end">-{t}m</text>
              </g>
            ))}
          </g>

          {/* Archive Foundation */}
          <g transform="translate(120, 100)">
            <rect 
              x="0" 
              y="-40" 
              width="180" 
              height="40" 
              fill="#e0b44c" 
              opacity={draw} 
            />
            <rect 
              x="20" 
              y="0" 
              width="140" 
              height="60" 
              fill="url(#hatch)" 
              stroke="#e0b44c" 
              strokeWidth="2" 
              opacity={draw} 
            />
            <text x="90" y="-50" fill="#e0b44c" fontSize="14" textAnchor="middle" opacity={labelFade}>
              HISTORISCHES ARCHIV
            </text>
            <text x="90" y="35" fill="#e9f2f6" fontSize="10" textAnchor="middle" opacity={labelFade}>
              FUNDAMENT
            </text>
          </g>

          {/* Schlitzwand (Diaphragm Wall) */}
          <rect 
            x="320" 
            y={100} 
            width="12" 
            height={350 * draw} 
            fill="#8a949b" 
            stroke="#e9f2f6" 
            strokeWidth="1" 
          />
          <text 
            x="326" 
            y={470} 
            fill="#e9f2f6" 
            fontSize="12" 
            textAnchor="middle" 
            opacity={labelFade}
          >
            SCHLITZWAND (40m)
          </text>

          {/* Construction Pit */}
          <rect 
            x="332" 
            y={100} 
            width="350" 
            height={excavation} 
            fill="url(#pitGradient)" 
            stroke="#d0523f" 
            strokeWidth="1" 
            strokeDasharray="4 2"
          />
          
          {/* Excavation Label */}
          <g transform={`translate(500, ${100 + excavation})`} opacity={labelFade}>
            <line x1="0" y1="0" x2="40" y2="40" stroke="#d0523f" strokeWidth="1" />
            <text x="45" y="55" fill="#d0523f" fontSize="16" fontWeight="bold">
              BAUGRUBE -28m
            </text>
          </g>

          {/* Proximity Dimension */}
          <g opacity={labelFade}>
            <line x1="300" y1="80" x2="320" y2="80" stroke="#e0b44c" strokeWidth="1" />
            <circle cx="300" cy="80" r="2" fill="#e0b44c" />
            <circle cx="320" cy="80" r="2" fill="#e0b44c" />
            <text x="310" y="70" fill="#e0b44c" fontSize="10" textAnchor="middle">MIN. ABSTAND</text>
          </g>
        </svg>

        {p.title ? (
          <div style={{
            marginTop: 40,
            fontFamily: 'monospace',
            fontSize: 28,
            color: '#e9f2f6',
            letterSpacing: 4,
            borderLeft: '4px solid #d0523f',
            paddingLeft: 20,
            opacity: labelFade
          }}>
            {p.title}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};