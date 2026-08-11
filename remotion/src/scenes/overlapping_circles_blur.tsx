import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const OverlappingCirclesBlurScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const progress = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const blurVal = interpolate(frame, [0, span], [0, 20], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shift = interpolate(frame, [0, span], [0, 100], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ticks = [0, 1, 2, 3, 4];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 800 500">
        <defs>
          <filter id="blur">
            <feGaussianBlur stdDeviation={blurVal} />
          </filter>
        </defs>
        <g filter="url(#blur)">
          <circle cx={300 + shift} cy={200} r={120} fill="none" stroke="#e0b44c" strokeWidth={6} />
          <circle cx={500 - shift} cy={200} r={120} fill="none" stroke="#e9f2f6" strokeWidth={6} />
        </g>
        <text x={300 + shift} y={200} fill="#e0b44c" fontSize={20} textAnchor="middle">DIOS</text>
        <text x={500 - shift} y={200} fill="#e9f2f6" fontSize={20} textAnchor="middle">UNIVERSO</text>
        
        <line x1={150} y1={400} x2={650} y2={400} stroke="#e9f2f6" strokeWidth={1} />
        {ticks.map((t) => (
          <g key={t}>
            <line x1={150 + t * 125} y1={400} x2={150 + t * 125} y2={410} stroke="#e9f2f6" strokeWidth={1} />
            <text x={150 + t * 125} y={430} fill="#e9f2f6" fontSize={12} textAnchor="middle">{t * 25}%</text>
          </g>
        ))}
        
        <path d={`M 400 100 L 400 300`} stroke="#d0523f" strokeWidth={2} strokeDasharray="5 5" />
        <text x={400} y={90} fill="#d0523f" fontSize={16} textAnchor="middle" fontWeight="bold">FRONTERA</text>
        
        <rect x={150 + progress * 400} y={395} width={10} height={10} fill="#d0523f" />
      </svg>
      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: 'sans-serif', fontSize: 32, color: '#e9f2f6' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};