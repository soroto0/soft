import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const HausGanzBasisBruchScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const EO = { easing: Easing.bezier(0.16, 1, 0.3, 1), extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

  const fall = interpolate(frame, [0, 0.8 * fps], [0, 90], EO);
  const drift = interpolate(frame, [0, span], [1, 1.04], { ...EO, easing: Easing.linear });
  const baseLine = interpolate(frame, [0, 0.5 * fps], [0, 1], EO);
  const label = interpolate(frame, [0.8 * fps, 1.2 * fps], [0, 1], EO);

  const cx = 210;
  const cy = 125;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 420 250">
        <g transform={`translate(${cx} ${cy}) scale(${drift}) translate(${-cx} ${-cy})`}>
          <line x1={50} y1={200} x2={370} y2={200} stroke="#e9f2f6" strokeWidth={1} strokeDasharray={320} strokeDashoffset={320 * (1 - baseLine)} opacity={0.4} />
          
          <g transform={`rotate(${fall} 100 200)`} style={{ transformOrigin: '100px 200px' }}>
            <rect x={70} y={20} width={60} height={180} fill="#8a949b" stroke="#e9f2f6" strokeWidth={1} />
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
              <rect key={i} x={75} y={25 + i * 13} width={50} height={8} fill="#5d6a73" />
            ))}
          </g>

          <g transform="translate(100 200)">
            {[0, 1, 2, 3].map((i) => (
              <rect key={i} x={-10 + i * 25} y={0} width={15} height={20} fill="#e0523c" opacity={baseLine} />
            ))}
          </g>

          <g opacity={label}>
            <circle cx={100} cy={110} r={4} fill="#e0b44c" />
            <path d="M 100 106 L 150 70" stroke="#e0b44c" strokeWidth={1} />
            <rect x={152} y={60} width={80} height={20} fill="#e9f2f6" />
            <text x={192} y={74} fill="#0d1117" fontSize={10} textAnchor="middle" fontWeight="bold">13 STÖCKE</text>
          </g>

          <g opacity={label}>
            <line x1={250} y1={190} x2={250} y2={210} stroke="#e9f2f6" strokeWidth={1} />
            <text x={250} y={225} fill="#e9f2f6" fontSize={10} textAnchor="middle">1.8 m</text>
            <rect x={245} y={190} width={10} height={20} fill="#e9f2f6" />
          </g>
        </g>
      </svg>
      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: 'sans-serif', fontSize: 34, color: '#e9f2f6', letterSpacing: '0.06em' }}>{p.title}</div>
      ) : null}
    </AbsoluteFill>
  );
};