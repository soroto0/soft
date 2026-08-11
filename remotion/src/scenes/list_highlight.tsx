import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ListHighlightScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const unfurl = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const scan = interpolate(frame, [span * 0.2, span * 0.7], [0, 7], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const highlight = interpolate(frame, [span * 0.7, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const names = [
    "I.   FRANCESCO DE' PAZZI",
    "II.  BERNARDO BANDINI",
    "III. JACOPO DE' PAZZI",
    "IV.  FRANCESCO SALVIATI",
    "V.   GIROLAMO RIARIO",
    "VI.  GIOVANNI BATTISTA",
    "VII. NICCOLÒ MACHIAVELLI",
    "VIII. JACOPO SALVIATI",
    "IX.  ANTONIO MAFFEI"
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 400 500">
        <defs>
          <linearGradient id="parchment" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e9f2f6" stopOpacity="0.05" />
            <stop offset="1" stopColor="#e9f2f6" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <rect x="50" y="50" width="300" height={400 * unfurl} fill="url(#parchment)" stroke="#e9f2f6" strokeWidth="1" />
        {names.map((name, i) => {
          const yPos = 100 + i * 35;
          const isTarget = i === 6;
          return (
            <g key={name} opacity={unfurl}>
              <text x="80" y={yPos} fill={isTarget ? '#e0b44c' : '#e9f2f6'} fontSize="14" fontFamily="serif" opacity={0.8}>
                {name}
              </text>
              {isTarget && (
                <rect x="75" y={yPos - 18} width="250" height="24" fill="#d0523f" opacity={0.3 * highlight} />
              )}
            </g>
          );
        })}
        <line x1="65" y1="80" x2="65" y2={80 + scan * 35} stroke="#e0b44c" strokeWidth="2" opacity={unfurl} />
        <circle cx="65" cy={80 + scan * 35} r="4" fill="#e0b44c" opacity={unfurl} />
      </svg>
      {p.title ? (
        <div style={{ marginTop: 20, color: '#e9f2f6', fontSize: 24, fontFamily: 'serif', letterSpacing: 2 }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};