import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const WeldSectionCutScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const reveal = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const penetration = interpolate(frame, [span * 0.3, span * 0.7], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pulse = interpolate(frame, [span * 0.5, span * 0.75, span], [0.8, 1.2, 0.8], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const defects = [
    { cx: 250, cy: 120, r: 6 },
    { cx: 242, cy: 150, r: 4 },
    { cx: 258, cy: 180, r: 5 },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 500 300">
        <defs>
          <linearGradient id="metalGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5d6a73" />
            <stop offset="0.5" stopColor="#8a949b" />
            <stop offset="1" stopColor="#5d6a73" />
          </linearGradient>
        </defs>

        <rect x={100} y={50} width={140} height={200 * reveal} fill="url(#metalGrad)" stroke="#e9f2f6" strokeWidth={1} />
        <rect x={260} y={50} width={140} height={200 * reveal} fill="url(#metalGrad)" stroke="#e9f2f6" strokeWidth={1} />

        <path d={`M 240 50 L 260 50 L 275 ${50 + 150 * penetration} L 225 ${50 + 150 * penetration} Z`} fill="#c9d3d9" stroke="#e9f2f6" strokeWidth={1} />

        <line x1={225} y1={50 + 150 * penetration} x2={275} y2={50 + 150 * penetration} stroke="#d0523f" strokeWidth={3} strokeDasharray="4 2" />
        
        {defects.map((d, i) => (
          <circle key={i} cx={d.cx} cy={d.cy} r={d.r * pulse} fill="#d0523f" />
        ))}

        <text x={170} y={270} fill="#e9f2f6" fontSize={12} textAnchor="middle">Base Metal</text>
        <text x={330} y={270} fill="#e9f2f6" fontSize={12} textAnchor="middle">Base Metal</text>
        <text x={250} y={40} fill="#e9f2f6" fontSize={12} textAnchor="middle">Weld Zone</text>
        <text x={250} y={50 + 150 * penetration + 20} fill="#d0523f" fontSize={10} textAnchor="middle">Incomplete Penetration</text>
        <text x={320} y={120} fill="#d0523f" fontSize={10}>Lunker (Void)</text>
        <line x1={260} y1={120} x2={310} y2={120} stroke="#d0523f" strokeWidth={1} />
      </svg>

      {p.title ? (
        <div style={{ 
          marginTop: 20, 
          fontFamily: "'Segoe UI', sans-serif", 
          fontSize: 32, 
          color: '#e9f2f6',
          fontWeight: 'bold' 
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};