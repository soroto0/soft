import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const PopulationLossGraphScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const progress = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const drop = interpolate(frame, [span * 0.2, span * 0.8], [0, 1], {
    easing: Easing.bezier(0.6, 0, 0.4, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const lineY = interpolate(drop, [0, 1], [50, 200], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ticks = [0, 500, 1000, 1500];
  const points = Array.from({ length: 20 }).map((_, i) => ({
    x: 100 + (i * 15),
    y: 50 + (i * 5),
    delay: i * 0.03
  }));

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 400 250">
        <line x1={50} y1={50} x2={50} y2={200} stroke="#e9f2f6" strokeWidth={1} />
        <line x1={50} y1={200} x2={350} y2={200} stroke="#e9f2f6" strokeWidth={1} />
        
        {ticks.map((t, i) => (
          <g key={t}>
            <line x1={45} y1={200 - (i * 50)} x2={50} y2={200 - (i * 50)} stroke="#e9f2f6" strokeWidth={1} />
            <text x={40} y={200 - (i * 50) + 4} fill="#e9f2f6" fontSize={8} textAnchor="end">{t}</text>
          </g>
        ))}

        <text x={200} y={230} fill="#e9f2f6" fontSize={10} textAnchor="middle">Tiempo (Meses)</text>
        <text x={20} y={125} fill="#e9f2f6" fontSize={10} textAnchor="middle" transform="rotate(-90 20 125)">Ciudadanos</text>

        <path d={`M 50 50 L 350 ${lineY}`} stroke="#d0523f" strokeWidth={3} fill="none" />

        {points.map((pt, i) => {
          const show = interpolate(progress, [pt.delay, pt.delay + 0.1], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          return (
            <circle key={i} cx={pt.x} cy={pt.y} r={3 * show} fill="#e0b44c" opacity={show} />
          );
        })}
      </svg>
      {p.title ? (
        <div style={{ marginTop: 20, fontFamily: 'sans-serif', fontSize: 32, color: '#e9f2f6', fontWeight: 'bold' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};