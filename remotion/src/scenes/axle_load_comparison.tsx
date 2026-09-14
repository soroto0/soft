import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const AxleLoadComparisonScene: React.FC<SceneProps> = (p) => {
  const { width, height, fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const opacity = p.enter * p.exit;
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const reveal = interpolate(frame, [0, span * 0.2], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const loadGrow = interpolate(frame, [span * 0.25, span * 0.55], [0, 1], {
    easing: Easing.elastic(1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const fatiguePulse = interpolate(frame, [span * 0.6, span * 0.9], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const trains = [
    {
      id: 'req',
      label: 'AUSSCHREIBUNG (SOLL)',
      y: 140,
      weight: '12.5 t',
      color: '#e0b44c',
      arrowLen: 40,
      isHeavy: false,
    },
    {
      id: 'actual',
      label: 'CAF LIEFERUNG (IST)',
      y: 300,
      weight: '15.2 t',
      color: '#d0523f',
      arrowLen: 70,
      isHeavy: true,
    },
  ];

  const wheels = [180, 240, 520, 580];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg
        width={width * 0.8}
        height={height * 0.8}
        viewBox="0 0 800 450"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="0"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" />
          </marker>
        </defs>

        {trains.map((t, i) => (
          <g key={t.id} opacity={reveal} style={{ transform: `translateX(${(1 - reveal) * (i === 0 ? -20 : 20)}px)` }}>
            {/* Train Body */}
            <rect
              x="150"
              y={t.y - 40}
              width="460"
              height="60"
              fill="none"
              stroke="#e9f2f6"
              strokeWidth="2"
              strokeOpacity={0.8}
            />
            <rect
              x="160"
              y={t.y - 30}
              width="440"
              height="40"
              fill="#e9f2f6"
              fillOpacity={0.1}
            />
            
            {/* Labels */}
            <text x="150" y={t.y - 55} fill="#e9f2f6" fontSize="14" fontWeight="bold" letterSpacing="1">
              {t.label}
            </text>
            
            {/* Wheels and Load Arrows */}
            {wheels.map((wx) => (
              <g key={wx}>
                <circle
                  cx={wx}
                  cy={t.y + 20}
                  r="12"
                  fill="none"
                  stroke="#e9f2f6"
                  strokeWidth="2"
                />
                <line
                  x1={wx}
                  y1={t.y + 35}
                  x2={wx}
                  y2={t.y + 35 + t.arrowLen * loadGrow}
                  stroke={t.color}
                  strokeWidth="3"
                  markerEnd="url(#arrowhead)"
                  color={t.color}
                />
              </g>
            ))}

            {/* Weight Value */}
            <text
              x="620"
              y={t.y + 10}
              fill={t.color}
              fontSize="24"
              fontWeight="bold"
              opacity={loadGrow}
            >
              {t.weight}
            </text>
            <text x="620" y={t.y + 30} fill="#e9f2f6" fontSize="10" opacity={loadGrow}>
              PRO ACHSE
            </text>

            {/* Fatigue Visualization for the heavy train */}
            {t.isHeavy && (
              <g opacity={fatiguePulse}>
                <path
                  d="M 350 300 L 360 290 L 370 305 L 380 295"
                  fill="none"
                  stroke="#d0523f"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                />
                <path
                  d="M 420 300 L 430 310 L 440 295 L 450 305"
                  fill="none"
                  stroke="#d0523f"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                />
                <text x="350" y="335" fill="#d0523f" fontSize="12" fontWeight="bold">
                  MATERIALERMÜDUNG
                </text>
              </g>
            )}
          </g>
        ))}

        {/* Scale Ticks */}
        <line x1="100" y1="380" x2="700" y2="380" stroke="#e9f2f6" strokeWidth="1" opacity={0.3} />
        {[0, 200, 400, 600].map((tick) => (
          <line
            key={tick}
            x1={100 + tick}
            y1="380"
            x2={100 + tick}
            y2="390"
            stroke="#e9f2f6"
            strokeWidth="1"
            opacity={0.3}
          />
        ))}
      </svg>

      {p.title && (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            color: '#e9f2f6',
            fontSize: 32,
            fontFamily: 'sans-serif',
            letterSpacing: 2,
            textTransform: 'uppercase',
            opacity: reveal,
            transform: `translateY(${(1 - reveal) * 20}px)`,
          }}
        >
          {p.title}
        </div>
      )}
    </AbsoluteFill>
  );
};