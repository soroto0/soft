import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const MicroSectionComparisonScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const EO = {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  } as const;

  const push = interpolate(frame, [0, span], [1, 1.04], EO);
  const base = interpolate(frame, [0, span * 0.2], [0, 1], EO);
  const grid = interpolate(frame, [span * 0.1, span * 0.3], [0, 0.4], EO);
  const wallWidth = interpolate(frame, [span * 0.2, span * 0.5], [20, 0.38], EO);
  const cardWidth = 0.76;
  const lead = interpolate(frame, [span * 0.3, span * 0.5], [0, 1], EO);

  const L = 80;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 200">
        <g transform={`translate(200 100) scale(${push}) translate(-200 -100)`}>
          {[0, 1].map((i) => (
            <line key={i} x1={100} y1={50 + i * 100} x2={300} y2={50 + i * 100}
                  stroke="#e9f2f6" strokeWidth={1} opacity={grid} />
          ))}
          <rect x={150} y={50} width={100 * base} height={100} fill="#5d6a73" />
          <rect x={150} y={50} width={wallWidth * 100} height={100} fill="#d0523f" />
          <rect x={320} y={50} width={cardWidth * 100} height={100} fill="#e9f2f6" />
          <path d={`M 150 160 L 150 175 L ${150 + wallWidth * 100} 175 L ${150 + wallWidth * 100} 160`}
                stroke="#e0b44c" strokeWidth={1.5} fill="none" strokeDasharray={L} strokeDashoffset={L * (1 - lead)} />
          <text x={150 + (wallWidth * 100) / 2} y={190} fill="#e0b44c" fontSize={12} textAnchor="middle">
            {wallWidth.toFixed(2)} mm
          </text>
          <path d="M 320 160 L 320 175 L 396 175 L 396 160" stroke="#e9f2f6" strokeWidth={1.5} fill="none" />
          <text x={358} y={190} fill="#e9f2f6" fontSize={12} textAnchor="middle">0.76 mm</text>
        </g>
      </svg>
      {p.title ? (
        <div style={{ marginTop: 40, padding: '8px 16px', backgroundColor: '#d0523f', 
                      color: '#e9f2f6', fontSize: 24, borderRadius: 4 }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};