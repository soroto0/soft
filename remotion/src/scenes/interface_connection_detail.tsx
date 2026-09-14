import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const InterfaceConnectionDetailScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const { width, height, fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const intro = interpolate(frame, [0, span * 0.15], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const gap = interpolate(frame, [span * 0.25, span * 0.55], [2, 18], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const highlight = interpolate(frame, [span * 0.5, span * 0.8], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const slabHatch = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  const pileHatch = [0, 1, 2, 3];

  return (
    <AbsoluteFill style={{ opacity, width, height, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 500 400" style={{ overflow: 'visible' }}>
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#e9f2f6" />
          </marker>
        </defs>

        {/* Foundation Slab (Bodenplatte) */}
        <g opacity={intro}>
          <rect x="50" y="60" width="400" height="80" fill="none" stroke="#e9f2f6" strokeWidth="2" />
          {slabHatch.map((i) => (
            <line
              key={`slab-h-${i}`}
              x1={60 + i * 45}
              y1="65"
              x2={85 + i * 45}
              y2="135"
              stroke="#e9f2f6"
              strokeWidth="0.5"
              opacity={0.4}
            />
          ))}
          <text x="60" y="50" fill="#e9f2f6" fontSize="14" fontWeight="bold" fontFamily="monospace">
            BODENPLATTE (BETON C25/30)
          </text>
        </g>

        {/* Pile (Pfahl) - Moves down to show gap */}
        <g transform={`translate(0, ${gap})`} opacity={intro}>
          <rect x="180" y="140" width="140" height="200" fill="none" stroke="#e9f2f6" strokeWidth="2" />
          {pileHatch.map((i) => (
            <line
              key={`pile-h-${i}`}
              x1={190 + i * 30}
              y1="150"
              x2={220 + i * 30}
              y2="330"
              stroke="#e9f2f6"
              strokeWidth="0.5"
              opacity={0.4}
            />
          ))}
          
          {/* Reinforcement (Bewehrung) */}
          <line x1="210" y1="150" x2="210" y2="330" stroke="#e0b44c" strokeWidth="4" />
          <line x1="290" y1="150" x2="290" y2="330" stroke="#e0b44c" strokeWidth="4" />
          <text x="330" y="240" fill="#e0b44c" fontSize="12" fontFamily="monospace">
            BEWEHRUNG BSt 500S
          </text>
          <line x1="325" y1="236" x2="295" y2="236" stroke="#e0b44c" strokeWidth="1" markerEnd="url(#arrowhead)" />
          
          <text x="180" y="355" fill="#e9f2f6" fontSize="14" fontFamily="monospace">
            BOHRPFAHL Ø 120cm
          </text>
        </g>

        {/* Interface Detail */}
        <g opacity={highlight}>
          <rect x="170" y={138} width="160" height={gap + 4} fill="#d0523f" opacity={0.2} />
          <line x1="150" y1={140 + gap / 2} x2="175" y2={140 + gap / 2} stroke="#d0523f" strokeWidth="2" />
          <text x="40" y={145 + gap / 2} fill="#d0523f" fontSize="16" fontWeight="bold" fontFamily="monospace">
            KEINE VERZAHNUNG
          </text>
          
          {/* Warning indicator */}
          <circle cx="250" cy={140 + gap / 2} r="15" fill="none" stroke="#d0523f" strokeWidth="2" strokeDasharray="4 2" />
          <line x1="250" y1={140 + gap / 2 - 8} x2="250" y2={140 + gap / 2 + 8} stroke="#d0523f" strokeWidth="2" />
        </g>

        {/* Separation Layer Label */}
        <g opacity={intro}>
          <line x1="320" y1="140" x2="380" y2="180" stroke="#e9f2f6" strokeWidth="1" opacity={0.6} />
          <text x="385" y="185" fill="#e9f2f6" fontSize="12" fontFamily="monospace" opacity={0.8}>
            TRENNLAGE / FUGENAUSBILDUNG
          </text>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            width: '100%',
            textAlign: 'center',
            fontFamily: 'monospace',
            fontSize: 32,
            color: '#e9f2f6',
            letterSpacing: '2px',
            opacity: intro,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};