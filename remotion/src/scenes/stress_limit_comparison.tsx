import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const StressLimitComparisonScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const draw = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const stress = interpolate(frame, [span * 0.4, span * 0.8], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const crack = interpolate(frame, [span * 0.7, span * 0.9], [0, 1], {
    easing: Easing.bounce,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ticks = [0, 10, 20, 30, 40];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 500 300">
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5b7f9c" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#d0523f" />
          </linearGradient>
        </defs>

        <line x1={50} y1={250} x2={450} y2={250} stroke="#e9f2f6" strokeWidth={2} />
        <line x1={50} y1={50} x2={50} y2={250} stroke="#e9f2f6" strokeWidth={2} />

        {ticks.map((t) => (
          <g key={t}>
            <line x1={50 + t * 10} y1={250} x2={50 + t * 10} y2={260} stroke="#e9f2f6" strokeWidth={1} />
            <text x={50 + t * 10} y={275} fill="#e9f2f6" fontSize={10} textAnchor="middle">{t}°</text>
          </g>
        ))}

        <rect x={50} y={250 - 150 * draw} width={300} height={150 * draw} fill="url(#grad)" opacity={0.3} />

        <line x1={350} y1={50} x2={350} y2={250} stroke="#e0b44c" strokeWidth={3} strokeDasharray="6 4" />
        <text x={350} y={40} fill="#e0b44c" fontSize={12} textAnchor="middle" fontWeight="bold">30° Limit</text>

        <line x1={320} y1={80} x2={320} y2={250} stroke="#d0523f" strokeWidth={3} />
        <text x={320} y={290} fill="#d0523f" fontSize={12} textAnchor="middle" fontWeight="bold">27° Failure</text>

        <circle cx={320} cy={250 - 150 * stress} r={6 * crack} fill="#d0523f" stroke="#e9f2f6" strokeWidth={2} />
        
        <path d={`M 320 ${250 - 150 * stress} L 340 ${220 - 150 * stress}`} stroke="#d0523f" strokeWidth={2} opacity={crack} />
        <text x={345} y={215 - 150 * stress} fill="#d0523f" fontSize={10} opacity={crack}>Riss</text>
      </svg>

      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: 'sans-serif', fontSize: 28, color: '#e9f2f6', fontWeight: 'bold' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};