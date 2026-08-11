import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const GeologicalFissuresScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const reveal = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const fissureProgress = interpolate(frame, [span * 0.2, span * 0.7], [0, 1], {
    easing: Easing.inOut(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const cavityGlow = interpolate(frame, [span * 0.5, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { y: 40, h: 60, fill: '#c9d3d9', label: 'VERWITTERUNGSZONE' },
    { y: 100, h: 100, fill: '#aab4bb', label: 'RHYOLITH-MASSIV' },
    { y: 200, h: 60, fill: '#8a949b', label: 'BASAL-KONTAKT' },
  ];

  const fissures = [80, 120, 160, 200, 240, 280, 320];
  const cavities = [
    { x: 105, y: 130, r: 8 },
    { x: 215, y: 160, r: 12 },
    { x: 290, y: 110, r: 6 },
    { x: 150, y: 180, r: 10 },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ width: width * 0.8, height: height * 0.7, position: 'relative' }}>
        <svg
          viewBox="0 0 400 300"
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
        >
          {/* Rock Layers */}
          {layers.map((layer, i) => (
            <g key={layer.label} opacity={reveal}>
              <rect
                x="40"
                y={layer.y}
                width="320"
                height={layer.h * reveal}
                fill={layer.fill}
                stroke="#e9f2f6"
                strokeWidth="0.5"
              />
              <text
                x="45"
                y={layer.y + 12}
                fill="#e9f2f6"
                fontSize="6"
                fontFamily="monospace"
                opacity={reveal * 0.7}
              >
                {layer.label}
              </text>
            </g>
          ))}

          {/* Vertical Fissures (Klüfte) */}
          {fissures.map((x, i) => (
            <line
              key={`fissure-${i}`}
              x1={x}
              y1="40"
              x2={x + (i % 2 === 0 ? 2 : -2)}
              y2={40 + 220 * fissureProgress}
              stroke="#e9f2f6"
              strokeWidth="0.8"
              strokeDasharray="2 2"
              opacity={fissureProgress}
            />
          ))}

          {/* Cavities (Hohlräume) */}
          {cavities.map((c, i) => (
            <g key={`cavity-${i}`} opacity={cavityGlow}>
              <circle
                cx={c.x}
                cy={c.y}
                r={c.r}
                fill="#d0523f"
                fillOpacity="0.4"
                stroke="#e0b44c"
                strokeWidth="1"
              />
              <path
                d={`M ${c.x} ${c.y} L ${c.x + 30} ${c.y - 20}`}
                stroke="#e0b44c"
                strokeWidth="0.5"
                fill="none"
              />
              <text
                x={c.x + 32}
                y={c.y - 22}
                fill="#e0b44c"
                fontSize="5"
                fontFamily="sans-serif"
              >
                HOHLRAUM
              </text>
            </g>
          ))}

          {/* Scale Axis */}
          <g opacity={reveal}>
            <line x1="370" y1="40" x2="370" y2="260" stroke="#e9f2f6" strokeWidth="1" />
            {[0, 50, 100, 150, 200].map((tick) => (
              <g key={tick}>
                <line x1="370" y1={40 + tick} x2="375" y2={40 + tick} stroke="#e9f2f6" strokeWidth="1" />
                <text x="380" y={43 + tick} fill="#e9f2f6" fontSize="6" fontFamily="monospace">{tick}m</text>
              </g>
            ))}
          </g>
        </svg>

        {p.title && (
          <div
            style={{
              position: 'absolute',
              bottom: -60,
              width: '100%',
              textAlign: 'center',
              color: '#e9f2f6',
              fontFamily: 'Helvetica, Arial, sans-serif',
              fontSize: 32,
              letterSpacing: '0.1em',
              opacity: reveal,
              transform: `translateY(${(1 - reveal) * 20}px)`,
            }}
          >
            {p.title}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};