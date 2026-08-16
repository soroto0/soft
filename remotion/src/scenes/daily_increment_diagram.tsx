import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const DailyIncrementDiagramScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const intro = interpolate(frame, [0, span * 0.1], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const rise = interpolate(frame, [span * 0.15, span * 0.8], [0, 4], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labels = interpolate(frame, [span * 0.6, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;
  const ticks = [0, 1, 2, 3, 4];

  return (
    <AbsoluteFill
      style={{
        opacity,
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: "'Segoe UI', Arial, sans-serif",
      }}
    >
      <svg width="70%" viewBox="0 0 500 400" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="waterGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#3a5a78" />
            <stop offset="50%" stopColor="#5b7f9c" />
            <stop offset="100%" stopColor="#8db3d1" />
          </linearGradient>
          <clipPath id="damClip">
            <polygon points="150,350 350,350 320,100 180,100" />
          </clipPath>
        </defs>

        {/* Dam Structure */}
        <polygon
          points="150,350 350,350 320,100 180,100"
          fill="#8a949b"
          stroke="#e9f2f6"
          strokeWidth="2"
          opacity={intro}
        />

        {/* Water Level */}
        <rect
          x="150"
          y={350 - rise * 50}
          width="200"
          height={rise * 50}
          fill="url(#waterGrad)"
          clipPath="url(#damClip)"
          opacity={0.8 * intro}
        />

        {/* Scale Ticks */}
        {ticks.map((t) => (
          <g key={t} opacity={intro}>
            <line
              x1="140"
              y1={350 - t * 50}
              x2="155"
              y2={350 - t * 50}
              stroke="#e9f2f6"
              strokeWidth="1"
            />
            <text
              x="130"
              y={355 - t * 50}
              fill="#e9f2f6"
              fontSize="12"
              textAnchor="end"
            >
              {t} FT
            </text>
          </g>
        ))}

        {/* Comparison: Safety Increment (1ft) */}
        <g opacity={labels}>
          <line
            x1="370"
            y1="350"
            x2="390"
            y2="350"
            stroke="#e9f2f6"
            strokeWidth="1.5"
          />
          <line
            x1="370"
            y1="300"
            x2="390"
            y2="300"
            stroke="#e9f2f6"
            strokeWidth="1.5"
          />
          <line
            x1="380"
            y1="350"
            x2="380"
            y2="300"
            stroke="#e9f2f6"
            strokeWidth="1.5"
            strokeDasharray="4 2"
          />
          <text x="400" y="330" fill="#e9f2f6" fontSize="10">
            VORSCHRIFT (+1 FT)
          </text>
        </g>

        {/* Comparison: Actual Increment (4ft) */}
        <g opacity={labels}>
          <line
            x1="370"
            y1="350"
            x2="420"
            y2="350"
            stroke="#d0523f"
            strokeWidth="2"
          />
          <line
            x1="370"
            y1="150"
            x2="420"
            y2="150"
            stroke="#d0523f"
            strokeWidth="2"
          />
          <line
            x1="410"
            y1="350"
            x2="410"
            y2="150"
            stroke="#d0523f"
            strokeWidth="2"
          />
          <text
            x="425"
            y="255"
            fill="#d0523f"
            fontSize="14"
            fontWeight="bold"
          >
            MAI 1976 (+4 FT)
          </text>
        </g>

        {/* Current Level Indicator */}
        <line
          x1="150"
          y1={350 - rise * 50}
          x2="350"
          y2={350 - rise * 50}
          stroke={rise > 1.2 ? '#d0523f' : '#e0b44c'}
          strokeWidth="2"
          strokeDasharray="5 3"
          opacity={intro}
        />
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            color: '#e9f2f6',
            fontSize: 42,
            fontWeight: 300,
            letterSpacing: '0.1em',
            opacity: intro,
            transform: `translateY(${(1 - labels) * 20}px)`,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};