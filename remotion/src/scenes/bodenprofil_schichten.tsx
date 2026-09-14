import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const BodenprofilSchichtenScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const slide = interpolate(frame, [0, span * 0.5], [0, 150], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const saturation = interpolate(frame, [span * 0.4, span * 0.9], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const indicator = interpolate(frame, [span * 0.4, span * 0.9], [0, 100], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { id: 0, y: 0, h: 60, color: '#d1d5db', label: 'Silt (Saturated)' },
    { id: 1, y: 60, h: 80, color: '#e5e7eb', label: 'Fine Sand' },
    { id: 2, y: 140, h: 100, color: '#f3f4f6', label: 'Dense Clay' },
  ];

  const siltColor = `rgb(${209 - 100 * saturation}, ${213 - 100 * saturation}, ${219 - 100 * saturation})`;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="60%" viewBox="0 0 400 400">
        <defs>
          <linearGradient id="satGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#9ca3af" />
            <stop offset="0.5" stopColor="#6b7280" />
            <stop offset="1" stopColor="#374151" />
          </linearGradient>
        </defs>

        <g transform={`translate(0, ${slide})`}>
          {layers.map((l, i) => (
            <g key={l.id}>
              <rect
                x={100}
                y={l.y}
                width={200}
                height={l.h}
                fill={i === 0 ? siltColor : l.color}
                stroke="#e9f2f6"
                strokeWidth={1}
              />
              <line x1={80} y1={l.y} x2={100} y2={l.y} stroke="#e9f2f6" strokeWidth={1} />
              <text x={75} y={l.y + l.h / 2} fill="#e9f2f6" fontSize={12} textAnchor="end" alignmentBaseline="middle">
                {l.label}
              </text>
            </g>
          ))}
          <line x1={310} y1={0} x2={310} y2={240} stroke="#e0b44c" strokeWidth={2} />
          <text x={320} y={120} fill="#e0b44c" fontSize={12} transform="rotate(90 320 120)">2.4m Depth</text>
        </g>

        <rect x={350} y={300 - indicator} width={20} height={indicator} fill="url(#satGrad)" />
        <text x={360} y={290} fill="#e9f2f6" fontSize={10} textAnchor="middle">H2O</text>
      </svg>

      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: 'sans-serif', fontSize: 24, color: '#e9f2f6', letterSpacing: '0.1em' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};