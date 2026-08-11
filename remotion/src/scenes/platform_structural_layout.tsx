import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const PlatformStructuralLayoutScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const draw = interpolate(frame, [0, span * 0.5], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const lines = interpolate(frame, [span * 0.3, span * 0.8], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labels = interpolate(frame, [span * 0.5, span * 0.9], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const radius = 80;
  const points = [0, 1, 2, 3, 4].map((i) => {
    const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
    return {
      x: 200 + radius * Math.cos(angle),
      y: 125 + radius * Math.sin(angle),
      label: String.fromCharCode(65 + i),
    };
  });

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 400 250">
        <defs>
          <linearGradient id="steel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#708090" />
            <stop offset="0.5" stopColor="#505e6b" />
            <stop offset="1" stopColor="#3a454f" />
          </linearGradient>
        </defs>

        {points.map((p1, i) => {
          const p2 = points[(i + 1) % 5];
          return (
            <line
              key={`tube-${i}`}
              x1={p1.x}
              y1={p1.y}
              x2={p1.x + (p2.x - p1.x) * lines}
              y2={p1.y + (p2.y - p1.y) * lines}
              stroke="url(#steel)"
              strokeWidth={6 * draw}
              strokeLinecap="round"
            />
          );
        })}

        {points.map((pt, i) => (
          <g key={`col-${i}`}>
            <circle cx={pt.x} cy={pt.y} r={12 * draw} fill="#708090" stroke="#e9f2f6" strokeWidth={1} />
            <text x={pt.x} y={pt.y + 4} fill="#e9f2f6" fontSize={10} textAnchor="middle" opacity={labels}>
              {pt.label}
            </text>
          </g>
        ))}

        <line x1={200} y1={125} x2={200 + 80 * lines} y2={125} stroke="#e0b44c" strokeWidth={1} strokeDasharray="4 2" />
        <text x={240} y={118} fill="#e0b44c" fontSize={8} opacity={labels}>Ø 2.6m</text>

        <text x={200} y={240} fill="#e9f2f6" fontSize={16} textAnchor="middle" fontWeight="bold" letterSpacing={1}>
          {p.title || "STRUKTURELLER AUFBAU PENTAGONE"}
        </text>
      </svg>
    </AbsoluteFill>
  );
};