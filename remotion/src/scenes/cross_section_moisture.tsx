import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const CrossSectionMoistureScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const reveal = interpolate(frame, [0, span * 0.2], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const sunPulse = interpolate(Math.sin((frame / fps) * 2), [-1, 1], [0.95, 1.05]);
  
  const heatFlow = interpolate(frame % 30, [0, 30], [0, 15], {
    easing: Easing.linear,
  });

  const moistureLevel = interpolate(Math.sin(frame * 0.1), [-1, 1], [0.4, 0.8]);

  const layers = [
    { id: 'asphalt', y: 100, h: 40, fill: '#333b41', name: 'ASPHALT WEARING COURSE' },
    { id: 'fiberglass', y: 140, h: 60, fill: '#4a545a', name: 'FIBERGLASS MATTING' },
    { id: 'substrate', y: 200, h: 40, fill: '#2a2f33', name: 'CONCRETE SUBSTRATE' },
  ];

  const droplets = [
    { x: 120, y: 155 }, { x: 160, y: 175 }, { x: 210, y: 150 },
    { x: 250, y: 185 }, { x: 280, y: 160 }, { x: 140, y: 180 },
    { x: 190, y: 165 }, { x: 230, y: 170 }, { x: 270, y: 145 },
  ];

  const hatchLines = Array.from({ length: 15 }).map((_, i) => i);
  const tempTicks = [
    { v: '48°C', y: 100 },
    { v: '35°C', y: 150 },
    { v: '22°C', y: 240 },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="75%" viewBox="0 0 400 320" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="heatGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d0523f" />
            <stop offset="50%" stopColor="#e0b44c" />
            <stop offset="100%" stopColor="#5b7f9c" />
          </linearGradient>
          <radialGradient id="dropGrad">
            <stop offset="0%" stopColor="#8eb6d4" />
            <stop offset="100%" stopColor="#5b7f9c" />
          </radialGradient>
        </defs>

        {/* Temperature Scale */}
        <g opacity={reveal}>
          <rect x={40} y={100} width={4} height={140} fill="url(#heatGrad)" />
          {tempTicks.map((tick) => (
            <g key={tick.v}>
              <line x1={35} y1={tick.y} x2={45} y2={tick.y} stroke="#e9f2f6" strokeWidth={1} />
              <text x={30} y={tick.y + 3} fill="#e9f2f6" fontSize={8} textAnchor="end">{tick.v}</text>
            </g>
          ))}
          <text x={20} y={170} fill="#e9f2f6" fontSize={7} transform="rotate(-90, 20, 170)" textAnchor="middle">THERMAL GRADIENT</text>
        </g>

        {/* Sun Icon */}
        <g transform={`translate(340, 50) scale(${sunPulse})`} opacity={reveal}>
          <circle cx={0} cy={0} r={15} fill="#e0b44c" />
          {Array.from({ length: 8 }).map((_, i) => (
            <line
              key={i}
              x1={0} y1={20} x2={0} y2={28 + heatFlow / 3}
              stroke="#e0b44c"
              strokeWidth={2}
              transform={`rotate(${i * 45})`}
            />
          ))}
        </g>

        {/* Heat Rays */}
        {Array.from({ length: 5 }).map((_, i) => (
          <path
            key={i}
            d={`M ${100 + i * 50} ${40 + heatFlow} L ${100 + i * 50} ${60 + heatFlow}`}
            stroke="#d0523f"
            strokeWidth={1.5}
            strokeOpacity={0.4}
            opacity={reveal}
          />
        ))}

        {/* Layers */}
        {layers.map((layer, idx) => (
          <g key={layer.id} opacity={reveal}>
            <rect
              x={80}
              y={layer.y}
              width={280 * reveal}
              height={layer.h}
              fill={layer.fill}
              stroke="#e9f2f6"
              strokeWidth={0.5}
            />
            {/* Hatching for Fiberglass */}
            {layer.id === 'fiberglass' && hatchLines.map((h) => (
              <line
                key={h}
                x1={80 + h * 20} y1={140}
                x2={100 + h * 20} y2={200}
                stroke="#e9f2f6"
                strokeWidth={0.3}
                strokeOpacity={0.2}
              />
            ))}
            {/* Leader Lines */}
            <line
              x1={360} y1={layer.y + layer.h / 2}
              x2={375} y2={layer.y + layer.h / 2}
              stroke="#e9f2f6"
              strokeWidth={0.5}
            />
            <text
              x={380}
              y={layer.y + layer.h / 2 + 3}
              fill="#e9f2f6"
              fontSize={7}
              textAnchor="start"
            >
              {layer.name}
            </text>
          </g>
        ))}

        {/* Moisture Droplets */}
        <g opacity={reveal}>
          {droplets.map((drop, i) => (
            <circle
              key={i}
              cx={drop.x}
              cy={drop.y}
              r={2.5}
              fill="url(#dropGrad)"
              opacity={moistureLevel}
            />
          ))}
        </g>

        {/* Moisture Label */}
        <g opacity={reveal * moistureLevel}>
          <line x1={210} y1={165} x2={210} y2={260} stroke="#5b7f9c" strokeWidth={1} strokeDasharray="2 2" />
          <text x={210} y={275} fill="#5b7f9c" fontSize={9} textAnchor="middle" fontWeight="bold">
            TRAPPED MOISTURE
          </text>
        </g>
      </svg>

      {p.title ? (
        <div style={{
          position: 'absolute',
          bottom: '10%',
          color: '#e9f2f6',
          fontSize: 32,
          fontFamily: 'sans-serif',
          letterSpacing: '0.1em',
          opacity: reveal,
          transform: `translateY(${(1 - reveal) * 20}px)`
        }}>
          {p.title.toUpperCase()}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};