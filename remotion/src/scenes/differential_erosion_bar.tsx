import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const DifferentialErosionBarScene: React.FC<SceneProps> = (p) => {
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
  const baseLine = interpolate(frame, [0, span * 0.2], [0, 1], EO);
  const grid = interpolate(frame, [span * 0.1, span * 0.3], [0, 0.4], EO);
  
  const erosionStd = interpolate(frame, [span * 0.2, span * 0.6], [0, 15], EO);
  const erosionElbow = interpolate(frame, [span * 0.2, span * 0.6], [0, 75], EO);
  
  const labelFade = interpolate(frame, [span * 0.3, span * 0.5], [0, 1], EO);

  const bars = [
    { x: 120, h: 100 - erosionStd, color: '#c9d3d9', label: 'Standard' },
    { x: 280, h: 100 - erosionElbow, color: '#d0523f', label: 'Elbow 821' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 300">
        <g transform={`translate(200 150) scale(${push}) translate(-200 -150)`}>
          {[0, 0.25, 0.5, 0.75].map((k) => (
            <line key={k} x1={80} y1={220 - 120 * k} x2={320} y2={220 - 120 * k}
                  stroke="#8a949b" strokeWidth={1} opacity={grid} strokeDasharray="4 4" />
          ))}
          
          <line x1={80} y1={220} x2={320} y2={220} stroke="#e9f2f6" strokeWidth={2}
                transform={`scale(${baseLine} 1)`} />

          {bars.map((b, i) => (
            <g key={b.label} opacity={labelFade}>
              <rect x={b.x} y={220 - b.h} width={40} height={b.h} fill={b.color} />
              <text x={b.x + 20} y={220 - b.h - 10} fill="#e9f2f6" fontSize={12} textAnchor="middle">
                {Math.round(b.h)} mm
              </text>
              <text x={b.x + 20} y={240} fill="#e9f2f6" fontSize={10} textAnchor="middle">{b.label}</text>
            </g>
          ))}

          <path d="M 140 120 L 260 120" stroke="#e0b44c" strokeWidth={2} />
          <text x={200} y={110} fill="#e0b44c" fontSize={12} textAnchor="middle">Reference Bolt</text>
        </g>
      </svg>
      {p.title ? (
        <div style={{ 
          marginTop: 40, 
          padding: '10px 20px',
          background: 'rgba(208, 82, 63, 0.2)',
          border: '1px solid #d0523f',
          borderRadius: 4,
          fontFamily: 'sans-serif',
          fontSize: 28, 
          color: '#e9f2f6',
          letterSpacing: '0.06em'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};