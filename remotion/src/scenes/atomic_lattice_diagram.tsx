import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const AtomicLatticeDiagramScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const zoom = interpolate(frame, [0, span], [1, 2.5], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const hDiffusion = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const grid = Array.from({ length: 5 }).flatMap((_, i) =>
    Array.from({ length: 5 }).map((_, j) => ({ x: i * 80, y: j * 80 }))
  );

  const hydrogen = [
    { startX: 40, startY: 40, endX: 120, endY: 120 },
    { startX: 120, startY: 200, endX: 200, endY: 280 },
    { startX: 280, startY: 80, endX: 360, endY: 160 },
    { startX: 80, startY: 240, endX: 160, endY: 320 },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 400 400" style={{ transform: `scale(${zoom})` }}>
        <defs>
          <radialGradient id="h-atom">
            <stop offset="0%" stopColor="#d0523f" />
            <stop offset="100%" stopColor="#e0b44c" />
          </radialGradient>
        </defs>
        
        {grid.map((pos, i) => (
          <circle key={i} cx={pos.x} cy={pos.y} r={6} fill="#e9f2f6" />
        ))}

        {grid.slice(0, -1).map((pos, i) => (
          <line key={`l-${i}`} x1={pos.x} y1={pos.y} x2={grid[i + 1].x} y2={grid[i + 1].y} 
                stroke="#e9f2f6" strokeWidth={1} strokeOpacity={0.3} />
        ))}

        {hydrogen.map((h, i) => {
          const x = interpolate(hDiffusion, [0, 1], [h.startX, h.endX], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          const y = interpolate(hDiffusion, [0, 1], [h.startY, h.endY], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          return (
            <g key={`h-${i}`}>
              <circle cx={x} cy={y} r={4} fill="url(#h-atom)" />
              <path d={`M ${h.startX} ${h.startY} L ${h.endX} ${h.endY}`} stroke="#d0523f" strokeWidth={1} strokeDasharray="2 2" opacity={0.5} />
            </g>
          );
        })}

        <text x={200} y={380} fill="#e9f2f6" fontSize={12} textAnchor="middle" style={{ pointerEvents: 'none' }}>
          Kristallgitter (Fe)
        </text>
        <text x={360} y={380} fill="#d0523f" fontSize={12} textAnchor="end" style={{ pointerEvents: 'none' }}>
          H-Atom
        </text>
      </svg>

      {p.title ? (
        <div style={{ 
          position: 'absolute', bottom: 100, 
          fontFamily: "'Segoe UI', Arial, sans-serif",
          fontSize: 48, color: '#e9f2f6', fontWeight: 'bold',
          textTransform: 'uppercase', letterSpacing: 2
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};