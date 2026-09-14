import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const UltraschallSchattenzoneScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const scanProgress = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const probePos = interpolate(frame, [0, span], [100, 400], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const crackHighlight = interpolate(frame, [span * 0.6, span * 0.9], [0, 1], {
    easing: Easing.bounce,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { y: 100, h: 40, fill: '#5d6a73', label: 'KANZEL' },
    { y: 140, h: 30, fill: '#8a949b', label: 'HALTERUNG' },
    { y: 170, h: 100, fill: '#c9d3d9', label: 'GEHÄUSE' },
  ];

  const scanLines = [120, 160, 200, 240, 280, 320, 360];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 500 400">
        {layers.map((L) => (
          <g key={L.label}>
            <rect x={50} y={L.y} width={400} height={L.h} fill={L.fill} stroke="#e9f2f6" strokeWidth={0.5} />
            <text x={55} y={L.y + L.h / 2 + 4} fill="#e9f2f6" fontSize={10} fontFamily="sans-serif">{L.label}</text>
          </g>
        ))}

        <rect x={230} y={220} width={40} height={10} fill={crackHighlight > 0.5 ? '#d0523f' : '#8a949b'} />
        <text x={250} y={245} fill="#d0523f" fontSize={12} textAnchor="middle" opacity={crackHighlight}>RISS</text>

        {scanLines.map((x) => {
          const isBlocked = x > 140 && x < 360;
          const active = Math.abs(x - probePos) < 40;
          return (
            <line
              key={x}
              x1={x} y1={100}
              x2={x} y2={isBlocked ? 170 : 270}
              stroke={active ? '#e0b44c' : '#e9f2f6'}
              strokeWidth={active ? 2 : 0.5}
              strokeDasharray="4 2"
              opacity={active ? scanProgress : 0.2}
            />
          );
        })}

        <rect x={probePos - 20} y={80} width={40} height={20} fill="#e0b44c" />

        <line x1={50} y1={300} x2={450} y2={300} stroke="#e9f2f6" strokeWidth={1} />
        {[0, 1, 2, 3, 4].map((t) => (
          <g key={t}>
            <line x1={50 + t * 100} y1={300} x2={50 + t * 100} y2={310} stroke="#e9f2f6" strokeWidth={1} />
            <text x={50 + t * 100} y={325} fill="#e9f2f6" fontSize={10} textAnchor="middle">{t * 50}mm</text>
          </g>
        ))}
      </svg>
      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: 'sans-serif', fontSize: 24, color: '#e0b44c', textTransform: 'uppercase', fontWeight: 'bold' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};