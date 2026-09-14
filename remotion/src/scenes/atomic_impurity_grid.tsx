import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const AtomicImpurityGridScene: React.FC<SceneProps> = (p) => {
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
  const gridFade = interpolate(frame, [0, span * 0.2], [0, 1], EO);
  const impurityPop = interpolate(frame, [span * 0.2, span * 0.4], [0, 1], EO);
  const crackOpen = interpolate(frame, [span * 0.4, span * 0.6], [0, 1], EO);
  const count = interpolate(frame, [0, span * 0.5], [0, 0.7], EO);

  const atoms = Array.from({ length: 1000 }).map((_, i) => ({
    x: (i % 40) * 10,
    y: Math.floor(i / 40) * 10,
    isImpurity: [123, 245, 489, 612, 734, 856, 921].includes(i),
  }));

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 400 250">
        <g transform={`translate(200 125) scale(${push}) translate(-200 -125)`}>
          <g opacity={gridFade}>
            {atoms.map((atom, i) => (
              <circle
                key={i}
                cx={atom.x}
                cy={atom.y}
                r={atom.isImpurity ? 3 * impurityPop : 2}
                fill={atom.isImpurity ? '#d0523f' : '#8a949b'}
              />
            ))}
          </g>
          <path
            d="M 120 120 L 280 120"
            stroke="#e0b44c"
            strokeWidth={2}
            strokeDasharray="4 2"
            opacity={crackOpen}
          />
          <line x1={0} y1={240} x2={400} y2={240} stroke="#e9f2f6" strokeWidth={1} />
          <text x={200} y={230} fill="#e9f2f6" fontSize={12} textAnchor="middle">
            KRITISCHE VERUNREINIGUNG {count.toFixed(1)}%
          </text>
          <line x1={0} y1={240} x2={0} y2={235} stroke="#e9f2f6" strokeWidth={1} />
          <line x1={400} y1={240} x2={400} y2={235} stroke="#e9f2f6" strokeWidth={1} />
          <text x={0} y={230} fill="#e9f2f6" fontSize={10}>0%</text>
          <text x={400} y={230} fill="#e9f2f6" fontSize={10} textAnchor="end">1.0%</text>
        </g>
      </svg>
      {p.title ? (
        <div style={{
          position: 'absolute', top: '10%', color: '#e9f2f6',
          fontSize: 24, fontFamily: 'sans-serif', textAlign: 'center'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};