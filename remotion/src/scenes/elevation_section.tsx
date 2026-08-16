import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ElevationSectionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const drawDam = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const drawDim = interpolate(frame, [span * 0.3, span * 0.6], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const showLeak = interpolate(frame, [span * 0.55, span * 0.8], [0, 1], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pulse = interpolate(
    frame % 30,
    [0, 15, 30],
    [1, 1.2, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const layers = [
    {
      name: 'STÜTZKÖRPER',
      points: '50,240 150,60 250,60 400,240',
      fill: '#5d6a73',
    },
    {
      name: 'FILTERSCHICHT',
      points: '80,240 165,80 235,80 360,240',
      fill: '#8a949b',
    },
    {
      name: 'DICHTUNGSKERN',
      points: '130,240 185,100 215,100 270,240',
      fill: '#c9d3d9',
    },
  ];

  const ticks = [
    { m: '0 m', y: 60 },
    { m: '5 m', y: 90 },
    { m: '10 m', y: 120 },
    { m: '15 m', y: 150 },
  ];

  return (
    <AbsoluteFill
      style={{
        opacity,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div style={{ width: width * 0.8, height: height * 0.7, position: 'relative' }}>
        <svg
          viewBox="0 0 500 300"
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
        >
          <defs>
            <clipPath id="damClip">
              <rect x="0" y={240 - 180 * drawDam} width="500" height={180 * drawDam} />
            </clipPath>
          </defs>

          {/* Dam Layers */}
          <g clipPath="url(#damClip)">
            {layers.map((layer) => (
              <polygon
                key={layer.name}
                points={layer.points}
                fill={layer.fill}
                stroke="#e9f2f6"
                strokeWidth="0.5"
              />
            ))}
          </g>

          {/* Base Line */}
          <line
            x1="30"
            y1="240"
            x2="470"
            y2="240"
            stroke="#e9f2f6"
            strokeWidth="1"
            strokeDasharray={drawDam > 0 ? '0' : '4 4'}
          />

          {/* Water Level (Upstream) */}
          <g opacity={drawDam}>
            <line x1="30" y1="80" x2="166" y2="80" stroke="#e0b44c" strokeWidth="1.5" />
            <text x="40" y="75" fill="#e0b44c" fontSize="8" fontWeight="bold">
              WASSERSSPIEGEL
            </text>
          </g>

          {/* Dimension Line */}
          <g opacity={drawDim}>
            <line
              x1="430"
              y1="60"
              x2="430"
              y2={60 + 90 * drawDim}
              stroke="#e9f2f6"
              strokeWidth="1"
            />
            {ticks.map((tick, i) => (
              <g key={tick.m} opacity={interpolate(drawDim, [i * 0.25, (i + 1) * 0.25], [0, 1])}>
                <line x1="425" y1={tick.y} x2="435" y2={tick.y} stroke="#e9f2f6" strokeWidth="1" />
                <text x="440" y={tick.y + 3} fill="#e9f2f6" fontSize="9">
                  {tick.m}
                </text>
              </g>
            ))}
            <text
              x="430"
              y="50"
              fill="#e9f2f6"
              fontSize="10"
              textAnchor="middle"
              opacity={drawDim}
            >
              DAMMKRONE
            </text>
          </g>

          {/* Leak Indicator */}
          <g
            transform={`translate(325, 150) scale(${showLeak * pulse})`}
            opacity={showLeak}
          >
            <path
              d="M -20,0 L 0,0 M -5,-5 L 0,0 L -5,5"
              fill="none"
              stroke="#d0523f"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="0" cy="0" r="4" fill="#d0523f" />
            <text
              x="10"
              y="4"
              fill="#d0523f"
              fontSize="12"
              fontWeight="bold"
              style={{ textShadow: '0 0 4px rgba(0,0,0,0.5)' }}
            >
              LECKAGE
            </text>
          </g>

          {/* Labels for layers */}
          <g opacity={drawDam * 0.7}>
            <text x="200" y="160" fill="#e9f2f6" fontSize="7" textAnchor="middle">
              KERN
            </text>
            <text x="110" y="255" fill="#e9f2f6" fontSize="8">
              WASSERSEITE
            </text>
            <text x="330" y="255" fill="#e9f2f6" fontSize="8" textAnchor="end">
              LUFTSEITE
            </text>
          </g>
        </svg>

        {p.title ? (
          <div
            style={{
              position: 'absolute',
              bottom: -40,
              width: '100%',
              textAlign: 'center',
              fontFamily: 'sans-serif',
              fontSize: 28,
              letterSpacing: '0.1em',
              color: '#e9f2f6',
              opacity: drawDim,
              transform: `translateY(${(1 - drawDim) * 20}px)`,
            }}
          >
            {p.title}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};