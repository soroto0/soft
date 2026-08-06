import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const BarChartDeclineScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const bar1914 = interpolate(frame, [0, span * 0.4], [0, 180], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const bar1918 = interpolate(frame, [span * 0.3, span * 0.7], [0, 18], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const gridFade = interpolate(frame, [0, span * 0.2], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;
  const ticks = [0, 25, 50, 75, 100];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 500 300" style={{ overflow: 'visible' }}>
        <line x1="60" y1="250" x2="440" y2="250" stroke="#e9f2f6" strokeWidth="2" />
        {ticks.map((t) => (
          <g key={t} opacity={gridFade}>
            <line x1="55" y1={250 - t * 1.8} x2="60" y2={250 - t * 1.8} stroke="#e9f2f6" strokeWidth="1" />
            <text x="45" y={254 - t * 1.8} fill="#e9f2f6" fontSize="12" textAnchor="end">{t}%</text>
          </g>
        ))}
        <rect x="120" y={250 - bar1914} width="80" height={bar1914} fill="#e9f2f6" />
        <text x="160" y={240 - bar1914} fill="#e9f2f6" fontSize="14" textAnchor="middle" opacity={gridFade}>100%</text>
        <text x="160" y="275" fill="#e9f2f6" fontSize="14" textAnchor="middle">1914</text>
        <rect x="300" y={250 - bar1918} width="80" height={bar1918} fill="#d0523f" />
        <text x="340" y={240 - bar1918} fill="#d0523f" fontSize="14" textAnchor="middle" opacity={gridFade}>9%</text>
        <text x="340" y="275" fill="#e9f2f6" fontSize="14" textAnchor="middle">1918</text>
      </svg>
      {p.title ? (
        <div style={{ 
          marginTop: 40, 
          fontFamily: "'Segoe UI', Arial, sans-serif", 
          fontSize: 32, 
          color: '#e0b44c',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          textAlign: 'center'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};