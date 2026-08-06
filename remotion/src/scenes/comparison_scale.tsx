import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ComparisonScaleScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const tilt = interpolate(frame, [0, span], [-15, 25], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const scale = interpolate(frame, [0, span * 0.6], [0.2, 1], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pulse = interpolate(frame, [0, span], [0.9, 1.1], {
    easing: Easing.inOut(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const coins = Array.from({ length: 12 });

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg viewBox="0 0 800 500" style={{ width: '80%', height: '80%' }}>
        <defs>
          <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e0b44c" />
            <stop offset="0.5" stopColor="#b8860b" />
            <stop offset="1" stopColor="#5b4636" />
          </linearGradient>
        </defs>

        <line x1="400" y1="150" x2="400" y2="400" stroke="#e9f2f6" strokeWidth="4" />
        <circle cx="400" cy="150" r="10" fill="#e9f2f6" />

        <g style={{ transformOrigin: '400px 150px', transform: `rotate(${tilt}deg)` }}>
          <line x1="150" y1="150" x2="650" y2="150" stroke="#e9f2f6" strokeWidth="6" />
          
          <g transform="translate(150, 150)">
            <path d="M -50 0 C -100 -20 -100 -80 -50 -100 C -20 -100 0 -80 0 -50 C 0 -80 20 -100 50 -100 C 100 -80 100 -20 50 0 Z" 
                  fill="#d0523f" transform={`scale(${pulse})`} />
            <path d="M -40 -30 Q -20 -50 0 -30 T 40 -30" fill="none" stroke="#e9f2f6" strokeWidth="2" />
            <text x="0" y="50" fill="#d0523f" fontSize="20" textAnchor="middle">ASMA CRÓNICA</text>
          </g>

          <g transform={`translate(650, 150) scale(${scale})`}>
            {coins.map((_, i) => (
              <ellipse key={i} cx="0" cy={-i * 15} rx="50" ry="15" fill="url(#gold)" stroke="#e9f2f6" strokeWidth="1" />
            ))}
            <text x="0" y="50" fill="#e0b44c" fontSize="20" textAnchor="middle">300M SESTERCIOS</text>
          </g>
        </g>

        <line x1="150" y1="150" x2="150" y2="250" stroke="#e9f2f6" strokeWidth="2" strokeDasharray="4 4" />
        <line x1="650" y1="150" x2="650" y2="250" stroke="#e9f2f6" strokeWidth="2" strokeDasharray="4 4" />
      </svg>

      {p.title ? (
        <div style={{ 
          marginTop: 40,
          fontFamily: 'sans-serif', 
          fontSize: 32, 
          color: '#e9f2f6',
          textAlign: 'center',
          fontWeight: '300',
          letterSpacing: '2px'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};