import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const MetallurgicalMatrixGridScene: React.FC<SceneProps> = (p) => {
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
  const gridFade = interpolate(frame, [0, span * 0.2], [0, 0.4], EO);
  const baseLine = interpolate(frame, [0, span * 0.3], [0, 1], EO);
  const accent = spring({ frame: frame - Math.round(span * 0.5), fps, config: { damping: 10, stiffness: 150 } });

  const atoms = Array.from({ length: 1000 }).map((_, i) => ({
    x: (i % 40) * 10,
    y: Math.floor(i / 40) * 10,
    isFaulty: i % 142 === 0,
  }));

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 400 250">
        <g transform={`translate(200 125) scale(${push}) translate(-200 -125)`}>
          <g opacity={gridFade}>
            {[0, 1, 2, 3].map((i) => (
              <line key={i} x1={0} y1={i * 80} x2={400} y2={i * 80} stroke="#e9f2f6" strokeWidth={0.5} strokeDasharray="4 4" />
            ))}
          </g>
          
          <g transform="translate(0 20)">
            {atoms.map((atom, i) => {
              const delay = (i % 40) * 0.01;
              const appear = interpolate(frame, [delay * fps, delay * fps + 20], [0, 1], EO);
              const v = atom.isFaulty ? Math.sin(frame * 0.5) * 2 : 0;
              return (
                <circle
                  key={i}
                  cx={atom.x}
                  cy={atom.y}
                  r={2}
                  fill={atom.isFaulty ? '#d0523f' : '#8a949b'}
                  opacity={appear}
                  transform={`translate(${v} ${v})`}
                />
              );
            })}
          </g>

          <line x1={0} y1={230} x2={400} y2={230} stroke="#e9f2f6" strokeWidth={2} transform={`scale(${baseLine} 1)`} />
          <path d="M 180 230 L 220 230" stroke="#e0b44c" strokeWidth={4} transform={`scale(${accent})`} />
          
          <text x={200} y={245} fill="#e0b44c" fontSize={12} textAnchor="middle" opacity={accent}>
            {Math.round(accent * 0.7)} %
          </text>
        </g>
      </svg>
      {p.title ? (
        <div style={{ 
          marginTop: 20, 
          padding: '8px 16px', 
          backgroundColor: 'rgba(233, 242, 246, 0.1)', 
          borderRadius: 4,
          fontFamily: 'sans-serif', 
          fontSize: 24, 
          color: '#e9f2f6' 
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
