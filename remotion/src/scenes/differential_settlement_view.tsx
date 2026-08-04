import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const DifferentialSettlementViewScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const progress = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const northSink = interpolate(progress, [0, 1], [0, 120], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const southSink = interpolate(progress, [0, 1], [0, 30], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const layers = [
    { id: 'soil', y: 160, h: 120, fill: '#5d6a73', label: 'COMPACTED SOIL' },
    { id: 'bed', y: 130, h: 30, fill: '#8a949b', label: 'GRAVEL BED' },
  ];

  const ticks = [0, 40, 80, 120];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 500 300">
        <defs>
          <linearGradient id="settlementGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d0523f" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#e9f2f6" />
          </linearGradient>
        </defs>

        {layers.map((l) => (
          <rect key={l.id} x={50} y={l.y} width={400} height={l.h} fill={l.fill} opacity={0.3} />
        ))}

        <polygon
          points={`50,130 450,130 450,${130 + northSink} 50,${130 + southSink}`}
          fill="url(#settlementGrad)"
          stroke="#e0b44c"
          strokeWidth={2}
          opacity={0.7}
        />

        <line x1={50} y1={130} x2={50} y2={280} stroke="#e9f2f6" strokeWidth={2} />
        <line x1={450} y1={130} x2={450} y2={280} stroke="#e9f2f6" strokeWidth={2} />

        {ticks.map((t) => (
          <g key={t}>
            <line x1={40} y1={130 + t} x2={50} stroke="#e9f2f6" strokeWidth={1} />
            <text x={35} y={130 + t + 4} fill="#e9f2f6" fontSize={12} textAnchor="end">{t}cm</text>
          </g>
        ))}

        <text x={50} y={115} fill="#e0b44c" fontSize={18} fontWeight="bold">SOUTH</text>
        <text x={450} y={115} fill="#d0523f" fontSize={18} fontWeight="bold" textAnchor="end">NORTH</text>
        
        <line x1={50} y1={130 + southSink} x2={450} y2={130 + northSink} stroke="#d0523f" strokeWidth={4} strokeDasharray="6 4" />
      </svg>

      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: 'sans-serif', fontSize: 32, color: '#e9f2f6', fontWeight: 'bold' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};