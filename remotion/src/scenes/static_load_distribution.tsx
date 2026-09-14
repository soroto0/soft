import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const StaticLoadDistributionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const opacity = p.enter * p.exit;

  const loadProgress = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const failure = interpolate(frame, [span * 0.35, span * 0.8], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const flicker = interpolate(Math.sin(frame * 0.8), [-1, 1], [0, 1]);
  const sink = failure * 12;

  const floors = [0, 1, 2];
  const shelfUnits = [0, 1, 2, 3, 4, 5, 6, 7];
  const forcePoints = [120, 200, 280, 360, 440];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg
        width={width * 0.8}
        height={height * 0.8}
        viewBox="0 0 600 400"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <pattern id="hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="4" stroke="#8a949b" strokeWidth="0.5" />
          </pattern>
        </defs>

        {/* Soil Layers */}
        <rect x="50" y="280" width="500" height="100" fill="#2a3238" />
        <rect x="50" y="280" width="500" height="40" fill="url(#hatch)" opacity={0.3} />
        <line x1="50" y1="280" x2="550" y2="280" stroke="#e9f2f6" strokeWidth="1" />
        <line x1="50" y1="320" x2="550" y2="320" stroke="#e9f2f6" strokeWidth="0.5" strokeDasharray="4 2" />
        <text x="60" y="310" fill="#8a949b" fontSize="8">KOMPAKTIERTER BODEN</text>
        <text x="60" y="340" fill="#8a949b" fontSize="8">FELSGESTEIN</text>

        {/* Building Structure */}
        <g style={{ transform: `translateY(${sink}px)` }}>
          {/* Foundation Slab */}
          <rect x="80" y="265" width="440" height="15" fill="#c9d3d9" stroke="#e9f2f6" strokeWidth="1" />
          <text x="525" y="276" fill="#e9f2f6" fontSize="9">FUNDAMENTPLATTE</text>

          {/* Floors and Shelves */}
          {floors.map((f) => (
            <g key={f} transform={`translate(0, ${-f * 50})`}>
              <line x1="100" y1="250" x2="500" y2="250" stroke="#e9f2f6" strokeWidth="1.5" />
              {shelfUnits.map((s) => (
                <rect
                  key={s}
                  x={120 + s * 50}
                  y={210}
                  width={15}
                  height={40}
                  fill="none"
                  stroke="#8a949b"
                  strokeWidth="0.8"
                />
              ))}
              <text x="85" y="245" fill="#8a949b" fontSize="8" textAnchor="end">EBENE 0{f + 1}</text>
            </g>
          ))}

          {/* Load Vectors (Gray) */}
          {forcePoints.map((x, i) => (
            <g key={`load-${i}`} opacity={loadProgress}>
              <line
                x1={x}
                y1={100}
                x2={x}
                y2={260}
                stroke="#8a949b"
                strokeWidth="2"
                strokeDasharray="5 3"
              />
              <path d={`M ${x-4} 255 L ${x} 265 L ${x+4} 255`} fill="#8a949b" />
            </g>
          ))}
          <text x="300" y="80" fill="#8a949b" fontSize="12" textAnchor="middle" opacity={loadProgress}>
            Σ 30.000 m ARCHIVGUT
          </text>
        </g>

        {/* Soil Resistance Vectors (Orange/Red) */}
        {forcePoints.map((x, i) => {
          const arrowLen = interpolate(failure, [0, 1], [40, 12]);
          const color = failure > 0.4 && flicker > 0.5 ? '#d0523f' : '#e0b44c';
          return (
            <g key={`soil-${i}`}>
              <line
                x1={x}
                y1={280 + sink}
                x2={x}
                y2={280 + sink - arrowLen}
                stroke={color}
                strokeWidth="3"
              />
              <path
                d={`M ${x-5} ${280 + sink - arrowLen + 8} L ${x} ${280 + sink - arrowLen} L ${x+5} ${280 + sink - arrowLen + 8}`}
                fill={color}
              />
            </g>
          );
        })}
        <text
          x="300"
          y={370}
          fill={failure > 0.6 ? '#d0523f' : '#e0b44c'}
          fontSize="10"
          textAnchor="middle"
          opacity={loadProgress}
        >
          {failure > 0.8 ? 'STRUKTURELLES VERSAGEN' : 'BODENWIDERSTAND'}
        </text>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            fontFamily: 'monospace',
            fontSize: 28,
            color: '#e9f2f6',
            letterSpacing: '2px',
            borderLeft: '4px solid #d0523f',
            paddingLeft: '16px',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};