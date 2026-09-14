import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const QuerschnittInterneErosionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));
  const opacity = p.enter * p.exit;

  const erosion = interpolate(frame, [0, span], [1, 12], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const flow = interpolate(frame, [0, span], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const captionY = interpolate(frame, [0, 20], [15, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const particles = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const labels = [
    { x: 220, y: 320, text: 'STÜTZKÖRPER' },
    { x: 400, y: 80, text: 'SILTKERN' },
    { x: 580, y: 320, text: 'STÜTZKÖRPER' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" height="70%" viewBox="0 0 800 450">
        <defs>
          <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5b7f9c" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#5b7f9c" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* Ground */}
        <line x1="50" y1="400" x2="750" y2="400" stroke="#e9f2f6" strokeWidth="2" />

        {/* Upstream Shell */}
        <path d="M 150 400 L 350 120 L 400 120 L 380 400 Z" fill="#8a949b" opacity="0.4" stroke="#e9f2f6" strokeWidth="1" />
        
        {/* Downstream Shell */}
        <path d="M 400 120 L 450 120 L 650 400 L 420 400 Z" fill="#8a949b" opacity="0.4" stroke="#e9f2f6" strokeWidth="1" />

        {/* Central Silt Core */}
        <path d="M 380 400 L 400 120 L 420 400 Z" fill="#e0b44c" opacity="0.7" stroke="#e9f2f6" strokeWidth="1" />

        {/* Water Reservoir */}
        <path d="M 50 150 L 328 150 L 240 400 L 50 400 Z" fill="url(#waterGrad)" />
        <text x="80" y="140" fill="#5b7f9c" fontSize="12" fontWeight="bold">WASSERSTAND</text>

        {/* Erosion Path */}
        <path 
          d="M 340 280 Q 400 290 460 275" 
          fill="none" 
          stroke="#d0523f" 
          strokeWidth={erosion} 
          strokeLinecap="round"
          opacity="0.9"
        />
        <text x="400" y="260" fill="#d0523f" fontSize="14" textAnchor="middle" fontWeight="bold">EROSIONSKANAL</text>

        {/* Moving Particles */}
        {particles.map((i) => {
          const pOffset = (flow + i / 10) % 1;
          const px = 340 + pOffset * 120;
          const py = 280 + Math.sin(pOffset * Math.PI) * 10;
          return (
            <circle key={i} cx={px} cy={py} r="3" fill="#e9f2f6" />
          );
        })}

        {/* Technical Labels */}
        {labels.map((l) => (
          <g key={l.text}>
            <text x={l.x} y={l.y} fill="#e9f2f6" fontSize="12" textAnchor="middle" opacity="0.8">{l.text}</text>
            <line x1={l.x} y1={l.y + 5} x2={l.x} y2={l.y + 20} stroke="#e9f2f6" strokeWidth="0.5" opacity="0.5" />
          </g>
        ))}

        {/* Scale Ticks */}
        {[0, 1, 2, 3, 4].map((t) => (
          <line key={t} x1={150 + t * 125} y1="400" x2={150 + t * 125} y2="410" stroke="#e9f2f6" strokeWidth="1" />
        ))}
      </svg>

      {p.title ? (
        <div style={{
          marginTop: 40,
          color: '#e9f2f6',
          fontSize: 38,
          fontFamily: 'sans-serif',
          fontWeight: 600,
          letterSpacing: '0.05em',
          transform: `translateY(${captionY}px)`,
          textAlign: 'center'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};