import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const EpoxyCoatingOcclusionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const reveal = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const crackGrowth = interpolate(frame, [span * 0.3, span * 0.9], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [span * 0.5, span * 0.7], [0, 1], {
    easing: Easing.ease,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { y: 100, h: 60, fill: '#8a949b', name: 'STEEL WALL' },
    { y: 160, h: 40, fill: '#5d6a73', name: 'EPOXY COATING' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 500 300">
        <defs>
          <linearGradient id="steelGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#aab3b8" />
            <stop offset="0.5" stopColor="#8a949b" />
            <stop offset="1" stopColor="#6e787e" />
          </linearGradient>
        </defs>

        {layers.map((L, i) => (
          <g key={L.name}>
            <rect x={50} y={L.y} width={400 * reveal} height={L.h} fill={i === 0 ? 'url(#steelGrad)' : '#5d6a73'} stroke="#e9f2f6" strokeWidth={1} />
            <text x={55} y={L.y + L.h / 2 + 5} fill="#e9f2f6" fontSize={12} opacity={labelFade}>{L.name}</text>
          </g>
        ))}

        <path d={`M 60 100 L ${60 + 380 * crackGrowth} 100`} stroke="#d0523f" strokeWidth={4} strokeLinecap="round" />
        
        <line x1={100} y1={160} x2={100} y2={80} stroke="#e0b44c" strokeWidth={1} strokeDasharray="4 2" />
        <text x={100} y={70} fill="#e0b44c" fontSize={10} textAnchor="middle" opacity={labelFade}>RISS</text>

        <line x1={350} y1={160} x2={350} y2={220} stroke="#e9f2f6" strokeWidth={1} />
        <text x={350} y={235} fill="#e9f2f6" fontSize={10} textAnchor="middle" opacity={labelFade}>VISUAL INSPECTION: OK</text>
      </svg>

      {p.title ? (
        <div style={{ 
          marginTop: 40, 
          fontFamily: "'Segoe UI', Arial, sans-serif", 
          fontSize: 28, 
          color: '#e9f2f6',
          textTransform: 'uppercase',
          letterSpacing: '0.1em'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};