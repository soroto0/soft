import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const GasConcentrationScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const fillLevel = interpolate(frame, [0, span * 0.8], [0, 200], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const dangerLine = interpolate(frame, [span * 0.4, span * 0.6], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [span * 0.5, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ticks = [0, 50, 100, 150, 200, 250];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 500 300">
        <defs>
          <linearGradient id="coGradient" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#e9f2f6" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#d0523f" />
          </linearGradient>
        </defs>
        <rect x="50" y="50" width="400" height="200" fill="none" stroke="#e9f2f6" strokeWidth="2" />
        <rect x="50" y={250 - fillLevel * 0.8} width="400" height={fillLevel * 0.8} fill="url(#coGradient)" opacity="0.7" />
        <line x1="50" y1={250 - 200 * 0.8} x2="450" y2={250 - 200 * 0.8} stroke="#d0523f" strokeWidth="3" strokeDasharray="8 4" opacity={dangerLine} />
        <text x="455" y={250 - 200 * 0.8 + 5} fill="#d0523f" fontSize="14" opacity={dangerLine} fontWeight="bold">200 ppm</text>
        {ticks.map((t) => (
          <g key={t}>
            <line x1="45" y1={250 - t * 0.8} x2="55" y2={250 - t * 0.8} stroke="#e9f2f6" strokeWidth="1" />
            <text x="35" y={250 - t * 0.8 + 4} fill="#e9f2f6" fontSize="10" textAnchor="end">{t}</text>
          </g>
        ))}
        <text x="250" y="285" fill="#e9f2f6" fontSize="12" textAnchor="middle">Zeit (Minuten)</text>
        <text x="20" y="150" fill="#e9f2f6" fontSize="12" textAnchor="middle" transform="rotate(-90 20 150)">CO-Konzentration (ppm)</text>
        <text x="250" y="30" fill="#d0523f" fontSize="20" textAnchor="middle" opacity={labelFade} fontWeight="bold">
          {p.title || "Gefährliche CO-Konzentration"}
        </text>
      </svg>
    </AbsoluteFill>
  );
};