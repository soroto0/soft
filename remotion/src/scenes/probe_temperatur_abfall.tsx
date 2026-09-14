import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ProbeTemperaturAbfallScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));
  const opacity = p.enter * p.exit;

  const EO = {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  } as const;

  const drift = interpolate(frame, [0, span], [1, 1.04], EO);
  const axisX = interpolate(frame, [span * 0.05, span * 0.2], [0, 1], EO);
  const axisY = interpolate(frame, [span * 0.08, span * 0.23], [0, 1], EO);
  const gridFade = interpolate(frame, [span * 0.1, span * 0.25], [0, 0.35], EO);
  const curveDraw = interpolate(frame, [span * 0.15, span * 0.45], [0, 1], EO);
  
  const markerSpring = spring({
    frame: frame - Math.round(span * 0.4),
    fps,
    config: { damping: 12, stiffness: 200 },
  });

  const calloutLine = interpolate(frame, [span * 0.45, span * 0.6], [0, 1], EO);
  const textFade = interpolate(frame, [span * 0.55, span * 0.65], [0, 1], EO);
  const rise = interpolate(frame, [0, span * 0.15], [20, 0], EO);

  const tempCount = Math.round(interpolate(frame, [span * 0.45, span * 0.6], [0, 540], EO));
  const strengthCount = Math.round(interpolate(frame, [span * 0.45, span * 0.6], [100, 40], EO));

  const pathLength = 310;
  const L_VERT = 190 - 134;
  const L_HORZ = 249 - 60;

  const xTicks = [0, 200, 400, 600, 800];
  const yTicks = [0, 25, 50, 75, 100];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 250" style={{ overflow: 'visible' }}>
        <g transform={`translate(200 125) scale(${drift}) translate(-200 -125)`}>
          {/* Grid */}
          {yTicks.slice(1, -1).map((tick, i) => (
            <line
              key={`grid-y-${tick}`}
              x1={60}
              y1={190 - (tick / 100) * 140}
              x2={340}
              y2={190 - (tick / 100) * 140}
              stroke="#8a949b"
              strokeWidth={0.5}
              opacity={gridFade * (1 - i * 0.05)}
            />
          ))}
          {xTicks.slice(1, -1).map((tick, i) => (
            <line
              key={`grid-x-${tick}`}
              x1={60 + (tick / 800) * 280}
              y1={50}
              x2={60 + (tick / 800) * 280}
              y2={190}
              stroke="#8a949b"
              strokeWidth={0.5}
              opacity={gridFade * (1 - i * 0.05)}
            />
          ))}

          {/* Axes */}
          <line
            x1={60} y1={190} x2={340} y2={190}
            stroke="#e9f2f6" strokeWidth={1.5}
            transform={`translate(60 0) scale(${axisX} 1) translate(-60 0)`}
          />
          <line
            x1={60} y1={190} x2={60} y2={50}
            stroke="#e9f2f6" strokeWidth={1.5}
            transform={`translate(0 190) scale(1 ${axisY}) translate(0 -190)`}
          />

          {/* Ticks & Labels */}
          {xTicks.map((tick, i) => (
            <g key={tick} opacity={interpolate(frame, [span * (0.1 + i * 0.03), span * (0.2 + i * 0.03)], [0, 1], EO)}>
              <line x1={60 + (tick / 800) * 280} y1={190} x2={60 + (tick / 800) * 280} y2={195} stroke="#e9f2f6" strokeWidth={1} />
              <text x={60 + (tick / 800) * 280} y={208} fill="#8a949b" fontSize={7} textAnchor="middle" fontFamily="monospace">{tick}</text>
            </g>
          ))}
          <text x={345} y={208} fill="#8a949b" fontSize={7} fontFamily="monospace" opacity={axisX}>°C</text>

          {/* Curve */}
          <path
            d="M 60 50 Q 180 50, 249 134 T 340 176"
            fill="none"
            stroke="#e0b44c"
            strokeWidth={2.5}
            strokeDasharray={pathLength}
            strokeDashoffset={pathLength * (1 - curveDraw)}
          />

          {/* Callout Lines */}
          <line
            x1={249} y1={134} x2={249} y2={190}
            stroke="#d0523f" strokeWidth={1} strokeDasharray="4 2"
            strokeDashoffset={L_VERT * (1 - calloutLine)}
          />
          <line
            x1={249} y1={134} x2={60} y2={134}
            stroke="#d0523f" strokeWidth={1} strokeDasharray="4 2"
            strokeDashoffset={L_HORZ * (1 - calloutLine)}
          />

          {/* Accent Marker */}
          <g transform={`translate(249 134) scale(${markerSpring})`}>
            <circle r={4} fill="#d0523f" />
            <circle r={7} fill="none" stroke="#d0523f" strokeWidth={1} opacity={0.5} />
          </g>

          {/* Callout Labels with Plates */}
          <g opacity={textFade}>
            <rect x={230} y={212} width={38} height={14} rx={4} fill="#16202b" opacity={0.8} />
            <text x={249} y={222} fill="#d0523f" fontSize={9} fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
              {tempCount}°C
            </text>

            <rect x={15} y={126} width={36} height={14} rx={4} fill="#16202b" opacity={0.8} />
            <text x={33} y={136} fill="#d0523f" fontSize={9} fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
              {strengthCount}%
            </text>
          </g>

          {/* Y-axis Label */}
          <text
            x={55} y={45} fill="#8a949b" fontSize={7} textAnchor="end" fontFamily="monospace"
            transform="rotate(-90 55 45) translate(-40 0)"
            opacity={axisY}
          >
            FESTIGKEIT (%)
          </text>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            fontFamily: 'sans-serif',
            fontSize: height * 0.035,
            color: '#e9f2f6',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            transform: `translateY(${rise}px)`,
            opacity: interpolate(frame, [0, span * 0.2], [0, 1], EO),
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};