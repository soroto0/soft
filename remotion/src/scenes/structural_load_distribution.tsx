import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const StructuralLoadDistributionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const raftReveal = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pressureSpread = interpolate(frame, [span * 0.3, span * 0.7], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const captionRise = interpolate(frame, [span * 0.5, span * 0.9], [20, 0], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;
  const arrows = [0.15, 0.35, 0.55, 0.75, 0.95];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 500 300">
        <defs>
          <linearGradient id="clayGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5b7f9c" stopOpacity="0.2" />
            <stop offset="1" stopColor="#5b7f9c" stopOpacity="0.6" />
          </linearGradient>
        </defs>

        <rect x="50" y="80" width="400" height="40" fill="#e9f2f6" opacity={raftReveal} />
        <rect x="55" y="85" width="390" height="30" fill="#8a949b" opacity={raftReveal} />
        
        <text x="250" y="105" fill="#1a2024" fontSize="12" textAnchor="middle" opacity={raftReveal}>REINFORCED CONCRETE RAFT</text>

        <rect x="50" y="120" width="400" height="150" fill="url(#clayGradient)" opacity={pressureSpread} />
        <text x="250" y="200" fill="#e9f2f6" fontSize="14" textAnchor="middle" opacity={pressureSpread}>FIRM CLAY SUBSTRATE</text>

        {arrows.map((pos) => (
          <g key={pos} opacity={pressureSpread}>
            <line x1={50 + pos * 400} y1="90" x2={50 + pos * 400} y2={120 + 40 * pressureSpread} 
                  stroke="#e0b44c" strokeWidth="3" />
            <polygon points={`${50 + pos * 400 - 5},${120 + 40 * pressureSpread} ${50 + pos * 400 + 5},${120 + 40 * pressureSpread} ${50 + pos * 400},${130 + 40 * pressureSpread}`} 
                     fill="#e0b44c" />
          </g>
        ))}

        <line x1="50" y1="120" x2="450" y2="120" stroke="#d0523f" strokeWidth="2" strokeDasharray="4 2" />
        <text x="55" y="115" fill="#d0523f" fontSize="10">CONTACT PRESSURE</text>
      </svg>

      {p.title ? (
        <div style={{ 
          marginTop: 40, 
          transform: `translateY(${captionRise}px)`,
          fontFamily: 'sans-serif', 
          fontSize: 24, 
          color: '#e9f2f6',
          fontWeight: 'bold'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};