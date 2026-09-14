import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const LoadPathShiftScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const shift = interpolate(frame, [span * 0.2, span * 0.8], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const fadeOutGrey = interpolate(frame, [span * 0.1, span * 0.5], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const fadeInOrange = interpolate(frame, [span * 0.4, span * 0.9], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const originalPaths = [
    { x1: 100, y1: 100, x2: 300, y2: 100 },
    { x1: 100, y1: 100, x2: 100, y2: 300 },
    { x1: 300, y1: 100, x2: 300, y2: 300 },
    { x1: 100, y1: 300, x2: 300, y2: 300 },
  ];

  const chaoticPaths = [
    { x1: 100, y1: 100, x2: 300, y2: 250 },
    { x1: 300, y1: 100, x2: 150, y2: 300 },
    { x1: 100, y1: 300, x2: 250, y2: 100 },
    { x1: 200, y1: 100, x2: 200, y2: 300 },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width={width * 0.8} height={height * 0.8} viewBox="0 0 400 400">
        <rect x={100} y={100} width={200} height={200} fill="none" stroke="#e9f2f6" strokeWidth={1} strokeDasharray="4 4" />
        
        {originalPaths.map((path, i) => (
          <line
            key={`orig-${i}`}
            x1={path.x1} y1={path.y1} x2={path.x2} y2={path.y2}
            stroke="#e9f2f6"
            strokeWidth={2}
            opacity={fadeOutGrey}
          />
        ))}

        {chaoticPaths.map((path, i) => (
          <line
            key={`chaos-${i}`}
            x1={path.x1} y1={path.y1} x2={path.x2 + (path.x2 - path.x1) * shift} y2={path.y2 + (path.y2 - path.y1) * shift}
            stroke="#e0b44c"
            strokeWidth={6}
            opacity={fadeInOrange}
            strokeLinecap="round"
          />
        ))}

        {[0, 1, 2].map((i) => (
          <circle key={i} cx={100 + i * 100} cy={100 + i * 100} r={5} fill="#d0523f" />
        ))}
        
        <text x={200} y={380} fill="#e9f2f6" fontSize={20} textAnchor="middle" style={{ fontWeight: 'bold' }}>
          {p.title}
        </text>
      </svg>
    </AbsoluteFill>
  );
};