import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const PressureBuildUpScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const constriction = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pressure = interpolate(frame, [span * 0.3, span * 0.8], [0, 1], {
    easing: Easing.out(Easing.exp),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const arrowPulse = interpolate(frame, [span * 0.5, span * 0.9], [0, 1], {
    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ticks = [0, 1, 2, 3, 4];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 500 300">
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#5b7f9c" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#d0523f" />
          </linearGradient>
        </defs>
        <path d={`M 0 100 L 200 100 L 300 ${100 + 40 * constriction} L 500 ${100 + 40 * constriction} L 500 200 L 300 200 L 200 ${200 - 40 * constriction} L 0 ${200 - 40 * constriction} Z`} 
              fill="#c9d3d9" fillOpacity={0.2} stroke="#e9f2f6" strokeWidth={2} />
        <text x={250} y={50} fill="#e9f2f6" fontSize={14} textAnchor="middle">Kanal-Querschnitt</text>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={50 + t * 100} y1={210} x2={50 + t * 100} y2={220} stroke="#e9f2f6" strokeWidth={1} />
            <text x={50 + t * 100} y={235} fill="#e9f2f6" fontSize={10} textAnchor="middle">{t * 2} cm²</text>
          </g>
        ))}
        <g opacity={pressure}>
          {[1, 2, 3, 4, 5].map((i) => (
            <path key={i} d={`M ${350 + i * 20} 150 L ${350 + i * 20} ${150 - (i * i * 5 * arrowPulse)}`} 
                  stroke="#d0523f" strokeWidth={3} markerEnd="url(#arrowhead)" />
          ))}
          <text x={400} y={80} fill="#d0523f" fontSize={16} fontWeight="bold">Staudruck</text>
        </g>
        <line x1={300} y1={100} x2={300} y2={200} stroke="#e0b44c" strokeWidth={2} strokeDasharray="5 5" />
        <text x={300} y={260} fill="#e0b44c" fontSize={12} textAnchor="middle">Kritische Zone &lt; 4 cm²</text>
      </svg>
      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: "'Segoe UI', sans-serif", fontSize: 32, color: '#e9f2f6', fontWeight: 'bold' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};