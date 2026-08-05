import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const PorePressureAnimationScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const load = interpolate(frame, [0, span * 0.5], [0, 20], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pressure = interpolate(frame, [span * 0.3, span * 0.8], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const flow = interpolate(frame, [0, span], [0, 10], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const particles = [
    { x: 100, y: 150 }, { x: 200, y: 150 }, { x: 300, y: 150 },
    { x: 150, y: 250 }, { x: 250, y: 250 }, { x: 100, y: 350 },
    { x: 300, y: 350 }, { x: 200, y: 350 }
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 400 450">
        <defs>
          <linearGradient id="pressGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d0523f" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#5b7f9c" />
          </linearGradient>
        </defs>

        <rect x={50} y={50 - load} width={300} height={30} fill="#e9f2f6" />
        <text x={200} y={40 - load} fill="#e9f2f6" fontSize={12} textAnchor="middle">BUILDING WEIGHT</text>

        {particles.map((pt, i) => (
          <circle key={i} cx={pt.x} cy={pt.y + load} r={20} fill="#8a949b" stroke="#e9f2f6" strokeWidth={1} />
        ))}

        <rect x={70} y={150} width={260} height={220} fill="url(#pressGrad)" opacity={0.4 * pressure} />
        
        <g opacity={pressure}>
          {[0, 1, 2].map((i) => (
            <path key={i} d={`M 80 ${180 + i * 60 + flow} L 320 ${180 + i * 60 + flow}`} stroke="#e9f2f6" strokeWidth={2} strokeDasharray="4 4" />
          ))}
        </g>

        <line x1={40} y1={150} x2={40} y2={370} stroke="#e9f2f6" strokeWidth={2} />
        <text x={30} y={150} fill="#e9f2f6" fontSize={10} transform="rotate(-90 30 150)">0 kPa</text>
        <text x={30} y={370} fill="#e9f2f6" fontSize={10} transform="rotate(-90 30 370)">100 kPa</text>

        <text x={200} y={430} fill="#e0b44c" fontSize={20} textAnchor="middle" fontWeight="bold">
          {p.title || "Excess Pore Pressure"}
        </text>
      </svg>
    </AbsoluteFill>
  );
};