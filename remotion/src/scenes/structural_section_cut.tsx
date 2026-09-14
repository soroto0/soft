import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const StructuralSectionCutScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const reveal = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const forceMove = interpolate(frame, [span * 0.4, span * 0.8], [0, 20], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shift = interpolate(frame, [span * 0.2, span * 0.6], [0, 1], {
    easing: Easing.inOut(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const beamHeight = 60 * reveal;
  const slabY = 120;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 600 300">
        <text x="300" y="30" fill="#e9f2f6" fontSize="24" textAnchor="middle" style={{ letterSpacing: '0.1em' }}>{p.title}</text>
        
        <g transform={`translateX(${-50 * shift}px)`}>
          <rect x="50" y={slabY} width="200" height="20" fill="#8a949b" />
          <rect x="70" y={slabY + 20} width="20" height={beamHeight} fill="#5d6a73" />
          <rect x="210" y={slabY + 20} width="20" height={beamHeight} fill="#5d6a73" />
          <line x1="160" y1={slabY - 10} x2="160" y2={slabY - 10 - forceMove} stroke="#d0523f" strokeWidth="3" />
          <path d={`M 160 ${slabY - 10 - forceMove} L 155 ${slabY - 20 - forceMove} M 160 ${slabY - 10 - forceMove} L 165 ${slabY - 20 - forceMove}`} stroke="#d0523f" strokeWidth="3" />
          <text x="150" y={slabY + 120} fill="#e9f2f6" fontSize="14" textAnchor="middle">Balkendecke</text>
        </g>

        <g transform={`translateX(${50 * shift}px)`}>
          <rect x="350" y={slabY} width="200" height="20" fill="#8a949b" />
          <line x1="450" y1={slabY - 10} x2="450" y2={slabY - 10 - (forceMove * 1.5)} stroke="#d0523f" strokeWidth="3" />
          <path d={`M 450 ${slabY - 10 - (forceMove * 1.5)} L 445 ${slabY - 20 - (forceMove * 1.5)} M 450 ${slabY - 10 - (forceMove * 1.5)} L 455 ${slabY - 20 - (forceMove * 1.5)}`} stroke="#d0523f" strokeWidth="3" />
          <text x="450" y={slabY + 120} fill="#e9f2f6" fontSize="14" textAnchor="middle">Flachdecke</text>
        </g>

        <line x1="300" y1="100" x2="300" y2="200" stroke="#e0b44c" strokeWidth="1" strokeDasharray="4 4" />
        
        {[0, 1, 2].map((i) => (
          <rect key={i} x={50 + i * 250} y={260} width="200" height="10" fill={`rgb(${100 + i * 50}, ${100 + i * 50}, ${100 + i * 50})`} />
        ))}
        <text x="150" y="290" fill="#e9f2f6" fontSize="10" textAnchor="middle">Beton</text>
        <text x="450" y="290" fill="#e9f2f6" fontSize="10" textAnchor="middle">Stahl</text>
      </svg>
    </AbsoluteFill>
  );
};