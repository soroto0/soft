import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ChemicalReactionOverTimeScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const { fps, width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const span = Math.max(1, Math.round((p.dur || 4) * fps));

  const progress = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const moistureValue = interpolate(progress, [0, 1], [8, 15]);
  const hourValue = interpolate(progress, [0, 1], [0, 4]);

  const woodLayers = [
    { y: 220, h: 6, fill: '#e9f2f6', label: 'VERSIEGELUNG', dash: '0' },
    { y: 226, h: 24, fill: '#e0b44c', label: 'HOLZFASERN', dash: '4 2' },
    { y: 250, h: 30, fill: '#b08d3c', label: 'HOLZKERN', dash: '0' },
  ];

  const xTicks = [0, 1, 2, 3, 4];
  const yTicks = [8, 10, 12, 14, 16];

  const particles = Array.from({ length: 15 }).map((_, i) => {
    const seed = i * 137.5;
    const xPos = 80 + (seed % 240);
    const delay = (seed % 60);
    const pFrame = (frame + delay) % 60;
    const pY = interpolate(pFrame, [0, 60], [220, 150], {
      extrapolateRight: 'clamp',
    });
    const pOpac = interpolate(pFrame, [0, 15, 45, 60], [0, 1, 1, 0]);
    return { x: xPos, y: pY, opac: pOpac, id: i };
  });

  const graphX = interpolate(progress, [0, 1], [80, 320]);
  const graphY = interpolate(progress, [0, 1], [130, 60]);

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width={width * 0.8} height={height * 0.8} viewBox="0 0 400 320">
        {/* Moisture Graph */}
        <g>
          <line x1="80" y1="140" x2="320" y2="140" stroke="#e9f2f6" strokeWidth="1" />
          <line x1="80" y1="40" x2="80" y2="140" stroke="#e9f2f6" strokeWidth="1" />
          
          {xTicks.map((t) => (
            <g key={`x-${t}`}>
              <line x1={80 + t * 60} y1="140" x2={80 + t * 60} y2="145" stroke="#e9f2f6" strokeWidth="1" />
              <text x={80 + t * 60} y="155" fill="#e9f2f6" fontSize="8" textAnchor="middle">{t}h</text>
            </g>
          ))}
          
          {yTicks.map((t) => (
            <g key={`y-${t}`}>
              <line x1="75" y1={140 - (t - 8) * 10} x2="80" y2={140 - (t - 8) * 10} stroke="#e9f2f6" strokeWidth="1" />
              <text x="70" y={143 - (t - 8) * 10} fill="#e9f2f6" fontSize="8" textAnchor="end">{t}%</text>
            </g>
          ))}

          <path
            d={`M 80 130 L ${graphX} ${graphY}`}
            fill="none"
            stroke="#d0523f"
            strokeWidth="2"
          />
          
          <circle cx={graphX} cy={graphY} r="3" fill="#d0523f" />
          <text x={graphX + 5} y={graphY - 5} fill="#d0523f" fontSize="10" fontWeight="bold">
            {moistureValue.toFixed(1)}%
          </text>
          <text x="200" y="30" fill="#e9f2f6" fontSize="10" textAnchor="middle" opacity={0.7}>
            HOLZFEUCHTIGKEIT ÜBER ZEIT
          </text>
        </g>

        {/* Formaldehyde Particles */}
        {particles.map((p) => (
          <circle
            key={p.id}
            cx={p.x}
            cy={p.y}
            r="2"
            fill="#7eb37e"
            opacity={p.opac * progress}
          />
        ))}

        {/* Wood Cross-Section */}
        <g>
          {woodLayers.map((layer, i) => (
            <g key={layer.label}>
              <rect
                x="80"
                y={layer.y}
                width="240"
                height={layer.h}
                fill={layer.fill}
                stroke="#1a1a1a"
                strokeWidth="0.5"
              />
              {layer.dash !== '0' && (
                <line
                  x1="85"
                  y1={layer.y + layer.h / 2}
                  x2="315"
                  y2={layer.y + layer.h / 2}
                  stroke="#1a1a1a"
                  strokeWidth="0.5"
                  strokeDasharray={layer.dash}
                  opacity={0.3}
                />
              )}
              <line
                x1="320"
                y1={layer.y + layer.h / 2}
                x2="340"
                y2={layer.y + layer.h / 2}
                stroke="#e9f2f6"
                strokeWidth="0.5"
                strokeDasharray="2 2"
              />
              <text
                x="345"
                y={layer.y + layer.h / 2 + 3}
                fill="#e9f2f6"
                fontSize="7"
                textAnchor="start"
              >
                {layer.label}
              </text>
            </g>
          ))}
          
          {/* Pores on sealant */}
          {Array.from({ length: 8 }).map((_, i) => (
            <circle
              key={`pore-${i}`}
              cx={95 + i * 30}
              cy="220"
              r="1.5"
              fill="#7eb37e"
              opacity={0.8}
            />
          ))}
        </g>

        {/* Time Indicator */}
        <text x="200" y="180" fill="#e0b44c" fontSize="12" textAnchor="middle">
          ZEITVERLAUF: {hourValue.toFixed(1)} STUNDEN
        </text>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            fontFamily: 'sans-serif',
            fontSize: 40,
            color: '#e9f2f6',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            borderTop: '1px solid #e9f2f6',
            paddingTop: 10,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};