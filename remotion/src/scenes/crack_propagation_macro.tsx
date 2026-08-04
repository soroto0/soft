import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const CrackPropagationMacroScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const totalFrames = Math.max(1, Math.round((p.dur || 6) * fps));

  const crackProgress = interpolate(frame, [0, totalFrames], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pulse = interpolate(frame, [0, totalFrames / 4, totalFrames / 2, totalFrames], [0.5, 1, 0.5, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const scanline = interpolate(frame, [0, totalFrames], [0, 300], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="60%" viewBox="0 0 400 300">
        <rect x="50" y="50" width="300" height="150" fill="#1a1d21" stroke="#e9f2f6" strokeWidth="2" />
        <line x1="200" y1="50" x2="200" y2={50 + (150 * crackProgress)} stroke="#d0523f" strokeWidth="6" strokeLinecap="round" />
        <line x1="50" y1={50 + scanline / 2} x2="350" y2={50 + scanline / 2} stroke="#e0b44c" strokeWidth="1" opacity={0.2 * pulse} />
        <text x="215" y={55 + (150 * crackProgress)} fill="#d0523f" fontSize="14" fontFamily="monospace" fontWeight="bold">
          {Math.floor(crackProgress * 11)}mm
        </text>
      </svg>
      {p.title ? (
        <div style={{
          marginTop: 200,
          fontFamily: "'Segoe UI', Arial, sans-serif",
          fontSize: 32,
          color: '#e9f2f6',
          textAlign: 'center',
          textTransform: 'uppercase',
          letterSpacing: '2px'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};