import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const TimeLapseAccumulationScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 4) * fps));

  const opacity = p.enter * p.exit;

  const rotation = interpolate(frame, [0, span], [0, 720], {
    extrapolateRight: 'clamp',
  });

  const dustProgress = interpolate(frame, [span * 0.1, span * 0.9], [0, 1], {
    easing: Easing.bezier(0.4, 0, 0.2, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const uiAlpha = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const timeX = interpolate(frame, [0, span], [80, 320], {
    extrapolateRight: 'clamp',
  });

  const specks = [
    { x: 100, y: 60, offset: 0.0 },
    { x: 130, y: 40, offset: 0.1 },
    { x: 160, y: 70, offset: 0.05 },
    { x: 190, y: 30, offset: 0.2 },
    { x: 220, y: 55, offset: 0.15 },
    { x: 250, y: 45, offset: 0.02 },
    { x: 280, y: 65, offset: 0.12 },
    { x: 310, y: 35, offset: 0.08 },
    { x: 115, y: 80, offset: 0.18 },
    { x: 205, y: 85, offset: 0.22 },
    { x: 295, y: 75, offset: 0.04 },
  ];

  const layers = [
    { y: 240, h: 40, fill: '#5d6a73', label: 'SUBSTRATE' },
    { y: 220, h: 20, fill: '#e0b44c', label: 'TACKY ADHESIVE' },
  ];

  const ticks = [0, 12, 24, 36, 48];

  return (
    <AbsoluteFill
      style={{
        opacity,
        width,
        height,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <svg width="70%" viewBox="0 0 400 400" style={{ overflow: 'visible' }}>
        {/* Clock Element */}
        <g transform="translate(340, 60)" opacity={uiAlpha}>
          <circle cx="0" cy="0" r="35" fill="none" stroke="#e9f2f6" strokeWidth="1.5" />
          {[0, 90, 180, 270].map((deg) => (
            <line
              key={deg}
              x1="0"
              y1="-30"
              x2="0"
              y2="-35"
              stroke="#e9f2f6"
              strokeWidth="1.5"
              transform={`rotate(${deg})`}
            />
          ))}
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="-28"
            stroke="#e0b44c"
            strokeWidth="2"
            strokeLinecap="round"
            transform={`rotate(${rotation})`}
          />
          <text y="50" fill="#e9f2f6" fontSize="10" textAnchor="middle" fontFamily="monospace">
            48H CYCLE
          </text>
        </g>

        {/* Cross-section Layers */}
        {layers.map((layer) => (
          <g key={layer.label}>
            <rect
              x="60"
              y={layer.y}
              width="280"
              height={layer.h}
              fill={layer.fill}
              stroke="#e9f2f6"
              strokeWidth="0.5"
              opacity={0.9}
            />
            <text
              x="55"
              y={layer.y + layer.h / 2 + 4}
              fill="#e9f2f6"
              fontSize="8"
              textAnchor="end"
              opacity={uiAlpha}
            >
              {layer.label}
            </text>
          </g>
        ))}

        {/* Dust Specks */}
        {specks.map((s, i) => {
          const individualProgress = interpolate(
            dustProgress,
            [s.offset, 0.7 + s.offset],
            [0, 1],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          );
          const currentY = s.y + (225 - s.y) * individualProgress;
          return (
            <circle
              key={i}
              cx={s.x}
              cy={currentY}
              r="2.5"
              fill="#d0523f"
              stroke="#e9f2f6"
              strokeWidth="0.3"
            />
          );
        })}

        {/* Time Axis */}
        <g transform="translate(0, 340)" opacity={uiAlpha}>
          <line x1="80" y1="0" x2="320" y2="0" stroke="#e9f2f6" strokeWidth="1" />
          {ticks.map((t) => (
            <g key={t} transform={`translate(${80 + (t / 48) * 240}, 0)`}>
              <line x1="0" y1="0" x2="0" y2="6" stroke="#e9f2f6" strokeWidth="1" />
              <text y="18" fill="#e9f2f6" fontSize="9" textAnchor="middle">
                {t}h
              </text>
            </g>
          ))}
          <circle cx={timeX} cy="0" r="4" fill="#d0523f" />
          <text x="200" y="35" fill="#e9f2f6" fontSize="10" textAnchor="middle">
            ELAPSED EXPOSURE TIME
          </text>
        </g>

        {/* Leader Line for Dust */}
        <line x1="100" y1="100" x2="80" y2="80" stroke="#e9f2f6" strokeWidth="0.5" opacity={uiAlpha} />
        <text x="75" y="75" fill="#e9f2f6" fontSize="9" textAnchor="end" opacity={uiAlpha}>
          ATMOSPHERIC DUST
        </text>
      </svg>

      {p.title ? (
        <div
          style={{
            marginTop: 40,
            color: '#e9f2f6',
            fontSize: 28,
            fontFamily: 'serif',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            opacity: uiAlpha,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};