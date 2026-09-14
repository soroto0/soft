import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const WaterIngressPointScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const opacity = p.enter * p.exit;
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const waterLevel = interpolate(frame, [0, span], [420, 240], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const markerScale = interpolate(frame, [span * 0.7, span * 0.9], [0, 1], {
    easing: Easing.back(2),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const contentFade = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const hullLayers = [
    { x: 380, w: 12, fill: '#8a949b', name: 'AUSSENHAUT (STAHL)' },
    { x: 392, w: 25, fill: '#5d6a73', name: 'SPANTEN / ISOLIERUNG' },
    { x: 417, w: 8, fill: '#c9d3d9', name: 'INNENVERKLEIDUNG' },
  ];

  const deckLevels = [
    { y: 120, label: 'DECK 6', h: '+6.2m' },
    { y: 240, label: 'DECK 5', h: '+2.8m' },
    { y: 360, label: 'DECK 4', h: '-0.6m' },
  ];

  const ticks = [0, 1, 2, 3, 4, 5];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width={width * 0.8} height={height * 0.8} viewBox="0 0 800 500">
        <defs>
          <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3a6f94" stopOpacity="0.6" />
            <stop offset="1" stopColor="#1e405a" stopOpacity="0.9" />
          </linearGradient>
          <pattern id="hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="10" stroke="#e9f2f6" strokeWidth="1" opacity="0.2" />
          </pattern>
        </defs>

        {/* Water Body */}
        <rect x="50" y={waterLevel} width="330" height={500 - waterLevel} fill="url(#waterGrad)" />
        <line x1="50" y1={waterLevel} x2="380" y2={waterLevel} stroke="#e9f2f6" strokeWidth="2" />
        
        {/* Hull Structure with Pilot Door Gap */}
        <g opacity={contentFade}>
          {hullLayers.map((layer) => (
            <g key={layer.name}>
              {/* Top part of hull */}
              <rect x={layer.x} y="50" width={layer.w} height="180" fill={layer.fill} stroke="#18222d" strokeWidth="0.5" />
              {/* Bottom part of hull */}
              <rect x={layer.x} y="260" width={layer.w} height="200" fill={layer.fill} stroke="#18222d" strokeWidth="0.5" />
              <text x={layer.x + layer.w + 10} y={440 + (hullLayers.indexOf(layer) * 15)} fill="#8a949b" fontSize="9">
                {layer.name}
              </text>
            </g>
          ))}
          {/* Hatching for cut metal */}
          <rect x="380" y="50" width="45" height="180" fill="url(#hatch)" pointerEvents="none" />
          <rect x="380" y="260" width="45" height="200" fill="url(#hatch)" pointerEvents="none" />
        </g>

        {/* Decks */}
        {deckLevels.map((deck) => (
          <g key={deck.label} opacity={contentFade}>
            <line x1="425" y1={deck.y} x2="700" y2={deck.y} stroke="#e9f2f6" strokeWidth="1" strokeDasharray="4 2" />
            <text x="710" y={deck.y + 4} fill="#e9f2f6" fontSize="12">{deck.label} ({deck.h})</text>
          </g>
        ))}

        {/* Height Axis */}
        <line x1="50" y1="50" x2="50" y2="460" stroke="#e9f2f6" strokeWidth="1" />
        {ticks.map((t) => (
          <g key={t}>
            <line x1="45" y1={460 - t * 80} x2="55" y2={460 - t * 80} stroke="#e9f2f6" strokeWidth="1" />
            <text x="20" y={464 - t * 80} fill="#8a949b" fontSize="10" textAnchor="middle">{t}m</text>
          </g>
        ))}

        {/* Ingress Point Marker */}
        <g transform={`translate(380, ${waterLevel})`} opacity={markerScale}>
          <circle r={12 * markerScale} fill="none" stroke="#e0b44c" strokeWidth="3" />
          <circle r={4 * markerScale} fill="#d0523f" />
          <line x1="-20" y1="0" x2="20" y2="0" stroke="#e0b44c" strokeWidth="1" />
          <line x1="0" y1="-20" x2="0" y2="20" stroke="#e0b44c" strokeWidth="1" />
          <text x="15" y="-15" fill="#e0b44c" fontSize="14" fontWeight="bold">EINTRITTSÖFFNUNG</text>
        </g>

        {/* Labels */}
        <text x="380" y="250" fill="#e9f2f6" fontSize="11" textAnchor="end" opacity={contentFade}>OFFENE LOTSENPFORTE</text>
        <text x="60" y={waterLevel - 10} fill="#e9f2f6" fontSize="10" opacity={contentFade}>ATLANTIK-WASSERLINIE</text>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            color: '#e9f2f6',
            fontSize: 42,
            fontFamily: 'sans-serif',
            letterSpacing: '0.1em',
            borderTop: '2px solid #d0523f',
            paddingTop: 10,
            opacity: contentFade,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};