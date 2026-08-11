import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const EsferasInfluenciaPoliticaScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = Math.max(1, Math.round((p.dur || 6) * fps));

  const progress = interpolate(frame, [0, duration], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shadow = interpolate(frame, [duration * 0.5, duration], [0, 0.7], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const spheres = [
    { id: 'civil', label: 'ADMINISTRACIÓN', color: '#e0b44c', startX: -200, endX: -50, y: 50 },
    { id: 'religioso', label: 'IGLESIA', color: '#d0523f', startX: 200, endX: 50, y: 50 },
    { id: 'filosofica', label: 'FILÓSOFA', color: '#e9f2f6', startX: 0, endX: 0, y: -80 },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="-250 -200 500 400">
        <defs>
          <radialGradient id="shadow">
            <stop offset="0%" stopColor="#000" stopOpacity={shadow} />
            <stop offset="100%" stopColor="transparent" stopOpacity={0} />
          </radialGradient>
        </defs>
        {spheres.map((s) => (
          <g key={s.id}>
            <circle
              cx={interpolate(progress, [0, 1], [s.startX, s.endX])}
              cy={s.y}
              r={100}
              fill="none"
              stroke={s.color}
              strokeWidth={1}
            />
            <text
              x={interpolate(progress, [0, 1], [s.startX, s.endX])}
              y={s.y + 130}
              fill={s.color}
              fontSize={16}
              textAnchor="middle"
              style={{ textTransform: 'uppercase', letterSpacing: '1px' }}
            >
              {s.label}
            </text>
          </g>
        ))}
        <circle cx={0} cy={0} r={80} fill="url(#shadow)" />
        <text x={0} y={5} fill="#e9f2f6" fontSize={12} textAnchor="middle" opacity={shadow}>
          CONFLICTO
        </text>
      </svg>
      {p.title ? (
        <div style={{
          position: 'absolute',
          bottom: '10%',
          fontFamily: 'sans-serif',
          fontSize: 28,
          color: '#e9f2f6',
          textAlign: 'center',
          width: '100%'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};