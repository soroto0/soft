import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const GridComparisonSectionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const progress = interpolate(frame, [0, span * 0.8], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const gridScale = interpolate(frame, [span * 0.2, span * 0.9], [1, 0.5], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [span * 0.5, span * 0.8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const residentialGrid = Array.from({ length: 6 }).map((_, i) => i * 30);
  const warehouseGrid = Array.from({ length: 3 }).map((_, i) => i * 90);

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 600 300">
        <text x="150" y="40" fill="#e9f2f6" fontSize="18" textAnchor="middle" opacity={labelFade}>Wohnblock (4 Stock)</text>
        <text x="450" y="40" fill="#e9f2f6" fontSize="18" textAnchor="middle" opacity={labelFade}>Warenhaus</text>
        
        <g transform="translate(50, 60)">
          <rect x="0" y="0" width="200" height="200" fill="none" stroke="#e9f2f6" strokeWidth="2" />
          {residentialGrid.map((pos) => (
            <g key={`res-${pos}`}>
              <line x1={pos} y1="0" x2={pos} y2={200 * progress} stroke="#e0b44c" strokeWidth="1" />
              <line x1="0" y1={pos} x2={200 * progress} y2={pos} stroke="#e0b44c" strokeWidth="1" />
            </g>
          ))}
          <text x="100" y="230" fill="#e0b44c" fontSize="12" textAnchor="middle">Enges Stützraster</text>
        </g>

        <g transform="translate(350, 60)">
          <rect x="0" y="0" width="200" height="200" fill="none" stroke="#e9f2f6" strokeWidth="2" />
          {warehouseGrid.map((pos) => (
            <g key={`wh-${pos}`}>
              <line x1={pos * gridScale} y1="0" x2={pos * gridScale} y2={200 * progress} stroke="#d0523f" strokeWidth="3" />
              <line x1="0" y1={pos * gridScale} x2={200 * progress} y2={pos * gridScale} stroke="#d0523f" strokeWidth="3" />
            </g>
          ))}
          <text x="100" y="230" fill="#d0523f" fontSize="12" textAnchor="middle">Weites Stützraster</text>
        </g>
      </svg>
      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: 'sans-serif', fontSize: 24, color: '#e9f2f6', textAlign: 'center' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};