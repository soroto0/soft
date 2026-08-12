import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const SoilFluidizationScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const opacity = p.enter * p.exit;

  const rainIntensity = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const fluidity = interpolate(frame, [span * 0.2, span * 0.7], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pressure = interpolate(frame, [span * 0.4, span * 0.9], [0, 1], {
    easing: Easing.bezier(0.33, 1, 0.68, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleRise = interpolate(frame, [0, span * 0.2], [20, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { y: 40, h: 60, fill: '#8a949b', label: 'AUFSCHÜTTUNG' },
    { y: 100, h: 90, fill: '#5d6a73', label: 'SCHLAMMSCHICHT' },
    { y: 190, h: 70, fill: '#2d3a43', label: 'TRAGFÄHIGER BODEN' },
  ];

  const piles = [280, 340, 400];
  const arrows = [115, 135, 155, 175];
  const particles = Array.from({ length: 12 }).map((_, i) => i);

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="75%" viewBox="0 0 500 320" style={{ overflow: 'visible' }}>
        <defs>
          <clipPath id="mud-clip">
            <rect x="50" y="100" width="400" height="90" />
          </clipPath>
        </defs>

        {/* Soil Layers */}
        {layers.map((layer) => (
          <g key={layer.label}>
            <rect
              x="50"
              y={layer.y}
              width="400"
              height={layer.h}
              fill={layer.fill}
              stroke="#e9f2f6"
              strokeWidth="0.5"
              fillOpacity={layer.label === 'SCHLAMMSCHICHT' ? 0.6 + fluidity * 0.4 : 0.8}
            />
            <text
              x="55"
              y={layer.y + 15}
              fill="#e9f2f6"
              fontSize="8"
              fontWeight="bold"
              opacity="0.6"
            >
              {layer.label}
            </text>
          </g>
        ))}

        {/* Fluidity Texture (Waves) */}
        <g clipPath="url(#mud-clip)">
          {particles.map((i) => (
            <path
              key={i}
              d={`M ${70 + i * 30} ${110 + (i % 3) * 20} q 15 ${-10 * fluidity} 30 0`}
              fill="none"
              stroke="#e0b44c"
              strokeWidth="1.5"
              opacity={fluidity * 0.5}
              style={{
                transform: `translateX(${Math.sin(frame / 10 + i) * 5 * fluidity}px)`,
              }}
            />
          ))}
        </g>

        {/* Concrete Piles */}
        {piles.map((x, i) => (
          <g key={i}>
            <rect
              x={x}
              y="70"
              width="15"
              height="160"
              fill="#e9f2f6"
              stroke="#8a949b"
              strokeWidth="1"
            />
            {i === 0 && (
              <text x={x + 7.5} y="65" fill="#e9f2f6" fontSize="7" textAnchor="middle">
                BETONPFEILER
              </text>
            )}
          </g>
        ))}

        {/* Rain Visualization */}
        {particles.map((i) => (
          <line
            key={`rain-${i}`}
            x1={80 + i * 30}
            y1={20}
            x2={75 + i * 30}
            y2={35}
            stroke="#e9f2f6"
            strokeWidth="1"
            opacity={rainIntensity * 0.4}
            style={{
              transform: `translateY(${(frame * 5 + i * 20) % 60}px)`,
            }}
          />
        ))}

        {/* Pressure Arrows */}
        {arrows.map((y, i) => {
          const arrowX = 60 + pressure * 210;
          return (
            <g key={i} opacity={pressure}>
              <line
                x1="60"
                y1={y}
                x2={arrowX}
                y2={y}
                stroke="#d0523f"
                strokeWidth="2"
              />
              <path
                d={`M ${arrowX} ${y} l -8 -4 v 8 z`}
                fill="#d0523f"
              />
              {i === 0 && (
                <text x="60" y={y - 8} fill="#d0523f" fontSize="9" fontWeight="bold">
                  LATERALER DRUCK
                </text>
              )}
            </g>
          );
        })}

        {/* Scale/Labels */}
        <line x1="50" y1="280" x2="450" y2="280" stroke="#e9f2f6" strokeWidth="0.5" />
        {[0, 25, 50, 75, 100].map((tick) => (
          <g key={tick}>
            <line
              x1={50 + tick * 4}
              y1="280"
              x2={50 + tick * 4}
              y2="285"
              stroke="#e9f2f6"
              strokeWidth="0.5"
            />
            <text x={50 + tick * 4} y="295" fill="#e9f2f6" fontSize="6" textAnchor="middle">
              {tick}%
            </text>
          </g>
        ))}
        <text x="250" y="310" fill="#e9f2f6" fontSize="7" textAnchor="middle" opacity="0.7">
          SÄTTIGUNGSGRAD DER SCHLAMMSCHICHT
        </text>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            fontFamily: 'monospace',
            fontSize: 28,
            color: '#e9f2f6',
            letterSpacing: '2px',
            transform: `translateY(${titleRise}px)`,
            borderLeft: '4px solid #d0523f',
            paddingLeft: '15px',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};