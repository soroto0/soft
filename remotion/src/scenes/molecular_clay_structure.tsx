import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const MolecularClayStructureScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const move = interpolate(frame, [0, span], [0, 10], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pulse = interpolate(frame, [0, span / 2, span], [0.8, 1.2, 0.8], {
    easing: Easing.inOut(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const chargeGlow = interpolate(frame, [0, span / 2, span], [0.3, 1, 0.3], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;
  const plates = [0, 1, 2, 3];
  const waterPositions = [
    { x: 120, y: 55 }, { x: 180, y: 55 }, { x: 240, y: 55 },
    { x: 150, y: 105 }, { x: 210, y: 105 }, { x: 270, y: 105 },
    { x: 120, y: 155 }, { x: 180, y: 155 }, { x: 240, y: 155 },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 300">
        <defs>
          <linearGradient id="plateGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#c9d3d9" />
            <stop offset="0.5" stopColor="#e9f2f6" />
            <stop offset="1" stopColor="#c9d3d9" />
          </linearGradient>
        </defs>

        {plates.map((i) => (
          <g key={i} transform={`translate(0, ${i * 50 + (i % 2 === 0 ? move : -move)})`}>
            <rect x="50" y="20" width="300" height="12" fill="url(#plateGrad)" rx="2" />
            <circle cx="40" cy="26" r={6 * chargeGlow} fill="#d0523f" opacity={0.8} />
            <text x="40" y="30" fill="#e9f2f6" fontSize="8" textAnchor="middle" fontWeight="bold">-</text>
            <circle cx="360" cy="26" r={6 * chargeGlow} fill="#d0523f" opacity={0.8} />
            <text x="360" y="30" fill="#e9f2f6" fontSize="8" textAnchor="middle" fontWeight="bold">-</text>
          </g>
        ))}

        {waterPositions.map((pos, i) => (
          <g key={i}>
            <circle cx={pos.x} cy={pos.y} r={8 * pulse} fill="#5b7f9c" opacity={0.6} />
            <text x={pos.x} y={pos.y + 3} fill="#e9f2f6" fontSize="6" textAnchor="middle">H₂O</text>
          </g>
        ))}

        <line x1="30" y1="30" x2="30" y2="200" stroke="#e0b44c" strokeWidth="1" strokeDasharray="4 2" />
        <text x="20" y="120" fill="#e0b44c" fontSize="10" transform="rotate(-90 20 120)" textAnchor="middle">INTERLAYER SPACE</text>
      </svg>

      {p.title ? (
        <div style={{ 
          marginTop: 20, 
          fontFamily: "'Segoe UI', Arial, sans-serif", 
          fontSize: 28, 
          color: '#e9f2f6',
          textAlign: 'center'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};