import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const LoadDistributionMapScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const shift = interpolate(frame, [0, duration], [-40, 40], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const arrowPulse = interpolate(frame, [0, duration / 2, duration], [1, 1.5, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const gradientShift = interpolate(frame, [0, duration], [0, 100], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { y: 120, h: 40, color: '#5d6a73', label: 'Bodenplatte' },
    { y: 160, h: 60, color: '#8a949b', label: 'Fundament' },
    { y: 220, h: 80, color: '#c9d3d9', label: 'Untergrund' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 600 400">
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#e0b44c" />
            <stop offset="0.5" stopColor="#e9f2f6" />
            <stop offset="1" stopColor="#d0523f" />
          </linearGradient>
        </defs>

        <g style={{ transform: `translateX(${shift}px)` }}>
          {layers.map((l) => (
            <rect key={l.label} x={150} y={l.y} width={300} height={l.h} fill={l.color} stroke="#e9f2f6" strokeWidth={0.5} />
          ))}

          <path d={`M 140 140 L 80 140 M 100 130 L 80 140 L 100 150`} stroke="#e0b44c" strokeWidth={2 * arrowPulse} fill="none" />
          <text x={110} y={135} fill="#e0b44c" fontSize={16} fontWeight="bold" textAnchor="middle">3.000t</text>
          
          <path d={`M 460 140 L 520 140 M 500 130 L 520 140 L 500 150`} stroke="#d0523f" strokeWidth={2 * arrowPulse} fill="none" />
          <text x={490} y={135} fill="#d0523f" fontSize={16} fontWeight="bold" textAnchor="middle">3.000t</text>

          <text x={300} y={100} fill="#e9f2f6" fontSize={14} textAnchor="middle" letterSpacing={2}>NORD-HÜGEL</text>
          <text x={300} y={330} fill="#e9f2f6" fontSize={14} textAnchor="middle" letterSpacing={2}>SÜD-GRUBE</text>
        </g>

        <rect x={50} y={360} width={500} height={6} fill="#333" />
        <rect x={50 + gradientShift * 4} y={360} width={100} height={6} fill="url(#grad)" />
        <text x={50} y={390} fill="#e9f2f6" fontSize={10} textAnchor="start">0t</text>
        <text x={550} y={390} fill="#e9f2f6" fontSize={10} textAnchor="end">3000t</text>
      </svg>

      {p.title ? (
        <div style={{
          marginTop: 40,
          fontFamily: 'sans-serif',
          fontSize: 32,
          color: '#e9f2f6',
          textTransform: 'uppercase',
          letterSpacing: '0.1em'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};