import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const StabilityCurveGraphScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const draw = interpolate(frame, [0, span * 0.5], [0, 1], {
    easing: Easing.bezier(0.33, 1, 0.68, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const marker = interpolate(frame, [span * 0.4, span * 0.7], [0, 1], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textAlpha = interpolate(frame, [span * 0.6, span * 0.9], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ticks = [0, 45, 90, 135, 180];
  const curves = [
    {
      id: 'extended',
      path: 'M 50 320 C 150 50, 350 50, 430 320',
      color: '#e9f2f6',
      label: 'Kiel ausgefahren',
      dash: 1200,
    },
    {
      id: 'retracted',
      path: 'M 50 320 C 100 200, 180 200, 212 320',
      color: '#e0b44c',
      label: 'Kiel eingezogen',
      dash: 800,
    },
  ];

  const criticalX = 212; // 73 degrees mapped: 50 + (73/180)*400

  return (
    <AbsoluteFill
      style={{
        opacity,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div style={{ width: width * 0.7, height: height * 0.6 }}>
        <svg viewBox="0 0 500 400" style={{ overflow: 'visible' }}>
          {/* Axes */}
          <line
            x1="50"
            y1="320"
            x2={50 + 420 * draw}
            y2="320"
            stroke="#e9f2f6"
            strokeWidth="2"
          />
          <line
            x1="50"
            y1="320"
            x2="50"
            y2={320 - 280 * draw}
            stroke="#e9f2f6"
            strokeWidth="2"
          />

          {/* Ticks and Labels */}
          {ticks.map((t) => {
            const x = 50 + (t / 180) * 400;
            return (
              <g key={t} opacity={draw}>
                <line x1={x} y1="320" x2={x} y2="328" stroke="#e9f2f6" strokeWidth="1" />
                <text
                  x={x}
                  y="345"
                  fill="#e9f2f6"
                  fontSize="12"
                  textAnchor="middle"
                  fontFamily="sans-serif"
                >
                  {t}°
                </text>
              </g>
            );
          })}

          <text
            x="30"
            y="60"
            fill="#e9f2f6"
            fontSize="12"
            textAnchor="end"
            transform="rotate(-90, 30, 60)"
            opacity={textAlpha}
          >
            AUFRICHTENDER HEBEL (GZ)
          </text>

          {/* Curves */}
          {curves.map((c) => (
            <g key={c.id}>
              <path
                d={c.path}
                fill="none"
                stroke={c.color}
                strokeWidth="3"
                strokeDasharray={c.dash}
                strokeDashoffset={c.dash * (1 - draw)}
              />
              <text
                x={c.id === 'extended' ? 350 : 160}
                y={c.id === 'extended' ? 120 : 220}
                fill={c.color}
                fontSize="14"
                opacity={textAlpha}
                fontFamily="sans-serif"
              >
                {c.label}
              </text>
            </g>
          ))}

          {/* Critical Point Marker */}
          <g opacity={marker}>
            <circle cx={criticalX} cy="320" r="5" fill="#d0523f" />
            <line
              x1={criticalX}
              y1="320"
              x2={criticalX}
              y2="260"
              stroke="#d0523f"
              strokeWidth="1.5"
              strokeDasharray="4 2"
            />
            <rect x={criticalX - 25} y="230" width="50" height="25" fill="#d0523f" rx="4" />
            <text
              x={criticalX}
              y="247"
              fill="#e9f2f6"
              fontSize="14"
              fontWeight="bold"
              textAnchor="middle"
              fontFamily="sans-serif"
            >
              73°
            </text>
            <text
              x={criticalX + 30}
              y="275"
              fill="#d0523f"
              fontSize="11"
              fontFamily="sans-serif"
            >
              KRITISCHER WINKEL
            </text>
          </g>
        </svg>
      </div>

      {p.title && (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            color: '#e9f2f6',
            fontSize: height * 0.04,
            fontFamily: 'serif',
            letterSpacing: '0.05em',
            opacity: textAlpha,
            borderTop: '1px solid #e9f2f6',
            paddingTop: '10px',
            width: '40%',
            textAlign: 'center',
          }}
        >
          {p.title}
        </div>
      )}
    </AbsoluteFill>
  );
};