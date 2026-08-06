import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const NonLinearHistoryMapScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const time = interpolate(frame, [0, span], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const civs = [
    { name: 'Egipto', x: 150, y: 300, start: 0.0, end: 0.4 },
    { name: 'India', x: 350, y: 150, start: 0.2, end: 0.6 },
    { name: 'Grecia', x: 550, y: 350, start: 0.4, end: 0.8 },
    { name: 'Europa', x: 750, y: 200, start: 0.6, end: 1.0 },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" height="80%" viewBox="0 0 900 500">
        <defs>
          <radialGradient id="grad">
            <stop offset="0%" stopColor="#e0b44c" />
            <stop offset="50%" stopColor="#d0523f" />
            <stop offset="100%" stopColor="#5b7f9c" />
          </radialGradient>
        </defs>

        <text x="450" y="50" fill="#e9f2f6" fontSize="40" textAnchor="middle" fontWeight="bold" style={{ letterSpacing: '2px' }}>
          {p.title}
        </text>

        {civs.map((c) => {
          const life = interpolate(time, [c.start, (c.start + c.end) / 2, c.end], [0, 1, 0], {
            easing: Easing.inOut(Easing.quad),
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          const scale = interpolate(life, [0, 1], [0.2, 1]);
          
          return (
            <g key={c.name} transform={`translate(${c.x}, ${c.y}) scale(${scale})`}>
              <circle r="60" fill="url(#grad)" opacity={0.8 * life} />
              <circle r="65" fill="none" stroke="#e9f2f6" strokeWidth="2" strokeDasharray="4 4" opacity={life} />
              <text y="-80" fill="#e9f2f6" fontSize="24" textAnchor="middle" opacity={life}>{c.name}</text>
              <line x1="0" y1="70" x2="0" y2="150" stroke="#e9f2f6" strokeWidth="1" opacity={life * 0.5} />
              <text y="170" fill="#e9f2f6" fontSize="16" textAnchor="middle" opacity={life * 0.5}>
                {Math.round(c.start * 5000)} - {Math.round(c.end * 5000)}
              </text>
            </g>
          );
        })}

        <line x1="50" y1="450" x2="850" y2="450" stroke="#e9f2f6" strokeWidth="2" />
        <text x="50" y="480" fill="#e9f2f6" fontSize="16">0</text>
        <text x="850" y="480" fill="#e9f2f6" fontSize="16" textAnchor="end">5000</text>
        <text x="450" y="490" fill="#e9f2f6" fontSize="16" textAnchor="middle">TIEMPO (AÑOS)</text>
      </svg>
    </AbsoluteFill>
  );
};