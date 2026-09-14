import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const GeographicalRouteScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const reveal = interpolate(frame, [0, span * 0.2], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const constriction = interpolate(frame, [span * 0.15, span * 0.8], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const flow = interpolate(frame, [0, span], [0, 100], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleRise = interpolate(frame, [span * 0.2, span * 0.5], [20, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const gridX = [200, 350, 500, 650];
  const gridY = [100, 200, 300, 400];
  const scaleTicks = [0, 1, 2, 3, 4];

  const pathsCount = 5;
  const pathways = Array.from({ length: pathsCount }).map((_, i) => {
    const ratio = i / (pathsCount - 1);
    const startY = interpolate(constriction, [0, 1], [80 + ratio * 340, 180 + ratio * 140]);
    const cp1Y = interpolate(constriction, [0, 1], [120 + ratio * 260, 220 + ratio * 60]);
    const cp2Y = interpolate(constriction, [0, 1], [250 + ratio * 100, 280 + ratio * 40]);

    return {
      id: i,
      d: `M 150 ${startY} C 350 ${cp1Y}, 550 ${cp2Y}, 700 300`,
    };
  });

  return (
    <AbsoluteFill
      style={{
        opacity,
        justifyContent: 'center',
        alignItems: 'center',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          width: width * 0.8,
          height: height * 0.7,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 800 500"
          style={{ overflow: 'visible' }}
        >
          {gridX.map((x) => (
            <line
              key={`grid-x-${x}`}
              x1={x}
              y1={50}
              x2={x}
              y2={450}
              stroke="#e9f2f6"
              strokeWidth={0.5}
              strokeOpacity={0.15 * reveal}
              strokeDasharray="4 4"
            />
          ))}
          {gridY.map((y) => (
            <line
              key={`grid-y-${y}`}
              x1={100}
              y1={y}
              x2={750}
              y2={y}
              stroke="#e9f2f6"
              strokeWidth={0.5}
              strokeOpacity={0.15 * reveal}
              strokeDasharray="4 4"
            />
          ))}

          <path
            d="M 700 50 L 700 280 M 700 320 L 700 450"
            stroke="#d0523f"
            strokeWidth={1.5}
            strokeOpacity={0.8 * reveal}
            fill="none"
          />
          
          <text
            x={715}
            y={120}
            fill="#d0523f"
            fontSize={10}
            fontFamily="monospace"
            letterSpacing={2}
            opacity={0.7 * reveal}
            transform="rotate(90, 715, 120)"
          >
            FRONTERA ESPAÑOLA
          </text>

          <circle
            cx={700}
            cy={300}
            r={6}
            fill="none"
            stroke="#e0b44c"
            strokeWidth={1.5}
            opacity={reveal}
          />
          <circle
            cx={700}
            cy={300}
            r={12 + 8 * Math.sin(flow * 0.1)}
            fill="none"
            stroke="#e0b44c"
            strokeWidth={0.75}
            opacity={0.5 * reveal}
          />
          <text
            x={720}
            y={304}
            fill="#e0b44c"
            fontSize={12}
            fontFamily="monospace"
            fontWeight="bold"
            letterSpacing={1}
            opacity={reveal}
          >
            PORTBOU
          </text>

          {pathways.map((path) => (
            <g key={`path-group-${path.id}`}>
              <path
                d={path.d}
                fill="none"
                stroke="#5c7a67"
                strokeWidth={24 - 14 * constriction}
                strokeOpacity={0.25 * reveal}
                strokeLinecap="round"
              />
              <path
                d={path.d}
                fill="none"
                stroke="#e9f2f6"
                strokeWidth={1.5}
                strokeOpacity={0.6 * reveal}
                strokeDasharray="8 12"
                strokeDashoffset={-flow * 1.5}
              />
            </g>
          ))}

          <path
            d={`M 150 ${50 + 100 * constriction} Q 450 ${100 + 150 * constriction}, 700 285`}
            fill="none"
            stroke="#d0523f"
            strokeWidth={2}
            strokeOpacity={0.4 * reveal}
            strokeDasharray="5 5"
          />
          <path
            d={`M 150 ${450 - 100 * constriction} Q 450 ${400 - 150 * constriction}, 700 315`}
            fill="none"
            stroke="#d0523f"
            strokeWidth={2}
            strokeOpacity={0.4 * reveal}
            strokeDasharray="5 5"
          />

          <path
            d="M 120 250 L 140 250 M 135 245 L 140 250 L 135 255"
            stroke="#e9f2f6"
            strokeWidth={1.5}
            fill="none"
            opacity={0.5 * reveal}
          />
          <text
            x={100}
            y={235}
            fill="#e9f2f6"
            fontSize={9}
            fontFamily="monospace"
            opacity={0.5 * reveal}
          >
            FLUJO DE ESCAPE
          </text>

          <g transform="translate(100, 420)" opacity={reveal}>
            <text x={0} y={-10} fill="#e9f2f6" fontSize={9} fontFamily="monospace" opacity={0.6}>
              PRESIÓN DE CIERRE (TRAMPA)
            </text>
            <rect x={0} y={0} width={150} height={6} fill="#e9f2f6" fillOpacity={0.2} />
            <rect x={0} y={0} width={150 * constriction} height={6} fill="#d0523f" />
            {scaleTicks.map((t) => (
              <line
                key={`tick-${t}`}
                x1={t * 37.5}
                y1={6}
                x2={t * 37.5}
                y2={10}
                stroke="#e9f2f6"
                strokeWidth={1}
                strokeOpacity={0.5}
              />
            ))}
            <text x={155} y={7} fill="#d0523f" fontSize={10} fontFamily="monospace" fontWeight="bold">
              {Math.round(constriction * 100)}%
            </text>
          </g>

          <g transform="translate(320, 420)" opacity={reveal}>
            <text x={0} y={-10} fill="#e9f2f6" fontSize={9} fontFamily="monospace" opacity={0.6}>
              ANCHO DEL EMBUDO
            </text>
            <text x={0} y={10} fill="#e0b44c" fontSize={14} fontFamily="monospace" fontWeight="bold">
              {Math.max(4, Math.round((1 - constriction * 0.85) * 120))} km
            </text>
          </g>
        </svg>

        {p.title ? (
          <div
            style={{
              marginTop: 20,
              transform: `translateY(${titleRise}px)`,
              fontFamily: "'Courier New', Courier, monospace",
              fontSize: 24,
              fontWeight: 'bold',
              letterSpacing: 2,
              color: '#e9f2f6',
              textTransform: 'uppercase',
              opacity: reveal,
            }}
          >
            {p.title}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};