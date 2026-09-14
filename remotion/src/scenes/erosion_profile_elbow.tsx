import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ErosionProfileElbowScene: React.FC<SceneProps> = (p) => {
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
  const build = interpolate(frame, [0, span * 0.4], [0, 1], EO);
  const erode = interpolate(frame, [span * 0.2, span * 0.6], [0, 1], EO);
  const grid = interpolate(frame, [span * 0.1, span * 0.3], [0, 0.4], EO);
  const thickness = Math.round(100 - (95 * erode));

  const pipeOuter = "M 120 300 L 120 120 A 180 180 0 0 1 300 -60 L 480 -60";
  const L = 600;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 600 400">
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#e9f2f6" />
            <stop offset="50%" stopColor="#e0b44c" />
            <stop offset="100%" stopColor="#d0523f" />
          </linearGradient>
        </defs>
        <g transform={`translate(300 200) scale(${push}) translate(-300 -200)`}>
          {[100, 200, 300].map((y) => (
            <line key={y} x1={50} y1={y} x2={550} y2={y} stroke="#8a949b" strokeWidth={1} opacity={grid} />
          ))}
          <path d={`${pipeOuter} L 480 -20 L 300 -20 A 140 140 0 0 0 160 160 L 160 300 Z`} fill="#5d6a73" />
          <path d={`M 120 120 A 180 180 0 0 1 300 -60`} fill="none" stroke="url(#grad)" 
                strokeWidth={40 * erode} strokeDasharray={L} strokeDashoffset={L * (1 - build)} />
          <line x1={300} y1={-60} x2={380} y2={-120} stroke="#d0523f" strokeWidth={2} />
          <rect x={385} y={-135} width={100} height={30} fill="#0d1117" />
          <text x={390} y={-115} fill="#d0523f" fontSize={16} fontFamily="sans-serif">
            {thickness}% WALL
          </text>
          <text x={300} y={380} fill="#e9f2f6" fontSize={24} textAnchor="middle" fontFamily="sans-serif">
            {p.title}
          </text>
        </g>
      </svg>
    </AbsoluteFill>
  );
};
