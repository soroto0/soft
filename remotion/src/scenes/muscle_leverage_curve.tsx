import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const MuscleLeverageCurveScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const drawPath = interpolate(frame, [0, span * 0.5], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const showLabels = interpolate(frame, [span * 0.4, span * 0.7], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pulse = interpolate(frame, [span * 0.6, span * 0.9], [1, 1.1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const points = [
    { x: 0, y: 10 },
    { x: 50, y: 15 },
    { x: 100, y: 30 },
    { x: 150, y: 80 },
    { x: 200, y: 180 },
  ];

  const pathData = `M ${points.map((pt) => `${pt.x},${pt.y * drawPath}`).join(' L ')}`;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 250 250">
        <defs>
          <linearGradient id="curveGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e0b44c" />
            <stop offset="50%" stopColor="#d0523f" />
            <stop offset="100%" stopColor="#5b7f9c" />
          </linearGradient>
        </defs>
        <line x1="0" y1="200" x2="220" y2="200" stroke="#e9f2f6" strokeWidth="1" />
        <line x1="0" y1="200" x2="0" y2="0" stroke="#e9f2f6" strokeWidth="1" />
        <path d={pathData} fill="none" stroke="url(#curveGrad)" strokeWidth="4" />
        {points.map((pt, i) => (
          <circle
            key={i}
            cx={pt.x}
            cy={pt.y * drawPath}
            r={3 * pulse}
            fill="#e9f2f6"
            opacity={showLabels}
          />
        ))}
        <text x="10" y="220" fill="#e9f2f6" fontSize="10" opacity={showLabels}>0°</text>
        <text x="190" y="220" fill="#e9f2f6" fontSize="10" opacity={showLabels}>45°</text>
        <text x="-30" y="10" fill="#e9f2f6" fontSize="10" opacity={showLabels} transform="rotate(-90 -30 10)">Kraft</text>
        <text x="120" y="240" fill="#e9f2f6" fontSize="12" textAnchor="middle" opacity={showLabels}>Öffnungswinkel</text>
      </svg>
      {p.title ? (
        <div style={{
          marginTop: 40,
          fontFamily: "'Segoe UI', Arial, sans-serif",
          fontSize: 32,
          color: '#e9f2f6',
          textAlign: 'center'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};