import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const CrossSectionMechanismScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const drawProgress = interpolate(frame, [0, span * 0.25], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const buzz = interpolate(frame % 3, [0, 1.5, 3], [0.3, 1, 0.3], {
    easing: Easing.inOut(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const jitter = interpolate(frame % 2, [0, 1, 2], [-0.5, 0.5, -0.5], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const captionRise = interpolate(frame, [0, span * 0.2], [20, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const layers = [
    { y: 120, h: 15, label: 'PUENTE SUPERIOR', color: '#8a949b' },
    { y: 135, h: 8, label: 'RUBÍ SINTÉTICO', color: '#d0523f' },
    { y: 180, h: 20, label: 'PLATINA BASE', color: '#5d6a73' },
  ];

  const gearTeeth = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg
        width={width * 0.8}
        height={height * 0.8}
        viewBox="0 0 800 450"
        fill="none"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="#e9f2f6" strokeWidth="1" opacity="0.2" />
          </pattern>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Cross-section Layers */}
        {layers.map((layer, i) => (
          <g key={layer.label} opacity={drawProgress}>
            <rect
              x="300"
              y={layer.y}
              width="200"
              height={layer.h * drawProgress}
              fill={i % 2 === 0 ? 'url(#hatch)' : layer.color}
              stroke="#e9f2f6"
              strokeWidth="0.5"
            />
            <line
              x1="500"
              y1={layer.y + layer.h / 2}
              x2="540"
              y2={layer.y + layer.h / 2}
              stroke="#e9f2f6"
              strokeWidth="0.5"
            />
            <text
              x="545"
              y={layer.y + layer.h / 2 + 3}
              fill="#e9f2f6"
              fontSize="10"
              fontFamily="monospace"
            >
              {layer.label}
            </text>
          </g>
        ))}

        {/* Static Escape Wheel */}
        <g transform="translate(400, 165)" opacity={drawProgress}>
          <circle cx="0" cy="0" r="25" stroke="#e0b44c" strokeWidth="1.5" />
          {gearTeeth.map((angle) => (
            <rect
              key={angle}
              x="-2"
              y="-32"
              width="4"
              height="8"
              fill="#e0b44c"
              transform={`rotate(${angle})`}
            />
          ))}
          <text x="35" y="5" fill="#e0b44c" fontSize="10" fontFamily="monospace">RUEDA DE ESCAPE</text>
          <line x1="0" y1="0" x2="32" y2="0" stroke="#e0b44c" strokeWidth="0.5" strokeDasharray="2 2" />
        </g>

        {/* Vibration Emanation */}
        <g transform={`translate(${400 + jitter}, 165)`} filter="url(#glow)">
          {[1, 2, 3].map((r) => (
            <circle
              key={r}
              cx="0"
              cy="0"
              r={30 + r * 15}
              stroke="#a8e6cf"
              strokeWidth="1"
              strokeDasharray="10 20"
              opacity={buzz * (1 / r) * drawProgress}
            />
          ))}
          <path
            d="M -60 0 Q -40 -20 -20 0 T 20 0 T 60 0"
            stroke="#a8e6cf"
            strokeWidth="0.5"
            opacity={buzz * 0.6 * drawProgress}
            fill="none"
            transform="translate(0, 40)"
          />
        </g>

        {/* Static Hand (Segundero) */}
        <g transform="translate(400, 165)" opacity={drawProgress}>
          <line
            x1="0"
            y1="0"
            x2={jitter}
            y2="-80"
            stroke="#e9f2f6"
            strokeWidth="1"
          />
          <circle cx="0" cy="0" r="3" fill="#e9f2f6" />
          <text x="10" y="-70" fill="#e9f2f6" fontSize="9" fontFamily="monospace" opacity={0.7}>
            POSICIÓN 16:12:00
          </text>
        </g>

        {/* Technical Specs */}
        <g opacity={drawProgress * 0.6}>
          <text x="300" y="280" fill="#e9f2f6" fontSize="8" fontFamily="monospace">
            FRECUENCIA: 0.0 Hz (DETENIDO)
          </text>
          <text x="300" y="295" fill="#a8e6cf" fontSize="8" fontFamily="monospace">
            IMPULSO ELÉCTRICO DETECTADO: 1.2mV
          </text>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            transform: `translateY(${captionRise}px)`,
            fontFamily: 'monospace',
            fontSize: 28,
            color: '#e9f2f6',
            letterSpacing: '4px',
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