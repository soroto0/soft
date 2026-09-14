import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ToxicPlumeVectorScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const EO = {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  } as const;

  const base = interpolate(frame, [0, span * 0.2], [0, 1], EO);
  const grid = interpolate(frame, [span * 0.1, span * 0.3], [0, 0.4], EO);
  const flow = interpolate(frame, [span * 0.2, span * 0.6], [0, 1], EO);
  const push = interpolate(frame, [0, span], [1, 1.04], EO);
  const pop = interpolate(frame, [span * 0.3, span * 0.5], [0, 1], EO);
  const rise = interpolate(frame, [span * 0.3, span * 0.5], [20, 0], EO);

  const L_PLUME = 120;
  const L_WIND = 80;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 500 300">
        <g transform={`translate(250 150) scale(${push}) translate(-250 -150)`}>
          {[0, 1, 2, 3, 4].map((i) => (
            <line key={i} x1={50} y1={50 + i * 50} x2={450} y2={50 + i * 50}
                  stroke="#e9f2f6" strokeWidth={0.5} opacity={grid} />
          ))}
          <path d="M 250 150 L 400 150" stroke="#e0b44c" strokeWidth={4} 
                strokeDasharray={L_PLUME} strokeDashoffset={L_PLUME * (1 - flow)} />
          <path d="M 250 150 L 180 80" stroke="#d0523f" strokeDasharray="6 4" strokeWidth={2}
                opacity={pop} />
          <rect x={150} y={50} width={100} height={100} fill="#d0523f" opacity={pop * 0.3} />
          <text x={160} y={140} fill="#e9f2f6" fontSize={10} opacity={pop}>1.5M PEOPLE</text>
          <line x1={250} y1={180} x2={400} y2={180} stroke="#e9f2f6" strokeWidth={1} 
                transform={`scale(${base} 1)`} />
          <text x={325} y={195} fill="#e9f2f6" fontSize={10} textAnchor="middle">11 km/h</text>
          <path d="M 380 140 L 400 150 L 380 160" stroke="#e0b44c" fill="none" strokeWidth={2}
                strokeDasharray={L_WIND} strokeDashoffset={L_WIND * (1 - flow)} />
        </g>
      </svg>
      {p.title ? (
        <div style={{ marginTop: 40, transform: `translateY(${rise}px)`,
                      fontFamily: "'Segoe UI', Arial, sans-serif",
                      fontSize: 32, color: '#e9f2f6', fontWeight: 'bold', letterSpacing: '0.06em' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};