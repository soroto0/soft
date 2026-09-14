import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const NetworkDiagramScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const draw = interpolate(frame, [0, span * 0.5], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pulse = interpolate(frame, [0, span], [1, 1.15], {
    easing: Easing.inOut(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shift = interpolate(frame, [0, span], [0, 5], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const nodes = [
    { x: 210, y: 80, label: 'KOPF' },
    { x: 120, y: 140, label: 'ARM 1' },
    { x: 120, y: 180, label: 'ARM 2' },
    { x: 150, y: 210, label: 'ARM 3' },
    { x: 180, y: 230, label: 'ARM 4' },
    { x: 240, y: 230, label: 'ARM 5' },
    { x: 270, y: 210, label: 'ARM 6' },
    { x: 300, y: 180, label: 'ARM 7' },
    { x: 300, y: 140, label: 'ARM 8' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 420 300">
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e0b44c" />
            <stop offset="0.5" stopColor="#e9f2f6" />
            <stop offset="1" stopColor="#d0523f" />
          </linearGradient>
        </defs>

        <path d="M 210 80 L 120 140 M 210 80 L 120 180 M 210 80 L 150 210 M 210 80 L 180 230 M 210 80 L 240 230 M 210 80 L 270 210 M 210 80 L 300 180 M 210 80 L 300 140"
              stroke="url(#lineGrad)" strokeWidth={1.5} strokeDasharray="4 4" opacity={draw} />

        {nodes.map((n, i) => (
          <g key={n.label}>
            <circle cx={n.x} cy={n.y} r={i === 0 ? 12 * pulse : 6 * draw} fill={i === 0 ? '#e0b44c' : '#e9f2f6'} />
            <text x={n.x} y={n.y + (i === 0 ? -18 : 20)} fill="#e9f2f6" fontSize={10} textAnchor="middle" opacity={draw}>
              {n.label}
            </text>
          </g>
        ))}

        <text x={210} y={280} fill="#e9f2f6" fontSize={12} textAnchor="middle" opacity={draw} style={{ letterSpacing: '2px' }}>
          DEZENTRALE STEUERUNG: 1 + 8
        </text>
      </svg>

      {p.title ? (
        <div style={{
          marginTop: 20,
          transform: `translateY(${shift}px)`,
          fontFamily: "'Segoe UI', sans-serif",
          fontSize: 32,
          color: '#e9f2f6',
          fontWeight: 'bold'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};