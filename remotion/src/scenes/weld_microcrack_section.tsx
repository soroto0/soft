import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const WeldMicrocrackSectionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const draw = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const crackGrowth = interpolate(frame, [span * 0.3, span * 0.8], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [span * 0.5, span * 0.9], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { x: 100, w: 100, h: 200, fill: '#5d6a73', label: '26mm Tube' },
    { x: 200, w: 40, h: 60, fill: '#8a949b', label: '6mm Weld' },
    { x: 240, w: 80, h: 200, fill: '#5d6a73', label: 'Sleeve' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 300">
        <defs>
          <linearGradient id="haz" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e0b44c" />
            <stop offset="0.5" stopColor="#d0523f" />
            <stop offset="1" stopColor="#5b7f9c" />
          </linearGradient>
        </defs>

        {layers.map((l, i) => (
          <rect key={i} x={l.x} y={50} width={l.w * draw} height={l.h} fill={l.fill} stroke="#e9f2f6" strokeWidth={1} />
        ))}

        <rect x={190} y={50} width={60} height={60} fill="url(#haz)" opacity={0.6 * draw} />

        <path d={`M 200 110 L 200 ${110 + 40 * crackGrowth}`} stroke="#d0523f" strokeWidth={3} strokeLinecap="round" />
        <path d={`M 240 110 L 240 ${110 + 30 * crackGrowth}`} stroke="#d0523f" strokeWidth={3} strokeLinecap="round" />

        <line x1="200" y1="40" x2="150" y2="20" stroke="#e9f2f6" strokeWidth={1} />
        <text x="145" y="20" fill="#e9f2f6" fontSize={12} textAnchor="end" opacity={labelFade}>Base Metal</text>

        <line x1="220" y1="40" x2="220" y2="10" stroke="#e9f2f6" strokeWidth={1} />
        <text x="220" y="8" fill="#e9f2f6" fontSize={12} textAnchor="middle" opacity={labelFade}>HAZ</text>

        <line x1="240" y1="40" x2="290" y2="20" stroke="#e9f2f6" strokeWidth={1} />
        <text x="295" y="20" fill="#e9f2f6" fontSize={12} opacity={labelFade}>Sleeve</text>

        <text x="200" y="280" fill="#d0523f" fontSize={14} textAnchor="middle" fontWeight="bold">
          {crackGrowth > 0 ? `CRACK DEPTH: ${(6 * crackGrowth).toFixed(1)}mm` : ''}
        </text>
      </svg>

      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: 'sans-serif', fontSize: 32, color: '#e9f2f6', letterSpacing: '0.1em' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};