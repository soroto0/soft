import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const MicroscopicClayStructureScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const separation = interpolate(frame, [0, span], [40, 120], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pulse = interpolate(frame, [0, span / 4, span / 2, span], [1, 0.6, 1, 0.6], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const flow = interpolate(frame, [0, span], [0, 20], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;
  const water = [0, 1, 2, 3, 4, 5];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 500 400">
        <defs>
          <linearGradient id="plateGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#8a949b" />
            <stop offset="0.5" stopColor="#c9d3d9" />
            <stop offset="1" stopColor="#8a949b" />
          </linearGradient>
        </defs>

        <rect x="50" y={200 - separation / 2 - 20} width="400" height="20" fill="url(#plateGrad)" rx="2" />
        <rect x="50" y={200 + separation / 2} width="400" height="20" fill="url(#plateGrad)" rx="2" />

        {water.map((i) => (
          <circle key={i} cx={100 + i * 60} cy={200 + (Math.sin(i + flow / 5) * 10)} r={8} fill="#e9f2f6" opacity={0.7} />
        ))}

        <g stroke="#d0523f" strokeWidth="2" fill="none">
          <path d={`M 250 190 L 250 ${190 - separation / 2 + 10}`} markerEnd="url(#arrowhead)" />
          <path d={`M 250 210 L 250 ${210 + separation / 2 - 10}`} markerEnd="url(#arrowhead)" />
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#d0523f" />
            </marker>
          </defs>
        </g>

        <text x="260" y="205" fill="#d0523f" fontSize="14" opacity={pulse}>REPULSION FORCE</text>
        <text x="50" y={200 - separation / 2 - 30} fill="#e0b44c" fontSize="12">NEGATIVE CHARGE (-)</text>
        <text x="50" y={200 + separation / 2 + 40} fill="#e0b44c" fontSize="12">NEGATIVE CHARGE (-)</text>
      </svg>

      {p.title ? (
        <div style={{ marginTop: 20, fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: 28, color: '#e9f2f6' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};