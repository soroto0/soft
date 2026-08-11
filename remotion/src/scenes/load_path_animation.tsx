import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const LoadPathAnimationScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const progress = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const arrowMove = interpolate(frame, [0, span * 0.6], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const stressPulse = interpolate(frame, [span * 0.6, span * 0.9], [1, 1.5], {
    easing: Easing.bounce,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const trussMembers = [
    { id: 1, x: 100, y: 100, x2: 200, y2: 100, label: 'Obergurt' },
    { id: 2, x: 200, y: 100, x2: 250, y2: 200, label: 'Diagonalstrebe' },
    { id: 3, x: 300, y: 100, x2: 250, y2: 200, label: 'Diagonalstrebe' },
  ];

  const gussetPlates = [
    { x: 200, y: 100 },
    { x: 300, y: 100 },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 400 300">
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#e0b44c" />
          </marker>
        </defs>
        
        {trussMembers.map((m) => (
          <line key={m.id} x1={m.x} y1={m.y} x2={m.x2} y2={m.y2} stroke="#e9f2f6" strokeWidth={4} strokeLinecap="round" />
        ))}

        {gussetPlates.map((g) => (
          <rect key={g.x} x={g.x - 10} y={g.y - 10} width={20} height={20} fill="#8a949b" />
        ))}

        <path d={`M 150 80 L 200 100 L 250 200`} fill="none" stroke="#e0b44c" strokeWidth={6} 
              strokeDasharray="1000" strokeDashoffset={1000 * (1 - arrowMove)} markerEnd="url(#arrowhead)" />
        
        <circle cx={250} cy={200} r={15 * stressPulse} fill="none" stroke="#d0523f" strokeWidth={2} opacity={progress > 0.6 ? 1 : 0} />
        
        {trussMembers.map((m, i) => (
          <text key={i} x={(m.x + m.x2) / 2} y={(m.y + m.y2) / 2 - 10} fill="#e9f2f6" fontSize={8} textAnchor="middle">{m.label}</text>
        ))}
      </svg>
      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: "'Segoe UI', sans-serif", fontSize: 32, color: '#e9f2f6', fontWeight: 'bold' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};