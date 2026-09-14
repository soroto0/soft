import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const LoadComparisonChartScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const barGrowth = interpolate(frame, [0, span * 0.6], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [span * 0.5, span * 0.7], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const highlightShift = interpolate(frame, [span * 0.2, span * 0.8], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ticks = [0, 25, 50, 75, 100, 125];
  const chartHeight = 200;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 500 300">
        <defs>
          <linearGradient id="gridGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e9f2f6" stopOpacity="0.1" />
            <stop offset="1" stopColor="#e9f2f6" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        <text x={250} y={30} fill="#e9f2f6" fontSize={20} textAnchor="middle" style={{ fontWeight: 'bold' }}>
          {p.title}
        </text>

        {ticks.map((t) => (
          <g key={t}>
            <line x1={50} y1={250 - (t / 125) * chartHeight} x2={450} y2={250 - (t / 125) * chartHeight} stroke="#e9f2f6" strokeWidth={0.5} strokeDasharray="2 4" opacity={0.3} />
            <text x={40} y={250 - (t / 125) * chartHeight + 4} fill="#e9f2f6" fontSize={12} textAnchor="end">{t}kN</text>
          </g>
        ))}

        <rect x={120} y={250 - 160 * barGrowth} width={80} height={160 * barGrowth} fill="#e9f2f6" />
        <text x={160} y={270} fill="#e9f2f6" fontSize={14} textAnchor="middle">Geplant</text>

        <rect x={300} y={250 - 182.4 * barGrowth} width={80} height={156.8 * barGrowth} fill="#e9f2f6" />
        <rect x={300} y={250 - 182.4 * barGrowth} width={80} height={25.6 * barGrowth * highlightShift} fill="#e0b44c" />
        <text x={340} y={270} fill="#e9f2f6" fontSize={14} textAnchor="middle">Tatsächlich</text>

        <g opacity={labelFade}>
          <line x1={390} y1={250 - 182.4} x2={420} y2={250 - 182.4} stroke="#e0b44c" strokeWidth={2} />
          <line x1={390} y1={250 - 156.8} x2={420} y2={250 - 156.8} stroke="#e0b44c" strokeWidth={2} />
          <text x={430} y={250 - 170} fill="#e0b44c" fontSize={14}>+14%</text>
        </g>
      </svg>
    </AbsoluteFill>
  );
};
