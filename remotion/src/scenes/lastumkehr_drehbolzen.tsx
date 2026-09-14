import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const LastumkehrDrehbolzenScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = p.enter * p.exit;
  const duration = (p.dur || 6) * fps;

  const cycle = interpolate(frame % (duration / 4), [0, duration / 4], [0, 1], {
    easing: Easing.linear,
  });

  const force = interpolate(cycle, [0, 0.5, 1], [-1, 1, -1], {
    easing: Easing.inOut(Easing.quad),
  });

  const crackGrowth = interpolate(frame, [0, duration], [0, 15], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const arrowOffset = force * 40;
  const isTension = force > 0;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 500 300">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#e9f2f6" />
          </marker>
        </defs>

        <rect x="200" y="50" width="100" height="200" fill="#5d6a73" stroke="#e9f2f6" strokeWidth="2" />
        <rect x="200" y="50" width="100" height="20" fill="#8a949b" />
        <rect x="200" y="230" width="100" height="20" fill="#8a949b" />
        
        <rect x="300" y="140" width={crackGrowth} height="20" fill="#d0523f" />
        <text x="305" y="135" fill="#d0523f" fontSize="12">CRACK</text>

        <line x1="250" y1="150" x2="250" y2={150 - arrowOffset} stroke="#e9f2f6" strokeWidth="6" markerEnd="url(#arrow)" />
        <line x1="250" y1="150" x2="250" y2={150 + arrowOffset} stroke="#e9f2f6" strokeWidth="6" markerEnd="url(#arrow)" />

        <text x="250" y="30" fill="#e9f2f6" fontSize="16" textAnchor="middle">80mm BOLT</text>
        
        <g transform="translate(400, 150)">
          <text x="0" y="-20" fill={isTension ? "#e0b44c" : "#5d6a73"} fontSize="14" fontWeight="bold">TENSION</text>
          <text x="0" y="30" fill={!isTension ? "#e0b44c" : "#5d6a73"} fontSize="14" fontWeight="bold">COMPRESSION</text>
          <circle cx="-20" cy={isTension ? -25 : 25} r="6" fill="#e0b44c" />
        </g>

        {[0, 0.5, 1].map((tick) => (
          <line key={tick} x1="180" y1={50 + tick * 200} x2="200" y2={50 + tick * 200} stroke="#e9f2f6" strokeWidth="2" />
        ))}
        <text x="170" y="55" fill="#e9f2f6" fontSize="10" textAnchor="end">TOP</text>
        <text x="170" y="255" fill="#e9f2f6" fontSize="10" textAnchor="end">BOTTOM</text>
      </svg>

      {p.title ? (
        <div style={{ marginTop: 40, color: '#e9f2f6', fontSize: 32, fontFamily: 'sans-serif', fontWeight: 'bold', textAlign: 'center' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};