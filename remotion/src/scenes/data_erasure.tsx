import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const DataErasureScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const scan = interpolate(frame, [span * 0.15, span * 0.8], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const headerFade = interpolate(frame, [0, span * 0.15], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const captionShift = interpolate(frame, [span * 0.1, span * 0.4], [15, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const cols = 12;
  const rows = 8;
  const items = Array.from({ length: cols * rows }, (_, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    return {
      id: i,
      x: 80 + col * 40,
      y: 120 + row * 24,
      isFirstSick: row === 0 && col < 4,
    };
  });

  const scanLineY = 100 + 210 * scan;

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
      <svg width="75%" height="70%" viewBox="0 0 600 400">
        <rect
          x={50}
          y={80}
          width={500}
          height={240}
          fill="none"
          stroke="#e9f2f6"
          strokeWidth={1}
          opacity={0.15 * headerFade}
        />

        <line
          x1={50}
          y1={100}
          x2={550}
          y2={100}
          stroke="#e9f2f6"
          strokeWidth={1}
          opacity={0.2 * headerFade}
        />
        <line
          x1={50}
          y1={296}
          x2={550}
          y2={296}
          stroke="#e9f2f6"
          strokeWidth={1}
          opacity={0.2 * headerFade}
        />

        <text
          x={60}
          y={93}
          fill="#e9f2f6"
          fontSize={8}
          letterSpacing={1.5}
          opacity={0.6 * headerFade}
        >
          REGISTRUM MILITUM // LEGIO I MINERVIA
        </text>
        <text
          x={540}
          y={93}
          fill="#e0b44c"
          fontSize={8}
          textAnchor="end"
          letterSpacing={1}
          opacity={0.8 * headerFade}
        >
          SEC. CORRESPONDENTIA
        </text>

        {items.map((item) => {
          const distance = scanLineY - item.y;
          const eraseFactor = Math.min(1, Math.max(0, (distance + 12) / 24));

          let dotColor = '#e9f2f6';
          let dotOpacity = 0.8;

          if (item.isFirstSick) {
            dotColor = '#e0b44c';
          }

          if (eraseFactor > 0 && eraseFactor < 1) {
            dotColor = '#d0523f';
            dotOpacity = 1.0;
          } else if (eraseFactor >= 1) {
            dotColor = '#5b7f9c';
            dotOpacity = 0.05;
          }

          return (
            <g key={item.id}>
              <rect
                x={item.x - 4}
                y={item.y - 4}
                width={8}
                height={8}
                fill={dotColor}
                opacity={dotOpacity * headerFade}
                rx={1}
              />
              {item.isFirstSick && eraseFactor < 0.5 && (
                <circle
                  cx={item.x}
                  cy={item.y}
                  r={8}
                  fill="none"
                  stroke="#e0b44c"
                  strokeWidth={0.5}
                  opacity={0.5 * headerFade}
                />
              )}
            </g>
          );
        })}

        <path
          d="M 70 114 L 60 114 L 60 126 L 70 126"
          fill="none"
          stroke="#e0b44c"
          strokeWidth={1}
          opacity={0.7 * headerFade * (1 - scan)}
        />
        <text
          x={52}
          y={123}
          fill="#e0b44c"
          fontSize={7}
          textAnchor="end"
          opacity={0.8 * headerFade * (1 - scan)}
        >
          PRIMI AEGROTI [PATIENTS 1-4]
        </text>

        <line
          x1={45}
          y1={scanLineY}
          x2={555}
          y2={scanLineY}
          stroke="#d0523f"
          strokeWidth={1.5}
          opacity={scan > 0.01 && scan < 0.99 ? 0.9 : 0}
        />
        <line
          x1={45}
          y1={scanLineY}
          x2={555}
          y2={scanLineY}
          stroke="#e0b44c"
          strokeWidth={4}
          opacity={scan > 0.01 && scan < 0.99 ? 0.4 : 0}
          style={{ filter: 'blur(2px)' }}
        />

        <text
          x={540}
          y={scanLineY - 6}
          fill="#d0523f"
          fontSize={8}
          textAnchor="end"
          letterSpacing={1}
          opacity={scan > 0.05 && scan < 0.95 ? 1 : 0}
        >
          CENSURA DAMNATIO
        </text>

        <text
          x={60}
          y={312}
          fill="#e9f2f6"
          fontSize={8}
          opacity={0.4 * headerFade}
        >
          TOTAL RECORDS: 96
        </text>
        <text
          x={540}
          y={312}
          fill={scan > 0.8 ? '#d0523f' : '#e9f2f6'}
          fontSize={8}
          textAnchor="end"
          opacity={0.6 * headerFade}
        >
          {scan > 0.8 ? 'STATUS: EXPUNGED' : 'STATUS: INDEXED'}
        </text>
      </svg>

      {p.title ? (
        <div
          style={{
            marginTop: 10,
            transform: `translateY(${captionShift}px)`,
            fontFamily: "'Segoe UI', Arial, sans-serif",
            fontSize: 28,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: '#e9f2f6',
            opacity: headerFade,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};