import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const GeologicalStratigraphyScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const draw = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const highlight = interpolate(frame, [span * 0.4, span * 0.6], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const captionRise = interpolate(frame, [span * 0.1, span * 0.5], [20, 0], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const layers = [
    { id: 0, y: 0, h: 60, label: 'Topsoil', color: '#8a949b' },
    { id: 1, y: 60, h: 40, label: 'Silt', color: '#c9d3d9' },
    { id: 2, y: 100, h: 30, label: 'Blue Clay', color: '#5b7f9c' },
    { id: 3, y: 130, h: 70, label: 'Bedrock', color: '#4a4a4a' },
  ];

  const depths = [0, 8, 16, 24, 32];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 300">
        <defs>
          <linearGradient id="clayHighlight" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e0b44c" />
            <stop offset="0.5" stopColor="#5b7f9c" />
            <stop offset="1" stopColor="#e0b44c" />
          </linearGradient>
        </defs>

        <g transform={`scale(1, ${draw})`}>
          {layers.map((l) => (
            <g key={l.id}>
              <rect
                x={100}
                y={l.y + 20}
                width={150}
                height={l.h}
                fill={l.id === 2 ? (highlight > 0.5 ? 'url(#clayHighlight)' : l.color) : l.color}
                stroke="#e9f2f6"
                strokeWidth={1}
                opacity={0.7 + highlight * 0.3}
              />
              <line x1={250} y1={l.y + 20 + l.h / 2} x2={270} y2={l.y + 20 + l.h / 2} stroke="#e9f2f6" strokeWidth={1} />
              <text x={275} y={l.y + 20 + l.h / 2 + 3} fill="#e9f2f6" fontSize={10}>{l.label}</text>
            </g>
          ))}
        </g>

        {depths.map((d, i) => (
          <g key={d}>
            <line x1={90} y1={20 + i * 50} x2={100} y2={20 + i * 50} stroke="#e9f2f6" strokeWidth={1} />
            <text x={85} y={23 + i * 50} fill="#e9f2f6" fontSize={8} textAnchor="end">{d}m</text>
          </g>
        ))}

        <rect x={100} y={120} width={150} height={10} fill="none" stroke="#d0523f" strokeWidth={2} opacity={highlight} />
        <text x={175} y={115} fill="#d0523f" fontSize={10} textAnchor="middle" opacity={highlight}>LIQUEFACTION RISK</text>
      </svg>

      {p.title ? (
        <div style={{
          marginTop: 40,
          transform: `translateY(${captionRise}px)`,
          fontFamily: 'sans-serif',
          fontSize: 28,
          color: '#e9f2f6',
          letterSpacing: '0.05em'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};