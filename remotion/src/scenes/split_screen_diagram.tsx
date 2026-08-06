import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const SplitScreenDiagramScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const quillMove = interpolate(frame, [0, span * 0.5], [0, 40], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const neroArm = interpolate(frame, [span * 0.3, span * 0.7], [0, 1], {
    easing: Easing.bezier(0.4, 0, 0.2, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const scrollFade = interpolate(frame, [0, span * 0.2], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" height="80%" viewBox="0 0 400 400">
        <g transform="translate(0, 0)">
          <rect x="50" y="50" width="300" height="150" fill="none" stroke="#e9f2f6" strokeWidth="1" />
          <rect x="80" y="80" width="240" height="90" fill="#e9f2f6" opacity="0.1" />
          <path d={`M 100 120 L 300 120 M 100 140 L 300 140 M 100 160 L 300 160`} stroke="#e9f2f6" strokeWidth="1" opacity={scrollFade} />
          <path d={`M 200 120 L ${200 + quillMove} 100 L 210 120`} stroke="#e0b44c" strokeWidth="3" fill="none" />
          <text x="200" y="40" fill="#e9f2f6" fontSize="12" textAnchor="middle" letterSpacing="1">PALACIO: SÉNECA ESCRIBIENDO</text>
        </g>

        <g transform="translate(0, 200)">
          <rect x="50" y="50" width="300" height="150" fill="none" stroke="#d0523f" strokeWidth="1" />
          <circle cx="150" cy="125" r="30" fill="#e9f2f6" opacity="0.2" />
          <line x1="150" y1="125" x2={150 + 60 * neroArm} y2={125 - 40 * neroArm} stroke="#d0523f" strokeWidth="6" strokeLinecap="round" />
          <circle cx={150 + 60 * neroArm} cy={125 - 40 * neroArm} r="8" fill="#d0523f" />
          <path d="M 250 100 L 280 130 M 280 100 L 250 130" stroke="#d0523f" strokeWidth="2" />
          <text x="200" y="220" fill="#d0523f" fontSize="12" textAnchor="middle" letterSpacing="1">CALLEJÓN: NERÓN VIOLENTO</text>
        </g>
      </svg>

      {p.title ? (
        <div style={{
          position: 'absolute',
          top: '5%',
          color: '#e0b44c',
          fontSize: '24px',
          fontFamily: 'serif',
          fontWeight: 'bold',
          textTransform: 'uppercase'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};