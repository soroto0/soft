import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const CrossSectionMapScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const zoom = interpolate(frame, [0, span], [1, 4], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const moveX = interpolate(frame, [0, span], [0, 150], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const fade = interpolate(frame, [0, span * 0.2, span * 0.8, span], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const mapElements = [
    { id: 'rome', cx: 200, cy: 150, r: 8, label: 'Roma' },
    { id: 'corsica', cx: 350, cy: 300, r: 12, label: 'Córcega' },
  ];

  const grid = [0, 1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" height="80%" viewBox="0 0 600 500">
        <defs>
          <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1a2a3a" />
            <stop offset="0.5" stopColor="#2c4a60" />
            <stop offset="1" stopColor="#1a2a3a" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="600" height="500" fill="url(#sea)" />
        {grid.map((i) => (
          <g key={i}>
            <line x1={i * 75} y1="0" x2={i * 75} y2="500" stroke="#e9f2f6" strokeWidth="0.2" opacity="0.3" />
            <line x1="0" y1={i * 62} x2="600" y2={i * 62} stroke="#e9f2f6" strokeWidth="0.2" opacity="0.3" />
          </g>
        ))}
        <g style={{ transform: `scale(${zoom}) translate(${-moveX}px, ${-moveX}px)`, transformOrigin: '200px 150px' }}>
          <path d="M 180 130 L 220 130 L 210 170 L 190 170 Z" fill="#e0b44c" />
          <path d="M 330 280 L 370 280 L 380 320 L 340 320 Z" fill="#d0523f" />
          <line x1="200" y1="150" x2="350" y2="300" stroke="#e9f2f6" strokeWidth="2" strokeDasharray="6 4" />
          {mapElements.map((el) => (
            <g key={el.id}>
              <circle cx={el.cx} cy={el.cy} r={el.r} fill="none" stroke="#e9f2f6" strokeWidth="2" />
              <text x={el.cx} y={el.cy - 20} fill="#e9f2f6" fontSize="14" textAnchor="middle">{el.label}</text>
            </g>
          ))}
        </g>
      </svg>
      {p.title ? (
        <div style={{
          position: 'absolute', bottom: height * 0.1,
          fontFamily: 'serif', fontSize: 48, color: '#e9f2f6',
          opacity: fade, textAlign: 'center', width: width * 0.8
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};