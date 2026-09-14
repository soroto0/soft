import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const AsFoundKeelPositionScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const reveal = interpolate(frame, [0, span * 0.2], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const slide = interpolate(frame, [span * 0.2, span * 0.7], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const focus = interpolate(frame, [span * 0.6, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const markers = [0, 1, 2, 3, 4];
  const keelWidth = 40;
  const keelMaxDepth = 240;
  const istDepth = keelMaxDepth * 0.5;

  return (
    <AbsoluteFill style={{ opacity, width, height, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 600 450" style={{ overflow: 'visible' }}>
        {/* Hull Section */}
        <path
          d="M 50,100 Q 300,150 550,100 L 500,200 Q 300,250 100,200 Z"
          fill="none"
          stroke="#e9f2f6"
          strokeWidth="2"
          opacity={reveal}
        />
        <text x="50" y="80" fill="#e9f2f6" fontSize="12" opacity={reveal * 0.6} fontFamily="monospace">
          RUMPF-QUERSCHNITT (SEKTION 42)
        </text>

        {/* Keel Housing / Internal */}
        <rect
          x={300 - keelWidth / 2}
          y="130"
          width={keelWidth}
          height="100"
          fill="none"
          stroke="#e9f2f6"
          strokeWidth="1"
          strokeDasharray="4 2"
          opacity={reveal * 0.5}
        />

        {/* SOLL Position (Target - Fully Extended) */}
        <g opacity={reveal * 0.4}>
          <rect
            x={300 - keelWidth / 2}
            y={230}
            width={keelWidth}
            height={keelMaxDepth}
            fill="none"
            stroke="#e9f2f6"
            strokeWidth="2"
            strokeDasharray="8 4"
          />
          <path
            d={`M ${300 - keelWidth} ${230 + keelMaxDepth} L ${300 + keelWidth} ${230 + keelMaxDepth} L 300 ${230 + keelMaxDepth + 30} Z`}
            fill="none"
            stroke="#e9f2f6"
            strokeWidth="2"
            strokeDasharray="8 4"
          />
          <text x={310 + keelWidth} y={230 + keelMaxDepth} fill="#e9f2f6" fontSize="14" fontFamily="monospace">
            SOLL (100%)
          </text>
        </g>

        {/* IST Position (Actual - Halfway) */}
        <g transform={`translate(0, ${-keelMaxDepth * (1 - 0.5) * (1 - slide)})`}>
          <rect
            x={300 - keelWidth / 2}
            y={230}
            width={keelWidth}
            height={istDepth}
            fill="#e9f2f6"
            fillOpacity="0.15"
            stroke="#e9f2f6"
            strokeWidth="3"
            opacity={reveal}
          />
          <path
            d={`M ${300 - keelWidth} ${230 + istDepth} L ${300 + keelWidth} ${230 + istDepth} L 300 ${230 + istDepth + 30} Z`}
            fill="#e9f2f6"
            opacity={reveal}
          />
          
          {/* Dimension Highlight */}
          <g opacity={focus}>
            <line
              x1={300 - keelWidth - 20}
              y1="230"
              x2={300 - keelWidth - 20}
              y2={230 + istDepth}
              stroke="#e0b44c"
              strokeWidth="2"
            />
            <line x1={300 - keelWidth - 30} y1="230" x2={300 - keelWidth - 10} y2="230" stroke="#e0b44c" strokeWidth="2" />
            <line x1={300 - keelWidth - 30} y1={230 + istDepth} x2={300 - keelWidth - 10} y2={230 + istDepth} stroke="#e0b44c" strokeWidth="2" />
            <text
              x={300 - keelWidth - 35}
              y={230 + istDepth / 2}
              fill="#e0b44c"
              fontSize="18"
              fontWeight="bold"
              textAnchor="end"
              fontFamily="monospace"
            >
              IST: 50%
            </text>
          </g>
        </g>

        {/* Depth Scale */}
        <g opacity={reveal * 0.7}>
          {markers.map((m) => (
            <g key={m} transform={`translate(500, ${230 + (m * keelMaxDepth) / 4})`}>
              <line x1="0" y1="0" x2="10" y2="0" stroke="#e9f2f6" strokeWidth="1" />
              <text x="15" y="5" fill="#e9f2f6" fontSize="10" fontFamily="monospace">
                {(m * 1.25).toFixed(1)}m
              </text>
            </g>
          ))}
          <line x1="500" y1="230" x2="500" y2={230 + keelMaxDepth} stroke="#e9f2f6" strokeWidth="1" />
        </g>

        {/* Status Label */}
        <rect
          x="380"
          y="320"
          width="180"
          height="40"
          fill="#d0523f"
          fillOpacity={focus * 0.2}
          stroke="#d0523f"
          strokeWidth="1"
          opacity={focus}
        />
        <text
          x="470"
          y="345"
          fill="#d0523f"
          fontSize="14"
          fontWeight="bold"
          textAnchor="middle"
          fontFamily="monospace"
          opacity={focus}
        >
          BLOCKIERT / MITTEL
        </text>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            width: '100%',
            textAlign: 'center',
            fontFamily: 'monospace',
            fontSize: 32,
            color: '#e9f2f6',
            letterSpacing: '2px',
            opacity: reveal,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};