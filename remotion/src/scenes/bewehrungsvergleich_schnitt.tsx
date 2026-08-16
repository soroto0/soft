import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const BewehrungsvergleichSchnittScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = (p.dur || 6) * fps;

  const opacity = p.enter * p.exit;

  const revealRight = interpolate(frame, [duration * 0.2, duration * 0.6], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const moveLabel = interpolate(frame, [duration * 0.1, duration * 0.9], [0, 10], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shift = interpolate(frame, [duration * 0.3, duration * 0.7], [0, 150], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layersLeft = [
    { y: 100, label: 'Ø 16mm' },
    { y: 140, label: 'Ø 16mm' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 800 400">
        <text x="400" y="30" fill="#e9f2f6" fontSize="24" textAnchor="middle" style={{ letterSpacing: '1px' }}>
          {p.title}
        </text>

        <g transform="translate(150, 0)">
          <text x="100" y="70" fill="#e9f2f6" fontSize="16" textAnchor="middle">Geplant (2-lagig)</text>
          <rect x="50" y="90" width="100" height="80" fill="none" stroke="#e9f2f6" strokeWidth="2" />
          {layersLeft.map((l, i) => (
            <circle key={i} cx="100" cy={l.y} r="8" fill="#e0b44c" />
          ))}
          <line x1="20" y1="90" x2="20" y2="170" stroke="#e9f2f6" strokeWidth="1" />
          <text x="10" y="135" fill="#e9f2f6" fontSize="12" transform="rotate(-90 10 135)">80mm</text>
        </g>

        <g transform={`translate(${350 + shift}, 0)`} opacity={revealRight}>
          <text x="100" y="70" fill="#e0b44c" fontSize="16" textAnchor="middle">Reduziert (1-lagig)</text>
          <rect x="50" y="90" width="100" height="80" fill="none" stroke="#e9f2f6" strokeWidth="2" />
          <circle cx="100" cy="130" r="10" fill="#d0523f" />
          <line x1="100" y1="130" x2="160" y2="130" stroke="#e0b44c" strokeWidth="2" />
          <text x="165" y="135" fill="#e0b44c" fontSize="14">Mitte</text>
          <line x1="20" y1="90" x2="20" y2="170" stroke="#e9f2f6" strokeWidth="1" />
          <text x="10" y="135" fill="#e9f2f6" fontSize="12" transform="rotate(-90 10 135)">80mm</text>
        </g>

        <line x1="400" y1="200" x2="400 + shift" y2="200" stroke="#d0523f" strokeWidth="2" strokeDasharray="5 5" />
        
        <text x="400" y={350 + moveLabel} fill="#e9f2f6" fontSize="14" textAnchor="middle" opacity="0.7">
          Schnitt durch Stahlbetonquerschnitt
        </text>
      </svg>
    </AbsoluteFill>
  );
};