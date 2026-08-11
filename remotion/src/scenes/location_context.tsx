import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const LocationContextScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const mapProgress = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pinScale = interpolate(frame, [span * 0.3, span * 0.5], [0, 1], {
    easing: Easing.back(1.5),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const humLevel = interpolate(frame, [span * 0.4, span * 0.85], [0, 0.88], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleAlpha = interpolate(frame, [span * 0.1, span * 0.3], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const gridLines = [0, 1, 2, 3, 4];
  const humTicks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 500 350" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="humGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#5b7f9c" />
            <stop offset="60%" stopColor="#e0b44c" />
            <stop offset="100%" stopColor="#d0523f" />
          </linearGradient>
        </defs>

        {/* Coordinate Grid */}
        {gridLines.map((i) => (
          <React.Fragment key={`grid-${i}`}>
            <line
              x1={50}
              y1={50 + i * 60}
              x2={350}
              y2={50 + i * 60}
              stroke="#e9f2f6"
              strokeWidth={0.5}
              strokeDasharray="2 4"
              opacity={mapProgress * 0.3}
            />
            <line
              x1={50 + i * 75}
              y1={50}
              x2={50 + i * 75}
              y2={290}
              stroke="#e9f2f6"
              strokeWidth={0.5}
              strokeDasharray="2 4"
              opacity={mapProgress * 0.3}
            />
          </React.Fragment>
        ))}

        {/* Coastline Schematic */}
        <path
          d="M 180,40 L 195,80 L 175,120 L 210,150 L 200,190 L 225,230 L 215,280 L 235,320"
          fill="none"
          stroke="#e9f2f6"
          strokeWidth={1.5}
          strokeDasharray="400"
          strokeDashoffset={400 * (1 - mapProgress)}
        />

        {/* Seattle Pin */}
        <g transform={`translate(215, 155) scale(${pinScale})`}>
          <circle r={6} fill="#d0523f" />
          <circle r={12} fill="none" stroke="#d0523f" strokeWidth={1} opacity={0.5}>
            <animate attributeName="r" from="6" to="18" dur="1.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" from="0.5" to="0" dur="1.5s" repeatCount="indefinite" />
          </circle>
          <text x={12} y={4} fill="#e9f2f6" fontSize={14} fontWeight="bold" fontFamily="monospace">
            SEATTLE
          </text>
        </g>

        {/* Humidity Gauge */}
        <g transform="translate(420, 70)">
          <text x={0} y={-15} fill="#e9f2f6" fontSize={10} textAnchor="middle" opacity={mapProgress}>
            HUMIDITY
          </text>
          <rect x={-8} y={0} width={16} height={200} fill="#1a1a1a" stroke="#e9f2f6" strokeWidth={0.5} />
          <rect x={-8} y={200 - 200 * humLevel} width={16} height={200 * humLevel} fill="url(#humGrad)" />
          
          {humTicks.map((t) => (
            <g key={`tick-${t}`} transform={`translate(0, ${200 - t * 200})`}>
              <line x1={8} y1={0} x2={14} y2={0} stroke="#e9f2f6" strokeWidth={1} />
              <text x={18} y={4} fill="#8a949b" fontSize={8}>
                {Math.round(t * 100)}%
              </text>
            </g>
          ))}

          <g transform={`translate(-25, ${200 - humLevel * 200})`}>
            <path d="M 0,0 L 10,-5 L 10,5 Z" fill="#e0b44c" />
            <text x={-5} y={4} fill="#e0b44c" fontSize={10} textAnchor="end" fontWeight="bold">
              HIGH
            </text>
          </g>
        </g>

        {/* Map Labels */}
        <text x={100} y={250} fill="#5b7f9c" fontSize={10} opacity={mapProgress * 0.6}>
          PACIFIC OCEAN
        </text>
        <text x={240} y={100} fill="#8a949b" fontSize={10} opacity={mapProgress * 0.6}>
          CASCADE RANGE
        </text>
        <text x={120} y={60} fill="#8a949b" fontSize={9} opacity={mapProgress * 0.4}>
          48.6° N / 122.3° W
        </text>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            color: '#e9f2f6',
            fontSize: 42,
            fontFamily: 'serif',
            letterSpacing: '0.05em',
            opacity: titleAlpha,
            borderTop: '1px solid #e0b44c',
            paddingTop: 10,
          }}
        >
          {p.title.toUpperCase()}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};