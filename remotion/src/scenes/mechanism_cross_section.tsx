import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const MechanismCrossSectionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const rotation = interpolate(frame, [0, span * 0.4], [0, 90], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const fracture = interpolate(frame, [span * 0.4, span * 0.7], [0, 1], {
    easing: Easing.bezier(0.4, 0, 0.2, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const energyDissipation = interpolate(frame, [span * 0.4, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const teeth = Array.from({ length: 12 }).map((_, i) => i * 30);

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 500 500">
        <defs>
          <linearGradient id="energy" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#d0523f" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#e9f2f6" />
          </linearGradient>
        </defs>

        <g transform="translate(250, 250)">
          <circle r="120" fill="none" stroke="#e9f2f6" strokeWidth="2" strokeDasharray="4 4" />
          <g transform={`rotate(${rotation})`}>
            {teeth.map((angle) => (
              <rect
                key={angle}
                x="-8" y="-140" width="16" height="30"
                fill={angle === 0 ? '#d0523f' : '#e9f2f6'}
                transform={`rotate(${angle})`}
              />
            ))}
          </g>
          
          <g transform={`rotate(0) translate(0, -125)`}>
            <path d={`M -10 0 L 10 0 L 8 ${-20 * fracture} L -8 ${-20 * fracture} Z`} fill="#d0523f" />
            <path d={`M 0 ${-20 * fracture} L 0 ${-40 * fracture}`} stroke="#d0523f" strokeWidth="4" opacity={fracture} />
          </g>
        </g>

        <g transform="translate(250, 100)" opacity={energyDissipation}>
          <path d={`M 0 0 Q ${100 * energyDissipation} 50 0 100`} fill="none" stroke="url(#energy)" strokeWidth="3" />
          <circle cx={100 * energyDissipation} cy="50" r={5 * energyDissipation} fill="#d0523f" />
          <text x="120" y="55" fill="#e0b44c" fontSize="14">KINETIC LOSS</text>
        </g>

        <g transform="translate(50, 400)">
          <text x="0" y="0" fill="#e9f2f6" fontSize="12">COMPONENT: SWISS ESCAPEMENT</text>
          <text x="0" y="20" fill="#e9f2f6" fontSize="12">STATUS: MECHANICAL FAILURE</text>
          <line x1="0" y1="5" x2="200" y2="5" stroke="#d0523f" strokeWidth="2" />
        </g>
      </svg>

      {p.title ? (
        <div style={{
          marginTop: 20,
          fontFamily: "'Segoe UI', Arial, sans-serif",
          fontSize: 32,
          color: '#e9f2f6',
          textAlign: 'center',
          fontWeight: 'bold'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};