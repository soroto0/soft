import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const LevitationPhysicsScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const rotation = interpolate(frame, [0, span], [0, 360], { easing: Easing.linear });
  const pulse = interpolate(frame, [0, span / 2, span], [1, 1.03, 1], { easing: Easing.inOut(Easing.quad) });
  const fieldShift = interpolate(frame, [0, span], [0, 20], { easing: Easing.linear });

  const gearTeeth = Array.from({ length: 8 });
  const forceLines = Array.from({ length: 16 });

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 500 500">
        <defs>
          <linearGradient id="obsidian" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#1a1a1a" />
            <stop offset="0.5" stopColor="#333333" />
            <stop offset="1" stopColor="#000000" />
          </linearGradient>
        </defs>

        <g transform={`translate(250, 250) rotate(${rotation}) scale(${pulse})`}>
          <circle r="80" fill="url(#obsidian)" stroke="#e0b44c" strokeWidth="2" />
          {gearTeeth.map((_, i) => (
            <rect key={i} x="-10" y="-110" width="20" height="30" transform={`rotate(${(i * 360) / 8})`} fill="#e9f2f6" />
          ))}
        </g>

        {forceLines.map((_, i) => {
          const angle = (i * 2 * Math.PI) / 16;
          const x1 = 250 + 100 * Math.cos(angle);
          const y1 = 250 + 100 * Math.sin(angle);
          const x2 = 250 + 160 * Math.cos(angle);
          const y2 = 250 + 160 * Math.sin(angle);
          return (
            <g key={i}>
              <path d={`M ${x1} ${y1} L ${x2} ${y2}`} stroke="#e0b44c" strokeWidth="2" strokeDasharray="4 4" opacity={0.6} />
              <circle cx={x2} cy={y2} r="3" fill="#d0523f" />
            </g>
          );
        })}

        <path d={`M 100 250 A 150 150 0 1 0 400 250 A 150 150 0 1 0 100 250`} fill="none" stroke="#e9f2f6" strokeWidth="1" strokeDasharray="2 6" transform={`rotate(${fieldShift}, 250, 250)`} />

        <line x1="250" y1="50" x2="250" y2="120" stroke="#e9f2f6" strokeWidth="1" />
        <text x="250" y="40" fill="#e9f2f6" fontSize="14" textAnchor="middle">OBSIDIAN GEAR</text>

        <line x1="420" y1="250" x2="350" y2="250" stroke="#d0523f" strokeWidth="1" />
        <text x="430" y="255" fill="#d0523f" fontSize="14" textAnchor="start">MAGNETIC FLUX</text>

        <line x1="80" y1="250" x2="150" y2="250" stroke="#e0b44c" strokeWidth="1" />
        <text x="70" y="255" fill="#e0b44c" fontSize="14" textAnchor="end">STABILITY FIELD</text>
      </svg>

      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: 'sans-serif', fontSize: 32, color: '#e9f2f6', textTransform: 'uppercase', letterSpacing: '4px' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};