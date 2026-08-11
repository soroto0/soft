import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const OpticalIllusionDiagramScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const progress = interpolate(frame, [0, duration], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const perspectiveFade = interpolate(frame, [0, duration * 0.8], [1, 0], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const chaosReveal = interpolate(frame, [duration * 0.2, duration], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const lines = Array.from({ length: 12 }).map((_, i) => i);
  const chaosPoints = [
    { x: 100, y: 100 }, { x: 300, y: 400 }, { x: 500, y: 150 },
    { x: 700, y: 350 }, { x: 200, y: 250 }, { x: 600, y: 100 },
    { x: 400, y: 300 }, { x: 800, y: 200 }, { x: 150, y: 350 },
    { x: 550, y: 400 }, { x: 350, y: 100 }, { x: 750, y: 150 }
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 900 500">
        <defs>
          <linearGradient id="chaosGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#d0523f" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#e9f2f6" />
          </linearGradient>
        </defs>

        <g opacity={perspectiveFade}>
          {lines.map((i) => (
            <line
              key={i}
              x1={450 + (i - 5.5) * 80}
              y1={500}
              x2={450}
              y2={0}
              stroke="#e9f2f6"
              strokeWidth={0.5}
            />
          ))}
          <text x={450} y={490} fill="#e9f2f6" textAnchor="middle" fontSize={12}>PUNTO DE FUGA</text>
        </g>

        <g opacity={chaosReveal}>
          {chaosPoints.map((pt, i) => (
            <g key={i}>
              <circle cx={pt.x} cy={pt.y} r={2 + progress * 8} fill="url(#chaosGrad)" />
              <line x1={pt.x} y1={pt.y} x2={450} y2={250} stroke="#e0b44c" strokeWidth={0.2} strokeDasharray="2 4" />
            </g>
          ))}
        </g>

        <line x1={50} y1={450} x2={850} y2={450} stroke="#e9f2f6" strokeWidth={1} />
        <text x={50} y={470} fill="#e9f2f6" fontSize={12}>ORDEN ESTRUCTURAL</text>
        <text x={850} y={470} fill="#e9f2f6" textAnchor="end" fontSize={12}>CAOS ABSTRACTO</text>
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