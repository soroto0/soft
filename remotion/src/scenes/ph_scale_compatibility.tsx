import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const PhScaleCompatibilityScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const intro = interpolate(frame, [0, span * 0.15], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const sliderX = interpolate(frame, [span * 0.2, span * 0.8], [250, 410], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const markerPop = interpolate(frame, [span * 0.35, span * 0.6], [0, 1], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;
  const ticks = [0, 2, 4, 6, 7, 8, 10, 12, 14];

  // pH 0 = 50, pH 7 = 250, pH 14 = 450 (Scale width 400)
  const getX = (ph: number) => 50 + (ph / 14) * 400;

  return (
    <AbsoluteFill
      style={{
        opacity,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <svg
        width={width * 0.8}
        height={height * 0.6}
        viewBox="0 0 500 300"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="phGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#d0523f" />
            <stop offset="50%" stopColor="#e9f2f6" />
            <stop offset="100%" stopColor="#e0b44c" />
          </linearGradient>
        </defs>

        {/* Main Scale Bar */}
        <rect
          x={50}
          y={140}
          width={400}
          height={24}
          fill="url(#phGradient)"
          rx={4}
          opacity={intro}
        />

        {/* Ticks and Numbers */}
        {ticks.map((t) => (
          <g key={t} opacity={intro}>
            <line
              x1={getX(t)}
              y1={164}
              x2={getX(t)}
              y2={172}
              stroke="#e9f2f6"
              strokeWidth={1}
            />
            <text
              x={getX(t)}
              y={188}
              fill="#e9f2f6"
              fontSize={10}
              textAnchor="middle"
              fontFamily="monospace"
            >
              {t}
            </text>
          </g>
        ))}

        {/* Region Labels */}
        <text x={100} y={130} fill="#d0523f" fontSize={12} opacity={intro * 0.7}>ACIDIC</text>
        <text x={250} y={130} fill="#e9f2f6" fontSize={12} textAnchor="middle" opacity={intro * 0.7}>NEUTRAL</text>
        <text x={400} y={130} fill="#e0b44c" fontSize={12} textAnchor="end" opacity={intro * 0.7}>ALKALINE</text>

        {/* Limescale Marker (pH ~9) */}
        <g opacity={markerPop}>
          <line
            x1={getX(9)}
            y1={140}
            x2={getX(9)}
            y2={90}
            stroke="#e9f2f6"
            strokeWidth={1}
            strokeDasharray="2 2"
          />
          <rect x={getX(9) - 40} y={65} width={80} height={25} fill="#1a1a1a" stroke="#e9f2f6" strokeWidth={0.5} />
          <text x={getX(9)} y={81} fill="#e9f2f6" fontSize={9} textAnchor="middle">LIMESCALE</text>
        </g>

        {/* Bleach Marker (pH ~12.5) */}
        <g opacity={markerPop}>
          <line
            x1={getX(12.5)}
            y1={140}
            x2={getX(12.5)}
            y2={90}
            stroke="#e9f2f6"
            strokeWidth={1}
            strokeDasharray="2 2"
          />
          <rect x={getX(12.5) - 35} y={65} width={70} height={25} fill="#1a1a1a" stroke="#e9f2f6" strokeWidth={0.5} />
          <text x={getX(12.5)} y={81} fill="#e9f2f6" fontSize={9} textAnchor="middle">BLEACH</text>
        </g>

        {/* Moving Slider Indicator */}
        <g transform={`translate(${sliderX - 250}, 0)`}>
          <path
            d="M 250 135 L 245 125 L 255 125 Z"
            fill="#e9f2f6"
            opacity={intro}
          />
          <line
            x1={250}
            y1={140}
            x2={250}
            y2={164}
            stroke="#e9f2f6"
            strokeWidth={2}
            opacity={intro}
          />
        </g>

        {/* Non-Reaction Zone Highlight */}
        <rect
          x={getX(8)}
          y={135}
          width={getX(14) - getX(8)}
          height={34}
          fill="none"
          stroke="#e0b44c"
          strokeWidth={1.5}
          strokeDasharray="4 2"
          opacity={markerPop * 0.5}
          rx={4}
        />
        <text
          x={getX(11)}
          y={215}
          fill="#e0b44c"
          fontSize={11}
          textAnchor="middle"
          opacity={markerPop}
        >
          SAME PHASE: NO REACTION
        </text>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.12,
            fontFamily: 'serif',
            fontSize: 32,
            color: '#e9f2f6',
            letterSpacing: '0.05em',
            opacity: intro,
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