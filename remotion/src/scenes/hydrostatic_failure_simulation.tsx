import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const HydrostaticFailureSimulationScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const drill = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const water = interpolate(frame, [span * 0.35, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const flow = interpolate(frame, [span * 0.4, span * 0.9], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const layers = [
    { y: 0, h: 80, fill: '#5d6a73', label: 'TOPSOIL' },
    { y: 80, h: 120, fill: '#8a949b', label: 'CLAY BARRIER' },
    { y: 200, h: 200, fill: '#c9d3d9', label: 'AQUIFER' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="60%" viewBox="0 0 400 400">
        <defs>
          <linearGradient id="waterGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#5b7f9c" />
            <stop offset="0.5" stopColor="#7ba3c4" />
            <stop offset="1" stopColor="#e9f2f6" />
          </linearGradient>
        </defs>

        {layers.map((l) => (
          <g key={l.label}>
            <rect x={50} y={l.y} width={300} height={l.h} fill={l.fill} stroke="#e9f2f6" strokeWidth={0.5} />
            <text x={360} y={l.y + l.h / 2 + 5} fill="#e9f2f6" fontSize={10} opacity={0.7}>{l.label}</text>
          </g>
        ))}

        <rect x={180} y={0} width={40} height={200 * drill} fill="#e0b44c" />
        
        <rect x={185} y={200 - 180 * water} width={30} height={180 * water} fill="url(#waterGrad)" />

        <g opacity={flow}>
          {[0, 1, 2].map((i) => (
            <path key={i} d={`M 190 ${180 - (i * 40 + (flow * 40) % 40)} L 200 ${170 - (i * 40 + (flow * 40) % 40)} L 210 ${180 - (i * 40 + (flow * 40) % 40)}`} 
                  stroke="#e9f2f6" strokeWidth={2} fill="none" />
          ))}
        </g>

        <line x1={40} y1={200} x2={40} y2={400} stroke="#e9f2f6" strokeWidth={2} />
        <text x={30} y={300} fill="#e9f2f6" fontSize={10} transform="rotate(-90 30 300)">PRESSURE</text>
        
        <circle cx={200} cy={200} r={6 * drill} fill="#d0523f" />
        <text x={210} y={215} fill="#d0523f" fontSize={10} fontWeight="bold">BREACH</text>
      </svg>

      {p.title ? (
        <div style={{ marginTop: 20, fontFamily: 'sans-serif', fontSize: 32, color: '#e9f2f6' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};