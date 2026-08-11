import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const PropagationMapScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = p.enter * p.exit;
  const durationInFrames = Math.max(1, Math.round((p.dur || 6) * fps));

  const waveRadius = interpolate(frame, [0, durationInFrames], [0, 500], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const waveOpacity = interpolate(frame, [0, durationInFrames * 0.1, durationInFrames * 0.9, durationInFrames], [0, 0.7, 0.7, 0], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const gridAlpha = interpolate(frame, [0, durationInFrames * 0.2], [0.1, 0.4], {
    easing: Easing.ease,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const grid = [0, 100, 200, 300, 400, 500, 600, 700, 800];
  const nodes = grid.flatMap((x) => grid.map((y) => ({ x, y })));

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 800 800">
        <defs>
          <radialGradient id="shockwave">
            <stop offset="0%" stopColor="#d0523f" stopOpacity="0" />
            <stop offset="40%" stopColor="#e0b44c" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#d0523f" stopOpacity="0" />
          </radialGradient>
        </defs>

        {grid.map((pos) => (
          <g key={`grid-${pos}`}>
            <line x1={pos} y1={0} x2={pos} y2={800} stroke="#e9f2f6" strokeWidth={1} opacity={gridAlpha} />
            <line x1={0} y1={pos} x2={800} y2={pos} stroke="#e9f2f6" strokeWidth={1} opacity={gridAlpha} />
          </g>
        ))}

        {nodes.map((n) => (
          <circle key={`${n.x}-${n.y}`} cx={n.x} cy={n.y} r={3} fill="#e9f2f6" opacity={0.6} />
        ))}

        <circle cx={400} cy={400} r={waveRadius} fill="url(#shockwave)" opacity={waveOpacity} />

        <line x1={400} y1={400} x2={400 + waveRadius * 0.7} y2={400 - waveRadius * 0.7} stroke="#e0b44c" strokeWidth={3} opacity={waveOpacity} />
        <text x={400 + waveRadius * 0.7 + 10} y={400 - waveRadius * 0.7 - 10} fill="#e0b44c" fontSize={24} opacity={waveOpacity}>300 m/s</text>
        
        <text x={400} y={400} fill="#e9f2f6" fontSize={18} textAnchor="middle" dy={-20}>Ausfallpunkt</text>
      </svg>

      {p.title ? (
        <div style={{
          position: 'absolute',
          bottom: '10%',
          fontFamily: "'Segoe UI', Arial, sans-serif",
          fontSize: 48,
          color: '#e9f2f6',
          fontWeight: 'bold',
          textTransform: 'uppercase'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};