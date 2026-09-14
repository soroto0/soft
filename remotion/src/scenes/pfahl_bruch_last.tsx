import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const PfahlBruchLastScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const EO = { easing: Easing.bezier(0.16, 1, 0.3, 1), extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

  const base = interpolate(frame, [0, span * 0.3], [0, 1], EO);
  const piles = interpolate(frame, [span * 0.2, span * 0.5], [0, 1], EO);
  const crack = interpolate(frame, [span * 0.5, span * 0.6], [0, 1], EO);
  const drift = interpolate(frame, [0, span], [1, 1.04], { ...EO, easing: Easing.linear });

  const cx = 210;
  const cy = 125;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 420 250">
        <g transform={`translate(${cx} ${cy}) scale(${drift}) translate(${-cx} ${cy * -1})`}>
          <line x1={50} y1={200} x2={370} y2={200} stroke="#5b7f9c" strokeWidth={2} strokeDasharray={320} strokeDashoffset={320 * (1 - base)} />
          
          {[0, 1].map((i) => (
            <g key={i} transform={`translate(${150 + i * 120} 0)`}>
              <rect x={-20} y={80} width={40} height={120} fill="#c9d3d9" opacity={0.3 * piles} />
              <rect x={-10} y={80} width={20} height={120} fill="#0d1117" opacity={0.8 * piles} />
              <path d="M -20 80 L 20 80 L 20 200 L -20 200 Z" fill="none" stroke="#e9f2f6" strokeWidth={1} />
              <line x1={-20} y1={80} x2={-35} y2={80} stroke="#e9f2f6" strokeWidth={1} strokeDasharray={15} strokeDashoffset={15 * (1 - piles)} />
              <line x1={-10} y1={80} x2={-35} y2={80} stroke="#e9f2f6" strokeWidth={1} strokeDasharray={25} strokeDashoffset={25 * (1 - piles)} />
              <text x={-40} y={80} fill="#e9f2f6" fontSize={8} textAnchor="end" opacity={piles}>20cm</text>
            </g>
          ))}

          <path d="M 270 120 L 290 100 M 270 100 L 290 120" stroke="#d0523f" strokeWidth={4} strokeDasharray={30} strokeDashoffset={30 * (1 - crack)} />
          
          <path d="M 150 40 L 150 70 M 270 40 L 270 70" stroke="#e0b44c" strokeWidth={2} />
          <path d="M 150 55 L 270 55" stroke="#e0b44c" strokeWidth={2} />
          <text x={210} y={35} fill="#e0b44c" fontSize={10} textAnchor="middle" opacity={piles}>Last</text>
        </g>
      </svg>
      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: 'sans-serif', fontSize: 32, color: '#e9f2f6', fontWeight: 'bold' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};