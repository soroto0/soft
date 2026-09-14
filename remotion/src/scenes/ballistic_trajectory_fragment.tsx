import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const BallisticTrajectoryFragmentScene: React.FC<SceneProps> = (p) => {
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
  const base = interpolate(frame, [0, span * 0.2], [0, 1], EO);
  const grid = interpolate(frame, [span * 0.1, span * 0.3], [0, 0.35], EO);
  const trajectory = interpolate(frame, [span * 0.2, span * 0.5], [0, 1], EO);
  const truck = interpolate(frame, [span * 0.3, span * 0.5], [0, 1], EO);
  const label = interpolate(frame, [span * 0.4, span * 0.6], [0, 1], EO);

  const pathD = "M 50 200 Q 200 50 350 200";
  const pathLen = 300;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 400 250">
        <g transform={`translate(200 125) scale(${push}) translate(-200 -125)`}>
          {[0.25, 0.5, 0.75].map((k) => (
            <line key={k} x1={20} y1={200 - 150 * k} x2={380} y2={200 - 150 * k}
                  stroke="#e9f2f6" strokeWidth={0.5} opacity={grid} strokeDasharray="4 4" />
          ))}
          <line x1={20} y1={200} x2={380} y2={200} stroke="#e9f2f6" strokeWidth={2}
                transform={`scale(${base} 1)`} />
          <path d={pathD} stroke="#e0b44c" strokeWidth={3} fill="none"
                strokeDasharray={pathLen} strokeDashoffset={pathLen * (1 - trajectory)} />
          <rect x={30} y={180} width={40 * truck} height={20} fill="#d0523f" />
          <text x={50} y={175} fill="#d0523f" fontSize={10} opacity={truck} textAnchor="middle">12m</text>
          <rect x={330} y={180} width={20 * trajectory} height={20} fill="#e0b44c" />
          <line x1={20} y1={220} x2={380} y2={220} stroke="#e9f2f6" strokeWidth={1} />
          <text x={200} y={240} fill="#e9f2f6" fontSize={12} textAnchor="middle" opacity={label}>640m</text>
        </g>
      </svg>
      {p.title ? (
        <div style={{ 
          marginTop: 40, 
          padding: '8px 16px',
          backgroundColor: 'rgba(233, 242, 246, 0.1)',
          borderRadius: 4,
          fontFamily: 'sans-serif', 
          fontSize: 24, 
          color: '#e9f2f6',
          letterSpacing: '0.06em' 
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};