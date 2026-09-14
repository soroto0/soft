import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const JanssenEffectDiagramScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const progress = interpolate(frame, [0, span * 0.8], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const curveShift = interpolate(frame, [span * 0.2, span * 0.9], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const captionRise = interpolate(frame, [0, span * 0.2], [20, 0], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ticks = [0, 25, 50, 75, 100];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 300">
        <text x="200" y="20" fill="#e9f2f6" fontSize="16" textAnchor="middle" style={{ opacity: captionRise }}>{p.title}</text>
        
        <line x1="50" y1="50" x2="50" y2="250" stroke="#e9f2f6" strokeWidth="2" />
        <line x1="50" y1="250" x2="350" y2="250" stroke="#e9f2f6" strokeWidth="2" />
        
        <text x="30" y="40" fill="#e9f2f6" fontSize="10" textAnchor="end">Tiefe</text>
        <text x="360" y="265" fill="#e9f2f6" fontSize="10" textAnchor="end">Druck</text>

        {ticks.map((t) => (
          <g key={t}>
            <line x1="50" y1={250 - t * 1.8} x2="45" y2={250 - t * 1.8} stroke="#e9f2f6" strokeWidth="1" />
            <text x="40" y={253 - t * 1.8} fill="#e9f2f6" fontSize="8" textAnchor="end">{t}m</text>
          </g>
        ))}

        <path
          d={`M 50 50 L ${50 + 250 * progress} ${50 + 180 * progress}`}
          fill="none"
          stroke="#8a949b"
          strokeWidth="3"
          strokeDasharray="4 4"
        />

        <path
          d={`M 50 50 Q 50 150 ${50 + 200 * curveShift} 230`}
          fill="none"
          stroke="#e0b44c"
          strokeWidth="4"
          strokeLinecap="round"
        />

        <g transform={`translate(${50 + 200 * curveShift}, 230)`}>
          <circle r="6" fill="#e0b44c" />
          <text x="10" y="-10" fill="#e0b44c" fontSize="10">Sättigung</text>
        </g>

        <g transform="translate(80, 80)">
          <rect x="0" y="0" width="20" height="150" fill="#5d6a73" />
          <text x="10" y="170" fill="#e9f2f6" fontSize="8" textAnchor="middle">Wand</text>
        </g>
        
        <line x1="50" y1="50" x2="100" y2="80" stroke="#d0523f" strokeWidth="2" />
        <text x="110" y="85" fill="#d0523f" fontSize="10">Korn-Reibung</text>
      </svg>
    </AbsoluteFill>
  );
};