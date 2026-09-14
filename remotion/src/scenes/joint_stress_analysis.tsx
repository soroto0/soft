import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const JointStressAnalysisScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const opacity = p.enter * p.exit;

  const loadProgress = interpolate(frame, [0, span * 0.9], [0, 1], {
    easing: Easing.bezier(0.33, 1, 0.68, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const stressAlpha = interpolate(frame, [span * 0.4, span * 0.95], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const jitter = interpolate(frame, [span * 0.85, span], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  }) * Math.sin(frame * 1.2) * 2.5;

  const captionRise = interpolate(frame, [0, 30], [20, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const arrows = [0, 1, 2, 3, 4];
  const stressRings = [1, 2, 3, 4, 5, 6];
  const ticks = [0, 200, 400, 600, 800];

  const svgW = width * 0.7;
  const svgH = height * 0.7;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg
        width={svgW}
        height={svgH}
        viewBox="0 0 600 400"
        style={{ transform: `translateY(${jitter}px) translateX(${jitter * 0.5}px)` }}
      >
        <defs>
          <linearGradient id="stressGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#e9f2f6" />
            <stop offset="50%" stopColor="#e0b44c" />
            <stop offset="100%" stopColor="#d0523f" />
          </linearGradient>
        </defs>

        {/* Main Steel Plate Section */}
        <rect
          x="150"
          y="100"
          width="300"
          height="200"
          fill="none"
          stroke="#e9f2f6"
          strokeWidth="2"
          strokeDasharray="4 2"
          opacity={0.4}
        />

        {/* Bolt Hole and Bolt */}
        <circle cx="300" cy="200" r="45" fill="none" stroke="#e9f2f6" strokeWidth="1.5" />
        <circle cx="300" cy="200" r="40" fill="#e9f2f6" opacity={0.1} />
        <circle cx="300" cy="200" r="38" fill="none" stroke="#e9f2f6" strokeWidth="3" />

        {/* Stress Concentration Lines */}
        {stressRings.map((r) => (
          <ellipse
            key={r}
            cx="300"
            cy="200"
            rx={45 + r * 12 * loadProgress}
            ry={45 + r * 8 * loadProgress}
            fill="none"
            stroke={r > 4 ? '#d0523f' : '#e0b44c'}
            strokeWidth={0.5 + r * 0.2}
            opacity={stressAlpha * (1 - r / 8)}
          />
        ))}

        {/* Vertical Load Arrows */}
        {arrows.map((i) => {
          const xPos = 180 + i * 60;
          const yStart = 30;
          const yEnd = 30 + 50 * loadProgress;
          return (
            <g key={i} opacity={0.8}>
              <line
                x1={xPos}
                y1={yStart}
                x2={xPos}
                y2={yEnd}
                stroke="#e0b44c"
                strokeWidth="2"
              />
              <path
                d={`M ${xPos - 5} ${yEnd - 8} L ${xPos} ${yEnd} L ${xPos + 5} ${yEnd - 8}`}
                fill="none"
                stroke="#e0b44c"
                strokeWidth="2"
              />
            </g>
          );
        })}

        {/* Load Scale Axis */}
        <line x1="80" y1="100" x2="80" y2="300" stroke="#e9f2f6" strokeWidth="1" />
        {ticks.map((t) => (
          <g key={t}>
            <line x1="75" y1={300 - (t / 800) * 200} x2="85" y2={300 - (t / 800) * 200} stroke="#e9f2f6" strokeWidth="1" />
            <text x="65" y={305 - (t / 800) * 200} fill="#e9f2f6" fontSize="10" textAnchor="end" fontFamily="monospace">
              {t}
            </text>
          </g>
        ))}
        <text x="40" y="200" fill="#e9f2f6" fontSize="10" textAnchor="middle" transform="rotate(-90, 40, 200)">
          LOAD (kg/m²)
        </text>

        {/* Current Load Indicator */}
        <line
          x1="80"
          y1={300 - (loadProgress * 650 / 800) * 200}
          x2="150"
          y2={300 - (loadProgress * 650 / 800) * 200}
          stroke="#d0523f"
          strokeWidth="1"
          strokeDasharray="2 2"
        />
        <text
          x="155"
          y={305 - (loadProgress * 650 / 800) * 200}
          fill="#d0523f"
          fontSize="12"
          fontWeight="bold"
          fontFamily="monospace"
        >
          {Math.round(loadProgress * 650)} kg/m²
        </text>

        {/* Stress Gradient Legend */}
        <rect x="150" y="340" width="300" height="8" fill="url(#stressGrad)" />
        <text x="150" y="365" fill="#e9f2f6" fontSize="9" fontFamily="monospace">0 kg/m²</text>
        <text x="300" y="365" fill="#e9f2f6" fontSize="9" textAnchor="middle" fontFamily="monospace">NOMINAL</text>
        <text x="450" y="365" fill="#d0523f" fontSize="9" textAnchor="end" fontFamily="monospace">800 kg/m² (FAILURE)</text>

        {/* Technical Labels */}
        <text x="460" y="115" fill="#e9f2f6" fontSize="10" fontFamily="monospace" opacity={0.6}>PLATE: ASTM A36</text>
        <text x="460" y="130" fill="#e9f2f6" fontSize="10" fontFamily="monospace" opacity={0.6}>BOLT: M40 GRADE 8.8</text>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            transform: `translateY(${captionRise}px)`,
            color: '#e9f2f6',
            fontSize: 32,
            fontFamily: 'sans-serif',
            letterSpacing: '0.1em',
            borderTop: '1px solid #e9f2f6',
            paddingTop: 10,
            width: '60%',
            textAlign: 'center',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};