import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const CountableUncountableCardinalityScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const slide = interpolate(frame, [0, span], [0, 300], {
    easing: Easing.linear,
    extrapolateRight: 'clamp',
  });

  const density = interpolate(frame, [span * 0.1, span * 0.8], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const captionRise = interpolate(frame, [0, span * 0.2], [20, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const nodes = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  const dustPoints = Array.from({ length: 240 });
  const ticks = [0, 1, 2, 3, 4, 5];

  return (
    <AbsoluteFill
      style={{
        opacity,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <svg
        width={width * 0.8}
        height={height * 0.7}
        viewBox="0 0 800 400"
        style={{ overflow: 'visible' }}
      >
        {/* Top Section: Integers (Discrete) */}
        <text x="40" y="40" fill="#e9f2f6" fontSize="18" fontWeight="300" opacity={0.7}>
          CONJUNTO DISCRETO (ℤ)
        </text>
        <line x1="40" y1="120" x2="760" y2="120" stroke="#e9f2f6" strokeWidth="1" strokeDasharray="8 8" opacity={0.3} />
        
        {nodes.map((i) => {
          const xPos = ((i * 120 - slide) % 1080 + 1080) % 1080 - 140;
          return (
            <g key={i} transform={`translate(${xPos}, 120)`}>
              <rect
                x="-18"
                y="-18"
                width="36"
                height="36"
                rx="4"
                fill="#e0b44c"
                stroke="#e9f2f6"
                strokeWidth="1.5"
              />
              <text
                y="42"
                textAnchor="middle"
                fill="#e9f2f6"
                fontSize="14"
                fontFamily="monospace"
              >
                {Math.floor((slide + xPos) / 120)}
              </text>
            </g>
          );
        })}

        {/* Bottom Section: Reals (Continuous) */}
        <text x="40" y="220" fill="#e9f2f6" fontSize="18" fontWeight="300" opacity={0.7}>
          CONTINUO REAL (ℝ)
        </text>
        
        {/* The "infinite dust" settling into a dense line */}
        <g transform="translate(0, 300)">
          <line x1="40" y1="0" x2="760" y2="0" stroke="#e9f2f6" strokeWidth="0.5" opacity={0.2} />
          
          {dustPoints.map((_, i) => {
            // Deterministic pseudo-randomness using Math.sin
            const seed = i * 133.7;
            const offsetX = (i / dustPoints.length) * 720 + 40;
            const scatterY = Math.sin(seed) * 40 * (1 - density);
            const pointOpacity = interpolate(density, [0, 0.5], [0.3, 0.8]);
            const radius = interpolate(density, [0, 1], [0.8, 1.8]);
            
            return (
              <circle
                key={i}
                cx={offsetX}
                cy={scatterY}
                r={radius}
                fill="#88c070"
                opacity={pointOpacity}
              />
            );
          })}

          {/* Solid base line that emerges */}
          <rect
            x="40"
            y="-1"
            width="720"
            height="2"
            fill="#88c070"
            opacity={density * 0.6}
          />

          {/* Scale Ticks */}
          {ticks.map((t) => (
            <g key={t} transform={`translate(${40 + t * 144}, 0)`}>
              <line y1="5" y2="15" stroke="#e9f2f6" strokeWidth="1" />
              <text
                y="30"
                textAnchor="middle"
                fill="#e9f2f6"
                fontSize="10"
                opacity={0.6}
              >
                {(t * 0.2).toFixed(1)}
              </text>
            </g>
          ))}
        </g>

        {/* Comparison Indicator */}
        <path
          d="M 770 120 L 790 120 L 790 300 L 770 300"
          fill="none"
          stroke="#d0523f"
          strokeWidth="2"
          opacity={density}
        />
        <text
          x="800"
          y="210"
          fill="#d0523f"
          fontSize="12"
          transform="rotate(90, 800, 210)"
          opacity={density}
        >
          CARDINALIDAD ∞+
        </text>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            transform: `translateY(${captionRise}px)`,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: 42,
            fontWeight: 200,
            color: '#e9f2f6',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};