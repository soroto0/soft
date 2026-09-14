import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const InspectionBlindSpotScene: React.FC<SceneProps> = (p) => {
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
  const scan = interpolate(frame, [span * 0.2, span * 0.6], [0, 1], EO);

  const points = Array.from({ length: 12 }).map((_, i) => ({
    x: 100 + i * 20,
    y: 150,
    delay: 0.2 + i * 0.03,
  }));

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 600 300">
        <g transform={`translate(300 150) scale(${push}) translate(-300 -150)`}>
          {[0.25, 0.5, 0.75].map((k) => (
            <line key={k} x1={50} y1={50 + 150 * k} x2={550} y2={50 + 150 * k}
                  stroke="#e9f2f6" strokeWidth={1} opacity={grid} strokeDasharray="4 4" />
          ))}
          <path d="M 50 150 L 350 150 L 350 250" stroke="#e9f2f6" strokeWidth={6} fill="none"
                transform={`scale(${base} 1)`} />
          <rect x={320} y={220} width={60} height={60} fill="#d0523f" opacity={0.3 * scan} />
          {points.map((pt, i) => {
            const show = interpolate(frame, [span * pt.delay, span * (pt.delay + 0.1)], [0, 1], EO);
            return (
              <g key={i} opacity={show} transform={`translate(${pt.x} ${pt.y}) scale(${show})`}>
                <line x1={-8} y1={0} x2={8} y2={0} stroke="#e9f2f6" strokeWidth={2} />
                <line x1={0} y1={-8} x2={0} y2={8} stroke="#e9f2f6" strokeWidth={2} />
              </g>
            );
          })}
          <text x={350} y={210} fill="#d0523f" fontSize={14} fontWeight="bold" opacity={scan}>NULL-ZONE</text>
          <line x1={350} y1={220} x2={350} y2={200} stroke="#d0523f" strokeWidth={2} opacity={scan} />
        </g>
      </svg>
      {p.title ? (
        <div style={{
          position: 'absolute', bottom: '10%', padding: '12px 24px',
          backgroundColor: '#d0523f', color: '#e9f2f6',
          fontFamily: 'sans-serif', fontSize: 32, letterSpacing: '0.06em'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};