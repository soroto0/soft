import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ForceFlowAnimationScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const flow = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const fail = interpolate(frame, [span * 0.4, span * 0.6], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pileUp = interpolate(frame, [span * 0.6, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.back(2)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const struts = [
    { x1: 100, y1: 200, x2: 200, y2: 100 },
    { x1: 200, y1: 100, x2: 300, y2: 200 },
    { x1: 300, y1: 200, x2: 400, y2: 100 },
  ];

  const vectors = [
    { x1: 120, y1: 180, x2: 180, y2: 120 },
    { x1: 220, y1: 120, x2: 280, y2: 180 },
    { x1: 320, y1: 180, x2: 380, y2: 120 },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 500 300">
        <defs>
          <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <polygon points="0 0, 6 3, 0 6" fill="#e0b44c" />
          </marker>
        </defs>
        <line x1={50} y1={200} x2={450} y2={200} stroke="#e9f2f6" strokeWidth={3} />
        <line x1={50} y1={100} x2={450} y2={100} stroke="#e9f2f6" strokeWidth={3} />
        {struts.map((s, i) => (
          <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} 
                stroke={i === 1 ? `rgb(208, 82, ${63 + fail * 192})` : '#e9f2f6'} 
                strokeWidth={i === 1 ? 6 - fail * 4 : 4} />
        ))}
        {vectors.map((v, i) => {
          const active = i === 1 ? (1 - fail) : 1;
          return (
            <line key={i} x1={v.x1} y1={v.y1} x2={v.x1 + (v.x2 - v.x1) * flow * active} 
                  y2={v.y1 + (v.y2 - v.y1) * flow * active} stroke="#e0b44c" 
                  strokeWidth={3} markerEnd="url(#arrowhead)" opacity={active} />
          );
        })}
        {[0, 1, 2, 3].map((i) => (
          <circle key={i} cx={200 + i * 5} cy={100 - i * 5} r={3 * pileUp} 
                  fill="#d0523f" opacity={pileUp} />
        ))}
        <text x={250} y={270} fill="#e9f2f6" fontSize={24} textAnchor="middle" 
              style={{ fontFamily: 'sans-serif' }}>{p.title}</text>
      </svg>
    </AbsoluteFill>
  );
};