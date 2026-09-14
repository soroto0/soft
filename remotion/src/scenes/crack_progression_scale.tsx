import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const CrackProgressionScaleScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const crackWidth = interpolate(frame, [0, span], [0.5, 6], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const caliperPos = interpolate(frame, [0, span], [0, 100], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [0, span * 0.2], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ticks = [0, 1, 2, 3, 4, 5, 6];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 300">
        <defs>
          <linearGradient id="concrete" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8a949b" />
            <stop offset="0.5" stopColor="#5d6a73" />
            <stop offset="1" stopColor="#4a555c" />
          </linearGradient>
        </defs>

        <rect x="50" y="50" width="300" height="150" fill="url(#concrete)" />
        
        <path d={`M 200 ${50 - crackWidth * 2} L ${200 - crackWidth * 5} 125 L 200 ${200 + crackWidth * 2} L ${200 + crackWidth * 5} 125 Z`} 
              fill="#d0523f" />

        <g transform={`translate(${150 + caliperPos * 0.5}, 220)`}>
          <line x1="0" y1="0" x2="100" y2="0" stroke="#e9f2f6" strokeWidth="4" />
          <line x1="0" y1="0" x2="0" y2="20" stroke="#e9f2f6" strokeWidth="4" />
          <line x1="100" y1="0" x2="100" y2="20" stroke="#e9f2f6" strokeWidth="4" />
          <text x="50" y="-10" fill="#e0b44c" fontSize="16" textAnchor="middle" style={{ fontWeight: 'bold' }}>
            {crackWidth.toFixed(1)} mm
          </text>
        </g>

        <g opacity={labelFade}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={100 + t * 33.3} y1="200" x2={100 + t * 33.3} y2="210" stroke="#e9f2f6" strokeWidth="1" />
              <text x={100 + t * 33.3} y="225" fill="#e9f2f6" fontSize="8" textAnchor="middle">{t}mm</text>
            </g>
          ))}
        </g>

        <text x="50" y="40" fill="#e9f2f6" fontSize="12">Betonstruktur (Schnitt)</text>
        <text x="350" y="40" fill="#e9f2f6" fontSize="12" textAnchor="end">3. Obergeschoss</text>
      </svg>

      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: 28, color: '#e0b44c', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};