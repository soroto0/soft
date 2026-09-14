import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const StressDistributionMapScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round(p.dur * fps));

  const opacity = p.enter * p.exit;

  const load = interpolate(frame, [0, span], [450, 680], {
    easing: Easing.bezier(0.4, 0, 0.2, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const progress = interpolate(load, [580, 640], [0, 25], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleY = interpolate(frame, [0, fps * 0.5], [20, 0], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const jitter = interpolate(frame % 2, [0, 1, 2], [0, 1.5, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  }) * (load > 600 ? 1 : 0);

  const grid = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];
  const ticks = [450, 500, 550, 600, 650];

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
      <div
        style={{
          width: '80%',
          height: '60%',
          transform: `translate(${jitter}px, ${jitter}px)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <svg viewBox="0 0 300 300" width="100%" height="100%">
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Grid Squares */}
          {grid.map((i) => {
            const x = (i % 5) * 50 + 25;
            const y = Math.floor(i / 5) * 50 + 25;
            const isActive = progress > i;
            const isDanger = load > 600 && isActive;

            return (
              <rect
                key={i}
                x={x}
                y={y}
                width={46}
                height={46}
                fill={isDanger ? '#d0523f' : isActive ? '#e0b44c' : '#2d3748'}
                fillOpacity={isActive ? 0.8 : 0.2}
                stroke="#e9f2f6"
                strokeWidth={0.5}
                style={{ transition: 'fill 0.1s ease-out' }}
              />
            );
          })}

          {/* Structural Nodes */}
          {grid.map((i) => {
            const x = (i % 5) * 50 + 25;
            const y = Math.floor(i / 5) * 50 + 25;
            return (
              <circle
                key={`node-${i}`}
                cx={x}
                cy={y}
                r={2}
                fill="#e9f2f6"
                opacity={0.6}
              />
            );
          })}

          {/* Load Scale */}
          <g transform="translate(285, 25)">
            <line x1={0} y1={0} x2={0} y2={246} stroke="#e9f2f6" strokeWidth={1} />
            {ticks.map((t) => {
              const ty = interpolate(t, [450, 650], [246, 0]);
              return (
                <g key={t} transform={`translate(0, ${ty})`}>
                  <line x1={0} y1={0} x2={5} y2={0} stroke="#e9f2f6" strokeWidth={1} />
                  <text
                    x={8}
                    y={3}
                    fill={t === 600 ? '#d0523f' : '#e9f2f6'}
                    fontSize={8}
                    fontFamily="monospace"
                  >
                    {t}
                  </text>
                </g>
              );
            })}
            {/* Current Load Indicator */}
            <polygon
              points="-8,-4 0,0 -8,4"
              fill={load > 600 ? '#d0523f' : '#e9f2f6'}
              transform={`translate(0, ${interpolate(load, [450, 650], [246, 0], { extrapolateRight: 'clamp' })})`}
            />
          </g>

          {/* Digital Counter */}
          <rect x={25} y={280} width={100} height={20} fill="#1a202c" rx={2} />
          <text
            x={30}
            y={294}
            fill={load > 600 ? '#d0523f' : '#e0b44c'}
            fontSize={12}
            fontFamily="monospace"
            fontWeight="bold"
            filter={load > 600 ? 'url(#glow)' : ''}
          >
            {load.toFixed(1)} kg/m²
          </text>

          {/* Failure Warning */}
          {load > 600 && (
            <text
              x={150}
              y={150}
              fill="#d0523f"
              fontSize={14}
              fontFamily="sans-serif"
              textAnchor="middle"
              fontWeight="bold"
              filter="url(#glow)"
              opacity={interpolate(frame % 10, [0, 5, 10], [0.4, 1, 0.4])}
            >
              CRITICAL FAILURE
            </text>
          )}
        </svg>
      </div>

      {p.title ? (
        <div
          style={{
            marginTop: 40,
            transform: `translateY(${titleY}px)`,
            fontFamily: 'Helvetica, Arial, sans-serif',
            fontSize: 28,
            letterSpacing: '0.1em',
            color: load > 600 ? '#d0523f' : '#e9f2f6',
            textAlign: 'center',
            borderTop: `1px solid ${load > 600 ? '#d0523f' : '#e9f2f6'}`,
            paddingTop: 10,
            width: '60%',
          }}
        >
          {p.title.toUpperCase()}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};