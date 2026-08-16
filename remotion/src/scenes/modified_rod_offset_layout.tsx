import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ModifiedRodOffsetLayoutScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const shift = interpolate(frame, [span * 0.2, span * 0.6], [0, 40], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const draw = interpolate(frame, [0, span * 0.8], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [span * 0.5, span * 0.9], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const floors = [
    { y: 50, label: 'DECKE', color: '#8a949b' },
    { y: 130, label: '4. ETAGE', color: '#5d6a73' },
    { y: 210, label: '2. ETAGE', color: '#8a949b' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 400 300">
        <defs>
          <pattern id="hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="4" stroke="#e9f2f6" strokeWidth="0.5" />
          </pattern>
        </defs>

        {floors.map((f, i) => (
          <g key={f.label}>
            <rect x={50} y={f.y} width={300} height={10} fill={f.color} />
            <text x={45} y={f.y + 8} fill="#e9f2f6" fontSize={10} textAnchor="end" fontFamily="sans-serif">{f.label}</text>
            {i === 1 && <rect x={50} y={f.y} width={300} height={10} fill="url(#hatch)" opacity={0.3} />}
          </g>
        ))}

        <line x1={180} y1={60} x2={180} y2={130} stroke="#e0b44c" strokeWidth={4} strokeDasharray="4 2" />
        <line x1={180 + shift} y1={140} x2={180 + shift} y2={210} stroke="#d0523f" strokeWidth={4} strokeDasharray="4 2" />

        <rect x={175 + shift} y={130} width={10} height={10} fill="#d0523f" opacity={draw} />
        <rect x={175} y={50} width={10} height={10} fill="#e0b44c" opacity={draw} />

        <g opacity={labelFade}>
          <text x={185} y={95} fill="#e0b44c" fontSize={8} transform="rotate(90 185 95)">STANGE I</text>
          <text x={185 + shift} y={175} fill="#d0523f" fontSize={8} transform="rotate(90 185 175)">STANGE II</text>
          <line x1={220} y1={135} x2={260} y2={135} stroke="#e9f2f6" strokeWidth={1} />
          <text x={265} y={138} fill="#e9f2f6" fontSize={8}>ANCHOR POINT</text>
        </g>
      </svg>
      {p.title ? (
        <div style={{ marginTop: 40, color: '#e9f2f6', fontSize: 24, fontFamily: 'sans-serif', fontWeight: 'bold' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};