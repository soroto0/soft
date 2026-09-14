import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ProbeWasserWegScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const EO = {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  } as const;

  const push = interpolate(frame, [0, span], [1, 1.04], EO);
  const flow = interpolate(frame, [span * 0.2, span * 0.7], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const time = interpolate(frame, [span * 0.2, span * 0.7], [0, 4], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const grid = interpolate(frame, [span * 0.1, span * 0.3], [0, 0.4], EO);

  const layers = [
    { name: 'Кровля', y: 50 },
    { name: 'Слой 1', y: 100 },
    { name: 'Слой 2', y: 150 },
    { name: 'Слой 3', y: 200 },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 300">
        <g transform={`translate(200 150) scale(${push}) translate(-200 -150)`}>
          {layers.map((l, i) => {
            const show = interpolate(frame, [span * (0.1 + i * 0.05), span * (0.3 + i * 0.05)], [0, 1], EO);
            return (
              <g key={l.name} opacity={show}>
                <rect x={100} y={l.y} width={200} height={30} fill="#16202b" stroke="#e9f2f6" strokeWidth={0.5} />
                <text x={90} y={l.y + 20} fill="#e9f2f6" fontSize={10} textAnchor="end">{l.name}</text>
              </g>
            );
          })}
          <path d="M 200 50 L 200 230" stroke="#e9f2f6" strokeWidth={1} strokeDasharray="4 4" opacity={grid} />
          <circle cx={200} cy={50 + 180 * flow} r={6} fill="#d0523f" />
          <line x1={320} y1={50} x2={320} y2={230} stroke="#e0b44c" strokeWidth={1} />
          <line x1={315} y1={50} x2={325} y2={50} stroke="#e0b44c" strokeWidth={1} />
          <line x1={315} y1={230} x2={325} y2={230} stroke="#e0b44c" strokeWidth={1} />
          <text x={335} y={145} fill="#e0b44c" fontSize={14} style={{ fontWeight: 'bold' }}>
            {Math.round(time)} ч
          </text>
        </g>
      </svg>
      {p.title ? (
        <div style={{ 
          marginTop: 20, 
          padding: '8px 16px', 
          backgroundColor: '#e9f2f6', 
          color: '#0d1117', 
          fontSize: 24, 
          borderRadius: 4,
          fontFamily: 'sans-serif' 
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};