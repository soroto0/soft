import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const CrossSectionAnimationScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const flow = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const seep = interpolate(frame, [span * 0.2, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pulse = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.bezier(0.5, 0, 0.5, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;
  const layers = [
    { y: 40, h: 60, fill: '#5d6a73', label: 'GLASS' },
    { y: 100, h: 40, fill: '#e0b44c', label: 'GASKET' },
    { y: 140, h: 120, fill: '#2a3238', label: 'SPACER CAVITY' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 300">
        <defs>
          <linearGradient id="chemGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d0523f" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#d0523f" />
          </linearGradient>
        </defs>

        {layers.map((L) => (
          <g key={L.label}>
            <rect x={50} y={L.y} width={300} height={L.h} fill={L.fill} stroke="#e9f2f6" strokeWidth={1} />
            <text x={360} y={L.y + L.h / 2 + 4} fill="#e9f2f6" fontSize={10} textAnchor="start">{L.label}</text>
          </g>
        ))}

        <line x1={100} y1={100} x2={100} y2={140} stroke="#e9f2f6" strokeWidth={0.5} strokeDasharray="2 2" />
        <line x1={300} y1={100} x2={300} y2={140} stroke="#e9f2f6" strokeWidth={0.5} strokeDasharray="2 2" />

        {[100, 200, 300].map((x) => (
          <g key={x}>
            <circle cx={x} cy={100 + seep * 40} r={2 + Math.sin(pulse * 10) * 0.5} fill="url(#chemGrad)" />
            <path d={`M ${x} 100 L ${x} ${100 + seep * 40}`} stroke="#d0523f" strokeWidth={1} strokeOpacity={0.6 * flow} />
          </g>
        ))}

        <text x={50} y={30} fill="#e9f2f6" fontSize={12} fontWeight="bold">CROSS-SECTION VIEW</text>
        <line x1={50} y1={35} x2={350} y2={35} stroke="#e9f2f6" strokeWidth={1} />
      </svg>

      {p.title ? (
        <div style={{
          marginTop: 20,
          fontFamily: "'Segoe UI', Arial, sans-serif",
          fontSize: 28,
          color: '#e9f2f6',
          textTransform: 'uppercase',
          letterSpacing: 1
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};