import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const PriceLabelScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 4) * fps));

  const drop = interpolate(frame, [0, span * 0.4], [-height * 0.6, 0], {
    easing: Easing.out(Easing.back(1.2)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const swing = interpolate(frame, [span * 0.3, span * 0.5, span * 0.7, span * 0.9], [0, 8, -4, 0], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pop = interpolate(frame, [span * 0.35, span * 0.5], [0, 1], {
    easing: Easing.out(Easing.elastic(1)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const stringLen = interpolate(frame, [0, span * 0.4], [0, 120], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const barcodes = [0, 1, 2, 3, 4, 5, 6];

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
          width: width * 0.5,
          height: height * 0.6,
          transform: `translateY(${drop}px) rotate(${swing}deg)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 200 300"
          fill="none"
          style={{ overflow: 'visible' }}
        >
          <line
            x1="100"
            y1="-200"
            x2="100"
            y2={stringLen - 180}
            stroke="#e0b44c"
            strokeWidth="3"
            strokeDasharray="4 2"
          />
          
          <path
            d="M 100,20 L 160,60 L 160,260 L 40,260 L 40,60 Z"
            fill="#e9f2f6"
            stroke="#e0b44c"
            strokeWidth="4"
          />
          
          <circle cx="100" cy="50" r="8" fill="#1a1a1a" stroke="#e0b44c" strokeWidth="2" />
          
          <rect
            x="52"
            y="75"
            width="96"
            height="170"
            fill="none"
            stroke="#e0b44c"
            strokeWidth="1"
            opacity={0.4}
          />

          <text
            x="100"
            y="130"
            fill="#d0523f"
            fontSize="24"
            fontWeight="bold"
            textAnchor="middle"
            fontFamily="monospace"
            style={{ transform: `scale(${pop})`, transformOrigin: '100px 120px' }}
          >
            $
          </text>
          <text
            x="100"
            y="185"
            fill="#d0523f"
            fontSize="48"
            fontWeight="900"
            textAnchor="middle"
            fontFamily="serif"
            style={{ transform: `scale(${pop})`, transformOrigin: '100px 170px' }}
          >
            2.00
          </text>

          <g opacity={pop * 0.6}>
            {barcodes.map((b) => (
              <rect
                key={b}
                x={65 + b * 10}
                y="210"
                width={b % 3 === 0 ? 4 : 2}
                height="25"
                fill="#5d6a73"
              />
            ))}
          </g>

          <g style={{ transform: `scale(${pop})`, transformOrigin: '140px 80px' }}>
            <circle cx="140" cy="80" r="20" fill="none" stroke="#d0523f" strokeWidth="1.5" strokeDasharray="2 1" />
            <text
              x="140"
              y="84"
              fill="#d0523f"
              fontSize="8"
              textAnchor="middle"
              fontFamily="sans-serif"
              fontWeight="bold"
            >
              FIX
            </text>
          </g>
        </svg>
      </div>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            fontFamily: 'monospace',
            fontSize: 42,
            color: '#e9f2f6',
            letterSpacing: '4px',
            borderTop: '2px solid #e0b44c',
            paddingTop: 10,
            opacity: pop,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};