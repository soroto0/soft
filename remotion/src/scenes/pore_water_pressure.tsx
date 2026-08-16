import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const PoreWaterPressureScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const pressure = interpolate(frame, [span * 0.1, span * 0.8], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const arrowPop = interpolate(frame, [span * 0.2, span * 0.5], [0, 1], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const frictionLoss = interpolate(frame, [span * 0.4, span * 0.9], [1, 0.2], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const particles = [
    { x: 140, y: 100, r: 38 },
    { x: 210, y: 85, r: 42 },
    { x: 270, y: 130, r: 35 },
    { x: 230, y: 190, r: 45 },
    { x: 150, y: 210, r: 40 },
    { x: 90, y: 160, r: 36 },
  ];

  const forces = [
    { x: 180, y: 120, deg: -30 },
    { x: 230, y: 130, deg: 45 },
    { x: 200, y: 170, deg: 120 },
    { x: 140, y: 160, deg: 210 },
  ];

  const layers = [
    { h: 40, fill: '#8a949b', label: 'HUMUS' },
    { h: 60, fill: '#c9d3d9', label: 'SEDIMENT' },
    { h: 50, fill: '#5d6a73', label: 'FELS' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg
        width={width * 0.8}
        height={height * 0.8}
        viewBox="0 0 400 300"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="pressGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#5b7f9c" />
            <stop offset="50%" stopColor="#e0b44c" />
            <stop offset="100%" stopColor="#d0523f" />
          </linearGradient>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#5b7f9c" />
          </marker>
        </defs>

        {/* Soil Profile Schematic */}
        <g transform="translate(10, 20)">
          {layers.map((layer, i) => {
            const prevH = layers.slice(0, i).reduce((acc, l) => acc + l.h, 0);
            return (
              <g key={layer.label}>
                <rect x="0" y={prevH * 0.4} width="40" height={layer.h * 0.4} fill={layer.fill} stroke="#e9f2f6" strokeWidth="0.5" />
                <text x="45" y={prevH * 0.4 + 10} fill="#e9f2f6" fontSize="6" fontWeight="bold">{layer.label}</text>
              </g>
            );
          })}
          <line x1="20" y1="0" x2="20" y2="60" stroke="#5b7f9c" strokeWidth="1.5" strokeDasharray="2 2" opacity={pressure} />
        </g>

        {/* Matrix Background Water */}
        <path
          d="M 80 150 Q 200 50 320 150 Q 200 250 80 150"
          fill="#5b7f9c"
          opacity={0.2 + pressure * 0.3}
        />

        {/* Particles */}
        {particles.map((p, i) => (
          <circle
            key={i}
            cx={p.x + (p.x - 200) * 0.05 * pressure}
            cy={p.y + (p.y - 150) * 0.05 * pressure}
            r={p.r}
            fill="#e0b44c"
            stroke="#e9f2f6"
            strokeWidth="1"
          />
        ))}

        {/* Friction Lines (Contact points) */}
        <g opacity={frictionLoss}>
          <line x1="175" y1="95" x2="185" y2="95" stroke="#d0523f" strokeWidth="2" />
          <line x1="245" y1="110" x2="255" y2="110" stroke="#d0523f" strokeWidth="2" />
          <line x1="210" y1="150" x2="220" y2="150" stroke="#d0523f" strokeWidth="2" />
          <text x="200" y="70" fill="#d0523f" fontSize="8" textAnchor="middle">REIBUNGSKONTROLLPUNKTE</text>
        </g>

        {/* Pressure Vectors */}
        {forces.map((f, i) => (
          <g key={i} transform={`translate(${f.x}, ${f.y}) rotate(${f.deg})`}>
            <line
              x1="0"
              y1="0"
              x2={30 * arrowPop}
              y2="0"
              stroke="#5b7f9c"
              strokeWidth="3"
              markerEnd="url(#arrowhead)"
              opacity={arrowPop}
            />
          </g>
        ))}

        {/* Pressure Gauge */}
        <g transform="translate(340, 50)">
          <rect x="0" y="0" width="15" height="150" fill="none" stroke="#e9f2f6" strokeWidth="1" />
          <rect
            x="0"
            y={150 - 150 * pressure}
            width="15"
            height={150 * pressure}
            fill="url(#pressGrad)"
          />
          <text x="20" y="10" fill="#d0523f" fontSize="8">MAX</text>
          <text x="20" y="150" fill="#5b7f9c" fontSize="8">MIN</text>
          <text x="-10" y="170" fill="#e9f2f6" fontSize="9" fontWeight="bold">PORENWASSERDRUCK (u)</text>
          
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <line key={t} x1="0" y1={150 * t} x2="-5" y2={150 * t} stroke="#e9f2f6" strokeWidth="0.5" />
          ))}
        </g>

        {/* Labels */}
        <text x="140" y="105" fill="#e9f2f6" fontSize="7" textAnchor="middle" opacity={0.8}>PARTIKEL</text>
        <text x="200" y="260" fill="#5b7f9c" fontSize="10" textAnchor="middle" fontWeight="bold" opacity={pressure}>
          HYDROSTATISCHER AUFTRIEB ↑
        </text>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            fontFamily: 'sans-serif',
            fontSize: 42,
            fontWeight: 'bold',
            color: '#e9f2f6',
            letterSpacing: '2px',
            textShadow: '0 4px 10px rgba(0,0,0,0.3)',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};